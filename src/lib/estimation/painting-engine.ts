/**
 * FRELUX Phase 2 — Painting Estimation Engine
 *
 * Room-based painting estimator that follows FRELUX's actual estimating methodology.
 * Uses the Phase 1 estimation infrastructure (products, quality levels, prices, calc rules,
 * pack sizing, validation, adjustments) — does NOT duplicate or replace those systems.
 *
 * Key principles:
 * - Room-based: primary inputs are room length, breadth, wall height
 * - Theoretical vs practical purchase quantity are ALWAYS shown separately
 * - Coverage comes from admin-configured product quality levels (never hardcoded)
 * - Ceiling is calculated separately (FRELUX rule: 0.5 bucket per room)
 * - Colour/surface conditions generate warnings, NOT automatic percentage adjustments
 * - Manual professional adjustments are recorded and never overwrite the original
 * - Labour is NEVER calculated (negotiated separately)
 * - All business values come from database configuration
 * - Height adjustment: walls above 8 ft (FRELUX standard) are "too high" and trigger
 *   a customer-facing warning plus an optional admin-configurable adjustment factor
 */

import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
  ValidationResult,
  EstimateLineItemInput,
  OpeningInput,
} from '@/types/estimation';

import {
  validateDimensions,
  validateQuantity,
  validateProduct,
  createValidationResult,
} from './validation';

import {
  roundPackQuantity,
} from './pack-sizing';

import {
  createPriceSnapshot,
  calculateLineTotal,
  formatCurrency,
  isPriceConfigured,
} from './pricing';

import { feetToMeters } from '@/lib/utils';

// =========================================================
// Types
// =========================================================

export interface PaintingRoomInput {
  room_id: string;
  room_name: string;
  length: number;           // in feet or meters
  breadth: number;          // in feet or meters
  height: number;           // wall height in feet or meters
  unit: 'feet' | 'meters';
  doors: OpeningInput[];    // door openings (each: quantity, width, height)
  windows: OpeningInput[];  // window openings (each: quantity, width, height)
  doors_unknown: boolean;   // "I don't know the dimensions"
  windows_unknown: boolean;
  product_id: string;
  quality_id: string;
  colour_condition_key: string;
  surface_condition_key: string;
  coats: number;
  include_ceiling: boolean;
  ceiling_colour: string;
}

export interface PaintingProjectInput {
  rooms: PaintingRoomInput[];
  currency: string;
  user_id: string | null;
  client_hash: string | null;
  project_description: string;
  customer_location: 'owerri' | 'outside_owerri' | 'unknown';
  add_primer: boolean;
  primer_product_id?: string | null;
}

export interface HeightAdjustmentInfo {
  is_high: boolean;               // true if wall height exceeds FRELUX standard
  standard_height_m: number;       // the configured standard height in metres
  actual_height_m: number;         // the actual wall height in metres
  adjustment_factor: number;       // admin-configured factor (1.0 = no change, default warning-only)
  message: string;                // customer-facing message
}

export interface PaintingRoomCalcResult {
  room_id: string;
  room_name: string;
  // Dimensions (in meters for internal calc)
  length_m: number;
  breadth_m: number;
  height_m: number;
  // Areas
  gross_wall_area_m2: number;
  door_area_m2: number;
  window_area_m2: number;
  net_wall_area_m2: number;
  ceiling_area_m2: number;
  // Product info
  product: EstimationProduct | null;
  quality: EstimationProductQuality | null;
  coverage_m2_per_liter: number | null;
  pack_size_litres: number;
  // Calculation
  coats: number;
  theoretical_wall_litres: number;
  theoretical_ceiling_litres: number;
  theoretical_total_litres: number;
  theoretical_wall_buckets: number;
  theoretical_ceiling_buckets: number;
  theoretical_total_buckets: number;
  // Purchase
  practical_wall_buckets: number;
  practical_ceiling_buckets: number;
  practical_total_buckets: number;
  leftover_litres: number;
  // Ceiling
  include_ceiling: boolean;
  ceiling_colour: string;
  ceiling_quantity_buckets: number;
  // Height adjustment
  height_adjustment: HeightAdjustmentInfo | null;
  // Warnings
  warnings: string[];
  recommendations: string[];
  // Validation
  valid: boolean;
  errors: string[];
  // Conditions
  colour_condition: EstimationColourCondition | null;
  surface_condition: EstimationSurfaceCondition | null;
  // Primer
  primer_recommended: boolean;
  // Transparency steps
  calculation_steps: PaintingCalcStep[];
}

export interface PaintingCalcStep {
  label: string;
  value: string;
  detail?: string;
}

export interface PaintingEstimateResult {
  rooms: PaintingRoomCalcResult[];
  // Combined totals
  combined_theoretical_litres: number;
  combined_theoretical_buckets: number;
  combined_practical_buckets: number;
  combined_leftover_litres: number;
  total_material_cost: number;
  currency: string;
  // Line items
  line_items: EstimateLineItemInput[];
  // Warnings (all rooms combined)
  warnings: string[];
  recommendations: string[];
  // Labour
  labour_note: string;
  // Production
  production_eligible: boolean;
  production_message: string;
  production_min_required: number;
  // Validity
  valid: boolean;
  errors: string[];
  // Calc version
  calc_version_id: string | null;
}

// =========================================================
// Constants
// =========================================================

const CALCULATOR_TYPE = 'painting';

// FRELUX standard wall height fallbacks (admin-configurable via calc rules)
const FALLBACK_STANDARD_HEIGHT_FT = 8;
const FALLBACK_STANDARD_HEIGHT_M = 2.4384;

// =========================================================
// Core Calculation Functions
// =========================================================

/**
 * Converts room dimensions to meters.
 */
function toMeters(value: number, unit: 'feet' | 'meters'): number {
  return unit === 'feet' ? feetToMeters(value) : value;
}

/**
 * Calculates gross wall area: perimeter × height.
 */
export function calculateWallArea(lengthM: number, breadthM: number, heightM: number): number {
  const safeL = Math.max(0, lengthM);
  const safeB = Math.max(0, breadthM);
  const safeH = Math.max(0, heightM);
  if (safeL === 0 || safeH === 0) return 0;
  // If breadth is 0, calculate only two walls (length × height × 2)
  if (safeB === 0) return 2 * safeL * safeH;
  const perimeter = 2 * (safeL + safeB);
  return Math.round(perimeter * safeH * 100) / 100;
}

/**
 * Calculates total opening area for a list of openings.
 */
export function calculateOpeningArea(openings: OpeningInput[], unit: 'feet' | 'meters' = 'feet'): number {
  if (!openings || openings.length === 0) return 0;
  let total = 0;
  for (const opening of openings) {
    const w = toMeters(opening.width, unit);
    const h = toMeters(opening.height, unit);
    const area = Math.max(0, w) * Math.max(0, h) * Math.max(0, opening.quantity);
    total += area;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculates ceiling area: length × breadth.
 */
export function calculateCeilingArea(lengthM: number, breadthM: number): number {
  return Math.round(Math.max(0, lengthM) * Math.max(0, breadthM) * 100) / 100;
}

/**
 * Calculates theoretical paint required in litres for a given area, coverage, and coats.
 * Internal calculation — NOT shown as the primary FRELUX methodology to the customer.
 * The customer-facing explanation uses room dimensions, height, coats, and quality.
 */
export function calculateTheoreticalLitres(
  areaM2: number,
  coats: number,
  coverageM2PerLiter: number
): number {
  if (coverageM2PerLiter <= 0) return 0;
  const safeArea = Math.max(0, areaM2);
  const safeCoats = Math.max(1, coats);
  return Math.round((safeArea * safeCoats) / coverageM2PerLiter * 100) / 100;
}

/**
 * Converts litres to buckets given a pack size.
 */
export function litresToBuckets(litres: number, packSizeLitres: number): number {
  if (packSizeLitres <= 0) return 0;
  return Math.round((Math.max(0, litres) / packSizeLitres) * 10000) / 10000;
}

/**
 * FRELUX ceiling rule: ceiling uses 0.5 bucket per room (from calc rules, not hardcoded).
 * Falls back to the rule_value from estimation_calc_rules.
 */
export function getCeilingQuantityBuckets(ceilingRule: EstimationCalcRule | null): number {
  if (!ceilingRule || !ceilingRule.rule_value) return 0.5; // fallback to verified FRELUX rule
  const buckets = (ceilingRule.rule_value as Record<string, unknown>).buckets;
  if (typeof buckets === 'number' && buckets >= 0) return buckets;
  return 0.5; // fallback
}

/**
 * Gets the pack size in litres from calc rules or product.
 */
export function getPackSizeLitres(
  product: EstimationProduct | null,
  packSizeRule: EstimationCalcRule | null
): number {
  // Try product's standard_pack_size first
  if (product?.standard_pack_size && product.standard_pack_size > 0) {
    return product.standard_pack_size;
  }
  // Try calc rule
  if (packSizeRule?.rule_value) {
    const litres = (packSizeRule.rule_value as Record<string, unknown>).litres;
    if (typeof litres === 'number' && litres > 0) return litres;
  }
  // Fallback to verified FRELUX standard: 20L
  return 20;
}

/**
 * Gets the purchase rounding rule from calc rules.
 */
export function getRoundingRule(roundingRule: EstimationCalcRule | null): string {
  if (roundingRule?.rule_value) {
    const rule = (roundingRule.rule_value as Record<string, unknown>).rule;
    if (typeof rule === 'string') return rule;
  }
  return 'ceil'; // FRELUX default: round up
}

/**
 * Gets the FRELUX standard wall height from calc rules.
 * Falls back to 8 ft (2.4384 m) — the verified FRELUX standard.
 */
export function getStandardHeight(
  standardHeightRule: EstimationCalcRule | null
): { ft: number; m: number } {
  if (standardHeightRule?.rule_value) {
    const rv = standardHeightRule.rule_value as Record<string, unknown>;
    const valueM = rv.value_m;
    const valueFt = rv.value_ft;
    if (typeof valueM === 'number' && valueM > 0 && typeof valueFt === 'number' && valueFt > 0) {
      return { ft: valueFt, m: valueM };
    }
    if (typeof valueM === 'number' && valueM > 0) {
      return { ft: valueM / 0.3048, m: valueM };
    }
    if (typeof valueFt === 'number' && valueFt > 0) {
      return { ft: valueFt, m: feetToMeters(valueFt) };
    }
  }
  return { ft: FALLBACK_STANDARD_HEIGHT_FT, m: FALLBACK_STANDARD_HEIGHT_M };
}

/**
 * Evaluates whether the wall height exceeds the FRELUX standard and returns
 * height adjustment information including the admin-configurable adjustment factor.
 *
 * FRELUX rule: Walls above 8 ft (2.44 m) are considered "too high".
 * Default adjustment is warning-only (factor 1.0) — the engine already uses
 * the actual wall height in the area calculation, so the warning ensures the
 * customer is aware their walls exceed the FRELUX standard. Admin can configure
 * a higher adjustment_factor if additional paint allowance is needed.
 */
export function evaluateHeightAdjustment(
  heightM: number,
  unit: 'feet' | 'meters',
  inputHeight: number,
  heightAdjustmentRule: EstimationCalcRule | null,
  standardHeight: { ft: number; m: number }
): HeightAdjustmentInfo | null {
  const rv = heightAdjustmentRule?.rule_value as Record<string, unknown> | null;

  const enabled = rv ? rv.enabled !== false : true;
  if (!enabled) return null;

  const thresholdM = rv?.warning_threshold_m as number | undefined
    ?? standardHeight.m;
  const adjustmentFactor = typeof rv?.adjustment_factor === 'number'
    ? (rv.adjustment_factor as number)
    : 1.0;
  const message = typeof rv?.message === 'string'
    ? (rv.message as string)
    : `Wall height exceeds the FRELUX standard (${standardHeight.ft} ft / ${standardHeight.m.toFixed(2)} m). This is considered a high wall. Professional assessment recommended for non-standard heights.`;

  if (heightM > thresholdM) {
    return {
      is_high: true,
      standard_height_m: standardHeight.m,
      actual_height_m: heightM,
      adjustment_factor: adjustmentFactor,
      message,
    };
  }

  return null;
}

// =========================================================
// Validation for a single room
// =========================================================

export function validateRoomInput(
  room: PaintingRoomInput,
  product: EstimationProduct | null,
  quality: EstimationProductQuality | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate dimensions
  const dimValidation = validateDimensions({
    length: room.length,
    breadth: room.breadth,
    height: room.height,
  });
  if (!dimValidation.valid) {
    errors.push(...dimValidation.errors);
  }

  // Validate product
  const productValidation = validateProduct(product);
  if (!productValidation.valid) {
    errors.push(...productValidation.errors);
  }

  // Validate quality
  if (!quality) {
    errors.push('Quality level is required.');
  } else if (!quality.is_active) {
    errors.push(`Quality level '${quality.name}' is inactive.`);
  }

  // Validate coverage
  if (quality && (quality.coverage === null || quality.coverage === undefined)) {
    warnings.push(
      `Coverage has not been configured for ${product?.name ?? 'product'}, ${quality.name}. ` +
      'Accurate calculation unavailable until the required FRELUX product/rule configuration is completed.'
    );
  }

  // Validate coats
  const coatsValidation = validateQuantity(room.coats, 'Coats', false);
  if (!coatsValidation.valid) {
    errors.push(...coatsValidation.errors);
  }

  // Door/window validation
  for (const [i, door] of room.doors.entries()) {
    const doorValidation = validateQuantity(door.quantity, `Door ${i + 1} quantity`, true);
    if (!doorValidation.valid) errors.push(...doorValidation.errors);
    if (!room.doors_unknown && door.quantity > 0) {
      const dimsValidation = validateDimensions({ width: door.width, height: door.height });
      if (!dimsValidation.valid) errors.push(`Door ${i + 1}: ${dimsValidation.errors.join(', ')}`);
    }
  }

  for (const [i, win] of room.windows.entries()) {
    const winValidation = validateQuantity(win.quantity, `Window ${i + 1} quantity`, true);
    if (!winValidation.valid) errors.push(...winValidation.errors);
    if (!room.windows_unknown && win.quantity > 0) {
      const dimsValidation = validateDimensions({ width: win.width, height: win.height });
      if (!dimsValidation.valid) errors.push(`Window ${i + 1}: ${dimsValidation.errors.join(', ')}`);
    }
  }

  // Unknown openings warning
  if (room.doors_unknown) {
    warnings.push('Door dimensions not provided, estimate may be less precise.');
  }
  if (room.windows_unknown) {
    warnings.push('Window dimensions not provided, estimate may be less precise.');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

// =========================================================
// Single Room Calculation
// =========================================================

export function calculateRoom(
  room: PaintingRoomInput,
  config: {
    product: EstimationProduct | null;
    quality: EstimationProductQuality | null;
    price: EstimationPrice | null;
    ceilingRule: EstimationCalcRule | null;
    packSizeRule: EstimationCalcRule | null;
    roundingRule: EstimationCalcRule | null;
    colourConditions: EstimationColourCondition[];
    surfaceConditions: EstimationSurfaceCondition[];
    standardHeightRule?: EstimationCalcRule | null;
    heightAdjustmentRule?: EstimationCalcRule | null;
  }
): PaintingRoomCalcResult {
  const steps: PaintingCalcStep[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const errors: string[] = [];

  // Validate
  const validation = validateRoomInput(room, config.product, config.quality);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }
  warnings.push(...validation.warnings);

  // Convert to meters
  const lengthM = toMeters(room.length, room.unit);
  const breadthM = toMeters(room.breadth, room.unit);
  const heightM = toMeters(room.height, room.unit);

  steps.push({
    label: 'Room Dimensions',
    value: `${room.length} × ${room.breadth} × ${room.height} ${room.unit}`,
    detail: `Converted to ${lengthM.toFixed(2)} × ${breadthM.toFixed(2)} × ${heightM.toFixed(2)} m`,
  });

  // Wall area
  const grossWallArea = calculateWallArea(lengthM, breadthM, heightM);
  steps.push({
    label: 'Gross Wall Area',
    value: `${grossWallArea.toFixed(2)} m²`,
    detail: `Perimeter × Height = 2 × (${lengthM.toFixed(2)} + ${breadthM.toFixed(2)}) × ${heightM.toFixed(2)}`,
  });

  // Door deductions
  let doorArea = 0;
  if (room.doors_unknown) {
    steps.push({
      label: 'Door Openings',
      value: 'Not provided',
      detail: 'Opening dimensions not provided, estimate may be less precise.',
    });
  } else {
    doorArea = calculateOpeningArea(room.doors, room.unit);
    if (doorArea > 0) {
      steps.push({
        label: 'Door Opening Area (deducted)',
        value: `${doorArea.toFixed(2)} m²`,
      });
    }
  }

  // Window deductions
  let windowArea = 0;
  if (room.windows_unknown) {
    steps.push({
      label: 'Window Openings',
      value: 'Not provided',
      detail: 'Opening dimensions not provided, estimate may be less precise.',
    });
  } else {
    windowArea = calculateOpeningArea(room.windows, room.unit);
    if (windowArea > 0) {
      steps.push({
        label: 'Window Opening Area (deducted)',
        value: `${windowArea.toFixed(2)} m²`,
      });
    }
  }

  // Net wall area
  const netWallArea = Math.max(0, grossWallArea - doorArea - windowArea);
  steps.push({
    label: 'Net Wall Area',
    value: `${netWallArea.toFixed(2)} m²`,
    detail: `Gross Wall Area − Door Area − Window Area = ${grossWallArea.toFixed(2)} − ${doorArea.toFixed(2)} − ${windowArea.toFixed(2)}`,
  });

  // ---- Height adjustment (FRELUX rule: walls above 8 ft are "too high") ----
  const standardHeight = getStandardHeight(config.standardHeightRule ?? null);
  const heightAdjustment = evaluateHeightAdjustment(
    heightM,
    room.unit,
    room.height,
    config.heightAdjustmentRule ?? null,
    standardHeight
  );

  if (heightAdjustment) {
    warnings.push(heightAdjustment.message);
    steps.push({
      label: 'Height Adjustment',
      value: `${room.height} ${room.unit} (above FRELUX standard of ${standardHeight.ft} ft)`,
      detail: heightAdjustment.message +
        (heightAdjustment.adjustment_factor !== 1.0
          ? ` Adjustment factor: ${heightAdjustment.adjustment_factor}.`
          : ' No additional factor applied — actual height is already used in the wall area calculation.'),
    });
  }

  // Coverage from quality
  const coverage = config.quality?.coverage ?? null;
  if (coverage === null || coverage === undefined) {
    errors.push(
      `Coverage has not been configured for ${config.product?.name ?? 'product'}, ${config.quality?.name ?? 'quality'}. ` +
      'Accurate calculation unavailable until the required FRELUX product/rule configuration is completed.'
    );
  }
  steps.push({
    label: 'Paint Quality & Coverage',
    value: coverage
      ? `${config.quality?.name ?? 'N/A'} — ${coverage} m²/L per coat`
      : `${config.quality?.name ?? 'N/A'} — NOT CONFIGURED`,
    detail: coverage
      ? `Coverage rate configured for ${config.quality?.name ?? 'this quality'} level.`
      : 'Admin must configure coverage before accurate calculation.',
  });

  // Pack size
  const packSizeLitres = getPackSizeLitres(config.product, config.packSizeRule);
  steps.push({
    label: 'Pack Size',
    value: `${packSizeLitres} L per bucket`,
    detail: config.product?.standard_pack_size
      ? 'From product configuration'
      : 'From FRELUX standard rule (20L)',
  });

  // Coats
  const coats = room.coats;
  steps.push({
    label: 'Coats',
    value: `${coats} coat(s)`,
    detail: coats === 2 ? 'FRELUX standard: 2 coats.' : undefined,
  });

  // Theoretical wall litres — internal calculation using room dimensions
  // The customer-facing explanation uses room dimensions, height, quality, and coats
  const theoreticalWallLitres = coverage ? calculateTheoreticalLitres(netWallArea, coats, coverage) : 0;
  const theoreticalWallBuckets = litresToBuckets(theoreticalWallLitres, packSizeLitres);
  steps.push({
    label: 'Theoretical Wall Quantity',
    value: coverage
      ? `${theoreticalWallLitres.toFixed(2)} L (${theoreticalWallBuckets.toFixed(4)} buckets)`
      : 'Cannot calculate — coverage not configured',
    detail: coverage
      ? `Based on ${room.length} × ${room.breadth} ${room.unit} room at ${room.height} ${room.unit} height, ${coats} coat(s), ${config.quality?.name ?? 'N/A'} quality.`
      : undefined,
  });

  // Ceiling
  let theoreticalCeilingLitres = 0;
  let theoreticalCeilingBuckets = 0;
  let ceilingArea = 0;

  if (room.include_ceiling) {
    ceilingArea = calculateCeilingArea(lengthM, breadthM);
    const ceilingQtyBuckets = getCeilingQuantityBuckets(config.ceilingRule);
    theoreticalCeilingBuckets = ceilingQtyBuckets;
    theoreticalCeilingLitres = ceilingQtyBuckets * packSizeLitres;
    steps.push({
      label: 'Ceiling',
      value: `${theoreticalCeilingBuckets} bucket(s) (${theoreticalCeilingLitres.toFixed(2)} L)`,
      detail: `FRELUX rule: ${ceilingQtyBuckets} bucket per room ceiling. Colour: ${room.ceiling_colour}. Ceiling area: ${ceilingArea.toFixed(2)} m².`,
    });
  } else {
    steps.push({
      label: 'Ceiling',
      value: 'Not included',
      detail: 'Ceiling excluded, ceiling quantity = 0.',
    });
  }

  // Total theoretical
  const theoreticalTotalLitres = theoreticalWallLitres + theoreticalCeilingLitres;
  const theoreticalTotalBuckets = theoreticalWallBuckets + theoreticalCeilingBuckets;
  steps.push({
    label: 'Total Theoretical Quantity',
    value: `${theoreticalTotalLitres.toFixed(2)} L (${theoreticalTotalBuckets.toFixed(4)} buckets)`,
    detail: 'Wall + Ceiling theoretical quantities (before purchase rounding).',
  });

  // Practical purchase quantity (rounding)
  const roundingRule = getRoundingRule(config.roundingRule);
  const wallRounding = roundPackQuantity(theoreticalWallLitres, packSizeLitres, roundingRule);
  const ceilingRounding = room.include_ceiling
    ? { practical_purchase_quantity: theoreticalCeilingLitres, pack_count: Math.ceil(theoreticalCeilingBuckets), leftover_quantity: 0 }
    : { practical_purchase_quantity: 0, pack_count: 0, leftover_quantity: 0 };

  const practicalWallBuckets = wallRounding.pack_count;
  const practicalCeilingBuckets = ceilingRounding.pack_count;
  const practicalTotalBuckets = practicalWallBuckets + practicalCeilingBuckets;
  const practicalTotalLitres = practicalTotalBuckets * packSizeLitres;
  const leftoverLitres = Math.max(0, practicalTotalLitres - theoreticalTotalLitres);

  steps.push({
    label: 'Practical Purchase Quantity',
    value: `${practicalTotalBuckets} bucket(s) (${practicalTotalLitres.toFixed(2)} L)`,
    detail: `Theoretical ${theoreticalTotalBuckets.toFixed(4)} buckets → rounded up to ${practicalTotalBuckets} full buckets (${roundingRule} rule).`,
  });

  if (leftoverLitres > 0) {
    steps.push({
      label: 'Estimated Remaining Quantity',
      value: `${leftoverLitres.toFixed(2)} L`,
      detail: 'Excess paint after theoretical requirement is met.',
    });
  }

  // Colour condition
  const colourCondition = config.colourConditions.find(
    (c) => c.condition_key === room.colour_condition_key
  ) ?? null;

  if (colourCondition?.requires_warning) {
    const warningMsg = 'Strong colour transition detected. Additional preparation or paint may be required. Professional adjustment recommended.';
    warnings.push(warningMsg);
    steps.push({
      label: 'Colour Condition',
      value: colourCondition.name,
      detail: warningMsg,
    });
  } else if (colourCondition) {
    steps.push({
      label: 'Colour Condition',
      value: colourCondition.name,
    });
  }

  // Surface condition
  const surfaceCondition = config.surfaceConditions.find(
    (s) => s.condition_key === room.surface_condition_key
  ) ?? null;

  let primerRecommended = false;
  if (surfaceCondition?.requires_preparation) {
    const warningMsg = `${surfaceCondition.name} detected. Surface preparation may be required before painting.`;
    warnings.push(warningMsg);
    steps.push({
      label: 'Surface Condition',
      value: surfaceCondition.name,
      detail: warningMsg,
    });
  } else if (surfaceCondition) {
    steps.push({
      label: 'Surface Condition',
      value: surfaceCondition.name,
    });
  }

  if (surfaceCondition?.primer_recommended) {
    primerRecommended = true;
    recommendations.push(
      `${surfaceCondition.name}: Primer/sealer is recommended. You can add it as a separate line item.`
    );
  }

  // Price validation
  if (!config.price || !isPriceConfigured(config.price?.price)) {
    warnings.push(
      `Price has not been configured for ${config.product?.name ?? 'product'}, ${config.quality?.name ?? 'quality'}. ` +
      'Material cost cannot be calculated until pricing is configured.'
    );
  }

  return {
    room_id: room.room_id,
    room_name: room.room_name,
    length_m: Math.round(lengthM * 100) / 100,
    breadth_m: Math.round(breadthM * 100) / 100,
    height_m: Math.round(heightM * 100) / 100,
    gross_wall_area_m2: grossWallArea,
    door_area_m2: doorArea,
    window_area_m2: windowArea,
    net_wall_area_m2: netWallArea,
    ceiling_area_m2: ceilingArea,
    product: config.product,
    quality: config.quality,
    coverage_m2_per_liter: coverage,
    pack_size_litres: packSizeLitres,
    coats,
    theoretical_wall_litres: theoreticalWallLitres,
    theoretical_ceiling_litres: theoreticalCeilingLitres,
    theoretical_total_litres: theoreticalTotalLitres,
    theoretical_wall_buckets: theoreticalWallBuckets,
    theoretical_ceiling_buckets: theoreticalCeilingBuckets,
    theoretical_total_buckets: theoreticalTotalBuckets,
    practical_wall_buckets: practicalWallBuckets,
    practical_ceiling_buckets: practicalCeilingBuckets,
    practical_total_buckets: practicalTotalBuckets,
    leftover_litres: Math.round(leftoverLitres * 100) / 100,
    include_ceiling: room.include_ceiling,
    ceiling_colour: room.ceiling_colour,
    ceiling_quantity_buckets: room.include_ceiling ? theoreticalCeilingBuckets : 0,
    height_adjustment: heightAdjustment,
    warnings,
    recommendations,
    valid: errors.length === 0,
    errors,
    colour_condition: colourCondition,
    surface_condition: surfaceCondition,
    primer_recommended: primerRecommended,
    calculation_steps: steps,
  };
}

// =========================================================
// Production Eligibility
// =========================================================

export interface ProductionRuleRow {
  product_category: string;
  quality_slug: string | null;
  location_rule: string;
  min_quantity: number;
  is_active: boolean;
}

export function checkProductionEligibility(
  customerLocation: 'owerri' | 'outside_owerri' | 'unknown',
  productCategory: string,
  qualitySlug: string | null,
  requiredBuckets: number,
  productionRules: ProductionRuleRow[]
): {
  eligible: boolean;
  message: string;
  min_required: number;
} {
  // If customer is in Owerri, no minimum under current FRELUX rule
  if (customerLocation === 'owerri') {
    return {
      eligible: true,
      message: 'FRELUX production is available in Owerri with no minimum quantity.',
      min_required: 0,
    };
  }

  if (customerLocation === 'unknown') {
    return {
      eligible: true,
      message: 'FRELUX production eligibility depends on location. Please confirm your location for accurate production availability.',
      min_required: 0,
    };
  }

  // Outside Owerri — check production rules
  const locationRule = 'outside_owerri';

  // Try quality-specific rule first, then fall back to product-wide rule
  let rule = productionRules.find(
    (r) =>
      r.product_category === productCategory &&
      r.quality_slug === qualitySlug &&
      r.location_rule === locationRule &&
      r.is_active
  );

  if (!rule) {
    rule = productionRules.find(
      (r) =>
        r.product_category === productCategory &&
        r.quality_slug === null &&
        r.location_rule === locationRule &&
        r.is_active
    );
  }

  const minRequired = rule ? rule.min_quantity : 10; // fallback default

  if (requiredBuckets >= minRequired) {
    return {
      eligible: true,
      message: `FRELUX production is available. Required quantity (${requiredBuckets} buckets) meets the minimum (${minRequired} buckets).`,
      min_required: minRequired,
    };
  }

  return {
    eligible: false,
    message: `FRELUX production is currently available for this order only if the required production quantity meets the applicable minimum (${minRequired} buckets). You may purchase from a paint seller or external producer.`,
    min_required: minRequired,
  };
}

// =========================================================
// Full Project Calculation
// =========================================================

export function calculatePaintingProject(
  input: PaintingProjectInput,
  config: {
    products: EstimationProduct[];
    qualities: Map<string, EstimationProductQuality[]>;
    prices: Map<string, EstimationPrice>;
    calcRules: Map<string, EstimationCalcRule>;
    colourConditions: EstimationColourCondition[];
    surfaceConditions: EstimationSurfaceCondition[];
    productionRules: ProductionRuleRow[];
    calcVersionId: string | null;
  }
): PaintingEstimateResult {
  const allWarnings: string[] = [];
  const allRecommendations: string[] = [];
  const allErrors: string[] = [];
  const lineItems: EstimateLineItemInput[] = [];

  const ceilingRule = config.calcRules.get('ceiling_quantity_per_room') ?? null;
  const packSizeRule = config.calcRules.get('pack_size_bucket_litres') ?? null;
  const roundingRule = config.calcRules.get('purchase_rounding_rule') ?? null;
  const standardHeightRule = config.calcRules.get('standard_room_height') ?? null;
  const heightAdjustmentRule = config.calcRules.get('height_adjustment_rule') ?? null;

  const roomResults: PaintingRoomCalcResult[] = [];

  for (const room of input.rooms) {
    const product = config.products.find((p) => p.id === room.product_id) ?? null;
    const qualities = room.product_id ? (config.qualities.get(room.product_id) ?? []) : [];
    const quality = qualities.find((q) => q.id === room.quality_id) ?? null;
    const priceKey = room.quality_id ?? room.product_id;
    const price = config.prices.get(priceKey) ?? null;

    const roomResult = calculateRoom(room, {
      product,
      quality,
      price,
      ceilingRule,
      packSizeRule,
      roundingRule,
      colourConditions: config.colourConditions,
      surfaceConditions: config.surfaceConditions,
      standardHeightRule,
      heightAdjustmentRule,
    });

    roomResults.push(roomResult);
    allWarnings.push(...roomResult.warnings);
    allRecommendations.push(...roomResult.recommendations);
    allErrors.push(...roomResult.errors);

    // Create line item for this room's paint
    if (roomResult.valid && price && isPriceConfigured(price.price)) {
      const priceSnapshot = createPriceSnapshot(
        price.price,
        product?.name ?? 'Unknown Product',
        roomResult.pack_size_litres,
        'L',
        {
          priceType: price.price_type,
          refId: price.ref_id,
          currency: input.currency,
          priceId: price.id,
          effectiveDate: price.effective_date,
        }
      );

      lineItems.push({
        item_name: `${room.room_name}, ${product?.name ?? 'Paint'} (${quality?.name ?? 'N/A'})`,
        item_type: 'product',
        product_id: room.product_id,
        quality_level_id: room.quality_id,
        quantity_required: roomResult.theoretical_total_litres,
        practical_purchase_qty: roomResult.practical_total_buckets * roomResult.pack_size_litres,
        unit: 'L',
        pack_size: roomResult.pack_size_litres,
        unit_price: price.price,
        total_price: calculateLineTotal(price.price, roomResult.practical_total_buckets * roomResult.pack_size_litres),
        price_snapshot: priceSnapshot,
        calculation_source: 'calculated',
        notes: `${roomResult.practical_total_buckets} bucket(s) × ${roomResult.pack_size_litres}L`,
      });
    }
  }

  // Combined totals
  const combinedTheoreticalLitres = roomResults.reduce((sum, r) => sum + r.theoretical_total_litres, 0);
  const combinedTheoreticalBuckets = roomResults.reduce((sum, r) => sum + r.theoretical_total_buckets, 0);
  const combinedPracticalBuckets = roomResults.reduce((sum, r) => sum + r.practical_total_buckets, 0);
  const combinedLeftoverLitres = roomResults.reduce((sum, r) => sum + r.leftover_litres, 0);

  // Material cost
  const totalMaterialCost = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  // Production eligibility (check for each room's product)
  let productionEligible = false;
  let productionMessage = '';
  let productionMinRequired = 0;

  if (input.rooms.length > 0) {
    const firstRoom = roomResults[0];
    const productCategory = firstRoom.product?.category ?? '';
    const qualitySlug = firstRoom.quality?.slug ?? null;
    const eligibility = checkProductionEligibility(
      input.customer_location,
      productCategory,
      qualitySlug,
      combinedPracticalBuckets,
      config.productionRules
    );
    productionEligible = eligibility.eligible;
    productionMessage = eligibility.message;
    productionMinRequired = eligibility.min_required;
  }

  // Labour note (never calculated)
  const labourNote = 'Labour: Not included, negotiated separately.';

  return {
    rooms: roomResults,
    combined_theoretical_litres: Math.round(combinedTheoreticalLitres * 100) / 100,
    combined_theoretical_buckets: Math.round(combinedTheoreticalBuckets * 10000) / 10000,
    combined_practical_buckets: combinedPracticalBuckets,
    combined_leftover_litres: Math.round(combinedLeftoverLitres * 100) / 100,
    total_material_cost: Math.round(totalMaterialCost * 100) / 100,
    currency: input.currency,
    line_items: lineItems,
    warnings: [...new Set(allWarnings)],
    recommendations: [...new Set(allRecommendations)],
    labour_note: labourNote,
    production_eligible: productionEligible,
    production_message: productionMessage,
    production_min_required: productionMinRequired,
    valid: allErrors.length === 0,
    errors: allErrors,
    calc_version_id: config.calcVersionId,
  };
}

// =========================================================
// Formatting helpers
// =========================================================

export function formatPaintingCurrency(amount: number, currency = 'NGN'): string {
  return formatCurrency(amount, currency);
}

export { CALCULATOR_TYPE };
