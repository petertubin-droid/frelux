import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Tiered AI credit pricing.
 * Each rewarded video ad grants 5 credits. Max 5 ads/day = 25 credits/day.
 * AI feature access costs escalate:
 *   1st access: 5 credits
 *   2nd access: 8 credits
 *   3rd access (last): 12 credits
 *   Total: 25 credits for 3 accesses per day
 */
const AI_TIERS = [5, 8, 12];
const MAX_AI_ACCESSES_PER_DAY = 3;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  // Rate limit: 10 credit operations per minute per user/IP
  const rlKey = getRateLimitKey(req, req.headers.get("x-user-id") || undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.PAYMENT);
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey)
    return jsonResponse(
      { error: "Server not configured", code: "CONFIG_ERROR" },
      500,
    );

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader)
    return jsonResponse(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      401,
    );

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user)
    return jsonResponse(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      401,
    );

  let payload: {
    featureKey: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON", code: "BAD_REQUEST" }, 400);
  }

  const { featureKey, idempotencyKey, metadata = {} } = payload;
  if (!featureKey || !idempotencyKey)
    return jsonResponse(
      {
        error: "featureKey and idempotencyKey are required",
        code: "BAD_REQUEST",
      },
      400,
    );

  // Get the server-side feature config
  const { data: feature, error: featError } = await admin
    .from("ai_feature_costs")
    .select("*")
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (featError || !feature)
    return jsonResponse(
      { error: "AI feature not found", code: "NOT_FOUND" },
      404,
    );
  if (!feature.is_enabled)
    return jsonResponse(
      { error: "This feature is currently disabled", code: "DISABLED" },
      403,
    );
  if (!feature.requires_credits)
    return jsonResponse({
      success: true,
      message: "Feature is free",
      newBalance: 0,
      cost: 0,
    });

  // ── Tiered pricing: check today's usage count for this feature ──
  const today = new Date().toISOString().slice(0, 10);

  const { data: usageToday } = await admin
    .from("ai_feature_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature_key", featureKey)
    .gte("created_at", today + "T00:00:00Z");

  const usageCount = usageToday?.count ?? 0;

  // Check if max accesses reached
  if (usageCount >= MAX_AI_ACCESSES_PER_DAY) {
    return jsonResponse(
      {
        success: false,
        error: `Daily AI access limit reached (${MAX_AI_ACCESSES_PER_DAY} accesses/day). Come back tomorrow!`,
        code: "DAILY_LIMIT",
        tier: usageCount,
        maxTier: MAX_AI_ACCESSES_PER_DAY,
      },
      429,
    );
  }

  // Determine tiered cost
  const tierCost = AI_TIERS[usageCount] ?? feature.credit_cost;

  // Call the atomic spend function with tiered cost
  const { data: result, error: fnError } = await admin.rpc("spend_credits", {
    p_user_id: user.id,
    p_feature_key: featureKey,
    p_amount: tierCost,
    p_idempotency_key: idempotencyKey,
    p_metadata: { ...metadata, tier: usageCount, tier_cost: tierCost },
  });

  if (fnError)
    return jsonResponse(
      {
        error: "Failed to spend credits",
        code: "SPEND_FAILED",
        details: fnError.message,
      },
      500,
    );

  const row = result?.[0];
  if (!row?.success) {
    if (row?.error === "insufficient_credits") {
      return jsonResponse(
        {
          success: false,
          error: "Not enough FRELUX Credits",
          code: "INSUFFICIENT_CREDITS",
          currentBalance: row?.new_balance ?? 0,
          requiredCredits: tierCost,
          adUnlockEnabled: feature.ad_unlock_enabled,
          tier: usageCount,
          nextTierCost:
            usageCount + 1 < MAX_AI_ACCESSES_PER_DAY
              ? AI_TIERS[usageCount + 1]
              : null,
          maxTier: MAX_AI_ACCESSES_PER_DAY,
        },
        402,
      );
    }
    if (row?.error === "daily_limit_reached")
      return jsonResponse(
        {
          success: false,
          error: "Daily usage limit reached for this feature",
          code: "DAILY_LIMIT",
        },
        429,
      );
    if (row?.error === "already_spent")
      return jsonResponse({
        success: true,
        message: "Already paid",
        newBalance: row?.new_balance ?? 0,
        cost: 0,
      });
    return jsonResponse(
      {
        success: false,
        error: row?.error ?? "Unknown error",
        code: "SPEND_FAILED",
      },
      400,
    );
  }

  return jsonResponse({
    success: true,
    message: "Credits spent",
    newBalance: row.new_balance,
    cost: tierCost,
    tier: usageCount,
    nextTierCost:
      usageCount + 1 < MAX_AI_ACCESSES_PER_DAY
        ? AI_TIERS[usageCount + 1]
        : null,
    accessesRemaining: MAX_AI_ACCESSES_PER_DAY - usageCount - 1,
    maxTier: MAX_AI_ACCESSES_PER_DAY,
  });
});
