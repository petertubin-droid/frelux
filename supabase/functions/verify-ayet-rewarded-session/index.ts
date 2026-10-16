import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AD);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey)
    return json({ error: "Server configuration error" }, 500);
  const token =
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return json({ error: "Authentication required" }, 401);
  const admin = createClient(url, serviceKey);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user)
    return json({ error: "Authentication required" }, 401);
  let payload: { sessionId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (
    typeof payload.sessionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(payload.sessionId)
  )
    return json({ error: "Invalid session" }, 400);

  const { data: session, error } = await admin
    .from("ayet_rewarded_sessions")
    .select("status, credits_awarded, balance_after, expires_at")
    .eq("id", payload.sessionId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return json({ error: "Could not check rewarded session" }, 500);
  if (!session) return json({ error: "Session not found" }, 404);
  if (session.status === "completed")
    return json({
      success: true,
      status: "completed",
      creditsEarned: session.credits_awarded,
      newBalance: session.balance_after,
    });
  if (
    session.status === "expired" ||
    Date.parse(session.expires_at) <= Date.now()
  )
    return json(
      {
        success: false,
        status: "expired",
        error: "The secure ad session expired before ayeT verified completion.",
      },
      410,
    );
  return json({ success: false, status: "pending" }, 202);
});
