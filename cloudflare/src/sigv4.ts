/**
 * AWS Signature Version 4 presigning for Cloudflare R2, using only Web Crypto.
 *
 * R2 speaks the S3 API, so a presigned URL is built the same way it is for S3:
 * sign the canonical request with a key derived from the secret access key, and
 * append the signature as a query parameter. The browser or the edge function
 * then PUTs or GETs the object directly, and the credential never leaves the
 * Worker.
 *
 * Kept free of Deno, Node and Worker globals so the same module runs in the
 * Worker, in an edge function, and under vitest.
 */

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest);
}

async function hmacSha256(
  key: BufferSource,
  value: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
}

/**
 * AWS requires RFC 3986 encoding. encodeURIComponent leaves ! ' ( ) * alone,
 * which breaks signatures for keys containing them.
 */
const rfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export interface PresignOptions {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  /** S3 endpoint, e.g. https://<account-id>.r2.cloudflarestorage.com */
  endpoint: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** R2 accepts "auto". S3 tests use "us-east-1". */
  region?: string;
  service?: string;
  /** Lifetime in seconds. */
  expiresIn?: number;
  /** Fixed clock for tests. */
  now?: Date;
}

/** Derives the SigV4 signing key (AWS4 + secret, date, region, service). */
export async function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const dateKey = await hmacSha256(
    encoder.encode(`AWS4${secretAccessKey}`),
    dateStamp,
  );
  const regionKey = await hmacSha256(dateKey, region);
  const serviceKey = await hmacSha256(regionKey, service);
  return hmacSha256(serviceKey, "aws4_request");
}

/** Canonical path: every segment encoded, slashes kept as separators. */
export function canonicalPath(bucket: string, key: string): string {
  // An empty bucket means the endpoint already carries it (S3 path style),
  // so the key starts the path.
  const segments = bucket ? [bucket, ...key.split("/")] : key.split("/");
  return `/${segments.map(rfc3986).join("/")}`;
}

/** amz-date format: 20130524T000000Z */
export function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export async function presignR2Url(options: PresignOptions): Promise<string> {
  const region = options.region ?? "auto";
  const service = options.service ?? "s3";
  const expiresIn = options.expiresIn ?? 900;
  const now = options.now ?? new Date();

  const host = new URL(options.endpoint).host;
  const path = canonicalPath(options.bucket, options.key);
  const timestamp = amzDate(now);
  const dateStamp = timestamp.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const query = [
    "X-Amz-Algorithm=AWS4-HMAC-SHA256",
    `X-Amz-Credential=${rfc3986(`${options.accessKeyId}/${scope}`)}`,
    `X-Amz-Date=${timestamp}`,
    `X-Amz-Expires=${expiresIn}`,
    "X-Amz-SignedHeaders=host",
  ].join("&");

  const canonicalRequest = [
    options.method,
    path,
    query,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(
    options.secretAccessKey,
    dateStamp,
    region,
    service,
  );
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const endpoint = options.endpoint.replace(/\/+$/, "");
  return `${endpoint}${path}?${query}&X-Amz-Signature=${signature}`;
}

/** Strips anything that would break an object key or make it guessable. */
export function safeObjectKey(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-120);
  return cleaned || "file";
}
