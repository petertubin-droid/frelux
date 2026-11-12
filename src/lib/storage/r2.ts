/**
 * Cloudflare R2 uploads for the browser.
 *
 * The bucket is never public and the storage key never reaches the client: the
 * Worker checks the caller's Supabase token, decides the object key, and writes
 * the object through its R2 binding. Uploads therefore need no R2 access keys,
 * and large plans and receipts stay off the app server.
 *
 * Storage stays behind a driver switch so R2 can be turned on bucket by bucket
 * (`VITE_STORAGE_DRIVER=r2`) and rolled back by unsetting one variable.
 */

export type StorageBucket =
  | "avatars"
  | "brand-assets"
  | "marketplace"
  | "plan-documents"
  | "pro-verification";

/** Mirrors the Worker's limits so an oversized file fails before it is sent. */
export const BUCKET_LIMITS: Record<StorageBucket, number> = {
  avatars: 5 * 1024 * 1024,
  "brand-assets": 10 * 1024 * 1024,
  marketplace: 25 * 1024 * 1024,
  "plan-documents": 50 * 1024 * 1024,
  "pro-verification": 20 * 1024 * 1024,
};

export const PUBLIC_BUCKETS: StorageBucket[] = ["avatars", "brand-assets"];

export class StorageError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");

/** Base URL of the deployed Worker, or null when R2 is not configured. */
export function r2WorkerUrl(): string | null {
  const raw = import.meta.env.VITE_R2_WORKER_URL as string | undefined;
  return raw ? trimSlash(raw) : null;
}

/**
 * Which backend file uploads should use. Supabase stays the default so the app
 * keeps working before the Worker is deployed.
 */
export function storageDriver(): "r2" | "supabase" {
  const requested = import.meta.env.VITE_STORAGE_DRIVER as string | undefined;
  return requested === "r2" && r2WorkerUrl() ? "r2" : "supabase";
}

export interface UploadResult {
  bucket: StorageBucket;
  key: string;
  publicUrl: string | null;
}

/**
 * Uploads a file to R2 and returns its key. `publicUrl` is filled in only for
 * the public buckets (avatars, brand assets); everything else is fetched back
 * through the Worker.
 */
export async function uploadToR2(params: {
  bucket: StorageBucket;
  file: Blob;
  filename?: string;
  accessToken: string;
}): Promise<UploadResult> {
  const worker = r2WorkerUrl();
  if (!worker) throw new StorageError("R2 storage is not configured", 0);
  if (!params.accessToken)
    throw new StorageError("Sign in to upload files", 401);

  const { bucket, file, accessToken } = params;
  const name = params.filename ?? (file as File).name ?? "file";
  const limit = BUCKET_LIMITS[bucket];
  if (limit && file.size > limit) {
    throw new StorageError(
      `File is larger than the ${Math.round(limit / (1024 * 1024))} MB limit for ${bucket}`,
      413,
    );
  }
  const contentType = file.type || "application/octet-stream";

  const response = await fetch(
    `${worker}/files?bucket=${encodeURIComponent(bucket)}&filename=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${accessToken}`,
      },
      body: file,
    },
  );

  const body = (await response.json().catch(() => ({}))) as {
    key?: string;
    publicUrl?: string | null;
    error?: string;
  };

  if (!response.ok || !body.key) {
    throw new StorageError(
      body.error ?? "The storage service refused the upload",
      response.status,
    );
  }

  return {
    bucket,
    key: body.key,
    publicUrl: body.publicUrl ?? null,
  };
}

/**
 * URL that reads a stored object back.
 *
 * When the Worker has R2 S3 keys it hands out a short-lived presigned URL. When
 * it does not, the object is streamed through the Worker and the caller's token
 * travels as `?token=`, which is what an <img src> or a download link can carry.
 */
export async function createR2DownloadUrl(params: {
  bucket: StorageBucket;
  key: string;
  accessToken: string;
  expiresIn?: number;
}): Promise<string> {
  const worker = r2WorkerUrl();
  if (!worker) throw new StorageError("R2 storage is not configured", 0);
  if (!params.accessToken) throw new StorageError("Sign in to read files", 401);

  const response = await fetch(`${worker}/presign/download`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      bucket: params.bucket,
      key: params.key,
      expiresIn: params.expiresIn,
    }),
  });

  if (response.status === 501) {
    const path = params.key.replace(/^\/+/, "");
    return `${worker}/files/${encodeURIComponent(params.bucket)}/${path}?token=${encodeURIComponent(params.accessToken)}`;
  }

  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !body.url) {
    throw new StorageError(
      body.error ?? "Could not open that file",
      response.status,
    );
  }
  return body.url;
}

/** Stable public URL for the public buckets, or null for private ones. */
export function r2PublicUrl(bucket: StorageBucket, key: string): string | null {
  const worker = r2WorkerUrl();
  if (!worker || !PUBLIC_BUCKETS.includes(bucket)) return null;
  return `${worker}/public/${bucket}/${key.replace(/^\/+/, "")}`;
}
