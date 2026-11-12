// =========================================================
// Client identity: submit one government ID and the account that funds
// escrow, and have the names compared immediately.
//
// This was hosted inside paystack-verify for a while because the project was
// at its function limit and a deploy returned 402. Eighteen retired ARCHIE
// functions freed the slot, so it stands on its own again.
// =========================================================
import { serveWithCors } from "../_shared/serve.ts";
import { handleClientIdentity } from "../_shared/client-identity.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  // Identity submissions are rare and sensitive, so they get the auth budget
  // rather than the general one.
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AUTH);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS") return json({}, 204);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const result = await handleClientIdentity(req, body);
  return json(result.body, result.status);
});
