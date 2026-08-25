/**
 * FRELUX PROJECT/BUILDING ENGINE
 *
 * Feature 3 of 16: Project/Building Engine
 *
 * Builds ON TOP of the Space Engine and existing measurement system.
 * Does NOT modify existing types or functions.
 *
 * A "Project" is the top-level organizational structure:
 *   PROJECT
 *   ├── SPACES (rooms, bathrooms, kitchen, etc.)
 *   ├── EXTERIOR
 *   ├── FENCE
 *   └── OTHER ELEMENTS
 *
 * A project can contain spaces using DIFFERENT calculators.
 * The project engine aggregates results from supported calculators
 * without forcing all calculators to use the same formula.
 *
 * The project engine is an ORGANIZATIONAL layer — it does NOT compute
 * calculator-specific results (paint buckets, screeding materials).
 * It provides the structure and aggregated areas/quantities.
 */

import type {
  SpaceType,
  SurfaceType,
  MeasurementProject,
  MeasurementProjectResult,
  CalculationStep,
} from './types';
import type { CalculatorContext, LengthUnit } from './units';
import type { Space, SpaceResult } from './space-engine';
import {
  createSpace,
  createSpaceCollection,
  calculateSpace,
  calculateSpaceCollection,
  groupSpacesByType,
  spaceCollectionToMeasurementProject,
  type SpaceCollectionResult,
} from './space-engine';
import { generateId } from './factory';
import type { FinishType } from './space-engine';

// =========================================================
// PROJECT ELEMENT TYPES
// =========================================================

/**
 * The type of a project element.
 * A project can have interior spaces, exterior surfaces, fence elements, etc.
 */
export type ProjectElementType =
  | 'interior'    // rooms, bathrooms, kitchen, corridor, etc.
  | 'exterior'    // external walls, building facade
  | 'fence'       // fence with partitions
  | 'roof'        // roof elements
  | 'compound'    // compound/garden features
  | 'custom';     // user-defined elements

export const PROJECT_ELEMENT_TYPE_LABELS: Record<ProjectElementType, string> = {
  interior: 'Interior Spaces',
  exterior: 'Exterior',
  fence: 'Fence',
  roof: 'Roof',
  compound: 'Compound / Garden',
  custom: 'Custom Elements',
};

/**
 * A project element is a named group of spaces within a project.
 * Example: "Ground Floor Bedrooms" (interior), "Front Fence" (fence).
 */
export interface ProjectElement {
  id: string;
  name: string;
  elementType: ProjectElementType;
  /** The spaces within this element */
  spaces: Space[];
  /** Which calculator this element is primarily associated with */
  primaryCalculator: CalculatorContext;
  /** Notes for this element */
  notes?: string;
}

/**
 * Result of calculating a project element.
 */
export interface ProjectElementResult {
  elementId: string;
  name: string;
  elementType: ProjectElementType;
  primaryCalculator: CalculatorContext;
  spaceResults: SpaceResult[];
  /** Total area for this element */
  totalAreaM2: number;
  steps: CalculationStep[];
}

// =========================================================
// PROJECT
// =========================================================

/**
 * A complete construction project.
 *
 * This is the top-level structure that organizes multiple spaces,
 * exterior elements, and fence elements into a single project.
 *
 * A project can contain elements using DIFFERENT calculators:
 * - Painting for bedroom walls
 * - Tiling for bathroom floors
 * - Screeding for fence
 *
 * The project engine does NOT compute calculator-specific results.
 * It provides the organizational structure and aggregated areas.
 */
export interface ConstructionProject {
  id: string;
  /** Project name (e.g. "3-Bedroom Bungalow", "Office Complex") */
  name: string;
  /** Project description */
  description?: string;
  /** Preferred measurement unit */
  preferredUnit: LengthUnit;
  /** All elements in the project */
  elements: ProjectElement[];
  /** Project location/market context */
  marketCode?: string;
  /** Project status */
  status: 'draft' | 'in_progress' | 'completed';
  /** Created date */
  createdAt: string;
  /** Updated date */
  updatedAt: string;
}

/**
 * Result of calculating a construction project.
 */
export interface ConstructionProjectResult {
  projectId: string;
  name: string;
  elementResults: ProjectElementResult[];
  /** Total area across all elements */
  totalAreaM2: number;
  /** Total area by finish type */
  areaByFinishType: Record<string, number>;
  /** Total area by element type */
  areaByElementType: Record<string, number>;
  /** All space results flattened */
  allSpaceResults: SpaceResult[];
  steps: CalculationStep[];
}

// =========================================================
// FACTORY FUNCTIONS
// =========================================================

/**
 * Create a new construction project.
 */
export function createConstructionProject(
  name: string = 'New Project',
  preferredUnit: LengthUnit = 'feet',
): ConstructionProject {
  const now = new Date().toISOString();
  return {
    id: generateId('project'),
    name,
    preferredUnit,
    elements: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a project element.
 */
export function createProjectElement(
  name: string,
  elementType: ProjectElementType,
  primaryCalculator: CalculatorContext,
  spaces: Space[] = [],
): ProjectElement {
  return {
    id: generateId('element'),
    name,
    elementType,
    primaryCalculator,
    spaces,
  };
}

// =========================================================
// PROJECT ELEMENT CALCULATION
// =========================================================

import { makeStep, formatM2 } from './geometry';

/**
 * Calculate a project element.
 * Computes all spaces within the element and aggregates the total area.
 */
export function calculateProjectElement(element: ProjectElement): ProjectElementResult {
  const spaceResults: SpaceResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];

  for (const space of element.spaces) {
    const result = calculateSpace(space);
    spaceResults.push(result);
    totalAreaM2 += result.totalAreaM2;
    steps.push(...result.steps);
  }

  steps.push(makeStep(
    `Element: ${element.name}`,
    `sum of ${spaceResults.length} space${spaceResults.length !== 1 ? 's' : ''}`,
    formatM2(totalAreaM2),
  ));

  return {
    elementId: element.id,
    name: element.name,
    elementType: element.elementType,
    primaryCalculator: element.primaryCalculator,
    spaceResults,
    totalAreaM2,
    steps,
  };
}

// =========================================================
// PROJECT CALCULATION
// =========================================================

/**
 * Calculate a complete construction project.
 *
 * This is the MAIN entry point for the Project/Building Engine.
 * It calculates all elements, aggregates results, and breaks down
 * the total area by finish type and by element type.
 *
 * The returned structure provides:
 * - Per-element results (with per-space breakdowns)
 * - Total project area
 * - Area aggregated by finish type (for material planning)
 * - Area aggregated by element type (for structural breakdown)
 *
 * Calculator-specific engines (painting, tiling, etc.) consume
 * the element results and compute material quantities.
 */
export function calculateConstructionProject(
  project: ConstructionProject,
): ConstructionProjectResult {
  const elementResults: ProjectElementResult[] = [];
  const allSpaceResults: SpaceResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];
  const areaByFinishType: Record<string, number> = {};
  const areaByElementType: Record<string, number> = {};

  for (const element of project.elements) {
    const elementResult = calculateProjectElement(element);
    elementResults.push(elementResult);
    allSpaceResults.push(...elementResult.spaceResults);
    totalAreaM2 += elementResult.totalAreaM2;

    // Aggregate by element type
    const elementTypeKey = element.elementType;
    areaByElementType[elementTypeKey] = (areaByElementType[elementTypeKey] ?? 0) + elementResult.totalAreaM2;

    // Aggregate by finish type
    for (const spaceResult of elementResult.spaceResults) {
      const finishKey = spaceResult.finishType;
      areaByFinishType[finishKey] = (areaByFinishType[finishKey] ?? 0) + spaceResult.totalAreaM2;
    }

    steps.push(makeStep(
      element.name,
      `${PROJECT_ELEMENT_TYPE_LABELS[element.elementType]}`,
      formatM2(elementResult.totalAreaM2),
    ));
  }

  steps.push(makeStep(
    `Total: ${project.name}`,
    'sum of all elements',
    formatM2(totalAreaM2),
  ));

  return {
    projectId: project.id,
    name: project.name,
    elementResults,
    totalAreaM2,
    areaByFinishType,
    areaByElementType,
    allSpaceResults,
    steps,
  };
}

// =========================================================
// PROJECT → MEASUREMENT PROJECT BRIDGE
// =========================================================

/**
 * Convert a ConstructionProject to a MeasurementProject for a specific calculator.
 *
 * This bridges the Project Engine to the existing measurement hierarchy.
 * Only elements whose primaryCalculator matches the given context are included.
 *
 * This allows the existing calculator engines to consume project results
 * without modification.
 */
export function projectToMeasurementProject(
  project: ConstructionProject,
  calculatorContext: CalculatorContext,
): MeasurementProject {
  const matchingElements = project.elements.filter(
    (e) => e.primaryCalculator === calculatorContext,
  );

  // Create a space collection from matching elements
  const allSpaces: Space[] = [];
  for (const element of matchingElements) {
    allSpaces.push(...element.spaces);
  }

  const collection = createSpaceCollection(project.name, project.preferredUnit, allSpaces);
  return spaceCollectionToMeasurementProject(collection, calculatorContext);
}

// =========================================================
// AGGREGATION HELPERS
// =========================================================

/**
 * Get the total area for a specific element type.
 */
export function totalAreaByElementType(
  result: ConstructionProjectResult,
  elementType: ProjectElementType,
): number {
  return result.areaByElementType[elementType] ?? 0;
}

/**
 * Get all spaces of a specific type from a project.
 */
export function getSpacesByType(
  project: ConstructionProject,
  spaceType: SpaceType,
): Space[] {
  const result: Space[] = [];
  for (const element of project.elements) {
    for (const space of element.spaces) {
      if (space.type === spaceType) {
        result.push(space);
      }
    }
  }
  return result;
}

/**
 * Get all spaces with a specific finish type from a project.
 */
export function getSpacesByFinishType(
  project: ConstructionProject,
  finishType: FinishType,
): Space[] {
  const result: Space[] = [];
  for (const element of project.elements) {
    for (const space of element.spaces) {
      if (space.finishType === finishType) {
        result.push(space);
      }
    }
  }
  return result;
}

/**
 * Get a count of all spaces in a project.
 */
export function getSpaceCount(project: ConstructionProject): number {
  let count = 0;
  for (const element of project.elements) {
    count += element.spaces.length;
  }
  return count;
}

/**
 * Get a summary of all elements with their areas.
 */
export function elementSummary(
  result: ConstructionProjectResult,
): { name: string; elementType: ProjectElementType; areaM2: number; spaceCount: number }[] {
  return result.elementResults.map((er) => ({
    name: er.name,
    elementType: er.elementType,
    areaM2: er.totalAreaM2,
    spaceCount: er.spaceResults.length,
  }));
}

/**
 * Get a summary of the project by finish type.
 */
export function finishTypeSummary(
  result: ConstructionProjectResult,
): { finishType: string; areaM2: number }[] {
  return Object.entries(result.areaByFinishType)
    .map(([finishType, areaM2]) => ({ finishType, areaM2 }))
    .sort((a, b) => b.areaM2 - a.areaM2);
}
