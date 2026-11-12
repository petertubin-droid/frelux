/**
 * Storage facade: one interface for the modules that own a file.
 *
 * Uploads go to Cloudflare R2 through the Worker when `VITE_STORAGE_DRIVER=r2`
 * and the bucket has been provisioned there; otherwise they stay on Supabase
 * Storage. Callers never branch on the driver themselves, and a half-provisioned
 * environment therefore keeps working.
 *
 * The bucket names below are the logical names the app already uses in its
 * columns, and they match the Worker's allowlist one for one.
 */
import { supabase } from "@/lib/supabase";
import {
  createR2DownloadUrl,
  r2PublicUrl,
  storageDriver,
  uploadToR2,
  type StorageBucket,
} from "./r2";

export type { StorageBucket };
export { r2PublicUrl, storageDriver };

const R2_BUCKETS: StorageBucket[] = [
  "avatars",
  "brand-assets",
  "marketplace",
  "plan-documents",
  "pro-verification",
];

export const isR2Bucket = (bucket: string): bucket is StorageBucket =>
  (R2_BUCKETS as string[]).includes(bucket);

/** True when this bucket's reads and writes now go through the Worker. */
export const storageUsesR2 = (bucket: string) =>
  storageDriver() === "r2" && isR2Bucket(bucket);

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export interface StoredFile {
  /** Where the object lives. Supabase path, or the R2 key the Worker chose. */
  path: string;
  /** Set only for public buckets (avatars, brand assets). */
  publicUrl: string | null;
  error: string | null;
}

/**
 * Uploads a file and returns the path to store in the database.
 *
 * `path` is only a hint: on R2 the Worker decides the key, prefixed with the
 * caller's user id so a private object can never be read by another user.
 */
export async function uploadStoredFile(params: {
  bucket: string;
  file: Blob;
  path: string;
  contentType?: string;
  filename?: string;
}): Promise<StoredFile> {
  const { bucket, file, path } = params;

  if (storageUsesR2(bucket)) {
    const token = await accessToken();
    if (!token)
      return { path, publicUrl: null, error: "Sign in to upload files." };
    try {
      const result = await uploadToR2({
        bucket: bucket as StorageBucket,
        file,
        filename: params.filename ?? (file as File).name,
        accessToken: token,
      });
      return { path: result.key, publicUrl: result.publicUrl, error: null };
    } catch (error) {
      return {
        path,
        publicUrl: null,
        error: error instanceof Error ? error.message : "Upload failed.",
      };
    }
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: params.contentType, upsert: false });

  if (error) return { path, publicUrl: null, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data?.publicUrl ?? null, error: null };
}

/** Best-effort delete. A missing object is not an error worth surfacing. */
export async function removeStoredFile(
  bucket: string,
  path: string,
): Promise<void> {
  if (storageUsesR2(bucket)) {
    const token = await accessToken();
    if (!token) return;
    const worker = (
      import.meta.env.VITE_R2_WORKER_URL as string | undefined
    )?.replace(/\/+$/, "");
    if (!worker) return;
    await fetch(
      `${worker}/files/${encodeURIComponent(bucket)}/${path.replace(/^\/+/, "")}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      },
    ).catch(() => undefined);
    return;
  }
  await supabase.storage.from(bucket).remove([path]);
}

/**
 * Short-lived link for a private object. Reads are never public: the bucket is
 * closed and a fresh link is minted per view.
 */
export async function signedUrlFor(
  bucket: string,
  path: string,
  expiresIn = 300,
): Promise<{ url: string | null; error: string | null }> {
  if (storageUsesR2(bucket)) {
    const token = await accessToken();
    if (!token) return { url: null, error: "Sign in to open that file." };
    try {
      const url = await createR2DownloadUrl({
        bucket: bucket as StorageBucket,
        key: path,
        accessToken: token,
        expiresIn,
      });
      return { url, error: null };
    } catch (error) {
      return {
        url: null,
        error:
          error instanceof Error ? error.message : "Could not open that file.",
      };
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? "No link returned." };
  }
  return { url: data.signedUrl, error: null };
}
