/**
 * Recovery for executions that stopped halfway.
 *
 * An action moved to `executed` records that the write began. If the process
 * doing it died, nothing ever records a result, and the row sits in `executed`
 * for good. It is not stuck in the sense of blocking other work, and the next
 * run refuses rather than double-writing, but nobody resolves it either.
 *
 * The sweep below resolves those rows to `failed`. It does not pretend to know
 * whether the write landed: nobody recorded that. Marking the action failed is
 * the honest state, and a fresh action can then be prepared.
 */
import { supabase } from "@/lib/supabase";
import { canTransition, type AgentLifecycleState } from "./states";

/**
 * How long an action may sit in `executed` before the sweep treats it as
 * interrupted. Half an hour is far longer than any write this system performs,
 * so a slow but healthy execution is never swept.
 */
export const INTERRUPTED_EXECUTION_AFTER_MS = 30 * 60 * 1000;

export interface RecoverableAction {
  id: string;
  state: string;
  executed_at: string | null;
  updated_at: string | null;
}

export interface RecoveryDecision {
  id: string;
  decision: "fail" | "keep";
  reason: string;
}

function minutesBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / 60000);
}

/**
 * Decide, without touching the database, which actions to resolve.
 *
 * A row with no usable timestamp is kept: guessing which rows were interrupted
 * from missing data would create exactly the kind of invented state this module
 * exists to remove.
 */
export function planInterruptedExecution(
  actions: readonly RecoverableAction[],
  nowIso: string,
  windowMs: number = INTERRUPTED_EXECUTION_AFTER_MS,
): RecoveryDecision[] {
  const now = Date.parse(nowIso);
  return actions.map((action) => {
    if (action.state !== "executed") {
      return {
        id: action.id,
        decision: "keep" as const,
        reason: `State '${action.state}' is not an execution in progress.`,
      };
    }
    const stamp = action.executed_at ?? action.updated_at;
    const at = stamp ? Date.parse(stamp) : NaN;
    if (!Number.isFinite(at) || !Number.isFinite(now)) {
      return {
        id: action.id,
        decision: "keep" as const,
        reason: "No usable timestamp, so the sweep refuses to guess.",
      };
    }
    if (now - at < windowMs) {
      return {
        id: action.id,
        decision: "keep" as const,
        reason: "Still inside the execution window.",
      };
    }
    return {
      id: action.id,
      decision: "fail" as const,
      reason:
        `Execution started ${minutesBetween(at, now)} minutes ago and nothing ` +
        "recorded a result. Whether the write landed is not known, so the action " +
        "is marked failed rather than assumed done. Check the record before " +
        "preparing a replacement.",
    };
  });
}

export interface RecoveryReport {
  checked: number;
  failed: number;
  kept: number;
  decisions: RecoveryDecision[];
  /** Present when the sweep could not read or write; the counts stay honest. */
  error?: string;
}

/**
 * Run the sweep. Every write is guarded on the row still being in `executed`,
 * so a run that overlaps a live execution cannot overwrite a real result.
 */
export async function recoverInterruptedExecutions(
  nowIso: string = new Date().toISOString(),
  windowMs: number = INTERRUPTED_EXECUTION_AFTER_MS,
): Promise<RecoveryReport> {
  const empty: RecoveryReport = {
    checked: 0,
    failed: 0,
    kept: 0,
    decisions: [],
  };

  let rows: RecoverableAction[] = [];
  try {
    const { data, error } = (await supabase
      .from("project_agent_actions")
      .select("id, state, executed_at, updated_at")
      .eq("state", "executed")
      .order("updated_at", { ascending: true })
      .limit(500)) as {
      data: RecoverableAction[] | null;
      error: { message?: string } | null;
    };
    if (error) {
      return { ...empty, error: error.message ?? "read failed" };
    }
    rows = data ?? [];
  } catch (e) {
    return { ...empty, error: String(e) };
  }

  const decisions = planInterruptedExecution(rows, nowIso, windowMs);
  const toFail = decisions.filter((d) => d.decision === "fail");

  const transition = canTransition(
    "executed" as AgentLifecycleState,
    "failed" as AgentLifecycleState,
  );
  if (toFail.length > 0 && !transition.allowed) {
    return {
      checked: rows.length,
      failed: 0,
      kept: rows.length,
      decisions,
      error: `Lifecycle refuses executed to failed: ${transition.reason}`,
    };
  }

  let failed = 0;
  for (const entry of toFail) {
    try {
      const { data, error } = await supabase
        .from("project_agent_actions")
        .update({ state: "failed", updated_at: nowIso })
        .eq("id", entry.id)
        .eq("state", "executed")
        .select("id")
        .maybeSingle();
      if (!error && data) failed += 1;
    } catch {
      // A single failed write never hides the rest: the report counts what
      // actually changed.
      continue;
    }
  }

  return {
    checked: rows.length,
    failed,
    kept: rows.length - failed,
    decisions,
  };
}
