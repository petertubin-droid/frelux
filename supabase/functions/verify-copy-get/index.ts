// =========================================================
// FRELUX VERIFY — open the hosted copy by QR token (public)
//
// Scanning the QR on a sealed export calls this with the printed token. It
// returns a short-lived signed URL to the hosted copy plus the document's
// fingerprint and proof status — so the client sees the second original and
// can check it against the Bitcoin-anchored record.
//
// Retention: the copy is deleted 3 days after export. This endpoint removes
// an expired copy the moment it is asked for one (lazy purge), and the
// verify-copy-purge sweep does the same for copies nobody scans.
// The fingerprint record is never deleted: verification by upload keeps
// working after the copy is gone.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getRateLimitKey,
  checkRateLimit,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const BUCKET = "verify-copies";
const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
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
      `verify-copy-get:${await getRateLimitKey(req)}`,
      RATE_LIMITS.GENERAL,
    );
    if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!tokenPattern.test(token)) return json({ error: "INVALID_TOKEN" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: record, error: lookupError } = await admin
      .from("blockchain_document_records")
      .select(
        "id, verification_id, document_title, document_reference, document_type, " +
          "document_hash, byte_size, status, created_at, share_token, " +
          "hosted_copy_path, hosted_copy_expires_at, hosted_copy_deleted_at, " +
          "blockchain_timestamp_proofs(bitcoin_block_height, bitcoin_block_hash, verification_status)",
      )
      .eq("share_token", token)
      .limit(1)
      .maybeSingle();
    if (lookupError) return json({ error: "LOOKUP_FAILED" }, 503);
    if (!record) {
      return json({ success: false, available: false, reason: "not_found" }, 404);
    }

    const document = {
      verification_id: record.verification_id,
      document_title: record.document_title,
      document_reference: record.document_reference,
      document_type: record.document_type,
      document_hash: record.document_hash,
      byte_size: record.byte_size,
      status: record.status,
      created_at: record.created_at,
    };

    const proofRow = Array.isArray(record.blockchain_timestamp_proofs)
      ? record.blockchain_timestamp_proofs[0] ?? null
      : record.blockchain_timestamp_proofs ?? null;

    const expired =
      !record.hosted_copy_path ||
      !record.hosted_copy_expires_at ||
      new Date(record.hosted_copy_expires_at).getTime() <= Date.now() ||
      record.hosted_copy_deleted_at !== null;

    if (expired) {
      // Lazy purge: remove the file the moment someone asks for it.
      if (record.hosted_copy_path) {
        await admin.storage.from(BUCKET).remove([record.hosted_copy_path]);
        await admin
          .from("blockchain_document_records")
          .update({
            hosted_copy_path: null,
            hosted_copy_deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", record.id);
      }
      return json({
        success: true,
        available: false,
        reason: "expired",
        expired_at: record.hosted_copy_expires_at,
        document,
        proof: proofRow
          ? {
              bitcoin_block_height: proofRow.bitcoin_block_height ?? null,
              bitcoin_block_hash: proofRow.bitcoin_block_hash ?? null,
              status: proofRow.verification_status ?? null,
            }
          : null,
        message:
          "The hosted copy was deleted after its retention period. The document fingerprint is still anchored, so upload the file at /verify to confirm it.",
      });
    }

    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(record.hosted_copy_path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      return json({ error: "COPY_UNAVAILABLE" }, 503);
    }

    return json({
      success: true,
      available: true,
      url: signed.signedUrl,
      url_expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      expires_at: record.hosted_copy_expires_at,
      document,
      proof: proofRow
        ? {
            bitcoin_block_height: proofRow.bitcoin_block_height ?? null,
            bitcoin_block_hash: proofRow.bitcoin_block_hash ?? null,
            status: proofRow.verification_status ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "[verify-copy-get] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "COPY_LOOKUP_FAILED" }, 500);
  }
});
