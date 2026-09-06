import { describe, it, expect } from "vitest";
import {
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
  roofingSheetsCount,
  getSheetCoverage,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
  estimateTimberMeters,
  validateBuildToRoofInput,
  convertBuildToRoofUnits,
  calculateBuildToRoof,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from "@/lib/estimation/build-to-roof-engine";
import type { BuildToRoofInput } from "@/types/build-to-roof";

describe("constants", () => {
  it("CEMENT_VOLUME_PER_BAG = 0.0347", () =>
    expect(CEMENT_VOLUME_PER_BAG).toBe(0.0347));
  it("DRY_WET_RATIO = 1.54", () => expect(DRY_WET_RATIO).toBe(1.54));
  it("MORTAR_DRY_WET_RATIO = 1.33", () =>
    expect(MORTAR_DRY_WET_RATIO).toBe(1.33));
  it("SCREWS_PER_SHEET = 10", () => expect(SCREWS_PER_SHEET).toBe(10));
  it("PURLIN_ROWS_PER_SLOPE = 4", () => expect(PURLIN_ROWS_PER_SLOPE).toBe(4));
  it("RAFTER_SPACING = 0.9", () => expect(RAFTER_SPACING).toBe(0.9));
  it("M_PER_FT = 0.3048", () => expect(M_PER_FT).toBe(0.3048));
  it("M3_PER_TRIP = 3.5", () => expect(M3_PER_TRIP).toBe(3.5));
  it("SHEET_COVERAGE has all materials", () => {
    expect(SHEET_COVERAGE.long_span_aluminium).toBe(1.5);
    expect(SHEET_COVERAGE.stone_coated).toBe(0.53);
    expect(SHEET_COVERAGE.gi_sheet).toBe(1.52);
    expect(SHEET_COVERAGE.shingle).toBe(0.93);
    expect(SHEET_COVERAGE.custom).toBe(1.5);
  });
});

describe("m3ToTrips", () => {
  it("converts m³ to trips", () => expect(m3ToTrips(7)).toBeCloseTo(2, 5));
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
    expect(r.cement_bags).toBeCloseTo((dryVol * (1 / 7)) / 0.0347, 4);
    expect(r.sand_m3).toBeCloseTo(dryVol * (2 / 7), 4);
    expect(r.granite_m3).toBeCloseTo(dryVol * (4 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = concreteToMaterials(5, 1, 3, 6);
    const dryVol = 5 * 1.54;
    const cementVol = r.cement_bags * 0.0347;
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
    expect(r.cement_bags).toBeCloseTo((dryVol * (1 / 7)) / 0.0347, 4);
    expect(r.sand_m3).toBeCloseTo(dryVol * (6 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = mortarToMaterials(3, 1, 4);
    const dryVol = 3 * 1.33;
    const cementVol = r.cement_bags * 0.0347;
    expect(cementVol + r.sand_m3).toBeCloseTo(dryVol, 3);
  });
});

describe("blocksPerM2", () => {
  it("calculates for standard 18×9 inch block", () => {
    const result = blocksPerM2(18, 9);
    const blockArea = 18 * 0.0254 * (9 * 0.0254);
    expect(result).toBeCloseTo(1 / blockArea, 4);
  });
  it("returns 0 for zero dimensions", () => {
    expect(blocksPerM2(0, 9)).toBe(0);
    expect(blocksPerM2(18, 0)).toBe(0);
  });
});

describe("calculateRoofArea", () => {
  it("returns footprint for flat roof", () => {
    expect(calculateRoofArea(10, 8, 0, 0.6, "flat")).toBe(
      (10 + 1.2) * (8 + 1.2),
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
  // formula misapplied to hips — it understates by 18-34%.
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
  it("returns minimal timber for flat roof", () => {
    const result = estimateTimberMeters(100, 10, 8, 0, 0.6, "flat");
    expect(result).toBe(200);
  });
  it("calculates rafters + purlins for gable on the eave rectangle", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "gable");
    // Framing is measured on the roof extent (L + 2OH), not the wall line:
    const eaveL = 11.2, eaveW = 9.2;
    const slopeLen = (eaveW / 2) / Math.cos((30 * Math.PI) / 180);
    const rafterCount = Math.ceil(eaveL / 0.9) + 1; // 14
    const rafterTotal = rafterCount * 2 * slopeLen;
    const purlinTotal = 4 * 2 * eaveL;
    expect(result).toBeCloseTo(rafterTotal + purlinTotal, 1);
  });
  it("mono-pitch: ONE plane — full-width rafters, single-slope purlins", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "mono_pitch");
    const eaveL = 11.2, eaveW = 9.2;
    const slopeLen = eaveW / Math.cos((30 * Math.PI) / 180);
    const rafterCount = Math.ceil(eaveL / 0.9) + 1;
    const expected = rafterCount * slopeLen + 4 * eaveL; // NOT 2 planes
    expect(result).toBeCloseTo(expected, 1);
  });
  it("mono-pitch purlins are not double-counted", () => {
    const mono = estimateTimberMeters(100, 10, 8, 30, 0.6, "mono_pitch");
    const gable = estimateTimberMeters(100, 10, 8, 30, 0.6, "gable");
    // mono has 1 plane vs gable 2 planes — its total must be smaller
    expect(mono).toBeLessThan(gable);
  });
  it("hip: framing covers all 4 planes (commons + jacks + purlins)", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "hip");
    const eaveL = 11.2, eaveW = 9.2;
    const slopeLen = (eaveW / 2) / Math.cos((30 * Math.PI) / 180);
    const commons = (Math.ceil((eaveL - eaveW) / 0.9) + 1) * 2 * slopeLen;
    const jacks = (Math.ceil(eaveW / 0.9) + 1) * 2 * (slopeLen / 2);
    const purlins = 4 * 2 * eaveL + 4 * 2 * (eaveW / 2);
    expect(result).toBeCloseTo(commons + jacks + purlins, 0);
  });
});

// ─────────────────────────────────────────────────────────
// Audit regression tests (independently verified baselines)
// ─────────────────────────────────────────────────────────

function makeValidInput(overrides: Partial<BuildToRoofInput> = {}): BuildToRoofInput {
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

describe("validateBuildToRoofInput", () => {
  it("accepts a valid input", () => {
    expect(validateBuildToRoofInput(makeValidInput())).toEqual([]);
  });

  it("rejects zero/negative dimensions", () => {
    expect(validateBuildToRoofInput(makeValidInput({ building_length: 0 }))).not.toEqual([]);
    expect(validateBuildToRoofInput(makeValidInput({ building_width: -8 }))).not.toEqual([]);
  });

  it("rejects impossible pitch (>60deg) and NaN", () => {
    expect(validateBuildToRoofInput(makeValidInput({ roof_pitch_degrees: 100 })).length).toBeGreaterThan(0);
    const nan = makeValidInput();
    (nan as unknown as Record<string, number>).building_length = NaN;
    expect(validateBuildToRoofInput(nan).length).toBeGreaterThan(0);
  });

  it("ignores pitch when roof is flat", () => {
    expect(validateBuildToRoofInput(makeValidInput({ roof_type: "flat", roof_pitch_degrees: 100 }))).toEqual([]);
  });

  it("rejects negative overhang and out-of-range floors", () => {
    expect(validateBuildToRoofInput(makeValidInput({ roof_overhang: -0.5 })).length).toBeGreaterThan(0);
    expect(validateBuildToRoofInput(makeValidInput({ number_of_floors: 0 })).length).toBeGreaterThan(0);
  });

  it("validates ft-mode input on its metric equivalent", () => {
    const ft = convertBuildToRoofUnits(makeValidInput(), 1 / 0.3048);
    ft.measurement_unit = "ft";
    expect(validateBuildToRoofInput(ft)).toEqual([]);
    const badFt = convertBuildToRoofUnits(makeValidInput({ building_length: 0.5 }), 1 / 0.3048);
    badFt.measurement_unit = "ft";
    expect(validateBuildToRoofInput(badFt).length).toBeGreaterThan(0);
  });
});

describe("convertBuildToRoofUnits", () => {
  it("round-trips m -> ft -> m for every unit-mappable field", () => {
    const input = makeValidInput({ roof_overhang: 0.6, foundation_depth: 0.9, foundation_width: 0.6, footing_thickness: 0.225 });
    const roundTrip = convertBuildToRoofUnits(convertBuildToRoofUnits(input, 1 / 0.3048), 0.3048);
    for (const key of ["building_length", "building_width", "floor_to_floor_height", "wall_thickness", "internal_wall_length", "internal_wall_thickness", "foundation_depth", "foundation_width", "footing_thickness", "blinding_thickness", "hardcore_thickness", "dpc_length", "roof_overhang"] as const) {
      expect(roundTrip[key]).toBeCloseTo(input[key], 6);
    }
    expect(roundTrip.openings[0].width).toBeCloseTo(input.openings[0].width, 6);
  });

  it("converts openings and structural members", () => {
    const input = makeValidInput({
      structural_members: [{
        id: "c1", type: "column", label: "Column", length: 3, width: 0.225, depth: 0.225, quantity: 6,
      }],
    });
    const ft = convertBuildToRoofUnits(input, 1 / 0.3048);
    expect(ft.openings[0].width).toBeCloseTo(0.9 / 0.3048, 6);
    expect(ft.structural_members[0].length).toBeCloseTo(3 / 0.3048, 6);
  });
});

describe("calculateBuildToRoof (audit regression)", () => {
  it("throws on invalid input instead of estimating", () => {
    expect(() => calculateBuildToRoof(makeValidInput({ building_length: 0 }))).toThrow(/invalid/i);
    expect(() => calculateBuildToRoof(makeValidInput({ roof_pitch_degrees: 100 }))).toThrow(/Roof pitch/i);
  });

  it("counts the under-slab sand filling ONCE (no Stage A + Stage B double count)", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const sandFillLines = result.stages
      .flatMap((s) => s.materials)
      .filter((m) => /sand \(.*filling\)/i.test(m.label));
    expect(sandFillLines).toHaveLength(1);
    // Footprint 80 m² x 50 mm = 4 m³ (+10% sand wastage → 4.4 m³ → 2 trips)
    expect(sandFillLines[0].final_quantity).toBe(2);
  });

  it("backfill excludes the full-footprint blinding (trench holds only the footing)", () => {
    const result = calculateBuildToRoof(makeValidInput());
    const backfill = result.stages
      .flatMap((s) => s.quantities)
      .find((q) => q.label === "Backfilling volume");
    // Excavation 2(10+8)×0.6×0.9 = 19.44; footing concrete 36×0.6×0.225 = 4.86
    expect(backfill?.base_quantity).toBeCloseTo(19.44 - 4.86, 2); // 14.58
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
      if (line.unit === "pcs") expect(Number.isInteger(line.total_quantity)).toBe(true);
    }
    // Sheets: ceil(area × 1.05 / 1.5). Area = (10+1.2)(8+1.2)/cos30 = 118.98
    const sheets = result.stages.flatMap((s) => s.materials).find((m) => m.label === "Roofing sheets");
    expect(sheets?.final_quantity).toBe(Math.ceil(118.9803 * 1.05 / 1.5)); // 84
    // and the cost is based on the PURCHASE quantity
    expect(sheets?.total_cost).toBeCloseTo(84 * DEFAULT_PRICES.roofing_sheet_per_piece, 0);
  });

  it("manual (m) and identical building in ft produce identical physical quantities", () => {
    const m = calculateBuildToRoof(makeValidInput());
    const ft = convertBuildToRoofUnits(makeValidInput(), 1 / 0.3048);
    ft.measurement_unit = "ft";
    const ftResult = calculateBuildToRoof(ft);
    expect(ftResult.total_floor_area).toBeCloseTo(m.total_floor_area, 1);
    const sheetsM = m.stages.flatMap((s) => s.materials).find((x) => x.label === "Roofing sheets");
    const sheetsFt = ftResult.stages.flatMap((s) => s.materials).find((x) => x.label === "Roofing sheets");
    expect(sheetsFt?.final_quantity).toBe(sheetsM?.final_quantity);
  });

  it("rebar base quantity excludes wastage (wastage added by purchase rounding only)", () => {
    const input = makeValidInput({
      has_engineer_schedule: true,
      structural_members: [{
        id: "c1", type: "column", label: "Column", length: 3, width: 0.225, depth: 0.225,
        quantity: 6, bar_diameter_mm: 16, bar_count_main: 4, cover_mm: 25,
      }],
    });
    const result = calculateBuildToRoof(input);
    const item = result.reinforcement_breakdown?.items[0];
    expect(item?.base_length_m).toBeCloseTo(4 * 3 * 6, 2);            // 72 m net
    expect(item?.total_length_m).toBeCloseTo(72 * 1.03, 2);           // +3% wastage
    expect(item?.standard_lengths).toBe(Math.ceil(72 * 1.03 / 12));   // 7 lengths
  });
});
