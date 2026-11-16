import { describe, it, expect } from "vitest";
import {
  CEMENT_BAG_KG,
  CEMENT_BULK_DENSITY_KG_M3,
  CEMENT_VOLUME_PER_BAG,
  DRY_WET_RATIO,
  MORTAR_DRY_WET_RATIO,
  SHEET_COVERAGE,
  SCREWS_PER_SHEET,
  PURLIN_ROWS_PER_SLOPE,
  RAFTER_SPACING,
  M_PER_FT,
  M3_PER_TRIP,
  m3ToTrips,
  concreteToMaterials,
  mortarToMaterials,
  blocksPerM2,
  calculateRoofArea,
  decomposeRoofPlanes,
  roofingSheetsCount,
  getSheetCoverage,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
  estimateTimberMeters,
  TRIM_WASTAGE_PERCENT,
  validateBuildToRoofInput,
  convertBuildToRoofUnits,
  calculateBuildToRoof,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from "@/lib/estimation/build-to-roof-engine";
import { sandPurchaseLabel, tripCubicMetres } from "@/lib/materials/sand-units";
import type { BuildToRoofInput } from "@/types/build-to-roof";

describe("constants", () => {
  it("CEMENT_VOLUME_PER_BAG is 50 kg over the 1440 kg/m³ bulk density", () => {
    // 0.03472 m³ per bag; the old literal 0.0347 was this value truncated.
    expect(CEMENT_VOLUME_PER_BAG).toBeCloseTo(0.0347, 4);
    expect(CEMENT_VOLUME_PER_BAG).toBeCloseTo(
      CEMENT_BAG_KG / CEMENT_BULK_DENSITY_KG_M3,
      12,
    );
  });
  it("DRY_WET_RATIO = 1.54", () => expect(DRY_WET_RATIO).toBe(1.54));
  it("MORTAR_DRY_WET_RATIO = 1.33", () =>
    expect(MORTAR_DRY_WET_RATIO).toBe(1.33));
  it("SCREWS_PER_SHEET = 10", () => expect(SCREWS_PER_SHEET).toBe(10));
  it("PURLIN_ROWS_PER_SLOPE = 4", () => expect(PURLIN_ROWS_PER_SLOPE).toBe(4));
  it("RAFTER_SPACING = 0.9", () => expect(RAFTER_SPACING).toBe(0.9));
  it("M_PER_FT = 0.3048", () => expect(M_PER_FT).toBe(0.3048));
  it("M3_PER_TRIP is the 5-tonne tipper at 1,600 kg/m³", () => {
    // 3.13 m³, not 3.5: the old figure implied 1,430 kg/m³ and made the same
    // sand volume read as fewer trips here than in the blockwork takeoff.
    expect(M3_PER_TRIP).toBe(3.13);
    expect(M3_PER_TRIP).toBe(tripCubicMetres(5, "NG"));
  });
  it("SHEET_COVERAGE has all materials", () => {
    expect(SHEET_COVERAGE.long_span_aluminium).toBe(1.5);
    expect(SHEET_COVERAGE.stone_coated).toBe(0.53);
    expect(SHEET_COVERAGE.gi_sheet).toBe(1.52);
    expect(SHEET_COVERAGE.shingle).toBe(0.93);
    expect(SHEET_COVERAGE.custom).toBe(1.5);
  });
});

describe("m3ToTrips", () => {
  it("converts m³ to trips", () => expect(m3ToTrips(6.26)).toBeCloseTo(2, 5));
  it("returns 0 for 0", () => expect(m3ToTrips(0)).toBe(0));
});

describe("concreteToMaterials", () => {
  it("returns zeros for zero volume", () => {
    expect(concreteToMaterials(0, 1, 2, 4)).toEqual({
      cement_bags: 0,
      sand_m3: 0,
      granite_m3: 0,
    });
  });
  it("calculates 1:2:4 mix correctly", () => {
    const r = concreteToMaterials(1, 1, 2, 4);
    const dryVol = 1 * 1.54;
    expect(r.cement_bags).toBeCloseTo(
      (dryVol * (1 / 7)) / CEMENT_VOLUME_PER_BAG,
      4,
    );
    expect(r.sand_m3).toBeCloseTo(dryVol * (2 / 7), 4);
    expect(r.granite_m3).toBeCloseTo(dryVol * (4 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = concreteToMaterials(5, 1, 3, 6);
    const dryVol = 5 * 1.54;
    const cementVol = r.cement_bags * CEMENT_VOLUME_PER_BAG;
    expect(cementVol + r.sand_m3 + r.granite_m3).toBeCloseTo(dryVol, 3);
  });
  it("returns zeros for invalid mix", () => {
    expect(concreteToMaterials(1, 0, 0, 0)).toEqual({
      cement_bags: 0,
      sand_m3: 0,
      granite_m3: 0,
    });
  });
});

describe("mortarToMaterials", () => {
  it("returns zeros for zero volume", () => {
    expect(mortarToMaterials(0, 1, 6)).toEqual({ cement_bags: 0, sand_m3: 0 });
  });
  it("calculates 1:6 mix correctly", () => {
    const r = mortarToMaterials(1, 1, 6);
    const dryVol = 1 * 1.33;
    expect(r.cement_bags).toBeCloseTo(
      (dryVol * (1 / 7)) / CEMENT_VOLUME_PER_BAG,
      4,
    );
    expect(r.sand_m3).toBeCloseTo(dryVol * (6 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = mortarToMaterials(3, 1, 4);
    const dryVol = 3 * 1.33;
    const cementVol = r.cement_bags * CEMENT_VOLUME_PER_BAG;
    expect(cementVol + r.sand_m3).toBeCloseTo(dryVol, 3);
  });
});

describe("blocksPerM2", () => {
  it("calculates for standard 18×9 inch block including mortar joints", () => {
    const result = blocksPerM2(18, 9);
    // 450 x 225 mm block laid with a 12 mm joint:
    // (0.4572 + 0.012) x (0.2286 + 0.012) = 0.112904 m² -> 8.86 blocks/m²
    const joint = 0.012; // MORTAR_JOINT_THICKNESS
    const moduleArea = (18 * 0.0254 + joint) * (9 * 0.0254 + joint);
    expect(result).toBeCloseTo(1 / moduleArea, 4);
    expect(result).toBeCloseTo(8.8582, 3);
  });
  it("matches a direct course count on a real wall (consistency)", () => {
    const joint = 0.012;
    const P = 10 * (0.4572 + joint); // 10 whole blocks per course, m
    const H = 10 * (0.2286 + joint); // 10 whole courses, m
    const blocksByCount = 10 * 10;
    const blocksByRate = P * H * blocksPerM2(18, 9);
    expect(blocksByRate).toBeCloseTo(blocksByCount, 1);
  });
  it("returns the joint-free theoretical rate when joint = 0", () => {
    const result = blocksPerM2(18, 9, 0);
    expect(result).toBeCloseTo(1 / (18 * 0.0254 * 9 * 0.0254), 4);
  });
  it("returns 0 for zero dimensions", () => {
    expect(blocksPerM2(0, 9)).toBe(0);
    expect(blocksPerM2(18, 0)).toBe(0);
  });
});

describe("calculateRoofArea", () => {
  it("returns footprint for flat roof", () => {
    expect(calculateRoofArea(10, 8, 0, 0.6, "flat")).toBeCloseTo(
      (10 + 1.2) * (8 + 1.2),
      6,
    );
  });
  it("applies pitch factor for gable", () => {
    const result = calculateRoofArea(10, 8, 30, 0.6, "gable");
    const footprint = (10 + 1.2) * (8 + 1.2);
    expect(result).toBeCloseTo(footprint / Math.cos((30 * Math.PI) / 180), 2);
  });
  it("returns footprint for 90° pitch", () => {
    const result = calculateRoofArea(10, 8, 90, 0.6, "gable");
    const footprint = (10 + 1.2) * (8 + 1.2);
    expect(result).toBeCloseTo(footprint, 2);
  });
});

describe("roofingSheetsCount", () => {
  it("rounds up to whole sheets", () => {
    expect(roofingSheetsCount(100, 1.5)).toBe(67);
  });
  it("exact division", () => {
    expect(roofingSheetsCount(15, 1.5)).toBe(10);
  });
  it("returns 0 for zero coverage", () => {
    expect(roofingSheetsCount(100, 0)).toBe(0);
  });
  it("returns 0 for zero area", () => {
    expect(roofingSheetsCount(0, 1.5)).toBe(0);
  });
});

describe("getSheetCoverage", () => {
  it("returns coverage for known material", () => {
    expect(getSheetCoverage("long_span_aluminium")).toBe(1.5);
    expect(getSheetCoverage("stone_coated")).toBe(0.53);
  });
  it("falls back to custom for unknown", () => {
    expect(getSheetCoverage("custom")).toBe(1.5);
  });
});

describe("calculateRidgeLength", () => {
  // Gable ridge cap covers the apex, which spans L + 2 x overhang
  // (the sloped planes extend past the gable walls).
  it("returns L + 2*overhang for gable", () => {
    expect(calculateRidgeLength(10, 8, "gable", 0.6)).toBeCloseTo(11.2, 6);
  });
  it("defaults to no overhang for gable", () => {
    expect(calculateRidgeLength(10, 8, "gable")).toBe(10);
  });
  it("returns |L - W| for hip (ridge along the longer side)", () => {
    expect(calculateRidgeLength(10, 8, "hip")).toBe(2);
  });
  // A hip on 5 x 10 has its ridge along the 10 m side: 10 - 5 = 5 m,
  // not 0. (Previous baseline of 0 was mathematically wrong.)
  it("hip ridge on W > L runs along the width", () => {
    expect(calculateRidgeLength(5, 10, "hip")).toBe(5);
  });
  it("square hip is a pyramid: no ridge", () => {
    expect(calculateRidgeLength(8, 8, "hip")).toBe(0);
  });
  it("returns 0 for mono_pitch and flat", () => {
    expect(calculateRidgeLength(10, 8, "mono_pitch", 0.6)).toBe(0);
    expect(calculateRidgeLength(10, 8, "flat", 0.6)).toBe(0);
  });
});

describe("calculateHipLength", () => {
  // True hip-rafter geometry: hip length per hip =
  //   run x sqrt(2 + tan^2(pitch)),  run = min(L,W)/2 + overhang
  // (hips run at 45 deg in plan, from eave corner to ridge end).
  // The previous baseline 4 x (W/2)/cos(pitch) was the COMMON-RAFTER
  // formula misapplied to hips, it understates by 18-34%.
  it("calculates 4 true hip rafters", () => {
    const run = 4; // W/2, no overhang
    const expected = 4 * run * Math.sqrt(2 + Math.tan(Math.PI / 6) ** 2);
    expect(calculateHipLength(10, 8, 30)).toBeCloseTo(expected, 2); // ~24.44 m
  });
  it("includes overhang in the hip run", () => {
    const run = 4 + 0.6;
    const expected = 4 * run * Math.sqrt(2 + Math.tan(Math.PI / 6) ** 2);
    expect(calculateHipLength(10, 8, 30, 0.6)).toBeCloseTo(expected, 2); // ~28.11 m
  });
  it("uses min(L,W) when W > L (ridge along width)", () => {
    const run = 5 / 2; // min(5,10)/2 for 5x10
    const expected = 4 * run * Math.sqrt(2 + Math.tan(Math.PI / 6) ** 2);
    expect(calculateHipLength(5, 10, 30)).toBeCloseTo(expected, 2);
  });
  it("hip length >= common rafter length at every pitch", () => {
    for (const p of [5, 15, 22.5, 30, 35, 45]) {
      const hip = calculateHipLength(10, 8, p);
      const common = 4 / Math.cos((p * Math.PI) / 180);
      expect(hip).toBeGreaterThan(common);
    }
  });
});

describe("calculateFasciaLength", () => {
  it("calculates perimeter with overhang", () => {
    expect(calculateFasciaLength(10, 8, 0.6)).toBe(
      2 * (10 + 1.2) + 2 * (8 + 1.2),
    );
  });
  it("works with zero overhang", () => {
    expect(calculateFasciaLength(10, 8, 0)).toBe(36);
  });
});

describe("estimateTimberMeters", () => {
  it("derives flat-roof timber from joists instead of a rate per m²", () => {
    // A flat roof is framed too: joists at rafter centres spanning the eave
    // width, one at each end. 10 m + 2 x 0.6 m eave / 0.9 m centres = 13 bays,
    // 14 joists, each (8 + 1.2) = 9.2 m long. The old answer was area x 2 m,
    // which ignored span, spacing and the overhang.
    const result = estimateTimberMeters(100, 10, 8, 0, 0.6, "flat");
    expect(result).toBeCloseTo(14 * 9.2, 2);
  });
  it("calculates rafters + purlins for gable on the eave rectangle", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "gable");
    // Framing is measured on the roof extent (L + 2OH), not the wall line:
    const eaveL = 11.2,
      eaveW = 9.2;
    const slopeLen = eaveW / 2 / Math.cos((30 * Math.PI) / 180);
    const rafterCount = Math.ceil(eaveL / 0.9) + 1; // 14
    const rafterTotal = rafterCount * 2 * slopeLen;
    // Purlins sit on a 1.0 m gauge up the slope: ceil(5.31 / 1.0) = 6 rows a
    // slope, so 6 x 2 x 11.2. A fixed 4 rows put them 2.05 m apart.
    const purlinRows = Math.ceil(slopeLen / 1.0);
    const purlinTotal = purlinRows * 2 * eaveL;
    expect(result).toBeCloseTo(rafterTotal + purlinTotal, 1);
  });
  it("mono-pitch: ONE plane, full-width rafters, single-slope purlins", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "mono_pitch");
    const eaveL = 11.2,
      eaveW = 9.2;
    const slopeLen = eaveW / Math.cos((30 * Math.PI) / 180);
    const rafterCount = Math.ceil(eaveL / 0.9) + 1;
    const purlinRows = Math.ceil(slopeLen / 1.0);
    const expected = rafterCount * slopeLen + purlinRows * eaveL; // NOT 2 planes
    expect(result).toBeCloseTo(expected, 1);
  });
  it("mono-pitch purlins are not double-counted", () => {
    const mono = estimateTimberMeters(100, 10, 8, 30, 0.6, "mono_pitch");
    const gable = estimateTimberMeters(100, 10, 8, 30, 0.6, "gable");
    // mono has 1 plane vs gable 2 planes, its total must be smaller
    expect(mono).toBeLessThan(gable);
  });
  it("hip: framing covers all 4 planes (commons + jacks + purlins)", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "hip");
    const eaveL = 11.2,
      eaveW = 9.2;
    const slopeLen = eaveW / 2 / Math.cos((30 * Math.PI) / 180);
    const commons = (Math.ceil((eaveL - eaveW) / 0.9) + 1) * 2 * slopeLen;
    const jacks = (Math.ceil(eaveW / 0.9) + 1) * 2 * (slopeLen / 2);
    // Purlin rows follow the slope: 5.31 m of slope needs 6 rows at 1.0 m
    // centres, not the nominal four that put rows 1.33 m apart.
    const rows = Math.max(2, Math.ceil(slopeLen / 1.0));
    expect(rows).toBe(6);
    const purlins = rows * 2 * eaveL + rows * 2 * (eaveW / 2);
    expect(result).toBeCloseTo(commons + jacks + purlins, 0);
  });
});

// ─────────────────────────────────────────────────────────
// Audit regression tests (independently verified baselines)
// ─────────────────────────────────────────────────────────

function makeValidInput(
  overrides: Partial<BuildToRoofInput> = {},
): BuildToRoofInput {
  return {
    project_name: "Audit House",
    location: "Lagos",
    building_type: "bungalow",
    number_of_floors: 1,
    measurement_unit: "m",
    building_length: 10,
    building_width: 8,
    floor_to_floor_height: 3,
    wall_thickness: 0.225,
    internal_wall_length: 12,
    internal_wall_thickness: 0.15,
    openings: [
      { type: "door", width: 0.9, height: 2.1, count: 6 },
      { type: "window", width: 1.2, height: 1.2, count: 8 },
    ],
    foundation_type: "strip_footing",
    foundation_depth: 0.9,
    foundation_width: 0.6,
    footing_thickness: 0.225,
    blinding_thickness: 0.05,
    hardcore_thickness: 0.15,
    dpc_length: 100,
    block_size: "9inch",
    block_length: 18,
    block_height: 9,
    block_width: 9,
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_granite: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    roof_type: "gable",
    roof_pitch_degrees: 30,
    roof_overhang: 0.6,
    roofing_material: "long_span_aluminium",
    structural_members: [],
    has_engineer_schedule: false,
    wastage: DEFAULT_WASTAGE,
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    contingency_percent: 5,
    ...overrides,
  } as BuildToRoofInput;
}

describe("internal load-bearing wall footings (10a)", () => {
  // Fixture: 10 x 8 m, perimeter 36 m, internal run 12 m, internal wall 0.15 m,
  // footing width 0.6 m, depth 0.9 m, footing 0.225 m, blinding 0.05 m.
  // internalFootingWidth = min(0.6, max(0.45, 0.15 + 0.3)) = 0.45 m
  // excavation = 12 x 0.45 x 0.9        = 4.86 m3
  // blinding   = 12 x 0.65 x 0.05       = 0.39 m3
  // concrete   = 12 x 0.45 x 0.225      = 1.215 m3
  // backfill   = 4.86 - 1.215 - 0.39    = 3.255 m3
  // Foundation work sits in the "site_preparation" stage of the result.
  const foundationStage = (r: ReturnType<typeof calculateBuildToRoof>) =>
    r.stages.find((st) => st.stage === "site_preparation") ?? r.stages[0];
  const qty = (r: ReturnType<typeof calculateBuildToRoof>, label: string) =>
    foundationStage(r).quantities.find((q) => q.label === label);
  const lab = (r: ReturnType<typeof calculateBuildToRoof>, label: string) =>
    foundationStage(r).labour.find((l) => l.label === label);

  it("prices the internal blinding as its own quantity line", () => {
    const r = calculateBuildToRoof(makeValidInput());
    const blinding = qty(r, "Internal wall footing blinding");
    expect(blinding).toBeDefined();
    expect(blinding?.base_quantity).toBeCloseTo(0.39, 3);
  });

  it("charges each internal operation at its own labour rate", () => {
    const r = calculateBuildToRoof(makeValidInput());
    const excavation = lab(r, "Internal footing excavation labour");
    const blinding = lab(r, "Internal footing blinding labour");
    const concrete = lab(r, "Internal footing concrete labour");
    expect(excavation?.quantity).toBeCloseTo(4.86, 3);
    expect(excavation?.rate).toBe(DEFAULT_LABOUR.excavation_per_m3);
    expect(blinding?.quantity).toBeCloseTo(0.39, 3);
    expect(blinding?.rate).toBe(DEFAULT_LABOUR.blinding_per_m3);
    // Published to 2 dp by the engine: 1.215 rounds to 1.22.
    expect(concrete?.quantity).toBeCloseTo(1.22, 2);
    expect(concrete?.rate).toBe(DEFAULT_LABOUR.concrete_per_m3);
    // The old single line charged concrete volume at the excavation rate.
    expect(concrete?.rate).not.toBe(DEFAULT_LABOUR.excavation_per_m3);
  });

  it("orders the backfill that refills the internal trench", () => {
    const r = calculateBuildToRoof(makeValidInput());
    const backfill = qty(r, "Internal wall backfilling volume");
    // Published to 2 dp: 3.255 rounds to 3.26.
    expect(backfill?.base_quantity).toBeCloseTo(3.26, 2);
    const backfillLabour = lab(r, "Internal footing backfilling labour");
    expect(backfillLabour?.quantity).toBeCloseTo(3.26, 2);
    expect(backfillLabour?.rate).toBe(DEFAULT_LABOUR.backfilling_per_m3);
  });

  it("drops all internal foundation scope when the switch is off", () => {
    const r = calculateBuildToRoof(
      makeValidInput({ include_internal_footings: false }),
    );
    expect(qty(r, "Internal wall footing blinding")).toBeUndefined();
    expect(qty(r, "Internal wall backfilling volume")).toBeUndefined();
    expect(lab(r, "Internal footing concrete labour")).toBeUndefined();
  });
});

describe("validateBuildToRoofInput", () => {
  it("accepts a valid input", () => {
    expect(validateBuildToRoofInput(makeValidInput())).toEqual([]);
  });

  it("rejects zero/negative dimensions", () => {
    expect(
      validateBuildToRoofInput(makeValidInput({ building_length: 0 })),
    ).not.toEqual([]);
    expect(
      validateBuildToRoofInput(makeValidInput({ building_width: -8 })),
    ).not.toEqual([]);
  });

  it("rejects impossible pitch (>60deg) and NaN", () => {
    expect(
      validateBuildToRoofInput(makeValidInput({ roof_pitch_degrees: 100 }))
        .length,
    ).toBeGreaterThan(0);
    const nan = makeValidInput();
    (nan as unknown as Record<string, number>).building_length = NaN;
    expect(validateBuildToRoofInput(nan).length).toBeGreaterThan(0);
  });

  it("ignores pitch when roof is flat", () => {
    expect(
      validateBuildToRoofInput(
        makeValidInput({ roof_type: "flat", roof_pitch_degrees: 100 }),
      ),
    ).toEqual([]);
  });

  it("rejects negative overhang and out-of-range floors", () => {
    expect(
      validateBuildToRoofInput(makeValidInput({ roof_overhang: -0.5 })).length,
    ).toBeGreaterThan(0);
    expect(
      validateBuildToRoofInput(makeValidInput({ number_of_floors: 0 })).length,
    ).toBeGreaterThan(0);
  });

  it("validates ft-mode input on its metric equivalent", () => {
    const ft = convertBuildToRoofUnits(makeValidInput(), 1 / 0.3048);
    ft.measurement_unit = "ft";
    expect(validateBuildToRoofInput(ft)).toEqual([]);
    const badFt = convertBuildToRoofUnits(
      makeValidInput({ building_length: 0.5 }),
      1 / 0.3048,
    );
    badFt.measurement_unit = "ft";
    expect(validateBuildToRoofInput(badFt).length).toBeGreaterThan(0);
  });
});

describe("convertBuildToRoofUnits", () => {
  it("round-trips m -> ft -> m for every unit-mappable field", () => {
    const input = makeValidInput({
      roof_overhang: 0.6,
      foundation_depth: 0.9,
      foundation_width: 0.6,
      footing_thickness: 0.225,
    });
    const roundTrip = convertBuildToRoofUnits(
      convertBuildToRoofUnits(input, 1 / 0.3048),
      0.3048,
    );
    for (const key of [
      "building_length",
      "building_width",
      "floor_to_floor_height",
      "wall_thickness",
      "internal_wall_length",
      "internal_wall_thickness",
      "foundation_depth",
      "foundation_width",
      "footing_thickness",
      "blinding_thickness",
      "hardcore_thickness",
      "dpc_length",
      "roof_overhang",
    ] as const) {
      expect(roundTrip[key]).toBeCloseTo(input[key], 6);
    }
    expect(roundTrip.openings[0].width).toBeCloseTo(input.openings[0].width, 6);
  });

  it("converts openings and structural members", () => {
    const input = makeValidInput({
      structural_members: [
        {
          id: "c1",
          type: "column",
          label: "Column",
          length: 3,
          width: 0.225,
          depth: 0.225,
          quantity: 6,
        },
      ],
    });
    const ft = convertBuildToRoofUnits(input, 1 / 0.3048);
    expect(ft.openings[0].width).toBeCloseTo(0.9 / 0.3048, 6);
    expect(ft.structural_members[0].length).toBeCloseTo(3 / 0.3048, 6);
  });
});

describe("calculateBuildToRoof (audit regression)", () => {
  it("throws on invalid input instead of estimating", () => {
    expect(() =>
      calculateBuildToRoof(makeValidInput({ building_length: 0 })),
    ).toThrow(/invalid/i);
    expect(() =>
      calculateBuildToRoof(makeValidInput({ roof_pitch_degrees: 100 })),
    ).toThrow(/Roof pitch/i);
  });

  it("counts the under-slab sand filling ONCE (no Stage A + Stage B double count)", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const sandFillLines = result.stages
      .flatMap((s) => s.materials)
      .filter((m) => /sand \(.*filling\)/i.test(m.label));
    expect(sandFillLines).toHaveLength(1);
    // Footprint 80 m² x 50 mm = 4 m³ (+10% sand wastage → 4.4 m³)
    expect(sandFillLines[0].volume_m3).toBeCloseTo(4.4, 2);
    expect(sandFillLines[0].unit).toBe("m³");
  });

  it("gives every sand load the same ordering advice as the takeoffs", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const sandLines = result.stages
      .flatMap((s) => s.materials)
      .filter((m) => /sand/i.test(m.label) && (m.volume_m3 ?? 0) > 0);
    expect(sandLines.length).toBeGreaterThan(0);
    for (const line of sandLines) {
      // One sentence site-wide: the blockwork takeoff, the plastering takeoff
      // and this estimator all speak through sandPurchaseLabel.
      expect(line.order_label).toBe(sandPurchaseLabel(line.volume_m3!, "NG"));
      expect(line.final_quantity).toBe(line.volume_m3);
    }
  });

  it("gives sand its weight at 1,600 kg/m³ and leaves granite unweighed", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const lines = result.stages.flatMap((s) => s.materials);
    const sand = lines.filter(
      (m) => /sand/i.test(m.label) && (m.volume_m3 ?? 0) > 0,
    );
    expect(sand.length).toBeGreaterThan(0);
    for (const line of sand) {
      expect(line.weight_tonnes).toBeCloseTo(line.volume_m3! * 1.6, 1);
    }
    const granite = lines.filter((m) => /granite/i.test(m.label));
    expect(granite.length).toBeGreaterThan(0);
    for (const line of granite) expect(line.weight_tonnes).toBeUndefined();
  });

  it("backfill excludes the full-footprint blinding (trench holds only the footing)", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const backfill = result.stages
      .flatMap((s) => s.quantities)
      .find((q) => q.label === "Backfilling volume");
    // Excavation 2(10+8)×0.6×0.9 = 19.44; footing concrete 36×0.6×0.225 = 4.86;
    // blinding 36 × (0.6 + 2 × 0.1) × 0.05 = 1.44. Both sit inside the trench.
    expect(backfill?.base_quantity).toBeCloseTo(19.44 - 4.86 - 1.44, 2);
  });

  it("reports total floor area in m² even when the input is in feet", () => {
    const m = calculateBuildToRoof(makeValidInput());
    const ft = convertBuildToRoofUnits(makeValidInput(), 1 / 0.3048);
    ft.measurement_unit = "ft";
    const ftResult = calculateBuildToRoof(ft);
    expect(ftResult.total_floor_area).toBeCloseTo(m.total_floor_area, 1);
    expect(ftResult.total_floor_area).toBeCloseTo(80, 1);
  });

  it("purchases whole blocks, sheets and screws (no fractional pieces)", () => {
    const result = calculateBuildToRoof(makeValidInput());
    for (const line of result.shopping_list) {
      if (line.unit === "pcs")
        expect(Number.isInteger(line.total_quantity)).toBe(true);
    }
    // Long span is counted by cover width, not by a 1.5 m² panel:
    // ceil(11.2 / 0.9) = 13 sheets a slope, 26 both slopes, x1.05 -> 28.
    const sheets = result.stages
      .flatMap((s) => s.materials)
      .find((m) => m.label === "Roofing sheets");
    expect(sheets?.final_quantity).toBe(28);
    // A long-span length is one piece at the price the user typed for a piece.
    // Converting the piece price through a 1.5 m² panel reference multiplied it
    // by the length's area ratio (0.9 m cover x 5.31 m slope / 1.5 = 3.19) and
    // overcharged the largest line on the roof.
    expect(sheets?.total_cost).toBeCloseTo(
      28 * DEFAULT_PRICES.roofing_sheet_per_piece,
      0,
    );
    expect(sheets?.unit_price).toBe(
      Math.round(DEFAULT_PRICES.roofing_sheet_per_piece),
    );
  });

  it("manual (m) and identical building in ft produce identical physical quantities", () => {
    const m = calculateBuildToRoof(makeValidInput());
    const ft = convertBuildToRoofUnits(makeValidInput(), 1 / 0.3048);
    ft.measurement_unit = "ft";
    const ftResult = calculateBuildToRoof(ft);
    expect(ftResult.total_floor_area).toBeCloseTo(m.total_floor_area, 1);
    const sheetsM = m.stages
      .flatMap((s) => s.materials)
      .find((x) => x.label === "Roofing sheets");
    const sheetsFt = ftResult.stages
      .flatMap((s) => s.materials)
      .find((x) => x.label === "Roofing sheets");
    expect(sheetsFt?.final_quantity).toBe(sheetsM?.final_quantity);
  });

  it("rebar base quantity excludes wastage (wastage added by purchase rounding only)", () => {
    const input = makeValidInput({
      has_engineer_schedule: true,
      structural_members: [
        {
          id: "c1",
          type: "column",
          label: "Column",
          length: 3,
          width: 0.225,
          depth: 0.225,
          quantity: 6,
          bar_diameter_mm: 16,
          bar_count_main: 4,
          cover_mm: 25,
        },
      ],
    });
    const result = calculateBuildToRoof(input);
    const item = result.reinforcement_breakdown?.items[0];
    expect(item?.base_length_m).toBeCloseTo(4 * 3 * 6, 2); // 72 m net
    expect(item?.total_length_m).toBeCloseTo(72 * 1.03, 2); // +3% wastage
    expect(item?.standard_lengths).toBe(Math.ceil((72 * 1.03) / 12)); // 7 lengths
  });
});

// ─────────────────────────────────────────────────────────
// Explicit roof-plane model, geometric invariants
// ─────────────────────────────────────────────────────────

describe("decomposeRoofPlanes, explicit geometry", () => {
  const TYPES = ["gable", "hip", "mono_pitch"] as const;

  it("decomposes every supported type into unique, complete planes", () => {
    expect(decomposeRoofPlanes(10, 8, 30, 0.6, "gable")).toHaveLength(2);
    expect(decomposeRoofPlanes(10, 8, 30, 0.6, "hip")).toHaveLength(4);
    expect(decomposeRoofPlanes(10, 8, 30, 0.6, "mono_pitch")).toHaveLength(1);
    expect(decomposeRoofPlanes(10, 8, 30, 0.6, "flat")).toHaveLength(1);
    // uniqueness, no plane counted twice
    for (const t of [...TYPES, "flat"]) {
      const ids = decomposeRoofPlanes(10, 8, 30, 0.6, t).map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("CONSERVATION: projections sum exactly to the eave rectangle Le × We", () => {
    for (const t of [...TYPES, "flat"] as string[]) {
      const planes = decomposeRoofPlanes(10, 8, 30, 0.6, t);
      const projSum = planes.reduce((s, p) => s + p.projected_area_m2, 0);
      expect(projSum).toBeCloseTo(11.2 * 9.2, 1);
    }
  });

  it("CONSERVATION: calculateRoofArea == sum of plane areas (exact)", () => {
    for (const t of [...TYPES, "flat"] as string[]) {
      const planes = decomposeRoofPlanes(10, 8, 30, 0.6, t);
      const sum =
        Math.round(planes.reduce((s, p) => s + p.sloped_area_m2, 0) * 100) /
        100;
      expect(calculateRoofArea(10, 8, 30, 0.6, t)).toBe(sum);
    }
  });

  it("ZERO PITCH: sloped area → horizontal projected area (limiting case)", () => {
    for (const t of [...TYPES] as string[]) {
      const planes = decomposeRoofPlanes(10, 8, 0, 0.6, t);
      const total = planes.reduce((s, p) => s + p.sloped_area_m2, 0);
      expect(total).toBeCloseTo(11.2 * 9.2, 1);
    }
  });

  it("INCREASING PITCH increases sloped area at fixed projection", () => {
    for (const t of [...TYPES] as string[]) {
      const a15 = calculateRoofArea(10, 8, 15, 0.6, t);
      const a30 = calculateRoofArea(10, 8, 30, 0.6, t);
      const a45 = calculateRoofArea(10, 8, 45, 0.6, t);
      expect(a15).toBeLessThan(a30);
      expect(a30).toBeLessThan(a45);
    }
  });

  it("ZERO OVERHANG reduces the roof to the building footprint geometry", () => {
    // gable: two planes L × W/2, ridge = L
    const gable = decomposeRoofPlanes(10, 8, 30, 0, "gable");
    expect(gable[0].projected_area_m2).toBeCloseTo(10 * 4, 1);
    expect(calculateRidgeLength(10, 8, "gable", 0)).toBe(10);
    // mono: one plane L × W
    const mono = decomposeRoofPlanes(10, 8, 30, 0, "mono_pitch");
    expect(mono[0].projected_area_m2).toBeCloseTo(80, 1);
    // hip: ridge = L − W, projections sum to L × W
    const hip = decomposeRoofPlanes(10, 8, 30, 0, "hip");
    expect(hip.reduce((s, p) => s + p.projected_area_m2, 0)).toBeCloseTo(80, 1);
    expect(calculateRidgeLength(10, 8, "hip", 0)).toBe(2);
    // flat: exact footprint
    expect(calculateRoofArea(10, 8, 30, 0, "flat")).toBeCloseTo(80, 6);
  });

  it("SYMMETRY: gable planes are equal; hip planes pair up; square hip is a pyramid", () => {
    const gable = decomposeRoofPlanes(10, 8, 30, 0.6, "gable");
    expect(gable[0].sloped_area_m2).toBeCloseTo(gable[1].sloped_area_m2, 6);

    const hip = decomposeRoofPlanes(10, 8, 30, 0.6, "hip");
    expect(hip[0].sloped_area_m2).toBeCloseTo(hip[1].sloped_area_m2, 6); // trapezoids
    expect(hip[2].sloped_area_m2).toBeCloseTo(hip[3].sloped_area_m2, 6); // triangles

    // Square hip = pyramid: all four planes identical triangles
    const pyramid = decomposeRoofPlanes(8, 8, 30, 0, "hip");
    expect(new Set(pyramid.map((p) => p.sloped_area_m2)).size).toBe(1);
    expect(calculateRidgeLength(8, 8, "hip", 0)).toBe(0);
  });

  it("HIP geometry matches the explicit trapezoid + triangle model", () => {
    const planes = decomposeRoofPlanes(10, 8, 30, 0.6, "hip");
    const Le = 11.2,
      We = 9.2,
      R = Le - We;
    const cosT = Math.cos((30 * Math.PI) / 180);
    const trap = ((Le + R) / 2) * (We / 2); // each trapezoid projection
    const tri = (We * We) / 4; // each triangle projection
    expect(planes[0].projected_area_m2).toBeCloseTo(trap, 1);
    expect(planes[2].projected_area_m2).toBeCloseTo(tri, 1);
    // sloped per-plane = projection / cos(pitch)
    expect(planes[0].sloped_area_m2).toBeCloseTo(trap / cosT, 1);
    expect(planes[2].sloped_area_m2).toBeCloseTo(tri / cosT, 1);
    // total = Le·We/cos(pitch), exact for uniform pitch (proved, not assumed)
    const total = planes.reduce((s, p) => s + p.sloped_area_m2, 0);
    expect(total).toBeCloseTo((Le * We) / cosT, 1);
  });

  it("UNIT EQUIVALENCE: identical building in m and ft gives equal geometry", () => {
    const M_PER_FT = 0.3048;
    for (const t of [...TYPES] as string[]) {
      const inM = decomposeRoofPlanes(10, 8, 30, 0.6, t);
      const inFt = decomposeRoofPlanes(
        10 / M_PER_FT,
        8 / M_PER_FT,
        30,
        0.6 / M_PER_FT,
        t,
      );
      const ftM2 =
        inFt.reduce((s, p) => s + p.sloped_area_m2, 0) * M_PER_FT * M_PER_FT;
      const m2 = inM.reduce((s, p) => s + p.sloped_area_m2, 0);
      expect(ftM2).toBeCloseTo(m2, 1); // 0.1 m² tolerance
    }
  });

  it("PITCH is degrees only, conversion θ_rad = θ_deg × π/180 (never mixed)", () => {
    // 30° must equal the radian-converted value, not 30 rad
    const deg = calculateRoofArea(10, 8, 30, 0.6, "gable");
    const viaRad = (11.2 * 9.2) / Math.cos((30 * Math.PI) / 180);
    expect(deg).toBeCloseTo(viaRad, 2);
    // 30 radians would produce a wildly different (negative) result :
    // degrees-only input must never reach trig unconverted:
    expect(Math.cos(30)).toBeLessThan(1); // 30 rad ≠ 30°
  });
  it("calculates only selected assemblies when included_stages is specified", () => {
    const base = makeValidInput();
    const fullResult = calculateBuildToRoof(base);
    expect(fullResult.stages.length).toBe(5);

    // Roof-only calculation
    const roofOnlyInput = {
      ...base,
      included_stages: { foundation: false, walls: false, roof: true },
    };
    const roofResult = calculateBuildToRoof(roofOnlyInput);
    expect(roofResult.stages.length).toBe(1);
    expect(roofResult.stages[0].stage).toBe("roofing");
    expect(roofResult.materials_total).toBeLessThan(fullResult.grand_total);

    // Foundation-only calculation
    const foundationOnlyInput = {
      ...base,
      included_stages: { foundation: true, walls: false, roof: false },
    };
    const foundationResult = calculateBuildToRoof(foundationOnlyInput);
    expect(foundationResult.stages.length).toBe(2);
    expect(foundationResult.stages.map((s) => s.stage)).toEqual([
      "site_preparation",
      "ground_floor",
    ]);
  });
});

describe("formwork, membrane and concrete allowances", () => {
  function stageOf(result: ReturnType<typeof calculateBuildToRoof>, id: string) {
    const stage = result.stages.find((entry) => entry.stage === id);
    if (!stage) throw new Error(`stage ${id} missing`);
    return stage;
  }

  it("measures a beam's two sides and soffit, not its open top", () => {
    const result = calculateBuildToRoof(
      makeValidInput({
        structural_members: [
          {
            id: "b1",
            type: "suspended_beam",
            label: "Beam",
            length: 4,
            width: 0.23,
            depth: 0.45,
            quantity: 1,
          },
        ],
      }),
    );
    const frame = stageOf(result, "structural_frame");
    // 4 m of 230 x 450: soffit 0.23 + two sides 0.9 = 1.13 m2/m, 4.52 m2 total.
    // Counting the perimeter instead gives 2 x (0.23 + 0.45) = 1.36 m2/m, 5.44.
    const formwork = frame.materials.find((m) => m.label === "Formwork");
    expect(formwork?.base_quantity).toBeCloseTo(4.52, 6);
    const line = frame.quantities.find((q) => q.label === "Beam, formwork");
    expect(line?.base_quantity).toBeCloseTo(4.52, 6);
    expect(line?.final_quantity).toBeCloseTo(4.52, 6);
  });

  it("still measures four sides on a column and the soffit alone on a slab", () => {
    const result = calculateBuildToRoof(
      makeValidInput({
        structural_members: [
          {
            id: "c1",
            type: "column",
            label: "Column",
            length: 3,
            width: 0.225,
            depth: 0.225,
            quantity: 2,
          },
          {
            id: "s1",
            type: "slab",
            label: "Suspended slab",
            length: 5,
            width: 4,
            depth: 0.15,
            quantity: 1,
          },
        ],
      }),
    );
    const frame = stageOf(result, "structural_frame");
    // Column: 3 x 2 x (0.225 + 0.225) x 2 = 5.4 m2. Slab soffit: 20 m2.
    const formwork = frame.materials.find((m) => m.label === "Formwork");
    expect(formwork?.base_quantity).toBeCloseTo(25.4, 6);
  });

  it("applies the concrete allowance to structural concrete volume", () => {
    const result = calculateBuildToRoof(
      makeValidInput({
        wastage: { ...DEFAULT_WASTAGE, cement: 5, concrete: 9 },
        structural_members: [
          {
            id: "b1",
            type: "suspended_beam",
            label: "Beam",
            length: 4,
            width: 0.23,
            depth: 0.45,
            quantity: 1,
          },
        ],
      }),
    );
    const frame = stageOf(result, "structural_frame");
    const line = frame.quantities.find((q) => q.label === "Beam, concrete");
    // 0.414 m3 at the concrete allowance, not the cement allowance. Stage
    // quantity lines publish two decimals.
    expect(line?.base_quantity).toBeCloseTo(0.41, 2);
    expect(line?.final_quantity).toBeCloseTo(0.45, 2);
  });

  it("validates the concrete allowance like every other wastage field", () => {
    expect(() =>
      calculateBuildToRoof(
        makeValidInput({ wastage: { ...DEFAULT_WASTAGE, concrete: -1 } }),
      ),
    ).toThrow(/concrete/i);
  });

  it("prices the damp-proof membrane whenever there is a slab", () => {
    const result = calculateBuildToRoof(makeValidInput({ dpc_length: 0 }));
    const ground = stageOf(result, "ground_floor");
    const membrane = ground.materials.find((m) => m.label === "DPM membrane");
    expect(membrane).toBeDefined();
    // 10 x 8 footprint with the 5 per cent lap allowance.
    expect(membrane?.base_quantity).toBeCloseTo(80, 6);
    expect(membrane?.final_quantity).toBeCloseTo(84, 6);
  });
});

// ─────────────────────────────────────────────
// Roofing lines: pieces, fixings and printed money
// ─────────────────────────────────────────────

describe("roofing lines reproduce themselves", () => {
  const roofStage = (material: string, roofType = "gable") => {
    const result = calculateBuildToRoof(
      makeValidInput({ roofing_material: material, roof_type: roofType } as never),
    );
    return result.stages.find((s) => /roof/i.test(s.stage))!;
  };

  it("prices every material line at the quantity it prints", () => {
    for (const material of ["gi_sheet", "long_span_aluminium", "stone_coated"]) {
      for (const line of roofStage(material).materials) {
        expect(line.total_cost, `${material} ${line.label}`).toBeCloseTo(
          line.final_quantity * line.unit_price,
          2,
        );
      }
    }
  });

  it("gives a long-span length the fixings its area needs", () => {
    const screws = roofStage("long_span_aluminium").materials.find(
      (m) => m.label === "Roofing screws",
    )!;
    const sheets = roofStage("long_span_aluminium").materials.find(
      (m) => m.label === "Roofing sheets",
    )!;
    // Ten fixings per 1.52 m² panel is a density, 6.58/m². A 0.9 m cover x
    // 5.31 m slope length covers 4.78 m², so it needs about 31 fixings, not 10.
    const perSheet = screws.final_quantity / sheets.final_quantity;
    expect(perSheet).toBeGreaterThan(10);
  });

  it("keeps the ten-fixings-per-panel rule for panels", () => {
    const screws = roofStage("gi_sheet").materials.find(
      (m) => m.label === "Roofing screws",
    )!;
    const sheets = roofStage("gi_sheet").materials.find(
      (m) => m.label === "Roofing sheets",
    )!;
    // Ten fixings per panel, before the fixings' own 5% allowance.
    expect(screws.base_quantity).toBe(Math.ceil(sheets.final_quantity * 10));
  });

  it("orders the trim wastage the quantity line reports", () => {
    const stage = roofStage("gi_sheet", "hip");
    for (const label of ["Ridge caps", "Hip accessories"]) {
      const trim = stage.materials.find((m) => m.label === label)!;
      const qty = stage.quantities.find((q) => q.label.startsWith(label.split(" ")[0]))!;
      expect(trim.wastage_percent, label).toBe(qty.wastage_percent);
      expect(trim.final_quantity, label).toBeCloseTo(
        qty.base_quantity * (1 + TRIM_WASTAGE_PERCENT / 100),
        1,
      );
    }
  });

  it("never returns a negative or blank sheet count", () => {
    expect(roofingSheetsCount(-50, 1.52)).toBe(0);
    expect(roofingSheetsCount(Number.NaN, 1.52)).toBe(0);
    expect(roofingSheetsCount(93.11, 0)).toBe(0);
    expect(roofingSheetsCount(93.11, 1.52)).toBe(62);
  });
});
