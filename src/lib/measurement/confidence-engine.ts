/**
 * FRELUX RESULT CONFIDENCE
 *
 * Feature 9 of 16: Result Confidence
 *
 * Introduces a calculation/data confidence concept.
 *
 * States: HIGH, MEDIUM, LOW, REVIEW_REQUIRED
 *
 * Confidence considers:
 * - Rule validity (is the rule approved and active?)
 * - Input completeness (are all required inputs provided?)
 * - Material specification completeness (is coverage defined?)
 * - Market-price data quality (is there an approved price?)
 * - Source reliability (is the price source verified?)
 * - Product matching (was the product matched correctly?)
 *
 * Calculation confidence and market-price confidence are kept
 * logically distinguishable.
 */

import type { SpaceResult } from './space-engine';
import type { MaterialSpec } from './material-engine';
import type { MaterialCalculationResult } from './material-engine';
import type {} from './rule-registry';

// =========================================================
// CONFIDENCE LEVELS
// =========================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'review_required';

export const CONFIDENCE_LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  review_required: 'REVIEW REQUIRED',
};

export const CONFIDENCE_LEVEL_COLORS: Record<ConfidenceLevel, string> = {
  high: 'green',
  medium: 'amber',
  low: 'orange',
  review_required: 'red',
};

// =========================================================
// CONFIDENCE FACTORS
// =========================================================

/**
 * Individual confidence factor.
 */
export interface ConfidenceFactor {
  /** Factor name */
  name: string;
  /** Whether this factor passes */
  passed: boolean;
  /** Detail about why it passed or failed */
  detail: string;
  /** Weight (0–1) — how much this factor affects overall confidence */
  weight: number;
}

/**
 * A complete confidence assessment.
 */
export interface ConfidenceAssessment {
  /** Overall confidence level */
  level: ConfidenceLevel;
  /** All factors that were evaluated */
  factors: ConfidenceFactor[];
  /** Calculation confidence (independent of price confidence) */
  calculationConfidence: ConfidenceLevel;
  /** Market-price confidence (independent of calculation confidence) */
  priceConfidence: ConfidenceLevel | 'unavailable';
  /** Summary of the assessment */
  summary: string;
}

// =========================================================
// FACTORY
// =========================================================

function createFactor(
  name: string,
  passed: boolean,
  detail: string,
  weight: number = 1,
): ConfidenceFactor {
  return { name, passed, detail, weight };
}

function aggregateConfidence(
  factors: ConfidenceFactor[],
): ConfidenceLevel {
  const weightedPassed = factors.filter((f) => f.passed).reduce((sum, f) => sum + f.weight, 0);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const ratio = totalWeight > 0 ? weightedPassed / totalWeight : 0;

  if (ratio >= 0.9) return 'high';
  if (ratio >= 0.7) return 'medium';
  if (ratio >= 0.5) return 'low';
  return 'review_required';
}

// =========================================================
// CALCULATION CONFIDENCE
// =========================================================

/**
 * Assess calculation confidence for a space result.
 * This is purely about the math — not about market prices.
 *
 * A purely mathematical calculation can have HIGH calculation confidence
 * even if current market pricing is unavailable.
 */
export function assessCalculationConfidence(
  result: SpaceResult,
  options: {
    hasValidDimensions?: boolean;
    hasRequiredInputs?: boolean;
    hasApprovedRule?: boolean;
  } = {},
): ConfidenceAssessment {
  const factors: ConfidenceFactor[] = [];

  // Factor: valid dimensions
  const hasDimensions = result.normalizedLengthM > 0;
  factors.push(createFactor(
    'Valid dimensions',
    hasDimensions,
    hasDimensions
      ? `Length: ${result.normalizedLengthM.toFixed(4)} m`
      : 'Missing or zero length',
    2,
  ));

  // Factor: width provided (when needed)
  const needsWidth = result.normalizedWidthM !== undefined;
  const hasWidth = result.normalizedWidthM !== undefined && result.normalizedWidthM > 0;
  if (needsWidth) {
    factors.push(createFactor(
      'Width provided',
      hasWidth,
      hasWidth
        ? `Width: ${result.normalizedWidthM.toFixed(4)} m`
        : 'Width is missing',
      1.5,
    ));
  }

  // Factor: height provided (for wall calculations)
  const needsHeight = result.normalizedHeightM !== undefined;
  const hasHeight = result.normalizedHeightM !== undefined && result.normalizedHeightM > 0;
  if (needsHeight) {
    factors.push(createFactor(
      'Height provided',
      hasHeight,
      hasHeight
        ? `Height: ${result.normalizedHeightM.toFixed(4)} m`
        : 'Height is missing',
      1.5,
    ));
  }

  // Factor: area is positive
  const hasArea = result.totalAreaM2 > 0;
  factors.push(createFactor(
    'Positive area result',
    hasArea,
    hasArea ? `${result.totalAreaM2.toFixed(4)} m²` : 'Area is zero or negative',
    2,
  ));

  // Factor: approved rule
  const hasApprovedRule = options.hasApprovedRule ?? true; // default true if not specified
  factors.push(createFactor(
    'Approved calculation rule',
    hasApprovedRule,
    hasApprovedRule ? 'Rule is active and approved' : 'Rule is not approved',
    1,
  ));

  // Factor: required inputs
  const hasRequiredInputs = options.hasRequiredInputs ?? true;
  factors.push(createFactor(
    'Required inputs provided',
    hasRequiredInputs,
    hasRequiredInputs ? 'All required inputs provided' : 'Some required inputs are missing',
    1,
  ));

  const calculationConfidence = aggregateConfidence(factors);

  return {
    level: calculationConfidence,
    factors,
    calculationConfidence,
    priceConfidence: 'unavailable',
    summary: `Calculation confidence: ${CONFIDENCE_LEVEL_LABELS[calculationConfidence]}`,
  };
}

// =========================================================
// MATERIAL CONFIDENCE
// =========================================================

/**
 * Assess material specification confidence.
 * Does the material have complete coverage info?
 */
export function assessMaterialConfidence(
  material: MaterialSpec,
  result?: MaterialCalculationResult,
): ConfidenceAssessment {
  const factors: ConfidenceFactor[] = [];

  // Factor: coverage defined
  const hasCoverage = material.coverage !== undefined && material.coverage.value > 0;
  factors.push(createFactor(
    'Coverage defined',
    hasCoverage,
    hasCoverage
      ? `${material.coverage!.value} ${material.coverage!.unit} per ${material.packageUnit}`
      : 'No coverage specified',
    2,
  ));

  // Factor: coverage type is area
  const isAreaCoverage = material.coverage?.type === 'area';
  factors.push(createFactor(
    'Area-based coverage',
    isAreaCoverage,
    isAreaCoverage ? 'Coverage is area-based (m²)' : `Coverage type: ${material.coverage?.type ?? 'none'}`,
    1.5,
  ));

  // Factor: package size specified
  const hasPackageSize = material.packageSize > 0;
  factors.push(createFactor(
    'Package size specified',
    hasPackageSize,
    hasPackageSize ? `${material.packageSize} ${material.packageUnit}` : 'No package size',
    1,
  ));

  // Factor: material is approved
  factors.push(createFactor(
    'Material approved',
    material.isApproved,
    material.isApproved ? 'Material spec is approved' : 'Material spec is not approved',
    1,
  ));

  // Factor: calculation result is valid
  if (result) {
    factors.push(createFactor(
      'Valid calculation result',
      result.purchaseQuantity > 0,
      result.purchaseQuantity > 0
        ? `${result.purchaseQuantity} ${result.quantityUnit}`
        : 'Zero or negative quantity',
      1.5,
    ));
  }

  const calculationConfidence = aggregateConfidence(factors);

  return {
    level: calculationConfidence,
    factors,
    calculationConfidence,
    priceConfidence: 'unavailable',
    summary: `Material confidence: ${CONFIDENCE_LEVEL_LABELS[calculationConfidence]}`,
  };
}

// =========================================================
// PRICE CONFIDENCE
// =========================================================

/**
 * Assess market-price confidence.
 * This is kept separate from calculation confidence.
 */
export function assessPriceConfidence(
  options: {
    hasApprovedPrice?: boolean;
    hasPriceSource?: boolean;
    isSourceVerified?: boolean;
    priceAgeDays?: number;
    hasProductMatch?: boolean;
  },
): ConfidenceAssessment {
  const factors: ConfidenceFactor[] = [];

  // Factor: approved price exists
  factors.push(createFactor(
    'Approved price exists',
    options.hasApprovedPrice ?? false,
    options.hasApprovedPrice ? 'Approved market price available' : 'No approved price',
    2,
  ));

  // Factor: price source exists
  factors.push(createFactor(
    'Price source available',
    options.hasPriceSource ?? false,
    options.hasPriceSource ? 'Price from a registered source' : 'No price source',
    1.5,
  ));

  // Factor: source is verified
  factors.push(createFactor(
    'Source verified',
    options.isSourceVerified ?? false,
    options.isSourceVerified ? 'Source is verified' : 'Source is not verified',
    1.5,
  ));

  // Factor: price freshness
  const priceAge = options.priceAgeDays ?? 999;
  const isFresh = priceAge <= 30;
  const isStale = priceAge > 90;
  factors.push(createFactor(
    'Price freshness',
    isFresh,
    isFresh
      ? `Price updated ${priceAge} days ago`
      : isStale
        ? `Price is ${priceAge} days old (stale)`
        : `Price updated ${priceAge} days ago`,
    1,
  ));

  // Factor: product match
  factors.push(createFactor(
    'Product match',
    options.hasProductMatch ?? false,
    options.hasProductMatch ? 'Product matched to material spec' : 'No product match',
    1,
  ));

  const priceConfidence = aggregateConfidence(factors);

  return {
    level: priceConfidence,
    factors,
    calculationConfidence: 'high', // calculation is independent
    priceConfidence,
    summary: `Price confidence: ${CONFIDENCE_LEVEL_LABELS[priceConfidence]}`,
  };
}

// =========================================================
// COMBINED CONFIDENCE
// =========================================================

/**
 * Combine calculation confidence and price confidence into an overall assessment.
 * The overall level is the lower of the two.
 */
export function combineConfidence(
  calculation: ConfidenceAssessment,
  price: ConfidenceAssessment,
): ConfidenceAssessment {
  const levelOrder: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
    review_required: 3,
  };

  const calcLevel = calculation.calculationConfidence;
  const priceLevel = price.priceConfidence === 'unavailable' ? 'review_required' : price.priceConfidence;

  const overallLevel: ConfidenceLevel =
    levelOrder[calcLevel] >= levelOrder[priceLevel] ? calcLevel : priceLevel;

  const allFactors = [...calculation.factors, ...price.factors];

  const notes: string[] = [];
  if (priceLevel === 'review_required') {
    notes.push('Market price is unavailable — calculation result is valid but cannot be priced.');
  }
  if (calcLevel === 'high' && priceLevel !== 'high') {
    notes.push('Calculation confidence is HIGH but market price confidence is lower.');
  }

  return {
    level: overallLevel,
    factors: allFactors,
    calculationConfidence: calcLevel,
    priceConfidence: priceLevel,
    summary: `Overall: ${CONFIDENCE_LEVEL_LABELS[overallLevel]} (Calc: ${CONFIDENCE_LEVEL_LABELS[calcLevel]}, Price: ${price.priceConfidence === 'unavailable' ? 'N/A' : CONFIDENCE_LEVEL_LABELS[priceLevel as ConfidenceLevel]})`,
  };
}
