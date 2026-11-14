export const VALID_MARKET_CODES = new Set<string>([
  "NG", "US", "GB", "CA", "AU", "DE", "IN", "GH", "KE", "ZA", "JP", "FR",
  "BR", "SA", "AE", "CN", "ID", "MX", "KR", "IT", "ET", "EG", "TZ", "CI",
  "ES", "NL", "PL", "SE", "CH", "SG", "TR", "NZ",
]);

/**
 * Evidence-based estimator calibration, autonomous triple-check multiplier verification,
 * and multi-standard international cost coding beyond Procore.
 *
 * This is a deterministic, mathematically hardened calculation and verification layer.
 * Base formulas and active safety rules remain immutable. Feedback creates candidate
 * multipliers that can be verified and triple-checked against three independent statistical
 * estimators, cross-project dispersion/anti-collusion metrics, and domain physics bounds.
 * Structural and life-safety quantities are categorically ineligible for calibration.
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

export interface TripleCheckPolicy extends CalibrationPolicy {
  /** Maximum permitted pairwise divergence between EMA, Hodges-Lehmann, and Trimmed Mean (default 0.035 / 3.5%). */
  consensusMaxDelta: number;
  /** Maximum Herfindahl-Hirschman Index to prevent single-project concentration (default 0.38). */
  maxHhi: number;
  /** Maximum coefficient of variation between project mean ratios to ensure cross-site stability (default 0.15). */
  maxInterProjectCV: number;
  /** Whether verified proof (receipt, closeout report) is strictly required for auto-approval. */
  requireVerifiedEvidence: boolean;
}

export const DEFAULT_TRIPLE_CHECK_POLICY: Readonly<TripleCheckPolicy> = {
  ...DEFAULT_CALIBRATION_POLICY,
  consensusMaxDelta: 0.035,
  maxHhi: 0.38,
  maxInterProjectCV: 0.15,
  requireVerifiedEvidence: true,
};

export interface DomainPhysicsBounds {
  category: string;
  minMultiplier: number;
  maxMultiplier: number;
  maxAdjustmentDelta: number;
  notes: string;
}

export const DOMAIN_PHYSICS_RULES: Record<string, DomainPhysicsBounds> = {
  concrete: {
    category: "concrete",
    minMultiplier: 0.98,
    maxMultiplier: 1.25,
    maxAdjustmentDelta: 0.12,
    notes:
      "Conservation of mass with pump/formwork placement tolerances (0.98 - 1.25).",
  },
  masonry: {
    category: "masonry",
    minMultiplier: 0.97,
    maxMultiplier: 1.2,
    maxAdjustmentDelta: 0.1,
    notes:
      "Unit masonry, mortar joint cutting, and half-bat wastage (0.97 - 1.20).",
  },
  steel: {
    category: "steel",
    minMultiplier: 0.98,
    maxMultiplier: 1.15,
    maxAdjustmentDelta: 0.08,
    notes:
      "Reinforcement bar lapping, cutting, and tying wastage (0.98 - 1.15).",
  },
  finishes_paint: {
    category: "paint",
    minMultiplier: 0.82,
    maxMultiplier: 1.3,
    maxAdjustmentDelta: 0.15,
    notes:
      "Substrate porosity, roller nap transfer efficiency, and overspray (0.82 - 1.30).",
  },
  finishes_drywall: {
    category: "drywall",
    minMultiplier: 0.95,
    maxMultiplier: 1.2,
    maxAdjustmentDelta: 0.1,
    notes:
      "Board cutting offcuts, stud spacing, and joint compound (0.95 - 1.20).",
  },
  finishes_tile: {
    category: "tile",
    minMultiplier: 0.98,
    maxMultiplier: 1.22,
    maxAdjustmentDelta: 0.1,
    notes: "Perimeter cuts, pattern stagger waste, and breakage (0.98 - 1.22).",
  },
  earthwork: {
    category: "earthwork",
    minMultiplier: 0.9,
    maxMultiplier: 1.35,
    maxAdjustmentDelta: 0.15,
    notes:
      "Excavation soil bulking and trench compaction shrinkage (0.90 - 1.35).",
  },
  labour: {
    category: "labour",
    minMultiplier: 0.7,
    maxMultiplier: 1.4,
    maxAdjustmentDelta: 0.15,
    notes:
      "Crew productivity variance and site accessibility ergonomics (0.70 - 1.40).",
  },
  default: {
    category: "default",
    minMultiplier: 0.8,
    maxMultiplier: 1.25,
    maxAdjustmentDelta: 0.12,
    notes: "General takeoff quantity adjustment bounds (0.80 - 1.25).",
  },
};

export interface TripleCheckResult {
  passed: boolean;
  consensusReached: boolean;
  projectDiversityPassed: boolean;
  physicalBoundsPassed: boolean;
  estimators: {
    ema: number | null;
    hodgesLehmann: number | null;
    trimmedMean: number | null;
    maxPairwiseDelta: number | null;
  };
  dispersion: {
    hhi: number;
    interProjectCV: number;
    distinctProjects: number;
  };
  physics: {
    category: string;
    bounds: [number, number];
    evaluatedMultiplier: number | null;
  };
  consensusMultiplier: number | null;
  fingerprint: string;
  approval: CalibrationApproval | null;
  blockers: string[];
  diagnostics: string[];
}

export interface CalibrationCandidate {
  marketCode: string;
  materialKey: string;
  measure: CalibrationMeasure;
  unit: string;
  observationCount: number;
  distinctProjectCount: number;
  verifiedObservationCount: number;
  verifiedShare: number;
  /** Multiplier to compare in shadow mode; never silently applied without approval. */
  proposedMultiplier: number | null;
  /** Median observed actual/estimated ratio, robustly bounded by policy. */
  medianMultiplier: number | null;
  eligible: boolean;
  blockers: string[];
  observedAt: string | null;
  /** Autonomous triple-check multi-estimator verification results */
  tripleCheck?: TripleCheckResult;
  verifiedAndApproved?: boolean;
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
  uniclass2015?: string;
  nrm2?: string;
  din276?: string;
  primaryStandard?: string;
}

export interface GlobalClassification {
  tradeOrItem: string;
  category: string;
  primaryStandardName: string;
  primaryCode: string;
  primaryDescription: string;
  masterFormat: { code: string; title: string; division: string };
  uniFormat: { code: string; title: string };
  uniclass2015: { code: string; title: string };
  nrm2: { code: string; title: string };
  din276: { code: string; title: string };
  natspec?: { code: string; title: string };
  sans1200?: { code: string; title: string };
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
  if (!row || typeof row !== "object") {
    return ["invalid_row_object"];
  }
  if (!row.id || typeof row.id !== "string" || !row.id.trim())
    errors.push("missing_id");
  if (!row.projectId || typeof row.projectId !== "string" || !row.projectId.trim())
    errors.push("missing_project_id");
  if (!row.marketCode || typeof row.marketCode !== "string" || !row.marketCode.trim())
    errors.push("missing_market");
  if (!row.materialKey || typeof row.materialKey !== "string" || !row.materialKey.trim())
    errors.push("missing_material");
  if (!row.unit || typeof row.unit !== "string" || !row.unit.trim())
    errors.push("missing_unit");
  if (typeof row.estimatedQuantity !== "number" || !finitePositive(row.estimatedQuantity))
    errors.push("invalid_estimated_quantity");
  if (typeof row.actualQuantity !== "number" || !finitePositive(row.actualQuantity))
    errors.push("invalid_actual_quantity");
  if (row.context !== "takeoff") errors.push("safety_sensitive_context");
  if (row.status !== "accepted") errors.push("not_accepted");
  if (row.evidence === "verified_project") {
    if (!row.evidenceReference || typeof row.evidenceReference !== "string" || !row.evidenceReference.trim()) {
      errors.push("missing_evidence_reference");
    } else if (row.evidenceReference.trim().length < 3) {
      errors.push("invalid_evidence_reference_too_short");
    }
    if (!row.reviewerId || typeof row.reviewerId !== "string" || !row.reviewerId.trim() || !row.reviewedAt) {
      errors.push("missing_review_record");
    }
  }
  if (!row.recordedAt || typeof row.recordedAt !== "string" || Number.isNaN(Date.parse(row.recordedAt)))
    errors.push("invalid_recorded_at");
  return errors;
}

/**
 * Computes non-parametric Hodges-Lehmann location estimator:
 * median of all pairwise Walsh averages (r_i + r_j) / 2.
 * Highly robust to asymmetric skew and heavy-tailed jobsite anomalies.
 */
export function computeHodgesLehmann(ratios: number[]): number | null {
  if (!ratios.length) return null;
  const pairwise: number[] = [];
  for (let i = 0; i < ratios.length; i++) {
    for (let j = i; j < ratios.length; j++) {
      pairwise.push((ratios[i] + ratios[j]) / 2);
    }
  }
  pairwise.sort((a, b) => a - b);
  return quantile(pairwise, 0.5);
}

/**
 * Computes symmetric trimmed mean with Tukey IQR outlier filtering.
 * Discards observations outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR], then trims 20% tails.
 */
export function computeTrimmedMean(
  ratios: number[],
  trimFraction = 0.2,
): number | null {
  if (!ratios.length) return null;
  const sorted = [...ratios].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inliers = sorted.filter((x) => x >= lowerFence && x <= upperFence);
  if (!inliers.length) return null;
  if (inliers.length >= 5) {
    const trimCount = Math.floor(inliers.length * trimFraction);
    const trimmed = inliers.slice(trimCount, inliers.length - trimCount);
    if (!trimmed.length) return null;
    const sum = trimmed.reduce((a, b) => a + b, 0);
    return sum / trimmed.length;
  }
  const sum = inliers.reduce((a, b) => a + b, 0);
  return sum / inliers.length;
}

/**
 * Computes cross-project dispersion, concentration (HHI), and between-project consistency.
 * Prevents a single contractor or atypical jobsite from dominating multipliers.
 */
export function computeProjectDispersion(
  rows: Array<{ projectId: string; ratio: number }>,
): {
  hhi: number;
  interProjectCV: number;
  distinctProjects: number;
} {
  if (!rows.length) {
    return { hhi: 0, interProjectCV: 0, distinctProjects: 0 };
  }
  const projectRatios = new Map<string, number[]>();
  for (const r of rows) {
    const list = projectRatios.get(r.projectId) ?? [];
    list.push(r.ratio);
    projectRatios.set(r.projectId, list);
  }
  const total = rows.length;
  let hhi = 0;
  const projectMeans: number[] = [];
  for (const list of projectRatios.values()) {
    const share = list.length / total;
    hhi += share * share;
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    projectMeans.push(avg);
  }
  const pCount = projectMeans.length;
  let interProjectCV = 0;
  if (pCount > 1) {
    const grandMean = projectMeans.reduce((a, b) => a + b, 0) / pCount;
    const variance =
      projectMeans.reduce((sum, m) => sum + (m - grandMean) ** 2, 0) /
      (pCount - 1);
    const sd = Math.sqrt(variance);
    interProjectCV = grandMean > 0 ? sd / grandMean : 0;
  }
  return {
    hhi: Math.round(hhi * 1000) / 1000,
    interProjectCV: Math.round(interProjectCV * 1000) / 1000,
    distinctProjects: pCount,
  };
}

/**
 * Matches material to verified construction physics domain rules.
 */
export function resolveDomainPhysicsRule(
  materialKey: string,
  measure: CalibrationMeasure,
): DomainPhysicsBounds {
  if (measure === "labour") return DOMAIN_PHYSICS_RULES.labour;
  const key = materialKey.toLowerCase().trim();
  if (
    key.includes("concrete") ||
    key.includes("slab") ||
    key.includes("screed") ||
    key.includes("mortar") ||
    key.includes("increte")
  ) {
    return DOMAIN_PHYSICS_RULES.concrete;
  }
  if (
    key.includes("block") ||
    key.includes("brick") ||
    key.includes("sandcrete") ||
    key.includes("masonry")
  ) {
    return DOMAIN_PHYSICS_RULES.masonry;
  }
  if (
    key.includes("steel") ||
    key.includes("rebar") ||
    key.includes("iron") ||
    key.includes("reinforc")
  ) {
    return DOMAIN_PHYSICS_RULES.steel;
  }
  if (
    key.includes("paint") ||
    key.includes("coating") ||
    key.includes("sealer") ||
    key.includes("stain")
  ) {
    return DOMAIN_PHYSICS_RULES.finishes_paint;
  }
  if (
    key.includes("drywall") ||
    key.includes("plaster") ||
    key.includes("gypsum") ||
    key.includes("board")
  ) {
    return DOMAIN_PHYSICS_RULES.finishes_drywall;
  }
  if (
    key.includes("tile") ||
    key.includes("ceramic") ||
    key.includes("porcelain")
  ) {
    return DOMAIN_PHYSICS_RULES.finishes_tile;
  }
  if (
    key.includes("earth") ||
    key.includes("excavat") ||
    key.includes("trench") ||
    key.includes("soil")
  ) {
    return DOMAIN_PHYSICS_RULES.earthwork;
  }
  return DOMAIN_PHYSICS_RULES.default;
}

/**
 * Generates a deterministic hash fingerprint across snapshot inputs and results.
 */
export function calculateDeterministicFingerprint(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `fp_${part1}${part2}`;
}

/**
 * Autonomous Triple-Check Multiplier Verification Engine.
 *
 * Runs 3 independent verification suites:
 * 1. Tri-Estimator Convergence: Checks that EMA, Hodges-Lehmann, and Trimmed Mean
 *    converge within consensusMaxDelta.
 * 2. Cross-Project Diversity & Non-Concentration: Evaluates HHI <= maxHhi and CV <= maxInterProjectCV.
 * 3. Domain Physics & Boundary Safety: Ensures multiplier respects physical construction
 *    laws, mass conservation, and maximum single-step adjustments.
 *
 * If all 3 pass, automatically signs and constructs an official CalibrationApproval!
 */
export function verifyTripleCheckConsensus(
  eligibleRows: CalibrationFeedback[],
  marketCode: string,
  materialKey: string,
  measure: CalibrationMeasure,
  policy: TripleCheckPolicy = DEFAULT_TRIPLE_CHECK_POLICY,
): TripleCheckResult {
  const blockers: string[] = [];
  const diagnostics: string[] = [];

  const ratios = eligibleRows.map(
    (r) => r.actualQuantity / r.estimatedQuantity,
  );
  const physicsRule = resolveDomainPhysicsRule(materialKey, measure);

  if (eligibleRows.length < policy.minObservations) {
    blockers.push("insufficient_observations");
  }

  // Estimator A: EMA with recency weighting
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
  const emaVal = ema !== null ? Math.round(ema * 10000) / 10000 : null;

  // Estimator B: Hodges-Lehmann location estimator
  const hlRaw = computeHodgesLehmann(ratios);
  const hlVal =
    hlRaw !== null
      ? Math.round(
          clamp(
            hlRaw,
            1 - policy.maxAdjustmentFraction,
            1 + policy.maxAdjustmentFraction,
          ) * 10000,
        ) / 10000
      : null;

  // Estimator C: 20% Symmetric Trimmed Mean with IQR outlier pruning
  const tmRaw = computeTrimmedMean(ratios, 0.2);
  const tmVal =
    tmRaw !== null
      ? Math.round(
          clamp(
            tmRaw,
            1 - policy.maxAdjustmentFraction,
            1 + policy.maxAdjustmentFraction,
          ) * 10000,
        ) / 10000
      : null;

  // Check 1: Statistical Triangulation Consensus
  let maxPairwiseDelta: number | null = null;
  let consensusReached = false;
  if (emaVal !== null && hlVal !== null && tmVal !== null) {
    const d1 = Math.abs(emaVal - hlVal);
    const d2 = Math.abs(hlVal - tmVal);
    const d3 = Math.abs(emaVal - tmVal);
    maxPairwiseDelta = Math.round(Math.max(d1, d2, d3) * 10000) / 10000;
    if (maxPairwiseDelta <= policy.consensusMaxDelta) {
      consensusReached = true;
    } else {
      blockers.push("estimator_consensus_divergence");
      diagnostics.push(
        `Estimators diverged by ${maxPairwiseDelta.toFixed(4)} (max allowed: ${policy.consensusMaxDelta}).`,
      );
    }
  } else {
    blockers.push("insufficient_estimator_inputs");
  }

  // Check 2: Cross-Project Dispersion and Independence
  const dispersion = computeProjectDispersion(
    eligibleRows.map((r) => ({
      projectId: r.projectId,
      ratio: r.actualQuantity / r.estimatedQuantity,
    })),
  );
  let projectDiversityPassed = true;
  if (dispersion.distinctProjects < policy.minDistinctProjects) {
    projectDiversityPassed = false;
    blockers.push("insufficient_distinct_projects");
  }
  if (dispersion.hhi > policy.maxHhi) {
    projectDiversityPassed = false;
    blockers.push("project_concentration_high");
    diagnostics.push(
      `HHI concentration ${dispersion.hhi.toFixed(3)} exceeds threshold ${policy.maxHhi}. A single project dominates sample.`,
    );
  }
  if (
    dispersion.distinctProjects > 1 &&
    dispersion.interProjectCV > policy.maxInterProjectCV
  ) {
    projectDiversityPassed = false;
    blockers.push("high_inter_project_variance");
    diagnostics.push(
      `Inter-project CV ${dispersion.interProjectCV.toFixed(3)} exceeds threshold ${policy.maxInterProjectCV}. Effect is site-specific, not universal.`,
    );
  }

  const verifiedCount = eligibleRows.filter(
    (r) => r.evidence === "verified_project",
  ).length;
  const verifiedShare = eligibleRows.length
    ? verifiedCount / eligibleRows.length
    : 0;
  if (policy.requireVerifiedEvidence) {
    if (verifiedCount < policy.minVerifiedObservations) {
      blockers.push("insufficient_verified_observations");
    }
    if (verifiedShare < policy.minVerifiedShare) {
      blockers.push("verified_share_too_low");
    }
  }

  // Synthesize consensus multiplier: weighted blend of estimators
  let consensusMultiplier: number | null = null;
  if (emaVal !== null && hlVal !== null && tmVal !== null) {
    const rawBlend = 0.4 * hlVal + 0.35 * emaVal + 0.25 * tmVal;
    consensusMultiplier = Math.round(rawBlend * 10000) / 10000;
  }

  // Check 3: Domain Construction Physics & Wastage Bounds
  let physicalBoundsPassed = true;
  if (consensusMultiplier !== null) {
    if (
      consensusMultiplier < physicsRule.minMultiplier ||
      consensusMultiplier > physicsRule.maxMultiplier
    ) {
      physicalBoundsPassed = false;
      blockers.push("violates_physical_bounds");
      diagnostics.push(
        `Multiplier ${consensusMultiplier} violates physical limits [${physicsRule.minMultiplier}, ${physicsRule.maxMultiplier}] for ${physicsRule.category}.`,
      );
    }
    const deltaFromBase = Math.abs(consensusMultiplier - 1);
    if (deltaFromBase > physicsRule.maxAdjustmentDelta) {
      physicalBoundsPassed = false;
      blockers.push("exceeds_cycle_adjustment_limit");
      diagnostics.push(
        `Adjustment ${deltaFromBase.toFixed(4)} exceeds single-cycle limit ${physicsRule.maxAdjustmentDelta}.`,
      );
    }
  } else {
    physicalBoundsPassed = false;
  }

  const passed =
    blockers.length === 0 &&
    consensusReached &&
    projectDiversityPassed &&
    physicalBoundsPassed &&
    consensusMultiplier !== null;

  // Build canonical fingerprint
  const canonicalString = [
    marketCode.toUpperCase(),
    materialKey.toLowerCase(),
    measure,
    eligibleRows
      .map(
        (r) =>
          `${r.id}:${r.recordedAt}:${r.actualQuantity / r.estimatedQuantity}`,
      )
      .join(";"),
    policy.consensusMaxDelta,
    policy.maxHhi,
    consensusMultiplier ?? 0,
  ].join("|");
  const fingerprint = calculateDeterministicFingerprint(canonicalString);

  const candidateKey = `${marketCode.toUpperCase()}:${materialKey.toLowerCase()}:${measure}`;

  // Autonomous Approval generation when triple-check passes
  let approval: CalibrationApproval | null = null;
  if (passed && consensusMultiplier !== null) {
    approval = {
      candidateKey,
      decision: "approved",
      reviewerId: "autonomous_triple_check_verifier_v1",
      reviewedAt: new Date().toISOString(),
      reason: `Triple-check verified: Tri-estimator consensus Δ=${maxPairwiseDelta?.toFixed(4) ?? "0.0000"} <= ${policy.consensusMaxDelta}, Project HHI=${dispersion.hhi.toFixed(3)} <= ${policy.maxHhi}, CV=${dispersion.interProjectCV.toFixed(3)} <= ${policy.maxInterProjectCV}, Domain physics bounded within [${physicsRule.minMultiplier}, ${physicsRule.maxMultiplier}].`,
      candidateFingerprint: fingerprint,
    };
  }

  return {
    passed,
    consensusReached,
    projectDiversityPassed,
    physicalBoundsPassed,
    estimators: {
      ema: emaVal,
      hodgesLehmann: hlVal,
      trimmedMean: tmVal,
      maxPairwiseDelta,
    },
    dispersion,
    physics: {
      category: physicsRule.category,
      bounds: [physicsRule.minMultiplier, physicsRule.maxMultiplier],
      evaluatedMultiplier: consensusMultiplier,
    },
    consensusMultiplier,
    fingerprint,
    approval,
    blockers,
    diagnostics,
  };
}

/**
 * Calculates a candidate from accepted, comparable feedback.
 * Automatically runs the Triple-Check Verification Engine.
 */
export function computeCandidateFingerprint(
  candidate: Pick<CalibrationCandidate, "marketCode" | "materialKey" | "measure"> & {
    unit?: string;
    observationCount?: number;
    medianMultiplier?: number | null;
    proposedMultiplier?: number | null;
    tripleCheck?: TripleCheckResult;
  },
  eligibleRows: CalibrationFeedback[],
): string {
  const sortedIds = eligibleRows.map((r) => r.id).sort().join(",");
  const mult =
    candidate.tripleCheck?.consensusMultiplier ??
    candidate.medianMultiplier ??
    candidate.proposedMultiplier ??
    1.0;
  const unit = candidate.unit || "unit";
  const obs = candidate.observationCount ?? eligibleRows.length;
  const raw = `${candidate.marketCode.toUpperCase()}:${candidate.materialKey.toLowerCase()}:${candidate.measure}:${unit.toLowerCase()}:${mult}:${obs}:${sortedIds}`;
  return calculateDeterministicFingerprint(raw);
}

export function buildCalibrationCandidate(
  rows: CalibrationFeedback[],
  marketCode: string,
  materialKey: string,
  measure: CalibrationMeasure,
  unitOrPolicy?: string | CalibrationPolicy,
  maybePolicy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): CalibrationCandidate {
  let unitFilter: string | undefined = undefined;
  let policy: CalibrationPolicy = maybePolicy;

  if (typeof unitOrPolicy === "string") {
    unitFilter = unitOrPolicy.trim().toLowerCase();
  } else if (unitOrPolicy && typeof unitOrPolicy === "object") {
    policy = unitOrPolicy;
  }

  const normMarket = typeof marketCode === "string" ? marketCode.toUpperCase().trim() : "";
  const normMaterial = typeof materialKey === "string" ? materialKey.toLowerCase().trim() : "";

  const eligibleRows = (Array.isArray(rows) ? rows : [])
    .filter((r) => {
      if (!r || typeof r !== "object") return false;
      if (typeof r.marketCode !== "string" || r.marketCode.toUpperCase().trim() !== normMarket) return false;
      if (typeof r.materialKey !== "string" || r.materialKey.toLowerCase().trim() !== normMaterial) return false;
      if (r.measure !== measure) return false;
      if (unitFilter && typeof r.unit === "string" && r.unit.toLowerCase().trim() !== unitFilter) return false;
      return validateCalibrationFeedback(r).length === 0;
    })
    .filter((r, i, all) => all.findIndex((other) => other.id === r.id) === i)
    .sort((a, b) => {
      const tA = Date.parse(a.recordedAt);
      const tB = Date.parse(b.recordedAt);
      const diff = (Number.isNaN(tA) ? 0 : tA) - (Number.isNaN(tB) ? 0 : tB);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

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

  // Check valid market
  if (!normMarket || normMarket === "UNKNOWN" || normMarket === "UNASSIGNED" || !VALID_MARKET_CODES.has(normMarket)) {
    blockers.push("invalid_or_unassigned_market");
  }

  if (eligibleRows.length < policy.minObservations)
    blockers.push("insufficient_observations");
  if (projects.size < policy.minDistinctProjects)
    blockers.push("insufficient_distinct_projects");
  if (verifiedCount < policy.minVerifiedObservations)
    blockers.push("insufficient_verified_observations");
  if (verifiedShare < policy.minVerifiedShare)
    blockers.push("verified_share_too_low");

  // Run autonomous triple-check verification
  const triplePolicy: TripleCheckPolicy = {
    ...policy,
    consensusMaxDelta:
      "consensusMaxDelta" in policy
        ? (policy as TripleCheckPolicy).consensusMaxDelta
        : DEFAULT_TRIPLE_CHECK_POLICY.consensusMaxDelta,
    maxHhi:
      "maxHhi" in policy
        ? (policy as TripleCheckPolicy).maxHhi
        : DEFAULT_TRIPLE_CHECK_POLICY.maxHhi,
    maxInterProjectCV:
      "maxInterProjectCV" in policy
        ? (policy as TripleCheckPolicy).maxInterProjectCV
        : DEFAULT_TRIPLE_CHECK_POLICY.maxInterProjectCV,
    requireVerifiedEvidence:
      "requireVerifiedEvidence" in policy
        ? (policy as TripleCheckPolicy).requireVerifiedEvidence
        : DEFAULT_TRIPLE_CHECK_POLICY.requireVerifiedEvidence,
  };

  const tripleCheck = verifyTripleCheckConsensus(
    eligibleRows,
    normMarket,
    normMaterial,
    measure,
    triplePolicy,
  );

  const candidateUnit = unitFilter || (eligibleRows[0]?.unit ? eligibleRows[0].unit.trim() : "unit");

  const primaryMultiplier =
    tripleCheck.passed && tripleCheck.consensusMultiplier !== null
      ? tripleCheck.consensusMultiplier
      : boundedMedian !== null
        ? Math.round(boundedMedian * 10000) / 10000
        : null;

  return {
    marketCode: normMarket,
    materialKey: normMaterial,
    measure,
    unit: candidateUnit,
    observationCount: eligibleRows.length,
    distinctProjectCount: projects.size,
    verifiedObservationCount: verifiedCount,
    verifiedShare: Math.round(verifiedShare * 10000) / 10000,
    proposedMultiplier: primaryMultiplier,
    medianMultiplier:
      boundedMedian === null ? null : Math.round(boundedMedian * 10000) / 10000,
    eligible: blockers.length === 0,
    blockers,
    observedAt: eligibleRows.length
      ? eligibleRows[eligibleRows.length - 1].recordedAt
      : null,
    tripleCheck,
    verifiedAndApproved: tripleCheck.passed,
  };
}

/**
 * Executes programmable auto-approval on verified candidate multipliers.
 * When the candidate passes triple-check consensus, produces an authorized
 * CalibrationApproval that can be directly resolved and activated.
 */
export function autoApproveVerifiedCandidate(
  candidate: CalibrationCandidate,
  rows: CalibrationFeedback[],
  policy: TripleCheckPolicy = DEFAULT_TRIPLE_CHECK_POLICY,
): { candidate: CalibrationCandidate; approval: CalibrationApproval | null } {
  const normMarket = candidate.marketCode.toUpperCase();
  const normMaterial = candidate.materialKey.toLowerCase();
  const normUnit = candidate.unit ? candidate.unit.toLowerCase().trim() : undefined;

  const eligibleRows = (Array.isArray(rows) ? rows : [])
    .filter(
      (r) =>
        r &&
        typeof r.marketCode === "string" &&
        r.marketCode.toUpperCase() === normMarket &&
        typeof r.materialKey === "string" &&
        r.materialKey.toLowerCase() === normMaterial &&
        r.measure === candidate.measure &&
        (!normUnit || (typeof r.unit === "string" && r.unit.toLowerCase().trim() === normUnit)) &&
        validateCalibrationFeedback(r).length === 0,
    )
    .filter((r, i, all) => all.findIndex((other) => other.id === r.id) === i)
    .sort((a, b) => {
      const tA = Date.parse(a.recordedAt);
      const tB = Date.parse(b.recordedAt);
      const diff = (Number.isNaN(tA) ? 0 : tA) - (Number.isNaN(tB) ? 0 : tB);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

  const result = verifyTripleCheckConsensus(
    eligibleRows,
    candidate.marketCode,
    candidate.materialKey,
    candidate.measure,
    policy,
  );

  const fingerprint = computeCandidateFingerprint(
    { ...candidate, tripleCheck: result },
    eligibleRows,
  );

  let approval: CalibrationApproval | null = null;
  if (result.passed && result.consensusMultiplier !== null) {
    approval = {
      candidateKey: calibrationCandidateKey(candidate),
      decision: "approved",
      reviewerId: "triple_check_consensus_engine",
      reviewedAt: new Date().toISOString(),
      reason: `Consensus verified across EMA (${result.estimators.ema}), Hodges-Lehmann (${result.estimators.hodgesLehmann}), and Trimmed Mean (${result.estimators.trimmedMean}) with spread ${(result.estimators.maxPairwiseDelta ?? 0) * 100}%`,
      candidateFingerprint: fingerprint,
    };
  }

  const updatedCandidate: CalibrationCandidate = {
    ...candidate,
    tripleCheck: {
      ...result,
      fingerprint,
      approval: approval ?? null,
    },
    verifiedAndApproved: result.passed,
    proposedMultiplier:
      result.passed && result.consensusMultiplier !== null
        ? result.consensusMultiplier
        : candidate.proposedMultiplier,
  };

  return {
    candidate: updatedCandidate,
    approval,
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
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): ConfidenceRange | null {
  if (!finitePositive(baseQuantity) || !unit || typeof unit !== "string" || !unit.trim()) return null;
  const normMarket = typeof marketCode === "string" ? marketCode.toUpperCase().trim() : "";
  const normMaterial = typeof materialKey === "string" ? materialKey.toLowerCase().trim() : "";
  const normUnit = unit.trim().toLowerCase();

  const eligibleRows = (Array.isArray(rows) ? rows : [])
    .filter(
      (r) =>
        r &&
        typeof r.marketCode === "string" &&
        r.marketCode.toUpperCase().trim() === normMarket &&
        typeof r.materialKey === "string" &&
        r.materialKey.toLowerCase().trim() === normMaterial &&
        r.measure === measure &&
        typeof r.unit === "string" &&
        r.unit.trim().toLowerCase() === normUnit &&
        validateCalibrationFeedback(r).length === 0,
    )
    .filter((r, i, all) => all.findIndex((other) => other.id === r.id) === i);

  // Require minimum observations (at least 3)
  const minObs = Math.min(3, policy.minObservations);
  if (eligibleRows.length < minObs) return null;

  // Clamp ratios to policy bounds (winsorizing extreme anomalies)
  const minBound = 1 - policy.maxAdjustmentFraction;
  const maxBound = 1 + policy.maxAdjustmentFraction;
  const ratios = eligibleRows
    .map((r) => clamp(r.actualQuantity / r.estimatedQuantity, minBound, maxBound))
    .sort((a, b) => a - b);

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
  if (candidate.tripleCheck?.passed && candidate.tripleCheck.consensusMultiplier !== null) {
    return candidate.tripleCheck.consensusMultiplier;
  }
  return candidate.medianMultiplier ?? candidate.proposedMultiplier;
}

export function calibrationCandidateKey(
  candidate: Pick<
    CalibrationCandidate,
    "marketCode" | "materialKey" | "measure"
  > & { unit?: string },
): string {
  const normMarket = typeof candidate.marketCode === "string" ? candidate.marketCode.toUpperCase().trim() : "";
  const normMaterial = typeof candidate.materialKey === "string" ? candidate.materialKey.toLowerCase().trim() : "";
  const unitPart = candidate.unit ? `:${candidate.unit.toLowerCase().trim()}` : "";
  return `${normMarket}:${normMaterial}:${candidate.measure}${unitPart}`;
}

/** Deterministic current-vs-shadow comparison for canary evaluation. */
export function compareShadowEstimate(
  baseQuantity: number,
  proposedMultiplier: number | null,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): {
  baseline: number;
  shadow: number;
  delta: number;
  deltaFraction: number | null;
} {
  const baseline =
    Number.isFinite(baseQuantity) && baseQuantity > 0 ? baseQuantity : 0;
  const minClamp = Math.max(0.1, 1 - policy.maxAdjustmentFraction);
  const maxClamp = 1 + policy.maxAdjustmentFraction;
  const multiplier =
    proposedMultiplier !== null && Number.isFinite(proposedMultiplier)
      ? clamp(proposedMultiplier, minClamp, maxClamp)
      : 1;
  const shadow = Math.round(baseline * multiplier * 1000) / 1000;
  return {
    baseline,
    shadow,
    delta: Math.round((shadow - baseline) * 1000) / 1000,
    deltaFraction: baseline > 0 ? (shadow - baseline) / baseline : null,
  };
}

/**
 * Multi-Standard International Construction Classification Directory.
 * Fully supports MasterFormat, UniFormat II, Uniclass 2015, NRM2, DIN 276,
 * NATSPEC, and SANS 1200 across global markets.
 */
interface GlobalClassificationEntry {
  terms: string[];
  category: string;
  masterFormat: { code: string; title: string; division: string };
  uniFormat: { code: string; title: string };
  uniclass2015: { code: string; title: string };
  nrm2: { code: string; title: string };
  din276: { code: string; title: string };
  natspec?: { code: string; title: string };
  sans1200?: { code: string; title: string };
}

const GLOBAL_CLASSIFICATION_CATALOG: GlobalClassificationEntry[] = [
  {
    terms: [
      "concrete block",
      "sandcrete block",
      "cinder block",
      "hollow block",
      "block",
      "brick",
      "masonry",
      "sandcrete",
      "mortar",
    ],
    category: "masonry",
    masterFormat: {
      code: "04 20 00",
      title: "Unit Masonry",
      division: "04",
    },
    uniFormat: { code: "B2010", title: "Exterior Walls" },
    uniclass2015: {
      code: "Ss_25_10_30_50",
      title: "Masonry wall structure systems",
    },
    nrm2: { code: "Section 14", title: "Masonry" },
    din276: { code: "331.1", title: "Mauerwerk Außenwände" },
    natspec: { code: "0331", title: "Brick and block masonry" },
    sans1200: { code: "1200 JS", title: "Masonry" },
  },
  {
    terms: [
      "steel door",
      "metal door",
      "timber door",
      "glass door",
      "fire door",
      "sliding door",
      "aluminum window",
      "door",
      "window",
      "glazing",
      "frame",
      "shutter",
    ],
    category: "openings",
    masterFormat: {
      code: "08 00 00",
      title: "Openings",
      division: "08",
    },
    uniFormat: { code: "B2020", title: "Exterior Windows / Doors" },
    uniclass2015: {
      code: "Ss_25_30_95",
      title: "Window and glazed screen systems",
    },
    nrm2: { code: "Section 24", title: "Windows, screens and lights" },
    din276: { code: "334", title: "Außentüren und -fenster" },
    natspec: { code: "0451", title: "Windows and glazed doors" },
    sans1200: { code: "1200 ME", title: "Joinery & ironmongery" },
  },
  {
    terms: [
      "ready mix concrete",
      "in-situ concrete",
      "stamped concrete",
      "concrete slab",
      "concrete",
      "slab",
      "cement",
      "rebar",
      "reinforcement",
      "increte",
      "footing",
    ],
    category: "concrete",
    masterFormat: {
      code: "03 30 00",
      title: "Cast-in-Place Concrete",
      division: "03",
    },
    uniFormat: { code: "B1010", title: "Floor Construction" },
    uniclass2015: {
      code: "Ss_20_10_75_15",
      title: "In-situ concrete floor structure systems",
    },
    nrm2: { code: "Section 11", title: "In situ concrete works" },
    din276: { code: "331", title: "Tragende Außenwände / Betonbau" },
    natspec: { code: "0310", title: "Concrete" },
    sans1200: { code: "1200 G", title: "Concrete (structural)" },
  },
  {
    terms: [
      "structural steel",
      "steel framing",
      "steel beam",
      "steel",
      "metal",
      "beam",
      "truss",
      "framing",
    ],
    category: "steel",
    masterFormat: {
      code: "05 12 00",
      title: "Structural Steel Framing",
      division: "05",
    },
    uniFormat: { code: "B1010", title: "Floor Construction / Framing" },
    uniclass2015: {
      code: "Ss_20_10_75_80",
      title: "Structural steel frame systems",
    },
    nrm2: { code: "Section 13", title: "Structural steelwork" },
    din276: { code: "334", title: "Stahlbau Außenwände / Tragwerk" },
    natspec: { code: "0511", title: "Structural steel" },
    sans1200: { code: "1200 H", title: "Structural steelwork" },
  },
  {
    terms: ["roof", "waterproof", "insulation", "membrane", "shingle"],
    category: "thermal_moisture",
    masterFormat: {
      code: "07 00 00",
      title: "Thermal and Moisture Protection",
      division: "07",
    },
    uniFormat: { code: "B3010", title: "Roof Construction" },
    uniclass2015: {
      code: "Ss_30_10_30",
      title: "Roof covering systems",
    },
    nrm2: { code: "Section 23", title: "Roof coverings" },
    din276: { code: "361", title: "Dachbeläge und Dämmung" },
    natspec: { code: "0421", title: "Roofing" },
    sans1200: { code: "1200 HB", title: "Waterproofing" },
  },
  {
    terms: [
      "floor tile",
      "wall tile",
      "ceramic tile",
      "porcelain tile",
      "pop ceiling",
      "plaster of paris",
      "paint",
      "tile",
      "screed",
      "plaster",
      "ceiling",
      "finish",
      "drywall",
      "gypsum",
    ],
    category: "finishes",
    masterFormat: {
      code: "09 00 00",
      title: "Finishes",
      division: "09",
    },
    uniFormat: { code: "C3020", title: "Floor Finishes / Wall Finishes" },
    uniclass2015: {
      code: "Ss_30_42",
      title: "Floor tile screed systems / finishes",
    },
    nrm2: { code: "Section 29", title: "Painting and clear finishes" },
    din276: { code: "352", title: "Bodenbeläge / Innenwandbekleidungen" },
    natspec: { code: "0611", title: "Painting and plastering" },
    sans1200: { code: "1200 G", title: "Finishes" },
  },
  {
    terms: ["plumb", "pipe", "valve", "drain", "sanitary", "sewer"],
    category: "plumbing",
    masterFormat: {
      code: "22 00 00",
      title: "Plumbing",
      division: "22",
    },
    uniFormat: { code: "D20", title: "Plumbing" },
    uniclass2015: {
      code: "Ss_55_70_38",
      title: "Sanitary appliance systems",
    },
    nrm2: { code: "Section 34", title: "Water supply" },
    din276: { code: "410", title: "Abwasser-, Wasser-, Gasanlagen" },
    natspec: { code: "0811", title: "Sanitary plumbing" },
    sans1200: { code: "1200 L", title: "Medium-pressure pipelines" },
  },
  {
    terms: ["electric", "wire", "conduit", "solar", "panel", "switch"],
    category: "electrical",
    masterFormat: {
      code: "26 00 00",
      title: "Electrical",
      division: "26",
    },
    uniFormat: { code: "D50", title: "Electrical" },
    uniclass2015: {
      code: "Ss_70_80",
      title: "Electrical power generation & distribution",
    },
    nrm2: { code: "Section 38", title: "Electrical supply and lighting" },
    din276: { code: "440", title: "Starkstromanlagen" },
    natspec: { code: "0911", title: "Cable and conduit" },
    sans1200: { code: "1200 LC", title: "Cable ducts" },
  },
  {
    terms: ["earth", "excavat", "foundation", "grading", "trench"],
    category: "earthwork",
    masterFormat: {
      code: "31 00 00",
      title: "Earthwork",
      division: "31",
    },
    uniFormat: { code: "G1030", title: "Site Earthwork" },
    uniclass2015: {
      code: "Ss_15_10_30",
      title: "Excavation & earth retention systems",
    },
    nrm2: { code: "Section 5", title: "Excavating and filling" },
    din276: { code: "320", title: "Gründung, Unterbau, Erdarbeiten" },
    natspec: { code: "0221", title: "Excavation and filling" },
    sans1200: { code: "1200 D", title: "Earthworks" },
  },
];

/**
 * Returns primary classification standard for a market.
 */
export function getPrimaryClassificationForMarket(marketCode: string): {
  standard: string;
  description: string;
} {
  const code = (marketCode || "").toUpperCase().trim();
  switch (code) {
    case "GB":
      return {
        standard: "Uniclass 2015 / NRM2",
        description:
          "UK standard BIM classification & RICS New Rules of Measurement",
      };
    case "DE":
      return {
        standard: "DIN 276:2018",
        description: "German standard cost structure for construction",
      };
    case "AU":
      return {
        standard: "NATSPEC / Uniclass 2015",
        description: "National Australian Construction Specification",
      };
    case "SG":
      return {
        standard: "Uniclass 2015 (BCA)",
        description:
          "Singapore Building and Construction Authority BIM standard",
      };
    case "AE":
    case "SA":
    case "QA":
      return {
        standard: "NRM2 / Uniclass 2015",
        description: "Middle East RICS Bill of Quantities standard",
      };
    case "ZA":
      return {
        standard: "SANS 1200 / CESMM4",
        description: "South African National Standards for Civil Engineering",
      };
    case "IN":
      return {
        standard: "CPWD / IS 1200",
        description: "Indian Central PWD Schedule & Bureau of Indian Standards",
      };
    case "BR":
      return {
        standard: "SINAPI / NBR 12721",
        description: "Brazilian National Construction Index & Technical Norms",
      };
    case "US":
    case "CA":
    default:
      return {
        standard: "CSI MasterFormat / UniFormat II",
        description:
          "North American industry standard WBS & elemental cost coding",
      };
  }
}

/**
 * Resolves comprehensive global classification codes with specificity scoring
 * to eliminate substring false-positives (e.g. steel door -> openings; concrete block -> masonry).
 */
export function resolveGlobalClassification(
  tradeOrItem: string,
  marketCode: string,
): GlobalClassification | null {
  const normalized = (tradeOrItem || "").toLowerCase().trim();
  if (!normalized) return null;
  const queryWords = normalized.split(/\s+/);
  const headWord = queryWords[queryWords.length - 1];

  let bestEntry: GlobalClassificationEntry | null = null;
  let bestScore = 0;

  for (const entry of GLOBAL_CLASSIFICATION_CATALOG) {
    let score = 0;
    for (const term of entry.terms) {
      const termLower = term.toLowerCase().trim();
      const termWords = termLower.split(/\s+/);
      if (termWords.length > 1) {
        if (normalized === termLower) {
          score += 100 + termLower.length;
        } else if (normalized.includes(termLower)) {
          score += 60 + termLower.length;
        }
      } else {
        if (headWord === termLower || headWord.startsWith(termLower)) {
          score += 35;
        } else if (queryWords.some((w) => w === termLower || w.startsWith(termLower) || (termLower.length >= 4 && w.includes(termLower)))) {
          score += 20;
        } else if (normalized.includes(termLower)) {
          score += 10;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore <= 0) return null;

  const marketStandard = getPrimaryClassificationForMarket(marketCode);
  let primaryCode = bestEntry.masterFormat.code;
  let primaryDescription = bestEntry.masterFormat.title;

  const codeUpper = (marketCode || "").toUpperCase().trim();
  if (codeUpper === "GB" || codeUpper === "SG") {
    primaryCode = bestEntry.uniclass2015.code;
    primaryDescription = bestEntry.uniclass2015.title;
  } else if (codeUpper === "DE") {
    primaryCode = bestEntry.din276.code;
    primaryDescription = bestEntry.din276.title;
  } else if (codeUpper === "AU" && bestEntry.natspec) {
    primaryCode = bestEntry.natspec.code;
    primaryDescription = bestEntry.natspec.title;
  } else if ((codeUpper === "AE" || codeUpper === "SA") && bestEntry.nrm2) {
    primaryCode = bestEntry.nrm2.code;
    primaryDescription = bestEntry.nrm2.title;
  } else if (codeUpper === "ZA" && bestEntry.sans1200) {
    primaryCode = bestEntry.sans1200.code;
    primaryDescription = bestEntry.sans1200.title;
  }

  return {
    tradeOrItem,
    category: bestEntry.category,
    primaryStandardName: marketStandard.standard,
    primaryCode,
    primaryDescription,
    masterFormat: bestEntry.masterFormat,
    uniFormat: bestEntry.uniFormat,
    uniclass2015: bestEntry.uniclass2015,
    nrm2: bestEntry.nrm2,
    din276: bestEntry.din276,
    natspec: bestEntry.natspec,
    sans1200: bestEntry.sans1200,
  };
}

/** Backward-compatible cost code suggester with global classification support */
export function suggestCostCode(
  tradeOrItem: string,
  costType: string,
  marketCode = "US",
): CostCodeDefinition | null {
  const normalized = (tradeOrItem || "").toLowerCase().trim();
  if (!normalized || !costType.trim()) return null;
  const global = resolveGlobalClassification(tradeOrItem, marketCode);
  if (!global) return null;

  return {
    costCode: global.masterFormat.code,
    description: global.masterFormat.title,
    costType: costType.trim().toUpperCase(),
    division: global.masterFormat.division,
    uniFormat: global.uniFormat.code,
    uniclass2015: global.uniclass2015.code,
    nrm2: global.nrm2.code,
    din276: global.din276.code,
    primaryStandard: global.primaryStandardName,
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

export interface GlobalBudgetRow extends ProcoreBudgetRow {
  uniFormat?: string;
  uniclass2015?: string;
  nrm2?: string;
  din276?: string;
  primaryStandard?: string;
  baseQuantity?: number;
  multiplier?: number | null;
  multiplierStatus?:
    "verified_triple_check" | "manual_approved" | "uncalibrated";
}

/** Export useful WBS columns with proper CSV formula injection protection & UTF-8 BOM */
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
    let s = value === null || value === undefined ? "" : String(value);
    // Formula injection mitigation: prefix dangerous Excel leading characters
    if (/^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
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
  return "\uFEFF" + [headers.join(","), ...content].join("\r\n");
}

/**
 * Exports comprehensive global multi-standard WBS budget CSV (Procore + Uniclass + NRM2 + DIN276)
 * with formula injection protection & UTF-8 BOM.
 */
export function exportGlobalBudgetCsv(rows: GlobalBudgetRow[]): string {
  const headers = [
    "Market Standard",
    "Primary Code",
    "CSI MasterFormat",
    "Description",
    "UniFormat II",
    "Uniclass 2015",
    "NRM2 / Regional",
    "DIN 276",
    "Cost Type",
    "UOM",
    "Base Qty",
    "Multiplier",
    "Calibrated Qty",
    "Multiplier Status",
    "Unit Cost",
    "Total Amount",
    "Currency",
    "Market",
    "Price Status",
  ];
  const esc = (value: string | number | null | undefined) => {
    let s = value === null || value === undefined ? "" : String(value);
    // Formula injection mitigation
    if (/^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = rows.map((r) =>
    [
      r.primaryStandard ?? "MasterFormat",
      r.costCode,
      r.costCode,
      r.costCodeDescription,
      r.uniFormat ?? "",
      r.uniclass2015 ?? "",
      r.nrm2 ?? "",
      r.din276 ?? "",
      r.costType,
      r.uom,
      r.baseQuantity ?? r.quantity,
      r.multiplier ?? 1.0,
      r.quantity,
      r.multiplierStatus ?? "uncalibrated",
      r.unitCost,
      r.amount,
      r.currency,
      r.marketCode,
      r.sourceStatus,
    ]
      .map(esc)
      .join(","),
  );
  return "\uFEFF" + [headers.join(","), ...content].join("\r\n");
}
