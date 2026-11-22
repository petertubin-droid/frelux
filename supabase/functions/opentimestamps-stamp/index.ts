// =========================================================
// OpenTimestamps Stamp — Register and Timestamp Document on Bitcoin
// FRELUX VERIFY
//
// 1. Authenticates user and validates 64-char SHA-256 fingerprint
// 2. Generates cryptographically secure Verification ID (FRX-VER-2026-XXXXXX)
// 3. Submits hash to decentralized OpenTimestamps calendar servers
// 4. Stores initial binary OTS proof and metadata (Zero fake proofs)
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";
import { submitHashToOpenTimestamps } from "../_shared/opentimestamps.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateVerificationId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(randomBytes[i] % chars.length);
  }
  return `FRX-VER-2026-${random}`;
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
    const body = await req.json();
    const {
      document_hash,
      document_title = "Bill of Quantities",
      document_reference = null,
      document_type = "boq",
      byte_size = null,
      metadata = {},
    } = body;

    if (!document_hash || typeof document_hash !== "string") {
      return new Response(JSON.stringify({ error: "missing document_hash" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanHash = document_hash.trim().toLowerCase().replace(/^0x/, "");
    if (!/^[a-f0-9]{64}$/.test(cleanHash)) {
      return new Response(
        JSON.stringify({
          error: "invalid SHA-256 hash, must be 64 hexadecimal characters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = await getVerifiedUserId(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Check if hash was already stamped
    const { data: existingDoc } = await adminClient
      .from("blockchain_document_records")
      .select("*, blockchain_timestamp_proofs(*)")
      .eq("document_hash", cleanHash)
      .maybeSingle();

    if (existingDoc) {
      return new Response(
        JSON.stringify({
          success: true,
          is_existing: true,
          verification_id: existingDoc.verification_id,
          document_hash: existingDoc.document_hash,
          status: existingDoc.status,
          created_at: existingDoc.created_at,
          proof_base64:
            existingDoc.blockchain_timestamp_proofs?.[0]?.ots_proof_base64 ||
            null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Submit to OpenTimestamps calendars
    const verificationId = generateVerificationId();
    const submission = await submitHashToOpenTimestamps(cleanHash);

    // 3. Persist document record
    const { data: insertedDoc, error: docError } = await adminClient
      .from("blockchain_document_records")
      .insert({
        verification_id: verificationId,
        document_type,
        document_title,
        document_reference,
        document_hash: cleanHash,
        byte_size,
        user_id: userId,
        status: submission.initialStatus,
        metadata: {
          ...metadata,
          stamped_at: new Date().toISOString(),
          calendar_status: submission.success ? "submitted" : "queued",
          note: submission.error || null,
        },
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to store document record: ${docError.message}`);
    }

    // 4. Persist timestamp proof if available
    if (submission.proofBase64) {
      const { error: proofError } = await adminClient
        .from("blockchain_timestamp_proofs")
        .insert({
          document_id: insertedDoc.id,
          document_hash: cleanHash,
          ots_proof_base64: submission.proofBase64,
          ots_calendar_urls: submission.calendarsSubmitted,
          verification_status: "Submitted",
        });

      if (proofError) {
        console.warn(
          "[opentimestamps-stamp] proof store warning:",
          proofError.message,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verification_id: verificationId,
        document_hash: cleanHash,
        status: submission.initialStatus,
        calendars_submitted: submission.calendarsSubmitted,
        proof_base64: submission.proofBase64 || null,
        created_at: insertedDoc.created_at,
        message: submission.success
          ? "Document fingerprint submitted to OpenTimestamps calendar pools."
          : "Document fingerprint registered. Calendar pool attestation queued.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[opentimestamps-stamp] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
