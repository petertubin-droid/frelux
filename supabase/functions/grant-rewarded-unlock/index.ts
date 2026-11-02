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
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * No client-generated token, SDK callback, or active-provider flag proves an
 * ad completion. Direct unlocks remain closed until a provider-specific SSV /
 * authenticated postback is correlated to a server-created ad session. This
 * includes Monetag, AdSense (pending approval), Adsterra and future providers.
 */
serveWithCors(async (req: Request) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AD);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  let payload: {
    toolKey?: unknown;
    clientHash?: unknown;
    adProvider?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body", code: "BAD_REQUEST" },
      400,
    );
  }

  if (
    typeof payload.toolKey !== "string" ||
    !payload.toolKey.trim() ||
    typeof payload.clientHash !== "string" ||
    !payload.clientHash.trim()
  ) {
    return jsonResponse(
      { error: "toolKey and clientHash are required", code: "BAD_REQUEST" },
      400,
    );
  }

  return jsonResponse(
    {
      success: false,
      error:
        "Reward verification is not configured for this ad provider. No unlock was granted.",
      code: "SERVER_VERIFICATION_NOT_CONFIGURED",
      provider:
        typeof payload.adProvider === "string" ? payload.adProvider : null,
    },
    503,
  );
});
