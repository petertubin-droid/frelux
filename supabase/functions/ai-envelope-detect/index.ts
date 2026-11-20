// =========================================================
// Envelope corner detection (Stage 1 of the 4-view generator)
// =========================================================
// The visitor photographs one elevation; Gemini proposes the four wall corners,
// the ridge when the wall is a gable end, and any openings. The browser places
// those as draggable handles — the model never measures and never sets the
// scale, so a wrong proposal costs a drag, not a wrong quantity.
//
// The honesty contract, the same one count-vision keeps:
//   * `ai_enabled` comes from site_settings (Admin -> AI Settings); the Gemini
//     key comes from the project edge secret, never the client.
//   * Corners are returned in normalised image coordinates, validated here and
//     again in the browser: four points inside the frame, a real enclosed area,
//     and no self-intersection.
//   * A photograph the model cannot read is answered "unclear" WITH its reason,
//     never four plausible-looking numbers.
//   * The photograph is NEVER stored — only request metadata and the verdict.
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
const MIN_CONFIDENCE = 0.5;

interface DetectRequest {
  imageDataUrl?: string;
  viewLabel?: string;
}

interface Point {
  x: number;
  y: number;
}

interface DetectAnswer {
  verdict: "detected" | "unclear" | "disabled" | "unavailable";
  quad: Point[] | null;
  ridge: Point | null;
  openings: Array<{
    kind: "window" | "door";
    rect: { x: number; y: number; w: number; h: number };
  }>;
  confidence: number;
  reason: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp01(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return Math.round(n * 10000) / 10000;
}

function readPoint(raw: unknown): Point | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { x?: unknown; y?: unknown };
  const x = clamp01(candidate.x);
  const y = clamp01(candidate.y);
  if (x === null || y === null) return null;
  return { x, y };
}

function signedArea(quad: Point[]): number {
  let sum = 0;
  for (let i = 0; i < quad.length; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function selfIntersects(quad: Point[]): boolean {
  return (
    segmentsCross(quad[0], quad[1], quad[2], quad[3]) ||
    segmentsCross(quad[1], quad[2], quad[3], quad[0])
  );
}

function validateAnswer(raw: Record<string, unknown>): DetectAnswer {
  const confidenceRaw = Number(raw.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0;
  const reason = String(raw.reason ?? "").slice(0, 400);
  const verdict = String(raw.verdict ?? "");

  const refuse = (text: string): DetectAnswer => ({
    verdict: "unclear",
    quad: null,
    ridge: null,
    openings: [],
    confidence,
    reason: text,
  });

  if (verdict !== "detected") {
    return refuse(
      reason ||
        "The photograph does not show a wall face clearly enough to trace.",
    );
  }

  const quadRaw = Array.isArray(raw.quad) ? raw.quad : [];
  if (quadRaw.length !== 4) {
    return refuse("The model did not return four corners.");
  }
  const quad = quadRaw.map(readPoint);
  if (quad.some((p) => p === null)) {
    return refuse("A proposed corner fell outside the photograph.");
  }
  const corners = quad as Point[];
  if (Math.abs(signedArea(corners)) < 0.04) {
    return refuse("The proposed wall encloses almost none of the photograph.");
  }
  if (selfIntersects(corners)) {
    return refuse("The proposed corners cross over each other.");
  }
  if (confidence < MIN_CONFIDENCE) {
    return refuse(
      `Confidence was ${Math.round(confidence * 100)}%, below the ${Math.round(MIN_CONFIDENCE * 100)}% needed to propose corners.`,
    );
  }

  const openings: DetectAnswer["openings"] = [];
  if (Array.isArray(raw.openings)) {
    for (const entry of raw.openings.slice(0, 20)) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const rectRaw = item.rect as Record<string, unknown> | undefined;
      if (!rectRaw) continue;
      const x = clamp01(rectRaw.x);
      const y = clamp01(rectRaw.y);
      const w = clamp01(rectRaw.w);
      const h = clamp01(rectRaw.h);
      if (x === null || y === null || w === null || h === null) continue;
      if (w <= 0.005 || h <= 0.005) continue;
      if (x + w > 1.0001 || y + h > 1.0001) continue;
      openings.push({
        kind: item.kind === "door" ? "door" : "window",
        rect: { x, y, w, h },
      });
    }
  }

  return {
    verdict: "detected",
    quad: corners,
    ridge: readPoint(raw.ridge),
    openings,
    confidence,
    reason:
      reason ||
      "Corners proposed from the photograph. Confirm or drag them before measuring.",
  };
}

async function getAiConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<{ ai_enabled: boolean; gemini_api_key: string }> {
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

async function callGeminiDetect(
  apiKey: string,
  image: { data: string; mimeType: string },
  viewLabel: string,
): Promise<DetectAnswer> {
  const prompt = `You are FRELUX Elevation Corner Detection, a construction takeoff assistant.
The user photographed ONE wall face of a building${viewLabel ? ` (they call it the ${viewLabel} elevation)` : ""} and will trace it.

Return the four wall corners of that face, in normalised image coordinates where (0,0) is the top-left of the photograph and (1,1) is the bottom-right.

Rules:
- Corners must follow the wall's outer face: top-left, top-right, bottom-right, bottom-left, in that order.
- Follow the wall, not the roof: the top corners sit on the eave line where the wall meets the roof. If a gable wall rises above the eave, the top corners stay on the eave line and you report the ridge separately.
- If the wall is a gable end, also return the ridge peak.
- Include every window and door you can see clearly, as rectangles in the same coordinates.
- If the wall face is not clearly visible (blocked, cropped, too dark, taken at a steep angle, or it is not a building), answer "unclear" and say why. Do not guess.

Respond with ONLY valid JSON, no markdown fences:
{
  "verdict": "detected" | "unclear",
  "quad": [{"x": 0.0, "y": 0.0}, {"x": 0.0, "y": 0.0}, {"x": 0.0, "y": 0.0}, {"x": 0.0, "y": 0.0}],
  "ridge": {"x": 0.0, "y": 0.0} | null,
  "openings": [{"kind": "window" | "door", "rect": {"x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0}}],
  "confidence": <number 0-1>,
  "reason": "<one short sentence: what you traced, or exactly why you cannot>"
}`;

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
        // Tracing is a single answer, not reasoning: without this the model
        // spends the budget on thoughts and returns no JSON text at all.
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

serveWithCors(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(
      {
        verdict: "unavailable",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: "The detector is not configured on this project.",
      },
      503,
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey || anonKey);
  const config = await getAiConfig(supabase);
  if (!config.ai_enabled) {
    return jsonResponse({
      verdict: "disabled",
      quad: null,
      ridge: null,
      openings: [],
      confidence: 0,
      reason: "Automatic detection is switched off in AI Settings.",
    });
  }
  if (!config.gemini_api_key) {
    return jsonResponse(
      {
        verdict: "unavailable",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: "No Gemini key is configured for this project.",
      },
      503,
    );
  }

  // Rate limit before any work, on the same AI budget as the other features.
  const rl = checkRateLimit(getRateLimitKey(req), RATE_LIMITS.AI);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        verdict: "unavailable",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: "Too many detections in a short time. Try again shortly.",
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

  let body: DetectRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const imageDataUrl = String(body.imageDataUrl ?? "");
  if (!imageDataUrl.startsWith("data:image/")) {
    return jsonResponse(
      { error: "imageDataUrl must be an image data URL" },
      400,
    );
  }
  const image = extractBase64FromDataUrl(imageDataUrl);
  const approxBytes = Math.floor((image.data.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return jsonResponse(
      { error: `Photograph is larger than ${MAX_IMAGE_MB} MB` },
      413,
    );
  }

  const startedAt = Date.now();
  try {
    const answer = await callGeminiDetect(
      config.gemini_api_key,
      image,
      String(body.viewLabel ?? "").slice(0, 40),
    );
    return jsonResponse({ ...answer, latencyMs: Date.now() - startedAt }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(
      {
        verdict: "unclear",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: `The detector failed: ${message.slice(0, 160)}`,
      },
      502,
    );
  }
});
