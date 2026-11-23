// =========================================================
// FRELUX VERIFY — hosted copy upload (native Worker port)
//
// Called after a sealed export is produced. The sealed bytes the client
// downloaded become the "second original" the QR opens. Contract is
// byte-identical to the Supabase function:
//
//  - the caller is authenticated and must own the record that carries the
//    token (the token is printed in their document, so it is not a secret
//    they can share, but the upload must still be the owner's);
//  - the copy expires 3 days after upload; the fingerprint stays anchored;
//  - failure is never fatal for the export — the record already exists.
// =========================================================
import type { ApiEnv } from "../api";
import { verifiedUserId } from "./auth";
import { RATE_LIMITS, clientKey, hit } from "./rate-limit";

const BUCKET = "verify-copies";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MiB
const COPY_DAYS = 3;
const tokenPattern = /^[a-z2-7]{16,32}$/;

const reply = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

const base = (env: ApiEnv) => (env.SUPABASE_URL ?? "").replace(/\/+$/, "");

export async function verifyCopy(
  request: Request,
  env: ApiEnv,
  url: URL,
  cors: Record<string, string>,
): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response("ok", { status: 200, headers: cors });
  if (request.method !== "POST")
    return reply({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  try {
    const limited = await hit(
      clientKey(request, "verify-copy"),
      RATE_LIMITS.PAYMENT,
    );
    if (!limited.allowed) {
      const retry = Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000));
      return new Response(
        JSON.stringify({ error: "RATE_LIMITED", retry_after: retry }),
        {
          status: 429,
          headers: {
            ...cors,
            "content-type": "application/json",
            "retry-after": String(retry),
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(limited.resetAt),
          },
        },
      );
    }

    const userId = await verifiedUserId(request, env);
    if (!userId) return reply({ error: "AUTHENTICATION_REQUIRED" }, 401, cors);

    const token = (url.searchParams.get("token") ?? "").trim();
    if (!tokenPattern.test(token)) return reply({ error: "INVALID_TOKEN" }, 400, cors);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf"))
      return reply({ error: "PDF_REQUIRED" }, 415, cors);

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0) return reply({ error: "EMPTY_BODY" }, 400, cors);
    if (bytes.byteLength > MAX_BYTES)
      return reply({ error: "FILE_TOO_LARGE" }, 413, cors);
    // A PDF must actually start with %PDF.
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (header !== "%PDF-") return reply({ error: "PDF_REQUIRED" }, 415, cors);

    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!env.SUPABASE_URL || !serviceKey)
      return reply({ error: "VERIFICATION_SERVICE_UNAVAILABLE" }, 503, cors);

    const auth = { authorization: `Bearer ${serviceKey}`, apikey: serviceKey };

    const lookupResponse = await fetch(
      `${base(env)}/rest/v1/blockchain_document_records` +
        `?select=id,user_id,share_token,document_hash,hosted_copy_expires_at` +
        `&share_token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: auth },
    );
    if (!lookupResponse.ok) return reply({ error: "LOOKUP_FAILED" }, 503, cors);
    const rows = (await lookupResponse.json()) as {
      id: string;
      user_id: string;
    }[];
    const record = rows?.[0];
    if (!record) return reply({ error: "UNKNOWN_TOKEN" }, 404, cors);
    if (record.user_id !== userId)
      return reply({ error: "NOT_YOUR_RECORD" }, 403, cors);

    const path = `${token}.pdf`;
    const uploadResponse = await fetch(
      `${base(env)}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: {
          ...auth,
          "content-type": "application/pdf",
          "x-upsert": "true",
        },
        body: bytes,
      },
    );
    if (!uploadResponse.ok)
      return reply({ error: "COPY_UPLOAD_FAILED" }, 503, cors);

    const expiresAt = new Date(
      Date.now() + COPY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const updateResponse = await fetch(
      `${base(env)}/rest/v1/blockchain_document_records?id=eq.${encodeURIComponent(record.id)}`,
      {
        method: "PATCH",
        headers: {
          ...auth,
          "content-type": "application/json",
          prefer: "return=minimal",
        },
        body: JSON.stringify({
          hosted_copy_path: path,
          hosted_copy_expires_at: expiresAt,
          hosted_copy_deleted_at: null,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!updateResponse.ok) {
      // Do not leave an unreferenced file behind.
      await fetch(`${base(env)}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      }).catch(() => undefined);
      return reply({ error: "COPY_RECORD_FAILED" }, 503, cors);
    }

    return reply(
      {
        success: true,
        copy_available_until: expiresAt,
        expires_at: expiresAt,
        retained_forever: "fingerprint and OpenTimestamps proof",
      },
      200,
      cors,
    );
  } catch (error) {
    console.error(
      "[verify-copy] failed:",
      error instanceof Error ? error.message : error,
    );
    return reply({ error: "COPY_UPLOAD_FAILED" }, 500, cors);
  }
}
