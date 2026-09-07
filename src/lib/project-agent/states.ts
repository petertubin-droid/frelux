// =========================================================
// FRELUX PROJECT AGENT — LIFECYCLE STATE MACHINE (Stage 1)
//
// Observed → Analyzed → Recommended → Prepared → Approved →
// Executed → Verified — plus terminal exits (rejected, cancelled,
// failed, expired). Every transition is explicit and validated;
// an invalid transition is rejected with a reason, never coerced.
// =========================================================

export type AgentLifecycleState =
  | "observed"
  | "analyzed"
  | "recommended"
  | "prepared"
  | "approved"
  | "executed"
  | "verified"
  | "rejected"
  | "cancelled"
  | "failed"
  | "expired";

export const LIFECYCLE_SEQUENCE: readonly AgentLifecycleState[] = [
  "observed",
  "analyzed",
  "recommended",
  "prepared",
  "approved",
  "executed",
  "verified",
] as const;

/** Permission levels for agent operations (Stage 7 enforces; the
 *  taxonomy is fixed here so every action carries its level from
 *  birth — never inferred later). */
export type AgentPermission = "read" | "prepare" | "confirm" | "prohibited";

export const PERMISSION_LABELS: Record<AgentPermission, string> = {
  read: "READ — no approval required",
  prepare: "PREPARE — creates a proposed action",
  confirm: "CONFIRM — requires explicit user approval",
  prohibited: "PROHIBITED — blocked regardless of any instruction",
};

/**
 * Explicitly allowed transitions. Anything not listed is invalid.
 * Terminal states (verified, rejected, cancelled, failed, expired)
 * have no outgoing transitions — records end there, permanently.
 */
const TRANSITIONS: Record<AgentLifecycleState, AgentLifecycleState[]> = {
  observed: ["analyzed", "rejected", "cancelled"],
  analyzed: ["recommended", "rejected", "cancelled"],
  recommended: ["prepared", "rejected", "cancelled", "expired"],
  prepared: ["approved", "rejected", "cancelled", "expired"],
  approved: ["executed", "cancelled", "expired"],
  executed: ["verified", "failed"],
  verified: [], // terminal success
  rejected: [], // terminal — user said no
  cancelled: [], // terminal — user abandoned
  failed: [], // terminal — execution failed; a NEW action may be prepared
  expired: [], // terminal — approval window lapsed; re-prepare
};

export interface TransitionCheck {
  allowed: boolean;
  reason: string;
}

/** Pure transition validator — the single source of truth. */
export function canTransition(
  from: AgentLifecycleState,
  to: AgentLifecycleState,
): TransitionCheck {
  if (from === to) {
    return {
      allowed: false,
      reason: `Already in state '${from}' — no self-transitions.`,
    };
  }
  const allowed = TRANSITIONS[from];
  if (!allowed) {
    return { allowed: false, reason: `Unknown state '${from}'.` };
  }
  if (allowed.includes(to)) {
    return {
      allowed: true,
      reason: `${from} → ${to} is a valid lifecycle transition.`,
    };
  }
  return {
    allowed: false,
    reason: `Invalid transition ${from} → ${to}. Allowed from '${from}': ${allowed.join(", ") || "none (terminal state)"}.`,
  };
}

/** Is a state terminal (no outgoing transitions)? */
export function isTerminal(state: AgentLifecycleState): boolean {
  return TRANSITIONS[state].length === 0;
}

/**
 * Apply a transition to a record that carries `state`. Returns a new
 * object — never mutates. Invalid transitions return the original
 * record plus the reason.
 */
export function applyTransition<T extends { state: AgentLifecycleState }>(
  record: T,
  to: AgentLifecycleState,
  _nowIso: string,
): { ok: true; record: T } | { ok: false; record: T; reason: string } {
  const check = canTransition(record.state, to);
  if (!check.allowed) {
    return { ok: false, record, reason: check.reason };
  }
  return { ok: true, record: { ...record, state: to } };
}

/** Default approval validity window: 15 minutes. */
export const APPROVAL_TTL_MS = 15 * 60 * 1000;

/** Is an approval still inside its validity window? */
export function isApprovalActive(
  approval: { state: string; expiresAt: string },
  nowIso: string,
): boolean {
  if (approval.state !== "pending" && approval.state !== "approved")
    return false;
  return new Date(nowIso).getTime() <= new Date(approval.expiresAt).getTime();
}

/**
 * An approved action may be executed exactly once. After execution
 * (or failure), re-approval is impossible — a NEW action must be
 * prepared. This is the double-execution guard at the state level.
 */
export function isExecutable(action: {
  state: AgentLifecycleState;
  approval?: { state: string };
}): boolean {
  return action.state === "approved" && action.approval?.state === "approved";
}
