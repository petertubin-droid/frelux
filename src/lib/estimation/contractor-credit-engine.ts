/**
 * Contractor Credit-Score Engine (Future Engine 13)
 *
 * Computes a deterministic 0–100 trust score from admin-verified
 * job statistics, so clients and lenders can check a contractor.
 * Pure, no I/O.
 *
 * House rules, identical to every other Frelux engine:
 *  - A contractor with ZERO verified jobs is REFUSED with
 *    "insufficient verified history". Never scored zero -
 *    an unverified history is not a bad history.
 *  - Invalid stats (on_time > verified, error % outside 0–100)
 *    are REFUSED. Never clamped, never guessed.
 *  - Missing or invalid scoring rules are REFUSED. The engine
 *    never invents weights, thresholds or penalties.
 *  - The dispute penalty is capped at the base score, so the
 *    score can never go below zero - stated openly in the
 *    breakdown, not hidden.
 */

export interface ContractorStatsInput {
  verified_jobs: number;
  on_time_jobs: number;
  dispute_count: number;
  avg_estimate_error_pct: number;
}

export interface CreditScoreRule {
  rule_key: string;
  rule_value: Record<string, unknown>;
}

export interface CreditScoreInput {
  stats: ContractorStatsInput;
  rules: CreditScoreRule[];
}

export interface CreditScoreStep {
  label: string;
  detail: string;
}

export type CreditBand = "Excellent" | "Strong" | "Building";

export interface CreditScoreResult {
  ok: boolean;
  warnings: string[];
  steps: CreditScoreStep[];
  score: number | null;
  band: CreditBand | null;
  reliability_pct: number | null;
  accuracy_pct: number | null;
  volume_pct: number | null;
  penalty: number | null;
}

function getRuleValue(rules: CreditScoreRule[], key: string): number | null {
  for (const r of rules) {
    if (r.rule_key !== key) continue;
    const v = r.rule_value?.value;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function calculateCreditScore(
  input: CreditScoreInput,
): CreditScoreResult {
  const warnings: string[] = [];
  const steps: CreditScoreStep[] = [];

  const refuse = (msgs: string[]): CreditScoreResult => ({
    ok: false,
    warnings: msgs,
    steps: [],
    score: null,
    band: null,
    reliability_pct: null,
    accuracy_pct: null,
    volume_pct: null,
    penalty: null,
  });

  const { stats, rules } = input;
  const { verified_jobs, on_time_jobs, dispute_count, avg_estimate_error_pct } =
    stats;

  const int = (n: number) => Number.isFinite(n) && Number.isInteger(n);

  // ── Validation: stats sane (never clamped) ────────────
  if (!int(verified_jobs) || verified_jobs < 0) {
    return refuse([
      "Verified jobs must be a whole number of zero or more. The engine refuses to score from an invalid record.",
    ]);
  }
  if (verified_jobs === 0) {
    return refuse([
      "This contractor has no verified jobs on record, so there is nothing a client or lender can check yet: insufficient verified history, not a zero score. Add verified job records first.",
    ]);
  }
  if (!int(on_time_jobs) || on_time_jobs < 0) {
    return refuse([
      "On-time jobs must be a whole number of zero or more. The engine refuses to score from an invalid record.",
    ]);
  }
  if (on_time_jobs > verified_jobs) {
    return refuse([
      `On-time jobs (${on_time_jobs}) cannot exceed verified jobs (${verified_jobs}). The engine refuses to score from an impossible record: fix the profile.`,
    ]);
  }
  if (!int(dispute_count) || dispute_count < 0) {
    return refuse([
      "Dispute count must be a whole number of zero or more. The engine refuses to score from an invalid record.",
    ]);
  }
  if (
    !Number.isFinite(avg_estimate_error_pct) ||
    avg_estimate_error_pct < 0 ||
    avg_estimate_error_pct > 100
  ) {
    return refuse([
      `Average estimate error (${avg_estimate_error_pct}%) must be between 0 and 100. The engine refuses to score from an invalid record: fix the profile.`,
    ]);
  }

  // ── Validation: rules present and sane (never guessed) ──
  const weightKeys = [
    "on_time_weight",
    "accuracy_weight",
    "volume_weight",
  ] as const;
  const weights: Record<string, number> = {};
  for (const k of weightKeys) {
    const w = getRuleValue(rules, k);
    if (w === null || w < 0 || w > 1) {
      return refuse([
        `No valid '${k}' rule is configured (it must be between 0 and 1). The engine refuses to invent scoring weights.`,
      ]);
    }
    weights[k] = w;
  }
  const weightSum = weightKeys.reduce((a, k) => a + weights[k], 0);
  if (weightSum > 1) {
    return refuse([
      `The configured scoring weights sum to ${weightSum}, which exceeds 1. The engine refuses to score with weights that can produce over 100: fix the rules in the admin config.`,
    ]);
  }

  const jobsRef = getRuleValue(rules, "verified_jobs_reference");
  if (jobsRef === null || jobsRef <= 0) {
    return refuse([
      "No valid 'verified_jobs_reference' rule is configured. The engine refuses to invent what counts as a full job history.",
    ]);
  }
  const disputePenalty = getRuleValue(rules, "dispute_penalty_points");
  if (disputePenalty === null || disputePenalty < 0) {
    return refuse([
      "No valid 'dispute_penalty_points' rule is configured. The engine refuses to invent a dispute penalty.",
    ]);
  }
  const strong = getRuleValue(rules, "strong_threshold");
  if (strong === null || strong < 0 || strong > 100) {
    return refuse([
      "No valid 'strong_threshold' rule is configured. The engine refuses to invent score bands.",
    ]);
  }
  const excellent = getRuleValue(rules, "excellent_threshold");
  if (
    excellent === null ||
    excellent < 0 ||
    excellent > 100 ||
    excellent < strong
  ) {
    return refuse([
      "No valid 'excellent_threshold' rule is configured (it must be between 0 and 100 and at least the strong threshold). The engine refuses to invent score bands.",
    ]);
  }
  const roundRaw = getRuleValue(rules, "rounding_decimals");
  if (roundRaw === null || roundRaw < 0 || roundRaw > 6) {
    return refuse([
      "No valid 'rounding_decimals' rule is configured for this calculator. The engine refuses to report an arbitrarily-rounded score.",
    ]);
  }
  const round = roundRaw;
  const r = (n: number) => Number(n.toFixed(round));

  // ── Deterministic chain ───────────────────────────────
  const reliability = (on_time_jobs / verified_jobs) * 100;
  const accuracy = 100 - avg_estimate_error_pct;
  const volume = Math.min(verified_jobs / jobsRef, 1) * 100;

  const base =
    weights.on_time_weight * reliability +
    weights.accuracy_weight * accuracy +
    weights.volume_weight * volume;

  const penalty = Math.min(dispute_count * disputePenalty, base);
  const score = base - penalty; // ≥ 0 by the cap, stated openly

  steps.push({
    label: "Reliability",
    detail: `${on_time_jobs} of ${verified_jobs} verified jobs completed on time = ${r(reliability)}%.`,
  });
  steps.push({
    label: "Estimate accuracy",
    detail: `100 − ${avg_estimate_error_pct}% average estimate error = ${r(accuracy)}%.`,
  });
  steps.push({
    label: "Verified volume",
    detail: `${verified_jobs} verified jobs against the configured reference of ${jobsRef} = ${r(volume)}% of the volume component.`,
  });
  steps.push({
    label: "Base score",
    detail: `${weights.on_time_weight} × ${r(reliability)} + ${weights.accuracy_weight} × ${r(accuracy)} + ${weights.volume_weight} × ${r(volume)} = ${r(base)}.`,
  });
  steps.push({
    label: "Dispute penalty",
    detail: `${dispute_count} dispute(s) × ${disputePenalty} points, capped at the base score = −${r(penalty)}.`,
  });

  // ── Band ───────────────────────────────────────────────
  let band: CreditBand;
  if (score >= excellent) band = "Excellent";
  else if (score >= strong) band = "Strong";
  else band = "Building";
  steps.push({
    label: "Band",
    detail: `${r(score)} against the configured thresholds (Strong at ${strong}, Excellent at ${excellent}) → ${band}.`,
  });

  if (weightSum < 1) {
    warnings.push(
      `The configured scoring weights sum to ${+weightSum.toFixed(3)}, less than 1: scores are scaled down accordingly. This is reported, not silently compensated.`,
    );
  }

  return {
    ok: true,
    warnings,
    steps,
    score: r(score),
    band,
    reliability_pct: r(reliability),
    accuracy_pct: r(accuracy),
    volume_pct: r(volume),
    penalty: r(penalty),
  };
}
