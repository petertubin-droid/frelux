// =========================================================
// OpenTimestamps Stamp — Register and Timestamp Document on Bitcoin
// FRELUX VERIFY
//
// 1. Authenticates user and validates 64-char SHA-256 fingerprint
// 2. Generates cryptographically secure Verification ID (FRX-VER-YYYY-XXXXXXXXXX)
// 3. Submits hash to decentralized OpenTimestamps calendar servers
// 4. Stores initial binary OTS proof and metadata (Zero fake proofs)
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId, checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import { submitHashToOpenTimestamps } from "../_shared/opentimestamps.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateVerificationId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes, (byte) => chars[byte & 31]).join("");
  return `FRX-VER-${new Date().getUTCFullYear()}-${random}`;
}

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 16_384) {
      return new Response(JSON.stringify({ error: "request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(rawBody);
    const userId = await getVerifiedUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "authentication required to register a document" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = checkRateLimit(`opentimestamps-stamp:${userId}`, RATE_LIMITS.PAYMENT);
    if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

    const documentHash = typeof body?.document_hash === "string" ? body.document_hash : "";
    const cleanHash = documentHash.trim().toLowerCase().replace(/^0x/, "");
    if (!/^[a-f0-9]{64}$/.test(cleanHash)) {
      return new Response(JSON.stringify({ error: "invalid SHA-256 hash" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const documentTitle = typeof body.document_title === "string" ? body.document_title.trim() : "";
    const documentReference = body.document_reference == null ? null :
      typeof body.document_reference === "string" ? body.document_reference.trim() : undefined;
    const documentType = body.document_type ?? "boq";
    const byteSize = body.byte_size == null ? null : Number(body.byte_size);
    const metadata = body.metadata ?? {};
    // Token printed in the document QR; the hosted copy is uploaded under it.
    const shareToken = typeof body.share_token === "string" ? body.share_token.trim() : null;
    if (shareToken !== null && !/^[a-z2-7]{16,32}$/.test(shareToken)) {
      return new Response(JSON.stringify({ error: "invalid share token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowedTypes = ["boq", "quotation", "material_schedule", "bank_estimate", "cost_plan"];
    if (!documentTitle || documentTitle.length > 160 ||
        documentReference === undefined || (documentReference && documentReference.length > 120) ||
        !allowedTypes.includes(documentType) ||
        (byteSize !== null && (!Number.isSafeInteger(byteSize) || byteSize < 0)) ||
        !metadata || typeof metadata !== "object" || Array.isArray(metadata) ||
        JSON.stringify(metadata).length > 4096) {
      return new Response(JSON.stringify({ error: "invalid document metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "verification service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: existingDoc, error: lookupError } = await adminClient
      .from("blockchain_document_records")
      .select("*, blockchain_timestamp_proofs(*)")
      .eq("document_hash", cleanHash)
      .limit(1)
      .maybeSingle();
    if (lookupError) throw new Error("Unable to check existing document record");
    if (existingDoc && existingDoc.user_id !== userId) {
      return new Response(JSON.stringify({ error: "this fingerprint is already registered" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let record = existingDoc;
    if (!record) {
      let insertError: { message: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await adminClient
          .from("blockchain_document_records")
          .insert({
            verification_id: generateVerificationId(),
            document_type: documentType,
            document_title: documentTitle,
            document_reference: documentReference,
            document_hash: cleanHash,
            byte_size: byteSize,
            user_id: userId,
            status: "Awaiting Timestamp",
            metadata,
            share_token: shareToken,
          })
          .select("*")
          .single();
        if (!error && data) {
          record = { ...data, blockchain_timestamp_proofs: [] };
          insertError = null;
          break;
        }
        insertError = error;
        if (error?.code !== "23505") break;
      }
      if (!record) throw new Error(insertError?.message || "Failed to register document");
    }

    if (shareToken && !record.share_token) {
      const { error: tokenError } = await adminClient
        .from("blockchain_document_records")
        .update({ share_token: shareToken, updated_at: new Date().toISOString() })
        .eq("id", record.id);
      if (!tokenError) record = { ...record, share_token: shareToken };
    }

    const existingProof = record.blockchain_timestamp_proofs?.[0];
    if (existingProof?.ots_proof_base64) {
      return new Response(JSON.stringify({
        success: true,
        is_existing: true,
        verification_id: record.verification_id,
        document_hash: cleanHash,
        status: record.status,
        created_at: record.created_at,
        proof_base64: existingProof.ots_proof_base64,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist the owner-bound record before contacting calendars so a timeout
    // never loses the user's verification ID. A later request can safely retry.
    const submission = await submitHashToOpenTimestamps(cleanHash);
    if (submission.proofBase64) {
      const { error: proofError } = await adminClient
        .from("blockchain_timestamp_proofs")
        .insert({
          document_id: record.id,
          document_hash: cleanHash,
          ots_proof_base64: submission.proofBase64,
          ots_calendar_urls: submission.calendarsSubmitted,
          verification_status: "Submitted",
        });
      if (proofError) throw new Error("Timestamp proof could not be stored; retry verification to resubmit");
    }
    const { data: updatedRecord, error: updateError } = await adminClient
      .from("blockchain_document_records")
      .update({
        status: submission.initialStatus,
        metadata: {
          ...metadata,
          calendar_status: submission.success ? "submitted" : "queued",
          calendar_error: submission.error || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .select("created_at")
      .single();
    if (updateError) throw new Error("Timestamp submission status could not be saved");

    return new Response(JSON.stringify({
      success: true,
      verification_id: record.verification_id,
      document_hash: cleanHash,
      status: submission.initialStatus,
      calendars_submitted: submission.calendarsSubmitted,
      proof_base64: submission.proofBase64 || null,
      created_at: updatedRecord.created_at,
      message: submission.success
        ? "Document fingerprint submitted to OpenTimestamps calendars; Bitcoin confirmation is pending."
        : "Document fingerprint registered, but calendar submission did not complete; retry to submit it.",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[opentimestamps-stamp] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
