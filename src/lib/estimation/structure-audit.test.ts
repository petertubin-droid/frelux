import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLAB_THICKNESS_M,
  DEFAULT_WASTAGE,
  PURLIN_SPACING_M,
  calculateBuildToRoof,
  summariseTimberFraming,
} from "./build-to-roof-engine";
import { DEFAULT_LABOUR, DEFAULT_PRICES } from "./build-to-roof-engine";
import type { BuildToRoofInput } from "@/types/build-to-roof";

function input(overrides: Partial<BuildToRoofInput> = {}): BuildToRoofInput {
  return {
    project_name: "Structure audit",
    location: "Lagos",
    building_type: "bungalow",
    measurement_unit: "m",
    building_length: 10,
    building_width: 8,
    number_of_floors: 1,
    floor_to_floor_height: 3,
    foundation_type: "strip",
    foundation_depth: 1,
    foundation_width: 0.6,
    footing_thickness: 0.225,
    blinding_thickness: 0.05,
    hardcore_thickness: 0.15,
    dpc_length: 40,
    block_size: "9inch",
    block_length: 18,
    block_height: 9,
    block_width: 9,
    wall_thickness: 0.225,
    internal_wall_length: 0,
    internal_wall_thickness: 0.225,
    openings: [
      { type: "door", width: 0.9, height: 2.1, count: 2 },
      { type: "window", width: 1.2, height: 1.2, count: 4 },
    ],
    structural_members: [],
    has_engineer_schedule: false,
    roof_type: "gable",
    roof_pitch_degrees: 30,
    roof_overhang: 0.6,
    roofing_material: "long_span_aluminium",
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_granite: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    contingency_percent: 0,
    wastage: { ...DEFAULT_WASTAGE },
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    ...overrides,
  } as BuildToRoofInput;
}

const groundFloor = (result: ReturnType<typeof calculateBuildToRoof>) =>
  result.stages.find((s) => s.stage === "ground_floor")!;

describe("ground floor slab thickness is an input, not an assertion", () => {
  it("uses 100 mm only when nothing is entered, and says so", () => {
    const result = calculateBuildToRoof(input());
    const volumeLine = groundFloor(result).quantities.find(
      (q) => q.label === "Ground floor concrete volume",
    )!;
    // 10 x 8 footprint = 80 m2 x 0.10 = 8 m3.
    expect(volumeLine.base_quantity).toBeCloseTo(80 * DEFAULT_SLAB_THICKNESS_M, 6);
    expect(volumeLine.formula).toContain("100 mm, default");
  });

  it("honours a 150 mm slab and scales the concrete with it", () => {
    const result = calculateBuildToRoof(input({ slab_thickness_m: 0.15 }));
    const volumeLine = groundFloor(result).quantities.find(
      (q) => q.label === "Ground floor concrete volume",
    )!;
    expect(volumeLine.base_quantity).toBeCloseTo(80 * 0.15, 6);
    expect(volumeLine.formula).toContain("150 mm, entered");
  });

  it("takes its waste allowance from the concrete setting, not the cement one", () => {
    const result = calculateBuildToRoof(
      input({ slab_thickness_m: 0.1, wastage: { ...DEFAULT_WASTAGE, cement: 0, concrete: 10 } }),
    );
    const volumeLine = groundFloor(result).quantities.find(
      (q) => q.label === "Ground floor concrete volume",
    )!;
    expect(volumeLine.wastage_percent).toBe(10);
    // 8 m3 net, 10 percent concrete waste, so 8.8 m3 is bought.
    expect(volumeLine.final_quantity).toBeCloseTo(8.8, 6);
  });
});

describe("roof purlins follow the slope on every roof type", () => {
  it("reports the rows it used instead of a fixed sentence", () => {
    // 10 x 8, 0.6 overhang, 30 degrees: slope = 4.6 / cos30 = 5.312 m,
    // so ceil(5.312 / 1.0) = 6 rows per plane, not the nominal four.
    const summary = summariseTimberFraming(100, 10, 8, 30, 0.6, "hip");
    expect(summary.purlinRowsPerPlane).toBe(6);
    expect(summary.purlinRowsPerPlane * PURLIN_SPACING_M).toBeGreaterThanOrEqual(5.312);
    expect(summary.rafterSpacingM).toBe(0.9);
    expect(summary.totalM).toBeCloseTo(summary.rafterLengthM + summary.purlinLengthM, 0);
  });

  it("prices a hip roof on the rows its slope needs", () => {
    const hip = summariseTimberFraming(100, 10, 8, 30, 0.6, "hip");
    const gable = summariseTimberFraming(100, 10, 8, 30, 0.6, "gable");
    expect(hip.purlinPlanes).toBe(4);
    expect(gable.purlinPlanes).toBe(2);
    expect(hip.purlinLengthM).toBeGreaterThan(gable.purlinLengthM);
  });
});
