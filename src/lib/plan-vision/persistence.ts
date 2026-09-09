// =========================================================
// FRELUX PLAN VISION, Persistence (documents & extractions)
//
// Secure client-side storage for construction documents:
//   - upload validation (type + size) BEFORE any network call
//   - PRIVATE bucket only, originals never public (§23)
//   - RLS-enforced ownership (user_id = auth.uid() in the DB)
//   - versioned extractions; a verified extraction is never
//     re-processed (§24)
// =========================================================

import { supabase } from "@/lib/supabase";
import type { PlanDocument, PlanExtraction } from "./types";

// =========================================================
// UPLOAD VALIDATION (§23)
// =========================================================

/** Accepted mime types for plan documents. */
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** Max upload size (25MB, matches the private bucket limit). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface ValidationResult {
  ok: boolean;
  code?: "UNSUPPORTED_TYPE" | "TOO_LARGE" | "EMPTY";
  message?: string;
}

/** Deterministic pre-upload validation. */
export function validateUpload(file: {
  type: string;
  size: number;
  name: string;
}): ValidationResult {
  if (!file.size) {
    return { ok: false, code: "EMPTY", message: "The file is empty." };
  }
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: `Unsupported file type "${file.type || "unknown"}". Upload a PDF, JPG, PNG, WEBP or HEIC file.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `The file is too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
    };
  }
  return { ok: true };
}

/** Infer the document kind from mime type + name (best effort). */
export function inferDocumentKind(
  mimeType: string,
  fileName: string,
): PlanDocument["kind"] {
  const lower = fileName.toLowerCase();
  if (/roof/.test(lower)) return "roof_plan";
  if (/elevation/.test(lower)) return "elevation";
  if (/section/.test(lower)) return "section";
  if (/floor[-_ ]?plan|layout/.test(lower)) return "floor_plan";
  if (/scan/.test(lower)) return "scanned_plan";
  if (/screenshot|screen[-_ ]?shot|capture/.test(lower)) return "screenshot";
  if (/photo|img|dsc_|pic/.test(lower) && mimeType.startsWith("image/"))
    return "photograph";
  if (mimeType === "application/pdf") return "architectural_pdf";
  return "construction_drawing";
}

// =========================================================
// DOCUMENT CRUD (private bucket + RLS table)
// =========================================================

const BUCKET = "plan-documents";

export interface UploadResult {
  document: PlanDocument;
  error: string | null;
}

/**
 * Upload a construction document. The ORIGINAL file is stored
 * unmodified; the record is private to the authenticated user.
 */
export async function uploadPlanDocument(
  file: File,
  kind: PlanDocument["kind"],
  projectId: string | null,
): Promise<UploadResult> {
  const validation = validateUpload({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (!validation.ok) {
    return {
      document: null as never,
      error: validation.message ?? "Invalid file.",
    };
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) {
    return { document: null as never, error: "Sign in to upload documents." };
  }

  const storagePath = `${userId}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;

  // 1. Original file → private bucket (never modified afterwards).
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return { document: null as never, error: uploadError.message };
  }

  // 2. Record with ownership (RLS enforces user_id = auth.uid()).
  const { data, error } = await supabase
    .from("plan_documents")
    .insert({
      user_id: userId,
      project_id: projectId,
      kind,
      file_name: file.name,
      mime_type: file.type,
      storage_path: storagePath,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    // Best-effort cleanup of the orphaned upload.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { document: null as never, error: error.message };
  }

  return {
    document: {
      id: data.id,
      userId: data.user_id,
      projectId: data.project_id,
      kind: data.kind,
      fileName: data.file_name,
      mimeType: data.mime_type,
      storagePath: data.storage_path,
      sizeBytes: Number(data.size_bytes),
      scale: data.scale ?? null,
      createdAt: data.created_at,
    },
    error: null,
  };
}

/** List the current user's documents (newest first). */
export async function fetchPlanDocuments(): Promise<{
  documents: PlanDocument[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("plan_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { documents: [], error: error.message };
  return {
    documents: (data ?? []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      userId: d.user_id as string,
      projectId: (d.project_id as string | null) ?? null,
      kind: d.kind as PlanDocument["kind"],
      fileName: d.file_name as string,
      mimeType: d.mime_type as string,
      storagePath: d.storage_path as string,
      sizeBytes: Number(d.size_bytes),
      scale: (d.scale as PlanDocument["scale"]) ?? null,
      createdAt: d.created_at as string,
    })),
    error: null,
  };
}

/**
 * Download a document for EXTRACTION (short-lived signed URL :
 * private bucket contents are never exposed through public URLs).
 */
export async function createDocumentSignedUrl(
  storagePath: string,
  expiresIn = 300,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data)
    return { url: null, error: error?.message ?? "Signed URL failed." };
  return { url: data.signedUrl, error: null };
}

/** Delete a document (and cascade its extractions via FK). */
export async function deletePlanDocument(
  documentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("plan_documents")
    .delete()
    .eq("id", documentId);
  return { error: error ? error.message : null };
}

// =========================================================
// EXTRACTION PERSISTENCE (versioned, §24)
// =========================================================

export interface SaveExtractionResult {
  version: number;
  error: string | null;
}

/** Persist an extraction as the next version for its document. */
export async function savePlanExtraction(
  extraction: PlanExtraction,
): Promise<SaveExtractionResult> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { version: 0, error: "Sign in to save extractions." };

  // Latest version for this document.
  const { data: latest } = await supabase
    .from("plan_extractions")
    .select("version")
    .eq("document_id", extraction.documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;
  const roomsVerified = extraction.rooms.filter(
    (r) =>
      r.reviewStatus === "user_confirmed" || r.reviewStatus === "user_edited",
  ).length;

  const { error } = await supabase.from("plan_extractions").insert({
    user_id: userId,
    document_id: extraction.documentId,
    version,
    extraction,
    rooms_total: extraction.rooms.length,
    rooms_verified: roomsVerified,
    has_blocking_issues: extraction.issues.some((i) => i.severity === "error"),
  });

  return { version, error: error ? error.message : null };
}

/**
 * Load the LATEST extraction of a document (§24, callers check
 * shouldReextract() before re-running AI on it).
 */
export async function fetchLatestExtraction(
  documentId: string,
): Promise<PlanExtraction | null> {
  const { data, error } = await supabase
    .from("plan_extractions")
    .select("extraction")
    .eq("document_id", documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.extraction as PlanExtraction;
}

/** Update an in-review extraction payload (review state changes). */
export async function updatePlanExtraction(
  extraction: PlanExtraction,
): Promise<{ error: string | null }> {
  const roomsVerified = extraction.rooms.filter(
    (r) =>
      r.reviewStatus === "user_confirmed" || r.reviewStatus === "user_edited",
  ).length;

  const { error } = await supabase
    .from("plan_extractions")
    .update({
      extraction,
      rooms_total: extraction.rooms.length,
      rooms_verified: roomsVerified,
      has_blocking_issues: extraction.issues.some(
        (i) => i.severity === "error",
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("document_id", extraction.documentId)
    .eq("version", extraction.version);

  return { error: error ? error.message : null };
}
