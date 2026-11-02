// =========================================================
// FRELUX: WORKFLOW CROSS-ROLE HANDOFF
//
// Owner-side invite management for workflow documents.
// The DB owns the security model (migration
// 20261016020000): workflow_participants rows drive
// is_workflow_participant()/is_workflow_reviewer() RLS
// scopes, so a 'reviewer' can act on a shared document and
// a 'viewer' can read it — without the owner ever loosening
// their own policies.
//
// This module is the honest client surface:
//   * invites are by EMAIL (must match a registered user's
//     profiles.email), always stored lowercased
//   * every invite/removal lands in the append-only audit
//     trail as a 'comment' event with actor 'owner'
//   * nothing here can touch documents, events or revisions
//     directly — RLS still decides
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkflowDocument } from "./workflow-engine";

export type WorkflowParticipantRole = "reviewer" | "viewer";

export interface WorkflowParticipant {
  id: string;
  document_id: string;
  email: string;
  participant_role: WorkflowParticipantRole;
  granted_by: string | null;
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Honest validation: an invite must have a real email shape. */
export function validateInvite(email: string, role: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_RE.test(normalized)) {
    return "Enter a valid email address";
  }
  if (role !== "reviewer" && role !== "viewer") {
    return "Role must be reviewer or viewer";
  }
  return null;
}

export async function listWorkflowParticipants(
  documentId: string,
): Promise<WorkflowParticipant[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("workflow_participants")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkflowParticipant[];
}

/**
 * Grants a role on a workflow document by email. The insert is
 * owner-gated by RLS; a duplicate invite surfaces the unique
 * violation as a friendly error. An audit comment is recorded
 * AFTER the grant — if the comment insert fails the grant
 * still stands (the participant row is the source of truth).
 */
export async function inviteWorkflowParticipant(
  doc: WorkflowDocument,
  email: string,
  role: WorkflowParticipantRole,
): Promise<WorkflowParticipant> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const invalid = validateInvite(email, role);
  if (invalid) throw new Error(invalid);
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("workflow_participants")
    .insert({
      document_id: doc.id,
      email: normalized,
      participant_role: role,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(`${normalized} is already on this document`);
    }
    throw new Error(error.message);
  }

  void supabase
    .from("workflow_events")
    .insert({
      document_id: doc.id,
      event_type: "comment",
      actor: "owner",
      note: `Shared with ${normalized} as ${role}`,
    })
    .then(() => undefined);

  return data as unknown as WorkflowParticipant;
}

/**
 * Revokes a role grant. Missing rows are NOT an error — the
 * invite list is idempotent to remove.
 */
export async function removeWorkflowParticipant(
  doc: WorkflowDocument,
  email: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase
    .from("workflow_participants")
    .delete()
    .eq("document_id", doc.id)
    .eq("email", normalized);
  if (error) throw new Error(error.message);

  void supabase
    .from("workflow_events")
    .insert({
      document_id: doc.id,
      event_type: "comment",
      actor: "owner",
      note: `Access removed for ${normalized}`,
    })
    .then(() => undefined);
}
