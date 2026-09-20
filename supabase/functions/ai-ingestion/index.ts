// =========================================================
// AI INGESTION — Frelux Learning Engine ingestion pipeline
// =========================================================
// Owner directive (2026-09-20): frelux owns its learning
// pipeline; ARCHIE is a separate product and is no longer
// part of it. Admins submit AI reference material
// (topic/capability/recommendation/evidence/scope/confidence).
//
// Pipeline: auth gate (admin) -> payload validation ->
// per-admin hourly rate limit -> duplicate detection ->
// insert into frelux_learning_records (lifecycle
// ARCHIE_RECEIVED, review workflow takes it from there) ->
// audit. NO autonomous promotion — promotion stays with the
// human review workflow (Phase 6.5 §8).
//
// AI role (Gemini, frelux provider): an ADVISORY assessment
// of the submitted reference (quality/confidence flags) is
// attached to the response and audit. It never decides
// promotion and failures never block ingestion.
//
// DB value note: lifecycle_status "ARCHIE_RECEIVED" is the
// historical data contract (existing rows + review filters);
// it is kept as a value only.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const MAX_PER_HOUR = 20;
const RATE_WINDOW_MS = 3_600_000;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const CORS = {
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serveWithCors(async (req: Request) => {
  // Audit fix M-7 (2026-09-11): rate limit this endpoint per user
  // (falls back to client IP). OPTIONS preflights are answered at
  // the CORS boundary and never reach this check.
  const archieRateLimit = checkRateLimit(
    getRateLimitKey(req, req.headers.get("x-user-id") ?? undefined),
    RATE_LIMITS.GENERAL,
  );
  if (!archieRateLimit.allowed)
    return rateLimitedResponse(archieRateLimit.resetAt);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json(405, {
      accepted: false,
      code: "INVALID_PAYLOAD",
      message: "POST only.",
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, {
      accepted: false,
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const callerToken = authHeader.replace("Bearer ", "");

  // Caller-scoped client: authenticates AS the caller (JWT).
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: auth, error: authErr } = await caller.auth.getUser();
  const authUserId = auth?.user?.id ?? null;
  if (authErr || !authUserId) {
    return json(401, {
      accepted: false,
      code: "UNAUTHORIZED",
      message: "Invalid session.",
    });
  }

  // Service client: role/lookup checks + writes (server-side only).
  const service = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", authUserId)
    .single();
  if (profile?.role !== "admin") {
    return json(403, {
      accepted: false,
      code: "UNAUTHORIZED",
      message: "Admin authorization required for ARCHIE ingestion.",
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, {
      accepted: false,
      code: "INVALID_PAYLOAD",
      message: "Body must be JSON.",
    });
  }

  // Validation + sanitization (shared module semantics; a small
  // server-side reimplementation of the same contract).
  const { validateArchiePayload } = await import("./validate.ts");
  const validated = validateArchiePayload(payload);
  if (!validated.ok) {
    await service.from("frelux_learning_audit").insert({
      action: "REJECTED_INVALID",
      actor: authUserId,
      details: { code: validated.code, message: validated.message },
    });
    return json(validated.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, {
      accepted: false,
      code: validated.code,
      message: validated.message,
      flags: validated.flags,
    });
  }

  // Rate limiting per admin, per hour (service-side table).
  const rlKey = `archie-ingest:${authUserId}`;
  const now = new Date();
  const { data: rl } = await service
    .from("frelux_learning_rate_limits")
    .select("window_start, count")
    .eq("key", rlKey)
    .maybeSingle();
  const windowStart = rl ? new Date(rl.window_start).getTime() : 0;
  const expired = now.getTime() - windowStart >= RATE_WINDOW_MS;
  const count = expired ? 0 : (rl?.count ?? 0);
  if (count >= MAX_PER_HOUR) {
    await service.from("frelux_learning_audit").insert({
      action: "RATE_BLOCKED",
      actor: authUserId,
      details: { key: rlKey, count },
    });
    return json(429, {
      accepted: false,
      code: "RATE_LIMITED",
      message: `Ingestion limit reached (${MAX_PER_HOUR}/hour). Try again later.`,
    });
  }
  await service.from("frelux_learning_rate_limits").upsert(
    {
      key: rlKey,
      window_start: expired
        ? now.toISOString()
        : new Date(windowStart).toISOString(),
      count: count + 1,
    },
    { onConflict: "key" },
  );

  // Duplicate detection by content hash.
  const { data: dup } = await service
    .from("frelux_learning_records")
    .select("id")
    .eq("content_hash", validated.record.content_hash)
    .limit(1);
  if ((dup?.length ?? 0) > 0) {
    await service.from("frelux_learning_audit").insert({
      action: "DUPLICATE_BLOCKED",
      actor: authUserId,
      details: { content_hash: validated.record.content_hash },
    });
    return json(200, {
      accepted: false,
      code: "DUPLICATE",
      message:
        "Duplicate submission: this reference material was already ingested.",
    });
  }

  // Insert as ARCHIE_RECEIVED. Ingestion alone NEVER promotes.
  const { data: inserted, error: insErr } = await service
    .from("frelux_learning_records")
    .insert({
      ...validated.record,
      created_by: authUserId,
      lifecycle_status: "ARCHIE_RECEIVED",
      verification_status: "PENDING",
      evaluation_status: "NOT_EVALUATED",
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return json(500, {
      accepted: false,
      code: "INVALID_PAYLOAD",
      message: "Storage failure.",
    });
  }

  await service.from("frelux_learning_audit").insert({
    record_id: inserted.id,
    action: "INGESTED",
    actor: authUserId,
    details: {
      provider: validated.record.provider,
      model_version: validated.record.model_version,
      capability: validated.record.capability,
      proposed_scope: validated.record.proposed_scope,
      injection_flags: validated.flags,
    },
  });

  // -------- GEMINI ADVISORY (owner directive 2026-09-20)
  // Advisory assessment only — NEVER decides promotion. The
  // human review workflow (Phase 6.5 §8) owns every promote
  // decision. Gemini unavailability never blocks ingestion.
  let geminiNote = "";
  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      const r = validated.record;
      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
          geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "You review AI reference material submitted to a construction platform's learning pipeline. Answer in ONE short sentence (max 25 words): a quality assessment and one flag, e.g. evidence gaps, vagueness, scope mismatch. No preamble.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      topic: r.topic,
                      capability: r.capability,
                      recommendation: r.recommendation,
                      conclusion: r.conclusion,
                      evidence: r.evidence,
                      proposed_scope: r.proposed_scope,
                      confidence: r.confidence,
                    }),
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
          }),
        },
      );
      if (geminiRes.ok) {
        const gem = await geminiRes.json();
        geminiNote = (gem?.candidates?.[0]?.content?.parts ?? [])
          .map((part: { text?: string }) => part?.text ?? "")
          .filter(Boolean)
          .join(" ")
          .trim()
          .slice(0, 300);
      }
    }
  } catch (geminiErr) {
    console.error(
      "[ai-ingestion] Gemini advisory failed (non-blocking):",
      geminiErr,
    );
  }

  await service.from("frelux_learning_audit").insert({
    record_id: inserted.id,
    action: "AI_REVIEW_NOTE",
    actor: authUserId,
    details: { gemini_note: geminiNote || "unavailable" },
  });

  return json(200, {
    accepted: true,
    code: "INGESTED",
    record_id: inserted.id,
    message:
      "Ingested for review." +
      (geminiNote ? ` Gemini assessment: ${geminiNote}` : ""),
    flags: validated.flags,
  });
});
