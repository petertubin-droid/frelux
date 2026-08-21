import type {
  CalculatorInput,
  CalculatorResult,
  CostEstimateInput,
  CostEstimateResult,
  ContainerRecommendation,
  ProjectType,
  OpeningDimensions,
  ScreedingMixConfig,
  ScreedingMixResult,
  AdvancedEstimateData,
  AdvancedEstimateLineItem,
} from '@/types';
import {
  feetToMeters,
  DEFAULT_DOOR_WIDTH_M,
  DEFAULT_DOOR_HEIGHT_M,
  DEFAULT_WINDOW_WIDTH_M,
  DEFAULT_WINDOW_HEIGHT_M,
} from '@/lib/utils';

// ─────────────────────────────────────────────────────────
// Configurable constants (defaults; overridden by DB values)
// ─────────────────────────────────────────────────────────

export const DEFAULT_COVERAGE_M2_PER_LITER = 10;
export const DEFAULT_CONTAINER_SIZES_LITERS = [1, 4, 20];

export const DEFAULT_DOOR_DIMS: OpeningDimensions = { width: DEFAULT_DOOR_WIDTH_M, height: DEFAULT_DOOR_HEIGHT_M };
export const DEFAULT_WINDOW_DIMS: OpeningDimensions = { width: DEFAULT_WINDOW_WIDTH_M, height: DEFAULT_WINDOW_HEIGHT_M };

// Config the calculator receives from the caller. All fields optional —
// when omitted, the defaults above are used. The caller loads these from
// Supabase (paint_types table) and passes them in.
export interface CalcConfig {
  coverageRate?: number; // m² per liter per coat
  containerSizes?: number[]; // liters, ascending
}

// ─────────────────────────────────────────────────────────
// Unit conversion — single internal unit (meters)
// ─────────────────────────────────────────────────────────

function toMeters(value: number, unit: 'meters' | 'feet'): number {
  return unit === 'feet' ? feetToMeters(value) : value;
}

// ─────────────────────────────────────────────────────────
// Surface area calculations
// ─────────────────────────────────────────────────────────

export function calculateWallArea(
  lengthM: number,
  widthM: number,
  heightM: number,
  projectType: ProjectType
): number {
  // Room / House / Exterior: perimeter × height.
  // Fence: treat as a flat surface — length × height (width irrelevant).
  if (projectType === 'fence') {
    return lengthM * heightM;
  }
  // When width is 0 (optional field left blank), calculate only the two
  // walls defined by length so the result is still mathematically valid.
  if (widthM <= 0) {
    return 2 * lengthM * heightM;
  }
  const perimeter = 2 * (lengthM + widthM);
  return perimeter * heightM;
}

export function calculateCeilingArea(lengthM: number, widthM: number, projectType: ProjectType): number {
  // Ceiling only applies to rooms/houses (interior). Exterior and fence have no ceiling.
  if (projectType === 'exterior' || projectType === 'fence') return 0;
  // Width is optional — if not provided, ceiling area cannot be determined.
  if (widthM <= 0) return 0;
  return lengthM * widthM;
}

export function calculateDoorArea(
  doorCount: number,
  dims: OpeningDimensions = DEFAULT_DOOR_DIMS
): number {
  const areaPerDoor = Math.max(0, dims.width) * Math.max(0, dims.height);
  return Math.max(0, doorCount) * areaPerDoor;
}

export function calculateWindowArea(
  windowCount: number,
  dims: OpeningDimensions = DEFAULT_WINDOW_DIMS
): number {
  const areaPerWindow = Math.max(0, dims.width) * Math.max(0, dims.height);
  return Math.max(0, windowCount) * areaPerWindow;
}

export function calculatePaintableArea(
  wallAreaM2: number,
  ceilingAreaM2: number,
  doorAreaM2: number,
  windowAreaM2: number,
  includeCeiling: boolean
): number {
  const surface = wallAreaM2 + (includeCeiling ? ceilingAreaM2 : 0);
  const openings = doorAreaM2 + windowAreaM2;
  return Math.max(0, surface - openings);
}

// ─────────────────────────────────────────────────────────
// Paint quantity calculations
// ─────────────────────────────────────────────────────────

export function calculatePaintRequired(
  paintableAreaM2: number,
  coats: number,
  coverageRate: number
): number {
  if (coverageRate <= 0) return 0;
  return (paintableAreaM2 * Math.max(1, coats)) / coverageRate;
}

export function calculateAdjustedPaintRequired(
  paintRequiredLiters: number,
  wasteMarginPercent: number
): number {
  const margin = Math.max(0, Math.min(100, wasteMarginPercent)) / 100;
  return paintRequiredLiters * (1 + margin);
}

// ─────────────────────────────────────────────────────────
// Container recommendation
// ─────────────────────────────────────────────────────────

export function recommendContainerCombination(
  liters: number,
  containerSizes: number[]
): ContainerRecommendation[] {
  const sizes = containerSizes.length > 0
    ? [...containerSizes].sort((a, b) => b - a) // descending — prefer larger containers
    : [...DEFAULT_CONTAINER_SIZES_LITERS].sort((a, b) => b - a);

  let remaining = Math.max(0, liters);
  const recommendations: ContainerRecommendation[] = [];

  for (const size of sizes) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / size);
    if (count > 0) {
      recommendations.push({ size, count });
      remaining -= count * size;
    }
  }

  // If there's a remainder, add one of the smallest container.
  if (remaining > 0) {
    const smallest = sizes[sizes.length - 1];
    recommendations.push({ size: smallest, count: 1 });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────
// Full paint calculation
// ─────────────────────────────────────────────────────────

export function calculatePaint(input: CalculatorInput, config?: CalcConfig): CalculatorResult {
  const coverageRate = config?.coverageRate ?? DEFAULT_COVERAGE_M2_PER_LITER;
  const containerSizes = config?.containerSizes ?? DEFAULT_CONTAINER_SIZES_LITERS;

  // Convert to meters internally.
  const lengthM = toMeters(input.length, input.unit);
  const widthM = toMeters(input.width, input.unit);
  const heightM = toMeters(input.wallHeight, input.unit);

  const wall = calculateWallArea(lengthM, widthM, heightM, input.projectType);
  const ceiling = calculateCeilingArea(lengthM, widthM, input.projectType);
  const door = calculateDoorArea(input.doors, input.doorDims);
  const window = calculateWindowArea(input.windows, input.windowDims);
  const area = calculatePaintableArea(wall, ceiling, door, window, input.includeCeiling);

  const baseLiters = calculatePaintRequired(area, input.coats, coverageRate);
  const adjustedLiters = calculateAdjustedPaintRequired(baseLiters, input.wasteMargin);
  const containers = recommendContainerCombination(adjustedLiters, containerSizes);
  const totalRecommended = containers.reduce((sum, c) => sum + c.count * c.size, 0);

  return {
    projectType: input.projectType,
    unit: input.unit,
    wallArea: round(wall),
    ceilingArea: round(ceiling),
    doorArea: round(door),
    windowArea: round(window),
    paintableArea: round(area),
    coats: input.coats,
    paintType: input.paintType,
    coverageRate,
    paintRequiredLiters: round(baseLiters),
    wasteMargin: input.wasteMargin,
    adjustedLiters: round(adjustedLiters),
    recommendedContainers: containers,
    totalRecommendedLiters: round(totalRecommended),
  };
}

// ─────────────────────────────────────────────────────────
// Cost calculations
// ─────────────────────────────────────────────────────────

// Paint cost based on actual container purchases, not a per-liter rate.
// When a product is selected with a container size > 0, we compute the
// number of containers needed (ceil) and multiply by the container price.
// When no product is selected, we fall back to the manual per-liter price.
export function calculatePaintCost(input: CostEstimateInput): { cost: number; containerCount: number } {
  if (input.paintUseContainerPricing && input.paintContainerSize > 0 && input.paintContainerPrice > 0) {
    const containersNeeded = Math.ceil(Math.max(0, input.paintLiters) / input.paintContainerSize);
    return {
      cost: containersNeeded * input.paintContainerPrice,
      containerCount: containersNeeded,
    };
  }
  // Manual per-liter fallback
  return {
    cost: Math.max(0, input.paintLiters) * Math.max(0, input.paintPricePerLiter),
    containerCount: 0,
  };
}

export function calculateMaterialCost(input: CostEstimateInput): number {
  let sum = 0;
  if (input.includeFiller) sum += Math.max(0, input.fillerCost);
  if (input.includePutty) sum += Math.max(0, input.puttyCost);
  if (input.includeSandpaper) sum += Math.max(0, input.sandpaperCost);
  if (input.includeBrushes) sum += Math.max(0, input.brushesCost);
  if (input.includeRollers) sum += Math.max(0, input.rollersCost);
  if (input.includeOther) sum += Math.max(0, input.otherMaterialsCost);
  return sum;
}

export function calculateLaborCost(input: CostEstimateInput): number {
  if (input.laborMode === 'perSqm') {
    return Math.max(0, input.paintableArea) * Math.max(0, input.laborRatePerSqm);
  }
  return Math.max(0, input.laborTotal);
}

export function calculateEstimatedTotal(input: CostEstimateInput): CostEstimateResult {
  const { cost: paintCost, containerCount } = calculatePaintCost(input);
  const primerCost = input.includePrimer
    ? Math.max(0, input.primerLiters) * Math.max(0, input.primerPricePerLiter)
    : 0;
  const fillerCost = input.includeFiller ? Math.max(0, input.fillerCost) : 0;
  const puttyCost = input.includePutty ? Math.max(0, input.puttyCost) : 0;
  const sandpaperCost = input.includeSandpaper ? Math.max(0, input.sandpaperCost) : 0;
  const brushesCost = input.includeBrushes ? Math.max(0, input.brushesCost) : 0;
  const rollersCost = input.includeRollers ? Math.max(0, input.rollersCost) : 0;
  const otherMaterialsCost = input.includeOther ? Math.max(0, input.otherMaterialsCost) : 0;
  const materialsCost = calculateMaterialCost(input);
  const laborCost = calculateLaborCost(input);
  const total = paintCost + primerCost + materialsCost + laborCost;

  return {
    paintCost: round(paintCost),
    paintContainerCount: containerCount,
    primerCost: round(primerCost),
    fillerCost: round(fillerCost),
    puttyCost: round(puttyCost),
    sandpaperCost: round(sandpaperCost),
    brushesCost: round(brushesCost),
    rollersCost: round(rollersCost),
    otherMaterialsCost: round(otherMaterialsCost),
    materialsCost: round(materialsCost),
    laborCost: round(laborCost),
    total: round(total),
    currency: input.currency,
    currencySymbol: input.currencySymbol,
  };
}

// ─────────────────────────────────────────────────────────
// Wall Screeding Mix Calculations (Paint + White Cement)
// ─────────────────────────────────────────────────────────

export function calculateScreedingMix(
  netScreedingAreaM2: number,
  config: ScreedingMixConfig
): ScreedingMixResult {
  const area = Math.max(0, netScreedingAreaM2);
  const coverageRate = Math.max(0.01, config.paintCoverageRateM2PerL);
  const wasteFraction = Math.max(0, Math.min(100, config.wastePercentage)) / 100;
  const taxFraction = Math.max(0, Math.min(100, config.taxVatPercentage)) / 100;

  // Screeding Paint (litres)
  const paintRequiredLiters = area / coverageRate;
  const paintWithWaste = paintRequiredLiters * (1 + wasteFraction);
  const paintBucketsNeeded = Math.ceil(paintWithWaste / Math.max(0.01, config.paintBucketSizeL));
  const paintTotalCost = paintBucketsNeeded * config.paintPricePerBucket;

  // White Cement (kg)
  const cementRequiredKg = paintWithWaste * config.cementConsumptionRatioKgPerL;
  const cementBagsNeeded = Math.ceil(cementRequiredKg / Math.max(0.01, config.cementBagSizeKg));
  const cementTotalCost = cementBagsNeeded * config.cementPricePerBag;

  // Costs
  const materialCost = paintTotalCost + cementTotalCost;
  const labourCost = 0; // Labour not included — negotiated separately
  const wasteAllowance = materialCost * (wasteFraction / (1 + wasteFraction)); // informational: waste portion of materialCost (already baked into quantities)
  const subtotal = materialCost;
  const taxAmount = subtotal * taxFraction;
  const grandTotal = subtotal + taxAmount;

  return {
    netScreedingArea: round(area),
    paintRequiredLiters: round(paintWithWaste),
    paintBucketsNeeded,
    paintUnitPrice: config.paintPricePerBucket,
    paintTotalCost: round(paintTotalCost),
    cementRequiredKg: round(cementRequiredKg),
    cementBagsNeeded,
    cementUnitPrice: config.cementPricePerBag,
    cementTotalCost: round(cementTotalCost),
    materialCost: round(materialCost),
    labourCost: round(labourCost),
    wasteAllowance: round(wasteFraction * 100),
    wasteAmount: round(wasteAllowance),
    taxAmount: round(taxAmount),
    grandTotal: round(grandTotal),
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  };
}

// ─────────────────────────────────────────────────────────
// Advanced Calculator
// ─────────────────────────────────────────────────────────

export interface AdvancedCalcInput {
  netArea: number;
  thickness: number; // mm
  coats: number;
  mixRatio: string;
  paintCoverageRateM2PerL: number;
  paintBucketSizeL: number;
  paintPricePerBucket: number;
  cementRatioKgPerL: number;
  cementBagSizeKg: number;
  cementPricePerBag: number;
  labourRatePerSqm: number;
  transportCost: number;
  wastePercentage: number;
  markupPercentage: number;
  profitPercentage: number;
  taxPercentage: number;
  currency: string;
  currencySymbol: string;
}

export function calculateAdvancedEstimate(input: AdvancedCalcInput): AdvancedEstimateData {
  const area = Math.max(0, input.netArea);
  const wasteFraction = Math.max(0, Math.min(100, input.wastePercentage)) / 100;
  const markupFraction = Math.max(0, input.markupPercentage) / 100;
  const profitFraction = Math.max(0, input.profitPercentage) / 100;
  const taxFraction = Math.max(0, Math.min(100, input.taxPercentage)) / 100;

  const coatMultiplier = Math.max(1, input.coats);
  const thicknessFactor = Math.max(1, input.thickness / 10); // relative to 10mm baseline

  const basePaintLiters = (area * coatMultiplier * thicknessFactor) / Math.max(0.01, input.paintCoverageRateM2PerL);
  const paintLiters = basePaintLiters * (1 + wasteFraction);
  const paintBuckets = Math.ceil(paintLiters / Math.max(0.01, input.paintBucketSizeL));
  const paintCost = paintBuckets * input.paintPricePerBucket;

  const cementKg = paintLiters * input.cementRatioKgPerL;
  const cementBags = Math.ceil(cementKg / Math.max(0.01, input.cementBagSizeKg));
  const cementCost = cementBags * input.cementPricePerBag;

  const materialCost = paintCost + cementCost;
  const labourCost = 0; // Labour not included — negotiated separately
  const transportCost = Math.max(0, input.transportCost);
  // Extract the waste portion from the already-waste-adjusted materialCost.
  // wasteAmount = materialCost × (wasteFraction / (1 + wasteFraction))
  const wasteAmount = materialCost * (wasteFraction / (1 + wasteFraction));
  // materialCost already includes waste (paintLiters = base × 1+waste%).
  // wasteAmount is informational only — represents the waste portion of materialCost.
  const subtotal = materialCost + transportCost;
  const markupAmount = subtotal * markupFraction;
  const profitAmount = (subtotal + markupAmount) * profitFraction;
  const preTax = subtotal + markupAmount + profitAmount;
  const taxAmount = preTax * taxFraction;
  const grandTotal = preTax + taxAmount;

  const lineItems: AdvancedEstimateLineItem[] = [
    { label: 'Screeding Paint (20 L Buckets)', quantity: paintBuckets, unit: 'bucket(s)', unitPrice: input.paintPricePerBucket, total: round(paintCost) },
    { label: 'White Cement (40 kg Bags)', quantity: cementBags, unit: 'bag(s)', unitPrice: input.cementPricePerBag, total: round(cementCost) },
    // Labour not included — negotiated separately
    { label: 'Transport & Logistics', quantity: 1, unit: 'trip', unitPrice: transportCost, total: round(transportCost) },
  ];

  return {
    projectType: 'screeding',
    netArea: round(area),
    thickness: input.thickness,
    coats: input.coats,
    mixRatio: input.mixRatio,
    paintLiters: round(paintLiters),
    paintBuckets,
    cementKg: round(cementKg),
    cementBags,
    lineItems,
    materialCost: round(materialCost),
    labourCost: round(labourCost),
    transportCost: round(transportCost),
    wastePercentage: input.wastePercentage,
    wasteAmount: round(wasteAmount),
    markupPercentage: input.markupPercentage,
    markupAmount: round(markupAmount),
    profitPercentage: input.profitPercentage,
    profitAmount: round(profitAmount),
    taxPercentage: input.taxPercentage,
    taxAmount: round(taxAmount),
    grandTotal: round(grandTotal),
    currency: input.currency,
    currencySymbol: input.currencySymbol,
    notes: '',
    aiRecommendations: [],
  };
}

// Backward-compatible alias.
export const calculateCost = calculateEstimatedTotal;

// ─────────────────────────────────────────────────────────
// Validation helpers — project-type-aware
// ─────────────────────────────────────────────────────────

export function validateCalculatorInput(input: CalculatorInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.projectType) errors.projectType = 'Select a project type';
  if (input.length <= 0 || !isFinite(input.length)) errors.length = 'Enter a valid length greater than 0';
  // Width is optional for all project types. When left blank, only the two
  // walls defined by length are calculated. Fence projects never use width.
  if (input.wallHeight <= 0 || !isFinite(input.wallHeight)) errors.wallHeight = 'Enter a valid wall height greater than 0';
  if (input.doors < 0 || !isFinite(input.doors)) errors.doors = 'Doors cannot be negative';
  if (input.windows < 0 || !isFinite(input.windows)) errors.windows = 'Windows cannot be negative';
  if (input.coats < 1 || !isFinite(input.coats)) errors.coats = 'Enter at least 1 coat';
  if (input.wasteMargin < 0 || input.wasteMargin > 100 || !isFinite(input.wasteMargin))
    errors.wasteMargin = 'Waste margin must be between 0 and 100';
  return errors;
}

// ─────────────────────────────────────────────────────────
// Rounding
// ─────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
