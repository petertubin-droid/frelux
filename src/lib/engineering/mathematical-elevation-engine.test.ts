import { describe, it, expect } from "vitest";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "./mathematical-elevation-engine";

describe("Deterministic Mathematical Plan Elevation Engine", () => {
  it("calculates default standard bungalow elevation with verified trigonometric geometry", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

    expect(res).toBeDefined();
    expect(
      res.levels.level_1_foundation.footing_width_adopted_m,
    ).toBeGreaterThanOrEqual(0.675);
    expect(res.levels.level_1_foundation.is_bearing_safe).toBe(true);

    // Verify trigonometric pitch geometry: half_span = (9 + 2*0.6)/2 = 5.1m
    // ridge rise = 5.1 * tan(25 deg) = 2.378m
    const expectedHalfSpan = (9.0 + 2 * 0.6) / 2;
    const expectedRidge = expectedHalfSpan * Math.tan((25 * Math.PI) / 180);
    expect(res.levels.level_5_roof.ridge_rise_m).toBeCloseTo(expectedRidge, 2);

    // Rafter slope length = 5.1 / cos(25 deg) = 5.627m
    const expectedRafter = expectedHalfSpan / Math.cos((25 * Math.PI) / 180);
    expect(res.levels.level_5_roof.rafter_slope_length_m).toBeCloseTo(
      expectedRafter,
      2,
    );

    // Slenderness ratio: H_eff = 0.75 * 3.0 = 2.25m, lambda = 2.25 / 0.225 = 10.0 <= 27
    expect(res.levels.level_3_superstructure.slenderness_ratio).toBe(10.0);
    expect(res.levels.level_3_superstructure.is_slenderness_compliant).toBe(
      true,
    );
  });

  it("detects slenderness ratio violation when wall is too slender for its height", () => {
    // 4.5m tall wall with 0.12m thickness -> H_eff = 0.75 * 4.5 = 3.375m -> lambda = 3.375 / 0.12 = 28.125 > 27
    const res = calculateMathematicalElevation({
      building_length: 10,
      building_width: 8,
      floor_to_floor_height: 4.5,
      wall_thickness: 0.12,
    });

    expect(res.levels.level_3_superstructure.slenderness_ratio).toBeGreaterThan(
      27.0,
    );
    expect(res.levels.level_3_superstructure.is_slenderness_compliant).toBe(
      false,
    );

    const slendernessErr = res.discrepancies.find(
      (d) => d.id === "err-wall-slenderness",
    );
    expect(slendernessErr).toBeDefined();
    expect(slendernessErr?.severity).toBe("critical");
    expect(slendernessErr?.regulation_code).toBe("Planning screen only");
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

  it("calculates aerodynamic wind uplift and flags hurricane ties when net uplift > 0", () => {
    // Basic wind speed 45 m/s (severe tropical coastal wind)
    const res = calculateMathematicalElevation({
      basic_wind_speed_ms: 45.0,
      roof_pitch_deg: 20.0,
    });

    // qz = 0.613 x Kz 0.70 (ASCE exposure B at 10 m) x Kd 0.85 x 45^2 = 738 Pa
    expect(res.wind_analysis.velocity_pressure_qz_pa).toBeGreaterThan(700);
    expect(res.wind_analysis.hurricane_ties_required).toBe(true);
    expect(res.wind_analysis.tension_per_tie_kn).toBeGreaterThan(0);

    const windErr = res.discrepancies.find((d) => d.id === "warn-wind-uplift");
    expect(windErr).toBeDefined();
  });

  it("detects soil bearing overload on weak soil with heavy building", () => {
    const res = calculateMathematicalElevation({
      storeys: 3,
      soil_bearing_capacity_kpa: 60, // very soft clay
    });

    expect(res.levels.level_1_foundation.allowable_bearing_capacity_kpa).toBe(
      60,
    );
    // The same three storey building on strong ground needs a narrower footing.
    const strong = calculateMathematicalElevation({
      storeys: 3,
      soil_bearing_capacity_kpa: 250,
    });
    expect(
      res.levels.level_1_foundation.footing_width_calculated_m,
    ).toBeGreaterThan(
      strong.levels.level_1_foundation.footing_width_calculated_m,
    );
  });

  it("detects excessive opening ratio on any wall face (> 50%)", () => {
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
    const openErr = res.discrepancies.find((d) =>
      d.id.includes("err-opening-ratio"),
    );
    expect(openErr).toBeDefined();
    expect(openErr?.severity).toBe("critical");
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

    expect(res.five_d_bim.materials.length).toBeGreaterThan(5);
    expect(res.five_d_bim.total_concrete_volume_m3).toBeGreaterThan(0);
    expect(res.five_d_bim.total_blocks_units).toBeGreaterThan(1000);
    expect(res.five_d_bim.timeline_phases.length).toBe(6);

    // Patch output
    expect(res.derived_patch.building_length).toBe(12.0);
    expect(res.derived_patch.building_width).toBe(9.0);
    expect(res.derived_patch.foundation_type).toBe("strip_footing");
    expect(res.derived_patch.roof_pitch_degrees).toBe(25.0);
    expect(res.derived_patch.openings?.length).toBe(5);
  });
});

describe("Elevation engine corrections", () => {
  it("gives a hip roof the same true area as a gable at the same pitch", () => {
    const gable = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      roof_type: "gable",
    });
    const hip = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      roof_type: "hip",
    });
    // Every roof plane projects onto the same footprint, so true area = plan / cos(theta)
    expect(hip.levels.level_5_roof.true_3d_roof_area_m2).toBeCloseTo(
      gable.levels.level_5_roof.true_3d_roof_area_m2,
      2,
    );
    const plan = hip.levels.level_5_roof.horizontal_roof_footprint_m2;
    const cos = Math.cos((25 * Math.PI) / 180);
    expect(hip.levels.level_5_roof.true_3d_roof_area_m2).toBeCloseTo(
      plan / cos,
      1,
    );
  });

  it("reports apex above finished ground, excluding the excavation depth", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const expected =
      res.levels.level_2_ground_slab.plinth_height_above_ground_m +
      3.0 +
      res.levels.level_4_ring_beam.ring_beam_depth_m +
      res.levels.level_5_roof.ridge_rise_m;
    expect(res.levels.level_5_roof.total_building_height_m).toBeCloseTo(
      expected,
      2,
    );
    expect(res.levels.level_5_roof.total_building_height_m).toBeLessThan(
      expected + res.levels.level_1_foundation.excavation_depth_m,
    );
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
    expect(res.levels.level_3_superstructure.total_blocks_count).toBe(0);
    const flag = res.discrepancies.find(
      (d) => d.id === "err-openings-exceed-walls",
    );
    expect(flag?.severity).toBe("critical");
  });

  it("computes sand from concrete volume and mortar volume separately", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const concrete = res.five_d_bim.total_concrete_volume_m3;
    const blocks = res.five_d_bim.total_blocks_units;
    const expected = concrete * 0.45 + blocks * 0.003 * 0.83;
    expect(res.five_d_bim.total_sand_m3).toBeCloseTo(expected, 0);
  });

  it("counts footing and ring beam steel instead of applying a guessed factor", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const ring = res.levels.level_4_ring_beam.total_main_rebar_weight_kg;
    expect(res.five_d_bim.total_rebar_kg).toBeGreaterThan(ring);
    // Footing steel grows with the building, so a wider plan must use more steel.
    const bigger = calculateMathematicalElevation({
      ...DEFAULT_PLAN_INPUT,
      building_length: 24,
    });
    expect(bigger.five_d_bim.total_rebar_kg).toBeGreaterThan(
      res.five_d_bim.total_rebar_kg,
    );
  });

  it("uses the governing roof suction on a steep roof instead of a fabricated uplift", () => {
    const steep = calculateMathematicalElevation({ roof_pitch_deg: 55 });
    // Windward pressure turns positive above 35 degrees, so leeward suction governs.
    expect(steep.wind_analysis.roof_cpe_windward).toBeGreaterThan(0);
    expect(steep.wind_analysis.governing_roof_suction_cp).toBeCloseTo(0.6, 2);
  });

  it("reports tie demand per tie, not the total uplift force", () => {
    const res = calculateMathematicalElevation({
      basic_wind_speed_ms: 45,
      roof_pitch_deg: 20,
    });
    expect(res.wind_analysis.required_tie_down_capacity_kn).toBeCloseTo(
      res.wind_analysis.tension_per_tie_kn,
      2,
    );
    expect(res.wind_analysis.required_tie_down_capacity_kn).toBeLessThan(
      res.wind_analysis.total_net_uplift_force_kn,
    );
  });

  it("uses a plan-shape tributary for floor live load", () => {
    const res = calculateMathematicalElevation({
      building_length: 20,
      building_width: 6,
    });
    const tributary = (20 * 6) / (4 * (20 + 6));
    expect(
      res.levels.level_1_foundation.total_working_live_load_kn_m,
    ).toBeCloseTo(1.5 * tributary + 0.25 * tributary, 1);
  });

  it("reports bearing utilization and margin against the allowable pressure", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);
    const l1 = res.levels.level_1_foundation;
    expect(l1.bearing_utilization_pct).toBeCloseTo(
      (l1.applied_soil_pressure_kpa / l1.allowable_bearing_capacity_kpa) * 100,
      0,
    );
    expect(l1.bearing_margin_on_allowable).toBeCloseTo(
      l1.allowable_bearing_capacity_kpa / l1.applied_soil_pressure_kpa,
      1,
    );
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
    const printedParts = roof.eaves_height_m + roof.ridge_rise_m;
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
});
