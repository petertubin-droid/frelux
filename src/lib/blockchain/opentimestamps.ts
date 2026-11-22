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
    | "tampered_mismatch"
    | "not_found";
  message?: string;
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
    bitcoin_block_height?: number;
    bitcoin_block_hash?: string;
    calendar_urls: string[];
    ots_proof_base64: string;
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
      .select("*") as any;
    if (typeof query?.eq !== "function") return [];
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
      is_confirmed: result.proof?.is_blockchain_confirmed,
      bitcoin_block_height:
        result.proof?.bitcoin_block_height ?? "Pending Block Mining",
      bitcoin_block_hash: result.proof?.bitcoin_block_hash ?? null,
      calendar_servers: result.proof?.calendar_urls ?? [],
    },
    verification_status: result.result,
    authenticity_statement:
      result.result === "verified_confirmed"
        ? "Document SHA-256 fingerprint matches the original creation record and is cryptographically anchored in the Bitcoin blockchain."
        : result.result === "verified_pending_block" ||
            result.result === "hash_match_proof_pending"
          ? "Document SHA-256 fingerprint matches the original creation record. Blockchain confirmation is pending Bitcoin block inclusion."
          : "Document verification could not be confirmed. Hash mismatch or unrecorded document.",
  };

  return JSON.stringify(certificate, null, 2);
}
