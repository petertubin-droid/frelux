// =========================================================
// FRELUX PROJECT AGENT, MEMORY & AUDIT TRAIL (Phase 6, Stage 10)
//
// Finalize persistent project memory: one unified, human-readable
// chronicle a USER can follow end to end :
//
//   What FRELUX observed
//     → what it recommended
//       → what the user approved
//         → what actually happened
//
// The trail is assembled from RECORDED state only (append-only
// activity, prepared actions and their approvals/execution
// results, monitoring alerts). It never invents links: a missing
// step is reported as missing, in plain language.
//
// Secret hygiene (spec: "Do not store secrets or unnecessary
// sensitive data"):
//   - sanitizeAuditValue recursively redacts secret-looking keys
//     BEFORE anything is persisted (recordActivity / recordFact).
//   - The read layer sanitizes again, so legacy rows cannot leak
//     through the story either.
// =========================================================

import { supabase } from "@/lib/supabase";
import type { AgentResult } from "./types";
import type { AgentActivityEntry, AgentFact } from "./types";
import { assertProjectVisible, recordActivity, recordFact } from "./session";

// ---------------------------------------------------------
// Secret hygiene, applied on write AND on read.
// ---------------------------------------------------------

import { sanitizeAuditValue } from "./sanitizer";

export { sanitizeAuditValue };

// ---------------------------------------------------------
// Types, the unified trail.
// ---------------------------------------------------------

export type AuditEntryKind = AgentActivityEntry["kind"] | "alert";

export interface AuditEntry {
  id: string;
  at: string;
  projectId: string;
  /** Who caused it (record owner), recorded, never invented. */
  user: string | null;
  kind: AuditEntryKind;
  summary: string;
  related?: {
    actionId?: string;
    approvalId?: string;
    alertKey?: string;
    factKey?: string;
  };
  payload?: Record<string, unknown>;
}

/** The observed → recommended → approved → happened chain for ONE
 *  prepared action. Every missing link is an explicit gap. */
export interface ActionThread {
  actionId: string;
  actionKind: string;
  what: string;
  /** The observation/data the action was grounded in. */
  observed: string | null;
  /** The recommendation that justified it (recorded at prepare). */
  recommended: string | null;
  /** The user's decision, verbatim: approved / rejected / … */
  approved: string | null;
  /** What actually happened, execution + verification. */
  happened: string | null;
  /** Honest statement of the first missing link, if any. */
  gap: string | null;
}

export interface ProjectStory {
  projectId: string;
  generatedAt: string;
  /** Full chronicle, oldest first. */
  timeline: AuditEntry[];
  /** Decision threads, one per prepared action. */
  threads: ActionThread[];
  openAlerts: Array<{ alertKey: string; severity: string; condition: string }>;
  summary: string;
}

// ---------------------------------------------------------
// Row loaders (RLS-scoped).
// ---------------------------------------------------------

interface ActivityRow {
  id: string;
  project_id: string;
  kind: string;
  state: string;
  summary: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

interface ActionRow {
  id: string;
  kind: string;
  what: string;
  why: string;
  recommendation_summary: string | null;
  state: string;
  executed_at: string | null;
  verified_at: string | null;
  execution_result: Record<string, unknown> | null;
  created_at: string;
}

interface ApprovalRow {
  id: string;
  action_id: string;
  state: string;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

function persistError(step: string, message: string): AgentResult<never> {
  return {
    ok: false,
    error: { code: "persistence_error", message: `${step}: ${message}` },
  };
}

async function loadTrailRows(
  projectId: string,
  limit: number,
): Promise<
  AgentResult<{
    activity: ActivityRow[];
    actions: ActionRow[];
    approvals: ApprovalRow[];
  }>
> {
  try {
    const [activityRes, actionsRes, approvalsRes] = await Promise.all([
      supabase
        .from("project_agent_activity")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(limit),
      supabase
        .from("project_agent_actions")
        .select(
          "id,kind,what,why,recommendation_summary,state,executed_at,verified_at,execution_result,created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_agent_approvals")
        .select("id,action_id,state,requested_at,decided_at,decided_by")
        .order("requested_at", { ascending: true }),
    ]);
    if (activityRes.error)
      return persistError("Activity load failed", activityRes.error.message);
    if (actionsRes.error)
      return persistError("Action load failed", actionsRes.error.message);
    if (approvalsRes.error)
      return persistError("Approval load failed", approvalsRes.error.message);
    return {
      ok: true,
      data: {
        activity: (activityRes.data ?? []) as ActivityRow[],
        actions: (actionsRes.data ?? []) as ActionRow[],
        approvals: (approvalsRes.data ?? []) as ApprovalRow[],
      },
    };
  } catch (e) {
    return persistError("Audit trail load failed", String(e));
  }
}

async function loadOpenAlerts(
  projectId: string,
): Promise<
  AgentResult<Array<{ alertKey: string; severity: string; condition: string }>>
> {
  try {
    const { data, error } = await supabase
      .from("project_agent_alerts")
      .select("alert_key,severity,condition_text")
      .eq("project_id", projectId)
      .eq("status", "open");
    if (error) return persistError("Alert load failed", error.message);
    return {
      ok: true,
      data: ((data ?? []) as Array<Record<string, string>>).map((r) => ({
        alertKey: r.alert_key,
        severity: r.severity,
        condition: r.condition_text,
      })),
    };
  } catch (e) {
    return persistError("Alert load failed", String(e));
  }
}

// ---------------------------------------------------------
// Thread assembly, observed → recommended → approved → happened.
// ---------------------------------------------------------

function buildThread(
  action: ActionRow,
  approvals: ApprovalRow[],
): ActionThread {
  const approval = approvals.find((a) => a.action_id === action.id) ?? null;
  const result = action.execution_result
    ? (sanitizeAuditValue(action.execution_result) as {
        outcome?: string;
        summary?: string;
        failureReason?: string;
      })
    : null;

  const observed = action.why
    ? `Grounded in recorded project data: ${action.why}`
    : null;
  const recommended =
    action.recommendation_summary ??
    (action.what ? `Prepared action: ${action.what}` : null);

  let approved: string | null = null;
  if (approval) {
    approved =
      approval.state === "approved"
        ? `The user approved this action${approval.decided_at ? ` on ${approval.decided_at.split("T")[0]}` : ""}.`
        : `The user's decision was "${approval.state}"${approval.decided_at ? ` on ${approval.decided_at.split("T")[0]}` : ""}.`;
  }

  let happened: string | null = null;
  if (result?.outcome === "succeeded") {
    happened = `Executed: ${result.summary ?? action.what}${action.verified_at ? `, verified in recorded state on ${action.verified_at.split("T")[0]}.` : ", verification not recorded."}`;
  } else if (result?.outcome) {
    happened = `Execution ${result.outcome}${result.failureReason ? `: ${result.failureReason}` : ""}.`;
  } else if (action.executed_at) {
    happened = `Execution was attempted on ${action.executed_at.split("T")[0]} but no result was recorded.`;
  }

  // The honest gap, the FIRST missing link in the chain.
  let gap: string | null = null;
  if (!approval) gap = "No approval decision is recorded for this action.";
  else if (approval.state === "approved" && !happened)
    gap = "The action was approved but no execution is recorded.";
  else if (
    approval.state === "approved" &&
    result?.outcome === "succeeded" &&
    !action.verified_at
  )
    gap = "Execution succeeded but was not verified in recorded state.";

  return {
    actionId: action.id,
    actionKind: action.kind,
    what: action.what,
    observed,
    recommended,
    approved,
    happened,
    gap,
  };
}

/** The plain-language thread, end to end. */
export function describeThread(t: ActionThread): string {
  const chain = [
    t.observed ? `Observed: ${t.observed}` : "Observed: not recorded",
    t.recommended
      ? `Recommended: ${t.recommended}`
      : "Recommended: not recorded",
    t.approved ? `Decision: ${t.approved}` : "Decision: not recorded",
    t.happened ? `Result: ${t.happened}` : "Result: not recorded",
  ];
  return chain.join(" → ").concat(t.gap ? ` (Note: ${t.gap})` : "");
}

// ---------------------------------------------------------
// The story.
// ---------------------------------------------------------

export async function getProjectStory(
  projectId: string,
  nowIso: string,
  limit = 200,
): Promise<AgentResult<ProjectStory>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const rows = await loadTrailRows(projectId, limit);
  if (!rows.ok) return rows;
  const alerts = await loadOpenAlerts(projectId);
  if (!alerts.ok) return alerts;

  const { activity, actions, approvals } = rows.data;

  const timeline: AuditEntry[] = activity.map((r) => ({
    id: r.id,
    at: r.created_at,
    projectId: r.project_id,
    user: r.created_by,
    kind: r.kind as AuditEntryKind,
    summary: r.summary,
    payload: r.payload
      ? (sanitizeAuditValue(r.payload) as Record<string, unknown>)
      : undefined,
  }));

  const threads = actions.map((a) => buildThread(a, approvals));

  const story: ProjectStory = {
    projectId,
    generatedAt: nowIso,
    timeline,
    threads,
    openAlerts: alerts.data,
    summary:
      `${timeline.length} recorded activity entr${timeline.length === 1 ? "y" : "ies"}, ` +
      `${threads.length} prepared action${threads.length === 1 ? "" : "s"}` +
      `${threads.length > 0 ? ` (${threads.filter((t) => t.gap === null).length} complete end-to-end)` : ""}` +
      `${alerts.data.length > 0 ? `, ${alerts.data.length} open alert${alerts.data.length === 1 ? "" : "s"}` : ""}.`,
  };

  return { ok: true, data: story };
}

// ---------------------------------------------------------
// Audited memory, fact writes become part of the trail.
// ---------------------------------------------------------

/** Record a project memory fact AND an audit entry for it, memory
 *  changes are never invisible to the trail. */
export async function recordAuditedFact(
  projectId: string,
  fact: AgentFact,
  nowIso: string,
): Promise<
  AgentResult<{ factKey: string; dataClass: AgentFact["dataClass"] }>
> {
  const written = await recordFact(projectId, fact, nowIso);
  if (!written.ok) return written;

  await recordActivity(
    projectId,
    {
      kind: "observation",
      state: "observed",
      summary: `Project memory updated: fact "${fact.key}" recorded as ${fact.dataClass} (source: ${fact.source}).`,
      payload: sanitizeAuditValue({
        factKey: fact.key,
        dataClass: fact.dataClass,
        source: fact.source,
        value: fact.value,
      }),
    },
    nowIso,
  );

  return {
    ok: true,
    data: { factKey: fact.key, dataClass: fact.dataClass },
  };
}
