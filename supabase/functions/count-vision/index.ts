// =========================================================
// Counter-Vision (Future Engine 2) — photo counting via Gemini
// =========================================================
// An artisan photographs a stack of tiles, cement bags, blocks,
// paint buckets — Gemini counts what is visible. The honesty
// contract:
//   * ai_enabled comes from site_settings (Admin → AI Settings);
//     the Gemini key comes from the project-level edge secret
//     (GEMINI_API_KEY / GOOGLE_AI_API_KEY) — the admin gates the
//     feature, the key never reaches the client.
//   * A count Gemini cannot stand behind is returned as
//     "unclear" WITH its reason — never as a guess.
//   * The response is validated and clamped (integer, sane
//     bounds, confidence floor). Anything outside the contract
//     is "error", not a fabricated number.
//   * The PHOTO IS NEVER STORED — only the request metadata and
//     the verdict are logged.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_IMAGE_MB = 8;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const MAX_COUNT = 5000;
const MIN_CONFIDENCE = 0.6;

interface CountRequest {
  imageDataUrl?: string;
  itemHint?: string;
}

interface CountAnswer {
  verdict: "counted" | "unclear" | "not_found";
  count: number | null;
  unitLabel: string | null;
  confidence: number;
  reason: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthenticatedUserId(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function getAiConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<{ ai_enabled: boolean; gemini_api_key: string }> {
  // site_settings is a single wide-column row (the same table the
  // admin AI Settings page edits). Read the toggle from the row and
  // the Gemini key from the project edge secret — never the client.
  const { data } = await supabase
    .from("site_settings")
    .select("ai_enabled")
    .limit(1)
    .maybeSingle();
  const geminiApiKey =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
  return {
    ai_enabled: data?.ai_enabled !== false,
    gemini_api_key: geminiApiKey,
  };
}

function extractBase64FromDataUrl(dataUrl: string): {
  data: string;
  mimeType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { data: dataUrl, mimeType: "image/jpeg" };
  return { data: match[2], mimeType: match[1] };
}

async function logCountRequest(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  itemHint: string,
  imageBytes: number,
  imageMime: string,
  latencyMs: number,
  answer: CountAnswer | null,
  verdictOverride?: "error",
  reasonFallback?: string,
): void {
  // Fire-and-forget diagnostics; a logging failure must never
  // break a user's count result.
  // AWAITED: the edge runtime freezes the isolate once the
  // response is returned — a fire-and-forget insert would be
  // cancelled before the row ever reaches the database.
  await supabase
    .from("count_vision_log")
    .insert({
      created_by: userId,
      item_hint: itemHint.slice(0, 200),
      verdict: verdictOverride ?? answer?.verdict ?? "error",
      item_count:
        !verdictOverride && answer?.verdict === "counted" ? answer.count : null,
      unit_label: answer?.unitLabel ?? null,
      confidence: answer ? Number(answer.confidence) : null,
      reason: (verdictOverride
        ? (reasonFallback ?? "")
        : (answer?.reason ?? "")
      ).slice(0, 500),
      image_bytes: imageBytes,
      image_mime: imageMime,
      latency_ms: latencyMs,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

async function callGeminiCount(
  apiKey: string,
  image: { data: string; mimeType: string },
  itemHint: string,
): Promise<CountAnswer> {
  const prompt = `You are FRELUX Counter-Vision, a construction site counting assistant in Nigeria.
The user photographed materials and wants to know how many units are VISIBLE in the photo.
${itemHint ? `They say the photo shows: ${itemHint}.` : "They did not say what the photo shows — identify the items yourself."}

Count the items honestly. Rules:
- Count ONLY what is clearly visible. Never extrapolate a pile's hidden layers, never estimate what might be behind what you see.
- If items are partially hidden, stacked too deep, blurred, too small, or the photo is dark/tilted so you cannot count with confidence, say so — do NOT guess a number.
- If the photo does not contain countable material units (e.g. it is a room, a person, a document), say what you see instead of counting.

Respond with ONLY valid JSON, no markdown fences:
{
  "verdict": "counted" | "unclear" | "not_found",
  "count": <integer, the number of visible units — null unless verdict is "counted">,
  "unitLabel": "<plural unit in the user's terms, e.g. "bags", "tiles", "blocks" — null unless counted>",
  "confidence": <number 0-1, how confident you are in the count>,
  "reason": "<one short sentence: what you counted, or exactly why you cannot>"
}

"counted" = you can see and count the units with confidence.
"unclear" = units are present but you cannot count them honestly (say why).
"not_found" = no countable material units in the photo.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        // Counting needs a plain answer, not chain-of-thought:
        // without thinkingBudget: 0 the model spends the token
        // budget on thoughts and returns no JSON text at all.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unparseable response");
  }
  return validateAnswer(parsed);
}

function validateAnswer(raw: Record<string, unknown>): CountAnswer {
  const verdict = String(raw.verdict ?? "");
  const confidenceRaw = Number(raw.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0;
  const reason = String(raw.reason ?? "").slice(0, 500);

  if (verdict === "not_found") {
    return {
      verdict: "not_found",
      count: null,
      unitLabel: null,
      confidence,
      reason: reason || "No countable material units in the photo.",
    };
  }

  const countRaw = Number(raw.count);
  const count = Number.isInteger(countRaw) && countRaw > 0 ? countRaw : null;
  const unitLabel =
    typeof raw.unitLabel === "string" && raw.unitLabel.trim()
      ? raw.unitLabel.trim().slice(0, 40)
      : null;

  if (verdict === "unclear" || count === null || confidence < MIN_CONFIDENCE) {
    // A count we cannot stand behind is reported as unclear with
    // the reason — never as a number.
    return {
      verdict: "unclear",
      count: null,
      unitLabel: unitLabel,
      confidence,
      reason:
        reason ||
        (count === null
          ? "The engine could not determine a reliable count from this photo."
          : "Confidence in the count was too low to report it."),
    };
  }

  if (count > MAX_COUNT) {
    return {
      verdict: "unclear",
      count: null,
      unitLabel: unitLabel,
      confidence,
      reason: `The count (${count.toLocaleString()}) exceeded the reliable range (${MAX_COUNT.toLocaleString()}). Take a closer photo of a smaller section.`,
    };
  }

  return {
    verdict: "counted",
    count,
    unitLabel: unitLabel,
    confidence,
    reason,
  };
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Rate limit BEFORE any work (same AI budget as the other AI features).
  const rateKey = getRateLimitKey(req);
  const rl = checkRateLimit(rateKey, RATE_LIMITS.AI);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests — please wait a moment and try again.",
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...rateLimitHeaders(rl.remaining, rl.resetAt),
        },
      },
    );
  }

  const started = Date.now();
  let body: CountRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { imageDataUrl, itemHint } = body ?? {};
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return jsonResponse({ error: "A photo is required" }, 400);
  }

  const image = extractBase64FromDataUrl(imageDataUrl);
  const imageBytes = Math.floor((image.data.length * 3) / 4); // base64 → bytes
  if (imageBytes > MAX_IMAGE_BYTES) {
    return jsonResponse(
      {
        error: `That photo is too large (${(imageBytes / (1024 * 1024)).toFixed(1)} MB). The limit is ${MAX_IMAGE_MB} MB — take the photo again at normal quality.`,
      },
      413,
    );
  }

  // Admin gates the feature and the key.
  const admin = createClient(supabaseUrl, serviceKey);
  const config = await getAiConfig(admin);
  if (!config.ai_enabled) {
    return jsonResponse(
      { error: "Counting is currently switched off by the site admin." },
      503,
    );
  }
  if (!config.gemini_api_key) {
    return jsonResponse(
      {
        error:
          "Counting is not configured yet — the admin has not set the Gemini key.",
      },
      503,
    );
  }

  const userId = await getAuthenticatedUserId(req, supabaseUrl, anonKey);

  try {
    const answer = await callGeminiCount(
      config.gemini_api_key,
      image,
      typeof itemHint === "string" ? itemHint.slice(0, 200) : "",
    );
    await logCountRequest(
      admin,
      userId,
      typeof itemHint === "string" ? itemHint : "",
      imageBytes,
      image.mimeType,
      Date.now() - started,
      answer,
    );
    return jsonResponse({ result: answer });
  } catch (err) {
    // The raw failure text goes to the admin-only log — the user
    // sees a clean message, the admin can diagnose the cause.
    await logCountRequest(
      admin,
      userId,
      typeof itemHint === "string" ? itemHint : "",
      imageBytes,
      image.mimeType,
      Date.now() - started,
      null,
      "error",
      String(err?.message ?? err).slice(0, 500) || "unknown error",
    );
    return jsonResponse(
      { error: "The counting service failed. Please try again." },
      502,
    );
  }
});
