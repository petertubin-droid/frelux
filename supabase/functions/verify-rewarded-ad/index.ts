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

/**
 * Client SDK callbacks, local timers, and client-insertable analytics are not
 * proof of a rewarded view. Until a provider-specific authenticated server
 * verification/postback is configured and correlated to a server-issued event,
 * this endpoint deliberately does not grant credits or unlocks. This applies
 * equally to Monetag, AdSense (including pending approval), Adsterra, and any
 * other provider. REWARDED_DEV_MODE is intentionally not an authorization path.
 */
serveWithCors(async (req: Request) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AD);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  let payload: {
    adProvider?: unknown;
    adEventId?: unknown;
    mode?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON", code: "BAD_REQUEST" }, 400);
  }

  if (
    typeof payload.adProvider !== "string" ||
    !payload.adProvider.trim() ||
    typeof payload.adEventId !== "string" ||
    !payload.adEventId.trim()
  ) {
    return jsonResponse(
      { error: "adProvider and adEventId are required", code: "BAD_REQUEST" },
      400,
    );
  }

  const mode = payload.mode ?? "earn_credits";
  if (
    !["earn_credits", "unlock_feature", "unlock_guest"].includes(String(mode))
  ) {
    return jsonResponse({ error: "Invalid mode", code: "BAD_REQUEST" }, 400);
  }

  return jsonResponse(
    {
      success: false,
      error:
        "Reward verification is not configured for this ad provider. No credits or unlocks were granted.",
      code: "SERVER_VERIFICATION_NOT_CONFIGURED",
      provider: payload.adProvider.trim(),
    },
    503,
  );
});
