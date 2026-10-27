/**
 * FRELUX Multi-Stage Approval Hierarchy (Pillar 7)
 *
 * Enterprise tender flow, mirroring the database-enforced state
 * graph in migration 20261027210000:
 *
 *   draft
 *     -> lead_estimator_reviewed      (Lead Estimator)
 *     -> commercial_director_approved (Commercial Director)
 *     -> [over threshold] executive_dual_signed (Executive #1)
 *     -> tender_issued                (Executive #2 — must differ)
 *
 * Threshold-based approval: estimates at or above the policy's dual
 * sign-off threshold (default USD 500,000) require TWO DISTINCT
 * executive signatures before the tender is issued. Under the
 * threshold the Commercial Director (or an executive) issues.
 *
 * House rules: forward-only, one stage at a time; every transition
 * needs the acting role; the dual-signoff second signature must be a
 * different executive; currency conversion is the caller's job — an
 * estimate whose currency differs from the policy currency without a
 * supplied converted total is REFUSED rather than guessed at any
 * exchange rate; rejection/withdrawal is allowed from any active
 * stage by an authorized role and is itself a signed event.
 */

export type ApprovalStage =
  | "draft"
  | "lead_estimator_reviewed"
  | "commercial_director_approved"
  | "executive_dual_signed"
  | "tender_issued"
  | "rejected"
  | "withdrawn";

export const APPROVAL_STAGES: readonly ApprovalStage[] = [
  "draft",
  "lead_estimator_reviewed",
  "commercial_director_approved",
  "executive_dual_signed",
  "tender_issued",
];

export type ApproverRole = "lead_estimator" | "commercial_director" | "executive" | "system";

export interface ApprovalPolicy {
  dualSignoffThreshold: number;
  dualSignoffCurrency: string;
}

/** The engine's default mirrors the seeded Standard enterprise policy. */
export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
  dualSignoffThreshold: 500000,
  dualSignoffCurrency: "USD",
};

export interface EstimateContext {
  estimateRef: string;
  title: string;
  total: number;
  currency: string;
  /**
   * Total converted into the policy currency, when the estimate is
   * priced in another currency. Supplied by the caller from the real
   * FX source; the engine never invents a rate.
   */
  totalInPolicyCurrency?: number | null;
}

export interface DualSignoffDecision {
  required: boolean;
  effectiveTotalInPolicyCurrency: number | null;
  reason: string;
  errors: string[];
}

/** Threshold check: at or above the threshold requires dual sign-off. */
export function determineDualSignoff(
  estimate: Pick<EstimateContext, "total" | "currency" | "totalInPolicyCurrency">,
  policy: ApprovalPolicy = DEFAULT_APPROVAL_POLICY,
): DualSignoffDecision {
  const errors: string[] = [];
  if (!Number.isFinite(estimate.total) || estimate.total < 0) {
    return {
      required: false,
      effectiveTotalInPolicyCurrency: null,
      reason: "",
      errors: ["Estimate total must be a non-negative number: the threshold check refused to guess."],
    };
  }
  if (policy.dualSignoffThreshold < 0) {
    return {
      required: false,
      effectiveTotalInPolicyCurrency: null,
      reason: "",
      errors: ["Approval policy dual-signoff threshold cannot be negative."],
    };
  }

  let effective: number;
  if (estimate.currency === policy.dualSignoffCurrency) {
    effective = estimate.total;
  } else {
    if (estimate.totalInPolicyCurrency === null || estimate.totalInPolicyCurrency === undefined) {
      return {
        required: false,
        effectiveTotalInPolicyCurrency: null,
        reason: "",
        errors: [
          `Estimate is priced in ${estimate.currency} but the dual-signoff threshold is in ${policy.dualSignoffCurrency}: a converted total is required and no exchange rate was guessed.`,
        ],
      };
    }
    effective = estimate.totalInPolicyCurrency;
  }

  const required = effective >= policy.dualSignoffThreshold;
  return {
    required,
    effectiveTotalInPolicyCurrency: effective,
    reason: required
      ? `Effective total ${effective} ${policy.dualSignoffCurrency} is at or above the ${policy.dualSignoffThreshold} threshold: two distinct executives must sign before tender issue.`
      : `Effective total ${effective} ${policy.dualSignoffCurrency} is below the ${policy.dualSignoffThreshold} threshold: commercial director approval suffices.`,
    errors,
  };
}

export interface ApprovalRecordState {
  estimateRef: string;
  currentStage: ApprovalStage;
  requiresDualSignoff: boolean;
  /** Distinct executives who have signed so far. */
  executiveSigners: string[];
}

export interface TransitionRequest {
  target: ApprovalStage;
  actorId: string;
  actorRole: ApproverRole;
  actorEmail?: string | null;
  note?: string | null;
}

export interface TransitionOutcome {
  ok: boolean;
  fromStage: ApprovalStage;
  toStage: ApprovalStage;
  requiresDualSignoff: boolean;
  executiveSignersAfter: string[];
  reason: string;
  errors: string[];
}

/** Signed stage-flow adjacency, mirroring the DB guard exactly. */
export function isAllowedTransition(
  from: ApprovalStage,
  to: ApprovalStage,
  requiresDualSignoff: boolean,
): boolean {
  if (to === "rejected" || to === "withdrawn") {
    return from !== "rejected" && from !== "withdrawn" && from !== "tender_issued";
  }
  if (from === "draft") return to === "lead_estimator_reviewed";
  if (from === "lead_estimator_reviewed") return to === "commercial_director_approved";
  if (from === "commercial_director_approved") {
    return requiresDualSignoff ? to === "executive_dual_signed" : to === "tender_issued";
  }
  if (from === "executive_dual_signed") return to === "tender_issued";
  return false;
}

/** Role required for a forward transition (null = no forward transition). */
export function requiredRoleForTransition(
  from: ApprovalStage,
  to: ApprovalStage,
  requiresDualSignoff: boolean,
): ApproverRole | null {
  if (from === "draft" && to === "lead_estimator_reviewed") return "lead_estimator";
  if (from === "lead_estimator_reviewed" && to === "commercial_director_approved") {
    return "commercial_director";
  }
  if (from === "commercial_director_approved") {
    if (requiresDualSignoff && to === "executive_dual_signed") return "executive";
    if (!requiresDualSignoff && to === "tender_issued") return "commercial_director";
  }
  if (from === "executive_dual_signed" && to === "tender_issued") return "executive";
  return null;
}

/**
 * Evaluate a stage transition. Terminal-stage or stage-machine
 * violations are refused with an honest reason; the caller turns an
 * ok outcome into a signed event + DB update (the database guard is
 * the final authority).
 */
export function evaluateApprovalTransition(
  state: ApprovalRecordState,
  request: TransitionRequest,
): TransitionOutcome {
  const out: TransitionOutcome = {
    ok: false,
    fromStage: state.currentStage,
    toStage: request.target,
    requiresDualSignoff: state.requiresDualSignoff,
    executiveSignersAfter: [...state.executiveSigners],
    reason: "",
    errors: [],
  };
  if (!request.actorId?.trim()) {
    out.errors.push("Unsigned transition: every stage move needs an acting user id.");
    return out;
  }
  if (request.actorRole === "system") {
    out.errors.push("The system cannot approve or reject: every decision is a human's.");
    return out;
  }

  if (!isAllowedTransition(state.currentStage, request.target, state.requiresDualSignoff)) {
    out.errors.push(
      `Invalid transition ${state.currentStage} -> ${request.target}: the stage graph is forward-only and skips no stage.`,
    );
    return out;
  }

  // Terminal decisions (reject/withdraw) by any authorized business role.
  if (request.target === "rejected" || request.target === "withdrawn") {
    out.ok = true;
    out.reason = `${request.actorRole} moved the estimate to ${request.target}.`;
    return out;
  }

  const required = requiredRoleForTransition(
    state.currentStage,
    request.target,
    state.requiresDualSignoff,
  );
  if (required === null) {
    out.errors.push(`No role is authorized for ${state.currentStage} -> ${request.target}.`);
    return out;
  }

  // Role gates: the director may issue below threshold; executives may
  // also act at any gate above review, but the Lead Estimator cannot
  // approve and the Director cannot sign as an executive.
  const roleOk =
    request.actorRole === required ||
    (request.target === "tender_issued" && !state.requiresDualSignoff && request.actorRole === "executive");
  if (!roleOk) {
    out.errors.push(
      `Stage ${state.currentStage} -> ${request.target} requires the ${required} role; ${request.actorRole} is not permitted.`,
    );
    return out;
  }

  // Dual executive sign-off: two DISTINCT executives.
  if (state.currentStage === "commercial_director_approved" && state.requiresDualSignoff) {
    if (request.actorRole !== "executive") {
      out.errors.push("Estimates over the dual-signoff threshold require executive sign-off first.");
      return out;
    }
    if (state.executiveSigners.includes(request.actorId)) {
      out.errors.push("Executive sign-off requires two DISTINCT executives: this executive has already signed.");
      return out;
    }
    out.executiveSignersAfter = [...state.executiveSigners, request.actorId];
    out.reason = `First executive signature recorded; one more distinct executive must sign before tender issue.`;
    out.ok = true;
    return out;
  }
  if (state.currentStage === "executive_dual_signed" && request.target === "tender_issued") {
    if (request.actorRole !== "executive") {
      out.errors.push("Tender issue after dual-signoff entry requires an executive.");
      return out;
    }
    // The issuing actor is the SECOND executive: one prior distinct
    // signature must exist, and the actor must not be a repeat.
    if (state.executiveSigners.length < 1) {
      out.errors.push(
        `Dual executive sign-off requires two distinct executives; no first executive signature is recorded.`,
      );
      return out;
    }
    if (state.executiveSigners.includes(request.actorId)) {
      out.errors.push("The issuing executive must differ from the first executive signer.");
      return out;
    }
    out.executiveSignersAfter = [...state.executiveSigners, request.actorId];
    out.reason = "Second distinct executive signature recorded; the tender may be issued.";
    out.ok = true;
    return out;
  }

  out.ok = true;
  out.reason = `${request.actorRole} moved the estimate from ${state.currentStage} to ${request.target}.`;
  return out;
}

/** Human-readable stage labels for UIs. */
export const APPROVAL_STAGE_LABELS: Readonly<Record<ApprovalStage, string>> = {
  draft: "Draft",
  lead_estimator_reviewed: "Reviewed by Lead Estimator",
  commercial_director_approved: "Approved by Commercial Director",
  executive_dual_signed: "Executive Dual Sign-off",
  tender_issued: "Tender Issued",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
