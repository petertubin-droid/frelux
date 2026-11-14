/**
 * Evidence-based estimator calibration and Procore-aligned cost coding.
 *
 * This is a deterministic, local calculation layer. It never changes a base
 * formula or an active market rule. Feedback creates a shadow candidate; an
 * owner/admin must explicitly activate a reviewed candidate. Structural and
 * life-safety quantities are categorically ineligible for calibration.
 */

export type CalibrationMeasure = "material" | "labour";
export type CalibrationEvidence = "verified_project" | "user_reported";
export type CalibrationStatus = "pending_review" | "accepted" | "rejected";

export interface CalibrationFeedback {
  id: string;
  projectId: string;
  marketCode: string;
  materialKey: string;
  measure: CalibrationMeasure;
  estimatedQuantity: number;
  actualQuantity: number;
  unit: string;
  evidence: CalibrationEvidence;
  recordedAt: string;
  /** Prevents structural/design recommendations entering quantity learning. */
  context: "takeoff" | "structural" | "compliance";
  status: CalibrationStatus;
  evidenceReference?: string;
  reviewerId?: string;
  reviewedAt?: string;
}

export interface CalibrationPolicy {
  minObservations: number;
  minDistinctProjects: number;
  minVerifiedObservations: number;
  minVerifiedShare: number;
  maxAdjustmentFraction: number;
  emaAlpha: number;
}

export const DEFAULT_CALIBRATION_POLICY: Readonly<CalibrationPolicy> = {
  minObservations: 5,
  minDistinctProjects: 3,
  minVerifiedObservations: 3,
  minVerifiedShare: 0.6,
  maxAdjustmentFraction: 0.25,
  emaAlpha: 0.25,
};

export interface CalibrationCandidate {
  marketCode: string;
  materialKey: string;
  measure: CalibrationMeasure;
  observationCount: number;
  distinctProjectCount: number;
  verifiedObservationCount: number;
  verifiedShare: number;
  /** Multiplier to compare in shadow mode; never silently applied. */
  proposedMultiplier: number | null;
  /** Median observed actual/estimated ratio, robustly bounded by policy. */
  medianMultiplier: number | null;
  eligible: boolean;
  blockers: string[];
  observedAt: string | null;
}

export interface ConfidenceRange {
  low: number;
  likely: number;
  high: number;
  unit: string;
  observations: number;
  /** A range from completed project actuals, not a probabilistic guarantee. */
  method: "empirical_quantiles";
}

export interface CostCodeDefinition {
  costCode: string;
  description: string;
  /** Project-specific Procore WBS cost type, e.g. M/L/E/S or a custom type. */
  costType: string;
  division: string;
  uniFormat?: string;
}

export interface CalibrationApproval {
  candidateKey: string;
  decision: "approved" | "rejected";
  reviewerId: string;
  reviewedAt: string;
  reason: string;
  /** Version of the reviewed policy and data snapshot. */
  candidateFingerprint: string;
}

export interface AuditEvent {
  id: string;
  entityType: "calibration_candidate" | "cost_code_mapping";
  entityKey: string;
  action:
    "proposed" | "approved" | "rejected" | "activated" | "mapping_changed";
  actorId: string;
  occurredAt: string;
  reason: string;
  before?: unknown;
  after?: unknown;
}

function finitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Reject invalid, non-comparable and structurally sensitive observations. */
export function validateCalibrationFeedback(
  row: CalibrationFeedback,
): string[] {
  const errors: string[] = [];
  if (!row.id.trim()) errors.push("missing_id");
  if (!row.projectId.trim()) errors.push("missing_project_id");
  if (!row.marketCode.trim()) errors.push("missing_market");
  if (!row.materialKey.trim()) errors.push("missing_material");
  if (!row.unit.trim()) errors.push("missing_unit");
  if (!finitePositive(row.estimatedQuantity))
    errors.push("invalid_estimated_quantity");
  if (!finitePositive(row.actualQuantity))
    errors.push("invalid_actual_quantity");
  if (row.context !== "takeoff") errors.push("safety_sensitive_context");
  if (row.status !== "accepted") errors.push("not_accepted");
  if (row.evidence === "verified_project" && !row.evidenceReference?.trim())
    errors.push("missing_evidence_reference");
  if (
    row.evidence === "verified_project" &&
    (!row.reviewerId?.trim() || !row.reviewedAt)
  )
    errors.push("missing_review_record");
  if (Number.isNaN(Date.parse(row.recordedAt)))
    errors.push("invalid_recorded_at");
  return errors;
}

/**
 * Calculates a candidate from accepted, comparable feedback.
 * Duplicate IDs are ignored, rejected observations are excluded, and ratios
 * are winsorized before a chronological EMA is calculated.
 */
export function buildCalibrationCandidate(
  rows: CalibrationFeedback[],
  marketCode: string,
  materialKey: string,
  measure: CalibrationMeasure,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): CalibrationCandidate {
  const eligibleRows = rows
    .filter(
      (r) =>
        r.marketCode.toUpperCase() === marketCode.toUpperCase() &&
        r.materialKey === materialKey &&
        r.measure === measure &&
        validateCalibrationFeedback(r).length === 0,
    )
    .filter((r, i, all) => all.findIndex((other) => other.id === r.id) === i)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const ratios = eligibleRows.map(
    (r) => r.actualQuantity / r.estimatedQuantity,
  );
  const sorted = [...ratios].sort((a, b) => a - b);
  const median = sorted.length ? quantile(sorted, 0.5) : null;
  const boundedMedian =
    median === null
      ? null
      : clamp(
          median,
          1 - policy.maxAdjustmentFraction,
          1 + policy.maxAdjustmentFraction,
        );
  const verifiedCount = eligibleRows.filter(
    (r) => r.evidence === "verified_project",
  ).length;
  const verifiedShare = eligibleRows.length
    ? verifiedCount / eligibleRows.length
    : 0;
  const projects = new Set(eligibleRows.map((r) => r.projectId));
  const blockers: string[] = [];
  if (eligibleRows.length < policy.minObservations)
    blockers.push("insufficient_observations");
  if (projects.size < policy.minDistinctProjects)
    blockers.push("insufficient_distinct_projects");
  if (verifiedCount < policy.minVerifiedObservations)
    blockers.push("insufficient_verified_observations");
  if (verifiedShare < policy.minVerifiedShare)
    blockers.push("verified_share_too_low");

  // EMA is included as a stable shadow metric; it is not activated here.
  let ema: number | null = null;
  for (const ratio of ratios) {
    const bounded = clamp(
      ratio,
      1 - policy.maxAdjustmentFraction,
      1 + policy.maxAdjustmentFraction,
    );
    ema =
      ema === null
        ? bounded
        : policy.emaAlpha * bounded + (1 - policy.emaAlpha) * ema;
  }
  const proposed = ema === null ? null : Math.round(ema * 10000) / 10000;
  return {
    marketCode: marketCode.toUpperCase(),
    materialKey,
    measure,
    observationCount: eligibleRows.length,
    distinctProjectCount: projects.size,
    verifiedObservationCount: verifiedCount,
    verifiedShare: Math.round(verifiedShare * 10000) / 10000,
    proposedMultiplier: proposed,
    medianMultiplier:
      boundedMedian === null ? null : Math.round(boundedMedian * 10000) / 10000,
    eligible: blockers.length === 0,
    blockers,
    observedAt: eligibleRows.length
      ? eligibleRows[eligibleRows.length - 1].recordedAt
      : null,
  };
}

/** Builds a descriptive empirical interval from project outcomes, not ML. */
export function empiricalConfidenceRange(
  baseQuantity: number,
  rows: CalibrationFeedback[],
  marketCode: string,
  materialKey: string,
  measure: CalibrationMeasure,
  unit: string,
): ConfidenceRange | null {
  if (!finitePositive(baseQuantity) || !unit.trim()) return null;
  const ratios = rows
    .filter(
      (r) =>
        r.marketCode.toUpperCase() === marketCode.toUpperCase() &&
        r.materialKey === materialKey &&
        r.measure === measure &&
        validateCalibrationFeedback(r).length === 0,
    )
    .map((r) => r.actualQuantity / r.estimatedQuantity)
    .sort((a, b) => a - b);
  if (!ratios.length) return null;
  return {
    low: Math.round(baseQuantity * quantile(ratios, 0.1) * 1000) / 1000,
    likely: Math.round(baseQuantity * quantile(ratios, 0.5) * 1000) / 1000,
    high: Math.round(baseQuantity * quantile(ratios, 0.9) * 1000) / 1000,
    unit,
    observations: ratios.length,
    method: "empirical_quantiles",
  };
}

/** Only approved candidates matching the reviewed snapshot can be activated. */
export function resolveApprovedMultiplier(
  candidate: CalibrationCandidate,
  approval: CalibrationApproval | null,
  candidateFingerprint: string,
): number | null {
  if (!candidate.eligible || !approval || approval.decision !== "approved")
    return null;
  if (approval.candidateKey !== calibrationCandidateKey(candidate)) return null;
  if (approval.candidateFingerprint !== candidateFingerprint) return null;
  return candidate.proposedMultiplier;
}

export function calibrationCandidateKey(
  candidate: CalibrationCandidate,
): string {
  return `${candidate.marketCode}:${candidate.materialKey}:${candidate.measure}`;
}

/** Deterministic current-vs-shadow comparison for canary evaluation. */
export function compareShadowEstimate(
  baseQuantity: number,
  proposedMultiplier: number | null,
): {
  baseline: number;
  shadow: number;
  delta: number;
  deltaFraction: number | null;
} {
  const baseline =
    Number.isFinite(baseQuantity) && baseQuantity > 0 ? baseQuantity : 0;
  const multiplier =
    proposedMultiplier !== null && Number.isFinite(proposedMultiplier)
      ? clamp(proposedMultiplier, 0.75, 1.25)
      : 1;
  const shadow = Math.round(baseline * multiplier * 1000) / 1000;
  return {
    baseline,
    shadow,
    delta: shadow - baseline,
    deltaFraction: baseline > 0 ? (shadow - baseline) / baseline : null,
  };
}

/**
 * Compact, configurable CSI MasterFormat mappings. Codes are classification
 * suggestions only; administrators can replace them with the project's actual
 * Procore WBS segment values before export.
 */
const COST_CODE_HINTS: Array<{
  terms: string[];
  code: string;
  description: string;
  division: string;
  uniFormat: string;
}> = [
  {
    terms: [
      "concrete",
      "slab",
      "cement",
      "rebar",
      "reinforcement",
      "increte",
      "stamped concrete",
    ],
    code: "03 30 00",
    description: "Cast-in-Place Concrete",
    division: "03",
    uniFormat: "B1010",
  },
  {
    terms: ["block", "brick", "masonry", "sandcrete"],
    code: "04 20 00",
    description: "Unit Masonry",
    division: "04",
    uniFormat: "B2010",
  },
  {
    terms: ["steel", "metal"],
    code: "05 12 00",
    description: "Structural Steel Framing",
    division: "05",
    uniFormat: "B1010",
  },
  {
    terms: ["roof", "waterproof", "insulation"],
    code: "07 00 00",
    description: "Thermal and Moisture Protection",
    division: "07",
    uniFormat: "B3010",
  },
  {
    terms: ["door", "window", "glazing"],
    code: "08 00 00",
    description: "Openings",
    division: "08",
    uniFormat: "B2020",
  },
  {
    terms: ["paint", "tile", "screed", "plaster", "ceiling", "finish"],
    code: "09 00 00",
    description: "Finishes",
    division: "09",
    uniFormat: "C3020",
  },
  {
    terms: ["plumb", "pipe", "valve", "drain"],
    code: "22 00 00",
    description: "Plumbing",
    division: "22",
    uniFormat: "D20",
  },
  {
    terms: ["electric", "wire", "conduit", "solar"],
    code: "26 00 00",
    description: "Electrical",
    division: "26",
    uniFormat: "D50",
  },
  {
    terms: ["earth", "excavat", "foundation"],
    code: "31 00 00",
    description: "Earthwork",
    division: "31",
    uniFormat: "G1030",
  },
];

export function suggestCostCode(
  tradeOrItem: string,
  costType: string,
): CostCodeDefinition | null {
  const normalized = tradeOrItem.toLowerCase().trim();
  if (!normalized || !costType.trim()) return null;
  const match = COST_CODE_HINTS.find((hint) =>
    hint.terms.some((term) => normalized.includes(term)),
  );
  if (!match) return null;
  return {
    costCode: match.code,
    description: match.description,
    costType: costType.trim().toUpperCase(),
    division: match.division,
    uniFormat: match.uniFormat,
  };
}

export interface ProcoreBudgetRow {
  costCode: string;
  costCodeDescription: string;
  costType: string;
  description: string;
  uom: string;
  quantity: number;
  unitCost: number | null;
  amount: number | null;
  currency: string;
  marketCode: string;
  sourceStatus: "verified" | "user_entered" | "unverified";
}

/** Export useful WBS columns, but never imply that a generic CSV is Procore's template. */
export function exportBudgetCsv(rows: ProcoreBudgetRow[]): string {
  const headers = [
    "Cost Code",
    "Cost Code Description",
    "Cost Type",
    "Description",
    "UOM",
    "Quantity",
    "Unit Cost",
    "Amount",
    "Currency",
    "Market",
    "Price Status",
  ];
  const esc = (value: string | number | null | undefined) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = rows.map((r) =>
    [
      r.costCode,
      r.costCodeDescription,
      r.costType,
      r.description,
      r.uom,
      r.quantity,
      r.unitCost,
      r.amount,
      r.currency,
      r.marketCode,
      r.sourceStatus,
    ]
      .map(esc)
      .join(","),
  );
  return [headers.join(","), ...content].join("\r\n");
}
