// =========================================================
// FRELUX VERIFY — sweep expired hosted copies
//
// Deletes the storage objects whose 3-day retention has passed and clears
// the path on the record. The fingerprint record and its OpenTimestamps
// proof are never touched: they are the permanent proof.
//
// Auth: an operator secret (VERIFY_PURGE_SECRET) or the service role key,
// so this can be run by a scheduler or by hand without opening it publicly.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const BUCKET = "verify-copies";
const BATCH = 200;

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503);
    }

    const expected = Deno.env.get("VERIFY_PURGE_SECRET");
    const authorization = req.headers.get("authorization") ?? "";
    const authorised =
      (expected && authorization === `Bearer ${expected}`) ||
      authorization === `Bearer ${serviceRoleKey}`;
    if (!authorised) return json({ error: "UNAUTHORISED" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: expired, error } = await admin
      .from("blockchain_document_records")
      .select("id, hosted_copy_path")
      .not("hosted_copy_path", "is", null)
      .lte("hosted_copy_expires_at", new Date().toISOString())
      .limit(BATCH);
    if (error) return json({ error: "LOOKUP_FAILED" }, 503);

    const paths = (expired ?? [])
      .map((row) => row.hosted_copy_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);

    let removed = 0;
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
      if (removeError) return json({ error: "COPY_DELETE_FAILED" }, 503);
      removed = paths.length;
    }

    if (expired && expired.length > 0) {
      const { error: clearError } = await admin
        .from("blockchain_document_records")
        .update({
          hosted_copy_path: null,
          hosted_copy_deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          expired.map((row) => row.id),
        );
      if (clearError) return json({ error: "COPY_RECORD_FAILED" }, 503);
    }

    return json({
      success: true,
      expired_records: expired?.length ?? 0,
      copies_deleted: removed,
      retained: "fingerprints and OpenTimestamps proofs",
    });
  } catch (error) {
    console.error(
      "[verify-copy-purge] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "PURGE_FAILED" }, 500);
  }
});
