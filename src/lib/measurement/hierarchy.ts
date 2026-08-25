/**
 * FRELUX MEASUREMENT HIERARCHY ENGINE
 *
 * Implements the Unit → Group → Section → Project calculation hierarchy (spec section 25).
 *
 * ROOM:      One room → identical rooms → room category → building
 * FENCE:     One partition → fence dimension → complete fence → project
 * SCREEDING: One surface → surface group → building/fence/exterior → total m²
 * TILING:    One tiled surface → tile group → room/building/project → total area
 * GRAFITEX:  One surface → surface group → project → total m²
 * PAINTING:  One room/section → identical room group → building/exterior/fence → buckets
 *
 * This module normalises measurements and computes areas in m².
 * It does NOT compute calculator-specific results (paint buckets, screeding materials, etc.)
 * — those are computed by the specialised calculation engines.
 *
 * Measurement entries are normalised here; results are stored SEPARATELY (spec section 32).
 */

import type {
  MeasurementEntry,
  MeasurementGroup,
  MeasurementSection,
  MeasurementProject,
  MeasurementEntryResult,
  MeasurementGroupResult,
  MeasurementSectionResult,
  MeasurementProjectResult,
  CalculationStep,
  SurfaceType,
} from './types';
import {
  toMeters,
  lengthUnitLabel,
  lengthUnitShort,
  tileAreaM2,
} from './units';
import {
  wallAreaM2,
  ceilingAreaM2,
  floorAreaM2,
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  rectangularAreaM2,
  applyWasteMargin,
  makeStep,
  formatM2,
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
  roundForDisplay,
} from './geometry';
import { DEFAULT_DOOR_WIDTH_M, DEFAULT_DOOR_HEIGHT_M, DEFAULT_WINDOW_WIDTH_M, DEFAULT_WINDOW_HEIGHT_M } from '@/lib/utils';

// =========================================================
// Entry-Level Calculation (UNIT in the hierarchy)
// =========================================================

/**
 * Normalise a single measurement entry and calculate its area in m².
 * Returns the normalised values, the computed area, and transparent calculation steps.
 *
 * This function does NOT round intermediate values (spec section 28).
 */
export function calculateMeasurementEntry(entry: MeasurementEntry): MeasurementEntryResult {
  const steps: CalculationStep[] = [];
  const _unitLabel = lengthUnitLabel(entry.unit);
  const unitShort = lengthUnitShort(entry.unit);

  // --- Normalise dimensions to metres ---
  const normalizedLengthM = toMeters(entry.length, entry.unit);
  steps.push(makeStep(
    'Convert length',
    `${entry.length} ${unitShort} → metres`,
    `${roundForDisplay(normalizedLengthM, 4)} m`,
  ));

  let normalizedWidthM: number | undefined;
  if (entry.width !== undefined && entry.width > 0) {
    normalizedWidthM = toMeters(entry.width, entry.unit);
    steps.push(makeStep(
      'Convert width',
      `${entry.width} ${unitShort} → metres`,
      `${roundForDisplay(normalizedWidthM, 4)} m`,
    ));
  }

  let normalizedHeightM: number | undefined;
  if (entry.height !== undefined && entry.height > 0) {
    normalizedHeightM = toMeters(entry.height, entry.unit);
    steps.push(makeStep(
      'Convert height',
      `${entry.height} ${unitShort} → metres`,
      `${roundForDisplay(normalizedHeightM, 4)} m`,
    ));
  }

  // --- Determine surface type and calculate area ---
  const surfaceType = entry.surfaceType ?? inferSurfaceType(entry);
  let areaM2 = 0;

  switch (surfaceType) {
    case 'wall':
      areaM2 = wallAreaM2(normalizedLengthM, normalizedWidthM, normalizedHeightM ?? 0);
      if (normalizedWidthM && normalizedHeightM) {
        steps.push(makeStep(
          'Wall area',
          `perimeter × height = 2 × (${roundForDisplay(normalizedLengthM)} + ${roundForDisplay(normalizedWidthM)}) × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      } else if (normalizedHeightM) {
        steps.push(makeStep(
          'Wall area',
          `2 × length × height = 2 × ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'ceiling':
      areaM2 = ceilingAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          'Ceiling area',
          `length × width = ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'floor':
      areaM2 = floorAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          'Floor area',
          `length × width = ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'exterior':
      areaM2 = singleSurfaceAreaM2(normalizedLengthM, normalizedHeightM ?? 0);
      if (normalizedHeightM) {
        steps.push(makeStep(
          'Exterior surface area',
          `length × height = ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'fence': {
      // Fence: partition-based (spec section 10–11)
      const partitionCount = entry.partitionCount ?? 1;
      areaM2 = fenceDimensionAreaM2(normalizedLengthM, normalizedHeightM ?? 0, partitionCount);
      if (normalizedHeightM) {
        steps.push(makeStep(
          'Fence partition area',
          `length × height = ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(singleSurfaceAreaM2(normalizedLengthM, normalizedHeightM)),
        ));
        steps.push(makeStep(
          `Fence dimension area (${partitionCount} partition${partitionCount > 1 ? 's' : ''})`,
          `partition area × ${partitionCount}`,
          formatM2(areaM2),
        ));
      }
      break;
      }

    default:
      // Generic rectangular area (custom surfaces, tiling surfaces)
      areaM2 = rectangularAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          'Surface area',
          `length × width = ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
  }

  // --- Apply opening deductions (doors/windows) ---
  if (entry.doors && entry.doors > 0) {
    const doorArea = entry.doors * DEFAULT_DOOR_WIDTH_M * DEFAULT_DOOR_HEIGHT_M;
    areaM2 = Math.max(0, areaM2 - doorArea);
    steps.push(makeStep(
      `Door deductions (${entry.doors})`,
      `${entry.doors} × ${roundForDisplay(DEFAULT_DOOR_WIDTH_M)} × ${roundForDisplay(DEFAULT_DOOR_HEIGHT_M)} m`,
      `−${formatM2(doorArea)}`,
    ));
  }
  if (entry.windows && entry.windows > 0) {
    const windowArea = entry.windows * DEFAULT_WINDOW_WIDTH_M * DEFAULT_WINDOW_HEIGHT_M;
    areaM2 = Math.max(0, areaM2 - windowArea);
    steps.push(makeStep(
      `Window deductions (${entry.windows})`,
      `${entry.windows} × ${roundForDisplay(DEFAULT_WINDOW_WIDTH_M)} × ${roundForDisplay(DEFAULT_WINDOW_HEIGHT_M)} m`,
      `−${formatM2(windowArea)}`,
    ));
  }

  // --- Apply waste margin ---
  if (entry.wasteMarginPercent && entry.wasteMarginPercent > 0) {
    const _beforeWaste = areaM2;
    areaM2 = applyWasteMargin(areaM2, entry.wasteMarginPercent);
    steps.push(makeStep(
      'Waste allowance',
      `+${entry.wasteMarginPercent}%`,
      formatM2(areaM2),
    ));
  }

  // --- Multiply by quantity ---
  const quantity = Math.max(1, entry.quantity ?? 1);
  const totalAreaM2 = areaM2 * quantity;
  if (quantity > 1) {
    steps.push(makeStep(
      `Multiply by quantity (${quantity})`,
      `${formatM2(areaM2)} × ${quantity}`,
      formatM2(totalAreaM2),
    ));
  }

  return {
    entryId: entry.id,
    normalizedLengthM,
    normalizedWidthM,
    normalizedHeightM,
    areaM2,
    totalAreaM2,
    steps,
  };
}

/**
 * Infer surface type from entry context when not explicitly set.
 */
function inferSurfaceType(entry: MeasurementEntry): SurfaceType {
  if (entry.partitionCount && entry.partitionCount > 0) return 'fence';
  if (entry.height && entry.height > 0 && !entry.width) return 'wall';
  if (entry.height && entry.height > 0 && entry.width) return 'wall';
  if (entry.width && entry.width > 0 && !entry.height) return 'floor';
  return 'floor';
}

// =========================================================
// Group-Level Calculation (GROUP in the hierarchy)
// =========================================================

/**
 * Calculate a measurement group (entry × quantity).
 * The entry result already includes the quantity multiplier,
 * so the group result is the same as the entry result.
 */
export function calculateMeasurementGroup(group: MeasurementGroup): MeasurementGroupResult {
  const entryResult = calculateMeasurementEntry(group.entry);
  const steps: CalculationStep[] = [...entryResult.steps];

  return {
    groupId: group.id,
    label: group.label,
    entryResult,
    totalAreaM2: entryResult.totalAreaM2,
    steps,
  };
}

// =========================================================
// Section-Level Calculation (SECTION in the hierarchy)
// =========================================================

/**
 * Calculate a measurement section (sum of all groups).
 */
export function calculateMeasurementSection(section: MeasurementSection): MeasurementSectionResult {
  const groupResults: MeasurementGroupResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];

  for (const group of section.groups) {
    const groupResult = calculateMeasurementGroup(group);
    groupResults.push(groupResult);
    totalAreaM2 += groupResult.totalAreaM2;
    steps.push(makeStep(
      group.label,
      'group total',
      formatM2(groupResult.totalAreaM2),
    ));
  }

  steps.push(makeStep(
    `Section: ${section.label}`,
    `sum of ${groupResults.length} group${groupResults.length > 1 ? 's' : ''}`,
    formatM2(totalAreaM2),
  ));

  return {
    sectionId: section.id,
    label: section.label,
    groupResults,
    totalAreaM2,
    steps,
  };
}

// =========================================================
// Project-Level Calculation (PROJECT in the hierarchy)
// =========================================================

/**
 * Calculate the entire measurement project.
 * Returns the total area in m² and a full transparent breakdown.
 *
 * This is the MAIN entry point for all calculators.
 * The returned totalAreaM2 is what gets passed to the specialised
 * calculation engine (painting → buckets, screeding → materials, etc.).
 */
export function calculateMeasurementProject(project: MeasurementProject): MeasurementProjectResult {
  const sectionResults: MeasurementSectionResult[] = [];
  const entryResults: MeasurementEntryResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];

  for (const section of project.sections) {
    const sectionResult = calculateMeasurementSection(section);
    sectionResults.push(sectionResult);
    totalAreaM2 += sectionResult.totalAreaM2;
    entryResults.push(...sectionResult.groupResults.map((g) => g.entryResult));
    steps.push(...sectionResult.steps);
  }

  steps.push(makeStep(
    'Total project area',
    `sum of all sections`,
    formatM2(totalAreaM2),
  ));

  return {
    projectId: project.id,
    calculatorContext: project.calculatorContext,
    sectionResults,
    totalAreaM2,
    steps,
    entryResults,
  };
}

// =========================================================
// Tile-Specific Calculation (spec sections 12–15)
// =========================================================

export interface TileCalculationResult {
  surfaceAreaM2: number;
  tileAreaM2: number;
  tilesRequired: number;
  cartonsRequired: number;
  method: 'tiles_per_carton' | 'carton_coverage';
  steps: CalculationStep[];
}

/**
 * Calculate tile requirements from a normalised area and tile configuration.
 * Supports both Method A (tiles per carton) and Method B (carton coverage).
 *
 * Does NOT hardcode tile sizes or carton quantities (spec section 23).
 * Rounds cartons UP to whole purchasable units (spec section 28).
 */
export function calculateTileRequirement(
  areaM2: number,
  tileConfig: NonNullable<MeasurementEntry['tileConfig']>,
): TileCalculationResult {
  const steps: CalculationStep[] = [];

  // Tile area
  const tileArea = tileAreaM2(tileConfig.tileLength, tileConfig.tileWidth, tileConfig.tileUnit);
  steps.push(makeStep(
    'Tile area',
    `${tileConfig.tileLength}${tileConfig.tileUnit} × ${tileConfig.tileWidth}${tileConfig.tileUnit}`,
    `${roundForDisplay(tileArea, 4)} m²`,
  ));

  // Tiles required (no rounding — theoretical value)
  const tiles = tilesRequired(areaM2, tileArea);
  steps.push(makeStep(
    'Tiles required',
    `${formatM2(areaM2)} ÷ ${roundForDisplay(tileArea, 4)} m²`,
    `${roundForDisplay(tiles, 2)} tiles`,
  ));

  // Cartons required
  let cartons: number;
  if (tileConfig.packagingMethod === 'tiles_per_carton' && tileConfig.tilesPerCarton) {
    cartons = cartonsFromTileCount(tiles, tileConfig.tilesPerCarton);
    steps.push(makeStep(
      'Cartons required',
      `${roundForDisplay(tiles, 2)} tiles ÷ ${tileConfig.tilesPerCarton} tiles/carton`,
      `${cartons} cartons (rounded up)`,
    ));
  } else if (tileConfig.packagingMethod === 'carton_coverage' && tileConfig.cartonCoverageM2) {
    cartons = cartonsFromCoverage(areaM2, tileConfig.cartonCoverageM2);
    steps.push(makeStep(
      'Cartons required',
      `${formatM2(areaM2)} ÷ ${tileConfig.cartonCoverageM2} m²/carton`,
      `${cartons} cartons (rounded up)`,
    ));
  } else {
    cartons = 0;
    steps.push(makeStep(
      'Cartons required',
      'Missing packaging data',
      'Error — configure tile packaging',
    ));
  }

  return {
    surfaceAreaM2: areaM2,
    tileAreaM2: tileArea,
    tilesRequired: tiles,
    cartonsRequired: cartons,
    method: tileConfig.packagingMethod,
    steps,
  };
}
