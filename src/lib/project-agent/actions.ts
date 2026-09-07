// =========================================================
// FRELUX PROJECT AGENT — PREPARED ACTIONS (Stage 6)
//
// The agent prepares actions WITHOUT committing them. A
// prepared action is intent only: what / why / data used /
// assumptions / expected result, plus an approval lifecycle
// (Approve / Edit / Reject / Cancel) on the Stage-1 state
// machine.
//
// Hard rules (Phase 6 honesty contract):
//   - Every prepared action is GROUNDED: it must reference a
//     recommendation that is re-derived FRESH at prepare time.
//     If recorded state has moved on, preparation is refused —
//     the agent never prepares from a stale screen.
//   - Params are VALIDATED against recorded state (RLS-scoped
//     reads). An action whose target no longer exists (item
//     purchased, stage completed, material gone) is refused.
//   - NOTHING here writes project data. The only writes are to
//     the agent's own tables (actions, approvals, activity).
//     Execution of approved actions is Stage 7's job.
//   - Approvals expire (15-minute window). A lapsed approval is
//     terminal: the user re-prepares a fresh action — no
//     resurrection, no guessing.
//   - Idempotency: duplicate submissions (same idempotency key)
//     collapse to the single existing action.
// =========================================================

import { supabase } from "@/lib/supabase";
import type {
  AgentApproval,
  AgentError,
  AgentResult,
  PreparedAction,
} from "./types";
import {
  APPROVAL_TTL_MS,
  applyTransition,
  canTransition,
  isApprovalActive,
  type AgentPermission,
} from "./states";
import { assertProjectVisible, recordActivity } from "./session";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import {
  buildRecommendations,
  type RecommendationCondition,
} from "./recommendations";

// =========================================================
// Action kinds — deterministic, traceable to real FRELUX writes
// (Stage 7 executes these payloads via the authoritative tools)
// =========================================================

export type PreparedActionKind =
  "record_purchase" | "confirm_stage_completion" | "update_material_price";

export interface RecordPurchaseParams {
  shoppingItemId: string;
  /** The actual price paid — optional; purchasing without a price is legal. */
  actualPrice?: number;
}

export interface ConfirmStageParams {
  stageId: string;
}

export interface UpdateMaterialPriceParams {
  materialId: string;
  newPrice: number;
  /** Provenance of the price (e.g. "user:market check"). */
  source?: string;
}

export type PreparedActionParams =
  RecordPurchaseParams | ConfirmStageParams | UpdateMaterialPriceParams;

/** Which recommendation conditions legitimately ground each
 *  kind. A mismatch is refused — no opportunistic actions. */
const KIND_CONDITIONS: Record<PreparedActionKind, RecommendationCondition[]> = {
  record_purchase: ["procurement_risk"],
  confirm_stage_completion: ["incomplete_task", "schedule_risk"],
  update_material_price: ["stale_market_data"],
};

interface KindSpec {
  label: string;
  permission: AgentPermission;
}

/** Every Stage-6 kind writes project data on execution → CONFIRM. */
const KIND_SPECS: Record<PreparedActionKind, KindSpec> = {
  record_purchase: { label: "Record a purchase", permission: "confirm" },
  confirm_stage_completion: {
    label: "Confirm a construction stage as completed",
    permission: "confirm",
  },
  update_material_price: {
    label: "Update a material price",
    permission: "confirm",
  },
};

export interface PrepareActionRequest {
  kind: PreparedActionKind;
  /** The recommendation (from a FRESH report) that grounds this action. */
  recommendationId: string;
  params: PreparedActionParams;
  /** Double-tap / retry collapse key. Same key → same action. */
  idempotencyKey: string;
  /** Extra, user-visible assumptions beyond the recommendation's own. */
  assumptions?: string[];
}

export interface PrepareActionResult {
  action: PreparedAction;
  /** True when an identical request was collapsed to the existing action. */
  duplicate: boolean;
}

// =========================================================
// DB row mapping (snake_case ⇄ camelCase)
// =========================================================

interface ActionRow {
  id: string;
  project_id: string;
  kind: PreparedActionKind;
  what: string;
  why: string;
  data_used: string[];
  assumptions: string[];
  expected_result: string;
  permission: AgentPermission;
  state: PreparedAction["state"];
  recommendation_id: string;
  recommendation_summary: string;
  payload: PreparedActionParams;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

interface ApprovalRow {
  id: string;
  action_id: string;
  state: AgentApproval["state"];
  requested_at: string;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  idempotency_key: string;
  created_at: string;
}

function rowToAction(row: ActionRow): PreparedAction {
  return {
    id: row.id,
    kind: row.kind,
    what: row.what,
    why: row.why,
    dataUsed: row.data_used ?? [],
    assumptions: row.assumptions ?? [],
    expectedResult: row.expected_result,
    permission: row.permission,
    approvalRequired: true,
    state: row.state,
    payload: { ...row.payload },
    recommendationId: row.recommendation_id,
    recommendationSummary: row.recommendation_summary,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToApproval(row: ApprovalRow): AgentApproval {
  return {
    id: row.id,
    actionId: row.action_id,
    state: row.state,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    decidedAt: row.decided_at ?? undefined,
    decidedBy: row.decided_by ?? undefined,
    idempotencyKey: row.idempotency_key,
  };
}

function actionToRow(
  projectId: string,
  action: PreparedAction,
): Record<string, unknown> {
  return {
    id: action.id,
    project_id: projectId,
    kind: action.kind,
    what: action.what,
    why: action.why,
    data_used: action.dataUsed,
    assumptions: action.assumptions,
    expected_result: action.expectedResult,
    permission: action.permission,
    state: action.state,
    recommendation_id: action.recommendationId,
    recommendation_summary: action.recommendationSummary,
    payload: action.payload,
    idempotency_key: action.idempotencyKey,
    created_at: action.createdAt,
    updated_at: action.updatedAt,
  };
}

// =========================================================
// Persistence helpers
// =========================================================

function persistError(step: string, message: string): AgentResult<never> {
  return {
    ok: false,
    error: { code: "persistence_error", message: `${step}: ${message}` },
  };
}

async function loadActionRow(
  actionId: string,
): Promise<AgentResult<ActionRow | null>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .select("*")
      .eq("id", actionId)
      .maybeSingle();
    if (error) return persistError("Action load failed", error.message);
    return { ok: true, data: (data as ActionRow | null) ?? null };
  } catch (e) {
    return persistError("Action load failed", String(e));
  }
}

async function loadApprovalsForAction(
  actionId: string,
): Promise<AgentResult<ApprovalRow[]>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_approvals")
      .select("*")
      .eq("action_id", actionId)
      .order("created_at", { ascending: false });
    if (error) return persistError("Approval load failed", error.message);
    return { ok: true, data: (data ?? []) as ApprovalRow[] };
  } catch (e) {
    return persistError("Approval load failed", String(e));
  }
}

async function persistActionState(
  action: PreparedAction,
  to: PreparedAction["state"],
  nowIso: string,
): Promise<AgentResult<PreparedAction>> {
  const check = applyTransition(action, to, nowIso);
  if (!check.ok)
    return {
      ok: false,
      error: { code: "invalid_state", message: check.reason },
    };
  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .update({ state: to, updated_at: nowIso })
      .eq("id", action.id)
      .select("*")
      .maybeSingle();
    if (error || !data)
      return persistError(
        "Action update failed",
        error?.message ?? "row not found",
      );
    return { ok: true, data: rowToAction(data as ActionRow) };
  } catch (e) {
    return persistError("Action update failed", String(e));
  }
}

/**
 * Lazy expiry: a pending approval past its window makes BOTH the
 * approval and the action terminal-expired. Terminal means
 * terminal — the user prepares a NEW action; nothing resurrects.
 */
async function applyLazyExpiry(
  action: PreparedAction,
  approvals: AgentApproval[],
  nowIso: string,
): Promise<{ action: PreparedAction; expired: boolean }> {
  const pending = approvals.find((a) => a.state === "pending");
  if (
    !pending ||
    isApprovalActive(
      { state: pending.state, expiresAt: pending.expiresAt },
      nowIso,
    )
  ) {
    return { action, expired: false };
  }
  try {
    await supabase
      .from("project_agent_approvals")
      .update({ state: "expired", decided_at: nowIso })
      .eq("id", pending.id);
  } catch {
    // Expiry is best-effort on the approval row; the action
    // state below is the authoritative guard.
  }
  const moved = await persistActionState(action, "expired", nowIso);
  return { action: moved.ok ? moved.data : action, expired: moved.ok };
}

// =========================================================
// Validation — params against FRESH recorded state
// =========================================================

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

interface ValidationSuccess {
  ok: true;
  data: {
    what: string;
    expectedResult: string;
    dataUsed: string[];
  };
}
type Validation = ValidationSuccess | { ok: false; error: AgentError };

/**
 * Stage 7 re-uses the SAME honesty bar before executing an
 * approved action: params are validated against FRESH recorded
 * state, and changed state means refusal — never a forced write.
 */
export async function validateActionParams(
  kind: PreparedActionKind,
  params: PreparedActionParams,
  snap: PredictiveProjectSnapshot,
): Promise<Validation> {
  return validateParams(kind, params, snap);
}

async function validateParams(
  kind: PreparedActionKind,
  params: PreparedActionParams,
  snap: PredictiveProjectSnapshot,
): Promise<Validation> {
  if (kind === "record_purchase") {
    const p = params as RecordPurchaseParams;
    if (!p?.shoppingItemId)
      return paramError("A recorded shopping item must be selected.");
    const item = snap.shoppingItems.find((i) => i.id === p.shoppingItemId);
    if (!item)
      return paramError(
        `Shopping item ${p.shoppingItemId} is not in the recorded shopping list.`,
      );
    if (item.is_purchased)
      return paramError(
        `"${item.name}" is already recorded as purchased — recorded state changed.`,
      );
    if (p.actualPrice != null && !isPositiveNumber(p.actualPrice))
      return paramError("Actual price must be a positive number (or omitted).");
    const pricePart =
      p.actualPrice != null ? ` with an actual price of ${p.actualPrice}` : "";
    const qtyPart = item.unit
      ? `quantity ${item.quantity} ${item.unit}`
      : `quantity ${item.quantity}`;
    return {
      ok: true,
      data: {
        what: `Mark "${item.name}" (${qtyPart}) as purchased${pricePart}.`,
        expectedResult: `"${item.name}" will be recorded as purchased${pricePart}; budget actuals, forecasts and procurement status update accordingly.`,
        dataUsed: [
          `shopping_item:${item.id}`,
          `shopping_item_recorded_price:${item.estimated_price}`,
        ],
      },
    };
  }

  if (kind === "confirm_stage_completion") {
    const p = params as ConfirmStageParams;
    if (!p?.stageId) return paramError("A recorded stage must be selected.");
    const stage = snap.stages.find((s) => s.id === p.stageId);
    if (!stage)
      return paramError(
        `Stage ${p.stageId} is not in the recorded project plan.`,
      );
    if (stage.isCompleted)
      return paramError(
        `"${stage.stageName}" is already recorded as completed — recorded state changed.`,
      );
    return {
      ok: true,
      data: {
        what: `Record the "${stage.stageName}" stage as completed.`,
        expectedResult: `"${stage.stageName}" will be marked completed with the confirmation date; project progress and schedule predictions update accordingly.`,
        dataUsed: [`stage:${stage.id}`, `stage_sort_order:${stage.sortOrder}`],
      },
    };
  }

  // update_material_price — the material catalog is authoritative
  // for the write (Stage 7), so existence is checked against it.
  const p = params as UpdateMaterialPriceParams;
  if (!p?.materialId) return paramError("A material must be selected.");
  if (!isPositiveNumber(p.newPrice))
    return paramError("The new price must be a positive number.");
  try {
    const { data, error } = await supabase
      .from("material_catalog")
      .select("id, name, current_price")
      .eq("id", p.materialId)
      .maybeSingle();
    if (error) return persistError("Material lookup failed", error.message);
    if (!data)
      return paramError(
        `Material ${p.materialId} is not in the material catalog.`,
      );
    const mat = data as {
      id: string;
      name: string;
      current_price: number | null;
    };
    return {
      ok: true,
      data: {
        what: `Update the price of "${mat.name}" to ${p.newPrice}${p.source ? ` (source: ${p.source})` : ""}.`,
        expectedResult: `"${mat.name}" current price becomes ${p.newPrice} (from ${mat.current_price ?? "unset"}); the change is recorded in price history${p.source ? ` with source "${p.source}"` : ""}.`,
        dataUsed: [
          `material:${mat.id}`,
          `material_recorded_price:${mat.current_price ?? "none"}`,
        ],
      },
    };
  } catch (e) {
    return persistError("Material lookup failed", String(e));
  }
}

function paramError(message: string): Validation {
  return { ok: false, error: { code: "invalid_params", message } };
}

// =========================================================
// prepareAction — the core of Stage 6
// =========================================================

export async function prepareAction(
  projectId: string,
  request: PrepareActionRequest,
  nowIso: string,
): Promise<AgentResult<PrepareActionResult>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  // Idempotency first: a duplicate submission collapses to the
  // existing action. No second insert, no state change.
  try {
    const { data: existing, error: existingError } = await supabase
      .from("project_agent_actions")
      .select("*")
      .eq("project_id", projectId)
      .eq("idempotency_key", request.idempotencyKey)
      .maybeSingle();
    if (existingError)
      return persistError("Idempotency check failed", existingError.message);
    if (existing)
      return {
        ok: true,
        data: { action: rowToAction(existing as ActionRow), duplicate: true },
      };
  } catch (e) {
    return persistError("Idempotency check failed", String(e));
  }

  // Ground the action in a FRESH recommendation — recorded state
  // now, not the state when the screen was rendered.
  const report = await buildRecommendations(projectId, nowIso);
  if (!report.ok) return report;
  const rec = report.data.recommendations.find(
    (r) => r.id === request.recommendationId,
  );
  if (!rec)
    return {
      ok: false,
      error: {
        code: "recommendation_not_found",
        message:
          `Recommendation "${request.recommendationId}" does not exist in the current ` +
          `recorded state. Recorded state may have changed — refresh and try again.`,
      },
    };
  if (!KIND_CONDITIONS[request.kind].includes(rec.condition))
    return {
      ok: false,
      error: {
        code: "kind_mismatch",
        message:
          `A "${request.kind}" action is not supported by recommendation ` +
          `"${rec.id}" (condition: ${rec.condition}). The action must match its evidence.`,
      },
    };

  // Validate params against the FRESH snapshot.
  const snap = await buildProjectSnapshot(projectId, { now: nowIso });
  if (!snap)
    return {
      ok: false,
      error: {
        code: "insufficient_data",
        message:
          "No recorded project data is available to validate this action against.",
      },
    };
  const validation = await validateParams(request.kind, request.params, snap);
  if (!validation.ok) return validation;

  const spec = KIND_SPECS[request.kind];
  const action: PreparedAction = {
    id: crypto.randomUUID(),
    kind: request.kind,
    what: validation.data.what,
    why: rec.recommendation,
    dataUsed: [
      `recommendation:${rec.id}`,
      `recommendation_source:${rec.source}`,
      ...validation.data.dataUsed,
    ],
    assumptions: [...rec.assumptions, ...(request.assumptions ?? [])],
    expectedResult: validation.data.expectedResult,
    permission: spec.permission,
    approvalRequired: true,
    state: "prepared",
    payload: { ...request.params },
    recommendationId: rec.id,
    recommendationSummary: rec.nextStep,
    idempotencyKey: request.idempotencyKey,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const { error } = await supabase
      .from("project_agent_actions")
      .insert(actionToRow(projectId, action));
    if (error) return persistError("Action insert failed", error.message);
  } catch (e) {
    return persistError("Action insert failed", String(e));
  }

  await recordActivity(
    projectId,
    {
      kind: "preparation",
      state: "prepared",
      summary: `Prepared action: ${action.what} (awaiting approval — nothing is committed).`,
      payload: { actionId: action.id, kind: action.kind },
    },
    nowIso,
  );

  return { ok: true, data: { action, duplicate: false } };
}

// =========================================================
// Approval lifecycle — request / decide / amend / cancel / list
// =========================================================

export async function requestApproval(
  projectId: string,
  actionId: string,
  nowIso: string,
): Promise<AgentResult<AgentApproval>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const row = await loadActionRow(actionId);
  if (!row.ok) return row;
  if (!row.data) return notFound("Prepared action not found.");
  const action = rowToAction(row.data);

  if (action.state !== "prepared")
    return {
      ok: false,
      error: {
        code: "invalid_state",
        message: `Action is '${action.state}' — approval can only be requested on a prepared action.`,
      },
    };

  // One pending approval per action: an identical request
  // returns the existing approval (idempotent).
  const approvals = await loadApprovalsForAction(actionId);
  if (!approvals.ok) return approvals;
  const existing = approvals.data.map(rowToApproval);
  const pending = existing.find((a) => a.state === "pending");
  if (pending) {
    if (
      isApprovalActive(
        { state: pending.state, expiresAt: pending.expiresAt },
        nowIso,
      )
    ) {
      // One pending approval per action — an identical request
      // returns the existing one (idempotent).
      return { ok: true, data: pending };
    }
    // Lapsed window: expire both records, require re-prepare.
    await applyLazyExpiry(action, existing, nowIso);
    return {
      ok: false,
      error: {
        code: "action_expired",
        message:
          "The approval window has lapsed. The prepared action is expired — prepare a fresh one.",
      },
    };
  }

  const approval: AgentApproval = {
    id: crypto.randomUUID(),
    actionId,
    state: "pending",
    requestedAt: nowIso,
    expiresAt: new Date(
      new Date(nowIso).getTime() + APPROVAL_TTL_MS,
    ).toISOString(),
    idempotencyKey: `approval:${actionId}`,
  };

  try {
    const { error } = await supabase.from("project_agent_approvals").insert({
      id: approval.id,
      action_id: approval.actionId,
      state: approval.state,
      requested_at: approval.requestedAt,
      expires_at: approval.expiresAt,
      idempotency_key: approval.idempotencyKey,
      created_at: nowIso,
    });
    if (error) return persistError("Approval insert failed", error.message);
  } catch (e) {
    return persistError("Approval insert failed", String(e));
  }

  await recordActivity(
    projectId,
    {
      kind: "approval_request",
      state: "prepared",
      summary: `Approval requested: ${action.what} (expires ${approval.expiresAt}).`,
      payload: { actionId, approvalId: approval.id },
    },
    nowIso,
  );

  return { ok: true, data: approval };
}

export type ApprovalDecision = "approved" | "rejected" | "cancelled";

export async function decideApproval(
  projectId: string,
  approvalId: string,
  decision: ApprovalDecision,
  nowIso: string,
): Promise<AgentResult<{ approval: AgentApproval; action: PreparedAction }>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  let approvalRow: ApprovalRow;
  try {
    const { data, error } = await supabase
      .from("project_agent_approvals")
      .select("*")
      .eq("id", approvalId)
      .maybeSingle();
    if (error) return persistError("Approval load failed", error.message);
    if (!data) return notFound("Approval not found.");
    approvalRow = data as ApprovalRow;
  } catch (e) {
    return persistError("Approval load failed", String(e));
  }
  const approval = rowToApproval(approvalRow);

  const actionRow = await loadActionRow(approval.actionId);
  if (!actionRow.ok) return actionRow;
  if (!actionRow.data) return notFound("Prepared action not found.");
  const action = rowToAction(actionRow.data);

  if (approval.state !== "pending")
    return {
      ok: false,
      error: {
        code: "invalid_state",
        message: `Approval is already '${approval.state}' — decisions are final and recorded.`,
      },
    };

  // Expired window → both records expire. Terminal, no resurrection.
  if (
    !isApprovalActive(
      { state: approval.state, expiresAt: approval.expiresAt },
      nowIso,
    )
  ) {
    try {
      await supabase
        .from("project_agent_approvals")
        .update({ state: "expired", decided_at: nowIso })
        .eq("id", approval.id);
    } catch {
      // best-effort — the action state below is authoritative
    }
    await persistActionState(action, "expired", nowIso);
    return {
      ok: false,
      error: {
        code: "action_expired",
        message:
          "The approval window has lapsed. This action is expired — prepare a fresh one.",
      },
    };
  }

  // Apply the decision on the state machine.
  const target: PreparedAction["state"] =
    decision === "approved"
      ? "approved"
      : decision === "rejected"
        ? "rejected"
        : "cancelled";
  const check = canTransition(action.state, target);
  if (!check.allowed)
    return {
      ok: false,
      error: { code: "invalid_state", message: check.reason },
    };

  try {
    const { error: approvalError } = await supabase
      .from("project_agent_approvals")
      .update({
        state: decision,
        decided_at: nowIso,
      })
      .eq("id", approval.id);
    if (approvalError)
      return persistError("Approval update failed", approvalError.message);
  } catch (e) {
    return persistError("Approval update failed", String(e));
  }

  const moved = await persistActionState(action, target, nowIso);
  if (!moved.ok) return moved;

  await recordActivity(
    projectId,
    {
      kind: "approval_decision",
      state: target,
      summary:
        decision === "approved"
          ? `Approved: ${action.what}. ${moved.data.expectedResult}`
          : decision === "rejected"
            ? `Rejected: ${action.what}. Nothing was changed.`
            : `Cancelled: ${action.what}. Nothing was changed.`,
      payload: {
        actionId: action.id,
        approvalId: approval.id,
        decision,
      },
    },
    nowIso,
  );

  return {
    ok: true,
    data: {
      approval: { ...approval, state: decision, decidedAt: nowIso },
      action: moved.data,
    },
  };
}

/** Cancel a prepared action directly (user abandons it). */
export async function cancelAction(
  projectId: string,
  actionId: string,
  nowIso: string,
): Promise<AgentResult<PreparedAction>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const row = await loadActionRow(actionId);
  if (!row.ok) return row;
  if (!row.data) return notFound("Prepared action not found.");
  const action = rowToAction(row.data);

  // Cancel any pending approval alongside the action.
  const approvals = await loadApprovalsForAction(actionId);
  if (approvals.ok) {
    const pending = approvals.data.find((a) => a.state === "pending");
    if (pending) {
      try {
        await supabase
          .from("project_agent_approvals")
          .update({ state: "cancelled", decided_at: nowIso })
          .eq("id", pending.id);
      } catch {
        // best-effort — action state below is authoritative
      }
    }
  }

  const moved = await persistActionState(action, "cancelled", nowIso);
  if (!moved.ok) return moved;

  await recordActivity(
    projectId,
    {
      kind: "approval_decision",
      state: "cancelled",
      summary: `Cancelled: ${action.what}. Nothing was changed.`,
      payload: { actionId, decision: "cancelled" },
    },
    nowIso,
  );
  return moved;
}

// =========================================================
// Edit — amend a still-prepared action, then re-validate
// =========================================================

export interface AmendActionRequest {
  params?: PreparedActionParams;
  /** Additional, user-visible assumptions (appended). */
  assumptions?: string[];
}

export async function amendPreparedAction(
  projectId: string,
  actionId: string,
  request: AmendActionRequest,
  nowIso: string,
): Promise<AgentResult<PreparedAction>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const row = await loadActionRow(actionId);
  if (!row.ok) return row;
  if (!row.data) return notFound("Prepared action not found.");
  const action = rowToAction(row.data);

  if (action.state !== "prepared")
    return {
      ok: false,
      error: {
        code: "invalid_state",
        message:
          `Action is '${action.state}' — only a prepared action can be edited. ` +
          `Terminal decisions (approved/rejected/cancelled/expired) are final.`,
      },
    };

  const nextParams =
    request.params ?? (action.payload as unknown as PreparedActionParams);
  const mergedAssumptions = request.assumptions?.length
    ? [...action.assumptions, ...request.assumptions]
    : action.assumptions;

  // Re-validate against FRESH recorded state — an edit must meet
  // the same honesty bar as the original preparation.
  const snap = await buildProjectSnapshot(projectId, { now: nowIso });
  if (!snap)
    return {
      ok: false,
      error: {
        code: "insufficient_data",
        message:
          "No recorded project data is available to validate this edit against.",
      },
    };
  const validation = await validateParams(
    action.kind as PreparedActionKind,
    nextParams,
    snap,
  );
  if (!validation.ok) return validation;

  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .update({
        payload: nextParams,
        what: validation.data.what,
        expected_result: validation.data.expectedResult,
        assumptions: mergedAssumptions,
        updated_at: nowIso,
      })
      .eq("id", actionId)
      .select("*")
      .maybeSingle();
    if (error || !data)
      return persistError(
        "Action update failed",
        error?.message ?? "row not found",
      );
    const updated = rowToAction(data as ActionRow);
    await recordActivity(
      projectId,
      {
        kind: "preparation",
        state: "prepared",
        summary: `Edited prepared action: ${updated.what} (still awaiting approval).`,
        payload: { actionId, edited: true },
      },
      nowIso,
    );
    return { ok: true, data: updated };
  } catch (e) {
    return persistError("Action update failed", String(e));
  }
}

// =========================================================
// List & display
// =========================================================

export interface PreparedActionWithApprovals {
  action: PreparedAction;
  approval: AgentApproval | null;
  /** Decisions the UI may offer RIGHT NOW (deterministic). */
  availableDecisions: ApprovalDecision[];
  /** What the user can do besides deciding (re-prepare, execute…). */
  note: string;
}

/** Deterministic decision surface for the UI. */
export function availableDecisions(
  action: PreparedAction,
  approval: AgentApproval | null,
  nowIso: string,
): { decisions: ApprovalDecision[]; note: string } {
  const active =
    approval &&
    approval.state === "pending" &&
    isApprovalActive(
      { state: approval.state, expiresAt: approval.expiresAt },
      nowIso,
    );
  if (action.state === "prepared" && active)
    return {
      decisions: ["approved", "rejected", "cancelled"],
      note: "Approval window open — Approve, Reject or Cancel. Editing is possible while prepared.",
    };
  if (action.state === "prepared")
    return {
      decisions: [],
      note: "Prepared — request approval, edit, or cancel it.",
    };
  if (action.state === "approved")
    return {
      decisions: [],
      note: "Approved — execution happens in Stage 7; nothing has been committed yet.",
    };
  return {
    decisions: [],
    note: `Action is '${action.state}' (terminal). Prepare a fresh action if still needed.`,
  };
}

export async function listPreparedActions(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<PreparedActionWithApprovals[]>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  let rows: ActionRow[];
  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return persistError("Action list failed", error.message);
    rows = (data ?? []) as ActionRow[];
  } catch (e) {
    return persistError("Action list failed", String(e));
  }

  const result: PreparedActionWithApprovals[] = [];
  for (const row of rows) {
    let action = rowToAction(row);
    const approvalsRes = await loadApprovalsForAction(row.id);
    const approvals = approvalsRes.ok
      ? approvalsRes.data.map(rowToApproval)
      : [];
    if (approvalsRes.ok) {
      const refreshed = await applyLazyExpiry(action, approvals, nowIso);
      action = refreshed.action;
    }
    const approval = approvals.find((a) => a.state === "pending") ?? null;
    const { decisions, note } = availableDecisions(action, approval, nowIso);
    result.push({ action, approval, availableDecisions: decisions, note });
  }
  return { ok: true, data: result };
}

/** The full, human-readable approval display for ONE action:
 *  what / why / data used / assumptions / expected result. */
export async function describePreparedAction(
  projectId: string,
  actionId: string,
  nowIso: string,
): Promise<AgentResult<PreparedActionWithApprovals & { display: string }>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const row = await loadActionRow(actionId);
  if (!row.ok) return row;
  if (!row.data) return notFound("Prepared action not found.");
  let action = rowToAction(row.data);

  const approvalsRes = await loadApprovalsForAction(actionId);
  const approvals = approvalsRes.ok ? approvalsRes.data.map(rowToApproval) : [];
  if (approvalsRes.ok) {
    const refreshed = await applyLazyExpiry(action, approvals, nowIso);
    action = refreshed.action;
  }
  const approval = approvals.find((a) => a.state === "pending") ?? null;
  const { decisions, note } = availableDecisions(action, approval, nowIso);

  const lines = [
    `WHAT: ${action.what}`,
    `WHY: ${action.why}`,
    `DATA USED: ${action.dataUsed.join("; ")}`,
    `ASSUMPTIONS: ${action.assumptions.length ? action.assumptions.join("; ") : "none"}`,
    `EXPECTED RESULT: ${action.expectedResult}`,
    `RECOMMENDATION: ${action.recommendationId} — ${action.recommendationSummary}`,
    `STATE: ${action.state}${approval ? ` (approval ${approval.state}, expires ${approval.expiresAt})` : ""}`,
    `NOTE: ${note}`,
  ];
  return {
    ok: true,
    data: {
      action,
      approval,
      availableDecisions: decisions,
      note,
      display: lines.join("\n"),
    },
  };
}

function notFound(message: string): AgentResult<never> {
  return { ok: false, error: { code: "not_found", message } };
}
