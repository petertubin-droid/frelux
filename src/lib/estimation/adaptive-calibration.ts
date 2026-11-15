/**
 * Evidence-based estimator calibration and cost coding.
 *
 * A deterministic, local calculation layer. It never edits a base formula or an
 * active market rule. Accepted actuals become a shadow candidate, and a
 * candidate can only be activated after an administrator approves the exact
 * snapshot, identified by its fingerprint.
 *
 * Two rules shape everything here:
 *  - Structural and life-safety quantities are categorically ineligible.
 *  - Evidence is counted per market, material, measure AND unit. Mixing units
 *    (bags with litres, trips with head pans) silently destroys the statistic,
 *    so a unit is part of a candidate's identity, not a label on it.
 */

import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { canonicalMarketCode } from "@/lib/international/market-codes";

export type CalibrationMeasure = "material" | "labour";

/**
 * Evidence tiers. Only an administrator can produce `admin_verified`; an owner
 * reviewing their own record produces `self_attested`, which counts toward
 * volume but never toward the verified quota.
 */
export type CalibrationEvidence = "admin_verified" | "self_attested";

export type CalibrationStatus = "pending_review" | "accepted" | "rejected";

export type CalibrationContext = "takeoff" | "structural" | "compliance";

export type CalibrationSource = "device" | "cloud";

export type ContributorRole =
  | "anonymous"
  | "homeowner"
  | "contractor"
  | "quantity_surveyor"
  | "civil_engineer"
  | "verified_pro"
  | "admin";

export interface CalibrationFeedback {
  id: string;
  projectId: string;
  /** Canonical ISO market code, never a currency or a country name. */
  marketCode: string;
  /** Normalised material or trade key. */
  materialKey: string;
  measure: CalibrationMeasure;
  estimatedQuantity: number;
  actualQuantity: number;
  /** Normalised unit token. Part of the candidate identity. */
  unit: string;
  evidence: CalibrationEvidence;
  /** ISO timestamp of the actual, not of the upload. */
  recordedAt: string;
  /** Prevents structural and compliance recommendations entering learning. */
  context: CalibrationContext;
  status: CalibrationStatus;
  /** Where the record lives: this device, or the cloud table. */
  source: CalibrationSource;
  evidenceReference?: string;
  reviewerId?: string;
  reviewerRole?: "owner" | "admin";
  reviewedAt?: string;
  contributorRole?: ContributorRole;
}

export interface CalibrationPolicy {
  /** Bumped when a numeric threshold changes, so approvals expire with it. */
  version: string;
  minObservations: number;
  minDistinctProjects: number;
  minVerifiedObservations: number;
  minVerifiedShare: number;
  minRangeObservations: number;
  maxAdjustmentFraction: number;
  emaAlpha: number;
  /** Whether to apply IQR outlier rejection to user actuals. Defaults to true. */
  enableIqrOutlierFilter?: boolean;
  /** Whether to enforce trade-specific physical material bounds. Defaults to true. */
  enablePhysicalBounds?: boolean;
  /** Whether to weight Quantity Surveyors & Engineers 3x higher. Defaults to true. */
  enableRoleWeighting?: boolean;
}

export const DEFAULT_CALIBRATION_POLICY: Readonly<CalibrationPolicy> =
  Object.freeze({
    version: "2026-11-14.1",
    minObservations: 5,
    minDistinctProjects: 3,
    minVerifiedObservations: 3,
    minVerifiedShare: 0.6,
    minRangeObservations: 3,
    maxAdjustmentFraction: 0.25,
    emaAlpha: 0.25,
    enableIqrOutlierFilter: true,
    enablePhysicalBounds: true,
    enableRoleWeighting: true,
  });

/**
 * Production-strict policy: requires 15 verified observations across 5 projects,
 * tight 20% max adjustment fraction, IQR outlier filtering and physical bounds.
 */
export const STRICT_CALIBRATION_POLICY: Readonly<CalibrationPolicy> =
  Object.freeze({
    version: "2026-11-15.strict",
    minObservations: 15,
    minDistinctProjects: 5,
    minVerifiedObservations: 10,
    minVerifiedShare: 0.7,
    minRangeObservations: 5,
    maxAdjustmentFraction: 0.2,
    emaAlpha: 0.2,
    enableIqrOutlierFilter: true,
    enablePhysicalBounds: true,
    enableRoleWeighting: true,
  });

export type CalibrationBlocker =
  | "insufficient_observations"
  | "insufficient_distinct_projects"
  | "insufficient_verified_observations"
  | "verified_share_too_low"
  | "unsupported_market"
  | "unsupported_unit";

export interface CalibrationCandidate {
  marketCode: string;
  materialKey: string;
  measure: CalibrationMeasure;
  unit: string;
  observationCount: number;
  distinctProjectCount: number;
  verifiedObservationCount: number;
  verifiedShare: number;
  /**
   * The activation statistic: a winsorised median, bounded by policy. This is
   * the only number an approval can release.
   */
  proposedMultiplier: number | null;
  /** Recent-weighted trend. Informational only: never activated. */
  trendMultiplier: number | null;
  /** Interquartile spread of the observations, after winsorising. */
  spread: { p25: number; p75: number } | null;
  eligible: boolean;
  blockers: CalibrationBlocker[];
  observedAt: string | null;
  policyVersion: string;
  /** Stable identity of this snapshot. Approval and audit compare against it. */
  fingerprint: string;
  /** Number of extreme outlier entries discarded by IQR fence. */
  outlierCount?: number;
  /** Specific outlier ratios rejected from the series. */
  outlierRatios?: number[];
  /** Trade-specific physical bounds applied to clamp multipliers. */
  physicalBoundsApplied?: { min: number; max: number };
  /** Unweighted median before trusted pro weighting is applied. */
  unweightedMultiplier?: number | null;
}

export interface ConfidenceRange {
  low: number;
  likely: number;
  high: number;
  unit: string;
  observations: number;
  /** A range from completed project actuals, not a probabilistic guarantee. */
  method: "empirical_quantiles";
  policyVersion: string;
}

export interface CostCodeDefinition {
  costCode: string;
  description: string;
  /** Project cost type, e.g. M/L/E/S or a custom Procore WBS type. */
  costType: string;
  division: string;
  uniFormat?: string;
  /** The classification standard the code comes from. */
  standard: "csi_masterformat";
  /**
   * False when the project's market does not normally adopt this standard, so
   * the UI can say "map this to your own WBS" instead of implying a local code.
   */
  applicableToMarket: boolean;
  marketCode: string | null;
}

export interface CalibrationApproval {
  candidateKey: string;
  decision: "approved" | "rejected";
  reviewerId: string;
  /** Activation is an administrator act. An owner approval cannot release it. */
  reviewerRole: "owner" | "admin";
  reviewedAt: string;
  reason: string;
  candidateFingerprint: string;
  policyVersion: string;
}

export interface AuditEvent {
  id: string;
  entityType: "calibration_candidate" | "cost_code_mapping";
  entityKey: string;
  action:
    | "proposed"
    | "approved"
    | "rejected"
    | "activated"
    | "mapping_changed"
    | "record_deleted";
  actorId: string;
  occurredAt: string;
  reason: string;
  before?: unknown;
  after?: unknown;
}

/* ------------------------------------------------------------------ */
/* Physical Trade Bounds & Outlier Rejection                          */
/* ------------------------------------------------------------------ */

export interface PhysicalMaterialBounds {
  minMultiplier: number;
  maxMultiplier: number;
  description: string;
}

/**
 * Hard physical bounds for site materials and trades.
 * Even if user actuals skew wildly, these hard clamps refuse to break physics.
 */
export const PHYSICAL_MATERIAL_BOUNDS: Readonly<Record<string, PhysicalMaterialBounds>> =
  Object.freeze({
    paint: {
      minMultiplier: 0.8,
      maxMultiplier: 1.3,
      description: "Paint absorption and site wastage bounds [0.80, 1.30]",
    },
    cement: {
      minMultiplier: 0.85,
      maxMultiplier: 1.25,
      description: "Cement mix density and bag handling bounds [0.85, 1.25]",
    },
    sand: {
      minMultiplier: 0.85,
      maxMultiplier: 1.35,
      description: "Sand compaction, moisture bulking and site loss [0.85, 1.35]",
    },
    granite: {
      minMultiplier: 0.88,
      maxMultiplier: 1.25,
      description: "Granite/aggregate compaction and handling bounds [0.88, 1.25]",
    },
    block: {
      minMultiplier: 0.85,
      maxMultiplier: 1.25,
      description: "Sandcrete block cutting and offloading breakage [0.85, 1.25]",
    },
    tile: {
      minMultiplier: 0.88,
      maxMultiplier: 1.25,
      description: "Tile cutting, diagonal waste and site breakage [0.88, 1.25]",
    },
    reinforcement: {
      minMultiplier: 0.92,
      maxMultiplier: 1.2,
      description: "Rebar cutting, bending and lap length limits [0.92, 1.20]",
    },
    plaster: {
      minMultiplier: 0.85,
      maxMultiplier: 1.3,
      description: "Plaster rebound and substrate roughness limits [0.85, 1.30]",
    },
    "roof-sheet": {
      minMultiplier: 0.92,
      maxMultiplier: 1.18,
      description: "Roofing sheet end and side laps limits [0.92, 1.18]",
    },
    timber: {
      minMultiplier: 0.9,
      maxMultiplier: 1.2,
      description: "Timber cross-cutting and off-cut waste [0.90, 1.20]",
    },
    "pop-ceiling": {
      minMultiplier: 0.85,
      maxMultiplier: 1.25,
      description: "POP casting plaster moulding and frame waste [0.85, 1.25]",
    },
    labour: {
      minMultiplier: 0.7,
      maxMultiplier: 1.4,
      description: "Gang productivity and site speed variance [0.70, 1.40]",
    },
  });

export function getPhysicalBounds(
  materialKey: string,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): { min: number; max: number } {
  const window = policy.maxAdjustmentFraction;
  const policyMin = 1 - window;
  const policyMax = 1 + window;
  if (policy.enablePhysicalBounds === false) {
    return { min: policyMin, max: policyMax };
  }
  const spec = PHYSICAL_MATERIAL_BOUNDS[normaliseMaterialKey(materialKey)];
  if (!spec) {
    return { min: policyMin, max: policyMax };
  }
  return {
    min: Math.max(policyMin, spec.minMultiplier),
    max: Math.min(policyMax, spec.maxMultiplier),
  };
}

export const ROLE_WEIGHTS: Readonly<Record<ContributorRole, number>> = Object.freeze({
  quantity_surveyor: 3,
  civil_engineer: 3,
  verified_pro: 3,
  admin: 3,
  contractor: 2,
  homeowner: 1,
  anonymous: 1,
});

export function getRoleWeight(role?: string | null): number {
  if (!role) return 1;
  const key = role.toLowerCase().trim() as ContributorRole;
  return ROLE_WEIGHTS[key] ?? 1;
}

export function weightedMedian(items: Array<{ value: number; weight: number }>): number {
  if (!items.length) return 0;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return sorted[0].value;
  const halfWeight = totalWeight / 2;
  let running = 0;
  for (const item of sorted) {
    running += item.weight;
    if (running >= halfWeight) {
      return item.value;
    }
  }
  return sorted[sorted.length - 1].value;
}

export interface OutlierFilteringResult<T> {
  clean: T[];
  outliers: T[];
  lowerFence: number;
  upperFence: number;
}

/**
 * Interquartile Range (IQR) outlier rejection filter.
 * Discards extreme user edits before updating averages or medians so typos
 * (e.g. typing 150 liters instead of 15 liters) cannot skew regional baselines.
 */
export function filterOutliersIQR(
  entries: PreparedRow[],
): OutlierFilteringResult<PreparedRow> {
  if (entries.length < 4) {
    const clean: PreparedRow[] = [];
    const outliers: PreparedRow[] = [];
    for (const e of entries) {
      if (e.ratio < 0.25 || e.ratio > 3.0) {
        outliers.push(e);
      } else {
        clean.push(e);
      }
    }
    return { clean, outliers, lowerFence: 0.25, upperFence: 3.0 };
  }

  const sortedRatios = entries.map((e) => e.ratio).sort((a, b) => a - b);
  const q1 = quantile(sortedRatios, 0.25);
  const q3 = quantile(sortedRatios, 0.75);
  const iqr = q3 - q1;
  const median = quantile(sortedRatios, 0.5);

  const effectiveIQR = Math.max(iqr, median * 0.1);
  const lowerFence = Math.max(0.1, q1 - 1.5 * effectiveIQR);
  const upperFence = q3 + 1.5 * effectiveIQR;

  const clean: PreparedRow[] = [];
  const outliers: PreparedRow[] = [];
  for (const e of entries) {
    if (e.ratio < lowerFence || e.ratio > upperFence) {
      outliers.push(e);
    } else {
      clean.push(e);
    }
  }

  return { clean, outliers, lowerFence: round(lowerFence), upperFence: round(upperFence) };
}

/* ------------------------------------------------------------------ */
/* Units and materials                                                 */
/* ------------------------------------------------------------------ */

/**
 * Site units are regional, so the alias table has to be generous. An unknown
 * unit is slugged rather than dropped: it simply never groups with anything
 * else, which is the safe failure.
 */
const UNIT_ALIASES: Record<string, string> = {
  m: "m",
  lm: "m",
  metre: "m",
  meter: "m",
  metres: "m",
  meters: "m",
  m2: "m2",
  "m²": "m2",
  sqm: "m2",
  "sq m": "m2",
  "square metre": "m2",
  "square meter": "m2",
  m3: "m3",
  "m³": "m3",
  cum: "m3",
  "cu m": "m3",
  "cubic metre": "m3",
  "cubic meter": "m3",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  tonne: "tonne",
  ton: "tonne",
  tonnes: "tonne",
  tons: "tonne",
  l: "litre",
  lt: "litre",
  litre: "litre",
  liter: "litre",
  litres: "litre",
  liters: "litre",
  bag: "bag",
  bags: "bag",
  trip: "trip",
  trips: "trip",
  "tipper trip": "trip",
  wheelbarrow: "wheelbarrow",
  wheelbarrows: "wheelbarrow",
  headpan: "headpan",
  "head pan": "headpan",
  "head pans": "headpan",
  piece: "piece",
  pieces: "piece",
  pcs: "piece",
  nr: "piece",
  no: "piece",
  each: "piece",
  roll: "roll",
  rolls: "roll",
  sheet: "sheet",
  sheets: "sheet",
  bundle: "bundle",
  bundles: "bundle",
  day: "day",
  days: "day",
  hour: "hour",
  hours: "hour",
  set: "set",
  unit: "unit",
  units: "unit",
};

function slug(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Regional words for the same material. Without this, "9 inch block",
 * "blocks" and "block" are three unrelated series, and no candidate can ever
 * reach the observation threshold.
 */
const MATERIAL_ALIASES: Record<string, string> = {
  block: "block",
  blocks: "block",
  "9 inch block": "block",
  "9-inch-block": "block",
  "6 inch block": "block",
  "6-inch-block": "block",
  sandcrete: "block",
  brick: "brick",
  bricks: "brick",
  cement: "cement",
  cementbag: "cement",
  opc: "cement",
  sand: "sand",
  "sharp sand": "sand",
  "plaster sand": "sand",
  laterite: "laterite",
  granite: "granite",
  chippings: "granite",
  gravel: "granite",
  ballast: "granite",
  rebar: "reinforcement",
  reinforcement: "reinforcement",
  "reinforcement steel": "reinforcement",
  steel: "steel",
  "binding wire": "binding-wire",
  timber: "timber",
  wood: "timber",
  plywood: "plywood",
  "roof truss": "roof-truss",
  purlin: "purlin",
  "roof sheet": "roof-sheet",
  "roofing sheet": "roof-sheet",
  stone: "stone",
  "stone coating": "stone-coating",
  paint: "paint",
  emulsion: "paint",
  "emulsion paint": "paint",
  gloss: "paint",
  primer: "primer",
  tile: "tile",
  tiles: "tile",
  "floor tile": "tile",
  "wall tile": "tile",
  grout: "grout",
  screed: "screed",
  plaster: "plaster",
  rendering: "plaster",
  "pop ceiling": "pop-ceiling",
  pop: "pop-ceiling",
  ceiling: "ceiling",
  "suspended ceiling": "ceiling",
  door: "door",
  doors: "door",
  window: "window",
  windows: "window",
  glazing: "glazing",
  glass: "glass",
  aluminium: "aluminium",
  aluminum: "aluminium",
  insulation: "insulation",
  waterproofing: "waterproofing",
  excavation: "excavation",
  earthwork: "excavation",
  "hardcore filling": "hardcore",
  hardcore: "hardcore",
  formwork: "formwork",
  plumbing: "plumbing",
  pipe: "pipe",
  pvc: "pvc",
  electrical: "electrical",
  wiring: "electrical",
  conduit: "conduit",
  solar: "solar",
  inverter: "inverter",
  battery: "battery",
  borehole: "borehole",
  "water tank": "water-tank",
  pump: "pump",
  labour: "labour",
  labor: "labour",
  workmanship: "labour",
  installation: "labour",
  hire: "hire",
};

/** Canonical, stable unit token for any human spelling. */
export function normaliseUnit(raw: unknown): string {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!text) return "";
  return UNIT_ALIASES[text] ?? slug(text);
}

/** Canonical material or trade key for any human spelling. */
export function normaliseMaterialKey(raw: unknown): string {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!text) return "";
  const direct = MATERIAL_ALIASES[text];
  if (direct) return direct;
  const slugged = slug(text);
  if (MATERIAL_ALIASES[slugged]) return MATERIAL_ALIASES[slugged];
  if (slugged.endsWith("s") && MATERIAL_ALIASES[slugged.slice(0, -1)]) {
    return MATERIAL_ALIASES[slugged.slice(0, -1)];
  }
  return slugged;
}

/** Markets the platform actually serves. A currency is not a market. */
const SUPPORTED_MARKETS = new Set(ALL_MARKET_CODES);

export function normaliseMarketCode(raw: unknown, fallback = ""): string {
  if (typeof raw !== "string") return fallback;
  const canonical = canonicalMarketCode(raw, fallback);
  return SUPPORTED_MARKETS.has(canonical) ? canonical : fallback;
}

export function isSupportedMarket(code: unknown): boolean {
  return (
    typeof code === "string" && SUPPORTED_MARKETS.has(code.trim().toUpperCase())
  );
}

/* ------------------------------------------------------------------ */
/* Parsing and validation                                              */
/* ------------------------------------------------------------------ */

export type CalibrationErrorCode =
  | "missing_id"
  | "missing_project_id"
  | "missing_market"
  | "unsupported_market"
  | "missing_material"
  | "missing_unit"
  | "unsupported_measure"
  | "invalid_estimated_quantity"
  | "invalid_actual_quantity"
  | "safety_sensitive_context"
  | "not_accepted"
  | "missing_evidence_reference"
  | "missing_review_record"
  | "invalid_recorded_at";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positive(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normaliseEvidence(value: unknown): CalibrationEvidence {
  const raw = text(value).toLowerCase();
  if (raw === "admin_verified" || raw === "verified_project") {
    return "admin_verified";
  }
  return "self_attested";
}

function normaliseStatus(value: unknown): CalibrationStatus | null {
  const raw = text(value).toLowerCase();
  if (raw === "pending_review" || raw === "accepted" || raw === "rejected") {
    return raw;
  }
  return null;
}

function normaliseContext(value: unknown): CalibrationContext {
  const raw = text(value).toLowerCase();
  if (raw === "structural" || raw === "compliance") return raw;
  return "takeoff";
}

function normaliseMeasure(value: unknown): CalibrationMeasure | null {
  const raw = text(value).toLowerCase();
  if (raw === "material" || raw === "labour" || raw === "labor") {
    return raw === "labor" ? "labour" : raw;
  }
  return null;
}

/**
 * Coerces one stored record into the current shape, or returns null. It is
 * deliberately total: a stale, truncated or hand-edited row must never throw,
 * because the alternative is a broken page for a visitor who did nothing wrong.
 */
export function sanitiseCalibrationFeedback(
  raw: unknown,
): CalibrationFeedback | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const projectId = text(row.projectId ?? row.project_id);
  const marketCode = normaliseMarketCode(row.marketCode ?? row.market_code);
  const materialKey = normaliseMaterialKey(row.materialKey ?? row.material_key);
  const measure = normaliseMeasure(row.measure);
  const unit = normaliseUnit(row.unit ?? row.uom);
  const estimated = positive(row.estimatedQuantity ?? row.estimated_quantity);
  const actual = positive(row.actualQuantity ?? row.actual_quantity);
  const status = normaliseStatus(row.status);
  if (
    !id ||
    !projectId ||
    !marketCode ||
    !materialKey ||
    !measure ||
    !unit ||
    estimated === null ||
    actual === null ||
    !status
  ) {
    return null;
  }
  const recordedAtRaw = text(row.recordedAt ?? row.recorded_at);
  const recordedAt = Number.isNaN(Date.parse(recordedAtRaw))
    ? ""
    : new Date(recordedAtRaw).toISOString();
  if (!recordedAt) return null;
  const evidenceReference =
    text(row.evidenceReference ?? row.evidence_reference) || undefined;
  const reviewerId = text(row.reviewerId ?? row.reviewer_id) || undefined;
  const reviewerRoleRaw = text(row.reviewerRole ?? row.reviewer_role);
  const reviewerRole =
    reviewerRoleRaw === "admin" || reviewerRoleRaw === "owner"
      ? reviewerRoleRaw
      : undefined;
  const reviewedAtRaw = text(row.reviewedAt ?? row.reviewed_at);
  const reviewedAt = Number.isNaN(Date.parse(reviewedAtRaw))
    ? undefined
    : new Date(reviewedAtRaw).toISOString();
  const contributorRoleRaw = text(row.contributorRole ?? row.contributor_role).toLowerCase();
  const contributorRole: ContributorRole | undefined =
    contributorRoleRaw === "quantity_surveyor" ||
    contributorRoleRaw === "civil_engineer" ||
    contributorRoleRaw === "verified_pro" ||
    contributorRoleRaw === "admin" ||
    contributorRoleRaw === "contractor" ||
    contributorRoleRaw === "homeowner" ||
    contributorRoleRaw === "anonymous"
      ? (contributorRoleRaw as ContributorRole)
      : undefined;
  return {
    id,
    projectId,
    marketCode,
    materialKey,
    measure,
    estimatedQuantity: estimated,
    actualQuantity: actual,
    unit,
    evidence: normaliseEvidence(row.evidence),
    recordedAt,
    context: normaliseContext(row.context),
    status,
    source: text(row.source) === "cloud" ? "cloud" : "device",
    evidenceReference,
    reviewerId,
    reviewerRole,
    reviewedAt,
    contributorRole,
  };
}

/** Every reason a record cannot enter learning, in a stable order. */
export function validateCalibrationFeedback(
  raw: unknown,
): CalibrationErrorCode[] {
  const row = sanitiseCalibrationFeedback(raw);
  if (!row) {
    // Report the specific causes rather than a generic failure.
    const source = (raw ?? {}) as Record<string, unknown>;
    const errors: CalibrationErrorCode[] = [];
    if (!text(source.id)) errors.push("missing_id");
    if (!text(source.projectId ?? source.project_id))
      errors.push("missing_project_id");
    const market = text(source.marketCode ?? source.market_code);
    if (!market) errors.push("missing_market");
    else if (!isSupportedMarket(normaliseMarketCode(market)))
      errors.push("unsupported_market");
    if (!text(source.materialKey ?? source.material_key))
      errors.push("missing_material");
    if (!normaliseUnit(source.unit ?? source.uom)) errors.push("missing_unit");
    if (!normaliseMeasure(source.measure)) errors.push("unsupported_measure");
    if (
      positive(source.estimatedQuantity ?? source.estimated_quantity) === null
    )
      errors.push("invalid_estimated_quantity");
    if (positive(source.actualQuantity ?? source.actual_quantity) === null)
      errors.push("invalid_actual_quantity");
    if (!normaliseStatus(source.status)) errors.push("not_accepted");
    if (Number.isNaN(Date.parse(text(source.recordedAt ?? source.recorded_at))))
      errors.push("invalid_recorded_at");
    if (!errors.length) errors.push("invalid_recorded_at");
    return [...new Set(errors)];
  }
  const errors: CalibrationErrorCode[] = [];
  if (row.context !== "takeoff") errors.push("safety_sensitive_context");
  if (row.status !== "accepted") errors.push("not_accepted");
  if (row.evidence === "admin_verified") {
    if (!row.evidenceReference) errors.push("missing_evidence_reference");
    if (!row.reviewerId || !row.reviewedAt || row.reviewerRole !== "admin") {
      errors.push("missing_review_record");
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

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

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function fenwick(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Stable 64 bit identity for a candidate snapshot and its policy. */
export function calibrationCandidateFingerprint(
  candidate: CalibrationCandidate,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): string {
  const material = [
    candidate.marketCode,
    candidate.materialKey,
    candidate.measure,
    candidate.unit,
    candidate.observationCount,
    candidate.distinctProjectCount,
    candidate.verifiedObservationCount,
    candidate.proposedMultiplier ?? "none",
    policy.version,
    policy.minObservations,
    policy.minDistinctProjects,
    policy.minVerifiedObservations,
    policy.minVerifiedShare,
    policy.maxAdjustmentFraction,
    policy.emaAlpha,
  ].join("|");
  return fenwick(material, 2166136261) + fenwick(material, 16777619);
}

export function calibrationCandidateKey(
  candidate: Pick<
    CalibrationCandidate,
    "marketCode" | "materialKey" | "measure" | "unit"
  >,
): string {
  return `${candidate.marketCode}:${candidate.materialKey}:${candidate.measure}:${candidate.unit}`;
}

export interface CalibrationScope {
  marketCode: string;
  materialKey?: string;
  measure?: CalibrationMeasure;
  unit?: string;
}

interface PreparedRow {
  row: CalibrationFeedback;
  ratio: number;
  at: number;
}

function prepare(rows: unknown[], scope: CalibrationScope): PreparedRow[] {
  const market = normaliseMarketCode(scope.marketCode);
  const materialKey = scope.materialKey
    ? normaliseMaterialKey(scope.materialKey)
    : undefined;
  const unit = scope.unit ? normaliseUnit(scope.unit) : undefined;
  const seen = new Set<string>();
  const prepared: PreparedRow[] = [];
  for (const raw of rows) {
    const row = sanitiseCalibrationFeedback(raw);
    if (!row) continue;
    if (row.marketCode !== market) continue;
    if (materialKey && row.materialKey !== materialKey) continue;
    if (scope.measure && row.measure !== scope.measure) continue;
    if (unit && row.unit !== unit) continue;
    if (validateCalibrationFeedback(row).length > 0) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    prepared.push({
      row,
      ratio: row.actualQuantity / row.estimatedQuantity,
      at: Date.parse(row.recordedAt),
    });
  }
  // Timestamp order, with the id as a stable tiebreak so an EMA does not depend
  // on insertion order.
  return prepared.sort(
    (a, b) => a.at - b.at || a.row.id.localeCompare(b.row.id),
  );
}

/**
 * Builds one candidate for an exact market/material/measure/unit series.
 * Rows that are invalid, rejected, duplicated or from another series are
 * excluded before any arithmetic runs.
 */
export function buildCalibrationCandidate(
  rows: unknown[],
  scope: CalibrationScope & {
    materialKey: string;
    measure: CalibrationMeasure;
    unit: string;
  },
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): CalibrationCandidate {
  const rawPrepared = prepare(rows, scope);
  const { clean: prepared, outliers } =
    policy.enableIqrOutlierFilter !== false
      ? filterOutliersIQR(rawPrepared)
      : { clean: rawPrepared, outliers: [] };

  const physicalBounds = getPhysicalBounds(scope.materialKey, policy);
  const bounded = prepared.map((entry) => ({
    entry,
    ratio: clamp(entry.ratio, physicalBounds.min, physicalBounds.max),
  }));

  const sortedValues = bounded.map((b) => b.ratio).sort((a, b) => a - b);
  const unweightedMedianValue = sortedValues.length ? round(quantile(sortedValues, 0.5)) : null;

  const weightedItems = bounded.map((b) => ({
    value: b.ratio,
    weight:
      policy.enableRoleWeighting !== false
        ? getRoleWeight(
            b.entry.row.contributorRole ??
              (b.entry.row.evidence === "admin_verified" ? "verified_pro" : undefined),
          )
        : 1,
  }));

  const proposed = bounded.length ? round(weightedMedian(weightedItems)) : null;
  const spread =
    sortedValues.length > 1
      ? {
          p25: round(quantile(sortedValues, 0.25)),
          p75: round(quantile(sortedValues, 0.75)),
        }
      : null;

  let trend: number | null = null;
  for (const item of bounded) {
    trend =
      trend === null
        ? item.ratio
        : policy.emaAlpha * item.ratio + (1 - policy.emaAlpha) * trend;
  }

  const verified = prepared.filter(
    (entry) => entry.row.evidence === "admin_verified",
  ).length;
  const projects = new Set(prepared.map((entry) => entry.row.projectId));
  const verifiedShare = prepared.length ? verified / prepared.length : 0;

  const blockers: CalibrationBlocker[] = [];
  const market = normaliseMarketCode(scope.marketCode);
  if (!market) blockers.push("unsupported_market");
  if (!normaliseUnit(scope.unit)) blockers.push("unsupported_unit");
  if (prepared.length < policy.minObservations)
    blockers.push("insufficient_observations");
  if (projects.size < policy.minDistinctProjects)
    blockers.push("insufficient_distinct_projects");
  if (verified < policy.minVerifiedObservations)
    blockers.push("insufficient_verified_observations");
  if (verifiedShare < policy.minVerifiedShare)
    blockers.push("verified_share_too_low");

  const candidate: CalibrationCandidate = {
    marketCode: market || normaliseMarketCode(scope.marketCode, ""),
    materialKey: normaliseMaterialKey(scope.materialKey),
    measure: scope.measure,
    unit: normaliseUnit(scope.unit),
    observationCount: prepared.length,
    distinctProjectCount: projects.size,
    verifiedObservationCount: verified,
    verifiedShare: round(verifiedShare),
    proposedMultiplier: proposed,
    trendMultiplier: trend === null ? null : round(trend),
    spread,
    eligible: blockers.length === 0,
    blockers,
    observedAt: prepared.length
      ? prepared[prepared.length - 1].row.recordedAt
      : null,
    policyVersion: policy.version,
    fingerprint: "",
    outlierCount: outliers.length,
    outlierRatios: outliers.map((o) => round(o.ratio, 3)),
    physicalBoundsApplied: physicalBounds,
    unweightedMultiplier: unweightedMedianValue,
  };
  candidate.fingerprint = calibrationCandidateFingerprint(candidate, policy);
  return candidate;
}

/** Every series in a market that has at least one accepted observation. */
export function buildCalibrationCandidates(
  rows: unknown[],
  scope: CalibrationScope,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): CalibrationCandidate[] {
  const market = normaliseMarketCode(scope.marketCode);
  if (!market) return [];
  const groups = new Map<string, CalibrationFeedback>();
  for (const raw of rows) {
    const row = sanitiseCalibrationFeedback(raw);
    if (!row || row.marketCode !== market) continue;
    if (scope.measure && row.measure !== scope.measure) continue;
    const key = calibrationCandidateKey(row);
    if (!groups.has(key)) groups.set(key, row);
  }
  return [...groups.values()]
    .map((row) =>
      buildCalibrationCandidate(
        rows,
        {
          marketCode: market,
          materialKey: row.materialKey,
          measure: row.measure,
          unit: row.unit,
        },
        policy,
      ),
    )
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.observationCount - a.observationCount ||
        a.materialKey.localeCompare(b.materialKey),
    );
}

/**
 * A descriptive interval from completed projects. It obeys the same policy as a
 * candidate: minimum observations, winsorised ratios, and the same clamp, so a
 * single typo cannot advertise a five times range.
 */
export function empiricalConfidenceRange(
  baseQuantity: number,
  rows: unknown[],
  scope: CalibrationScope & {
    materialKey: string;
    measure: CalibrationMeasure;
    unit: string;
  },
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): ConfidenceRange | null {
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) return null;
  const unit = normaliseUnit(scope.unit);
  if (!unit) return null;
  const prepared = prepare(rows, scope);
  if (prepared.length < policy.minRangeObservations) return null;
  const physicalBounds = getPhysicalBounds(scope.materialKey, policy);
  const sorted = prepared
    .map((entry) => clamp(entry.ratio, physicalBounds.min, physicalBounds.max))
    .sort((a, b) => a - b);
  return {
    low: round(baseQuantity * quantile(sorted, 0.1), 3),
    likely: round(baseQuantity * quantile(sorted, 0.5), 3),
    high: round(baseQuantity * quantile(sorted, 0.9), 3),
    unit,
    observations: sorted.length,
    method: "empirical_quantiles",
    policyVersion: policy.version,
  };
}

/**
 * Only an administrator approval of this exact snapshot, under this exact
 * policy version, can release a multiplier. Everything else is null.
 */
export function resolveApprovedMultiplier(
  candidate: CalibrationCandidate,
  approval: CalibrationApproval | null,
  policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
): number | null {
  if (!candidate.eligible || !approval) return null;
  if (approval.decision !== "approved") return null;
  if (approval.reviewerRole !== "admin") return null;
  if (approval.candidateKey !== calibrationCandidateKey(candidate)) return null;
  if (approval.policyVersion !== policy.version) return null;
  const fingerprint = calibrationCandidateFingerprint(candidate, policy);
  if (approval.candidateFingerprint !== fingerprint) return null;
  if (candidate.fingerprint !== fingerprint) return null;
  return candidate.proposedMultiplier;
}

/** Deterministic current-versus-shadow comparison, bounded by policy. */
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
  const window = policy.maxAdjustmentFraction;
  const multiplier =
    proposedMultiplier !== null && Number.isFinite(proposedMultiplier)
      ? clamp(proposedMultiplier, 1 - window, 1 + window)
      : 1;
  const shadow = round(baseline * multiplier, 3);
  return {
    baseline,
    shadow,
    delta: round(shadow - baseline, 3),
    deltaFraction: baseline > 0 ? round((shadow - baseline) / baseline) : null,
  };
}

/** Builds one audit event. Persisted by the store that owns the change. */
export function createAuditEvent(
  input: Omit<AuditEvent, "id" | "occurredAt"> & { occurredAt?: string },
): AuditEvent {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const material = [
    input.entityType,
    input.entityKey,
    input.action,
    input.actorId,
    input.reason,
    occurredAt,
  ].join("|");
  return {
    ...input,
    id: `audit_${fenwick(material, 2166136261)}${fenwick(material, 16777619)}`,
    occurredAt,
  };
}

/* ------------------------------------------------------------------ */
/* Cost coding                                                         */
/* ------------------------------------------------------------------ */

interface CostCodeHint {
  terms: string[];
  code: string;
  description: string;
  division: string;
  uniFormat?: string;
  /** Higher wins. Explicit priority makes matching order independent. */
  priority: number;
}

/**
 * Compact CSI MasterFormat hints. Matching is on whole words and phrases, with
 * an explicit priority, so "steel door" lands in Openings instead of Structural
 * Steel. These are suggestions: an administrator maps them to the project WBS.
 */
const COST_CODE_HINTS: readonly CostCodeHint[] = [
  {
    terms: [
      "tile roof",
      "roof tile",
      "roofing sheet",
      "roof sheet",
      "roof",
      "waterproofing",
      "insulation",
    ],
    code: "07 00 00",
    description: "Thermal and Moisture Protection",
    division: "07",
    uniFormat: "B3010",
    priority: 8,
  },
  {
    terms: [
      "steel door",
      "door frame",
      "door",
      "window",
      "glazing",
      "glass",
      "ironmongery",
    ],
    code: "08 00 00",
    description: "Openings",
    division: "08",
    uniFormat: "B2020",
    priority: 9,
  },
  {
    terms: [
      "floor tile",
      "wall tile",
      "tile",
      "paint",
      "emulsion",
      "gloss",
      "screed",
      "plaster",
      "rendering",
      "pop ceiling",
      "ceiling",
      "finish",
    ],
    code: "09 00 00",
    description: "Finishes",
    division: "09",
    uniFormat: "C3020",
    priority: 8,
  },
  {
    terms: ["block", "blocks", "brick", "masonry", "sandcrete"],
    code: "04 20 00",
    description: "Unit Masonry",
    division: "04",
    uniFormat: "B2010",
    priority: 8,
  },
  {
    terms: [
      "concrete",
      "slab",
      "cement",
      "rebar",
      "reinforcement",
      "binding wire",
      "formwork",
      "blinding",
    ],
    code: "03 30 00",
    description: "Cast-in-Place Concrete",
    division: "03",
    uniFormat: "B1010",
    priority: 6,
  },
  {
    terms: ["structural steel", "steel", "metal", "roof truss", "purlin"],
    code: "05 12 00",
    description: "Structural Steel Framing",
    division: "05",
    uniFormat: "B1010",
    priority: 5,
  },
  {
    terms: [
      "plumbing",
      "pipe",
      "pvc",
      "valve",
      "drain",
      "water tank",
      "pump",
      "borehole",
    ],
    code: "22 00 00",
    description: "Plumbing",
    division: "22",
    uniFormat: "D20",
    priority: 7,
  },
  {
    terms: [
      "electrical",
      "wiring",
      "conduit",
      "solar",
      "inverter",
      "battery",
      "lighting",
    ],
    code: "26 00 00",
    description: "Electrical",
    division: "26",
    uniFormat: "D50",
    priority: 7,
  },
  {
    terms: [
      "excavation",
      "earthwork",
      "hardcore",
      "laterite",
      "filling",
      "foundation",
    ],
    code: "31 00 00",
    description: "Earthwork",
    division: "31",
    uniFormat: "G1030",
    priority: 6,
  },
];

/** Markets that natively use CSI MasterFormat. Everything else maps to its own WBS. */
const CSI_MARKETS = new Set(["US", "CA", "PR", "PH"]);

function hasTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

/**
 * Suggests a classification for a material or trade. Returns null when nothing
 * matches safely, because a wrong code is worse than no code.
 */
export function suggestCostCode(
  tradeOrItem: string,
  costType: string,
  marketCode?: string,
): CostCodeDefinition | null {
  const text = tradeOrItem.trim().toLowerCase();
  const type = costType.trim().toUpperCase().slice(0, 8);
  if (!text || !type) return null;
  let best: { hint: CostCodeHint; score: number } | null = null;
  for (const hint of COST_CODE_HINTS) {
    for (const term of hint.terms) {
      if (!hasTerm(text, term)) continue;
      const score = hint.priority * 100 + term.length;
      if (!best || score > best.score) best = { hint, score };
    }
  }
  if (!best) return null;
  const market = normaliseMarketCode(marketCode, "");
  return {
    costCode: best.hint.code,
    description: best.hint.description,
    costType: type,
    division: best.hint.division,
    uniFormat: best.hint.uniFormat,
    standard: "csi_masterformat",
    applicableToMarket: market ? CSI_MARKETS.has(market) : false,
    marketCode: market || null,
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
  classificationStandard?: string;
}

/**
 * A spreadsheet-safe WBS export. Text that starts with a formula character is
 * neutralised, because a material name is user input and Excel would execute
 * it. A UTF-8 BOM keeps non-ASCII units readable in Excel.
 */
export function exportBudgetCsv(
  rows: ProcoreBudgetRow[],
  options: { bom?: boolean } = {},
): string {
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
    "Classification Standard",
  ];
  const neutralise = (value: string): string =>
    /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  const esc = (value: string | number | null | undefined): string => {
    const raw = value === null || value === undefined ? "" : String(value);
    const safe = typeof value === "string" ? neutralise(raw) : raw;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const content = rows.map((row) =>
    [
      row.costCode,
      row.costCodeDescription,
      row.costType,
      row.description,
      row.uom,
      row.quantity,
      row.unitCost,
      row.amount,
      row.currency,
      row.marketCode,
      row.sourceStatus,
      row.classificationStandard ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const body = [headers.join(","), ...content].join("\r\n");
  return options.bom === false ? body : `\uFEFF${body}`;
}
