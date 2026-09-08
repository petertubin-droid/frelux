/**
 * FRELUX CONSTRUCTION INTELLIGENCE, UNIFIED QUANTITY TAKEOFF
 *
 * A thin aggregation layer that produces ONE traceable quantity takeoff for a
 * construction project by REFERENCING existing FRELUX deterministic results:
 *
 *   Building Model (Project Engine)  → element/space measurements
 *   Saved calculations (DB)          → material quantities + engine reference
 *   Waste resolution (waste-config)   → base + waste = purchase quantity
 *
 * This layer NEVER recalculates a quantity that an existing engine already
 * produced. Where no engine result exists the item is marked
 * `requires_calculation`, an explicit unknown beats an invented number
 * (Prompt 3, §7 and §24).
 */

import type { CalculationStep, ConstructionProjectResult, ProjectElementResult } from "@/lib/measurement";
import type { DbProjectCalculation } from "@/types/database";
import type { WasteResolution } from "@/lib/measurement/waste-config";
import { applyResolvedWaste } from "@/lib/measurement/waste-config";

// =========================================================
// Types
// =========================================================

/** Where a takeoff number came from. */
export type QuantitySource =
  | "project_engine" // area/measurement from the deterministic Project Engine
  | "deterministic_engine" // material quantity from a saved deterministic calculator run
  | "user_provided"; // value supplied/verified by the user

export type TakeoffStatus =
  | "calculated" // an existing engine produced this quantity
  | "requires_calculation" // no engine result exists yet, explicitly not invented
  | "requires_verification"; // value exists but awaits user verification

/** Discipline labels reused across the takeoff and estimate layers. */
export const TAKEOFF_DISCIPLINES = [
  "painting",
  "screeding",
  "tiling",
  "pop_ceiling",
  "tyrolene",
  "grafitex",
  "blockwork",
  "roofing",
  "structural",
  "foundation",
  "cost",
  "other",
] as const;

export type TakeoffDiscipline = (typeof TAKEOFF_DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<TakeoffDiscipline, string> = {
  painting: "Painting",
  screeding: "Screeding",
  tiling: "Tiling",
  pop_ceiling: "POP Ceiling",
  tyrolene: "Tyrolene",
  grafitex: "Grafitex",
  blockwork: "Blockwork",
  roofing: "Roofing",
  structural: "Structural",
  foundation: "Foundation",
  cost: "Cost",
  other: "Other",
};

export interface TakeoffMaterial {
  name: string;
  category: string;
  unit: string;
  /** Base quantity as produced by the referenced engine (before waste). */
  baseQuantity: number;
  /** Purchase quantity = base + waste allowance (only when waste applies). */
  purchaseQuantity: number;
  waste?: {
    percent: number;
    source: WasteResolution["source"];
    reason: string;
  };
  /** Engine-estimated price if the referenced calculation carried one. */
  estimatedPrice?: number;
  calculationRef: {
    id: string;
    calculatorType: DbProjectCalculation["calculator_type"];
    title: string;
  };
}

export interface TakeoffItem {
  id: string;
  discipline: TakeoffDiscipline;
  /** Element this measurement belongs to (measurement items only). */
  elementId?: string;
  elementName?: string;
  /** Human description of the measurement, e.g. "Bedroom 1 walls". */
  label: string;
  unit: string;
  baseQuantity: number;
  quantitySource: QuantitySource;
  /** Engine that produced the quantity, for traceability, never a copy. */
  engine: string;
  status: TakeoffStatus;
  /** Traceable steps: Input → Formula/Engine → Result. */
  steps: CalculationStep[];
}

export interface TakeoffMaterialItem {
  id: string;
  discipline: TakeoffDiscipline;
  material: TakeoffMaterial;
  status: TakeoffStatus;
  /** Calculation reference, the authoritative engine result, not a copy. */
  calculation: {
    id: string;
    calculatorType: DbProjectCalculation["calculator_type"];
    title: string;
    createdAt: string;
  };
}

export interface QuantityTakeoff {
  projectId: string;
  projectName: string;
  /** Element/space measurement items (areas etc.) from the Project Engine. */
  measurementItems: TakeoffItem[];
  /** Material quantity items, each referencing a saved engine calculation. */
  materialItems: TakeoffMaterialItem[];
  /** Elements whose discipline has NO saved calculation yet. */
  requiresCalculation: Array<{
    elementId: string;
    elementName: string;
    discipline: TakeoffDiscipline;
  }>;
  /** How the measurement items group by discipline. */
  areaByDiscipline: Record<string, number>;
}

// =========================================================
// Discipline routing (existing calculators stay authoritative)
// =========================================================

type CalculatorType = DbProjectCalculation["calculator_type"];

/** Maps a saved calculation type to a takeoff discipline. */
export function calculatorTypeToDiscipline(
  calculatorType: CalculatorType,
): TakeoffDiscipline {
  switch (calculatorType) {
    case "paint":
      return "painting";
    case "screeding":
      return "screeding";
    case "tile":
      return "tiling";
    case "pop_ceiling":
      return "pop_ceiling";
    case "tyrolene":
      return "tyrolene";
    case "finish":
      return "grafitex";

    case "build_to_roof":
      return "roofing";
    case "structural":
      return "structural";
    case "foundation":
      return "foundation";
    case "cost":
      return "cost";
    default:
      return "other";
  }
}

/** The discipline an element's primary calculator routes to. */
function primaryCalculatorToDiscipline(
  calculator: ProjectElementResult["primaryCalculator"],
): TakeoffDiscipline {
  switch (calculator) {
    case "painting":
    case "fence_painting":
      return "painting";
    case "screeding":
    case "fence_screeding":
      return "screeding";
    case "tiling":
      return "tiling";
    case "pop":
      return "pop_ceiling";
    case "tyrolene":
      return "tyrolene";
    case "grafitex":
      return "grafitex";
    case "block":
      return "blockwork";
    default:
      return "other";
  }
}

const DISCIPLINE_ORDER = new Map<TakeoffDiscipline, number>(
  TAKEOFF_DISCIPLINES.map((d, i) => [d, i]),
);

// =========================================================
// Builder
// =========================================================

export interface TakeoffInput {
  /** Deterministic Project Engine result for the building model. */
  project: ConstructionProjectResult;
  /**
   * Saved calculation records for this project (from project-intelligence /
   * project_calculations table). Their material quantities are REFERENCED,
   * never recalculated.
   */
  calculations: Pick<
    DbProjectCalculation,
    "id" | "calculator_type" | "calc_title" | "materials" | "created_at"
  >[];
  /**
   * Optional waste resolver per discipline. When provided, purchase quantity =
   * base + resolved waste (waste is never invented or hidden).
   */
  resolveWaste?: (discipline: TakeoffDiscipline, materialName: string) => WasteResolution | undefined;
}

export function buildQuantityTakeoff(input: TakeoffInput): QuantityTakeoff {
  const { project, calculations, resolveWaste } = input;

  // --- 1. Element/space measurement items (Project Engine is the source) ---
  const measurementItems: TakeoffItem[] = [];
  const elementDisciplines = new Map<string, TakeoffDiscipline>();

  for (const element of project.elementResults) {
    const discipline = primaryCalculatorToDiscipline(element.primaryCalculator);
    elementDisciplines.set(element.elementId, discipline);

    if (element.spaceResults.length === 0) {
      // An element with no measured spaces is an explicit gap, not a zero.
      continue;
    }

    for (const space of element.spaceResults) {
      if (!Number.isFinite(space.totalAreaM2) || space.totalAreaM2 < 0) {
        continue; // invalid measurements are excluded, risk flags report them
      }
      measurementItems.push({
        id: `m:${element.elementId}:${space.spaceId}`,
        discipline,
        elementId: element.elementId,
        elementName: element.name,
        label: `${space.name} (${element.name})`,
        unit: "m²",
        baseQuantity: space.totalAreaM2,
        quantitySource: "project_engine",
        engine: "FRELUX Project Engine",
        status: "calculated",
        steps: space.steps,
      });
    }
  }

  // --- 2. Material items, reference saved engine calculations ---
  const materialItems: TakeoffMaterialItem[] = [];
  for (const calc of calculations) {
    const discipline = calculatorTypeToDiscipline(calc.calculator_type);
    for (const material of calc.materials ?? []) {
      if (!Number.isFinite(material.quantity) || material.quantity < 0) {
        continue; // risk flags will surface this, never propagate invalid data
      }
      let purchaseQuantity = material.quantity;
      let waste: TakeoffMaterial["waste"];
      const resolution = resolveWaste?.(discipline, material.name);
      if (resolution && resolution.wastePercent > 0) {
        const applied = applyResolvedWaste(material.quantity, resolution);
        purchaseQuantity = applied.quantity;
        waste = {
          percent: resolution.wastePercent,
          source: resolution.source,
          reason: resolution.explanation,
        };
      }
      materialItems.push({
        id: `mat:${calc.id}:${material.name}`,
        discipline,
        material: {
          name: material.name,
          category: material.category,
          unit: material.unit,
          baseQuantity: material.quantity,
          purchaseQuantity,
          waste,
          estimatedPrice: material.estimated_price,
          calculationRef: {
            id: calc.id,
            calculatorType: calc.calculator_type,
            title: calc.calc_title,
          },
        },
        status: "calculated",
        calculation: {
          id: calc.id,
          calculatorType: calc.calculator_type,
          title: calc.calc_title,
          createdAt: calc.created_at,
        },
      });
    }
  }

  // --- 3. Elements whose discipline has no saved calculation yet ---
  const covered = new Set(
    calculations.map((c) => calculatorTypeToDiscipline(c.calculator_type)),
  );
  const requiresCalculation: QuantityTakeoff["requiresCalculation"] = [];
  for (const element of project.elementResults) {
    const discipline = elementDisciplines.get(element.elementId);
    if (discipline && !covered.has(discipline) && element.spaceResults.length > 0) {
      requiresCalculation.push({
        elementId: element.elementId,
        elementName: element.name,
        discipline,
      });
    }
  }

  // --- 4. Area roll-up per discipline ---
  const areaByDiscipline: Record<string, number> = {};
  for (const item of measurementItems) {
    areaByDiscipline[item.discipline] =
      (areaByDiscipline[item.discipline] ?? 0) + item.baseQuantity;
  }

  return {
    projectId: project.projectId,
    projectName: project.name,
    measurementItems,
    materialItems,
    requiresCalculation,
    areaByDiscipline,
  };
}

// =========================================================
// Summaries
// =========================================================

export interface DisciplineSummary {
  discipline: TakeoffDiscipline;
  measurementCount: number;
  totalMeasurements: number;
  materialCount: number;
}

export function summarizeTakeoffByDiscipline(
  takeoff: QuantityTakeoff,
): DisciplineSummary[] {
  const map = new Map<TakeoffDiscipline, DisciplineSummary>();
  const ensure = (d: TakeoffDiscipline) => {
    let s = map.get(d);
    if (!s) {
      s = {
        discipline: d,
        measurementCount: 0,
        totalMeasurements: 0,
        materialCount: 0,
      };
      map.set(d, s);
    }
    return s;
  };

  for (const item of takeoff.measurementItems) {
    const s = ensure(item.discipline);
    s.measurementCount += 1;
    s.totalMeasurements += item.baseQuantity;
  }
  for (const item of takeoff.materialItems) {
    ensure(item.discipline).materialCount += 1;
  }

  return [...map.values()].sort(
    (a, b) =>
      (DISCIPLINE_ORDER.get(a.discipline) ?? 99) -
      (DISCIPLINE_ORDER.get(b.discipline) ?? 99),
  );
}
