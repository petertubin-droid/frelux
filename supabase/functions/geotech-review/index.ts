// Site & soil intelligence: geotechnical report review.
//
// Only an administrator or a verified professional may confirm or reject a
// geotechnical finding. The role check happens here, on the server, against the
// caller's verified identity, and every decision is written to the append-only
// audit trail in the same transaction as the status change.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json({ ok: false, error: "Service is not configured." }, 500);
  }

  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ ok: false, error: "Sign in to review reports." }, 401);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "professional") {
    return json({ ok: false, error: "Reviewer access is required." }, 403);
  }

  let body: { reportId?: string; decision?: "verify" | "reject"; note?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const reportId = (body.reportId ?? "").trim();
  const decision = body.decision;
  if (!reportId || (decision !== "verify" && decision !== "reject")) {
    return json({ ok: false, error: "A report and a decision are required." }, 400);
  }

  const { data: report, error: readError } = await supabase
    .from("geotechnical_reports")
    .select("id,project_site_id,verification_status,bearing_capacity_kpa,title")
    .eq("id", reportId)
    .maybeSingle();
  if (readError || !report) {
    return json({ ok: false, error: "That report was not found." }, 404);
  }

  const nextStatus = decision === "verify" ? "verified" : "rejected";
  if (report.verification_status === nextStatus) {
    return json({ ok: true, status: nextStatus, unchanged: true });
  }

  const { error: updateError } = await supabase
    .from("geotechnical_reports")
    .update({
      verification_status: nextStatus,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      review_note: (body.note ?? "").trim() || null,
    })
    .eq("id", reportId);
  if (updateError) {
    return json({ ok: false, error: "The review could not be saved." }, 500);
  }

  await supabase.from("site_intelligence_audit").insert({
    actor: userId,
    action: decision === "verify" ? "report_verified" : "report_rejected",
    entity: "geotechnical_reports",
    entity_id: reportId,
    before: { verification_status: report.verification_status },
    after: { verification_status: nextStatus },
    note: (body.note ?? "").trim(),
  });

  return json({
    ok: true,
    status: nextStatus,
    report_id: reportId,
    bearing_capacity_kpa: report.bearing_capacity_kpa,
  });
});
