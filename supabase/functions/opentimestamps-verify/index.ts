// FRELUX VERIFY: public lookup is served through this controlled endpoint;
// stored status alone is never treated as proof of a Bitcoin confirmation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId, getRateLimitKey, checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import { upgradeOtsProof, submitHashToOpenTimestamps } from "../_shared/opentimestamps.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const idPattern = /^FRX-VER-\d{4}-[A-HJ-NP-Z2-9]{6,16}$/i;

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const callerKey = await getRateLimitKey(req);
    const limit = checkRateLimit(`opentimestamps-verify:${callerKey}`, RATE_LIMITS.GENERAL);
    if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

    const body = await req.json();
    const suppliedHash = typeof body?.document_hash === "string" ? body.document_hash.trim() : "";
    const cleanHash = suppliedHash ? suppliedHash.toLowerCase().replace(/^0x/, "") : null;
    const suppliedId = typeof body?.verification_id === "string" ? body.verification_id.trim() : "";
    const cleanId = suppliedId ? suppliedId.toUpperCase() : null;
    if (!cleanHash && !cleanId) return json({ error: "PROVIDE_HASH_OR_VERIFICATION_ID" }, 400);
    if (cleanHash && !/^[a-f0-9]{64}$/.test(cleanHash)) return json({ error: "INVALID_SHA256_HASH" }, 400);
    if (cleanId && (!idPattern.test(cleanId) || cleanId.length > 40)) return json({ error: "INVALID_VERIFICATION_ID" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userId = await getVerifiedUserId(req);

    let query = admin.from("blockchain_document_records")
      .select("*, blockchain_timestamp_proofs(*)");
    if (cleanId) query = query.eq("verification_id", cleanId);
    else query = query.eq("document_hash", cleanHash);
    const { data: docRecord, error: lookupError } = await query.limit(1).maybeSingle();
    if (lookupError) return json({ error: "VERIFICATION_LOOKUP_FAILED" }, 503);

    if (!docRecord) {
      if (cleanHash) await admin.from("blockchain_verification_logs").insert({
        document_hash: cleanHash,
        verification_id: cleanId,
        verified_by_user_id: userId,
        result: "not_found",
      });
      return json({
        success: false,
        verified: false,
        record_found: false,
        fingerprint_matches: false,
        result: "not_found",
        message: "No registered FRELUX document fingerprint matches this lookup.",
      }, 404);
    }

    if (cleanHash && docRecord.document_hash !== cleanHash) {
      await admin.from("blockchain_verification_logs").insert({
        document_hash: cleanHash,
        verification_id: cleanId,
        verified_by_user_id: userId,
        result: "tampered_mismatch",
      });
      return json({
        success: false,
        verified: false,
        record_found: true,
        fingerprint_matches: false,
        result: "tampered_mismatch",
        message: "The supplied document fingerprint does not match this verification record.",
        computed_hash: cleanHash,
        expected_hash: docRecord.document_hash,
      }, 200);
    }

    let proofRow = docRecord.blockchain_timestamp_proofs?.[0] ?? null;
    let proofBase64 = proofRow?.ots_proof_base64 || "";
    let calendarUrls: string[] = proofRow?.ots_calendar_urls || [];
    let currentStatus: string = "Awaiting Timestamp";
    let blockHeight: number | null = null;
    let blockHash: string | null = null;
    let blockTime: string | null = null;
    let result: string = cleanHash ? "verified_pending_block" : "record_found";

    // A missing proof can be retried on lookup. Persist the proof before
    // attempting upgrade so transient explorer outages do not lose it.
    if (!proofBase64) {
      try {
        const submission = await submitHashToOpenTimestamps(docRecord.document_hash);
        if (submission.proofBase64) {
          const { data: createdProof, error: proofError } = await admin
            .from("blockchain_timestamp_proofs")
            .insert({
              document_id: docRecord.id,
              document_hash: docRecord.document_hash,
              ots_proof_base64: submission.proofBase64,
              ots_calendar_urls: submission.calendarsSubmitted,
              verification_status: "Submitted",
            })
            .select("*")
            .single();
          if (proofError) return json({ error: "TIMESTAMP_PROOF_STORE_FAILED" }, 503);
          proofRow = createdProof;
          proofBase64 = submission.proofBase64;
          calendarUrls = submission.calendarsSubmitted;
          currentStatus = "Timestamp Submitted";
        }
      } catch (error) {
        console.warn("[opentimestamps-verify] retry submission failed:", error instanceof Error ? error.message : error);
      }
    }

    if (!proofBase64) result = cleanHash ? "hash_match_proof_pending" : "record_found";

    if (proofBase64) {
      try {
        const verification = await upgradeOtsProof(proofBase64, docRecord.document_hash);
        proofBase64 = verification.upgradedProofBase64;
        currentStatus = verification.status;
        if (verification.status === "Blockchain Verified") {
          result = cleanHash ? "verified_confirmed" : "record_found";
          blockHeight = verification.bitcoinBlockHeight ?? null;
          blockHash = verification.bitcoinBlockHash ?? null;
          blockTime = verification.bitcoinBlockTime ?? null;
        }
        const proofStatus = result === "verified_confirmed" ? "Confirmed" :
          currentStatus === "Bitcoin Confirmation Pending" ? "Pending Bitcoin" : "Submitted";
        const { error: proofUpdateError } = await admin
          .from("blockchain_timestamp_proofs")
          .update({
            ots_proof_base64: proofBase64,
            bitcoin_block_height: blockHeight,
            bitcoin_block_hash: blockHash,
            bitcoin_block_time: blockTime,
            verification_status: proofStatus,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", proofRow.id);
        if (proofUpdateError) return json({ error: "TIMESTAMP_STATUS_STORE_FAILED" }, 503);
      } catch (error) {
        currentStatus = "Verification Failed";
        result = cleanHash ? "hash_match_proof_pending" : "record_found";
        console.warn("[opentimestamps-verify] proof validation failed:", error instanceof Error ? error.message : error);
      }
    }

    const { error: recordUpdateError } = await admin
      .from("blockchain_document_records")
      .update({ status: currentStatus, updated_at: new Date().toISOString() })
      .eq("id", docRecord.id);
    if (recordUpdateError) return json({ error: "VERIFICATION_STATUS_STORE_FAILED" }, 503);

    await admin.from("blockchain_verification_logs").insert({
      document_hash: docRecord.document_hash,
      verification_id: docRecord.verification_id,
      verified_by_user_id: userId,
      result,
    });

    return json({
      success: true,
      verified: Boolean(cleanHash),
      record_found: true,
      fingerprint_matches: cleanHash ? true : null,
      result,
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
        bitcoin_block_height: blockHeight,
        bitcoin_block_hash: blockHash,
        bitcoin_block_time: blockTime,
        calendar_urls: calendarUrls,
        ots_proof_base64: proofBase64 || null,
        is_blockchain_confirmed: result === "verified_confirmed",
      },
    });
  } catch (error) {
    console.error("[opentimestamps-verify] failed:", error instanceof Error ? error.message : error);
    return json({ error: "VERIFICATION_FAILED" }, 500);
  }
});
