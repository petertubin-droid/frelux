/**
 * FRELUX FENCE ELEMENT ENGINE
 *
 * Feature 4 of 16: Fence Element Engine
 *
 * Builds ON TOP of the existing measurement system.
 * Does NOT modify existing functions.
 *
 * A fence is NOT hardcoded to 4 dimensions.
 * The user specifies:
 * - Number of dimensions/sides
 * - For each dimension: length, unit, height, partition count, partition size
 *
 * Calculation hierarchy:
 *   Partition → Dimension → Entire Fence
 *
 * For screeding: Length × Height → area → m² (area-based, NOT bucket-based)
 * For tiling: fence/partition logic supports tile quantity calculations
 *   with tile dimensions and package coverage.
 *
 * Supports:
 * - User-specified number of dimensions (not hardcoded to 4)
 * - Per-dimension: length, height, unit, partition count
 * - Per-dimension: optional partition size override
 * - Unit conversion (feet → metres → square metres)
 * - Aggregation: partition → dimension → total fence
 */

import type { LengthUnit, CalculationStep } from './types';
import type {} from './types';
import { toMeters, lengthUnitShort, tileAreaM2 } from './units';
import {
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  applyWasteMargin,
  makeStep,
  formatM2,
  roundForDisplay,
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
} from './geometry';
import type { TileConfig } from './types';
import { generateId } from './factory';

// =========================================================
// FENCE DIMENSION (one side of the fence)
// =========================================================

/**
 * A single dimension (side) of a fence.
 * Each dimension has its own length, height, and partition count.
 */
export interface FenceDimension {
  /** Unique identifier */
  id: string;
  /** Human-readable label (e.g. "Front", "Left Side", "Dimension 1") */
  label: string;
  /** Length of this dimension in the user's input unit */
  length: number;
  /** Unit for the length (feet, metres, inches) */
  unit: LengthUnit;
  /** Height of this dimension in the user's input unit */
  height: number;
  /** Unit for the height (defaults to same as length unit) */
  heightUnit?: LengthUnit;
  /** Number of partitions in this dimension */
  partitionCount: number;
  /** Optional: explicit partition length (if partitions are not evenly distributed) */
  partitionLength?: number;
  /** Optional: explicit partition length unit */
  partitionLengthUnit?: LengthUnit;
  /** Optional: waste margin for this dimension (0–100) */
  wasteMarginPercent: number;
  /** Optional: tile configuration (for tiled fence surfaces) */
  tileConfig?: TileConfig;
}

/**
 * Result of calculating a single fence dimension.
 */
export interface FenceDimensionResult {
  dimensionId: string;
  label: string;
  /** Normalized length in metres */
  normalizedLengthM: number;
  /** Normalized height in metres */
  normalizedHeightM: number;
  /** Number of partitions */
  partitionCount: number;
  /** Area of one partition in m² */
  partitionAreaM2: number;
  /** Total area for this dimension (partition area × partition count) */
  dimensionAreaM2: number;
  /** Area after waste margin */
  adjustedAreaM2: number;
  /** Tiles needed (if tile config provided) */
  tilesNeeded?: number;
  /** Cartons needed (if tile config provided) */
  cartonsNeeded?: number;
  /** Calculation steps */
  steps: CalculationStep[];
}

// =========================================================
// FENCE (complete fence with multiple dimensions)
// =========================================================

/**
 * A complete fence with multiple dimensions/sides.
 */
export interface Fence {
  id: string;
  /** Fence name (e.g. "Front Fence", "Perimeter Fence") */
  name: string;
  /** Default unit for new dimensions */
  defaultUnit: LengthUnit;
  /** All dimensions/sides of the fence */
  dimensions: FenceDimension[];
  /** Finish type for this fence (screeding, tiling, paint, etc.) */
  finishType: 'screeding' | 'tiling' | 'paint' | 'grafitex' | 'other';
  /** Global waste margin applied to all dimensions (can be overridden per dimension) */
  globalWastePercent: number;
  /** Optional tile config (applied to all dimensions if they don't have their own) */
  tileConfig?: TileConfig;
}

/**
 * Result of calculating a complete fence.
 */
export interface FenceResult {
  fenceId: string;
  name: string;
  dimensionResults: FenceDimensionResult[];
  /** Total fence area in m² */
  totalAreaM2: number;
  /** Total tiles needed across all dimensions (if tiling) */
  totalTilesNeeded?: number;
  /** Total cartons needed across all dimensions (if tiling) */
  totalCartonsNeeded?: number;
  steps: CalculationStep[];
}

// =========================================================
// FACTORY FUNCTIONS
// =========================================================

/**
 * Create a new fence dimension with defaults.
 */
export function createFenceDimension(
  partial: Partial<FenceDimension> = {},
): FenceDimension {
  return {
    id: generateId('fdim'),
    label: partial.label ?? 'Dimension 1',
    length: partial.length ?? 0,
    unit: partial.unit ?? 'feet',
    height: partial.height ?? 0,
    heightUnit: partial.heightUnit,
    partitionCount: partial.partitionCount ?? 1,
    partitionLength: partial.partitionLength,
    partitionLengthUnit: partial.partitionLengthUnit,
    wasteMarginPercent: partial.wasteMarginPercent ?? 0,
    tileConfig: partial.tileConfig,
  };
}

/**
 * Create a new fence.
 */
export function createFence(
  name: string = 'New Fence',
  defaultUnit: LengthUnit = 'feet',
): Fence {
  return {
    id: generateId('fence'),
    name,
    defaultUnit,
    dimensions: [],
    finishType: 'screeding',
    globalWastePercent: 0,
  };
}

/**
 * Create a fence with a specified number of dimensions.
 * Does NOT hardcode 4 — user specifies the count.
 */
export function createFenceWithDimensions(
  name: string,
  dimensionCount: number,
  defaultUnit: LengthUnit = 'feet',
  defaultHeight: number = 6,
  defaultPartitionCount: number = 1,
): Fence {
  const fence = createFence(name, defaultUnit);
  for (let i = 0; i < dimensionCount; i++) {
    fence.dimensions.push(
      createFenceDimension({
        label: `Dimension ${i + 1}`,
        unit: defaultUnit,
        height: defaultHeight,
        partitionCount: defaultPartitionCount,
      }),
    );
  }
  return fence;
}

// =========================================================
// DIMENSION CALCULATION
// =========================================================

/**
 * Calculate a single fence dimension.
 *
 * Partition Area = Length × Height (converted to metres, area in m²)
 * Dimension Area = Partition Area × Number of Partitions
 *
 * For screeding: area is in m² (area-based calculation, NOT bucket-based)
 * For tiling: tiles and cartons are calculated if tile config is provided
 */
export function calculateFenceDimension(
  dimension: FenceDimension,
  globalWastePercent: number = 0,
  globalTileConfig?: TileConfig,
): FenceDimensionResult {
  const steps: CalculationStep[] = [];
  const unitShort = lengthUnitShort(dimension.unit);
  const heightUnit = dimension.heightUnit ?? dimension.unit;
  const heightUnitShort = lengthUnitShort(heightUnit);

  // Normalize length to metres
  const normalizedLengthM = toMeters(dimension.length, dimension.unit);
  steps.push(makeStep(
    'Convert length',
    `${dimension.length} ${unitShort} → metres`,
    `${roundForDisplay(normalizedLengthM, 4)} m`,
  ));

  // Normalize height to metres
  const normalizedHeightM = toMeters(dimension.height, heightUnit);
  steps.push(makeStep(
    'Convert height',
    `${dimension.height} ${heightUnitShort} → metres`,
    `${roundForDisplay(normalizedHeightM, 4)} m`,
  ));

  // Calculate partition area
  const partitionAreaM2 = singleSurfaceAreaM2(normalizedLengthM, normalizedHeightM);
  steps.push(makeStep(
    `Partition area (${dimension.label})`,
    `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
    formatM2(partitionAreaM2),
  ));

  // Calculate dimension area (partition × partition count)
  const dimensionAreaM2 = fenceDimensionAreaM2(
    normalizedLengthM,
    normalizedHeightM,
    dimension.partitionCount,
  );
  if (dimension.partitionCount > 1) {
    steps.push(makeStep(
      `Dimension area (${dimension.label}, ${dimension.partitionCount} partitions)`,
      `${formatM2(partitionAreaM2)} × ${dimension.partitionCount}`,
      formatM2(dimensionAreaM2),
    ));
  }

  // Apply waste margin (use dimension's or global)
  const wastePercent = dimension.wasteMarginPercent > 0
    ? dimension.wasteMarginPercent
    : globalWastePercent;
  let adjustedAreaM2 = dimensionAreaM2;
  if (wastePercent > 0) {
    adjustedAreaM2 = applyWasteMargin(dimensionAreaM2, wastePercent);
    steps.push(makeStep(
      'Waste allowance',
      `+${wastePercent}%`,
      formatM2(adjustedAreaM2),
    ));
  }

  // Calculate tiles if tile config is provided
  const tileConfig = dimension.tileConfig ?? globalTileConfig;
  let tilesNeeded: number | undefined;
  let cartonsNeeded: number | undefined;

  if (tileConfig) {
    const singleTileArea = tileAreaM2(
      tileConfig.tileLength,
      tileConfig.tileWidth,
      tileConfig.tileUnit,
    );

    if (singleTileArea > 0 && adjustedAreaM2 > 0) {
      tilesNeeded = tilesRequired(adjustedAreaM2, singleTileArea);
      steps.push(makeStep(
        `Tiles needed (${dimension.label})`,
        `${formatM2(adjustedAreaM2)} ÷ ${roundForDisplay(singleTileArea, 6)} m²/tile`,
        `${roundForDisplay(tilesNeeded, 2)} tiles`,
      ));

      if (tileConfig.packagingMethod === 'tiles_per_carton' && tileConfig.tilesPerCarton) {
        cartonsNeeded = cartonsFromTileCount(tilesNeeded, tileConfig.tilesPerCarton);
        steps.push(makeStep(
          `Cartons (${tileConfig.tilesPerCarton} tiles/carton)`,
          `⌈${roundForDisplay(tilesNeeded, 2)} ÷ ${tileConfig.tilesPerCarton}⌉`,
          `${cartonsNeeded} cartons`,
        ));
      } else if (tileConfig.packagingMethod === 'carton_coverage' && tileConfig.cartonCoverageM2) {
        cartonsNeeded = cartonsFromCoverage(adjustedAreaM2, tileConfig.cartonCoverageM2);
        steps.push(makeStep(
          `Cartons (${tileConfig.cartonCoverageM2} m²/carton)`,
          `⌈${formatM2(adjustedAreaM2)} ÷ ${tileConfig.cartonCoverageM2}⌉`,
          `${cartonsNeeded} cartons`,
        ));
      }
    }
  }

  return {
    dimensionId: dimension.id,
    label: dimension.label,
    normalizedLengthM,
    normalizedHeightM,
    partitionCount: dimension.partitionCount,
    partitionAreaM2,
    dimensionAreaM2,
    adjustedAreaM2,
    tilesNeeded,
    cartonsNeeded,
    steps,
  };
}

// =========================================================
// FENCE CALCULATION
// =========================================================

/**
 * Calculate a complete fence.
 * Iterates through all dimensions, calculates each, and aggregates the total.
 *
 * For screeding: total area is in m² (area-based)
 * For tiling: total tiles and cartons are aggregated across dimensions
 */
export function calculateFence(fence: Fence): FenceResult {
  const dimensionResults: FenceDimensionResult[] = [];
  let totalAreaM2 = 0;
  let totalTilesNeeded = 0;
  let totalCartonsNeeded = 0;
  let hasTiles = false;
  const steps: CalculationStep[] = [];

  for (const dimension of fence.dimensions) {
    const result = calculateFenceDimension(
      dimension,
      fence.globalWastePercent,
      fence.tileConfig,
    );
    dimensionResults.push(result);
    totalAreaM2 += result.adjustedAreaM2;

    if (result.tilesNeeded !== undefined) {
      totalTilesNeeded += result.tilesNeeded;
      hasTiles = true;
    }
    if (result.cartonsNeeded !== undefined) {
      totalCartonsNeeded += result.cartonsNeeded;
    }

    steps.push(makeStep(
      `${dimension.label} (×${dimension.partitionCount})`,
      'dimension area',
      formatM2(result.adjustedAreaM2),
    ));
  }

  steps.push(makeStep(
    `Total: ${fence.name}`,
    `sum of ${fence.dimensions.length} dimension${fence.dimensions.length !== 1 ? 's' : ''}`,
    formatM2(totalAreaM2),
  ));

  return {
    fenceId: fence.id,
    name: fence.name,
    dimensionResults,
    totalAreaM2,
    totalTilesNeeded: hasTiles ? totalTilesNeeded : undefined,
    totalCartonsNeeded: hasTiles ? totalCartonsNeeded : undefined,
    steps,
  };
}

// =========================================================
// FENCE → SPACE BRIDGE
// =========================================================

import { createSpace } from './space-engine';

/**
 * Convert a fence dimension to a Space for the Space Engine.
 * Each dimension becomes a Space with surfaceType='fence'.
 */
export function fenceDimensionToSpace(
  dimension: FenceDimension,
  finishType: string = 'screeding',
): import('./space-engine').Space {
  return createSpace({
    name: dimension.label,
    type: 'other',
    length: dimension.length,
    height: dimension.height,
    unit: dimension.unit,
    quantity: dimension.partitionCount,
    surfaceType: 'fence',
    finishType: finishType as string,
    wasteMarginPercent: dimension.wasteMarginPercent,
    partitionCount: dimension.partitionCount,
    tileConfig: dimension.tileConfig,
  });
}

/**
 * Convert an entire fence to an array of Spaces.
 */
export function fenceToSpaces(fence: Fence): import('./space-engine').Space[] {
  return fence.dimensions.map((dim) =>
    fenceDimensionToSpace(dim, fence.finishType),
  );
}
