// =========================================================
// FRELUX PROJECT AGENT, ACTION EXECUTION (Phase 6, Stage 7)
//
// The ONLY layer that writes project data tables. Everything
// before this (Stage 6) was intent; this stage makes it real.
//
// Honesty rules, all enforced:
//   - Only an APPROVED action with an APPROVED, in-window
//     approval may execute, exactly once. Terminal is terminal.
//   - State is re-derived FRESH and params re-validated before
//     the write. If the recorded world changed since approval,
//     the action is CANCELLED with the honest reason, never a
//     guess, never a forced write.
//   - The write goes through the authoritative FRELUX table with
//     RLS as the final authority. A policy rejection (e.g. a
//     non-admin touching the global material catalog) is a
//     FAILED execution with the honest reason recorded.
//   - After the write, the target row is re-read and VERIFIED.
//     Verified = the change is confirmed in recorded state;
//     failed = the write did not stick.
//   - Every execution attempt is audited: activity entries
//     (execution + verification) and an execution_result payload
//     (what was written, when, with what outcome and reason).
// =========================================================

import { supabase } from "@/lib/supabase";
import type { AgentResult } from "./types";
import type { AgentLifecycleState } from "./states";
import { canTransition, isApprovalActive } from "./states";
import { assertProjectVisible, recordActivity } from "./session";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import type { PreparedAction } from "./types";
import {
  KIND_SPECS,
  validateActionParams,
  type PreparedActionKind,
  type PreparedActionParams,
} from "./actions";

/** Audit record persisted with the action (execution_result column). */
export interface ActionExecutionResult {
  outcome: "verified" | "failed";
  /** When the write was attempted. */
  attemptedAt: string;
  /** Present only when verification confirmed the change. */
  verifiedAt?: string;
  /** What was written, in plain language. */
  summary: string;
  /** Project data tables this execution wrote (audit trail). */
  writtenTables: string[];
  /** Present only on failure, the honest reason. */
  failureReason?: string;
  /** Present when an ancillary write (e.g. price history) failed
   *  after the authoritative write succeeded. */
  note?: string;
}

export interface ExecutionOutcome {
  action: PreparedAction;
  execution: ActionExecutionResult;
  /** True when the action was already executed/verified, no new write. */
  duplicate: boolean;
}

/** An approved action as persisted, including Stage-7 audit columns. */
interface ExecutableActionRow {
  id: string;
  project_id: string;
  kind: PreparedActionKind;
  what: string;
  state: AgentLifecycleState;
  payload: PreparedActionParams;
  execution_result?: ActionExecutionResult | null;
  idempotency_key: string;
}

interface ApprovalRow {
  id: string;
  action_id: string;
  state: string;
  expires_at: string;
}

function persistError(step: string, message: string): AgentResult<never> {
  return {
    ok: false,
    error: { code: "persistence_error", message: `${step}: ${message}` },
  };
}

function notFound(message: string): AgentResult<never> {
  return { ok: false, error: { code: "not_found", message } };
}

function invalidState(message: string): AgentResult<never> {
  return { ok: false, error: { code: "invalid_state", message } };
}

// ---------------------------------------------------------
// Loading helpers (RLS-scoped, same patterns as Stage 6)
// ---------------------------------------------------------

async function loadActionRow(
  actionId: string,
): Promise<AgentResult<ExecutableActionRow | null>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .select("*")
      .eq("id", actionId)
      .maybeSingle();
    if (error) return persistError("Action load failed", error.message);
    return { ok: true, data: (data as ExecutableActionRow | null) ?? null };
  } catch (e) {
    return persistError("Action load failed", String(e));
  }
}

async function loadApprovals(
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

/** Persist a terminal execution state with the full audit payload. */
async function persistExecutionState(
  action: ExecutableActionRow,
  to: "verified" | "failed" | "cancelled" | "expired",
  nowIso: string,
  execution: ActionExecutionResult | null,
): Promise<AgentResult<true>> {
  // The machine is the authority: executed → verified|failed. For
  // write failures the intermediate 'executed' (attempt began) is
  // validated then collapsed into the persisted terminal state.
  if (to === "verified" || to === "failed") {
    const viaExecuted = canTransition(action.state, "executed");
    if (!viaExecuted.allowed) return invalidState(viaExecuted.reason);
    const final = canTransition("executed", to);
    if (!final.allowed) return invalidState(final.reason);
  } else {
    const check = canTransition(action.state, to);
    if (!check.allowed) return invalidState(check.reason);
  }
  const update: Record<string, unknown> = {
    state: to,
    updated_at: nowIso,
  };
  if (execution) {
    update.execution_result = execution;
    update.executed_at = execution.attemptedAt;
    if (execution.verifiedAt) update.verified_at = execution.verifiedAt;
  }
  try {
    const { data, error } = await supabase
      .from("project_agent_actions")
      .update(update)
      .eq("id", action.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return persistError(
        "Action update failed",
        error?.message ?? "row not found",
      );
    return { ok: true, data: true as const };
  } catch (e) {
    return persistError("Action update failed", String(e));
  }
}

// ---------------------------------------------------------
// Authoritative writes, one function per kind.
// Every write returns the affected row so the caller can verify
// the change actually stuck.
// ---------------------------------------------------------

interface WriteOutcome {
  writtenTable: string;
  affectedRow: Record<string, unknown>;
  summary: string;
  /** Ancillary-write gap, honestly reported (e.g. history insert failed). */
  note?: string;
}

async function writePurchase(
  params: { shoppingItemId: string; actualPrice?: number },
  nowIso: string,
): Promise<AgentResult<WriteOutcome>> {
  const update: Record<string, unknown> = {
    is_purchased: true,
    updated_at: nowIso,
  };
  if (params.actualPrice != null) update.actual_price = params.actualPrice;
  try {
    const { data, error } = await supabase
      .from("project_shopping_list")
      .update(update)
      .eq("id", params.shoppingItemId)
      .select("*")
      .maybeSingle();
    if (error) return persistError("Purchase write failed", error.message);
    if (!data)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message:
            "The purchase could not be recorded, the shopping item is no longer writable to this account (permissions or recent deletion).",
        },
      };
    const row = data as Record<string, unknown>;
    return {
      ok: true,
      data: {
        writtenTable: "project_shopping_list",
        affectedRow: row,
        summary: `Recorded "${row.name}" as purchased.`,
      },
    };
  } catch (e) {
    return persistError("Purchase write failed", String(e));
  }
}

async function writeStageCompletion(
  params: { stageId: string },
  nowIso: string,
): Promise<AgentResult<WriteOutcome>> {
  try {
    const { data, error } = await supabase
      .from("project_progress_stages")
      .update({
        is_completed: true,
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", params.stageId)
      .select("*")
      .maybeSingle();
    if (error) return persistError("Stage write failed", error.message);
    if (!data)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message:
            "The stage could not be updated, it is no longer writable to this account (permissions or recent deletion).",
        },
      };
    const row = data as Record<string, unknown>;
    return {
      ok: true,
      data: {
        writtenTable: "project_progress_stages",
        affectedRow: row,
        summary: `Recorded the "${row.stage_name}" stage as completed.`,
      },
    };
  } catch (e) {
    return persistError("Stage write failed", String(e));
  }
}

/**
 * Material prices live in the GLOBAL material catalog, whose RLS
 * is admin-only. The catalog update is authoritative and happens
 * first; the price-history insert (audit trail) is second. If the
 * history write fails after the catalog changed, the execution
 * still reports success, with an honest note about the gap.
 */
async function writeMaterialPrice(
  params: { materialId: string; newPrice: number; source?: string },
  nowIso: string,
): Promise<AgentResult<WriteOutcome>> {
  interface MaterialBefore {
    id: string;
    name: string;
    category: string | null;
    unit: string | null;
    current_price: number | null;
  }
  let before: MaterialBefore | null = null;
  try {
    const { data: existing, error: readError } = await supabase
      .from("material_catalog")
      .select("id, name, category, unit, current_price")
      .eq("id", params.materialId)
      .maybeSingle();
    if (readError)
      return persistError("Material load failed", readError.message);
    before = (existing as MaterialBefore) ?? null;
  } catch (e) {
    return persistError("Material load failed", String(e));
  }
  if (!before)
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message:
          "The material is no longer in the catalog, it may have been removed.",
      },
    };

  const priceSource = params.source ?? "agent:approved action";
  try {
    const { data, error } = await supabase
      .from("material_catalog")
      .update({
        current_price: params.newPrice,
        previous_price: before.current_price,
        price_updated_at: nowIso,
        price_source: priceSource,
      })
      .eq("id", params.materialId)
      .select("*")
      .maybeSingle();
    if (error)
      return persistError("Material price write failed", error.message);
    if (!data)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message:
            "The price could not be updated, the material catalog is admin-only and this account does not have admin permissions.",
        },
      };
  } catch (e) {
    return persistError("Material price write failed", String(e));
  }

  // Audit trail, best effort, honestly reported on failure.
  let note: string | undefined;
  try {
    const { error: histError } = await supabase
      .from("material_price_history")
      .insert({
        material_id: before.id,
        material_name: before.name,
        category: before.category ?? "uncategorised",
        old_price: before.current_price,
        new_price: params.newPrice,
        unit: before.unit,
        price_source: priceSource,
        change_reason: "Executed from an approved project-agent action.",
      });
    if (histError)
      note = `Price updated, but the price-history record could not be written: ${histError.message}`;
  } catch (e) {
    note = `Price updated, but the price-history record could not be written: ${String(e)}`;
  }

  return {
    ok: true,
    data: {
      writtenTable: "material_catalog",
      affectedRow: { id: before.id, current_price: params.newPrice },
      summary: `Updated the price of "${before.name}" to ${params.newPrice} (from ${before.current_price ?? "unset"}).`,
      note,
    },
  };
}

// ---------------------------------------------------------
// Verification, re-read recorded state and confirm.
// ---------------------------------------------------------

async function verifyPurchase(
  shoppingItemId: string,
  actualPrice: number | undefined,
): Promise<{ verified: boolean; reason?: string }> {
  const { data } = await supabase
    .from("project_shopping_list")
    .select("id, is_purchased, actual_price")
    .eq("id", shoppingItemId)
    .maybeSingle();
  const row = data as {
    is_purchased: boolean;
    actual_price: number | null;
  } | null;
  if (!row)
    return {
      verified: false,
      reason: "The shopping item disappeared from the recorded list.",
    };
  if (!row.is_purchased)
    return { verified: false, reason: "The purchase flag did not persist." };
  if (actualPrice != null && row.actual_price !== actualPrice)
    return {
      verified: false,
      reason: "The recorded actual price did not persist.",
    };
  return { verified: true };
}

async function verifyStage(
  stageId: string,
): Promise<{ verified: boolean; reason?: string }> {
  const { data } = await supabase
    .from("project_progress_stages")
    .select("id, is_completed, completed_at")
    .eq("id", stageId)
    .maybeSingle();
  const row = data as {
    is_completed: boolean;
    completed_at: string | null;
  } | null;
  if (!row)
    return {
      verified: false,
      reason: "The stage disappeared from the recorded plan.",
    };
  if (!row.is_completed || !row.completed_at)
    return { verified: false, reason: "The completion flag did not persist." };
  return { verified: true };
}

async function verifyMaterialPrice(
  materialId: string,
  newPrice: number,
): Promise<{ verified: boolean; reason?: string }> {
  const { data } = await supabase
    .from("material_catalog")
    .select("id, current_price")
    .eq("id", materialId)
    .maybeSingle();
  const row = data as { current_price: number | null } | null;
  if (!row)
    return {
      verified: false,
      reason: "The material disappeared from the catalog.",
    };
  if (row.current_price !== newPrice)
    return { verified: false, reason: "The new price did not persist." };
  return { verified: true };
}

// ---------------------------------------------------------
// executeApprovedAction, the only entry point.
// ---------------------------------------------------------

export async function executeApprovedAction(
  projectId: string,
  actionId: string,
  nowIso: string,
): Promise<AgentResult<ExecutionOutcome>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const actionRow = await loadActionRow(actionId);
  if (!actionRow.ok) return actionRow;
  if (!actionRow.data) return notFound("Prepared action not found.");
  const action = actionRow.data;
  if (action.project_id !== projectId)
    return notFound("The action belongs to a different project.");

  // ---- Idempotency: an already-executed action never re-executes.
  if (action.state === "verified" || action.state === "executed") {
    if (action.execution_result)
      return {
        ok: true,
        data: {
          action: action as unknown as PreparedAction,
          execution: action.execution_result,
          duplicate: true,
        },
      };
    return invalidState(
      `The action is '${action.state}' but carries no execution record, its state is inconsistent. Prepare a new action.`,
    );
  }

  // ---- Only approved actions execute. Terminal is terminal.
  if (action.state !== "approved")
    return invalidState(
      `The action is '${action.state}', only approved actions execute, and decisions are final. Prepare a new action instead.`,
    );

  const approvals = await loadApprovals(actionId);
  if (!approvals.ok) return approvals;
  const approved = approvals.data.find((a) => a.state === "approved");
  if (!approved)
    return invalidState(
      "No approved approval backs this action, it cannot execute.",
    );

  // ---- Lazy expiry: an approved approval past its window is
  // terminal for BOTH records. Re-prepare; nothing resurrects.
  if (
    !isApprovalActive(
      { state: approved.state, expiresAt: approved.expires_at },
      nowIso,
    )
  ) {
    try {
      await supabase
        .from("project_agent_approvals")
        .update({ state: "expired", decided_at: nowIso })
        .eq("id", approved.id);
    } catch {
      // Best-effort on the approval row; the action state below is
      // the authoritative guard.
    }
    const expired = await persistExecutionState(
      action,
      "expired",
      nowIso,
      null,
    );
    if (!expired.ok) return expired;
    await recordActivity(
      projectId,
      {
        kind: "error",
        state: "expired",
        summary: `Execution refused: the approval window for "${action.what}" lapsed. Re-prepare the action.`,
      },
      nowIso,
    );
    return {
      ok: false,
      error: {
        code: "action_expired",
        message:
          "The approval window lapsed before execution, the action has expired. Prepare a new one.",
      },
    };
  }

  // ---- Pre-flight: re-derive the recorded world FRESH and
  // re-validate. If the world changed, cancel honestly, never
  // execute against stale assumptions.
  let snap: PredictiveProjectSnapshot | null;
  try {
    snap = await buildProjectSnapshot(projectId, { now: nowIso });
  } catch (e) {
    return persistError("Snapshot re-derivation failed", String(e));
  }
  if (!snap) {
    const reason =
      "The recorded project state could not be read to verify the world before writing.";
    const cancelled = await persistExecutionState(action, "cancelled", nowIso, {
      outcome: "failed",
      attemptedAt: nowIso,
      summary: "Execution refused, recorded state unreadable.",
      writtenTables: [],
      failureReason: reason,
    });
    if (!cancelled.ok) return cancelled;
    await recordActivity(
      projectId,
      {
        kind: "error",
        state: "cancelled",
        summary: `Execution of "${action.what}" was cancelled, ${reason}`,
      },
      nowIso,
    );
    return invalidState(
      `${reason} The action was cancelled, nothing was written.`,
    );
  }
  const validation = await validateActionParams(
    action.kind,
    action.payload,
    snap,
  );
  if (!validation.ok) {
    const reason = `Recorded state changed since approval: ${validation.error.message}`;
    const cancelled = await persistExecutionState(action, "cancelled", nowIso, {
      outcome: "failed",
      attemptedAt: nowIso,
      summary: "Execution refused before any write.",
      writtenTables: [],
      failureReason: reason,
    });
    if (!cancelled.ok) return cancelled;
    await recordActivity(
      projectId,
      {
        kind: "error",
        state: "cancelled",
        summary: `Execution of "${action.what}" was cancelled, ${reason}`,
      },
      nowIso,
    );
    return invalidState(
      `${reason} The action was cancelled, prepare a new one against the current recorded state.`,
    );
  }

  // ---- The authoritative write (RLS is the final authority).
  const write = await performWrite(action, nowIso);
  if (!write.ok) {
    const execution: ActionExecutionResult = {
      outcome: "failed",
      attemptedAt: nowIso,
      summary: "Execution attempted; the write did not complete.",
      writtenTables: [],
      failureReason: write.error.message,
    };
    const failed = await persistExecutionState(
      action,
      "failed",
      nowIso,
      execution,
    );
    if (!failed.ok) return failed;
    await recordActivity(
      projectId,
      {
        kind: "execution",
        state: "failed",
        summary: `Execution of "${action.what}" failed, ${write.error.message}`,
        payload: { failureReason: write.error.message },
      },
      nowIso,
    );
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `${write.error.message} The action is marked failed, prepare a new one.`,
      },
    };
  }
  const written = write.data;

  // ---- Verify: re-read recorded state. Only a confirmed change
  // is a verified execution.
  const check = await verifyWrite(action);
  const execution: ActionExecutionResult = check.verified
    ? {
        outcome: "verified",
        attemptedAt: nowIso,
        verifiedAt: nowIso,
        summary: written.summary,
        writtenTables: [written.writtenTable],
        note: written.note,
      }
    : {
        outcome: "failed",
        attemptedAt: nowIso,
        summary:
          "The write reported success but the change is not in recorded state.",
        writtenTables: [],
        failureReason:
          check.reason ?? "Verification could not confirm the change.",
      };

  const terminal = check.verified ? "verified" : "failed";
  const persisted = await persistExecutionState(
    action,
    terminal,
    nowIso,
    execution,
  );
  if (!persisted.ok) return persisted;

  await recordActivity(
    projectId,
    {
      kind: "execution",
      state: "executed",
      summary: `Executed approved action: ${written.summary}`,
      payload: { writtenTable: written.writtenTable },
    },
    nowIso,
  );
  await recordActivity(
    projectId,
    {
      kind: "verification",
      state: check.verified ? "verified" : "failed",
      summary: check.verified
        ? `Verified in recorded state: ${written.summary}`
        : `Verification failed: ${execution.failureReason}`,
    },
    nowIso,
  );

  if (!check.verified)
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `${execution.failureReason} The action is marked failed.`,
      },
    };

  return {
    ok: true,
    data: {
      action: { ...action, state: "verified" } as unknown as PreparedAction,
      execution,
      duplicate: false,
    },
  };
}

async function performWrite(
  action: ExecutableActionRow,
  nowIso: string,
): Promise<AgentResult<WriteOutcome>> {
  // Stage 12, defensive: only registered kinds can ever reach
  // execution (prepareAction validates at creation), but a
  // corrupted row is refused cleanly, never dispatched by fallthrough.
  if (!(action.kind in KIND_SPECS))
    return invalidState(
      `Refusing to execute unregistered action kind "${String(action.kind)}".`,
    );
  switch (action.kind) {
    case "record_purchase": {
      const p = action.payload as {
        shoppingItemId: string;
        actualPrice?: number;
      };
      return writePurchase(p, nowIso);
    }
    case "confirm_stage_completion": {
      const p = action.payload as { stageId: string };
      return writeStageCompletion(p, nowIso);
    }
    case "update_material_price": {
      const p = action.payload as {
        materialId: string;
        newPrice: number;
        source?: string;
      };
      return writeMaterialPrice(p, nowIso);
    }
  }
}

async function verifyWrite(
  action: ExecutableActionRow,
): Promise<{ verified: boolean; reason?: string }> {
  switch (action.kind) {
    case "record_purchase": {
      const p = action.payload as {
        shoppingItemId: string;
        actualPrice?: number;
      };
      return verifyPurchase(p.shoppingItemId, p.actualPrice);
    }
    case "confirm_stage_completion": {
      const p = action.payload as { stageId: string };
      return verifyStage(p.stageId);
    }
    case "update_material_price": {
      const p = action.payload as { materialId: string; newPrice: number };
      return verifyMaterialPrice(p.materialId, p.newPrice);
    }
  }
}
