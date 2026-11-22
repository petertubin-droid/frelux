// =========================================================
// OpenTimestamps Verify — Independent Document & Blockchain Proof Verification
// FRELUX VERIFY
//
// 1. Matches SHA-256 fingerprint against canonical database records
// 2. Checks/upgrades OpenTimestamps proof against calendar pools
// 3. Verifies Bitcoin blockchain block attestation
// 4. Returns honest, tamper-evident verification certificate
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";
import { upgradeOtsProof, parseOtsProof } from "../_shared/opentimestamps.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const { document_hash, verification_id } = body;

    if (!document_hash && !verification_id) {
      return new Response(
        JSON.stringify({
          error: "Provide either document_hash or verification_id",
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

    let query = adminClient
      .from("blockchain_document_records")
      .select("*, blockchain_timestamp_proofs(*)");

    if (verification_id) {
      query = query.eq("verification_id", verification_id.trim().toUpperCase());
    } else if (document_hash) {
      const cleanHash = document_hash.trim().toLowerCase().replace(/^0x/, "");
      query = query.eq("document_hash", cleanHash);
    }

    const { data: docRecord, error: queryError } = await query.maybeSingle();

    // If not found in records
    if (queryError || !docRecord) {
      if (document_hash) {
        // Log tamper attempt / unrecorded document
        await adminClient.from("blockchain_verification_logs").insert({
          document_hash: document_hash.toLowerCase(),
          verification_id: verification_id || null,
          verified_by_user_id: userId,
          result: "tampered_mismatch",
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          result: "not_found",
          message:
            "No registered FRELUX document fingerprint was found matching this hash or ID. The document may have been altered or not stamped.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Found matching document record
    const proofRow = docRecord.blockchain_timestamp_proofs?.[0];
    let proofBase64 = proofRow?.ots_proof_base64 || "";
    let currentStatus = docRecord.status;
    let blockHeight = proofRow?.bitcoin_block_height;
    let blockHash = proofRow?.bitcoin_block_hash;

    // Attempt proof upgrade against calendar servers
    if (proofBase64 && currentStatus !== "Blockchain Verified") {
      try {
        const upgradeResult = await upgradeOtsProof(proofBase64);
        if (
          upgradeResult.status === "Blockchain Verified" &&
          upgradeResult.bitcoinBlockHeight
        ) {
          currentStatus = "Blockchain Verified";
          blockHeight = upgradeResult.bitcoinBlockHeight;
          proofBase64 = upgradeResult.upgradedProofBase64;

          // Update proof row
          await adminClient
            .from("blockchain_timestamp_proofs")
            .update({
              ots_proof_base64: proofBase64,
              bitcoin_block_height: blockHeight,
              verification_status: "Confirmed",
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", proofRow.id);

          // Update document record status
          await adminClient
            .from("blockchain_document_records")
            .update({
              status: "Blockchain Verified",
              updated_at: new Date().toISOString(),
            })
            .eq("id", docRecord.id);
        } else if (upgradeResult.status === "Bitcoin Confirmation Pending") {
          currentStatus = "Bitcoin Confirmation Pending";
          await adminClient
            .from("blockchain_document_records")
            .update({
              status: "Bitcoin Confirmation Pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", docRecord.id);
        }
      } catch (err) {
        console.warn("[opentimestamps-verify] upgrade check warning:", err);
      }
    }

    // Log verification lookup
    await adminClient.from("blockchain_verification_logs").insert({
      document_hash: docRecord.document_hash,
      verification_id: docRecord.verification_id,
      verified_by_user_id: userId,
      result:
        currentStatus === "Blockchain Verified"
          ? "verified_confirmed"
          : "hash_match_proof_pending",
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        result:
          currentStatus === "Blockchain Verified"
            ? "verified_confirmed"
            : "verified_pending_block",
        document: {
          verification_id: docRecord.verification_id,
          document_title: docRecord.document_title,
          document_reference: docRecord.document_reference,
          document_type: docRecord.document_type,
          document_hash: docRecord.document_hash,
          byte_size: docRecord.byte_size,
          created_at: docRecord.created_at,
          status: currentStatus,
        },
        proof: {
          bitcoin_block_height: blockHeight || null,
          bitcoin_block_hash: blockHash || null,
          calendar_urls: proofRow?.ots_calendar_urls || [],
          ots_proof_base64: proofBase64,
          is_blockchain_confirmed: currentStatus === "Blockchain Verified",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[opentimestamps-verify] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
