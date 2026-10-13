import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Client-Hash, x-client-hash",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  // Rate limit this endpoint per user / IP
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AD);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey)
    return jsonResponse(
      { error: "Server not configured", code: "CONFIG_ERROR" },
      500,
    );

  let payload: {
    adProvider: string;
    adEventId: string;
    adToken?: string;
    mode?: "earn_credits" | "unlock_feature" | "unlock_guest";
    clientHash?: string;
    featureKey?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON", code: "BAD_REQUEST" }, 400);
  }

  const {
    adProvider,
    adEventId,
    adToken,
    mode = "earn_credits",
    featureKey,
    metadata = {},
  } = payload;

  if (!adProvider || !adEventId)
    return jsonResponse(
      { error: "adProvider and adEventId are required", code: "BAD_REQUEST" },
      400,
    );

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const devMode = Deno.env.get("REWARDED_DEV_MODE") === "true";

  // ──────────────────────────────────────────────────────────
  // MODE 1: unlock_guest (Anonymous Guest 1 Free Operation Unlock)
  // ──────────────────────────────────────────────────────────
  if (mode === "unlock_guest") {
    const clientHash =
      payload.clientHash ||
      req.headers.get("x-client-hash") ||
      req.headers.get("X-Client-Hash");

    if (!clientHash) {
      return jsonResponse(
        {
          error: "clientHash is required for guest unlock",
          code: "BAD_REQUEST",
        },
        400,
      );
    }

    // Verify ad completion
    if (!devMode) {
      let verified = false;

      // 1. Check attestation token
      if (typeof adToken === "string" && adToken.startsWith("att_")) {
        const parts = adToken.split("_");
        const slug = parts[1];
        const timestamp = Number(parts[parts.length - 1]);
        if (slug && Number.isFinite(timestamp) && timestamp > 0) {
          const { data: providerRow } = await admin
            .from("ad_providers")
            .select("id, slug, is_active")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle();
          verified = !!providerRow;
        }
      }

      // 2. Check recorded postback event
      if (!verified) {
        const { data: adEvent } = await admin
          .from("rewarded_ad_events")
          .select("*")
          .eq("event_type", "reward")
          .eq("client_hash", clientHash)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        verified = !!adEvent;
      }

      if (!verified) {
        return jsonResponse(
          {
            error:
              "Ad not verified. Please watch the sponsor ad to unlock your daily guest operation.",
            code: "AD_NOT_VERIFIED",
          },
          403,
        );
      }
    }

    const { data: result, error: fnError } = await admin.rpc(
      "unlock_guest_daily_ai_allowance",
      {
        p_client_hash: clientHash,
        p_ad_provider: adProvider,
        p_ad_event_id: adEventId,
        p_metadata: metadata,
      },
    );

    if (fnError) {
      return jsonResponse(
        {
          error: "Failed to unlock guest allowance",
          code: "UNLOCK_FAILED",
          details: fnError.message,
        },
        500,
      );
    }

    const row = result?.[0];
    if (!row?.success) {
      if (row?.error === "guest_limit_already_consumed") {
        return jsonResponse(
          {
            success: false,
            error:
              "You have already consumed your 1 free guest AI operation for today. Please sign in or create an account to continue.",
            code: "GUEST_LIMIT_REACHED",
          },
          429,
        );
      }
      return jsonResponse(
        {
          success: false,
          error: row?.error ?? "Unlock failed",
          code: "UNLOCK_FAILED",
        },
        400,
      );
    }

    return jsonResponse({
      success: true,
      hasAdCredit: true,
      message: "1 free guest AI operation unlocked for today!",
    });
  }

  // ──────────────────────────────────────────────────────────
  // MODES REQUIRING AUTHENTICATED USER (earn_credits, unlock_feature)
  // ──────────────────────────────────────────────────────────
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

  // Verification for registered user
  if (!devMode) {
    const { data: postbackEvent } = await admin
      .from("rewarded_ad_credit_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("ad_provider", adProvider)
      .eq("ad_event_id", adEventId)
      .eq("status", "completed")
      .maybeSingle();

    let verified = !!postbackEvent;

    if (!verified) {
      const { data: adEvent } = await admin
        .from("rewarded_ad_events")
        .select("*")
        .eq("event_type", "reward")
        .eq("client_hash", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      verified = !!adEvent;
    }

    if (
      !verified &&
      typeof adToken === "string" &&
      adToken.startsWith("att_")
    ) {
      const parts = adToken.split("_");
      const slug = parts[1];
      const timestamp = Number(parts[parts.length - 1]);
      if (slug && Number.isFinite(timestamp) && timestamp > 0) {
        const { data: providerRow } = await admin
          .from("ad_providers")
          .select("id, slug, is_active")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        verified = !!providerRow;
      }
    }

    if (!verified) {
      return jsonResponse(
        {
          error: "Ad not verified. No completed ad event found.",
          code: "AD_NOT_VERIFIED",
        },
        403,
      );
    }
  }

  // MODE: earn_credits (max 4 ads daily for unpaid users)
  if (mode === "earn_credits") {
    const { data: config } = await admin
      .from("rewarded_ad_credit_config")
      .select("credits_per_ad, is_enabled, daily_earn_limit")
      .eq("id", 1)
      .maybeSingle();
    if (!config)
      return jsonResponse(
        { error: "Config not found", code: "CONFIG_ERROR" },
        500,
      );
    if (!config.is_enabled)
      return jsonResponse(
        { error: "Rewarded ads are currently disabled", code: "DISABLED" },
        403,
      );

    const { data: result, error: fnError } = await admin.rpc(
      "award_ad_credits",
      {
        p_user_id: user.id,
        p_ad_provider: adProvider,
        p_ad_event_id: adEventId,
        p_amount: config.credits_per_ad,
        p_metadata: metadata,
      },
    );

    if (fnError)
      return jsonResponse(
        {
          error: "Failed to award credits",
          code: "AWARD_FAILED",
          details: fnError.message,
        },
        500,
      );
    const row = result?.[0];
    if (!row?.success) {
      if (row?.error === "already_awarded")
        return jsonResponse(
          {
            success: false,
            error: "This ad has already been rewarded.",
            code: "ALREADY_AWARDED",
            newBalance: row?.new_balance ?? 0,
          },
          409,
        );
      if (row?.error === "daily_earn_limit")
        return jsonResponse(
          {
            success: false,
            error: `Daily ad watch limit reached (maximum ${config.daily_earn_limit || 4} ads per day). Come back tomorrow to earn more credits!`,
            code: "DAILY_LIMIT",
            newBalance: row?.new_balance ?? 0,
          },
          429,
        );
      return jsonResponse(
        {
          success: false,
          error: row?.error ?? "Unknown error",
          code: "AWARD_FAILED",
        },
        400,
      );
    }
    return jsonResponse({
      success: true,
      creditsEarned: config.credits_per_ad,
      newBalance: row.new_balance,
      message: `+${config.credits_per_ad} FRELUX Credits earned!`,
    });
  }

  // MODE: unlock_feature
  if (mode === "unlock_feature") {
    if (!featureKey)
      return jsonResponse(
        { error: "featureKey required", code: "BAD_REQUEST" },
        400,
      );
    const { data: result, error: fnError } = await admin.rpc(
      "unlock_ai_feature_via_ad",
      {
        p_user_id: user.id,
        p_feature_key: featureKey,
        p_ad_provider: adProvider,
        p_ad_event_id: adEventId,
        p_metadata: metadata,
      },
    );
    if (fnError)
      return jsonResponse(
        {
          error: "Failed to unlock",
          code: "UNLOCK_FAILED",
          details: fnError.message,
        },
        500,
      );
    const row = result?.[0];
    if (!row?.success)
      return jsonResponse(
        {
          success: false,
          error: row?.error ?? "Unknown error",
          code: "UNLOCK_FAILED",
        },
        400,
      );
    return jsonResponse({
      success: true,
      message: "Feature unlocked via rewarded ad!",
      featureKey,
    });
  }

  return jsonResponse({ error: "Invalid mode", code: "BAD_REQUEST" }, 400);
});
