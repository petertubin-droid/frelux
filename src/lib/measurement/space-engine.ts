/**
 * FRELUX SPACE ENGINE
 *
 * Feature 2 of 16: Reusable Space Engine
 *
 * Builds ON TOP of the existing measurement system.
 * Does NOT modify existing types or functions.
 *
 * A "Space" is a higher-level abstraction over MeasurementEntry that:
 * - Has a proper name (e.g. "Master Bedroom", "Kitchen 2")
 * - Has a space type (bedroom, bathroom, kitchen, corridor, etc.)
 * - Stores dimensions (length, width, height, unit)
 * - Supports quantity (repeated identical spaces)
 * - Supports openings (doors, windows)
 * - Supports ceiling inclusion
 * - Supports surface/finish type
 * - Remains independently configurable per space
 *
 * Spaces are NOT interchangeable — a bedroom is not a kitchen.
 * Repeated spaces (quantity > 1) are calculated once and multiplied.
 * Different spaces remain independently configured.
 */

import type {
  SpaceType,
  SurfaceType,
  MeasurementEntry,
  MeasurementGroup,
  MeasurementSection,
  MeasurementProject,
  MeasurementProjectResult,
  CalculationStep,
} from './types';
import { SPACE_TYPE_LABELS } from './types';
import type { LengthUnit, CalculatorContext } from './units';
import { createMeasurementEntry, createMeasurementGroup, createMeasurementSection, generateId } from './factory';
import { calculateMeasurementProject } from './hierarchy';
import type { ExtendedLengthUnit } from './extended-units';

// =========================================================
// SURFACE / FINISH TYPES
// =========================================================

/**
 * The finish/surface treatment for a space.
 * This is NOT the same as SurfaceType (wall/ceiling/floor).
 * FinishType describes WHAT material/treatment is applied.
 */
export type FinishType =
  | 'paint'
  | 'screeding'
  | 'tiling'
  | 'grafitex'
  | 'pop'
  | 'tyrolene'
  | 'block'
  | 'none'
  | 'custom';

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  paint: 'Paint',
  screeding: 'Screeding',
  tiling: 'Tiling',
  grafitex: 'Grafitex',
  pop: 'POP (Plaster of Paris)',
  tyrolene: 'Tyrolene',
  block: 'Block Work',
  none: 'No Finish',
  custom: 'Custom Finish',
};

// =========================================================
// SPACE CONFIGURATION
// =========================================================

/**
 * A space opening (door or window) with explicit dimensions.
 * More detailed than the existing doors/windows count on MeasurementEntry.
 * Each opening can have custom dimensions.
 */
export interface SpaceOpening {
  id: string;
  type: 'door' | 'window' | 'archway' | 'vent' | 'other';
  width: number;
  height: number;
  unit: LengthUnit;
  count: number;
}

/**
 * A complete Space definition.
 *
 * This wraps the existing MeasurementEntry with higher-level metadata:
 * - A proper name (not just a description)
 * - Surface/finish type
 * - Explicit openings with dimensions
 * - Calculator-specific properties
 */
export interface Space {
  /** Unique identifier */
  id: string;
  /** Human-readable name (e.g. "Master Bedroom", "Kitchen") */
  name: string;
  /** Space type (bedroom, bathroom, kitchen, corridor, etc.) */
  type: SpaceType;
  /** Length in the user's input unit */
  length: number;
  /** Width in the user's input unit */
  width?: number;
  /** Height in the user's input unit (walls, fences) */
  height?: number;
  /** User's input unit */
  unit: LengthUnit;
  /** Quantity: how many identical spaces (e.g. 2 identical bedrooms) */
  quantity: number;
  /** Whether to include ceiling in calculations */
  includeCeiling: boolean;
  /** Surface type for this space (wall, floor, etc.) */
  surfaceType: SurfaceType;
  /** Finish/treatment type */
  finishType: FinishType;
  /** Explicit openings (doors, windows) with dimensions */
  openings: SpaceOpening[];
  /** Additional calculator-specific properties */
  properties: Record<string, unknown>;
  /** Waste margin percentage (0–100) */
  wasteMarginPercent: number;
  /** Partition count (for fence spaces) */
  partitionCount?: number;
  /** Tile config (for tiling spaces) */
  tileConfig?: import('./types').TileConfig;
}

/**
 * Result of calculating a single space.
 */
export interface SpaceResult {
  spaceId: string;
  name: string;
  type: SpaceType;
  finishType: FinishType;
  /** Area for one instance (before quantity multiplication) */
  areaM2: number;
  /** Total area after multiplying by quantity */
  totalAreaM2: number;
  /** Normalized length in metres */
  normalizedLengthM: number;
  /** Normalized width in metres */
  normalizedWidthM?: number;
  /** Normalized height in metres */
  normalizedHeightM?: number;
  /** Quantity */
  quantity: number;
  /** Transparent calculation steps */
  steps: CalculationStep[];
}

/**
 * A collection of spaces forming a space group (e.g. "Bedrooms", "Bathrooms").
 * Different spaces of the same type are grouped for display.
 */
export interface SpaceGroup {
  id: string;
  label: string;
  spaces: Space[];
}

/**
 * Result of calculating a space group.
 */
export interface SpaceGroupResult {
  groupId: string;
  label: string;
  spaceResults: SpaceResult[];
  totalAreaM2: number;
  steps: CalculationStep[];
}

/**
 * A complete space collection — all spaces in a project.
 */
export interface SpaceCollection {
  id: string;
  name: string;
  spaces: Space[];
  preferredUnit: LengthUnit;
}

/**
 * Result of calculating a full space collection.
 */
export interface SpaceCollectionResult {
  collectionId: string;
  name: string;
  spaceResults: SpaceResult[];
  groupResults: SpaceGroupResult[];
  totalAreaM2: number;
  steps: CalculationStep[];
}

// =========================================================
// SPACE FACTORY
// =========================================================

/**
 * Create a new space with sensible defaults.
 */
export function createSpace(partial: Partial<Space> = {}): Space {
  return {
    id: generateId('space'),
    name: partial.name ?? 'New Space',
    type: partial.type ?? 'other',
    length: partial.length ?? 0,
    width: partial.width,
    height: partial.height,
    unit: partial.unit ?? 'feet',
    quantity: partial.quantity ?? 1,
    includeCeiling: partial.includeCeiling ?? false,
    surfaceType: partial.surfaceType ?? 'wall',
    finishType: partial.finishType ?? 'none',
    openings: partial.openings ?? [],
    properties: partial.properties ?? {},
    wasteMarginPercent: partial.wasteMarginPercent ?? 0,
    partitionCount: partial.partitionCount,
    tileConfig: partial.tileConfig,
  };
}

/**
 * Create an opening (door, window, etc.) with dimensions.
 */
export function createOpening(partial: Partial<SpaceOpening> = {}): SpaceOpening {
  return {
    id: generateId('opening'),
    type: partial.type ?? 'door',
    width: partial.width ?? 3,
    height: partial.height ?? 7,
    unit: partial.unit ?? 'feet',
    count: partial.count ?? 1,
  };
}

/**
 * Create a space collection.
 */
export function createSpaceCollection(
  name: string = 'New Collection',
  preferredUnit: LengthUnit = 'feet',
  spaces: Space[] = [],
): SpaceCollection {
  return {
    id: generateId('collection'),
    name,
    spaces,
    preferredUnit,
  };
}

// =========================================================
// SPACE → MEASUREMENT ENTRY BRIDGE
// =========================================================

/**
 * Convert a Space to a MeasurementEntry.
 * This bridges the Space Engine to the existing calculation hierarchy.
 *
 * The Space is the user-facing concept.
 * The MeasurementEntry is the calculation input.
 */
export function spaceToMeasurementEntry(space: Space): MeasurementEntry {
  // Aggregate openings into door/window counts for the existing system
  let doorCount = 0;
  let windowCount = 0;
  for (const opening of space.openings) {
    if (opening.type === 'door' || opening.type === 'archway') {
      doorCount += opening.count;
    } else if (opening.type === 'window' || opening.type === 'vent') {
      windowCount += opening.count;
    }
  }

  return createMeasurementEntry({
    spaceType: space.type,
    surfaceType: space.surfaceType,
    length: space.length,
    width: space.width,
    height: space.height,
    unit: space.unit,
    quantity: space.quantity,
    includeCeiling: space.includeCeiling,
    doors: doorCount > 0 ? doorCount : undefined,
    windows: windowCount > 0 ? windowCount : undefined,
    wasteMarginPercent: space.wasteMarginPercent > 0 ? space.wasteMarginPercent : undefined,
    partitionCount: space.partitionCount,
    tileConfig: space.tileConfig,
    description: space.name,
    calculationPurpose: space.finishType,
  });
}

// =========================================================
// SPACE CALCULATION
// =========================================================

import { toMeters, lengthUnitShort, lengthUnitLabel } from './units';
import {
  makeStep,
  formatM2,
  roundForDisplay,
  wallAreaM2,
  ceilingAreaM2,
  floorAreaM2,
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  rectangularAreaM2,
  applyWasteMargin,
} from './geometry';
import { DEFAULT_DOOR_WIDTH_M, DEFAULT_DOOR_HEIGHT_M, DEFAULT_WINDOW_WIDTH_M, DEFAULT_WINDOW_HEIGHT_M } from '@/lib/utils';

/**
 * Calculate a single space.
 * Normalises dimensions to metres, computes area, applies openings and waste,
 * and multiplies by quantity.
 *
 * This does NOT use the existing hierarchy engine directly — it computes
 * the space's area using the same geometry functions but with space-level
 * metadata (finish type, named openings, etc.).
 */
export function calculateSpace(space: Space): SpaceResult {
  const steps: CalculationStep[] = [];
  const unitShort = lengthUnitShort(space.unit);

  // Normalize dimensions to metres
  const normalizedLengthM = toMeters(space.length, space.unit);
  steps.push(makeStep(
    'Convert length',
    `${space.length} ${unitShort} → metres`,
    `${roundForDisplay(normalizedLengthM, 4)} m`,
  ));

  let normalizedWidthM: number | undefined;
  if (space.width !== undefined && space.width > 0) {
    normalizedWidthM = toMeters(space.width, space.unit);
    steps.push(makeStep(
      'Convert width',
      `${space.width} ${unitShort} → metres`,
      `${roundForDisplay(normalizedWidthM, 4)} m`,
    ));
  }

  let normalizedHeightM: number | undefined;
  if (space.height !== undefined && space.height > 0) {
    normalizedHeightM = toMeters(space.height, space.unit);
    steps.push(makeStep(
      'Convert height',
      `${space.height} ${unitShort} → metres`,
      `${roundForDisplay(normalizedHeightM, 4)} m`,
    ));
  }

  // Calculate area based on surface type
  let areaM2 = 0;

  switch (space.surfaceType) {
    case 'wall':
      areaM2 = wallAreaM2(normalizedLengthM, normalizedWidthM, normalizedHeightM ?? 0);
      if (normalizedWidthM && normalizedHeightM) {
        steps.push(makeStep(
          `Wall area (${space.name})`,
          `perimeter × height = 2 × (${roundForDisplay(normalizedLengthM)} + ${roundForDisplay(normalizedWidthM)}) × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      } else if (normalizedHeightM) {
        steps.push(makeStep(
          `Wall area (${space.name})`,
          `2 × ${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'ceiling':
      areaM2 = ceilingAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          `Ceiling area (${space.name})`,
          `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'floor':
      areaM2 = floorAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          `Floor area (${space.name})`,
          `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'exterior':
      areaM2 = singleSurfaceAreaM2(normalizedLengthM, normalizedHeightM ?? 0);
      if (normalizedHeightM) {
        steps.push(makeStep(
          `Exterior area (${space.name})`,
          `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)}`,
          formatM2(areaM2),
        ));
      }
      break;

    case 'fence':
      const partitionCount = space.partitionCount ?? 1;
      areaM2 = fenceDimensionAreaM2(normalizedLengthM, normalizedHeightM ?? 0, partitionCount);
      if (normalizedHeightM) {
        steps.push(makeStep(
          `Fence area (${space.name})`,
          `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedHeightM)} × ${partitionCount} partitions`,
          formatM2(areaM2),
        ));
      }
      break;

    default:
      areaM2 = rectangularAreaM2(normalizedLengthM, normalizedWidthM);
      if (normalizedWidthM) {
        steps.push(makeStep(
          `Area (${space.name})`,
          `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
          formatM2(areaM2),
        ));
      }
  }

  // Include ceiling if requested (adds ceiling area to wall area)
  if (space.includeCeiling && space.surfaceType === 'wall' && normalizedWidthM) {
    const ceilingArea = ceilingAreaM2(normalizedLengthM, normalizedWidthM);
    areaM2 += ceilingArea;
    steps.push(makeStep(
      `Add ceiling (${space.name})`,
      `${roundForDisplay(normalizedLengthM)} × ${roundForDisplay(normalizedWidthM)}`,
      `+${formatM2(ceilingArea)}`,
    ));
  }

  // Apply opening deductions
  for (const opening of space.openings) {
    const openWidthM = toMeters(opening.width, opening.unit);
    const openHeightM = toMeters(opening.height, opening.unit);
    const openArea = openWidthM * openHeightM * opening.count;
    areaM2 = Math.max(0, areaM2 - openArea);
    steps.push(makeStep(
      `${opening.type} deduction (${opening.count}×)`,
      `${opening.count} × ${roundForDisplay(openWidthM)} × ${roundForDisplay(openHeightM)} m`,
      `−${formatM2(openArea)}`,
    ));
  }

  // Apply waste margin
  if (space.wasteMarginPercent > 0) {
    areaM2 = applyWasteMargin(areaM2, space.wasteMarginPercent);
    steps.push(makeStep(
      'Waste allowance',
      `+${space.wasteMarginPercent}%`,
      formatM2(areaM2),
    ));
  }

  // Multiply by quantity
  const totalAreaM2 = areaM2 * space.quantity;
  if (space.quantity > 1) {
    steps.push(makeStep(
      `Multiply by quantity (${space.quantity})`,
      `${formatM2(areaM2)} × ${space.quantity}`,
      formatM2(totalAreaM2),
    ));
  }

  return {
    spaceId: space.id,
    name: space.name,
    type: space.type,
    finishType: space.finishType,
    areaM2,
    totalAreaM2,
    normalizedLengthM,
    normalizedWidthM,
    normalizedHeightM,
    quantity: space.quantity,
    steps,
  };
}

// =========================================================
// SPACE GROUP CALCULATION
// =========================================================

/**
 * Group spaces by type and calculate each group.
 * Spaces of the same type (e.g. all bedrooms) are grouped for display,
 * but each space retains its own dimensions and calculation.
 */
export function groupSpacesByType(spaces: Space[]): SpaceGroup[] {
  const groups = new Map<SpaceType, Space[]>();

  for (const space of spaces) {
    const existing = groups.get(space.type) ?? [];
    existing.push(space);
    groups.set(space.type, existing);
  }

  const result: SpaceGroup[] = [];
  for (const [type, groupSpaces] of groups) {
    result.push({
      id: generateId('sgroup'),
      label: SPACE_TYPE_LABELS[type],
      spaces: groupSpaces,
    });
  }

  return result;
}

/**
 * Calculate a space group (sum of all spaces in the group).
 */
export function calculateSpaceGroup(group: SpaceGroup): SpaceGroupResult {
  const spaceResults: SpaceResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];

  for (const space of group.spaces) {
    const result = calculateSpace(space);
    spaceResults.push(result);
    totalAreaM2 += result.totalAreaM2;
    steps.push(makeStep(
      `${space.name} (×${space.quantity})`,
      'space total',
      formatM2(result.totalAreaM2),
    ));
  }

  steps.push(makeStep(
    `Group: ${group.label}`,
    `sum of ${spaceResults.length} space${spaceResults.length > 1 ? 's' : ''}`,
    formatM2(totalAreaM2),
  ));

  return {
    groupId: group.id,
    label: group.label,
    spaceResults,
    totalAreaM2,
    steps,
  };
}

// =========================================================
// SPACE COLLECTION CALCULATION
// =========================================================

/**
 * Calculate a full space collection.
 * Groups spaces by type, calculates each group, and aggregates the total.
 *
 * This is the MAIN entry point for the Space Engine.
 * It returns the total area and a transparent breakdown.
 */
export function calculateSpaceCollection(collection: SpaceCollection): SpaceCollectionResult {
  const spaceResults: SpaceResult[] = [];
  const groupResults: SpaceGroupResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];

  // Calculate individual spaces
  for (const space of collection.spaces) {
    const result = calculateSpace(space);
    spaceResults.push(result);
  }

  // Group and calculate by type
  const groups = groupSpacesByType(collection.spaces);
  for (const group of groups) {
    const groupResult = calculateSpaceGroup(group);
    groupResults.push(groupResult);
    totalAreaM2 += groupResult.totalAreaM2;
    steps.push(...groupResult.steps);
  }

  steps.push(makeStep(
    `Total: ${collection.name}`,
    `sum of all groups`,
    formatM2(totalAreaM2),
  ));

  return {
    collectionId: collection.id,
    name: collection.name,
    spaceResults,
    groupResults,
    totalAreaM2,
    steps,
  };
}

// =========================================================
// SPACE COLLECTION → MEASUREMENT PROJECT BRIDGE
// =========================================================

/**
 * Convert a SpaceCollection to a MeasurementProject.
 * This bridges the Space Engine to the existing measurement hierarchy,
 * allowing the existing calculation engines to consume space results.
 */
export function spaceCollectionToMeasurementProject(
  collection: SpaceCollection,
  calculatorContext: CalculatorContext,
): MeasurementProject {
  const sections: MeasurementSection[] = [];

  // Group spaces by type into sections
  const groups = groupSpacesByType(collection.spaces);
  for (const group of groups) {
    const measurementGroups: MeasurementGroup[] = group.spaces.map((space) => {
      const entry = spaceToMeasurementEntry(space);
      return createMeasurementGroup(
        `${space.name} (${space.length}${space.width ? ` × ${space.width}` : ''} ${space.unit}${space.quantity > 1 ? ` × ${space.quantity}` : ''})`,
        entry,
      );
    });
    sections.push(createMeasurementSection(group.label, measurementGroups));
  }

  return {
    id: generateId('project'),
    calculatorContext,
    projectMode: 'house_building',
    sections,
    preferredUnit: collection.preferredUnit,
    description: collection.name,
  };
}

// =========================================================
// HELPERS
// =========================================================

/**
 * Get the total area for a specific finish type.
 * Useful for material planning: "what's the total paintable area?"
 */
export function totalAreaByFinishType(
  results: SpaceResult[],
  finishType: FinishType,
): number {
  return results
    .filter((r) => r.finishType === finishType)
    .reduce((sum, r) => sum + r.totalAreaM2, 0);
}

/**
 * Get a summary of all spaces grouped by type with their areas.
 */
export function spaceSummary(results: SpaceResult[]): { type: SpaceType; label: string; areaM2: number; count: number }[] {
  const summary = new Map<SpaceType, { areaM2: number; count: number }>();

  for (const result of results) {
    const existing = summary.get(result.type) ?? { areaM2: 0, count: 0 };
    existing.areaM2 += result.totalAreaM2;
    existing.count += 1;
    summary.set(result.type, existing);
  }

  return Array.from(summary.entries()).map(([type, data]) => ({
    type,
    label: SPACE_TYPE_LABELS[type],
    areaM2: data.areaM2,
    count: data.count,
  }));
}
