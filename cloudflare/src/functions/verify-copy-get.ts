// =========================================================
// Ported: verify-copy-get (public QR token read)
//
// Same contract as the Supabase function: a scanned token returns a
// short-lived signed URL to the hosted copy plus the anchored fingerprint.
// Retention is 3 days and the purge is lazy, exactly as before: asking for an
// expired copy deletes the file now and answers "expired" with the document
// record, because the fingerprint outlives the copy.
//
// Storage and PostgREST are called over fetch with the service role key. The
// key never reaches the browser; a missing key is a 503, never a guess.
// =========================================================

import { type EdgeContext, type EdgeEnv, json } from "./runtime";

const BUCKET = "verify-copies";
const SIGNED_URL_TTL_SECONDS = 600;
const TOKEN = /^[a-z2-7]{16,32}$/;
const SELECT =
  "id, verification_id, document_title, document_reference, document_type, " +
  "document_hash, byte_size, status, created_at, share_token, " +
  "hosted_copy_path, hosted_copy_expires_at, hosted_copy_deleted_at, " +
  "blockchain_timestamp_proofs(bitcoin_block_height, bitcoin_block_hash, verification_status)";

interface CopyRow {
  id: string;
  verification_id: string;
  document_title: string;
  document_reference: string | null;
  document_type: string;
  document_hash: string;
  byte_size: number | null;
  status: string;
  created_at: string;
  hosted_copy_path: string | null;
  hosted_copy_expires_at: string | null;
  hosted_copy_deleted_at: string | null;
  blockchain_timestamp_proofs?:
    | { bitcoin_block_height: number | null; bitcoin_block_hash: string | null; verification_status: string | null }[]
    | { bitcoin_block_height: number | null; bitcoin_block_hash: string | null; verification_status: string | null }
    | null;
}

function rest(env: EdgeEnv): { base: string; key: string } | null {
  const base = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.replace(/\/+$/, "") : "";
  const key = typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" ? env.SUPABASE_SERVICE_ROLE_KEY : "";
  return base && key ? { base, key } : null;
}

export async function handleVerifyCopyGet(
  request: Request,
  env: EdgeEnv,
  _ctx: EdgeContext,
  cors: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  let body: { token?: unknown } = {};
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return json({ error: "INVALID_JSON" }, 400, cors);
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!TOKEN.test(token)) return json({ error: "INVALID_TOKEN" }, 400, cors);

  const cfg = rest(env);
  if (!cfg) return json({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503, cors);
  const auth = { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` };

  let row: CopyRow | null = null;
  try {
    const res = await fetch(
      `${cfg.base}/rest/v1/blockchain_document_records?select=${encodeURIComponent(SELECT)}&share_token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: { ...auth, Accept: "application/json" } },
    );
    if (!res.ok) return json({ error: "LOOKUP_FAILED" }, 503, cors);
    const rows = (await res.json()) as CopyRow[];
    row = Array.isArray(rows) ? rows[0] ?? null : null;
  } catch {
    return json({ error: "LOOKUP_FAILED" }, 503, cors);
  }
  if (!row) return json({ success: false, available: false, reason: "not_found" }, 404, cors);

  const proofRaw = Array.isArray(row.blockchain_timestamp_proofs)
    ? row.blockchain_timestamp_proofs[0] ?? null
    : row.blockchain_timestamp_proofs ?? null;
  const proof = proofRaw
    ? {
        bitcoin_block_height: proofRaw.bitcoin_block_height ?? null,
        bitcoin_block_hash: proofRaw.bitcoin_block_hash ?? null,
        status: proofRaw.verification_status ?? null,
      }
    : null;
  const document = {
    verification_id: row.verification_id,
    document_title: row.document_title,
    document_reference: row.document_reference,
    document_type: row.document_type,
    document_hash: row.document_hash,
    byte_size: row.byte_size,
    status: row.status,
    created_at: row.created_at,
  };

  const expired =
    !row.hosted_copy_path ||
    !row.hosted_copy_expires_at ||
    new Date(row.hosted_copy_expires_at).getTime() <= Date.now() ||
    row.hosted_copy_deleted_at !== null;

  if (expired) {
    // Lazy purge, best effort: a failed delete must not hide the record.
    if (row.hosted_copy_path) {
      const path = row.hosted_copy_path;
      await fetch(`${cfg.base}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      }).catch(() => null);
      await fetch(`${cfg.base}/rest/v1/blockchain_document_records?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          hosted_copy_path: null,
          hosted_copy_deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => null);
    }
    return json(
      {
        success: true,
        available: false,
        reason: "expired",
        expired_at: row.hosted_copy_expires_at,
        document,
        proof,
        message:
          "The hosted copy was deleted after its retention period. The document fingerprint is still anchored, so upload the file at /verify to confirm it.",
      },
      200,
      cors,
    );
  }

  try {
    const signedRes = await fetch(
      `${cfg.base}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(row.hosted_copy_path as string)}`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
      },
    );
    const signed = (await signedRes.json().catch(() => null)) as { signedURL?: string } | null;
    if (!signedRes.ok || !signed?.signedURL) return json({ error: "COPY_UNAVAILABLE" }, 503, cors);
    const url = signed.signedURL.startsWith("http")
      ? signed.signedURL
      : `${cfg.base}/storage/v1${signed.signedURL}`;
    return json(
      {
        success: true,
        available: true,
        url,
        url_expires_in_seconds: SIGNED_URL_TTL_SECONDS,
        expires_at: row.hosted_copy_expires_at,
        document,
        proof,
      },
      200,
      cors,
    );
  } catch {
    return json({ error: "COPY_LOOKUP_FAILED" }, 500, cors);
  }
}

export const verifyCopyGetConfig = {
  name: "verify-copy-get",
  methods: ["POST"] as const,
  requiredBindings: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const,
  handler: handleVerifyCopyGet,
};
