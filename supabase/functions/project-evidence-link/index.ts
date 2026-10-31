// Private evidence access.
//
// Verification showed the storage signing endpoint serving an object to a
// signed-in user who is not a project member. Access is therefore decided here,
// server-side, before any link is created: the caller must be the project owner,
// an active participant, or an administrator. Links are short-lived and scoped
// to one attachment record, so arbitrary storage paths cannot be signed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";

const BUCKET = "project-evidence";
const TTL_SECONDS = 120;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return json({ ok: false, error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey)
    return json({ ok: false, error: "Service is not configured." }, 500);

  const userId = await getVerifiedUserId(req);
  if (!userId)
    return json({ ok: false, error: "Sign in to open project evidence." }, 401);

  let attachmentId = "";
  try {
    const body = await req.json();
    attachmentId = String(body?.attachmentId ?? "");
  } catch {
    return json({ ok: false, error: "Send an attachmentId." }, 400);
  }
  if (!attachmentId)
    return json({ ok: false, error: "Send an attachmentId." }, 400);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: attachment } = await supabase
    .from("project_attachments")
    .select("id,project_id,storage_path,deleted_at")
    .eq("id", attachmentId)
    .maybeSingle();

  // Deleted or unknown evidence answers the same way, so ids cannot be probed.
  if (!attachment || attachment.deleted_at) {
    return json({ ok: false, error: "Evidence not found." }, 404);
  }

  const [{ data: membership }, { data: project }, { data: profile }] =
    await Promise.all([
      supabase
        .from("project_members")
        .select("role,status")
        .eq("project_id", attachment.project_id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("contractor_projects")
        .select("user_id")
        .eq("id", attachment.project_id)
        .maybeSingle(),
      supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    ]);

  const isOwner = project?.user_id === userId;
  const isMember = membership?.status === "active";
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isMember && !isAdmin) {
    return json(
      {
        ok: false,
        error: "You do not have access to this project's evidence.",
      },
      403,
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storage_path, TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    return json(
      { ok: false, error: "Could not open that evidence right now." },
      502,
    );
  }

  return json({ ok: true, url: signed.signedUrl, expiresIn: TTL_SECONDS });
});
