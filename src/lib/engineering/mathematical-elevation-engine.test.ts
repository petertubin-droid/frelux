import { describe, it, expect } from "vitest";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "./mathematical-elevation-engine";

describe("Deterministic Mathematical Plan Elevation Engine", () => {
  it("calculates default standard bungalow elevation with verified trigonometric geometry", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

    expect(res).toBeDefined();
    expect(res.levels.level_1_foundation.footing_width_calculated_m).toBeNull();
    expect(res.levels.level_1_foundation.is_bearing_safe).toBeNull();

    // Clear ridge rise uses half the shorter plan span; overhang does not change it.
    const expectedHalfSpan = 9.0 / 2;
    const expectedRidge = expectedHalfSpan * Math.tan((25 * Math.PI) / 180);
    expect(res.levels.level_5_roof.ridge_rise_m).toBeCloseTo(expectedRidge, 2);

    // Default is a hip roof, whose hip/jack-rafter geometry is not quantified.
    expect(res.levels.level_5_roof.rafter_slope_length_m).toBeNull();

    // Descriptive geometry ratio only; no structural limit is applied.
    expect(res.levels.level_3_superstructure.slenderness_ratio).toBeCloseTo(
      13.3,
      1,
    );
    expect(
      res.levels.level_3_superstructure.is_slenderness_compliant,
    ).toBeNull();
  });

  it("reports wall proportions without claiming a stability check", () => {
    const result = calculateMathematicalElevation({
      floor_to_floor_height: 4.5,
      wall_thickness: 0.12,
    });
    expect(
      result.levels.level_3_superstructure.is_slenderness_compliant,
    ).toBeNull();
    expect(result.levels.level_3_superstructure.slenderness_limit).toBeNull();
  });

  it("detects low roof pitch warning (< 12 deg) for corrugated sheet water tightness", () => {
    const res = calculateMathematicalElevation({
      roof_pitch_deg: 8.0,
    });

    const pitchErr = res.discrepancies.find(
      (d) => d.id === "err-roof-pitch-low",
    );
    expect(pitchErr).toBeDefined();
    expect(pitchErr?.severity).toBe("warning");
    expect(pitchErr?.detected_value).toBe("θ = 8.0°");
  });

  it("does not report generic wind, tie or foundation design outputs", () => {
    const result = calculateMathematicalElevation({
      basic_wind_speed_ms: 45,
      soil_bearing_capacity_kpa: 60,
    });
    expect(result.wind_analysis.velocity_pressure_qz_pa).toBeNull();
    expect(result.wind_analysis.hurricane_ties_required).toBeNull();
    expect(
      result.levels.level_1_foundation.applied_soil_pressure_kpa,
    ).toBeNull();
    expect(result.levels.level_1_foundation.is_bearing_safe).toBeNull();
    expect(
      result.levels.level_1_foundation.footing_width_calculated_m,
    ).toBeNull();
  });

  it("reports normalized user-entered values instead of silently clamping them", () => {
    const result = calculateMathematicalElevation({
      building_length: 2,
      storeys: 61,
    });
    expect(result.input.building_length).toBe(3);
    expect(result.input.storeys).toBe(60);
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-normalized-building_length",
      ),
    ).toBe(true);
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-normalized-storeys",
      ),
    ).toBe(true);
  });

  it("flags non-finite dimensions rather than silently substituting defaults", () => {
    const result = calculateMathematicalElevation({
      building_length: Number.NaN,
    });
    expect(result.input.building_length).toBe(
      DEFAULT_PLAN_INPUT.building_length,
    );
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-invalid-building_length",
      ),
    ).toBe(true);
  });

  it("clamps an explicit zero to the documented minimum, not to a default dimension", () => {
    const result = calculateMathematicalElevation({
      building_length: 0,
      roof_pitch_deg: 0,
      roof_overhang: 0,
    });
    expect(result.input.building_length).toBe(3);
    expect(result.input.roof_pitch_deg).toBe(5);
    expect(result.input.roof_overhang).toBe(0.2);
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-normalized-building_length",
      ),
    ).toBe(true);
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-normalized-roof_pitch_deg",
      ),
    ).toBe(true);
    expect(
      result.discrepancies.some(
        (item) => item.id === "input-normalized-roof_overhang",
      ),
    ).toBe(true);
  });

  it("does not calculate gable geometry for unsupported roof forms", () => {
    const result = calculateMathematicalElevation({ roof_type: "flat" });
    expect(result.levels.level_5_roof.ridge_rise_m).toBeNull();
    expect(result.levels.level_5_roof.rafter_slope_length_m).toBeNull();
    expect(
      result.levels.level_5_roof.approximate_roof_covering_area_m2,
    ).toBeNull();
  });

  it("reports opening width as an input geometry indicator, not a design check", () => {
    const res = calculateMathematicalElevation({
      building_length: 8.0,
      building_width: 6.0,
      openings: [
        {
          id: "big1",
          type: "window",
          width: 5.0,
          height: 2.0,
          count: 1,
          wall_side: "front",
        },
      ],
    });

    // Front wall length is 8.0m, opening width is 5.0m -> ratio = 5/8 = 62.5% > 50%
    expect(
      res.levels.level_3_superstructure.max_opening_ratio_percent,
    ).toBeCloseTo(62.5, 1);
    expect(
      res.discrepancies.some((d) => d.id.includes("err-opening-ratio")),
    ).toBe(false);
  });

  it("respects an explicitly empty openings list instead of restoring defaults", () => {
    const result = calculateMathematicalElevation({ openings: [] });
    expect(result.input.openings).toEqual([]);
    expect(
      result.levels.level_3_superstructure.total_opening_deductions_m2,
    ).toBe(0);
  });

  it("normalizes malformed opening measurements to finite non-negative values", () => {
    const result = calculateMathematicalElevation({
      openings: [
        {
          id: "bad-opening",
          type: "window",
          width: Number.NaN,
          height: -2,
          count: Number.NaN,
          wall_side: "front",
        },
      ],
    });
    const [opening] = result.input.openings;
    expect(opening.width).toBe(0);
    expect(opening.height).toBe(0);
    expect(opening.count).toBe(0);
    expect(
      Number.isFinite(result.levels.level_3_superstructure.net_masonry_area_m2),
    ).toBe(true);
  });

  it("produces a 5D BIM schedule with materials, curing milestones, and patch for Build-to-Roof", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

    expect(res.five_d_bim.materials.length).toBeGreaterThan(0);
    expect(res.five_d_bim.total_concrete_volume_m3).toBeGreaterThan(0);
    expect(res.five_d_bim.total_blocks_units).toBeNull();
    expect(res.five_d_bim.timeline_phases).toEqual([]);
    expect(res.five_d_bim.total_project_days).toBeNull();

    // Patch output
    expect(res.derived_patch.building_length).toBe(12.0);
    expect(res.derived_patch.building_width).toBe(9.0);
    expect(res.derived_patch.foundation_type).toBeUndefined();
    expect(res.derived_patch.roof_pitch_degrees).toBe(25.0);
    expect(res.derived_patch.openings?.length).toBe(5);
  });
});

describe("Elevation engine corrections", () => {
  it("does not estimate hip roof surface area or rafter lengths without hip-plane geometry", () => {
    const hip = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      roof_type: "hip",
    });
    expect(hip.levels.level_5_roof.ridge_rise_m).not.toBeNull();
    expect(hip.levels.level_5_roof.rafter_slope_length_m).toBeNull();
    expect(
      hip.levels.level_5_roof.approximate_roof_covering_area_m2,
    ).toBeNull();
  });

  it("computes the gable roof proxy from expanded plan and pitch", () => {
    const gable = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      roof_type: "gable",
    });
    const roof = gable.levels.level_5_roof;
    const expected =
      roof.horizontal_roof_footprint_m2 / Math.cos((25 * Math.PI) / 180);
    expect(roof.approximate_roof_covering_area_m2).toBeCloseTo(expected, 2);
    expect(roof.rafter_slope_length_m).toBeCloseTo(
      (Math.min(
        DEFAULT_PLAN_INPUT.building_length,
        DEFAULT_PLAN_INPUT.building_width,
      ) /
        2 +
        DEFAULT_PLAN_INPUT.roof_overhang) /
        Math.cos((25 * Math.PI) / 180),
      2,
    );
  });

  it("reports apex above finished ground, excluding the excavation depth", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const expected =
      res.levels.level_2_ground_slab.plinth_height_above_ground_m +
      3.0 +
      res.levels.level_4_ring_beam.ring_beam_depth_m +
      (res.levels.level_5_roof.ridge_rise_m ?? 0);
    expect(
      Math.abs(res.levels.level_5_roof.total_building_height_m - expected),
    ).toBeLessThan(0.01);
  });

  it("holds net masonry at zero and flags openings larger than the walls", () => {
    const res = calculateMathematicalElevation({
      building_length: 6,
      building_width: 6,
      internal_wall_length: 0,
      openings: [
        {
          id: "a",
          type: "window",
          width: 6,
          height: 3,
          count: 10,
          wall_side: "front",
        },
      ],
    });
    expect(res.levels.level_3_superstructure.net_masonry_area_m2).toBe(0);
    expect(res.levels.level_3_superstructure.total_blocks_count).toBeNull();
    const flag = res.discrepancies.find(
      (d) => d.id === "err-openings-exceed-walls",
    );
    expect(flag?.severity).toBe("critical");
  });

  it("leaves material yields unavailable without mix and product specifications", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    expect(res.five_d_bim.total_cement_bags_50kg).toBeNull();
    expect(res.five_d_bim.total_sand_m3).toBeNull();
    expect(res.five_d_bim.total_granite_m3).toBeNull();
    expect(res.five_d_bim.total_blocks_units).toBeNull();
    expect(res.five_d_bim.total_mortar_volume_m3).toBeNull();
  });

  it("does not report an unsupported total reinforcement quantity", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    expect(res.levels.level_4_ring_beam.total_main_rebar_weight_kg).toBeNull();
    expect(res.five_d_bim.total_rebar_kg).toBeNull();
  });

  it("leaves unsupported wind design outputs unavailable", () => {
    const result = calculateMathematicalElevation({ roof_pitch_deg: 55 });
    expect(result.wind_analysis.roof_cpe_windward).toBeNull();
    expect(result.wind_analysis.required_tie_down_capacity_kn).toBeNull();
  });

  it("does not report unsupported foundation line loads", () => {
    const res = calculateMathematicalElevation({
      building_length: 20,
      building_width: 6,
    });
    expect(
      res.levels.level_1_foundation.total_working_dead_load_kn_m,
    ).toBeNull();
    expect(
      res.levels.level_1_foundation.total_working_live_load_kn_m,
    ).toBeNull();
    expect(res.levels.level_1_foundation.total_line_load_kn_m).toBeNull();
  });

  it("reports when entered numeric inputs are normalized", () => {
    const result = calculateMathematicalElevation({
      building_length: 2,
      storeys: 200,
    });
    expect(result.input.building_length).toBe(3);
    expect(result.input.storeys).toBe(60);
    expect(
      result.discrepancies.some(
        (d) => d.id === "input-normalized-building_length",
      ),
    ).toBe(true);
    expect(
      result.discrepancies.some((d) => d.id === "input-normalized-storeys"),
    ).toBe(true);
  });

  it("leaves unsupported roof forms without gable/hip area or rise outputs", () => {
    const result = calculateMathematicalElevation({ roof_type: "flat" });
    expect(result.levels.level_5_roof.ridge_rise_m).toBeNull();
    expect(result.levels.level_5_roof.rafter_slope_length_m).toBeNull();
    expect(
      result.levels.level_5_roof.approximate_roof_covering_area_m2,
    ).toBeNull();
  });

  it("does not claim bearing safety without foundation design", () => {
    const l1 =
      calculateMathematicalElevation(DEFAULT_PLAN_INPUT).levels
        .level_1_foundation;
    expect(l1.bearing_utilization_pct).toBeNull();
    expect(l1.bearing_margin_on_allowable).toBeNull();
    expect(l1.is_bearing_safe).toBeNull();
  });
});

describe("eaves and ridge heights", () => {
  it("reports the wall-top height separately from the peak", () => {
    const result = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const roof = result.levels.level_5_roof;
    // The peak is the eaves line plus the ridge rise. Each figure is rounded
    // once for display from unrounded geometry, so the printed total can sit
    // one rounding step (1 cm) from the sum of the printed parts; adding two
    // rounded figures first is what used to make the peak drift.
    const printedParts = roof.eaves_height_m + (roof.ridge_rise_m ?? 0);
    expect(
      Math.abs(roof.total_building_height_m - printedParts),
    ).toBeLessThanOrEqual(0.011);
    // The bi-monthly question "how tall are the walls" must not be derived
    // from the peak by anyone reading the page.
    expect(roof.eaves_height_m).toBeLessThan(roof.total_building_height_m);
  });

  it("moves the eaves line with floor count and storey height", () => {
    const single = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      storeys: 1,
    });
    const double = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      storeys: 2,
    });
    const rise =
      double.levels.level_5_roof.eaves_height_m -
      single.levels.level_5_roof.eaves_height_m;
    expect(rise).toBeCloseTo(DEFAULT_PLAN_INPUT.floor_to_floor_height, 2);
  });

  it("measures a tower rather than a five storey stand-in", () => {
    // P_ext = 2(12 + 9) = 42 m, H = 3.0 m. Forty storeys of external wall is
    // 42 x 3.0 x 40 = 5040 m2, not the 630 m2 a silent cap at five pays for.
    const tower = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      storeys: 40,
    });
    expect(tower.input.storeys).toBe(40);
    expect(
      tower.levels.level_3_superstructure.gross_external_wall_area_m2,
    ).toBe(5040);
    // Ring beams run at every floor level: L_centerline 42 + 22 = 64 m per
    // level, 64 x 40 = 2560 m.
    expect(tower.levels.level_4_ring_beam.total_beam_length_m).toBe(2560);
  });

  it("answers a glass house with the solid remainder and names the glazing", () => {
    // A 12 x 9 x 3 ground floor gives 126 m2 of external wall. Glazing 110 m2
    // leaves 16 m2 solid, which is 87.3 percent glazed.
    const glassHouse = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      storeys: 1,
      internal_wall_length: 0,
      openings: [{ id: "glaze", type: "window", width: 4.0, height: 2.75, count: 10, wall_side: "front" }],
    } as never);
    const l3 = glassHouse.levels.level_3_superstructure;
    expect(l3.gross_external_wall_area_m2).toBe(126);
    expect(l3.total_opening_deductions_m2).toBe(110);
    expect(l3.net_masonry_area_m2).toBe(16);
    const advisory = glassHouse.discrepancies.find(
      (d) => d.id === "advisory-glazed-envelope",
    );
    expect(advisory).toBeTruthy();
    // The advisory must name the glass by area, because the estimator it points
    // at prices per panel and a count alone cannot be costed.
    expect(advisory?.mathematical_proof).toContain("110.0 m² are windows");
  });
});
