// =========================================================
// FRELUX PLAN → ELEVATION ENGINE BRIDGE
//
// One job: take a verified plan extraction and produce the
// inputs the Mathematical Elevation Engine needs. The engine
// stays the calculation authority; this file only renames and
// re-sources values, then reports honestly what is missing.
//
// Rules inherited from the plan-vision library (§13, §22):
//   - only user-verified elements enter an engine
//   - a value the document does not state is REPORTED as
//     missing, never guessed
//   - anything derived (rather than read) is labelled derived,
//     shown with its formula, and applied only on request
// =========================================================

import type { PlanElevationInput } from "@/lib/engineering/mathematical-elevation-engine";
import type { MathematicalElevationResult } from "@/lib/engineering/mathematical-elevation-engine";
import type { BuildingType, RoofType } from "@/types/build-to-roof";
import type { PlanExtraction, ExtractedRoom } from "./types";
import { dimensionToMeters, isUnknown } from "./dimensions";
import { toCanonicalBuildingModel } from "./building-model";
import { isRoomVerified } from "./review";

/** Share of a plan's floor area that is circulation, walls and voids. */
export const CIRCULATION_FACTOR = 1.15;

const BUILDING_TYPES: BuildingType[] = [
  "bungalow",
  "duplex",
  "two_storey",
  "apartment",
  "office",
  "shop",
  "custom",
];

export type ImportSource = "plan" | "derived";

export interface ImportedField {
  /** PlanElevationInput key this value lands on. */
  key: keyof PlanElevationInput;
  /** Human label for the review list. */
  label: string;
  value: number | string;
  displayValue: string;
  source: ImportSource;
  confidence: number | null;
  /** Formula/reason shown when the value was derived, not read. */
  method?: string;
}

export interface MissingField {
  key: keyof PlanElevationInput;
  label: string;
  /** What the user has to do about it. */
  hint: string;
}

export interface FootprintDerivation {
  lengthM: number;
  widthM: number;
  areaM2: number;
  roomCount: number;
  method: string;
}

export interface ElevationPlanImport {
  patch: Partial<PlanElevationInput>;
  applied: ImportedField[];
  missing: MissingField[];
  /** Verified-room footprint, offered when the plan omits overall sizes. */
  footprint: FootprintDerivation | null;
  /** Everything the document did not state, straight from the extractor. */
  warnings: string[];
  /** True when at least one dimension-bearing value can be applied. */
  hasUsableValues: boolean;
}

function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function normaliseBuildingType(raw: string | undefined): BuildingType | null {
  if (!raw) return null;
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const direct = BUILDING_TYPES.find((t) => t === key);
  if (direct) return direct;
  const aliases: Record<string, BuildingType> = {
    bungalow_flat: "bungalow",
    single_storey: "bungalow",
    single_storey_building: "bungalow",
    detached_house: "duplex",
    semi_detached_duplex: "duplex",
    storey_building: "two_storey",
    two_storey_building: "two_storey",
    maisonette: "duplex",
    flats: "apartment",
    block_of_flats: "apartment",
    commercial: "shop",
    retail: "shop",
  };
  return aliases[key] ?? null;
}

function normaliseRoofType(raw: string | undefined): RoofType | null {
  if (!raw) return null;
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map: Record<string, RoofType> = {
    gable: "gable",
    double_pitch: "gable",
    pitched: "gable",
    hip: "hip",
    hipped: "hip",
    mono_pitch: "mono_pitch",
    mono: "mono_pitch",
    shed: "mono_pitch",
    lean_to: "mono_pitch",
    flat: "flat",
    pyramid: "hip",
    custom: "custom",
  };
  return map[key] ?? null;
}

/**
 * Footprint purely from verified rooms. Deterministic: no vision guess,
 * no invented dimension. Area = Σ room area × circulation factor; the
 * envelope is then squared off unless the widest room suggests a
 * different aspect ratio.
 */
export function deriveFootprint(
  rooms: ExtractedRoom[],
): FootprintDerivation | null {
  const usable = rooms.filter((room) => isRoomVerified(room));
  let area = 0;
  let widestAspect = 1;
  let counted = 0;

  for (const room of usable) {
    if (isUnknown(room.length) || isUnknown(room.width)) continue;
    const l = dimensionToMeters(room.length);
    const w = dimensionToMeters(room.width);
    if (!l || !w || l <= 0 || w <= 0) continue;
    area += l * w;
    counted += 1;
    if (room.floor === null || room.floor === 1) {
      const aspect = Math.max(l, w) / Math.min(l, w);
      if (aspect > widestAspect && aspect <= 3) widestAspect = aspect;
    }
  }

  if (counted === 0 || area <= 0) return null;

  const grossArea = area * CIRCULATION_FACTOR;
  // Square envelope of the gross area, stretched by the widest verified
  // room's own proportion (capped at 1.6:1 for a building envelope).
  const stretch = Math.min(1.6, Math.max(1, Math.sqrt(widestAspect)));
  const width = Math.sqrt(grossArea / stretch);
  const length = grossArea / width;

  return {
    lengthM: round(length, 2),
    widthM: round(width, 2),
    areaM2: round(grossArea, 1),
    roomCount: counted,
    method: `Σ ${counted} verified room areas (${round(area, 1)} m²) × ${CIRCULATION_FACTOR} circulation factor = ${round(grossArea, 1)} m² envelope, laid out at about ${round(length / width, 2)}:1`,
  };
}

/**
 * Verified extraction → elevation inputs. Only values the reviewer
 * confirmed (or edited) pass through.
 */
export function extractionToElevationImport(
  extraction: PlanExtraction,
): ElevationPlanImport {
  const model = toCanonicalBuildingModel(extraction);
  const sourcePatch = model.buildToRoofPatch.patch;

  const patch: Partial<PlanElevationInput> = {};
  const applied: ImportedField[] = [];

  const record = (
    key: keyof PlanElevationInput,
    label: string,
    value: number,
    unitLabel: string,
    confidence: number | null,
  ) => {
    patch[key] = value as never;
    applied.push({
      key,
      label,
      value,
      displayValue: `${value}${unitLabel ? ` ${unitLabel}` : ""}`,
      source: "plan",
      confidence,
    });
  };

  const factConfidence = (factKey: string): number | null =>
    extraction.buildingFacts.find((f) => f.key === factKey)?.confidence ?? null;

  if (typeof sourcePatch.building_length === "number") {
    record(
      "building_length",
      "Overall length",
      round(sourcePatch.building_length, 2),
      "m",
      factConfidence("building_length"),
    );
  }
  if (typeof sourcePatch.building_width === "number") {
    record(
      "building_width",
      "Overall width",
      round(sourcePatch.building_width, 2),
      "m",
      factConfidence("building_width"),
    );
  }
  if (typeof sourcePatch.floor_to_floor_height === "number") {
    record(
      "floor_to_floor_height",
      "Floor-to-floor height",
      round(sourcePatch.floor_to_floor_height, 2),
      "m",
      factConfidence("floor_to_floor_height"),
    );
  }
  if (typeof sourcePatch.number_of_floors === "number") {
    record(
      "storeys",
      "Storeys",
      Math.max(1, Math.round(sourcePatch.number_of_floors)),
      "",
      factConfidence("number_of_floors"),
    );
  }
  if (typeof sourcePatch.wall_thickness === "number") {
    record(
      "wall_thickness",
      "Wall thickness",
      round(sourcePatch.wall_thickness, 2),
      "m",
      factConfidence("wall_thickness"),
    );
  }
  if (typeof sourcePatch.internal_wall_length === "number") {
    record(
      "internal_wall_length",
      "Internal wall run",
      round(sourcePatch.internal_wall_length, 2),
      "m",
      factConfidence("internal_wall_length"),
    );
  }
  if (typeof sourcePatch.roof_pitch_degrees === "number") {
    record(
      "roof_pitch_deg",
      "Roof pitch",
      round(sourcePatch.roof_pitch_degrees, 1),
      "°",
      factConfidence("roof_pitch_degrees"),
    );
  }
  if (typeof sourcePatch.roof_overhang === "number") {
    record(
      "roof_overhang",
      "Roof overhang",
      round(sourcePatch.roof_overhang, 2),
      "m",
      factConfidence("roof_overhang"),
    );
  }

  // Roof form, only when the extractor could determine the geometry.
  const roofFact = extraction.buildingFacts.find(
    (f) => f.key === "roof_type" && f.enumValue,
  );
  const roofType = normaliseRoofType(
    roofFact?.enumValue ??
      (extraction.roof?.geometrySufficient
        ? extraction.roof?.roofType
        : undefined),
  );
  if (roofType) {
    patch.roof_type = roofType;
    applied.push({
      key: "roof_type",
      label: "Roof form",
      value: roofType,
      displayValue: roofType.replace(/_/g, " "),
      source: "plan",
      confidence: roofFact?.confidence ?? extraction.roof?.confidence ?? null,
    });
  }

  const typeFact = extraction.buildingFacts.find(
    (f) => f.key === "building_type" && f.enumValue,
  );
  const buildingType = normaliseBuildingType(
    typeFact?.enumValue ??
      extraction.buildingFacts.find((f) => f.key === "building_type")
        ?.enumValue,
  );
  if (buildingType) {
    patch.building_type = buildingType;
    applied.push({
      key: "building_type",
      label: "Building type",
      value: buildingType,
      displayValue: buildingType.replace(/_/g, " "),
      source: "plan",
      confidence: typeFact?.confidence ?? null,
    });
  }

  const missing: MissingField[] = [];
  const require = (
    key: keyof PlanElevationInput,
    label: string,
    hint: string,
  ) => {
    if (patch[key] === undefined) missing.push({ key, label, hint });
  };

  require("building_length", "Overall length", "Not stated on the drawing. Type it in, or use the derived footprint below.");
  require("building_width", "Overall width", "Not stated on the drawing. Type it in, or use the derived footprint below.");
  require("floor_to_floor_height", "Floor-to-floor height", "Usually shown on a section. The engine keeps its current value until you change it.");

  patch.project_name = extraction.documentId
    ? `Plan ${extraction.documentId.slice(0, 12)}`
    : "Imported plan";

  const footprint = deriveFootprint(extraction.rooms);

  return {
    patch,
    applied,
    missing,
    footprint,
    warnings: extraction.warnings,
    hasUsableValues: applied.some((field) =>
      [
        "building_length",
        "building_width",
        "floor_to_floor_height",
        "storeys",
        "roof_pitch_deg",
      ].includes(String(field.key)),
    ),
  };
}

// =========================================================
// HANDOFF: one calculation → every estimator
// =========================================================

export interface PlanQuantities {
  floorAreaM2: number;
  ceilingAreaM2: number;
  netWallAreaM2: number;
  /** Null until room-face data can distinguish interior/exterior faces without double counting. */
  paintAreaM2: null;
  /** Null: a plan/pitch proxy is not an order-ready roof takeoff. */
  roofAreaM2: null;
  storeys: number;
  lengthM: number;
  widthM: number;
  perimeterM: number;
}

export interface PlanExit {
  id: string;
  label: string;
  path: string;
  /** Router state the target estimator already knows how to read. */
  state: Record<string, unknown>;
  /** One-line description of what travels across. */
  carries: string;
}

/** The quantities the elevation engine has already computed. */
export function planQuantitiesFromResult(
  result: MathematicalElevationResult,
): PlanQuantities {
  const { level_2_ground_slab, level_3_superstructure } = result.levels;
  const { building_length, building_width, storeys } = result.input;
  return {
    floorAreaM2: round(level_2_ground_slab.slab_area_m2, 2),
    ceilingAreaM2: round(level_2_ground_slab.slab_area_m2, 2),
    netWallAreaM2: round(level_3_superstructure.net_masonry_area_m2, 2),
    // No auto-fill: the aggregate wall figure mixes faces and cannot resolve
    // storey/floor-specific finish schedules; roof area is only a geometry proxy.
    paintAreaM2: null,
    roofAreaM2: null,
    storeys,
    lengthM: building_length,
    widthM: building_width,
    perimeterM: round(2 * (building_length + building_width), 2),
  };
}

/**
 * Destinations that already accept a router-state patch. State shapes
 * are the ones those pages read today; nothing is invented here.
 */
export function planExits(
  quantities: PlanQuantities,
  elevationPatch: Partial<PlanElevationInput> = {},
): PlanExit[] {
  const buildToRoofPatch = {
    building_length: quantities.lengthM,
    building_width: quantities.widthM,
    number_of_floors: quantities.storeys,
    wall_thickness: elevationPatch.wall_thickness,
    floor_to_floor_height: elevationPatch.floor_to_floor_height,
    internal_wall_length: elevationPatch.internal_wall_length,
    roof_pitch_degrees: elevationPatch.roof_pitch_deg,
    roof_overhang: elevationPatch.roof_overhang,
    roof_type: elevationPatch.roof_type,
    building_type: elevationPatch.building_type,
  };
  // Undefined members would overwrite live estimator state with nothing.
  const trimmedBuildToRoof = Object.fromEntries(
    Object.entries(buildToRoofPatch).filter(([, v]) => v !== undefined),
  );

  return [
    {
      id: "build-to-roof",
      label: "Build to Roof",
      path: "/build-to-roof-estimator",
      state: { mathematicalElevationPatch: trimmedBuildToRoof },
      carries: "Dimensions, storeys, roof pitch and form",
    },
    {
      id: "paint",
      label: "Paint & Decor",
      path: "/cost-estimator",
      state: { coats: 2 },
      carries: "Open estimator; measure paintable surfaces there",
    },
    {
      id: "screeding",
      label: "Screeding",
      path: "/screeding-cost-estimator",
      state: { netScreedingArea: quantities.floorAreaM2 },
      carries: `${quantities.floorAreaM2} m² floor`,
    },
    {
      id: "tile",
      label: "Tiling",
      path: "/tile-cost-estimator",
      state: { surfaceArea: quantities.floorAreaM2 },
      carries: `${quantities.floorAreaM2} m² floor`,
    },
    {
      id: "pop",
      label: "POP Ceiling",
      path: "/pop-ceiling-cost-estimator",
      state: { ceilingArea: quantities.ceilingAreaM2 },
      carries: `${quantities.ceilingAreaM2} m² ceiling`,
    },
  ];
}

const PLAN_STORAGE_KEY = "frelux.plan.handoff.v1";

export interface StoredPlanHandoff {
  quantities: PlanQuantities;
  elevationPatch: Partial<PlanElevationInput>;
  source: "plan_import" | "manual_dimensions";
  createdAt: string;
}

/**
 * Keep the latest derived plan for this browser session so a visitor who
 * lands on another estimator can still pick it up. Session storage only:
 * a plan is not a server record until the user saves a project.
 */
export function storePlanHandoff(handoff: StoredPlanHandoff): void {
  try {
    sessionStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(handoff));
  } catch {
    // Storage can be unavailable (private mode, quota). Not fatal.
  }
}

export function readPlanHandoff(): StoredPlanHandoff | null {
  try {
    const raw = sessionStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPlanHandoff;
    if (
      !parsed?.quantities ||
      typeof parsed.quantities.floorAreaM2 !== "number"
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlanHandoff(): void {
  try {
    sessionStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {
    // ignore
  }
}
