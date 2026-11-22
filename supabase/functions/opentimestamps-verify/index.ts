// =========================================================
// OpenTimestamps Verify — Independent Document & Blockchain Proof Verification
// FRELUX VERIFY
//
// 1. Matches SHA-256 fingerprint against canonical database records
// 2. Detects document tampering when verification_id and hash disagree
// 3. Upgrades OpenTimestamps proof against calendar pools
// 4. Verifies Bitcoin blockchain block attestation
// 5. Returns honest, tamper-evident verification certificate
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";
import {
  upgradeOtsProof,
  parseOtsProof,
  submitHashToOpenTimestamps,
} from "../_shared/opentimestamps.ts";

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

    const cleanHash = document_hash
      ? document_hash.trim().toLowerCase().replace(/^0x/, "")
      : null;
    const cleanId = verification_id
      ? verification_id.trim().toUpperCase()
      : null;

    let docRecord = null;

    if (cleanId) {
      const { data, error } = await adminClient
        .from("blockchain_document_records")
        .select("*, blockchain_timestamp_proofs(*)")
        .eq("verification_id", cleanId)
        .maybeSingle();

      if (!error && data) {
        docRecord = data;

        // If client also supplied a file hash, verify it matches the record!
        if (cleanHash && docRecord.document_hash !== cleanHash) {
          await adminClient.from("blockchain_verification_logs").insert({
            document_hash: cleanHash,
            verification_id: cleanId,
            verified_by_user_id: userId,
            result: "tampered_mismatch",
          });

          return new Response(
            JSON.stringify({
              success: false,
              verified: false,
              result: "tampered_mismatch",
              message:
                "Tamper alert: The calculated cryptographic fingerprint of the uploaded file does not match the original registration for this Verification ID. The file has been modified or replaced.",
              computed_hash: cleanHash,
              expected_hash: docRecord.document_hash,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    } else if (cleanHash) {
      const { data, error } = await adminClient
        .from("blockchain_document_records")
        .select("*, blockchain_timestamp_proofs(*)")
        .eq("document_hash", cleanHash)
        .maybeSingle();

      if (!error && data) {
        docRecord = data;
      }
    }

    // If not found in records
    if (!docRecord) {
      if (cleanHash) {
        await adminClient.from("blockchain_verification_logs").insert({
          document_hash: cleanHash,
          verification_id: cleanId || null,
          verified_by_user_id: userId,
          result: "not_found",
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          result: "not_found",
          message:
            "No registered FRELUX document fingerprint was found matching this hash or ID. The document may not have been stamped or was altered.",
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

    // If document was queued without initial proof, attempt calendar submission now
    if (!proofBase64 && currentStatus === "Awaiting Timestamp") {
      try {
        const sub = await submitHashToOpenTimestamps(docRecord.document_hash);
        if (sub.success && sub.proofBase64) {
          proofBase64 = sub.proofBase64;
          currentStatus = "Timestamp Submitted";

          await adminClient.from("blockchain_timestamp_proofs").insert({
            document_id: docRecord.id,
            document_hash: docRecord.document_hash,
            ots_proof_base64: proofBase64,
            ots_calendar_urls: sub.calendarsSubmitted,
            verification_status: "Submitted",
          });

          await adminClient
            .from("blockchain_document_records")
            .update({
              status: "Timestamp Submitted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", docRecord.id);
        }
      } catch (calErr) {
        console.warn(
          "[opentimestamps-verify] calendar submission retry:",
          calErr,
        );
      }
    }

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

          if (proofRow?.id) {
            await adminClient
              .from("blockchain_timestamp_proofs")
              .update({
                ots_proof_base64: proofBase64,
                bitcoin_block_height: blockHeight,
                verification_status: "Confirmed",
                last_checked_at: new Date().toISOString(),
              })
              .eq("id", proofRow.id);
          }

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
          : "verified_pending_block",
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
          ots_proof_base64: proofBase64 || null,
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
