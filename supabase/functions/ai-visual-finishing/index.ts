// =========================================================
// FRELUX Edge Function: ai-visual-finishing
//
// AI Visual Finishing Extraction Layer (Phase 2 & 3).
//
// Receives single room photographs or sequential video walkthrough
// keyframes, calling Gemini to identify visible architectural
// surfaces (walls, ceilings, floors) and opening candidates
// (doors, windows) with normalized relative bounding boxes (0..1).
//
// CRITICAL HONESTY & SECURITY SAFEGUARDS:
// 1. NEVER outputs metric dimensions (meters, feet) or metric areas.
// 2. NEVER calculates material quantities, coverage, or monetary prices.
// 3. Downstream deterministic FRELUX engines remain authoritative.
// 4. Rate-limited and gated by site_settings estimation flags.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";

async function getVerifiedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return null;
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id ?? null;
  } catch (_e) {
    return null;
  }
}

async function getRateLimitKey(req: Request): Promise<string> {
  const userId = await getVerifiedUserId(req);
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(bucketKey);
    }
  }

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

function rateLimitHeaders(
  remaining: number,
  resetAt: number,
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

const RATE_LIMIT_AI = { maxRequests: 20, windowMs: 60_000 };

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

function apiKeySafe(key: string): string {
  return encodeURIComponent(key);
}

function jsonResponse(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

// ── Types ──

export interface NormalizedBBox {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

export interface SanitizedOpening {
  id: string;
  type: "door" | "window";
  label: string;
  confidence: number;
  widthM: null;
  heightM: null;
  areaM2: null;
  deduct: boolean;
  bbox: NormalizedBBox;
}

export interface SanitizedSurface {
  id: string;
  category: "wall" | "ceiling" | "floor";
  name: string;
  confidence: number;
  bbox: NormalizedBBox;
  measurementStatus: "incomplete";
  calibrationMethod: "uncalibrated";
  widthM: null;
  heightM: null;
  grossAreaM2: null;
  openings: SanitizedOpening[];
  deductedOpeningAreaM2: 0;
  netAreaM2: null;
  surfaceCondition:
    "smooth_new" | "painted_good" | "rough_damaged" | "plastered";
  isPartiallyObscured: boolean;
  notes: string[];
}

interface RawOpening {
  id?: unknown;
  type?: unknown;
  label?: unknown;
  confidence?: unknown;
  deduct?: unknown;
  bbox?: unknown;
}

interface RawSurface {
  id?: unknown;
  category?: unknown;
  name?: unknown;
  confidence?: unknown;
  bbox?: unknown;
  surfaceCondition?: unknown;
  isPartiallyObscured?: unknown;
  openings?: unknown;
  notes?: unknown;
}

function clamp01(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

export function sanitizeBBox(raw: unknown): NormalizedBBox | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (
    ![obj.x, obj.y, obj.w, obj.h].every(
      (v) => typeof v === "number" && Number.isFinite(v),
    )
  )
    return null;
  const x = obj.x as number;
  const y = obj.y as number;
  const w = obj.w as number;
  const h = obj.h as number;
  if (
    x < 0 ||
    y < 0 ||
    x > 1 ||
    y > 1 ||
    w <= 0 ||
    h <= 0 ||
    w > 1 ||
    h > 1 ||
    x + w > 1.001 ||
    y + h > 1.001
  )
    return null;
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    w: Math.round(w * 1000) / 1000,
    h: Math.round(h * 1000) / 1000,
  };
}

export function sanitizeOpenings(rawList: unknown): SanitizedOpening[] {
  if (!Array.isArray(rawList)) return [];
  const results: SanitizedOpening[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i] as RawOpening;
    if (!raw || typeof raw !== "object") continue;

    const rawType = String(raw.type || "")
      .toLowerCase()
      .trim();
    if (rawType !== "door" && rawType !== "window") continue;
    const type: "door" | "window" = rawType;
    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim().slice(0, 60)
        : type === "door"
          ? `Opening Door #${i + 1}`
          : `Opening Window #${i + 1}`;
    if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence))
      continue;
    const bbox = sanitizeBBox(raw.bbox);
    if (!bbox) continue;
    const confidence = clamp01(raw.confidence, 0);
    const deduct = raw.deduct === true;

    results.push({
      id: typeof raw.id === "string" && raw.id ? raw.id : `op-${type}-${i + 1}`,
      type,
      label,
      confidence: Math.round(confidence * 100) / 100,
      widthM: null,
      heightM: null,
      areaM2: null,
      deduct,
      bbox,
    });
  }

  return results.slice(0, 16);
}

export function sanitizeSurfaces(rawList: unknown): SanitizedSurface[] {
  if (!Array.isArray(rawList)) return [];
  const surfaces: SanitizedSurface[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i] as RawSurface;
    if (!raw || typeof raw !== "object") continue;

    const rawCategory = String(raw.category || "")
      .toLowerCase()
      .trim();
    if (
      rawCategory !== "wall" &&
      rawCategory !== "ceiling" &&
      rawCategory !== "floor"
    )
      continue;
    const category: "wall" | "ceiling" | "floor" = rawCategory;

    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, 80)
        : `${category.toUpperCase()} Surface #${i + 1}`;

    if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence))
      continue;
    const bbox = sanitizeBBox(raw.bbox);
    if (!bbox) continue;
    const confidence = clamp01(raw.confidence, 0);

    const rawCondition = String(raw.surfaceCondition || "").toLowerCase();
    let surfaceCondition: SanitizedSurface["surfaceCondition"] = "painted_good";
    if (
      rawCondition === "smooth_new" ||
      rawCondition === "rough_damaged" ||
      rawCondition === "plastered"
    ) {
      surfaceCondition = rawCondition;
    }

    const isPartiallyObscured = Boolean(raw.isPartiallyObscured);
    const openings = sanitizeOpenings(raw.openings);

    const notes: string[] = Array.isArray(raw.notes)
      ? raw.notes
          .filter(
            (n): n is string => typeof n === "string" && Boolean(n.trim()),
          )
          .map((n) => n.trim().slice(0, 140))
          .slice(0, 6)
      : [];

    surfaces.push({
      id:
        typeof raw.id === "string" && raw.id
          ? raw.id
          : `surf-${category}-${i + 1}`,
      category,
      name,
      confidence: Math.round(confidence * 100) / 100,
      bbox,
      measurementStatus: "incomplete",
      calibrationMethod: "uncalibrated",
      widthM: null,
      heightM: null,
      grossAreaM2: null,
      openings,
      deductedOpeningAreaM2: 0,
      netAreaM2: null,
      surfaceCondition,
      isPartiallyObscured,
      notes: [
        ...notes,
        "Provisional 2D observation: uncalibrated pending user-supplied dimensions or reference scale.",
      ],
    });
  }

  return surfaces.slice(0, 12);
}

function buildPrompt(
  preferredActivity?: string,
  roomTypeHint?: string,
): string {
  return `You are the FRELUX Visual Finishing Intelligence system.
You analyze architectural room photographs and video walkthrough keyframes for professional finishing estimation (painting, screeding, tiling, POP ceiling, flooring).

PREFERRED FINISHING SCOPE: ${preferredActivity || "General Finishing"}
ROOM CONTEXT HINT: ${roomTypeHint || "Unspecified interior space"}

STRICT PROFESSIONAL REQUIREMENTS & CONSTRAINTS:
1. NEVER output metric dimensions (e.g., do NOT estimate width or height in meters or feet).
2. NEVER output calculated surface areas (m² / sq ft) or monetary prices. Real quantities are calculated exclusively downstream by deterministic engineering calculators after user dimension calibration.
3. Identify all visible candidate architectural surfaces:
   - "category": exactly "wall", "ceiling", or "floor"
   - "name": descriptive human label (e.g. "Primary Front Wall", "Ceiling Plane", "Left Partition Wall")
   - "confidence": confidence score from 0.0 to 1.0
   - "bbox": normalized 2D image coordinates { "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 }
   - "surfaceCondition": one of "smooth_new", "painted_good", "rough_damaged", "plastered"
   - "isPartiallyObscured": true if furniture, fittings, columns, or lighting obscure > 15% of the surface
   - "openings": array of visible candidate openings on this surface (doors, windows, archways):
       - "id": string e.g. "op-door-1"
       - "type": "door" or "window"
       - "label": descriptive label e.g. "Solid Timber Door", "Sliding Window"
       - "confidence": 0.0 to 1.0
       - "bbox": normalized { "x", "y", "w", "h" }
       - "deduct": boolean (true for standard openings)
   - "notes": array of short, objective visual observations about surface texture, joints, or daylight.
4. Detect likely room type ("living_room", "bedroom", "kitchen", "bathroom", "hallway", "office", "commercial", "exterior").
5. Return STRICT JSON only without Markdown backticks or commentary matching this exact schema:
{
  "detected_surfaces": [
    {
      "id": "surf-wall-1",
      "category": "wall",
      "name": "Primary Front Wall",
      "confidence": 0.92,
      "bbox": { "x": 0.05, "y": 0.1, "w": 0.9, "h": 0.8 },
      "surfaceCondition": "painted_good",
      "isPartiallyObscured": false,
      "openings": [
        {
          "id": "op-door-1",
          "type": "door",
          "label": "Passage Door",
          "confidence": 0.88,
          "bbox": { "x": 0.15, "y": 0.35, "w": 0.18, "h": 0.6 },
          "deduct": true
        }
      ],
      "notes": ["Even paint layer, minor trim scuffs"]
    }
  ],
  "detected_room_type": "living_room",
  "scene_notes": ["Good daylight illumination", "Minimal obstruction"],
  "warnings": []
}`;
}

// ── Handler ──

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed. Use POST.", code: "METHOD_NOT_ALLOWED" },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  const verifiedUserId = await getVerifiedUserId(req);
  if (!verifiedUserId) {
    return jsonResponse(
      {
        error: "Sign in is required for Gemini visual analysis.",
        code: "UNAUTHORIZED",
      },
      401,
    );
  }
  const rlKey = `user:${verifiedUserId}`;
  const rl = checkRateLimit(rlKey, RATE_LIMIT_AI);
  if (!rl.allowed) {
    return jsonResponse(
      {
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
      },
      429,
      { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    );
  }
  const rlHeaders = rateLimitHeaders(rl.remaining, rl.resetAt);

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 40_000_000) {
    return jsonResponse(
      { error: "Request exceeds the 40MB limit.", code: "TOO_LARGE" },
      413,
      rlHeaders,
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body.", code: "BAD_JSON" },
      400,
      rlHeaders,
    );
  }

  const imageDataUrl =
    typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const imageDataUrls = Array.isArray(body.imageDataUrls)
    ? body.imageDataUrls.filter((u): u is string => typeof u === "string")
    : [];
  if (
    Array.isArray(body.imageDataUrls) &&
    imageDataUrls.length !== body.imageDataUrls.length
  ) {
    return jsonResponse(
      {
        error: "Every keyframe must be an image data URL.",
        code: "INVALID_IMAGE",
      },
      400,
      rlHeaders,
    );
  }
  const preferredActivity =
    typeof body.preferredActivity === "string"
      ? body.preferredActivity
      : undefined;
  const roomTypeHint =
    typeof body.roomTypeHint === "string"
      ? body.roomTypeHint.slice(0, 100)
      : undefined;

  if (imageDataUrls.length > 10) {
    return jsonResponse(
      {
        error: "A maximum of 10 keyframes is allowed.",
        code: "TOO_MANY_FRAMES",
      },
      400,
      rlHeaders,
    );
  }
  const submittedImages =
    imageDataUrls.length > 0
      ? imageDataUrls
      : imageDataUrl
        ? [imageDataUrl]
        : [];
  const imagePattern =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
  if (submittedImages.some((value) => !imagePattern.test(value))) {
    return jsonResponse(
      {
        error: "Images must be JPEG, PNG, or WebP base64 data URLs.",
        code: "INVALID_IMAGE",
      },
      400,
      rlHeaders,
    );
  }
  if (
    submittedImages.some((value) => value.length > 14_000_000) ||
    submittedImages.reduce((sum, value) => sum + value.length, 0) > 35_000_000
  ) {
    return jsonResponse(
      {
        error: "Submitted images exceed the request size limit.",
        code: "TOO_LARGE",
      },
      413,
      rlHeaders,
    );
  }
  if (!imageDataUrl && imageDataUrls.length === 0) {
    return jsonResponse(
      { error: "Provide an image or keyframe data URLs.", code: "NO_INPUT" },
      400,
      rlHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const geminiApiKey =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { error: "Server not configured.", code: "NOT_CONFIGURED" },
      500,
      rlHeaders,
    );
  }
  if (!geminiApiKey) {
    return jsonResponse(
      { error: "AI service not configured.", code: "NO_API_KEY" },
      503,
      rlHeaders,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check site_settings estimation gate
  const { data: settings } = await supabase
    .from("site_settings")
    .select("estimation_enabled, estimation_access_mode")
    .maybeSingle();

  if (
    !settings?.estimation_enabled ||
    settings.estimation_access_mode === "disabled"
  ) {
    return jsonResponse(
      {
        error: "AI visual finishing is currently disabled.",
        code: "AI_DISABLED",
      },
      403,
      rlHeaders,
    );
  }

  // Build Gemini prompt parts
  const allowedActivities = [
    "painting",
    "screeding",
    "tiling",
    "pop_ceiling",
    "flooring",
  ];
  const safeActivity =
    preferredActivity && allowedActivities.includes(preferredActivity)
      ? preferredActivity
      : undefined;
  const safeRoomHint =
    roomTypeHint && /^[a-zA-Z0-9 _-]{1,60}$/.test(roomTypeHint)
      ? roomTypeHint
      : undefined;
  const prompt = buildPrompt(safeActivity, safeRoomHint);
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  if (imageDataUrls.length > 0) {
    // Multi-frame video keyframes (capped at 10)
    const selectedFrames = imageDataUrls.slice(0, 10);
    for (let i = 0; i < selectedFrames.length; i++) {
      const url = selectedFrames[i];
      const mimeMatch = url.match(/^data:([^;,]+)[;,]/);
      const base64 = url.includes(",") ? url.split(",")[1] : url;
      if (base64 && base64.length <= 14_000_000) {
        parts.push({ text: `Keyframe #${i + 1} from video walkthrough:` });
        parts.push({
          inline_data: {
            mime_type: mimeMatch?.[1] ?? "image/jpeg",
            data: base64,
          },
        });
      }
    }
  } else if (imageDataUrl) {
    // Single image
    const mimeMatch = imageDataUrl.match(/^data:([^;,]+)[;,]/);
    const base64 = imageDataUrl.includes(",")
      ? imageDataUrl.split(",")[1]
      : imageDataUrl;
    if (base64) {
      if (base64.length > 14_000_000) {
        return jsonResponse(
          { error: "Image too large (max ~10MB).", code: "TOO_LARGE" },
          413,
          rlHeaders,
        );
      }
      parts.push({
        inline_data: {
          mime_type: mimeMatch?.[1] ?? "image/jpeg",
          data: base64,
        },
      });
    }
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKeySafe(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } catch (e) {
    console.error("[ai-visual-finishing] fetch error:", e);
    return jsonResponse(
      {
        error: "The AI service is temporarily unavailable.",
        code: "PROVIDER_ERROR",
      },
      502,
      rlHeaders,
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(
      "[ai-visual-finishing] Gemini API error:",
      response.status,
      errText,
    );
    return jsonResponse(
      {
        error: "The AI service is temporarily unavailable.",
        code: "PROVIDER_ERROR",
      },
      502,
      rlHeaders,
    );
  }

  let sanitizedSurfaces: SanitizedSurface[] = [];
  let detectedRoomType = "unspecified";
  let sceneNotes: string[] = [];
  let warnings: string[] = [];

  try {
    const geminiData = await response.json();
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error("No response text from Gemini");
    const parsed = JSON.parse(textContent);

    sanitizedSurfaces = sanitizeSurfaces(parsed?.detected_surfaces);
    if (typeof parsed?.detected_room_type === "string") {
      detectedRoomType = parsed.detected_room_type.slice(0, 50);
    }
    if (Array.isArray(parsed?.scene_notes)) {
      sceneNotes = parsed.scene_notes
        .filter((n: unknown): n is string => typeof n === "string")
        .slice(0, 10);
    }
    if (Array.isArray(parsed?.warnings)) {
      warnings = parsed.warnings
        .filter((w: unknown): n is string => typeof w === "string")
        .slice(0, 10);
    }
  } catch (err) {
    console.error("[ai-visual-finishing] parsing error:", err);
    return jsonResponse(
      {
        error: "Failed to parse structured visual finishing response.",
        code: "PARSE_ERROR",
      },
      502,
      rlHeaders,
    );
  }

  return jsonResponse(
    {
      detected_surfaces: sanitizedSurfaces,
      detected_room_type: detectedRoomType,
      scene_notes: sceneNotes,
      warnings,
      provider: "gemini-live",
      processed_at: new Date().toISOString(),
    },
    200,
    rlHeaders,
  );
}

// Wrap in serveWithCors for Deno runtime
serveWithCors(handler);
