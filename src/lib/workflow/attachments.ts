// =========================================================
// FRELUX: WORKFLOW ATTACHMENTS
//
// File attachments for workflow documents. Security model
// (migration 20261016030000):
//   * the 'workflow-attachments' bucket is PRIVATE —
//     downloads go through signed URLs minted by the
//     caller's own session, which must pass storage RLS
//   * uploads/reads/removals are scoped by document: the
//     project OWNER and invited REVIEWERS can write,
//     participants (viewer included) can read
//
// This client surface is honest by design:
//   * file names are sanitized and prefixed so a path can
//     never collide or escape the document folder
//   * executable types are refused client-side, size is
//     capped, and every failure surfaces as a thrown Error
//     (never a silent fake success)
//   * the attachment row is inserted AFTER a successful
//     storage upload; if the row insert fails the orphaned
//     object is removed best-effort
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkflowDocument } from "./workflow-engine";

export const ATTACHMENT_BUCKET = "workflow-attachments";
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB

export interface WorkflowAttachment {
  id: string;
  document_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

/** Extensions that must never be uploaded. */
const BLOCKED_EXT = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".com",
  ".scr",
  ".hta",
  ".vbs",
  ".ps1",
  ".jar",
  ".apk",
];

/** Keep the name honest but path-safe. */
export function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "")
      .replace(/_+(?=\.[A-Za-z0-9]+$)/, "") || "file"
  );
}

/** Client-side gate: honest errors before any network work. */
export function validateAttachment(file: File): string | null {
  const safe = sanitizeFileName(file.name).toLowerCase();
  if (BLOCKED_EXT.some((ext) => safe.endsWith(ext))) {
    return `Executable types are not allowed (${safe})`;
  }
  if (file.size <= 0) {
    return "The file is empty";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `The file is larger than the 15 MB limit`;
  }
  return null;
}

export async function listWorkflowAttachments(
  documentId: string,
): Promise<WorkflowAttachment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("workflow_attachments")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkflowAttachment[];
}

/** Path convention enforced by the storage policies: <doc>/<name>. */
function storagePathFor(docId: string, fileName: string): string {
  return `${docId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/**
 * Uploads a file for a workflow document and records the row.
 * The audit trail gets a comment AFTER both writes succeed —
 * best-effort, never blocking.
 */
export async function uploadWorkflowAttachment(
  doc: WorkflowDocument,
  file: File,
): Promise<WorkflowAttachment> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const invalid = validateAttachment(file);
  if (invalid) throw new Error(invalid);

  const path = storagePathFor(doc.id, file.name);
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("workflow_attachments")
    .insert({
      document_id: doc.id,
      file_name: file.name,
      storage_path: path,
      size_bytes: file.size,
      content_type: file.type || null,
    })
    .select()
    .single();
  if (error) {
    // Best-effort cleanup: never leave an orphaned object.
    void supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  void supabase
    .from("workflow_events")
    .insert({
      document_id: doc.id,
      event_type: "comment",
      actor: "owner",
      note: `Attachment added: ${file.name}`,
    })
    .then(() => undefined);

  return data as unknown as WorkflowAttachment;
}

/** Time-limited download link (private bucket — no public URLs). */
export async function getAttachmentUrl(
  attachment: Pick<WorkflowAttachment, "storage_path">,
  expiresInSeconds = 300,
): Promise<string> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.storage_path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create download link");
  }
  return data.signedUrl;
}

/**
 * Removes an attachment (row + object). RLS decides who may:
 * owner or reviewer. A missing storage object is not an error
 * (the row is the source of truth).
 */
export async function deleteWorkflowAttachment(
  doc: WorkflowDocument,
  attachment: WorkflowAttachment,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("workflow_attachments")
    .delete()
    .eq("id", attachment.id)
    .eq("document_id", doc.id);
  if (error) throw new Error(error.message);

  void supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachment.storage_path]);

  void supabase
    .from("workflow_events")
    .insert({
      document_id: doc.id,
      event_type: "comment",
      actor: "owner",
      note: `Attachment removed: ${attachment.file_name}`,
    })
    .then(() => undefined);
}
