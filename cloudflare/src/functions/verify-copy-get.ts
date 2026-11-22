/**
 * POST /api/fn/verify-copy-get — native Worker port of
 * supabase/functions/verify-copy-get.
 *
 * Scanning the QR on a sealed export calls this with the printed token. It
 * returns a short-lived signed URL to the hosted copy plus the document's
 * fingerprint and proof status, so the client sees the second original and can
 * check it against the Bitcoin-anchored record.
 *
 * Retention: the copy is deleted 3 days after export. This endpoint removes an
 * expired copy the moment someone asks for one (lazy purge); the
 * verify-copy-purge sweep does the same for copies nobody scans. The
 * fingerprint record is never deleted, so verification by upload keeps working
 * after the copy is gone.
 *
 * Port notes: PostgREST and Storage are called over plain fetch rather than
 * bundling supabase-js into the Worker. The responses are identical to the
 * Supabase function's, because the frontend already depends on that shape.
 */
import { json, type ApiEnv } from "../api";
import {
  RATE_LIMITS,
  clientKey,
  hit,
  rateLimitedResponse,
} from "./rate-limit";

const BUCKET = "verify-copies";
const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
const tokenPattern = /^[a-z2-7]{16,32}$/;

const corsHeaders = {
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const reply = (body: unknown, status = 200) =>
  json(body, status, corsHeaders);

const SELECT =
  "id, verification_id, document_title, document_reference, document_type, " +
  "document_hash, byte_size, status, created_at, share_token, " +
  "hosted_copy_path, hosted_copy_expires_at, hosted_copy_deleted_at, " +
  "blockchain_timestamp_proofs(bitcoin_block_height, bitcoin_block_hash, verification_status)";

interface CopyRecord {
  id: string;
  verification_id: string | null;
  document_title: string | null;
  document_reference: string | null;
  document_type: string | null;
  document_hash: string | null;
  byte_size: number | null;
  status: string | null;
  created_at: string | null;
  hosted_copy_path: string | null;
  hosted_copy_expires_at: string | null;
  hosted_copy_deleted_at: string | null;
  blockchain_timestamp_proofs:
    | {
        bitcoin_block_height: number | null;
        bitcoin_block_hash: string | null;
        verification_status: string | null;
      }
    | {
        bitcoin_block_height: number | null;
        bitcoin_block_hash: string | null;
        verification_status: string | null;
      }[]
    | null;
}

function serviceHeaders(env: ApiEnv): Record<string, string> | null {
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env.SUPABASE_URL || !key) return null;
  const headers: Record<string, string> = {
    apikey: key,
    "content-type": "application/json",
  };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function verifyCopyGet(
  request: Request,
  env: ApiEnv,
  _url: URL,
  cors: Record<string, string> = {},
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...cors, ...corsHeaders },
    });
  }
  if (request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);

  const headers = serviceHeaders(env);
  if (!headers) return reply({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503);
  const base = (env.SUPABASE_URL as string).replace(/\/$/, "");

  try {
    const limit = await hit(clientKey(request, "verify-copy-get"), RATE_LIMITS.GENERAL);
    if (!limit.allowed) return rateLimitedResponse(limit.resetAt, corsHeaders);

    const body = (await request.json().catch(() => ({}))) as { token?: unknown };
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!tokenPattern.test(token)) return reply({ error: "INVALID_TOKEN" }, 400);

    const lookup = await fetch(
      `${base}/rest/v1/blockchain_document_records?select=${encodeURIComponent(SELECT)}&share_token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers },
    );
    if (!lookup.ok) return reply({ error: "LOOKUP_FAILED" }, 503);
    const rows = (await lookup.json()) as CopyRecord[];
    const record = rows[0];
    if (!record) {
      return reply({ success: false, available: false, reason: "not_found" }, 404);
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
    const proof = proofRow
      ? {
          bitcoin_block_height: proofRow.bitcoin_block_height ?? null,
          bitcoin_block_hash: proofRow.bitcoin_block_hash ?? null,
          status: proofRow.verification_status ?? null,
        }
      : null;

    const expired =
      !record.hosted_copy_path ||
      !record.hosted_copy_expires_at ||
      new Date(record.hosted_copy_expires_at).getTime() <= Date.now() ||
      record.hosted_copy_deleted_at !== null;

    if (expired) {
      // Lazy purge: remove the file the moment someone asks for it.
      if (record.hosted_copy_path) {
        await fetch(`${base}/storage/v1/object/${BUCKET}`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ prefixes: [record.hosted_copy_path] }),
        }).catch(() => undefined);
        await fetch(
          `${base}/rest/v1/blockchain_document_records?id=eq.${encodeURIComponent(record.id)}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({
              hosted_copy_path: null,
              hosted_copy_deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          },
        ).catch(() => undefined);
      }
      return reply({
        success: true,
        available: false,
        reason: "expired",
        expired_at: record.hosted_copy_expires_at,
        document,
        proof,
        message:
          "The hosted copy was deleted after its retention period. The document fingerprint is still anchored, so upload the file at /verify to confirm it.",
      });
    }

    const copyPath = record.hosted_copy_path;
    if (!copyPath) return reply({ error: "COPY_UNAVAILABLE" }, 503);

    const sign = await fetch(
      `${base}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(copyPath)}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
      },
    );
    const signed = sign.ok
      ? ((await sign.json()) as { signedURL?: string })
      : null;
    if (!signed?.signedURL) return reply({ error: "COPY_UNAVAILABLE" }, 503);

    return reply({
      success: true,
      available: true,
      url: `${base}/storage/v1${signed.signedURL}`,
      url_expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      expires_at: record.hosted_copy_expires_at,
      document,
      proof,
    });
  } catch (error) {
    console.error(
      "[verify-copy-get] failed:",
      error instanceof Error ? error.message : error,
    );
    return reply({ error: "COPY_LOOKUP_FAILED" }, 500);
  }
}
