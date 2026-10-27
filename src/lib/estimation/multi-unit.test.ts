import { describe, it, expect } from "vitest";
import {
  expandEngineRooms,
  expandLegacyInputs,
  aggregateEngineRooms,
  aggregateCalculatorResults,
  houseRowsFromPreset,
  metersToUnit,
} from "./multi-unit";
import type { CalculatorInput, CalculatorResult } from "@/types";
import type { PaintEngineRoomResult } from "./paint-engine";

const DOOR: CalculatorInput["doorDims"] = { width: 0.9, height: 2.1 };
const WINDOW: CalculatorInput["windowDims"] = { width: 1.2, height: 1.2 };

function baseInput(overrides: Partial<CalculatorInput> = {}): CalculatorInput {
  return {
    projectType: "room",
    length: 4,
    width: 3,
    wallHeight: 2.7,
    doors: 1,
    doorDims: DOOR,
    windows: 1,
    windowDims: WINDOW,
    coats: 2,
    paintType: "p1",
    unit: "meters",
    includeCeiling: false,
    wasteMargin: 5,
    surfaceCondition: "smooth",
    colorCondition: "same_or_light",
    includePrimer: false,
    ...overrides,
  };
}

describe("metersToUnit", () => {
  it("converts metres to feet and back approximately", () => {
    expect(metersToUnit(0.9, "feet")).toBeCloseTo(2.953, 2);
    expect(metersToUnit(2.1, "feet")).toBeCloseTo(6.89, 2);
    expect(metersToUnit(1, "meters")).toBe(1);
  });
});

describe("expandEngineRooms — room mode", () => {
  it("produces one room by default", () => {
    const rooms = expandEngineRooms(baseInput());
    expect(rooms).toHaveLength(1);
    expect(rooms[0].room_name).toBe("Room");
    expect(rooms[0].length).toBe(4);
    expect(rooms[0].width).toBe(3);
  });

  it("expands identical rooms via roomCount", () => {
    const rooms = expandEngineRooms(baseInput({ roomCount: 4 }));
    expect(rooms).toHaveLength(4);
    expect(rooms[1].room_name).toBe("Room 2");
    expect(rooms[3].room_name).toBe("Room 4");
  });

  it("converts opening dims from metres to the room unit", () => {
    const rooms = expandEngineRooms(baseInput({ unit: "feet" }));
    // 0.9 m door expressed in feet for the engine's unit conversion
    expect(rooms[0].doors[0].width).toBeCloseTo(2.953, 2);
    expect(rooms[0].doors[0].height).toBeCloseTo(6.89, 2);
  });

  it("rooms with zero doors produce no opening entries", () => {
    const rooms = expandEngineRooms(baseInput({ doors: 0, windows: 0 }));
    expect(rooms[0].doors).toHaveLength(0);
    expect(rooms[0].windows).toHaveLength(0);
  });
});

describe("expandEngineRooms — house mode", () => {
  const houseInput = baseInput({
    projectType: "house",
    wallHeight: 3,
    includeCeiling: true,
    houseRooms: [
      { id: "r1", label: "Master Bedroom", length: 3.7, width: 3.5, quantity: 1, doors: 1, windows: 1 },
      { id: "r2", label: "Bedroom", length: 3.7, width: 3.5, quantity: 2, doors: 1, windows: 1 },
      { id: "r3", label: "Parlour", length: 4.9, width: 4.3, quantity: 1, doors: 1, windows: 2 },
    ],
  });

  it("expands rows by quantity into physical rooms", () => {
    const rooms = expandEngineRooms(houseInput);
    expect(rooms).toHaveLength(4); // 1 + 2 + 1
    expect(rooms.filter((r) => r.room_name === "Bedroom")).toHaveLength(2);
    expect(rooms.every((r) => r.include_ceiling)).toBe(true);
    expect(rooms.every((r) => r.height === 3)).toBe(true);
  });

  it("carries per-row doors and windows", () => {
    const rooms = expandEngineRooms(houseInput);
    const parlour = rooms.find((r) => r.room_name === "Parlour")!;
    expect(parlour.windows[0].quantity).toBe(2);
  });

  it("returns empty for a house with no rooms", () => {
    expect(expandEngineRooms(baseInput({ projectType: "house" }))).toHaveLength(0);
  });
});

describe("expandEngineRooms — exterior and fence modes", () => {
  it("encodes each run as a single painted face (length/2 × width 0)", () => {
    const runs = baseInput({
      projectType: "exterior",
      surfaceRuns: [
        { id: "w1", label: "Front Wall", length: 10, height: 3, quantity: 1, doors: 1, windows: 2 },
      ],
    });
    const rooms = expandEngineRooms(runs);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].length).toBe(5); // 10/2 — engine doubles it back to 10×3
    expect(rooms[0].width).toBe(0);
    expect(rooms[0].include_ceiling).toBe(false);
    expect(rooms[0].windows[0].quantity).toBe(2);
  });

  it("expands fence partitions via quantity", () => {
    const runs = baseInput({
      projectType: "fence",
      surfaceRuns: [
        { id: "f1", label: "Fence Section 1", length: 8, height: 2, quantity: 3, doors: 0, windows: 0 },
      ],
    });
    const rooms = expandEngineRooms(runs);
    expect(rooms).toHaveLength(3);
    expect(rooms.every((r) => r.doors.length === 0)).toBe(true);
  });
});

describe("expandLegacyInputs", () => {
  it("uses legacy fence geometry (single face) for exterior runs", () => {
    const units = expandLegacyInputs(
      baseInput({
        projectType: "exterior",
        surfaceRuns: [
          { id: "w1", label: "Front Wall", length: 10, height: 3, quantity: 1, doors: 1, windows: 0 },
        ],
      }),
    );
    expect(units).toHaveLength(1);
    expect(units[0].projectType).toBe("fence");
    expect(units[0].length).toBe(10);
    expect(units[0].wallHeight).toBe(3);
    expect(units[0].includeCeiling).toBe(false);
  });

  it("expands house rows by quantity", () => {
    const units = expandLegacyInputs(
      baseInput({
        projectType: "house",
        houseRooms: [
          { id: "r1", label: "Bedroom", length: 3.7, width: 3.5, quantity: 3, doors: 1, windows: 1 },
        ],
      }),
    );
    expect(units).toHaveLength(3);
    expect(units[0].length).toBe(3.7);
    expect(units[0].projectType).toBe("house");
  });

  it("expands identical rooms in room mode", () => {
    expect(expandLegacyInputs(baseInput({ roomCount: 5 }))).toHaveLength(5);
  });
});

// ── Engine result fixtures ──

function engineResult(over: Partial<PaintEngineRoomResult> = {}): PaintEngineRoomResult {
  return {
    room_id: "r1",
    room_name: "Room",
    length_m: 4,
    width_m: 3,
    height_m: 2.7,
    gross_wall_area_m2: 37.8,
    door_area_m2: 1.89,
    window_area_m2: 1.44,
    opening_deduction_m2: 3.33,
    opening_deduction_mode: "exact",
    net_wall_area_m2: 34.47,
    ceiling_area_m2: 12,
    product: null,
    quality: null,
    coverage_rate: 10,
    coverage_unit: "m2_per_liter",
    ceiling_coverage_rate: null,
    pack_size_litres: 20,
    coats: 2,
    effective_coats: 2,
    theoretical_wall_litres: 6.894,
    theoretical_ceiling_litres: 2.4,
    theoretical_total_litres: 9.294,
    theoretical_wall_buckets: 0.3447,
    theoretical_ceiling_buckets: 0.12,
    theoretical_total_buckets: 0.4647,
    practical_wall_buckets: 1,
    practical_ceiling_buckets: 1,
    practical_total_buckets: 2,
    practical_total_litres: 40,
    leftover_litres: 30.7,
    unit_price: 30000,
    material_cost: 60000,
    price_configured: true,
    primer_recommended: false,
    primer_included: false,
    primer_litres: 0,
    primer_buckets: 0,
    primer_cost: 0,
    surface_condition: null,
    surface_factor: 1,
    colour_condition: null,
    height_warning: null,
    customer_summary: {} as PaintEngineRoomResult["customer_summary"],
    valid: true,
    errors: [],
    warnings: [],
    recommendations: [],
    calculation_steps: [],
    calc_version_id: null,
    price_snapshot: null,
    ...over,
  } as PaintEngineRoomResult;
}

describe("aggregateEngineRooms", () => {
  it("returns zero totals for an empty project", () => {
    const t = aggregateEngineRooms([], null);
    expect(t.unitCount).toBe(0);
    expect(t.practical_total_buckets).toBe(0);
  });

  it("sums areas across units and rounds buckets ONCE on the total", () => {
    // Two identical rooms: each needs 6.894 L wall paint.
    const t = aggregateEngineRooms(
      [engineResult({ room_id: "a" }), engineResult({ room_id: "b", ceiling_area_m2: 0, theoretical_ceiling_litres: 0 })],
      null,
    );
    expect(t.unitCount).toBe(2);
    expect(t.net_wall_area_m2).toBeCloseTo(68.94, 1);
    expect(t.ceiling_area_m2).toBe(12);
    expect(t.theoretical_wall_litres).toBeCloseTo(13.788, 3);
    // 13.788 L → one 20 L bucket for the whole project, NOT one per room.
    expect(t.practical_wall_buckets).toBe(1);
    expect(t.practical_total_buckets).toBe(2); // 1 wall + 1 ceiling bucket
    expect(t.practical_total_litres).toBe(40);
    expect(t.material_cost).toBe(60000); // 2 buckets × 30,000
    // total theoretical = 13.788 wall + 2.4 ceiling (room 1 only)
    expect(t.leftover_litres).toBeCloseTo(40 - 16.188, 2);
  });

  it("aggregates primer litres and rounds primer buckets once", () => {
    const r = engineResult({
      primer_included: true,
      primer_litres: 5,
      primer_buckets: 1,
      primer_cost: 15000,
    });
    const t = aggregateEngineRooms([r, { ...r, room_id: "b" }], null);
    expect(t.primer_litres).toBe(10);
    expect(t.primer_buckets).toBe(1); // 10 L still one 20 L bucket
    expect(t.primer_cost).toBe(15000);
  });

  it("collects unique warnings and the first height warning", () => {
    const t = aggregateEngineRooms(
      [
        engineResult({ warnings: ["Tall wall"], height_warning: "Above standard height" }),
        engineResult({ warnings: ["Tall wall", "Dark colour"], room_id: "b" }),
      ],
      null,
    );
    expect(t.warnings).toEqual(["Tall wall", "Dark colour"]);
    expect(t.height_warning).toBe("Above standard height");
  });
});

describe("aggregateCalculatorResults", () => {
  const legacyResult = (over: Partial<CalculatorResult> = {}): CalculatorResult => ({
    projectType: "room",
    unit: "meters",
    wallArea: 37.8,
    ceilingArea: 0,
    doorArea: 1.89,
    windowArea: 1.44,
    paintableArea: 34.47,
    coats: 2,
    paintType: "p1",
    coverageRate: 10,
    paintRequiredLiters: 6.9,
    wasteMargin: 5,
    adjustedLiters: 7.245,
    recommendedContainers: [{ size: 20, count: 1 }],
    totalRecommendedLiters: 20,
    leftoverLiters: 12.755,
    primerLiters: 0,
    primerContainers: [],
    primerTotalLiters: 0,
    baseCoverageRate: 10,
    surfaceCondition: "smooth",
    surfaceConditionFactor: 1,
    heightWarning: null,
    colorWarning: null,
    primerRecommended: false,
    ...over,
  });

  it("returns null for empty results", () => {
    expect(aggregateCalculatorResults([])).toBeNull();
  });

  it("sums areas and recomputes container count from project litres", () => {
    const r = aggregateCalculatorResults([
      legacyResult(),
      legacyResult({ paintableArea: 34.47, adjustedLiters: 7.245 }),
    ])!;
    expect(r.paintableArea).toBeCloseTo(68.94, 1);
    expect(r.adjustedLiters).toBeCloseTo(14.49, 2);
    // 14.49 L across the project → ONE 20 L bucket, not two.
    expect(r.recommendedContainers).toEqual([{ size: 20, count: 1 }]);
    expect(r.totalRecommendedLiters).toBe(20);
  });

  it("keeps primer aggregation sane", () => {
    const r = aggregateCalculatorResults([
      legacyResult({ primerLiters: 5, primerContainers: [{ size: 20, count: 1 }], primerTotalLiters: 20, primerRecommended: true }),
      legacyResult({ primerLiters: 5, primerContainers: [{ size: 20, count: 1 }], primerTotalLiters: 20 }),
    ])!;
    expect(r.primerLiters).toBe(10);
    expect(r.primerContainers).toEqual([{ size: 20, count: 1 }]);
    expect(r.primerRecommended).toBe(true);
  });
});

describe("houseRowsFromPreset", () => {
  it("seeds editable rows from the NG 3BR bungalow in feet", () => {
    const seeded = houseRowsFromPreset("NG", "wa-3br-bungalow", "feet");
    expect(seeded).not.toBeNull();
    expect(seeded!.rows.length).toBeGreaterThan(3);
    expect(seeded!.wallHeight).toBe(9.8); // 3.0 m in feet
    const master = seeded!.rows.find((r) => r.label === "Master Bedroom")!;
    expect(master.length).toBeGreaterThan(12);
    expect(master.quantity).toBe(1);
    expect(seeded!.rows.find((r) => r.label === "Bedroom")!.quantity).toBe(2);
  });

  it("seeds the same preset in metres for another market profile", () => {
    const seeded = houseRowsFromPreset("GB", "uk-3br-semi", "meters");
    expect(seeded).not.toBeNull();
    expect(seeded!.wallHeight).toBe(2.4);
    expect(seeded!.rows.length).toBeGreaterThan(4);
  });

  it("returns null for an unknown preset id", () => {
    expect(houseRowsFromPreset("NG", "nope", "feet")).toBeNull();
  });
});
