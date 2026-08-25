/**
 * FRELUX MULTI-BUILDING PROJECT ENGINE
 *
 * Feature 15: Multi-Building Projects
 *
 * Extends the existing ConstructionProject to support multiple buildings
 * within a single project. A "Building" is a named structure containing
 * its own elements (spaces, roof, fence, etc.) and produces its own
 * calculation results.
 *
 * Hierarchy:
 *   PROJECT
 *   ├── BUILDING (Main House)
 *   │     ├── ELEMENTS (interior spaces, roof, etc.)
 *   │     └── ROOF SECTIONS
 *   ├── BUILDING (Boys' Quarters)
 *   │     ├── ELEMENTS
 *   │     └── ROOF SECTIONS
 *   └── BUILDING (Garage)
 *         ├── ELEMENTS
 *         └── ROOF SECTIONS
 *
 * Project totals aggregate verified building-level results.
 * Does NOT multiply one building's result across all buildings
 * unless the user explicitly chooses duplication.
 *
 * This module builds ON TOP of the existing project-engine.ts and
 * does NOT modify it. All existing ConstructionProject types and
 * functions remain untouched.
 */

import type {
  ProjectElement,
  ProjectElementResult,
  ConstructionProject,
} from './project-engine';
import type { CalculationStep } from './types';
import {
  createProjectElement,
  calculateProjectElement,
  createConstructionProject,
  PROJECT_ELEMENT_TYPE_LABELS,
} from './project-engine';
import type { LengthUnit } from './units';
import type { Space } from './space-engine';
import type { MultiRoofSpec, MultiRoofCalculation } from '@/lib/roof/section-model-types';
import { calculateMultiRoof } from '@/lib/roof/section-model';
import { generateId } from './factory';
import { makeStep, formatM2 } from './geometry';

// =========================================================
// BUILDING TYPES
// =========================================================

/**
 * A single building within a multi-building project.
 * Each building has its own elements, roof specification, and
 * can be calculated independently.
 */
export interface Building {
  /** Unique building ID */
  id: string;
  /** Building name (e.g. "Main House", "Boys' Quarters", "Garage") */
  name: string;
  /** Building type for categorization */
  buildingType: BuildingType;
  /** All elements within this building (interior spaces, exterior, etc.) */
  elements: ProjectElement[];
  /** Roof specification for this building (optional) */
  roofSpec: MultiRoofSpec | null;
  /** Number of floors in this building */
  numberOfFloors: number;
  /** Notes for this building */
  notes?: string;
}

/**
 * Building types for categorization.
 */
export type BuildingType =
  | 'main_house'
  | 'boys_quarters'
  | 'garage'
  | 'store'
  | 'detached_kitchen'
  | 'guardhouse'
  | 'guest_house'
  | 'office'
  | 'warehouse'
  | 'other';

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  main_house: 'Main House',
  boys_quarters: "Boys' Quarters",
  garage: 'Garage',
  store: 'Store',
  detached_kitchen: 'Detached Kitchen',
  guardhouse: 'Guardhouse',
  guest_house: 'Guest House',
  office: 'Office',
  warehouse: 'Warehouse',
  other: 'Other Building',
};

/**
 * Result of calculating a single building.
 */
export interface BuildingResult {
  buildingId: string;
  buildingName: string;
  buildingType: BuildingType;
  /** Element-level results */
  elementResults: ProjectElementResult[];
  /** Roof calculation result (if roof spec exists) */
  roofResult: MultiRoofCalculation | null;
  /** Total area across all elements */
  totalAreaM2: number;
  /** Total roof surface area (if roof calculated) */
  roofSurfaceAreaM2: number;
  /** Area breakdown by element type */
  areaByElementType: Record<string, number>;
  /** Area breakdown by finish type */
  areaByFinishType: Record<string, number>;
  /** All space results flattened */
  allSpaceResults: { id: string; name: string; type: string; totalAreaM2: number; finishType: string }[];
  /** Calculation steps */
  steps: CalculationStep[];
}

// =========================================================
// MULTI-BUILDING PROJECT
// =========================================================

/**
 * A multi-building construction project.
 *
 * This wraps the existing ConstructionProject concept but adds
 * a building layer. The buildings array is the authoritative
 * structure — the project aggregates building results.
 */
export interface MultiBuildingProject {
  /** Unique project ID */
  id: string;
  /** Project name (e.g. "Family Compound", "Estate Development") */
  name: string;
  /** Project description */
  description?: string;
  /** Preferred measurement unit */
  preferredUnit: LengthUnit;
  /** All buildings in this project */
  buildings: Building[];
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
 * Result of calculating a multi-building project.
 */
export interface MultiBuildingProjectResult {
  projectId: string;
  projectName: string;
  /** Results per building */
  buildingResults: BuildingResult[];
  /** Total area across all buildings */
  totalAreaM2: number;
  /** Total roof surface area across all buildings */
  totalRoofSurfaceAreaM2: number;
  /** Area aggregated by building type */
  areaByBuildingType: Record<string, number>;
  /** Area aggregated by element type (across all buildings) */
  areaByElementType: Record<string, number>;
  /** Area aggregated by finish type (across all buildings) */
  areaByFinishType: Record<string, number>;
  /** Number of buildings */
  buildingCount: number;
  /** Calculation steps */
  steps: CalculationStep[];
}

// =========================================================
// FACTORY FUNCTIONS
// =========================================================

/**
 * Create a new building.
 */
export function createBuilding(
  name: string,
  buildingType: BuildingType = 'main_house',
  numberOfFloors: number = 1,
): Building {
  return {
    id: generateId('building'),
    name,
    buildingType,
    elements: [],
    roofSpec: null,
    numberOfFloors,
  };
}

/**
 * Create a new multi-building project.
 */
export function createMultiBuildingProject(
  name: string = 'New Project',
  preferredUnit: LengthUnit = 'feet',
): MultiBuildingProject {
  const now = new Date().toISOString();
  return {
    id: generateId('mbproject'),
    name,
    preferredUnit,
    buildings: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

// =========================================================
// BUILDING OPERATIONS
// =========================================================

/**
 * Add a building to a project.
 * Returns a new project (immutable update).
 */
export function addBuilding(
  project: MultiBuildingProject,
  building: Building,
): MultiBuildingProject {
  return {
    ...project,
    buildings: [...project.buildings, building],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Rename a building.
 */
export function renameBuilding(
  project: MultiBuildingProject,
  buildingId: string,
  newName: string,
): MultiBuildingProject {
  return {
    ...project,
    buildings: project.buildings.map((b) =>
      b.id === buildingId ? { ...b, name: newName } : b
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove a building from a project.
 */
export function removeBuilding(
  project: MultiBuildingProject,
  buildingId: string,
): MultiBuildingProject {
  return {
    ...project,
    buildings: project.buildings.filter((b) => b.id !== buildingId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a building (partial update).
 */
export function updateBuilding(
  project: MultiBuildingProject,
  buildingId: string,
  updates: Partial<Omit<Building, 'id'>>,
): MultiBuildingProject {
  return {
    ...project,
    buildings: project.buildings.map((b) =>
      b.id === buildingId ? { ...b, ...updates } : b
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get a building by ID.
 */
export function getBuilding(
  project: MultiBuildingProject,
  buildingId: string,
): Building | undefined {
  return project.buildings.find((b) => b.id === buildingId);
}

/**
 * Add an element to a building.
 */
export function addElementToBuilding(
  project: MultiBuildingProject,
  buildingId: string,
  element: ProjectElement,
): MultiBuildingProject {
  return {
    ...project,
    buildings: project.buildings.map((b) =>
      b.id === buildingId
        ? { ...b, elements: [...b.elements, element] }
        : b
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Set the roof specification for a building.
 */
export function setBuildingRoofSpec(
  project: MultiBuildingProject,
  buildingId: string,
  roofSpec: MultiRoofSpec,
): MultiBuildingProject {
  return {
    ...project,
    buildings: project.buildings.map((b) =>
      b.id === buildingId ? { ...b, roofSpec } : b
    ),
    updatedAt: new Date().toISOString(),
  };
}

// =========================================================
// BUILDING CALCULATION
// =========================================================

/**
 * Calculate a single building.
 *
 * Computes all elements within the building and (if a roof spec exists)
 * calculates the roof. Results are aggregated for the building.
 */
export function calculateBuilding(building: Building): BuildingResult {
  const elementResults: ProjectElementResult[] = [];
  let totalAreaM2 = 0;
  const steps: CalculationStep[] = [];
  const areaByElementType: Record<string, number> = {};
  const areaByFinishType: Record<string, number> = {};
  const allSpaceResults: { id: string; name: string; type: string; totalAreaM2: number; finishType: string }[] = [];

  // Calculate elements
  for (const element of building.elements) {
    const elementResult = calculateProjectElement(element);
    elementResults.push(elementResult);
    totalAreaM2 += elementResult.totalAreaM2;

    // Aggregate by element type
    const elementTypeKey = element.elementType;
    areaByElementType[elementTypeKey] = (areaByElementType[elementTypeKey] ?? 0) + elementResult.totalAreaM2;

    // Aggregate by finish type
    for (const spaceResult of elementResult.spaceResults) {
      const finishKey = spaceResult.finishType;
      areaByFinishType[finishKey] = (areaByFinishType[finishKey] ?? 0) + spaceResult.totalAreaM2;
      allSpaceResults.push({
        id: spaceResult.spaceId,
        name: spaceResult.name,
        type: spaceResult.type as string,
        totalAreaM2: spaceResult.totalAreaM2,
        finishType: spaceResult.finishType,
      });
    }

    steps.push(makeStep(
      `${building.name} → ${element.name}`,
      PROJECT_ELEMENT_TYPE_LABELS[element.elementType],
      formatM2(elementResult.totalAreaM2),
    ));
  }

  // Calculate roof if spec exists
  let roofResult: MultiRoofCalculation | null = null;
  let roofSurfaceAreaM2 = 0;

  if (building.roofSpec && building.roofSpec.sections.length > 0) {
    roofResult = calculateMultiRoof(building.roofSpec);
    roofSurfaceAreaM2 = roofResult.totalSurfaceAreaM2;

    steps.push(makeStep(
      `${building.name} → Roof`,
      `${roofResult.sections.length} section(s)`,
      formatM2(roofSurfaceAreaM2),
    ));
  }

  steps.push(makeStep(
    `Building: ${building.name}`,
    `${building.elements.length} element(s)${roofResult ? ' + roof' : ''}`,
    formatM2(totalAreaM2),
  ));

  return {
    buildingId: building.id,
    buildingName: building.name,
    buildingType: building.buildingType,
    elementResults,
    roofResult,
    totalAreaM2,
    roofSurfaceAreaM2,
    areaByElementType,
    areaByFinishType,
    allSpaceResults,
    steps,
  };
}

// =========================================================
// PROJECT CALCULATION
// =========================================================

/**
 * Calculate a complete multi-building project.
 *
 * Each building is calculated independently, then results are
 * aggregated at the project level. This does NOT multiply one
 * building's results across all buildings.
 */
export function calculateMultiBuildingProject(
  project: MultiBuildingProject,
): MultiBuildingProjectResult {
  const buildingResults: BuildingResult[] = [];
  let totalAreaM2 = 0;
  let totalRoofSurfaceAreaM2 = 0;
  const steps: CalculationStep[] = [];
  const areaByBuildingType: Record<string, number> = {};
  const areaByElementType: Record<string, number> = {};
  const areaByFinishType: Record<string, number> = {};

  for (const building of project.buildings) {
    const buildingResult = calculateBuilding(building);
    buildingResults.push(buildingResult);
    totalAreaM2 += buildingResult.totalAreaM2;
    totalRoofSurfaceAreaM2 += buildingResult.roofSurfaceAreaM2;

    // Aggregate by building type
    const btKey = building.buildingType;
    areaByBuildingType[btKey] = (areaByBuildingType[btKey] ?? 0) + buildingResult.totalAreaM2;

    // Aggregate by element type (across buildings)
    for (const [key, val] of Object.entries(buildingResult.areaByElementType)) {
      areaByElementType[key] = (areaByElementType[key] ?? 0) + val;
    }

    // Aggregate by finish type (across buildings)
    for (const [key, val] of Object.entries(buildingResult.areaByFinishType)) {
      areaByFinishType[key] = (areaByFinishType[key] ?? 0) + val;
    }

    steps.push(makeStep(
      building.name,
      BUILDING_TYPE_LABELS[building.buildingType],
      formatM2(buildingResult.totalAreaM2),
    ));
  }

  steps.push(makeStep(
    `Total: ${project.name}`,
    `${project.buildings.length} building(s)`,
    formatM2(totalAreaM2),
  ));

  return {
    projectId: project.id,
    projectName: project.name,
    buildingResults,
    totalAreaM2,
    totalRoofSurfaceAreaM2,
    areaByBuildingType,
    areaByElementType,
    areaByFinishType,
    buildingCount: project.buildings.length,
    steps,
  };
}

// =========================================================
// AGGREGATION HELPERS
// =========================================================

/**
 * Get the total area for a specific building type.
 */
export function totalAreaByBuildingType(
  result: MultiBuildingProjectResult,
  buildingType: BuildingType,
): number {
  return result.areaByBuildingType[buildingType] ?? 0;
}

/**
 * Get all spaces from a specific building.
 */
export function getBuildingSpaces(building: Building): Space[] {
  const spaces: Space[] = [];
  for (const element of building.elements) {
    spaces.push(...element.spaces);
  }
  return spaces;
}

/**
 * Get a summary of all buildings with their areas.
 */
export function buildingSummary(
  result: MultiBuildingProjectResult,
): { name: string; buildingType: BuildingType; areaM2: number; elementCount: number }[] {
  return result.buildingResults.map((br) => ({
    name: br.buildingName,
    buildingType: br.buildingType,
    areaM2: br.totalAreaM2,
    elementCount: br.elementResults.length,
  }));
}

/**
 * Convert a multi-building project to a ConstructionProject
 * for backward compatibility with existing calculator engines.
 *
 * This flattens all building elements into a single ConstructionProject.
 * Each building's elements become elements in the construction project.
 */
export function multiBuildingProjectToConstructionProject(
  project: MultiBuildingProject,
): ConstructionProject {
  const cp = createConstructionProject(project.name, project.preferredUnit);
  const allElements: ProjectElement[] = [];

  for (const building of project.buildings) {
    for (const element of building.elements) {
      // Prefix element name with building name for clarity
      allElements.push({
        ...element,
        name: `${building.name} → ${element.name}`,
      });
    }
  }

  return {
    ...cp,
    elements: allElements,
    marketCode: project.marketCode,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Duplicate a building's results across N copies.
 *
 * This is ONLY used when the user explicitly chooses duplication
 * (e.g. "this building is identical to 3 others"). It does NOT
 * run automatically.
 */
export function duplicateBuildingResult(
  result: BuildingResult,
  copies: number,
): BuildingResult[] {
  if (copies <= 1) return [result];
  const results: BuildingResult[] = [];
  for (let i = 0; i < copies; i++) {
    results.push({
      ...result,
      buildingId: `${result.buildingId}_copy_${i + 1}`,
      buildingName: `${result.buildingName} (Copy ${i + 1})`,
    });
  }
  return results;
}
