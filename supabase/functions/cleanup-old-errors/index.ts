// FRELUX Error Retention Cleanup
// Runs periodically to delete old resolved errors.
// Keeps unresolved critical errors indefinitely.
// Scheduled via Supabase pg_cron or invoked manually.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import { callerKindFor } from "../_shared/internal-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deployed with verify_jwt off so a scheduler can reach it, which means the
  // platform gateway is not a gate: this endpoint deletes rows, so the caller
  // must prove it is the scheduler or another function holding the service key.
  const caller = callerKindFor(req, {
    serviceRoleKey,
    cronSecret: Deno.env.get("CLEANUP_CRON_SECRET"),
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // An administrator running the retention sweep by hand is also legitimate,
  // so fall back to a signed-in admin rather than an all-or-nothing gate.
  if (caller === "none") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1]?.trim() ?? "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: authUser, error: authError } =
      await admin.auth.getUser(token);
    if (authError || !authUser?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", authUser.user.id)
      .maybeSingle();
    if (!profile || !["admin", "super_admin"].includes(String(profile.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Default: 90 days retention for resolved non-critical errors
  const retentionDays = 90;
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Delete old resolved non-critical errors
  const { count, error } = await admin
    .from("application_errors")
    .delete({ count: "exact" })
    .eq("resolved", true)
    .neq("severity", "critical")
    .lt("last_seen", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Phase 7 §15: configurable retention for API usage metering.
  // Billing records (frelux_api_transactions) are retained; only
  // per-request metering rows age out.
  const apiUsageRetentionDays = 90;
  const apiUsageCutoff = new Date(
    Date.now() - apiUsageRetentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count: apiUsageDeleted, error: apiUsageError } = await admin
    .from("frelux_api_usage")
    .delete({ count: "exact" })
    .lt("created_at", apiUsageCutoff);

  if (apiUsageError) {
    return new Response(JSON.stringify({ error: apiUsageError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      deleted: count ?? 0,
      retention_days: retentionDays,
      api_usage_deleted: apiUsageDeleted ?? 0,
      api_usage_retention_days: apiUsageRetentionDays,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
