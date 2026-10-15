// =========================================================
// FRELUX: WORKFLOW EXPORTS
//
// Client-side exports for the workflow control plane:
//   * documents CSV — one row per RFI/submittal/change
//     order, spreadsheet-ready (Excel BOM handled by the
//     shared downloadCsv helper)
//   * full record JSON — document + complete immutable audit
//     trail + participants + attachments, for backups and
//     external systems (an "API surface" in file form)
//
// Pure functions wherever possible: toCsvRows/toAuditPayload
// do NO network work, so exports keep working offline for
// data the client has already loaded. Every export names
// its generator and timestamp honestly — a file is an
// audit artifact too.
// =========================================================

import { downloadCsv, downloadJson } from "@/lib/export-utils";
import { isOverdue, type WorkflowDocument } from "./workflow-engine";
import type { WorkflowEvent } from "./workflow-engine";
import type { WorkflowParticipant } from "./participants";
import type { WorkflowAttachment } from "./attachments";

export interface WorkflowCsvRow {
  reference_code: string;
  doc_type: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  due_date: string;
  overdue: string;
  amount: string;
  currency: string;
  revision_no: string;
  created_at: string;
  updated_at: string;
}

/** Pure: documents to spreadsheet rows. No network, offline-safe. */
export function toCsvRows(
  docs: WorkflowDocument[],
  referenceNow: string = new Date().toISOString(),
): WorkflowCsvRow[] {
  return docs.map((d) => ({
    reference_code: d.reference_code,
    doc_type: d.doc_type,
    title: d.title,
    status: d.status,
    priority: d.priority,
    assignee: d.assignee ?? "",
    due_date: d.due_date ?? "",
    overdue: isOverdue(d.due_date, d.status, referenceNow) ? "yes" : "no",
    amount: d.amount != null ? String(d.amount) : "",
    currency: d.currency ?? "",
    revision_no: String(d.revision_no),
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
}

export const WORKFLOW_CSV_COLUMNS = [
  { header: "Reference", key: "reference_code" },
  { header: "Type", key: "doc_type" },
  { header: "Title", key: "title" },
  { header: "Status", key: "status" },
  { header: "Priority", key: "priority" },
  { header: "Assignee", key: "assignee" },
  { header: "Due date", key: "due_date" },
  { header: "Overdue", key: "overdue" },
  { header: "Amount", key: "amount" },
  { header: "Currency", key: "currency" },
  { header: "Revision", key: "revision_no" },
  { header: "Created", key: "created_at" },
  { header: "Updated", key: "updated_at" },
] as const;

/** Downloads the project's workflow documents as CSV. */
export function exportWorkflowDocumentsCsv(
  docs: WorkflowDocument[],
  projectName: string,
): void {
  downloadCsv(
    `workflow-${projectName.replace(/[^A-Za-z0-9._-]+/g, "-")}-${new Date()
      .toISOString()
      .slice(0, 10)}`,
    toCsvRows(docs) as unknown as Record<string, unknown>[],
    [...WORKFLOW_CSV_COLUMNS],
  );
}

export interface WorkflowAuditPayload {
  exported_at: string;
  generator: string;
  document: WorkflowDocument;
  events: WorkflowEvent[];
  participants: WorkflowParticipant[];
  attachments: Array<{
    file_name: string;
    size_bytes: number;
    content_type: string | null;
    created_at: string;
  }>;
}

/** Pure: the full record for one document. No network. */
export function toAuditPayload(
  doc: WorkflowDocument,
  events: WorkflowEvent[],
  participants: WorkflowParticipant[],
  attachments: WorkflowAttachment[],
): WorkflowAuditPayload {
  return {
    exported_at: new Date().toISOString(),
    generator: "FRELUX workflow export v1",
    document: doc,
    events,
    participants,
    attachments: attachments.map((a) => ({
      file_name: a.file_name,
      size_bytes: a.size_bytes,
      content_type: a.content_type,
      created_at: a.created_at,
    })),
  };
}

/** Downloads the complete record (audit trail, share list, attachments) as JSON. */
export function exportWorkflowAudit(
  doc: WorkflowDocument,
  events: WorkflowEvent[],
  participants: WorkflowParticipant[],
  attachments: WorkflowAttachment[],
): void {
  downloadJson(
    `${doc.reference_code.replace(/[^A-Za-z0-9._-]+/g, "-")}-record`,
    toAuditPayload(doc, events, participants, attachments),
  );
}
