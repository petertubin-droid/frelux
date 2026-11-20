// =========================================================
// BUILD-TO-ROOF OPENING SCHEDULE
//
// The estimator used to accept one door size and one window size for the whole
// building. That cannot express a house where the toilet window is 600 mm and
// the living room window is 1800 mm, or where the security door is wider than
// the bedroom doors. These tests pin the shared schedule: several sizes per
// category, internal doors counted apart from entrance doors, and a structural
// deduction that removes the whole opening.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  calculateBuildToRoof,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from "../build-to-roof-engine";
import type { BuildToRoofInput } from "@/types/build-to-roof";
import type { OpeningGroup } from "../openings";

function baseInput(
  overrides: Partial<BuildToRoofInput> = {},
): BuildToRoofInput {
  return {
    project_name: "Openings House",
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
    openings: [],
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

// A realistic schedule: 18 windows in three sizes, 4 internal doors in two
// sizes, and one wider security door.
const SCHEDULE: OpeningGroup[] = [
  {
    category: "window",
    label: "Living and bedrooms",
    widthMm: 1800,
    heightMm: 1500,
    count: 8,
  },
  {
    category: "window",
    label: "Kitchen",
    widthMm: 1200,
    heightMm: 1200,
    count: 4,
  },
  {
    category: "window",
    label: "Toilet and store",
    widthMm: 600,
    heightMm: 600,
    count: 6,
  },
  {
    category: "internal_door",
    label: "Bedrooms",
    widthMm: 900,
    heightMm: 2100,
    count: 3,
  },
  {
    category: "internal_door",
    label: "Bathroom",
    widthMm: 750,
    heightMm: 2100,
    count: 1,
  },
  {
    category: "entrance_door",
    label: "Security door",
    widthMm: 1200,
    heightMm: 2100,
    count: 1,
  },
];

describe("build-to-roof opening schedule", () => {
  it("accepts several window sizes in one building", () => {
    const r = calculateBuildToRoof(baseInput({ openingGroups: SCHEDULE }));
    const windows =
      r.openings_schedule?.groups.filter((g) => g.category === "window") ?? [];
    expect(windows).toHaveLength(3);
    expect(r.openings_schedule?.byCategory.window.count).toBe(18);
  });

  it("keeps the toilet window and the living room window as different sizes", () => {
    const r = calculateBuildToRoof(baseInput({ openingGroups: SCHEDULE }));
    const areas = (r.openings_schedule?.groups ?? [])
      .filter((g) => g.category === "window")
      .map((g) => g.areaM2);
    // 1.8 x 1.5 = 2.7, 1.2 x 1.2 = 1.44, 0.6 x 0.6 = 0.36
    expect(areas).toEqual([2.7, 1.44, 0.36]);
  });

  it("counts entrance doors apart from internal doors", () => {
    const r = calculateBuildToRoof(baseInput({ openingGroups: SCHEDULE }));
    expect(r.openings_schedule?.byCategory.internal_door.count).toBe(4);
    expect(r.openings_schedule?.byCategory.entrance_door.count).toBe(1);
    expect(r.openings_schedule?.byCategory.entrance_door.areaM2).toBeCloseTo(
      2.52,
      3,
    );
  });

  it("deducts a structural opening in full, including a small one", () => {
    // A 0.36 m2 toilet window sits below the finishing-trade waiver threshold,
    // but a void in a wall is a void: the structural deduction removes all of it.
    const r = calculateBuildToRoof(baseInput({ openingGroups: SCHEDULE }));
    const expected =
      8 * 2.7 + 4 * 1.44 + 6 * 0.36 + 3 * 1.89 + 1 * 1.575 + 1 * 2.52;
    expect(r.openings_schedule?.totalAreaM2).toBeCloseTo(expected, 3);
  });

  it("produces the same wall quantities from the legacy shape and the new one", () => {
    const legacy = calculateBuildToRoof(
      baseInput({
        openings: [
          { type: "door", width: 0.9, height: 2.1, count: 6 },
          { type: "window", width: 1.2, height: 1.2, count: 8 },
        ],
      }),
    );
    const grouped = calculateBuildToRoof(
      baseInput({
        openingGroups: [
          {
            category: "internal_door",
            widthMm: 900,
            heightMm: 2100,
            count: 6,
          },
          { category: "window", widthMm: 1200, heightMm: 1200, count: 8 },
        ],
      }),
    );
    expect(grouped.openings_schedule?.totalAreaM2).toBeCloseTo(
      legacy.openings_schedule?.totalAreaM2 ?? -1,
      3,
    );
    expect(grouped.grand_total).toBeCloseTo(legacy.grand_total, 2);
  });

  it("treats a legacy door as an internal door, never as an entrance", () => {
    const r = calculateBuildToRoof(
      baseInput({
        openings: [{ type: "door", width: 0.9, height: 2.1, count: 2 }],
      }),
    );
    expect(r.openings_schedule?.byCategory.internal_door.count).toBe(2);
    expect(r.openings_schedule?.byCategory.entrance_door.count).toBe(0);
  });

  it("clamps an absurd size rather than pricing it", () => {
    const r = calculateBuildToRoof(
      baseInput({
        openingGroups: [
          { category: "window", widthMm: 40000, heightMm: 6000, count: 1 },
        ],
      }),
    );
    const g = r.openings_schedule?.groups[0];
    expect(g?.widthMm).toBeLessThanOrEqual(6000);
    expect(g?.heightMm).toBeLessThanOrEqual(4000);
  });
});
