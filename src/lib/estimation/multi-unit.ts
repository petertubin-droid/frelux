/**
 * FRELUX MULTI-UNIT PROJECT AGGREGATION
 *
 * The paint calculator's project tabs (Room / House / Exterior / Fence)
 * used to be cosmetic: every mode ran a single room through the engine.
 * This module makes the modes real:
 *
 * - Room:    one room, optionally N identical rooms (roomCount).
 * - House:   a market-aware building preset (2 Bedroom Bungalow, 5 Bedroom
 *            Apartment, Semi-Detached, Ranch, BHK flat...) expanded into a
 *            per-room breakdown the user can edit.
 * - Exterior: outside wall runs, ONE painted face each (length × height).
 * - Fence:   fence sections (length × height per partition face), matching
 *            the legacy single-face fence semantics.
 *
 * The engine still computes one unit at a time; this module expands the
 * project into unit inputs, runs the engine, and aggregates the purchase
 * at PROJECT level so buckets are rounded once on the whole project
 * instead of per room (no over-purchase on identical rooms).
 *
 * Aggregation is unit-tested; the page only wires UI to these helpers.
 */

import type {
  CalculatorInput,
  CalculatorResult,
  HouseRoomRow,
  SurfaceRunRow,
  OpeningDimensions,
  Unit,
} from "@/types";
import type { EstimationCalcRule } from "@/types/database";
import {
  findBuildingPreset,
  presetToRoomDrafts,
  presetWallHeight,
} from "@/lib/measurement/building-presets";
import type {
  PaintEngineRoomInput,
  PaintEngineRoomResult,
} from "./paint-engine";
import { getRoundingRule, roundUpToBuckets } from "./paint-engine";

// =========================================================
// Unit conversion helpers
// =========================================================

/** Convert a metres value into the target unit. */
export function metersToUnit(m: number, unit: Unit): number {
  switch (unit) {
    case "feet":
      return m / 0.3048;
    case "inches":
      return m / 0.0254;
    case "centimeters":
      return m * 100;
    case "millimeters":
      return m * 1000;
    case "meters":
    default:
      return m;
  }
}

/** Opening list for the engine, dims converted from metres to the room unit. */
function toEngineOpenings(
  count: number,
  dims: OpeningDimensions | undefined,
  unit: Unit,
): { quantity: number; width: number; height: number }[] {
  if (count <= 0 || !dims) return [];
  return [
    {
      quantity: Math.round(count),
      width: metersToUnit(dims.width, unit),
      height: metersToUnit(dims.height, unit),
    },
  ];
}

// =========================================================
// Expansion: project → engine room inputs
// =========================================================

/** Base engine fields shared by every unit of a project. */
function baseRoomFields(input: CalculatorInput): Pick<
  PaintEngineRoomInput,
  | "unit"
  | "product_id"
  | "quality_id"
  | "coats"
  | "ceiling_colour"
  | "surface_condition_key"
  | "colour_condition_key"
  | "include_primer"
> {
  return {
    unit: input.unit,
    product_id: input.paintType,
    quality_id: input.qualityId ?? "",
    coats: input.coats,
    ceiling_colour: "white",
    surface_condition_key: (input.surfaceCondition ?? "smooth") as string,
    colour_condition_key: (input.colorCondition ?? "same_or_light") as string,
    include_primer: input.includePrimer ?? false,
  };
}

/**
 * Expand the project into one engine room input per physical unit.
 * Exterior and fence runs are expressed as single painted faces: the
 * engine treats a room with width 0 as "two walls of length", so a run
 * of length L is encoded as length L/2 + width 0, giving exactly
 * 2 × (L/2) × H = L × H — one face, with openings deducted per run.
 */
export function expandEngineRooms(input: CalculatorInput): PaintEngineRoomInput[] {
  const base = baseRoomFields(input);
  const rooms: PaintEngineRoomInput[] = [];

  if (input.projectType === "house") {
    for (const row of input.houseRooms ?? []) {
      const qty = Math.max(1, Math.round(row.quantity || 1));
      for (let i = 0; i < qty; i++) {
        rooms.push({
          ...base,
          room_id: `${row.id}-${i}`,
          room_name: row.label,
          length: row.length,
          width: row.width,
          height: input.wallHeight,
          unit: input.unit,
          doors: toEngineOpenings(row.doors, input.doorDims, input.unit),
          windows: toEngineOpenings(row.windows, input.windowDims, input.unit),
          doors_unknown: false,
          windows_unknown: false,
          include_ceiling: input.includeCeiling,
        });
      }
    }
    return rooms;
  }

  if (input.projectType === "exterior" || input.projectType === "fence") {
    for (const run of input.surfaceRuns ?? []) {
      const qty = Math.max(1, Math.round(run.quantity || 1));
      for (let i = 0; i < qty; i++) {
        rooms.push({
          ...base,
          room_id: `${run.id}-${i}`,
          room_name: run.label,
          // Single-face encoding (see function doc): L/2 × width 0 → L × H.
          length: run.length / 2,
          width: 0,
          height: run.height,
          unit: input.unit,
          doors: toEngineOpenings(run.doors, input.doorDims, input.unit),
          windows: toEngineOpenings(run.windows, input.windowDims, input.unit),
          doors_unknown: false,
          windows_unknown: false,
          include_ceiling: false,
        });
      }
    }
    return rooms;
  }

  // Room mode: one room, optionally N identical rooms.
  const count = Math.max(1, Math.round(input.roomCount ?? 1));
  for (let i = 0; i < count; i++) {
    rooms.push({
      ...base,
      room_id: `room-${i}`,
      room_name: count > 1 ? `Room ${i + 1}` : "Room",
      length: input.length,
      width: input.width,
      height: input.wallHeight,
      unit: input.unit,
      doors: toEngineOpenings(input.doors, input.doorDims, input.unit),
      windows: toEngineOpenings(input.windows, input.windowDims, input.unit),
      doors_unknown: false,
      windows_unknown: false,
      include_ceiling: input.includeCeiling,
    });
  }
  return rooms;
}

// =========================================================
// Expansion: project → legacy CalculatorInput units
// =========================================================

/**
 * Legacy fallback expansion (calculatePaint path). One CalculatorInput per
 * physical unit. Exterior and fence runs use the legacy "fence" geometry
 * (length × height = one face) so single-face semantics hold without
 * touching the legacy engine.
 */
export function expandLegacyInputs(input: CalculatorInput): CalculatorInput[] {
  const base = { ...input };
  const units: CalculatorInput[] = [];

  if (input.projectType === "house") {
    for (const row of input.houseRooms ?? []) {
      const qty = Math.max(1, Math.round(row.quantity || 1));
      for (let i = 0; i < qty; i++) {
        units.push({
          ...base,
          projectType: "house",
          length: row.length,
          width: row.width,
          doors: row.doors,
          windows: row.windows,
        });
      }
    }
    return units;
  }

  if (input.projectType === "exterior" || input.projectType === "fence") {
    for (const run of input.surfaceRuns ?? []) {
      const qty = Math.max(1, Math.round(run.quantity || 1));
      for (let i = 0; i < qty; i++) {
        units.push({
          ...base,
          projectType: "fence", // legacy single-face geometry
          length: run.length,
          width: 0,
          wallHeight: run.height,
          doors: run.doors,
          windows: run.windows,
          includeCeiling: false,
        });
      }
    }
    return units;
  }

  const count = Math.max(1, Math.round(input.roomCount ?? 1));
  for (let i = 0; i < count; i++) {
    units.push({ ...base });
  }
  return units;
}

// =========================================================
// Aggregation: engine room results → project totals
// =========================================================

export interface ProjectTotals {
  /** Number of physical units in the project. */
  unitCount: number;
  gross_wall_area_m2: number;
  ceiling_area_m2: number;
  door_area_m2: number;
  window_area_m2: number;
  net_wall_area_m2: number;
  theoretical_wall_litres: number;
  theoretical_ceiling_litres: number;
  theoretical_total_litres: number;
  practical_wall_buckets: number;
  practical_ceiling_buckets: number;
  practical_total_buckets: number;
  practical_total_litres: number;
  leftover_litres: number;
  pack_size_litres: number;
  material_cost: number;
  primer_litres: number;
  primer_buckets: number;
  primer_cost: number;
  unit_price: number;
  warnings: string[];
  recommendations: string[];
  errors: string[];
  height_warning: string | null;
}

/**
 * Aggregate engine room results into project-level totals, rounding
 * purchase buckets ONCE on the whole project (per side: walls and
 * ceiling keep their separate coverage maths) so identical rooms do
 * not each round up to a full bucket.
 */
export function aggregateEngineRooms(
  roomResults: PaintEngineRoomResult[],
  roundingRule: EstimationCalcRule | null,
): ProjectTotals {
  if (roomResults.length === 0) {
    return {
      unitCount: 0,
      gross_wall_area_m2: 0,
      ceiling_area_m2: 0,
      door_area_m2: 0,
      window_area_m2: 0,
      net_wall_area_m2: 0,
      theoretical_wall_litres: 0,
      theoretical_ceiling_litres: 0,
      theoretical_total_litres: 0,
      practical_wall_buckets: 0,
      practical_ceiling_buckets: 0,
      practical_total_buckets: 0,
      practical_total_litres: 0,
      leftover_litres: 0,
      pack_size_litres: 0,
      material_cost: 0,
      primer_litres: 0,
      primer_buckets: 0,
      primer_cost: 0,
      unit_price: 0,
      warnings: [],
      recommendations: [],
      errors: [],
      height_warning: null,
    };
  }

  const packSize = roomResults[0].pack_size_litres;
  const rule = getRoundingRule(roundingRule);

  const sum = (f: (r: PaintEngineRoomResult) => number) =>
    roomResults.reduce((s, r) => s + f(r), 0);

  const theoreticalWall = sum((r) => r.theoretical_wall_litres);
  const theoreticalCeiling = sum((r) => r.theoretical_ceiling_litres);
  const theoreticalTotal = theoreticalWall + theoreticalCeiling;

  // Purchase rounding happens ONCE, on project totals.
  const practicalWallBuckets = roundUpToBuckets(
    theoreticalWall,
    packSize,
    rule,
  );
  const practicalCeilingBuckets = roomResults.some((r) => r.ceiling_area_m2 > 0)
    ? roundUpToBuckets(theoreticalCeiling, packSize, rule)
    : 0;
  const practicalTotalBuckets =
    practicalWallBuckets + practicalCeilingBuckets;
  const practicalTotalLitres = practicalTotalBuckets * packSize;

  const unitPrice = roomResults[0].unit_price;
  const materialCost = practicalTotalBuckets * unitPrice;

  // Primer: aggregate litres, round buckets once, price at the same unit price.
  const primerLitres = sum((r) => r.primer_litres);
  const primerBuckets = roundUpToBuckets(primerLitres, packSize, rule);
  const primerUnitPrice =
    roomResults.find((r) => r.primer_buckets > 0 && r.primer_cost > 0) ??
    null;
  const primerPricePerBucket = primerUnitPrice
    ? primerUnitPrice.primer_cost / primerUnitPrice.primer_buckets
    : 0;
  const primerCost = primerPricePerBucket * primerBuckets;

  const warnings = [
    ...new Set(roomResults.flatMap((r) => r.warnings)),
  ];
  const recommendations = [
    ...new Set(roomResults.flatMap((r) => r.recommendations)),
  ];
  const errors = [...new Set(roomResults.flatMap((r) => r.errors))];
  const heightWarning =
    roomResults.find((r) => r.height_warning)?.height_warning ?? null;

  return {
    unitCount: roomResults.length,
    gross_wall_area_m2: sum((r) => r.gross_wall_area_m2),
    ceiling_area_m2: sum((r) => r.ceiling_area_m2),
    door_area_m2: sum((r) => r.door_area_m2),
    window_area_m2: sum((r) => r.window_area_m2),
    net_wall_area_m2: sum((r) => r.net_wall_area_m2),
    theoretical_wall_litres: theoreticalWall,
    theoretical_ceiling_litres: theoreticalCeiling,
    theoretical_total_litres: theoreticalTotal,
    practical_wall_buckets: practicalWallBuckets,
    practical_ceiling_buckets: practicalCeilingBuckets,
    practical_total_buckets: practicalTotalBuckets,
    practical_total_litres: practicalTotalLitres,
    leftover_litres: practicalTotalLitres - theoreticalTotal,
    pack_size_litres: packSize,
    material_cost: materialCost,
    primer_litres: primerLitres,
    primer_buckets: primerBuckets,
    primer_cost: primerCost,
    unit_price: unitPrice,
    warnings,
    recommendations,
    errors,
    height_warning: heightWarning,
  };
}

// =========================================================
// Aggregation: legacy CalculatorResults → project result
// =========================================================

/**
 * Sum a set of legacy per-unit CalculatorResults into one project result.
 * Container counts are recomputed from the total litres so identical
 * rooms do not each round up to a full container.
 */
export function aggregateCalculatorResults(
  results: CalculatorResult[],
): CalculatorResult | null {
  if (results.length === 0) return null;
  const first = results[0];
  const sum = (f: (r: CalculatorResult) => number) =>
    results.reduce((s, r) => s + f(r), 0);

  const wallArea = sum((r) => r.wallArea);
  const ceilingArea = sum((r) => r.ceilingArea);
  const doorArea = sum((r) => r.doorArea);
  const windowArea = sum((r) => r.windowArea);
  const paintableArea = sum((r) => r.paintableArea);
  const paintRequiredLiters = sum((r) => r.paintRequiredLiters);
  const adjustedLiters = sum((r) => r.adjustedLiters);

  // Recompute containers from the project total.
  const size = first.recommendedContainers[0]?.size ?? 20;
  const count = Math.max(0, Math.ceil(adjustedLiters / size));
  const containers =
    count > 0 ? [{ size, count }] : first.recommendedContainers;
  const totalRecommendedLiters = count > 0 ? size * count : first.totalRecommendedLiters;

  const primerLiters = sum((r) => r.primerLiters);
  const primerSize = first.primerContainers[0]?.size ?? size;
  const primerCount = Math.max(0, Math.ceil(primerLiters / primerSize));
  const primerContainers =
    primerLiters > 0
      ? [{ size: primerSize, count: primerCount }]
      : first.primerContainers;

  return {
    ...first,
    wallArea,
    ceilingArea,
    doorArea,
    windowArea,
    paintableArea,
    paintRequiredLiters,
    adjustedLiters,
    recommendedContainers: containers,
    totalRecommendedLiters,
    leftoverLiters: Math.max(0, totalRecommendedLiters - adjustedLiters),
    primerLiters,
    primerContainers,
    primerTotalLiters: primerCount > 0 ? primerSize * primerCount : first.primerTotalLiters,
    heightWarning: results.find((r) => r.heightWarning)?.heightWarning ?? null,
    primerRecommended: results.some((r) => r.primerRecommended),
  };
}

// =========================================================
// Preset helpers for the UI
// =========================================================

/**
 * Seed HouseRoomRows for a building preset in the given unit.
 * Returns null when the preset id is unknown.
 */
export function houseRowsFromPreset(
  marketCode: string,
  presetId: string,
  unit: Unit,
): { rows: HouseRoomRow[]; wallHeight: number } | null {
  const preset = findBuildingPreset(marketCode, presetId);
  if (!preset) return null;
  const drafts = presetToRoomDrafts(
    preset,
    unit === "meters" ? "meters" : "feet",
  );
  return {
    rows: drafts.map((d) => ({
      id: d.id,
      label: d.label,
      length: d.length,
      width: d.width,
      quantity: d.quantity,
      doors: d.doors,
      windows: d.windows,
    })),
    wallHeight: presetWallHeight(preset, unit === "meters" ? "meters" : "feet"),
  };
}

/** A fresh, empty run row for exterior / fence mode. */
export function newSurfaceRunRow(index: number, isFence: boolean): SurfaceRunRow {
  return {
    id: `run-${Date.now()}-${index}`,
    label: isFence ? `Fence Section ${index}` : `Wall Run ${index}`,
    length: 0,
    height: 0,
    quantity: 1,
    doors: 0,
    windows: 0,
  };
}
