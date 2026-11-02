/**
 * FRELUX Global Operations Engine — Workflow & Automation
 * (RFI / Submittal / Change Orders) — deterministic core.
 *
 * House rules, identical to every other FRELUX engine:
 *  - Pure, deterministic logic. No LLM, no network, no clock reads
 *    inside transitions (pass `now` in for due-date math).
 *  - The engine reports ONLY what the rules allow: an invalid
 *    transition is rejected with the reason; nothing is silently
 *    coerced to a different state.
 *  - Amounts are currency-agnostic numbers; the caller supplies the
 *    project's currency for display. No NGN assumption lives here.
 */

export type WorkflowDocType = "rfi" | "submittal" | "change_order";

export type WorkflowStatus =
  | "draft"
  | "open"
  | "in_review"
  | "answered"
  | "approved"
  | "rejected"
  | "closed";

export type WorkflowPriority = "low" | "normal" | "high" | "urgent";

export type WorkflowEventType =
  "created" | "transition" | "revision" | "comment";

export interface WorkflowDocument {
  id: string;
  project_id: string;
  doc_type: WorkflowDocType;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  reference_code: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  amount: number | null;
  currency: string | null;
  revision_no: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEvent {
  id: string;
  document_id: string;
  event_type: WorkflowEventType;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus | null;
  actor: string;
  note: string | null;
  created_at: string;
}

export interface WorkflowRevision {
  id: string;
  document_id: string;
  revision_no: number;
  title: string;
  description: string | null;
  amount: number | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// =========================================================
// State machine — allowed transitions per document type
// =========================================================

/**
 * Deterministic transition table. The production DB CHECK constraint
 * mirrors the status vocabulary; this table is the single source of
 * truth for which moves are legal.
 */
const TRANSITIONS: Record<
  WorkflowDocType,
  Record<WorkflowStatus, WorkflowStatus[]>
> = {
  rfi: {
    draft: ["open"],
    open: ["answered", "closed"],
    answered: ["closed"],
    in_review: [],
    approved: [],
    rejected: [],
    closed: [],
  },
  submittal: {
    draft: ["open"],
    open: ["in_review", "closed"],
    in_review: ["approved", "rejected"],
    // rejected submittals may be revised and resubmitted
    rejected: ["in_review", "closed"],
    approved: ["closed"],
    answered: [],
    closed: [],
  },
  change_order: {
    draft: ["open"],
    open: ["in_review", "closed"],
    in_review: ["approved", "rejected"],
    rejected: ["in_review", "closed"],
    approved: ["closed"],
    answered: [],
    closed: [],
  },
};

export function canTransition(
  docType: WorkflowDocType,
  from: WorkflowStatus,
  to: WorkflowStatus,
): boolean {
  return (TRANSITIONS[docType][from] ?? []).includes(to);
}

export function nextStatuses(
  docType: WorkflowDocType,
  status: WorkflowStatus,
): WorkflowStatus[] {
  return [...(TRANSITIONS[docType][status] ?? [])];
}

export function transitionError(
  docType: WorkflowDocType,
  from: WorkflowStatus,
  to: WorkflowStatus,
): string | null {
  if (from === to) return `Status is already "${from}".`;
  if (canTransition(docType, from, to)) return null;
  const allowed = nextStatuses(docType, from);
  if (allowed.length === 0)
    return `"${from}" is terminal for a ${labelFor(docType).toLowerCase()}.`;
  return `"${from}" → "${to}" is not allowed. Allowed: ${allowed.join(", ")}.`;
}

export function labelFor(docType: WorkflowDocType): string {
  return docType === "rfi"
    ? "RFI"
    : docType === "submittal"
      ? "Submittal"
      : "Change order";
}

// =========================================================
// Reference codes — deterministic per project + type
// =========================================================

export function referenceCode(
  docType: WorkflowDocType,
  sequence: number,
): string {
  const prefix =
    docType === "rfi" ? "RFI" : docType === "submittal" ? "SUB" : "CO";
  return `${prefix}-${String(Math.max(0, Math.floor(sequence))).padStart(4, "0")}`;
}

// =========================================================
// Due dates & overdue (caller supplies `now` — no clock reads)
// =========================================================

export function isOverdue(
  dueDate: string | null,
  status: WorkflowStatus,
  now: string,
): boolean {
  if (!dueDate) return false;
  // closed/terminal items no longer count as overdue
  if (status === "closed" || status === "approved" || status === "rejected")
    return false;
  return dueDate < now.slice(0, 10);
}

// =========================================================
// Change-order cost impact — currency-agnostic
// =========================================================

export interface ChangeOrderImpact {
  approvedTotal: number;
  pendingTotal: number;
  count: number;
}

/**
 * Sums approved + in-flight change orders. Pure math: no currency
 * conversion, no rounding beyond cents/kobo units — display and FX
 * belong to the caller.
 */
export function changeOrderImpact(
  docs: Pick<WorkflowDocument, "doc_type" | "status" | "amount">[],
): ChangeOrderImpact {
  let approvedTotal = 0;
  let pendingTotal = 0;
  let count = 0;
  for (const d of docs) {
    if (d.doc_type !== "change_order" || d.amount == null) continue;
    count += 1;
    if (d.status === "approved" || d.status === "closed") {
      approvedTotal += d.amount;
    } else if (d.status === "open" || d.status === "in_review") {
      pendingTotal += d.amount;
    }
  }
  return { approvedTotal, pendingTotal, count };
}

// =========================================================
// Summary for the tab strip (counts by type + open/overdue)
// =========================================================

export interface WorkflowSummary {
  rfiOpen: number;
  submittalOpen: number;
  changeOrderOpen: number;
  overdue: number;
  needsAction: number;
}

export function summarize(
  docs: Array<Pick<WorkflowDocument, "doc_type" | "status" | "due_date">>,
  now: string,
): WorkflowSummary {
  const s: WorkflowSummary = {
    rfiOpen: 0,
    submittalOpen: 0,
    changeOrderOpen: 0,
    overdue: 0,
    needsAction: 0,
  };
  for (const d of docs) {
    const active =
      d.status === "open" ||
      d.status === "in_review" ||
      d.status === "answered" ||
      d.status === "rejected";
    if (!active) continue;
    s.needsAction += 1;
    if (d.doc_type === "rfi") s.rfiOpen += 1;
    else if (d.doc_type === "submittal") s.submittalOpen += 1;
    else s.changeOrderOpen += 1;
    if (isOverdue(d.due_date, d.status, now)) s.overdue += 1;
  }
  return s;
}
