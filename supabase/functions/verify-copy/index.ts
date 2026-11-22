// =========================================================
// FRELUX VERIFY — hosted copy upload
//
// Called after a sealed export is produced. The sealed bytes the client
// downloaded become the "second original" the QR opens.
//
// Contract:
//  - the caller is authenticated and must own the record that carries the
//    token (the token is printed in their document, so it is not a secret
//    they can share, but the upload must still be the owner's);
//  - the copy expires 3 days after upload; the fingerprint stays anchored;
//  - failure is never fatal for the export — the record already exists.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getVerifiedUserId,
  getRateLimitKey,
  checkRateLimit,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const BUCKET = "verify-copies";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MiB
const COPY_DAYS = 3;
const tokenPattern = /^[a-z2-7]{16,32}$/;

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
    const limit = checkRateLimit(
      `verify-copy:${await getRateLimitKey(req)}`,
      RATE_LIMITS.PAYMENT,
    );
    if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

    const userId = await getVerifiedUserId(req);
    if (!userId) return json({ error: "AUTHENTICATION_REQUIRED" }, 401);

    const token = (new URL(req.url).searchParams.get("token") ?? "").trim();
    if (!tokenPattern.test(token)) return json({ error: "INVALID_TOKEN" }, 400);

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      return json({ error: "PDF_REQUIRED" }, 415);
    }

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength === 0) return json({ error: "EMPTY_BODY" }, 400);
    if (bytes.byteLength > MAX_BYTES) return json({ error: "FILE_TOO_LARGE" }, 413);
    // A PDF must actually start with %PDF.
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (header !== "%PDF-") return json({ error: "PDF_REQUIRED" }, 415);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: record, error: lookupError } = await admin
      .from("blockchain_document_records")
      .select("id, user_id, share_token, document_hash, hosted_copy_expires_at")
      .eq("share_token", token)
      .limit(1)
      .maybeSingle();
    if (lookupError) return json({ error: "LOOKUP_FAILED" }, 503);
    if (!record) return json({ error: "UNKNOWN_TOKEN" }, 404);
    if (record.user_id !== userId) return json({ error: "NOT_YOUR_RECORD" }, 403);

    const path = `${token}.pdf`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) return json({ error: "COPY_UPLOAD_FAILED" }, 503);

    const expiresAt = new Date(Date.now() + COPY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await admin
      .from("blockchain_document_records")
      .update({
        hosted_copy_path: path,
        hosted_copy_expires_at: expiresAt,
        hosted_copy_deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    if (updateError) {
      // Do not leave an unreferenced file behind.
      await admin.storage.from(BUCKET).remove([path]);
      return json({ error: "COPY_RECORD_FAILED" }, 503);
    }

    return json({
      success: true,
      copy_available_until: expiresAt,
      expires_at: expiresAt,
      retained_forever: "fingerprint and OpenTimestamps proof",
    });
  } catch (error) {
    console.error(
      "[verify-copy] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "COPY_UPLOAD_FAILED" }, 500);
  }
});
