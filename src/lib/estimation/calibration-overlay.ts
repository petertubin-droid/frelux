/**
 * Activation gate for approved calibration.
 *
 * A candidate is evidence, not a rule. Applying one changes what a customer is
 * quoted, so the change is gated three ways and every gate is explicit:
 *
 *  1. The candidate must be eligible and an administrator must have approved
 *     this exact snapshot (fingerprint plus policy version).
 *  2. Deployment must opt in with VITE_CALIBRATION_ACTIVATION=on. Without it the
 *     overlay reports the shadow value and returns the baseline untouched.
 *  3. Revoking the approval, or shipping new evidence that changes the
 *     fingerprint, returns the baseline again on the next call. That is the
 *     rollback path, and it needs no deployment.
 *
 * The overlay is deliberately inert until an owner turns the flag on: nothing
 * silently changes a live estimate.
 */

import {
  calibrationCandidateKey,
  compareShadowEstimate,
  createAuditEvent,
  resolveApprovedMultiplier,
  type AuditEvent,
  type CalibrationApproval,
  type CalibrationCandidate,
  type CalibrationPolicy,
  DEFAULT_CALIBRATION_POLICY,
} from "./adaptive-calibration";

export type ActivationBlockedReason =
  | "none"
  | "activation_disabled"
  | "not_eligible"
  | "no_approval"
  | "approval_rejected"
  | "policy_or_evidence_changed";

export interface ActivationFlag {
  enabled: boolean;
  reason: "flag_on" | "flag_off" | "flag_unset";
}

export interface CalibrationApplication {
  applied: boolean;
  /** The quantity a caller should use. Always the baseline unless applied. */
  value: number;
  multiplier: number | null;
  comparison: ReturnType<typeof compareShadowEstimate>;
  blockedReason: ActivationBlockedReason;
  audit: AuditEvent | null;
}

/** Reads the deployment flag. Anything other than on/true/1 is off. */
export function readActivationFlag(
  raw: string | undefined = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env?.VITE_CALIBRATION_ACTIVATION,
): ActivationFlag {
  const text = (raw ?? "").trim().toLowerCase();
  if (text === "on" || text === "true" || text === "1") {
    return { enabled: true, reason: "flag_on" };
  }
  return { enabled: false, reason: text ? "flag_off" : "flag_unset" };
}

export interface ApplyCalibrationInput {
  baseline: number;
  candidate: CalibrationCandidate;
  approval: CalibrationApproval | null;
  flag?: ActivationFlag;
  policy?: CalibrationPolicy;
  actorId?: string;
}

/**
 * Returns the quantity to use, plus why. Never throws and never returns a value
 * outside the policy clamp.
 */
export function applyApprovedCalibration(
  input: ApplyCalibrationInput,
): CalibrationApplication {
  const policy = input.policy ?? DEFAULT_CALIBRATION_POLICY;
  const flag = input.flag ?? readActivationFlag();
  const multiplier = resolveApprovedMultiplier(
    input.candidate,
    input.approval,
    policy,
  );
  const comparison = compareShadowEstimate(input.baseline, multiplier, policy);
  const baseline = comparison.baseline;

  let blockedReason: ActivationBlockedReason = "none";
  if (multiplier === null) {
    if (!input.candidate.eligible) blockedReason = "not_eligible";
    else if (!input.approval) blockedReason = "no_approval";
    else if (input.approval.decision !== "approved")
      blockedReason = "approval_rejected";
    else blockedReason = "policy_or_evidence_changed";
  } else if (!flag.enabled) {
    blockedReason = "activation_disabled";
  }

  const applied = multiplier !== null && flag.enabled;
  const value = applied ? comparison.shadow : baseline;
  const key = calibrationCandidateKey(input.candidate);
  const actorId = input.actorId ?? input.approval?.reviewerId ?? "system";

  let audit: AuditEvent | null = null;
  if (applied) {
    audit = createAuditEvent({
      entityType: "calibration_candidate",
      entityKey: key,
      action: "activated",
      actorId,
      reason: `Applied x${multiplier} from ${input.candidate.observationCount} observations`,
      after: { baseline, value, multiplier },
    });
  } else if (blockedReason === "policy_or_evidence_changed") {
    audit = createAuditEvent({
      entityType: "calibration_candidate",
      entityKey: key,
      action: "rejected",
      actorId,
      reason: "Approval no longer matches the reviewed snapshot",
      before: input.approval,
    });
  }

  return {
    applied,
    value,
    multiplier,
    comparison,
    blockedReason,
    audit,
  };
}
