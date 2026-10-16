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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !serviceKey || !anonKey)
    return json({ error: "Server configuration error" }, 500);

  const token =
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return json({ error: "Authentication required" }, 401);
  const admin = createClient(url, serviceKey);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user)
    return json({ error: "Authentication required" }, 401);

  const { data: provider, error: providerError } = await admin
    .from("ad_providers")
    .select("is_active, credentials, settings")
    .eq("slug", "ayet_studios")
    .maybeSingle();
  if (providerError)
    return json({ error: "Could not read ayeT configuration" }, 500);
  const creds = provider?.credentials as Record<string, unknown> | undefined;
  const settings = provider?.settings as Record<string, unknown> | undefined;
  if (
    !provider?.is_active ||
    settings?.rewarded_video_enabled !== true ||
    typeof creds?.api_key !== "string" ||
    !creds.api_key.trim() ||
    typeof creds?.placement_id !== "string" ||
    !/^\d+$/.test(creds.placement_id.trim()) ||
    typeof settings?.rewarded_adslot_name !== "string" ||
    !settings.rewarded_adslot_name.trim() ||
    typeof settings?.rewarded_adslot_id !== "string" ||
    !/^\d+$/.test(settings.rewarded_adslot_id.trim())
  ) {
    return json(
      {
        error: "ayeT rewarded video is not fully configured",
        code: "AYET_NOT_CONFIGURED",
      },
      409,
    );
  }

  const { data: rewardConfig, error: configError } = await admin
    .from("rewarded_ad_credit_config")
    .select("is_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (configError)
    return json({ error: "Could not read reward settings" }, 500);
  if (!rewardConfig?.is_enabled)
    return json(
      {
        error: "Rewarded credit earning is disabled",
        code: "REWARDS_DISABLED",
      },
      409,
    );

  const sessionId = crypto.randomUUID();
  const externalIdentifier = crypto.randomUUID().replaceAll("-", "");
  const { error: insertError } = await admin
    .from("ayet_rewarded_sessions")
    .insert({
      id: sessionId,
      user_id: auth.user.id,
      external_identifier: externalIdentifier,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
  if (insertError)
    return json({ error: "Could not start a secure rewarded session" }, 500);
  return json({
    sessionId,
    externalIdentifier,
    placementId: creds.placement_id.trim(),
    adslotName: settings.rewarded_adslot_name.trim(),
  });
});
