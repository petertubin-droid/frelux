// =========================================================
// FRELUX VERIFY — Blockchain Document Verification Client
// Integrates OpenTimestamps Bitcoin Blockchain Attestation
// =========================================================

import { supabase, getFunctionErrorMessage } from "@/lib/supabase";

export interface DocumentVerificationRecord {
  id: string;
  verification_id: string;
  document_type:
    "boq" | "quotation" | "material_schedule" | "bank_estimate" | "cost_plan";
  document_title: string;
  document_reference?: string;
  document_hash: string;
  byte_size?: number;
  user_id?: string;
  status:
    | "Awaiting Timestamp"
    | "Timestamp Submitted"
    | "Bitcoin Confirmation Pending"
    | "Blockchain Verified"
    | "Verification Failed";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VerificationLookupResult {
  success: boolean;
  verified: boolean;
  result:
    | "verified_confirmed"
    | "verified_pending_block"
    | "hash_match_proof_pending"
    | "record_found"
    | "tampered_mismatch"
    | "not_found";
  message?: string;
  record_found?: boolean;
  fingerprint_matches?: boolean | null;
  document?: {
    verification_id: string;
    document_title: string;
    document_reference?: string;
    document_type: string;
    document_hash: string;
    byte_size?: number;
    created_at: string;
    status: string;
  };
  proof?: {
    bitcoin_block_height?: number | null;
    bitcoin_block_hash?: string | null;
    bitcoin_block_time?: string | null;
    calendar_urls: string[];
    ots_proof_base64: string | null;
    status?: string;
    is_blockchain_confirmed: boolean;
  };
}

/** Compute SHA-256 hash of a File or Blob in-browser */
export async function calculateFileSha256(
  file: File | Blob,
): Promise<{ hash: string; size: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    hash: hashHex,
    size: file.size,
  };
}

/** Compute SHA-256 hash of a raw byte buffer (e.g. sealed PDF Uint8Array) */
export async function calculateBytesSha256(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer as ArrayBuffer,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Register and timestamp a document on the Bitcoin blockchain via OpenTimestamps */
export async function stampDocumentOnBlockchain(params: {
  documentHash: string;
  documentTitle: string;
  documentReference?: string;
  documentType?:
    "boq" | "quotation" | "material_schedule" | "bank_estimate" | "cost_plan";
  byteSize?: number;
  metadata?: Record<string, unknown>;
}): Promise<{
  verification_id: string;
  document_hash: string;
  status: string;
  calendars_submitted: string[];
  created_at: string;
}> {
  const { data, error } = await supabase.functions.invoke(
    "opentimestamps-stamp",
    {
      body: {
        document_hash: params.documentHash,
        document_title: params.documentTitle,
        document_reference: params.documentReference,
        document_type: params.documentType || "boq",
        byte_size: params.byteSize,
        metadata: params.metadata || {},
      },
    },
  );

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    throw new Error(msg || "Failed to stamp document on blockchain");
  }

  return data;
}

/** Verify document by hash or verification ID */
export async function verifyDocumentOnBlockchain(params: {
  documentHash?: string;
  verificationId?: string;
}): Promise<VerificationLookupResult> {
  const { data, error } = await supabase.functions.invoke(
    "opentimestamps-verify",
    {
      body: {
        document_hash: params.documentHash,
        verification_id: params.verificationId,
      },
    },
  );

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    return {
      success: false,
      verified: false,
      result: "not_found",
      message: msg || "Verification query failed",
    };
  }

  return data as VerificationLookupResult;
}

/** Fetch user's timestamped documents for Dashboard */
export async function fetchUserVerifiedDocuments(
  userId: string,
): Promise<DocumentVerificationRecord[]> {
  try {
    if (!supabase || typeof supabase.from !== "function") return [];
    const query = supabase
      .from("blockchain_document_records")
      .select("*") as unknown as {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => PromiseLike<{
            data: DocumentVerificationRecord[] | null;
            error: unknown | null;
          }>;
        };
      };
    const { data, error } = await query
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as DocumentVerificationRecord[];
  } catch {
    return [];
  }
}

/** Generate a downloadable verification certificate */
export function generateVerificationCertificateJson(
  result: VerificationLookupResult,
): string {
  const certificate = {
    certificate_issuer: "FRELUXTOOLS OpenTimestamps Verification Engine",
    certificate_standard: "OpenTimestamps Bitcoin Attestation v1.0",
    verified_at: new Date().toISOString(),
    document: result.document,
    blockchain_proof: {
      is_confirmed: result.proof?.is_blockchain_confirmed ?? false,
      bitcoin_block_height: result.proof?.bitcoin_block_height ?? null,
      bitcoin_block_hash: result.proof?.bitcoin_block_hash ?? null,
      bitcoin_block_time: result.proof?.bitcoin_block_time ?? null,
      timestamp_status: result.proof?.status ?? null,
      calendar_servers: result.proof?.calendar_urls ?? [],
    },
    verification_status: result.result,
    record_found: result.record_found ?? Boolean(result.document),
    fingerprint_matches: result.fingerprint_matches === undefined
      ? result.verified
      : result.fingerprint_matches,
    authenticity_statement:
      result.result === "verified_confirmed"
        ? "The supplied document SHA-256 fingerprint matches the original creation record and its OpenTimestamps proof was independently verified against Bitcoin block data."
        : result.result === "verified_pending_block"
          ? "The supplied document SHA-256 fingerprint matches the original creation record. Its timestamp proof is awaiting Bitcoin block confirmation."
          : result.result === "hash_match_proof_pending"
            ? "The supplied document SHA-256 fingerprint matches the registration record, but a valid timestamp proof is not currently available. Bitcoin anchoring is not confirmed."
            : result.result === "record_found"
              ? "A FRELUX verification record was found by its identifier. No file fingerprint was supplied, so this certificate does not verify a document against the record."
              : "Document verification could not be confirmed. The fingerprint did not match a registered record or the record was not found.",
  };

  return JSON.stringify(certificate, null, 2);
}
