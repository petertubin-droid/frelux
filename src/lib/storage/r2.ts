/**
 * Cloudflare R2 uploads for the browser.
 *
 * The bucket is never public and the storage key never reaches the client: the
 * Worker checks the caller's Supabase token, decides the object key, and returns
 * a short-lived presigned URL. The file then goes straight to R2, which keeps
 * large plans and receipts off the app server and out of its request budget.
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
 * through a signed URL.
 */
export async function uploadToR2(params: {
  bucket: StorageBucket;
  file: Blob;
  filename?: string;
  accessToken: string;
  expiresIn?: number;
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

  const presignResponse = await fetch(`${worker}/presign/upload`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      bucket,
      filename: name,
      contentType,
      size: file.size,
      expiresIn: params.expiresIn,
    }),
  });

  const presign = (await presignResponse.json().catch(() => ({}))) as {
    key?: string;
    uploadUrl?: string;
    publicUrl?: string | null;
    error?: string;
  };

  if (!presignResponse.ok || !presign.uploadUrl || !presign.key) {
    throw new StorageError(
      presign.error ?? "The storage service refused the upload",
      presignResponse.status,
    );
  }

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new StorageError(`Upload failed (${put.status})`, put.status);
  }

  return {
    bucket,
    key: presign.key,
    publicUrl: presign.publicUrl ?? null,
  };
}

/** Signed read URL for a private object. */
export async function createR2DownloadUrl(params: {
  bucket: StorageBucket;
  key: string;
  accessToken: string;
  expiresIn?: number;
}): Promise<string> {
  const worker = r2WorkerUrl();
  if (!worker) throw new StorageError("R2 storage is not configured", 0);

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

  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !body.url) {
    throw new StorageError(
      body.error ?? "Could not sign that file",
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
