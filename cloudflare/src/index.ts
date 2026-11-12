/**
 * FRELUX file Worker.
 *
 * Two jobs, both of which the browser cannot do for itself:
 *   1. Hand out short-lived presigned R2 URLs so uploads and downloads never
 *      pass through the platform and the storage keys stay server-side.
 *   2. Serve the public buckets (avatars, brand assets) straight from the
 *      edge with immutable caching.
 *
 * The routes are deliberately narrow: a caller may only touch the buckets in
 * BUCKETS, only within its own key prefix, and only up to that bucket's size
 * and content-type limits.
 */
import { presignR2Url, safeObjectKey } from "./sigv4";

interface R2ObjectLike {
  body: ReadableStream;
  size: number;
  httpEtag?: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
}

export interface Env {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ALLOWED_ORIGINS?: string;
  PUBLIC_BASE_URL?: string;
  BUCKET_AVATARS?: R2BucketLike;
  BUCKET_BRAND_ASSETS?: R2BucketLike;
  BUCKET_MARKETPLACE?: R2BucketLike;
  BUCKET_PLAN_DOCUMENTS?: R2BucketLike;
  BUCKET_PRO_VERIFICATION?: R2BucketLike;
}

interface BucketPolicy {
  binding: keyof Env;
  maxBytes: number;
  public: boolean;
  types: string[];
}

const MB = 1024 * 1024;
const IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const DOCUMENTS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/zip",
];

const BUCKETS: Record<string, BucketPolicy> = {
  avatars: {
    binding: "BUCKET_AVATARS",
    maxBytes: 5 * MB,
    public: true,
    types: IMAGES,
  },
  "brand-assets": {
    binding: "BUCKET_BRAND_ASSETS",
    maxBytes: 10 * MB,
    public: true,
    types: [...IMAGES, "image/svg+xml", ...DOCUMENTS],
  },
  marketplace: {
    binding: "BUCKET_MARKETPLACE",
    maxBytes: 25 * MB,
    public: false,
    types: [...IMAGES, ...DOCUMENTS],
  },
  "plan-documents": {
    binding: "BUCKET_PLAN_DOCUMENTS",
    maxBytes: 50 * MB,
    public: false,
    types: DOCUMENTS,
  },
  "pro-verification": {
    binding: "BUCKET_PRO_VERIFICATION",
    maxBytes: 20 * MB,
    public: false,
    types: [...IMAGES, "application/pdf"],
  },
};

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "https://freluxtools.com")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const headers: Record<string, string> = { vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "authorization, content-type";
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["access-control-max-age"] = "86400";
  }
  return headers;
}

/** base64url -> ArrayBuffer, the exact type crypto.subtle accepts. */
const b64urlToBuffer = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) view[i] = binary.charCodeAt(i);
  return buffer;
};

/**
 * Verifies a Supabase access token (HS256) so an anonymous caller cannot mint
 * upload URLs. Returns the subject, which becomes the caller's key prefix.
 */
async function verifySupabaseJwt(
  token: string,
  secret: string,
): Promise<{ sub: string } | null> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBuffer(signature),
    new TextEncoder().encode(`${header}.${payload}`),
  );
  if (!valid) return null;

  const claims = JSON.parse(
    new TextDecoder().decode(b64urlToBuffer(payload)),
  ) as {
    sub?: unknown;
    exp?: unknown;
  };
  if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now())
    return null;
  return typeof claims.sub === "string" ? { sub: claims.sub } : null;
}

const endpointFor = (env: Env) =>
  `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

async function requireUser(
  request: Request,
  env: Env,
): Promise<{ sub: string } | Response> {
  if (!env.SUPABASE_JWT_SECRET) {
    return json({ error: "SUPABASE_JWT_SECRET is not configured" }, 500);
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) return json({ error: "Missing bearer token" }, 401);

  const user = await verifySupabaseJwt(token, env.SUPABASE_JWT_SECRET);
  if (!user) return json({ error: "Invalid or expired token" }, 401);
  return user;
}

interface PresignUploadBody {
  bucket?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  expiresIn?: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get("origin"), env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "frelux-files",
          buckets: Object.keys(BUCKETS),
          configured: Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID),
        },
        200,
        cors,
      );
    }

    if (url.pathname === "/presign/upload" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      let body: PresignUploadBody;
      try {
        body = (await request.json()) as PresignUploadBody;
      } catch {
        return json({ error: "Body must be JSON" }, 400, cors);
      }

      const policy = body.bucket ? BUCKETS[body.bucket] : undefined;
      if (!body.bucket || !policy) {
        return json(
          {
            error: `Unknown bucket. Expected one of: ${Object.keys(BUCKETS).join(", ")}`,
          },
          400,
          cors,
        );
      }
      if (!body.contentType || !policy.types.includes(body.contentType)) {
        return json(
          {
            error: `Unsupported content type for ${body.bucket}: ${body.contentType ?? "none"}`,
          },
          415,
          cors,
        );
      }
      if (typeof body.size !== "number" || body.size <= 0) {
        return json({ error: "size is required" }, 400, cors);
      }
      if (body.size > policy.maxBytes) {
        return json(
          {
            error: `File is larger than the ${Math.round(policy.maxBytes / MB)} MB limit for ${body.bucket}`,
          },
          413,
          cors,
        );
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const nonce = crypto.randomUUID().slice(0, 8);
      const key = `${user.sub}/${stamp}/${nonce}-${safeObjectKey(body.filename ?? "file")}`;
      const expiresIn = Math.min(Math.max(body.expiresIn ?? 900, 60), 3600);

      const uploadUrl = await presignR2Url({
        method: "PUT",
        endpoint: endpointFor(env),
        bucket: body.bucket,
        key,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        expiresIn,
      });

      return json(
        {
          bucket: body.bucket,
          key,
          uploadUrl,
          expiresIn,
          publicUrl:
            policy.public && env.PUBLIC_BASE_URL
              ? `${env.PUBLIC_BASE_URL.replace(/\/+$/, "")}/${body.bucket}/${key}`
              : null,
        },
        200,
        cors,
      );
    }

    if (url.pathname === "/presign/download" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      const body = (await request.json().catch(() => ({}))) as {
        bucket?: string;
        key?: string;
        expiresIn?: number;
      };
      const policy = body.bucket ? BUCKETS[body.bucket] : undefined;
      if (!body.bucket || !policy || !body.key) {
        return json({ error: "bucket and key are required" }, 400, cors);
      }
      // Private objects are readable only from the owner's own prefix.
      if (!policy.public && !body.key.startsWith(`${user.sub}/`)) {
        return json({ error: "Not found" }, 404, cors);
      }

      const expiresIn = Math.min(Math.max(body.expiresIn ?? 300, 60), 3600);
      const downloadUrl = await presignR2Url({
        method: "GET",
        endpoint: endpointFor(env),
        bucket: body.bucket,
        key: body.key,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        expiresIn,
      });
      return json({ url: downloadUrl, expiresIn }, 200, cors);
    }

    if (url.pathname.startsWith("/public/") && request.method === "GET") {
      const [, , bucketName, ...rest] = url.pathname.split("/");
      const policy = BUCKETS[bucketName];
      if (!policy || !policy.public)
        return new Response("Not found", { status: 404 });

      const binding = env[policy.binding];
      if (!binding || typeof (binding as R2BucketLike).get !== "function") {
        return new Response("Bucket binding missing", { status: 500 });
      }
      const object = await (binding as R2BucketLike).get(
        decodeURIComponent(rest.join("/")),
      );
      if (!object) return new Response("Not found", { status: 404 });

      return new Response(object.body, {
        headers: {
          "content-type":
            object.httpMetadata?.contentType ?? "application/octet-stream",
          "cache-control": "public, max-age=31536000, immutable",
          etag: object.httpEtag ?? "",
          ...cors,
        },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
