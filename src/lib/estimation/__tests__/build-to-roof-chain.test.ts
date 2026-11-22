// =========================================================
// BUILD-TO-ROOF PAGE CHAIN (audit #20)
//
// The engine has its own suite; this covers the seam the ledger flags as
// untested: the page's unit toggle and the opening schedule as they arrive at
// the engine.
//
// Expectations are physical, not implementation-derived. 1 ft is exactly
// 0.3048 m (SI), so the same building described in either unit must price to
// the same money. A millimetre opening schedule is already absolute, so the
// imperial pass must leave it alone: a 1200 mm window is 1200 mm in a feet
// form too.
// =========================================================

import { describe, expect, it } from "vitest";
import {
  calculateBuildToRoof,
  convertBuildToRoofUnits,
  DEFAULT_LABOUR,
  DEFAULT_PRICES,
  DEFAULT_WASTAGE,
} from "../build-to-roof-engine";
import type { BuildToRoofInput } from "@/types/build-to-roof";
import type { OpeningGroup } from "../openings";

function baseInput(
  overrides: Partial<BuildToRoofInput> = {},
): BuildToRoofInput {
  return {
    project_name: "Chain House",
    location: "Lagos",
    building_type: "bungalow",
    number_of_floors: 1,
    measurement_unit: "m",
    building_length: 12,
    building_width: 9,
    floor_to_floor_height: 3,
    wall_thickness: 0.225,
    internal_wall_length: 14,
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

const schedule: OpeningGroup[] = [
  {
    category: "window",
    label: "Living",
    widthMm: 1800,
    heightMm: 1500,
    count: 4,
  },
  {
    category: "window",
    label: "Toilet",
    widthMm: 600,
    heightMm: 600,
    count: 2,
  },
  {
    category: "internal_door",
    label: "Bedroom",
    widthMm: 900,
    heightMm: 2100,
    count: 3,
  },
  {
    category: "entrance_door",
    label: "Security",
    widthMm: 1200,
    heightMm: 2100,
    count: 1,
  },
];

const metres = calculateBuildToRoof(baseInput({ openingGroups: schedule }));

/** The same physical building, described in feet exactly as the toggle does it. */
const inFeet = convertBuildToRoofUnits(baseInput(), 1 / 0.3048);
const feet = calculateBuildToRoof({
  ...inFeet,
  measurement_unit: "ft",
  openingGroups: schedule,
} as BuildToRoofInput);

describe("build-to-roof chain: unit invariance", () => {
  it("prices the same building identically in metres and in feet", () => {
    // Money can differ only by the engine's rounding steps, never by a factor.
    expect(feet.grand_total).toBeCloseTo(metres.grand_total, 0);
    expect(feet.materials_total).toBeCloseTo(metres.materials_total, 0);
    expect(feet.labour_total).toBeCloseTo(metres.labour_total, 0);
  });

  it("reports the same wall area and concrete volume in both unit systems", () => {
    const wall = (r: typeof metres) =>
      r.stages
        .flatMap((s) => s.quantities)
        .find((q) => q.label === "Net wall area");
    const netM = wall(metres)?.base_quantity;
    const netFt = wall(feet)?.base_quantity;
    expect(netM).toBeGreaterThan(0);
    expect(netFt).toBeCloseTo(netM as number, 1);
  });

  it("does not rescale a millimetre opening schedule when the form is in feet", () => {
    // If the imperial pass touched openingGroups, 1200 mm would become
    // 3937 mm and the deduction would be wrong by a factor of 3.28 squared.
    expect(feet.openings_schedule?.totalAreaM2).toBeCloseTo(
      metres.openings_schedule?.totalAreaM2 as number,
      6,
    );
    expect(feet.openings_schedule?.totalCount).toBe(
      metres.openings_schedule?.totalCount,
    );
  });

  it("keeps the window and entrance-door sizes as entered, in millimetres", () => {
    const groups = feet.openings_schedule?.groups ?? [];
    const toilet = groups.find((g) => g.label === "Toilet");
    const security = groups.find((g) => g.label === "Security");
    expect(toilet?.widthMm).toBe(600);
    expect(toilet?.heightMm).toBe(600);
    expect(security?.widthMm).toBe(1200);
  });
});

describe("build-to-roof chain: opening schedule reaches the takeoff", () => {
  it("deducts every category, not only windows and doors as one pile", () => {
    const byCategory = metres.openings_schedule?.byCategory;
    expect(byCategory?.window.count).toBe(6);
    expect(byCategory?.internal_door.count).toBe(3);
    expect(byCategory?.entrance_door.count).toBe(1);
    expect(byCategory?.entrance_door.areaM2).toBeCloseTo(1.2 * 2.1, 6);
  });

  it("deducts the schedule in full from the wall face", () => {
    const withOpenings = metres.openings_schedule?.totalAreaM2 as number;
    const bare = calculateBuildToRoof(baseInput());
    const wall = (r: typeof metres) =>
      r.stages
        .flatMap((s) => s.quantities)
        .find((q) => q.label === "Net wall area")?.base_quantity as number;
    expect(wall(bare) - wall(metres)).toBeCloseTo(withOpenings, 1);
  });
});

describe("build-to-roof chain: disclosure matches the takeoff", () => {
  it("does not claim openings are missing when a schedule was supplied", () => {
    const claims = (metres.missing_info ?? []).join(" ");
    expect(claims).not.toContain("openings not specified");
  });

  it("still says so when there really are no openings", () => {
    const bare = calculateBuildToRoof(baseInput());
    expect((bare.missing_info ?? []).join(" ")).toContain(
      "openings not specified",
    );
  });

  it("states the clamp when a size is outside the accepted range", () => {
    // 9 m by 5 m is not a window; the model clamps to 6000 by 4000 mm. The
    // takeoff then uses a different opening from the one typed, so the result
    // has to say so rather than report the deduction silently.
    const huge = calculateBuildToRoof(
      baseInput({
        openingGroups: [
          {
            category: "window",
            label: "Huge",
            widthMm: 9000,
            heightMm: 5000,
            count: 1,
          },
        ],
      }),
    );
    expect(huge.openings_schedule?.groups[0]?.widthMm).toBe(6000);
    expect(huge.openings_schedule?.groups[0]?.heightMm).toBe(4000);
    expect((huge.limitations ?? []).join(" ")).toMatch(/clamped/i);
  });

  it("does not warn when every size is inside the range", () => {
    expect((metres.limitations ?? []).join(" ")).not.toMatch(/clamped/i);
  });
});
