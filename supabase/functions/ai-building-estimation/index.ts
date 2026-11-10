import { AiGateway } from "../_shared/ai-gateway.ts";
// =========================================================
// FRELUX Edge Function: ai-building-estimation
// Phase 31
//
// Receives a building photo, uses Google Gemini Vision to analyze
// building characteristics, then runs the Build-to-Roof engine
// logic to produce a full construction cost estimate.
//
// Access is premium-gated via site_settings configuration.
// Usage is consumed server-side only on success.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";
import {
  buildEstimateInput,
  parseVisionJson,
  type AiAnalysis,
} from "../_shared/ai-building-input.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";

/** Thrown when Gemini stays overloaded/unavailable after all retries. */
class GeminiBusyError extends Error {
  status: number;
  constructor(status: number) {
    super(`Gemini unavailable (${status})`);
    this.name = "GeminiBusyError";
    this.status = status;
  }
}

interface EstimationRequest {
  imageDataUrl?: string;
  imageUrl?: string;
  clientId?: string;
  /** Rewarded-unlock client hash (frelux_client_hash) — checked against rewarded_unlock_log */
  clientHash?: string;
  projectName?: string;
  location?: string;
  /** ISO 2-letter market whose price book should price the takeoff. */
  market?: string;
}

interface SiteEstimationConfig {
  estimation_enabled: boolean;
  estimation_access_mode: string;
  estimation_daily_free_uses: number;
  estimation_admin_override: boolean;
  estimation_paid_enabled: boolean;
  estimation_paid_price: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Check for an active rewarded unlock (granted by grant-rewarded-unlock
 * after a real Monetag rewarded ad). If the client (or, when signed in,
 * the user) has an unexpired unlock for the image_estimator tool, the
 * daily free-usage limit does not apply.
 */
async function hasActiveRewardedUnlock(
  supabase: ReturnType<typeof createClient>,
  clientHash: string | undefined,
  userId: string | null,
): Promise<boolean> {
  const nowIso = new Date().toISOString();

  // Anonymous: match by client hash
  if (clientHash && clientHash !== "unknown") {
    const { data } = await supabase
      .from("rewarded_unlock_log")
      .select("expires_at")
      .eq("tool_key", "image_estimator")
      .eq("client_hash", clientHash)
      .gt("expires_at", nowIso)
      .order("unlocked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return true;
  }

  // Signed-in: match by user so the unlock follows the account
  if (userId) {
    const { data } = await supabase
      .from("rewarded_unlock_log")
      .select("expires_at")
      .eq("tool_key", "image_estimator")
      .eq("user_id", userId)
      .gt("expires_at", nowIso)
      .order("unlocked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return true;
  }

  return false;
}

async function getAuthenticatedUserId(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function isUserAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

async function getUserPaidStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_paid_status")
    .select("is_paid, paid_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.is_paid) return false;
  if (data.paid_until) {
    const expiry = new Date(data.paid_until).getTime();
    if (Date.now() > expiry) return false;
  }
  return true;
}

async function getEstimationConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<SiteEstimationConfig | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "estimation_enabled, estimation_access_mode, estimation_daily_free_uses, estimation_admin_override, estimation_paid_enabled, estimation_paid_price",
    )
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    estimation_enabled: data.estimation_enabled ?? false,
    estimation_access_mode: data.estimation_access_mode ?? "disabled",
    estimation_daily_free_uses: data.estimation_daily_free_uses ?? 0,
    estimation_admin_override: data.estimation_admin_override ?? true,
    estimation_paid_enabled: data.estimation_paid_enabled ?? false,
    estimation_paid_price: Number(data.estimation_paid_price) || 0,
  };
}

async function getDailyUsage(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  userId: string | null,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  let query;
  if (userId) {
    query = supabase
      .from("estimation_usage_daily")
      .select("uses_consumed")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();
  } else {
    query = supabase
      .from("estimation_usage_daily")
      .select("uses_consumed")
      .eq("client_hash", clientId)
      .eq("usage_date", today)
      .maybeSingle();
  }
  const { data } = await query;
  return data?.uses_consumed ?? 0;
}

async function consumeDailyUse(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  userId: string | null,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  if (userId) {
    const { data: existing } = await supabase
      .from("estimation_usage_daily")
      .select("id, uses_consumed")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("estimation_usage_daily")
        .update({ uses_consumed: (existing.uses_consumed ?? 0) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("estimation_usage_daily").insert({
        user_id: userId,
        client_hash: clientId,
        usage_date: today,
        uses_consumed: 1,
      });
    }
  } else {
    const { data: existing } = await supabase
      .from("estimation_usage_daily")
      .select("id, uses_consumed")
      .eq("client_hash", clientId)
      .eq("usage_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("estimation_usage_daily")
        .update({ uses_consumed: (existing.uses_consumed ?? 0) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("estimation_usage_daily").insert({
        client_hash: clientId,
        usage_date: today,
        uses_consumed: 1,
      });
    }
  }
}

// ── Gemini Vision API call ──

async function analyzeBuildingImage(
  imageDataUrl: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const prompt = `You are an expert construction engineer and architect specializing in Nigerian building construction. You have deep knowledge of Nigerian building codes, construction practices, material specifications, and cost estimation.

Analyze this building image with engineering precision. Extract building characteristics that will be used for a full construction cost estimate.

IMPORTANT: Be extremely precise and honest about what you can and cannot determine from a single photo. Do not hallucinate measurements — if you cannot determine something, provide your best conservative estimate and flag it as uncertain.

Return a JSON object with these exact fields:
{
  "detected_building_type": "bungalow" | "duplex" | "two_storey" | "apartment" | "office" | "shop" | "custom",
  "detected_building_type_confidence": 0.0-1.0,
  "estimated_length": number (meters — use visual scale cues: doors are ~0.9m wide, windows ~1.2m, floor height ~3m),
  "estimated_width": number (meters — if only one facade visible, estimate from building proportions),
  "estimated_floors": number (count visible floor levels — look for window rows, floor lines),
  "estimated_height_per_floor": number (meters — typically 3.0-3.5m for residential, 3.5-4.5m for commercial),
  "detected_roof_type": "gable" | "hip" | "mono_pitch" | "flat" | "custom",
  "detected_roof_type_confidence": 0.0-1.0,
  "estimated_roof_pitch": number (degrees — gable: 15-30°, hip: 15-25°, flat: 0-5°),
  "detected_roofing_material": "long_span_aluminium" | "stone_coated" | "gi_sheet" | "shingle" | "custom",
  "detected_roofing_material_confidence": 0.0-1.0,
  "detected_block_type": "9inch" | "6inch" | "5inch" | "custom",
  "detected_wall_finish": "unplastered" | "plastered" | "painted" | "faced_brick" | "stone" | "custom",
  "estimated_internal_wall_length": number (meters — for bungalows: 40-60% of external perimeter; for duplexes: 60-80%),
  "detected_openings": [{"type": "door" | "window", "estimated_width": number, "estimated_height": number, "estimated_count": number}],
  "detected_foundation_type": "strip_footing" | "pad_footing" | "raft" | "pile" | "custom",
  "detected_structural_frame": "unreinforced_blockwork" | "framed_with_columns" | "hybrid" | "uncertain",
  "estimated_bays": number (number of structural bays/columns visible, 0 if uncertain),
  "detected_condition": "under_construction" | "completed" | "renovation" | "dilapidated",
  "estimated_number_of_rooms": number (visible rooms based on openings, 0 if uncertain),
  "ai_confidence": "high" | "moderate" | "low",
  "confidence_factors": {
    "image_quality": 0.0-1.0,
    "angle_quality": 0.0-1.0,
    "scale_reference_visible": boolean,
    "multiple_facades_visible": boolean
  },
  "analysis_notes": [at most 3 short strings, each under 20 words, explaining the observations behind the numbers],
  "structural_observations": [at most 4 short strings about structural elements you can actually see: columns, beams, lintels, cracks],
  "warnings": [at most 6 short strings about limitations and risks],
  "verification_checklist": [at most 5 short strings the user should verify on site or from drawings]
}

PRECISION GUIDELINES:
1. Scale estimation: Use doors (0.9m wide, 2.1m tall), windows (1.2-1.5m wide, 1.2m tall), and floor heights (3m) as reference
2. If only one facade is visible, DO NOT guess the width — estimate based on building type proportions (bungalow L:W typically 1.5:1)
3. Roof pitch: Estimate from the visible roof slope angle relative to horizontal
4. Roofing material: Look for panel width, corrugation pattern, color, and reflectivity
5. Block type: Nigerian blocks come in 5-inch (solid only), 6-inch (solid or hollow), and 9-inch (hollow). Default to 9-inch unless you can clearly see thinner blocks. 9-inch is standard for foundations and load-bearing external walls. 6-inch is common for internal partitions. 5-inch is solid-only, used for non-load-bearing walls.
6. Internal walls: Cannot be seen — estimate based on building size and type
7. Foundation: Cannot be seen — ALWAYS default to "strip_footing" and add to warnings
8. Structural frame: Look for visible columns, beams, or column starter bars in unfinished buildings
9. Opening count: Count only visible openings, add a warning that hidden sides may have more
10. Condition: Look for scaffolding, fresh mortar, unpainted surfaces, or weathering
11. Be HONEST about confidence — if the image is blurry or at a poor angle, say "low" confidence

Always include in warnings:
- "Dimensions estimated from photo are approximate. Verify from architectural drawings."
- "Foundation type is not visible — defaulting to strip footing. Geotechnical investigation required."
- "Internal wall layout estimated statistically — verify from floor plans."

Always include in verification_checklist:
- "Confirm actual building dimensions from approved drawings"
- "Verify soil type and bearing capacity with geotechnical report"
- "Engage structural engineer for reinforcement design"
- "Verify roof structure and pitch from architectural drawings"`;

  // The declared type must match the bytes: a PNG or WebP sent as image/jpeg
  // is rejected or misread by the model.
  const declaredMime = /^data:([^;]+);base64,/.exec(imageDataUrl)?.[1];
  const mimeType = declaredMime ?? "image/jpeg";

  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageDataUrl.split(",")[1] ?? imageDataUrl,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      // Gemini 2.5 and later think before answering by default. Reading one
      // photograph into a fixed JSON shape gains nothing from that pass, and it
      // was adding many seconds to every request, so the budget is zero.
      thinkingConfig: { thinkingBudget: 0 },
      // Without a ceiling the model keeps writing prose inside the arrays.
      maxOutputTokens: 2048,
    },
  });

  // A 5xx is transient: retry with backoff, then report busy. A 429 is a quota
  // answer, and waiting 6.8 seconds to receive it again only made the page feel
  // broken, so it is surfaced immediately as busy. A connection that never
  // answers is bounded per attempt instead of hanging the request.
  const RETRYABLE = new Set([500, 502, 503, 504]);
  const BACKOFF_MS = [600, 1500, 3000];
  const ATTEMPT_TIMEOUT_MS = 28_000;
  let response: Response | null = null;
  let timedOut = false;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      );
    } catch (networkError) {
      response = null;
      timedOut = true;
      console.warn(
        `[ai-building-estimation] Gemini request failed, attempt ${attempt + 1}:`,
        networkError instanceof Error ? networkError.message : networkError,
      );
      if (attempt < BACKOFF_MS.length) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
      }
      continue;
    }
    if (response.ok || !RETRYABLE.has(response.status)) break;
    console.warn(
      `[ai-building-estimation] Gemini ${response.status}, attempt ${attempt + 1}`,
    );
    if (attempt < BACKOFF_MS.length) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }

  if (!response || !response.ok) {
    const status = response?.status ?? (timedOut ? 504 : 0);
    const errText = response ? await response.text() : "no response";
    console.error(
      "[ai-building-estimation] Gemini API error:",
      status,
      errText,
    );
    if (status === 429 || RETRYABLE.has(status)) {
      throw new GeminiBusyError(status);
    }
    throw new Error(`Gemini API error: ${status}`);
  }

  const geminiData = await response.json();
  const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error("No response text from Gemini");

  // A markdown fence or a stray sentence around the JSON used to fail the whole
  // request with a 500 after the model call had already been paid for.
  return parseVisionJson(textContent);
}

// ── AI output validation ──

interface ValidationWarning {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

function validateAiAnalysis(
  analysis: Record<string, unknown>,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check required fields
  const requiredFields = [
    "detected_building_type",
    "estimated_length",
    "estimated_width",
    "estimated_floors",
  ];
  for (const field of requiredFields) {
    if (analysis[field] === undefined || analysis[field] === null) {
      warnings.push({
        field,
        message: `Missing required field: ${field}`,
        severity: "error",
      });
    }
  }

  // Sanity checks on dimensions
  const length = Number(analysis.estimated_length) || 0;
  const width = Number(analysis.estimated_width) || 0;
  const floors = Number(analysis.estimated_floors) || 1;
  const height = Number(analysis.estimated_height_per_floor) || 3;

  if (length < 3)
    warnings.push({
      field: "estimated_length",
      message: `Length ${length}m is unusually small. Verify.`,
      severity: "warning",
    });
  if (length > 50)
    warnings.push({
      field: "estimated_length",
      message: `Length ${length}m is unusually large. Verify.`,
      severity: "warning",
    });
  if (width < 3)
    warnings.push({
      field: "estimated_width",
      message: `Width ${width}m is unusually small. Verify.`,
      severity: "warning",
    });
  if (width > 50)
    warnings.push({
      field: "estimated_width",
      message: `Width ${width}m is unusually large. Verify.`,
      severity: "warning",
    });
  if (height < 2.5)
    warnings.push({
      field: "height",
      message: `Floor height ${height}m is below 2.5m minimum.`,
      severity: "warning",
    });
  if (height > 5)
    warnings.push({
      field: "height",
      message: `Floor height ${height}m is above typical. Verify.`,
      severity: "info",
    });
  if (floors > 5)
    warnings.push({
      field: "floors",
      message: `${floors} floors — high-rise requires specialist design.`,
      severity: "warning",
    });

  // Roof pitch sanity
  const pitch = Number(analysis.estimated_roof_pitch) || 0;
  const roofType = analysis.detected_roof_type as string;
  if (roofType === "flat" && pitch > 5) {
    warnings.push({
      field: "roof_pitch",
      message: `Flat roof with ${pitch}° pitch — should be near 0°.`,
      severity: "warning",
    });
  }
  if (roofType === "gable" && (pitch < 10 || pitch > 40)) {
    warnings.push({
      field: "roof_pitch",
      message: `Gable roof pitch ${pitch}° is outside typical 15-30° range.`,
      severity: "warning",
    });
  }

  // Opening count sanity
  const openings = analysis.detected_openings as unknown[];
  if (openings && Array.isArray(openings)) {
    const totalOpenings = openings.reduce(
      (sum: number, o: unknown) =>
        sum +
        Math.floor(Number((o as Record<string, unknown>).estimated_count) || 0),
      0,
    );
    const buildingArea = length * width * floors;
    if (buildingArea > 0 && totalOpenings > buildingArea / 2) {
      warnings.push({
        field: "openings",
        message: `Opening count (${totalOpenings}) seems high for building size. Verify.`,
        severity: "info",
      });
    }
  }

  return warnings;
}

// ── Main handler ──

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit: 20 AI requests per minute per user/IP
  const rlKey = await getRateLimitKey(req);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.AI);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }
  const _rlHeaders = rateLimitHeaders(rl.remaining, rl.resetAt);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const geminiApiKey =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { error: "Server not configured.", code: "NOT_CONFIGURED" },
      500,
    );
  }

  if (!geminiApiKey) {
    return jsonResponse(
      { error: "AI service not configured.", code: "NO_API_KEY" },
      503,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── Auth & access control ──
    const userId = await getAuthenticatedUserId(
      req,
      supabaseUrl,
      supabaseAnonKey,
    );
    // Independent lookups, so they share one round trip instead of two.
    const [admin, paid] = userId
      ? await Promise.all([
          isUserAdmin(supabase, userId),
          getUserPaidStatus(supabase, userId),
        ])
      : [false, false];

    const config = await getEstimationConfig(supabase);
    if (!config || !config.estimation_enabled) {
      return jsonResponse(
        {
          error: "Image estimation is currently disabled.",
          code: "AI_DISABLED",
        },
        403,
      );
    }

    if (config.estimation_access_mode === "disabled") {
      return jsonResponse(
        {
          error: "Image estimation is currently disabled.",
          code: "AI_DISABLED",
        },
        403,
      );
    }

    // Read body once (req.json() can only be called once)
    const body = (await req.json()) as EstimationRequest;

    /**
     * The only price book in this function is the Nigerian one, and it used to
     * be applied to every visitor because the market was never read. A
     * contractor outside Nigeria therefore received naira costs that looked
     * like local ones. Quantities are still worth extracting for any market,
     * so the request is refused with the reason rather than silently priced.
     */
    const statedMarket = String(body.market ?? "")
      .trim()
      .toUpperCase();
    if (statedMarket && statedMarket !== "NG") {
      return jsonResponse(
        {
          error:
            "Photo estimation cannot price this market: only the Nigerian price book is configured here. Run the takeoff through the build-to-roof estimator for " +
            statedMarket +
            " so local prices and units are used.",
          code: "PRICE_NOT_DETERMINED",
          market: statedMarket,
        },
        422,
      );
    }

    // ── Centralized FRELUX AI Gateway & Rewarded Access Gate ──
    const gateway = new AiGateway(
      supabaseUrl,
      supabaseServiceKey,
      supabaseAnonKey,
    );
    let gatewayAuth;
    try {
      gatewayAuth = await gateway.checkAndReserve(req, {
        featureKey: "ai-building-estimation",
        modelName: "gemini-3.6-flash",
        promptChars: body.imageDataUrl ? body.imageDataUrl.length : 0,
      });
    } catch (gateErr) {
      const gateMessage =
        gateErr instanceof Error ? gateErr.message : String(gateErr);
      return jsonResponse(
        {
          error: gateMessage || "AI access denied.",
          code: gateMessage.includes("DAILY_LIMIT_REACHED")
            ? "USAGE_LIMIT_REACHED"
            : "AD_REWARD_REQUIRED",
        },
        403,
      );
    }

    // ── Process request ──
    const clientId = body.clientId ?? "unknown";
    const projectName = body.projectName ?? "AI-Estimated Building";
    const location = body.location ?? "Nigeria";

    if (!body.imageDataUrl && !body.imageUrl) {
      return jsonResponse(
        { error: "No image provided.", code: "NO_IMAGE" },
        400,
      );
    }

    // For image URLs, we'd need to fetch and convert to base64.
    // For now, we support imageDataUrl (base64 from frontend)
    const imageDataUrl = body.imageDataUrl;
    if (!imageDataUrl) {
      return jsonResponse(
        {
          error: "Image URL processing not yet supported.",
          code: "UNSUPPORTED",
        },
        400,
      );
    }

    // ── AI analysis ──
    const analysis = await analyzeBuildingImage(imageDataUrl, geminiApiKey);

    // ── Validate AI output ──
    const validationWarnings = validateAiAnalysis(analysis);
    if (validationWarnings.length > 0) {
      // Add validation warnings to the analysis
      const existingWarnings = (analysis.warnings as string[]) ?? [];
      analysis.warnings = [
        ...existingWarnings,
        ...validationWarnings.map(
          (w) => `[${w.severity.toUpperCase()}] ${w.field}: ${w.message}`,
        ),
      ];
    }
    analysis.validation_passed =
      validationWarnings.filter((w) => w.severity === "error").length === 0;

    // ── Finalize Centralized AI Gateway Reservation ──
    if (gatewayAuth) {
      await gateway.finalize(gatewayAuth, {
        status: "success",
        outputChars: JSON.stringify(analysis).length,
      });
    }

    // ── Build estimate input ──
    // Every value the builder derives by rule instead of reading it from the
    // photo is appended to the warnings, so the review screen can show which
    // numbers are assumptions rather than observations.
    const built = buildEstimateInput(
      analysis as AiAnalysis,
      projectName,
      location,
      new Date().toISOString().split("T")[0],
    );
    if (built.refusal || !built.input) {
      // The model call itself completed and was already finalised above; only
      // the estimate is refused, so the reservation is not finalised twice.
      return jsonResponse(
        {
          error: built.refusal ?? "The photo did not give a usable estimate.",
          code: "MEASUREMENTS_INCOMPLETE",
          // What was actually read comes back so the estimator form can be
          // filled from it. No number here is derived to stand in for a
          // measurement.
          measurements: built.measurements,
          fieldSources: built.fieldSources,
          needsConfirmation: built.needsConfirmation,
          analysis,
        },
        422,
      );
    }
    if (built.notes.length > 0) {
      analysis.warnings = [
        ...((analysis.warnings as string[]) ?? []),
        ...built.notes.map((note) => `[ASSUMED] ${note}`),
      ];
    }
    const estimateInput = built.input;

    // ── Save to database if authenticated ──
    let savedId: string | null = null;
    if (userId) {
      const { data: saved } = await supabase
        .from("estimation_results")
        .insert({
          user_id: userId,
          project_name: projectName,
          analysis,
          estimate_summary: {
            building_type: analysis.detected_building_type,
            floors: analysis.estimated_floors,
            ai_confidence: analysis.ai_confidence,
            // So a saved row says which figures were defaults, not readings.
            field_sources: built.fieldSources,
            needs_confirmation: built.needsConfirmation,
          },
          full_estimate: estimateInput,
        })
        .select("id")
        .maybeSingle();

      savedId = saved?.id ?? null;
    }

    return jsonResponse({
      analysis,
      estimateInput,
      // Provenance travels with the numbers: the review screen marks every
      // field that is an engine default rather than a reading.
      measurements: built.measurements,
      fieldSources: built.fieldSources,
      needsConfirmation: built.needsConfirmation,
      savedId,
    });
  } catch (err) {
    console.error("[ai-building-estimation] Error:", err);
    if (err instanceof GeminiBusyError) {
      return jsonResponse(
        {
          error:
            "The AI vision service is busy right now. Please try again in a minute.",
          code: "AI_BUSY",
        },
        503,
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
});
