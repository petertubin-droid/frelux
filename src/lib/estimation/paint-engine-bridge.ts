/**
 * Bridge: Adapts the old calc.ts calculatePaint() API to use the central paint-engine.ts
 *
 * This allows /paint-calculator to use the central engine without a full rewrite.
 * The old CalculatorInput → PaintEngineRoomInput conversion happens here.
 *
 * Once /paint-calculator is fully migrated to use paint-engine.ts directly,
 * this bridge can be removed.
 */

import type { CalculatorInput, CalculatorResult, ContainerRecommendation, SurfaceCondition, _ColorCondition } from '@/types';
import { type PaintEngineRoomInput, type PaintEngineConfig, type PaintEngineRoomResult } from './paint-engine';
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
  OpeningInput,
} from '@/types/estimation';

/**
 * Converts a PaintEngineRoomResult back to the old CalculatorResult format
 * so the existing PaintCalculator UI can render it without changes.
 */
export function engineResultToCalculatorResult(
  result: PaintEngineRoomResult,
  input: CalculatorInput
): CalculatorResult {
  const containers: ContainerRecommendation[] = result.practical_total_buckets > 0
    ? [{ size: result.pack_size_litres, count: result.practical_total_buckets }]
    : [];

  const primerContainers: ContainerRecommendation[] = result.primer_buckets > 0
    ? [{ size: result.pack_size_litres, count: result.primer_buckets }]
    : [];

  return {
    projectType: input.projectType,
    unit: input.unit,
    wallArea: result.gross_wall_area_m2,
    ceilingArea: result.ceiling_area_m2,
    doorArea: result.door_area_m2,
    windowArea: result.window_area_m2,
    paintableArea: result.net_wall_area_m2,
    coats: result.effective_coats,
    paintType: input.paintType,
    coverageRate: result.coverage_rate ?? 0,
    baseCoverageRate: result.coverage_rate ?? 0,
    surfaceCondition: (result.surface_condition?.condition_key ?? 'smooth') as SurfaceCondition,
    surfaceConditionFactor: result.surface_factor,
    paintRequiredLiters: result.theoretical_total_litres,
    wasteMargin: input.wasteMargin,
    adjustedLiters: result.theoretical_total_litres, // theoretical is the base; practical is in containers
    recommendedContainers: containers,
    totalRecommendedLiters: result.practical_total_litres,
    leftoverLiters: result.leftover_litres,
    primerLiters: result.primer_litres,
    primerContainers,
    primerTotalLiters: result.primer_buckets * result.pack_size_litres,
    heightWarning: result.height_warning,
    colorWarning: result.colour_condition?.requires_warning ? result.colour_condition.name : null,
    primerRecommended: result.primer_recommended,
  };
}

/**
 * Creates a PaintEngineConfig from the old-style CalcConfig + DB data
 */
export function createEngineConfig(
  calcConfig: {
    coverageRate?: number;
    containerSizes?: number[];
    surfaceFactorOverride?: number;
    minCoatsOverride?: number;
  },
  dbData: {
    product?: EstimationProduct | null;
    quality?: EstimationProductQuality | null;
    price?: EstimationPrice | null;
    calcRules?: Map<string, EstimationCalcRule>;
    colourConditions?: EstimationColourCondition[];
    surfaceConditions?: EstimationSurfaceCondition[];
    calcVersionId?: string | null;
  }
): PaintEngineConfig {
  const calcRules = dbData.calcRules ?? new Map();
  return {
    product: dbData.product ?? null,
    quality: dbData.quality ?? null,
    price: dbData.price ?? null,
    primer_price: null,
    ceilingRule: calcRules.get('ceiling_quantity_per_room') ?? null,
    ceilingCoverageRule: calcRules.get('ceiling_coverage_rate') ?? null,
    packSizeRule: calcRules.get('pack_size_bucket_litres') ?? null,
    roundingRule: calcRules.get('purchase_rounding_rule') ?? null,
    standardHeightRule: calcRules.get('standard_room_height') ?? null,
    heightAdjustmentRule: calcRules.get('height_adjustment_rule') ?? null,
    openingDeductionRule: calcRules.get('opening_deduction_rule') ?? null,
    coatCountRule: calcRules.get('standard_coat_count') ?? null,
    calibrationReferencesRule: calcRules.get('frelux_calibration_references') ?? null,
    colourConditions: dbData.colourConditions ?? [],
    surfaceConditions: dbData.surfaceConditions ?? [],
    calcVersionId: dbData.calcVersionId ?? null,
  };
}

/**
 * Converts old CalculatorInput to PaintEngineRoomInput
 */
export function calculatorInputToEngineInput(input: CalculatorInput): PaintEngineRoomInput {
  const doors: OpeningInput[] = input.doors > 0
    ? [{ quantity: input.doors, width: input.doorDims.width, height: input.doorDims.height }]
    : [];
  const windows: OpeningInput[] = input.windows > 0
    ? [{ quantity: input.windows, width: input.windowDims.width, height: input.windowDims.height }]
    : [];

  return {
    room_id: 'room-1',
    room_name: 'Room',
    length: input.length,
    width: input.width,
    height: input.wallHeight,
    unit: input.unit,
    doors,
    windows,
    doors_unknown: false,
    windows_unknown: false,
    product_id: input.paintType,
    quality_id: '', // Will be set by caller
    coats: input.coats,
    include_ceiling: input.includeCeiling,
    ceiling_colour: 'white',
    surface_condition_key: (input.surfaceCondition ?? 'smooth') as string,
    colour_condition_key: (input.colorCondition ?? 'same_or_light') as string,
    include_primer: input.includePrimer ?? false,
  };
}
