/**
 * FRELUX file Worker.
 *
 * The browser cannot be trusted with storage keys and should not push plans or
 * verification documents through the app server, so this Worker is the only
 * thing that touches the bucket:
 *
 *   POST /files            upload, written through the R2 binding
 *   GET  /files/:b/:key    private read, owner prefix only (?token= for <img>)
 *   GET  /public/:b/:key   public read for avatars and brand assets
 *   POST /presign/upload   optional direct-to-R2 upload, only when S3 keys exist
 *   POST /presign/download optional direct-to-R2 download, same condition
 *
 * Uploads go through the binding by default, which means no R2 access keys are
 * needed at all. The presign routes exist for large files, where handing the
 * browser a signed URL avoids streaming 50 MB through a Worker, and they return
 * 501 until R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are set.
 */
import { presignR2Url, safeObjectKey } from "./sigv4";

interface R2ObjectLike {
  body: ReadableStream;
  size: number;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ): Promise<unknown>;
}

export interface Env {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  SUPABASE_JWT_SECRET: string;
  ALLOWED_ORIGINS?: string;
  PUBLIC_BASE_URL?: string;
  BUCKET_AVATARS?: R2BucketLike;
  BUCKET_BRAND_ASSETS?: R2BucketLike;
  BUCKET_MARKETPLACE?: R2BucketLike;
  BUCKET_PLAN_DOCUMENTS?: R2BucketLike;
  BUCKET_PRO_VERIFICATION?: R2BucketLike;
}

type BucketName =
  | "avatars"
  | "brand-assets"
  | "marketplace"
  | "plan-documents"
  | "pro-verification";

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

const BUCKETS: Record<BucketName, BucketPolicy> = {
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

const isBucket = (value: string): value is BucketName =>
  Object.prototype.hasOwnProperty.call(BUCKETS, value);

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
 * upload URLs or read someone else's file. The subject becomes the key prefix.
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

const bearerFrom = (request: Request, url?: URL): string => {
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return url?.searchParams.get("token")?.trim() ?? "";
};

async function requireUser(
  request: Request,
  env: Env,
  url?: URL,
): Promise<{ sub: string } | Response> {
  if (!env.SUPABASE_JWT_SECRET) {
    return json({ error: "SUPABASE_JWT_SECRET is not configured" }, 500);
  }
  const token = bearerFrom(request, url);
  if (!token) return json({ error: "Missing bearer token" }, 401);

  const user = await verifySupabaseJwt(token, env.SUPABASE_JWT_SECRET);
  if (!user) return json({ error: "Invalid or expired token" }, 401);
  return user;
}

const bindingFor = (env: Env, policy: BucketPolicy): R2BucketLike | null => {
  const binding = env[policy.binding] as unknown;
  return binding && typeof (binding as R2BucketLike).get === "function"
    ? (binding as R2BucketLike)
    : null;
};

const s3Configured = (env: Env) =>
  Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY,
  );

const newKey = (sub: string, filename: string) =>
  `${sub}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${safeObjectKey(filename)}`;

const publicUrlFor = (
  env: Env,
  bucket: BucketName,
  policy: BucketPolicy,
  key: string,
) =>
  policy.public && env.PUBLIC_BASE_URL
    ? `${env.PUBLIC_BASE_URL.replace(/\/+$/, "")}/public/${bucket}/${key}`
    : null;

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
          uploadMode: s3Configured(env) ? "presign-available" : "binding",
          stores: Object.keys(BUCKETS).filter((name) => {
            const policy = BUCKETS[name as BucketName];
            return Boolean(bindingFor(env, policy));
          }),
        },
        200,
        cors,
      );
    }

    // Upload through the R2 binding. No R2 access keys required.
    if (url.pathname === "/files" && request.method === "POST") {
      const user = await requireUser(request, env, url);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      const bucket = url.searchParams.get("bucket") ?? "";
      if (!isBucket(bucket)) {
        return json(
          {
            error: `Unknown bucket. Expected one of: ${Object.keys(BUCKETS).join(", ")}`,
          },
          400,
          cors,
        );
      }
      const policy = BUCKETS[bucket];
      const store = bindingFor(env, policy);
      if (!store)
        return json({ error: `Binding missing for ${bucket}` }, 500, cors);

      const contentType = (request.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!policy.types.includes(contentType)) {
        return json(
          {
            error: `Unsupported content type for ${bucket}: ${contentType || "none"}`,
          },
          415,
          cors,
        );
      }

      const declared = Number(request.headers.get("content-length") ?? "0");
      if (declared > policy.maxBytes) {
        return json(
          {
            error: `File is larger than the ${Math.round(policy.maxBytes / MB)} MB limit for ${bucket}`,
          },
          413,
          cors,
        );
      }
      if (!request.body) return json({ error: "Empty upload" }, 400, cors);

      const filename = url.searchParams.get("filename") ?? "file";
      const key = newKey(user.sub, filename);
      await store.put(key, request.body, {
        httpMetadata: { contentType, cacheControl: "private, max-age=0" },
      });

      return json(
        { bucket, key, publicUrl: publicUrlFor(env, bucket, policy, key) },
        201,
        cors,
      );
    }

    if (url.pathname.startsWith("/files/") && request.method === "GET") {
      const user = await requireUser(request, env, url);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      const [, , bucketName, ...rest] = url.pathname.split("/");
      if (!isBucket(bucketName)) return json({ error: "Not found" }, 404, cors);
      const policy = BUCKETS[bucketName];
      if (
        !policy.public &&
        !decodeURIComponent(rest.join("/")).startsWith(`${user.sub}/`)
      ) {
        return json({ error: "Not found" }, 404, cors);
      }
      const store = bindingFor(env, policy);
      if (!store)
        return json({ error: `Binding missing for ${bucketName}` }, 500, cors);

      const object = await store.get(decodeURIComponent(rest.join("/")));
      if (!object) return json({ error: "Not found" }, 404, cors);

      return new Response(object.body, {
        headers: {
          "content-type":
            object.httpMetadata?.contentType ?? "application/octet-stream",
          "cache-control": "private, max-age=60",
          etag: object.httpEtag ?? "",
          ...cors,
        },
      });
    }

    if (url.pathname.startsWith("/public/") && request.method === "GET") {
      const [, , bucketName, ...rest] = url.pathname.split("/");
      if (!isBucket(bucketName))
        return new Response("Not found", { status: 404 });
      const policy = BUCKETS[bucketName];
      if (!policy.public) return new Response("Not found", { status: 404 });

      const store = bindingFor(env, policy);
      if (!store)
        return new Response("Bucket binding missing", { status: 500 });

      const object = await store.get(decodeURIComponent(rest.join("/")));
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

    if (url.pathname === "/presign/upload" && request.method === "POST") {
      if (!s3Configured(env)) {
        return json(
          {
            error: "Presigning needs R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY",
            mode: "binding",
          },
          501,
          cors,
        );
      }
      const user = await requireUser(request, env, url);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      const body = (await request.json().catch(() => ({}))) as {
        bucket?: string;
        filename?: string;
        contentType?: string;
        size?: number;
        expiresIn?: number;
      };
      const bucket = body.bucket ?? "";
      if (!isBucket(bucket))
        return json({ error: "Unknown bucket" }, 400, cors);

      const policy = BUCKETS[bucket];
      const contentType = (body.contentType ?? "").toLowerCase();
      if (!policy.types.includes(contentType)) {
        return json(
          { error: `Unsupported content type: ${contentType || "none"}` },
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
            error: `File is larger than the ${Math.round(policy.maxBytes / MB)} MB limit for ${bucket}`,
          },
          413,
          cors,
        );
      }

      const key = newKey(user.sub, body.filename ?? "file");
      const expiresIn = Math.min(Math.max(body.expiresIn ?? 900, 60), 3600);
      const uploadUrl = await presignR2Url({
        method: "PUT",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        bucket,
        key,
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        expiresIn,
      });

      return json(
        {
          bucket,
          key,
          uploadUrl,
          expiresIn,
          publicUrl: publicUrlFor(env, bucket, policy, key),
        },
        200,
        cors,
      );
    }

    if (url.pathname === "/presign/download" && request.method === "POST") {
      if (!s3Configured(env)) {
        return json(
          {
            error: "Presigning needs R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY",
            mode: "binding",
          },
          501,
          cors,
        );
      }
      const user = await requireUser(request, env, url);
      if (user instanceof Response)
        return json(await user.json(), user.status, cors);

      const body = (await request.json().catch(() => ({}))) as {
        bucket?: string;
        key?: string;
        expiresIn?: number;
      };
      const bucket = body.bucket ?? "";
      if (!isBucket(bucket) || !body.key) {
        return json({ error: "bucket and key are required" }, 400, cors);
      }
      const policy = BUCKETS[bucket];
      if (!policy.public && !body.key.startsWith(`${user.sub}/`)) {
        return json({ error: "Not found" }, 404, cors);
      }

      const expiresIn = Math.min(Math.max(body.expiresIn ?? 300, 60), 3600);
      const downloadUrl = await presignR2Url({
        method: "GET",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        bucket,
        key: body.key,
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        expiresIn,
      });
      return json({ url: downloadUrl, expiresIn }, 200, cors);
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
