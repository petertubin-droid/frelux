// Supabase Edge Function: archie-ears
// =========================================================
// FRELUX ARCHIE — EARS / AUDIO INTELLIGENCE (OWNER-ONLY)
//
// The real speech-perception front door of the ARCHIE
// cognitive pipeline:
//
//   MICROPHONE → EARS (this function) → SPEECH PROCESSING
//     → TRANSCRIPT + LANGUAGE → ARCHIE PERCEPTION →
//     COGNITIVE ENGINE (archie-core) → RESPONSE
//
// Rules:
//   * Owner-only: JWT + profiles.role = 'admin' verified on
//     EVERY call. Non-admins get 403 — no fallback.
//   * REAL transcription only: audio is sent to the STT
//     provider (OpenAI Whisper). If the provider is
//     unconfigured, unreachable or over quota the function
//     fails HONESTLY — it NEVER returns invented text and
//     never claims audio was received or understood when it
//     was not (spec §§3, 16, 19).
//   * Language detection: the provider reports the detected
//     language; the client validates it against the live
//     ARCHIE language registry. No language is invented.
//   * Conversation context: an optional context_prompt (the
//     previous turn) biases recognition toward the ongoing
//     conversation — this is how spoken turns preserve
//     context.
//   * Every call is audited to frelux_archie_audit_events.
//     Failures are audited as WARNING; access denials as
//     WARNING; successful transcriptions as INFO.
//   * Rate-limited per owner (abuse protection).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

const service = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Provider limits (documented OpenAI audio constraints).
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_CONTEXT_PROMPT_CHARS = 400;
const STT_MODEL = "whisper-1";

/** Mime types the STT provider accepts and that browsers
 *  actually produce for microphone recordings. Anything else
 *  is rejected as unsupported — never silently ignored. */
const SUPPORTED_MIME_PREFIXES = [
  "audio/webm",
  "video/webm", // MediaRecorder on some browsers reports video/webm for opus audio
  "audio/ogg",
  "audio/mp4",
  "video/mp4", // iOS Safari records .m4a as video/mp4
  "audio/mpeg",
  "audio/mpeg3",
  "audio/x-mpeg-3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
];

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function earsError(status: number, code: string, message: string) {
  return json(status, { ok: false, code, error: message });
}

async function audit(
  userId: string,
  eventType: string,
  severity: "INFO" | "WARNING" | "CRITICAL",
  detail: Record<string, unknown>,
) {
  await service.from("frelux_archie_audit_events").insert({
    owner_id: userId,
    event_type: eventType,
    severity,
    detail,
  });
}

async function requireOwner(
  req: Request,
): Promise<{ ok: false; res: Response } | { ok: true; userId: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return { ok: false, res: earsError(401, "UNAUTHORIZED", "Unauthorized") };
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data } = await anon.auth.getUser();
  const user = data.user;
  if (!user)
    return { ok: false, res: earsError(401, "UNAUTHORIZED", "Unauthorized") };
  const { data: profile } = await anon
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    await service.from("frelux_archie_audit_events").insert({
      owner_id: user.id,
      event_type: "archie.ears.access_denied",
      severity: "WARNING",
      detail: { reason: "non-admin attempted ARCHIE ears access" },
    });
    return {
      ok: false,
      res: earsError(403, "FORBIDDEN", "Forbidden — ARCHIE is Owner-only."),
    };
  }
  return { ok: true, userId: user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return earsError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  // ---- Owner gate ----
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;
  const userId = auth.userId;

  // ---- Rate limit (abuse protection, per owner) ----
  const rl = checkRateLimit(`ears:${userId}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    await audit(userId, "archie.ears.rate_limited", "WARNING", {
      reset_at: new Date(rl.resetAt).toISOString(),
    });
    return earsError(
      429,
      "RATE_LIMITED",
      "Too many audio requests — try again shortly.",
    );
  }

  // ---- Provider configuration gate (honest, no fallback) ----
  if (!OPENAI_API_KEY) {
    await audit(userId, "archie.ears.unconfigured", "WARNING", {
      reason: "OPENAI_API_KEY missing — transcription impossible",
    });
    return earsError(
      503,
      "EARS_UNCONFIGURED",
      "Speech transcription is not configured on this deployment. No transcript was produced.",
    );
  }

  // ---- Parse multipart form ----
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return earsError(
      400,
      "BAD_REQUEST",
      "Expected multipart/form-data with an audio file.",
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return earsError(400, "NO_AUDIO", "No audio file was received.");
  }

  const mime = (audio.type || "").toLowerCase();
  if (!SUPPORTED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    await audit(userId, "archie.ears.unsupported_format", "WARNING", { mime });
    return earsError(
      415,
      "EARS_UNSUPPORTED_FORMAT",
      `Unsupported audio format${mime ? `: ${mime}` : " (no type)"}. ARCHIE did not process it.`,
    );
  }

  if (audio.size <= 0) {
    return earsError(400, "EMPTY_AUDIO", "The audio file is empty.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return earsError(
      413,
      "EARS_FILE_TOO_LARGE",
      "Audio is larger than the 25 MB limit.",
    );
  }

  // ---- Conversation context (optional biasing prompt) ----
  const rawContext = form.get("context_prompt");
  let contextPrompt: string | null = null;
  if (typeof rawContext === "string" && rawContext.trim()) {
    contextPrompt = rawContext.trim().slice(0, MAX_CONTEXT_PROMPT_CHARS);
  }

  // ---- Language hint (optional, from the live ARCHIE registry) ----
  const rawLang = form.get("language_hint");
  let languageHint: string | null = null;
  if (
    typeof rawLang === "string" &&
    /^[a-z]{2}(-[A-Za-z0-9-]{2,8})?$/.test(rawLang.trim())
  ) {
    languageHint = rawLang.trim();
  }

  // ---- REAL speech processing ----
  const openaiForm = new FormData();
  openaiForm.append("file", audio, audio.name || "speech.webm");
  openaiForm.append("model", STT_MODEL);
  openaiForm.append("response_format", "verbose_json");
  if (languageHint) openaiForm.append("language", languageHint);
  if (contextPrompt) openaiForm.append("prompt", contextPrompt);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: openaiForm,
    });
  } catch {
    await audit(userId, "archie.ears.provider_unreachable", "WARNING", {
      model: STT_MODEL,
    });
    return earsError(
      503,
      "EARS_PROVIDER_UNAVAILABLE",
      "The speech service is unreachable right now. No transcript was produced.",
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const code =
      res.status === 400
        ? "EARS_UNSUPPORTED_FORMAT"
        : res.status === 401
          ? "EARS_PROVIDER_AUTH"
          : res.status === 403 || res.status === 429
            ? "EARS_PROVIDER_QUOTA"
            : "EARS_PROVIDER_UNAVAILABLE";
    await audit(userId, "archie.ears.provider_error", "WARNING", {
      status: res.status,
      code,
      detail: errText.slice(0, 300),
    });
    const message =
      code === "EARS_UNSUPPORTED_FORMAT"
        ? "The speech service rejected this audio format. No transcript was produced."
        : code === "EARS_PROVIDER_AUTH"
          ? "Speech provider authentication failed. No transcript was produced."
          : code === "EARS_PROVIDER_QUOTA"
            ? "Speech provider quota reached. No transcript was produced."
            : "The speech service failed. No transcript was produced.";
    return earsError(502, code, message);
  }

  // ---- Honest result ----
  let payload: {
    text?: string;
    language?: string;
    duration?: number;
  };
  try {
    payload = await res.json();
  } catch {
    await audit(userId, "archie.ears.provider_bad_response", "WARNING", {});
    return earsError(
      502,
      "EARS_PROVIDER_UNAVAILABLE",
      "The speech service returned an unreadable response. No transcript was produced.",
    );
  }

  const transcript = (payload.text ?? "").trim();
  const speechDetected = transcript.length > 0;

  await audit(userId, "archie.ears.transcription", "INFO", {
    speech_detected: speechDetected,
    detected_language: payload.language ?? null,
    duration_sec: payload.duration ?? null,
    chars: transcript.length,
    context_prompt_chars: contextPrompt?.length ?? 0,
    language_hint: languageHint,
    model: STT_MODEL,
  });

  // speechDetected === false is an HONEST result: audio was
  // processed, no speech was found. We say exactly that and
  // return an empty transcript — we never invent one.
  return json(200, {
    ok: true,
    transcript,
    speech_detected: speechDetected,
    language: payload.language ?? null,
    duration_sec: payload.duration ?? null,
    model: STT_MODEL,
  });
});
