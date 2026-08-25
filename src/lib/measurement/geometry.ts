/**
 * FRELUX GEOMETRY ENGINE
 *
 * Calculates surface areas from normalised measurements.
 * All functions accept values in METRES and return SQUARE METRES.
 * No premature rounding — full precision is maintained (spec section 28).
 *
 * Surface types are treated independently (spec section 9):
 * - Wall: perimeter × height (room) or length × height (single wall / fence)
 * - Ceiling: length × width
 * - Floor: length × width
 * - Exterior: length × height (one surface at a time)
 * - Fence partition: partition length × height
 */

import type {} from './types';
import type { CalculationStep } from './types';

// =========================================================
// Area Calculations — all in metres, all return m²
// =========================================================

/**
 * Calculate wall area for a room.
 * Uses perimeter × height when both length and width are provided.
 * Falls back to 2 × length × height when width is omitted.
 */
export function wallAreaM2(
  lengthM: number,
  widthM: number | undefined,
  heightM: number,
): number {
  if (heightM <= 0 || lengthM <= 0) return 0;
  if (widthM === undefined || widthM <= 0) {
    // Only two walls (the ones defined by length)
    return 2 * lengthM * heightM;
  }
  const perimeter = 2 * (lengthM + widthM);
  return perimeter * heightM;
}

/**
 * Calculate ceiling area for a room.
 * Returns 0 if width is not provided (ceiling requires both dimensions).
 */
export function ceilingAreaM2(
  lengthM: number,
  widthM: number | undefined,
): number {
  if (lengthM <= 0) return 0;
  if (widthM === undefined || widthM <= 0) return 0;
  return lengthM * widthM;
}

/**
 * Calculate floor area (same geometry as ceiling but semantically distinct).
 */
export function floorAreaM2(
  lengthM: number,
  widthM: number | undefined,
): number {
  return ceilingAreaM2(lengthM, widthM);
}

/**
 * Calculate a single wall surface area (length × height).
 * Used for individual wall, exterior, and fence partition calculations.
 */
export function singleSurfaceAreaM2(
  lengthM: number,
  heightM: number,
): number {
  if (lengthM <= 0 || heightM <= 0) return 0;
  return lengthM * heightM;
}

/**
 * Calculate fence dimension area (spec section 10):
 * Partition Area = Length × Height
 * Dimension Area = Partition Area × Number of Partitions
 */
export function fenceDimensionAreaM2(
  partitionLengthM: number,
  heightM: number,
  partitionCount: number,
): number {
  const partitionArea = singleSurfaceAreaM2(partitionLengthM, heightM);
  return partitionArea * Math.max(1, partitionCount);
}

/**
 * Calculate a rectangular area from length × width.
 * Used for floors, ceilings, tile surfaces, etc.
 */
export function rectangularAreaM2(
  lengthM: number,
  widthM: number | undefined,
): number {
  if (lengthM <= 0) return 0;
  if (widthM === undefined || widthM <= 0) return 0;
  return lengthM * widthM;
}

/**
 * Calculate opening (door/window) deduction area.
 * Both dimensions must be in metres.
 */
export function openingAreaM2(
  widthM: number,
  heightM: number,
  count: number,
): number {
  if (widthM <= 0 || heightM <= 0 || count <= 0) return 0;
  return widthM * heightM * count;
}

/**
 * Apply opening deductions to a gross area.
 */
export function netAreaM2(
  grossAreaM2: number,
  openingAreaM2: number,
): number {
  return Math.max(0, grossAreaM2 - openingAreaM2);
}

// =========================================================
// Tile Geometry
// =========================================================

/**
 * Calculate the number of tiles needed for a given area.
 * No rounding — returns the exact theoretical value (spec section 28).
 * Rounding to whole cartons happens at the packaging stage.
 */
export function tilesRequired(
  areaM2: number,
  tileAreaM2: number,
): number {
  if (tileAreaM2 <= 0 || areaM2 <= 0) return 0;
  return areaM2 / tileAreaM2;
}

/**
 * Calculate cartons needed using Method A (tiles per carton).
 * Rounds UP because partial cartons cannot be purchased (spec section 14).
 */
export function cartonsFromTileCount(
  tilesNeeded: number,
  tilesPerCarton: number,
): number {
  if (tilesPerCarton <= 0 || tilesNeeded <= 0) return 0;
  return Math.ceil(tilesNeeded / tilesPerCarton);
}

/**
 * Calculate cartons needed using Method B (carton coverage in m²).
 * Rounds UP because partial cartons cannot be purchased.
 */
export function cartonsFromCoverage(
  areaM2: number,
  cartonCoverageM2: number,
): number {
  if (cartonCoverageM2 <= 0 || areaM2 <= 0) return 0;
  return Math.ceil(areaM2 / cartonCoverageM2);
}

// =========================================================
// Waste Allowance
// =========================================================

/**
 * Apply waste margin to an area. Returns the adjusted area.
 * Does NOT round — precision maintained (spec section 28).
 */
export function applyWasteMargin(
  areaM2: number,
  wasteMarginPercent: number,
): number {
  const margin = Math.max(0, Math.min(100, wasteMarginPercent)) / 100;
  return areaM2 * (1 + margin);
}

// =========================================================
// Rounding (spec section 28)
// =========================================================

/**
 * Round a value to a specified number of decimal places for display.
 * This does NOT alter the underlying calculation — it's for display only.
 */
export function roundForDisplay(value: number, decimals: number = 2): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Round UP to a whole purchasable unit (cartons, packs, buckets).
 * Partial units cannot be purchased (spec section 28).
 */
export function roundUpToWholeUnit(value: number): number {
  if (value <= 0 || !isFinite(value)) return 0;
  return Math.ceil(value);
}

// =========================================================
// Step Builder for Transparent Breakdown (spec section 26)
// =========================================================

export function makeStep(label: string, formula: string, value: string): CalculationStep {
  return { label, formula, value };
}

export function formatM2(value: number, decimals: number = 2): string {
  return `${roundForDisplay(value, decimals)} m²`;
}

export function formatCount(value: number): string {
  return `${roundForDisplay(value, 0)}`;
}
