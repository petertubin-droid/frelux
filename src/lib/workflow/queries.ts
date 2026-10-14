/**
 * Workflow queries — thin, honest data layer for the RFI /
 * submittal / change-order control plane. Every mutation that
 * changes state also appends an immutable audit event; revisions
 * are append-only snapshots.
 */

import { supabase } from "@/lib/supabase";
import {
  type WorkflowDocument,
  type WorkflowEvent,
  type WorkflowRevision,
  type WorkflowDocType,
  type WorkflowStatus,
  referenceCode,
  canTransition,
} from "./workflow-engine";

export interface CreateWorkflowDocumentInput {
  project_id: string;
  doc_type: WorkflowDocType;
  title: string;
  description?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  assignee?: string | null;
  due_date?: string | null;
  amount?: number | null;
  currency?: string | null;
}

async function nextSequence(
  projectId: string,
  docType: WorkflowDocType,
): Promise<number> {
  const { data } = await supabase
    .from("workflow_documents")
    .select("reference_code")
    .eq("project_id", projectId)
    .eq("doc_type", docType);
  const codes = (data ?? []) as Array<{ reference_code: string }>;
  const max = codes.reduce((acc, row) => {
    const n = Number((row.reference_code ?? "").split("-")[1]);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return max + 1;
}

export async function createWorkflowDocument(
  input: CreateWorkflowDocumentInput,
): Promise<WorkflowDocument> {
  const seq = await nextSequence(input.project_id, input.doc_type);
  const ref = referenceCode(input.doc_type, seq);

  const { data: doc, error } = await supabase
    .from("workflow_documents")
    .insert({
      project_id: input.project_id,
      doc_type: input.doc_type,
      status: "draft",
      priority: input.priority ?? "normal",
      reference_code: ref,
      title: input.title,
      description: input.description ?? null,
      assignee: input.assignee ?? null,
      due_date: input.due_date ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      revision_no: 1,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Immutable audit: creation event + first content snapshot.
  await Promise.all([
    supabase.from("workflow_events").insert({
      document_id: doc.id,
      event_type: "created",
      to_status: "draft",
      actor: "owner",
      note: `Created as ${ref}`,
    }),
    supabase.from("workflow_revisions").insert({
      document_id: doc.id,
      revision_no: 1,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount ?? null,
      payload: {},
    }),
  ]);

  return doc as unknown as WorkflowDocument;
}

export async function fetchProjectWorkflowDocuments(
  projectId: string,
): Promise<WorkflowDocument[]> {
  const { data, error } = await supabase
    .from("workflow_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkflowDocument[];
}

export async function fetchWorkflowEvents(
  documentId: string,
): Promise<WorkflowEvent[]> {
  const { data, error } = await supabase
    .from("workflow_events")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkflowEvent[];
}

export async function fetchWorkflowRevisions(
  documentId: string,
): Promise<WorkflowRevision[]> {
  const { data, error } = await supabase
    .from("workflow_revisions")
    .select("*")
    .eq("document_id", documentId)
    .order("revision_no", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkflowRevision[];
}

export async function transitionWorkflowDocument(
  doc: WorkflowDocument,
  to: WorkflowStatus,
  note?: string,
): Promise<WorkflowDocument> {
  // Deterministic guard: invalid transitions are refused before
  // any DB write. The DB CHECK constraints are the backstop.
  if (!canTransition(doc.doc_type, doc.status, to)) {
    throw new Error(
      `Invalid transition ${doc.status} → ${to} for ${doc.doc_type}`,
    );
  }
  const { data, error } = await supabase
    .from("workflow_documents")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", doc.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("workflow_events").insert({
    document_id: doc.id,
    event_type: "transition",
    from_status: doc.status,
    to_status: to,
    actor: "owner",
    note: note ?? null,
  });
  return data as unknown as WorkflowDocument;
}

export interface RevisionInput {
  title: string;
  description?: string | null;
  amount?: number | null;
  note?: string | null;
}

export async function addWorkflowRevision(
  doc: WorkflowDocument,
  input: RevisionInput,
): Promise<void> {
  const next = doc.revision_no + 1;
  const { error } = await supabase.from("workflow_revisions").insert({
    document_id: doc.id,
    revision_no: next,
    title: input.title,
    description: input.description ?? null,
    amount: input.amount ?? null,
    payload: {},
  });
  if (error) throw new Error(error.message);
  await supabase
    .from("workflow_documents")
    .update({
      revision_no: next,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount ?? doc.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", doc.id);
  await supabase.from("workflow_events").insert({
    document_id: doc.id,
    event_type: "revision",
    actor: "owner",
    note: input.note ?? `Revision ${next} recorded`,
  });
}

export async function addWorkflowComment(
  doc: WorkflowDocument,
  note: string,
): Promise<void> {
  const { error } = await supabase.from("workflow_events").insert({
    document_id: doc.id,
    event_type: "comment",
    actor: "owner",
    note,
  });
  if (error) throw new Error(error.message);
}
