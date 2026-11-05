import { describe, it, expect } from "vitest";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "./mathematical-elevation-engine";

describe("Deterministic Mathematical Plan Elevation Engine", () => {
  it("calculates default standard bungalow elevation with verified trigonometric geometry", () => {
    const res = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

    expect(res).toBeDefined();
    expect(res.levels.level_1_foundation.footing_width_adopted_m).toBeGreaterThanOrEqual(0.675);
    expect(res.levels.level_1_foundation.is_bearing_safe).toBe(true);

    // Verify trigonometric pitch geometry: half_span = (9 + 2*0.6)/2 = 5.1m
    // ridge rise = 5.1 * tan(25 deg) = 2.378m
    const expectedHalfSpan = (9.0 + 2 * 0.6) / 2;
    const expectedRidge = expectedHalfSpan * Math.tan((25 * Math.PI) / 180);
    expect(res.levels.level_5_roof.ridge_rise_m).toBeCloseTo(expectedRidge, 2);

    // Rafter slope length = 5.1 / cos(25 deg) = 5.627m
    const expectedRafter = expectedHalfSpan / Math.cos((25 * Math.PI) / 180);
    expect(res.levels.level_5_roof.rafter_slope_length_m).toBeCloseTo(expectedRafter, 2);

    // Slenderness ratio: H_eff = 0.75 * 3.0 = 2.25m, lambda = 2.25 / 0.225 = 10.0 <= 27
    expect(res.levels.level_3_superstructure.slenderness_ratio).toBe(10.0);
    expect(res.levels.level_3_superstructure.is_slenderness_compliant).toBe(true);
  });

  it("detects slenderness ratio violation when wall is too slender for its height", () => {
    // 4.5m tall wall with 0.12m thickness -> H_eff = 0.75 * 4.5 = 3.375m -> lambda = 3.375 / 0.12 = 28.125 > 27
    const res = calculateMathematicalElevation({
      building_length: 10,
      building_width: 8,
      floor_to_floor_height: 4.5,
      wall_thickness: 0.12,
    });

    expect(res.levels.level_3_superstructure.slenderness_ratio).toBeGreaterThan(27.0);
    expect(res.levels.level_3_superstructure.is_slenderness_compliant).toBe(false);

    const slendernessErr = res.discrepancies.find((d) => d.id === "err-wall-slenderness");
    expect(slendernessErr).toBeDefined();
    expect(slendernessErr?.severity).toBe("critical");
    expect(slendernessErr?.regulation_code).toBe("Planning screen only");
  });

  it("detects low roof pitch warning (< 12 deg) for corrugated sheet water tightness", () => {
    const res = calculateMathematicalElevation({
      roof_pitch_deg: 8.0,
    });

    const pitchErr = res.discrepancies.find((d) => d.id === "err-roof-pitch-low");
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

    expect(res.wind_analysis.velocity_pressure_qz_pa).toBeGreaterThan(800);
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

    expect(res.levels.level_1_foundation.allowable_bearing_capacity_kpa).toBe(60);
    // Footing will expand, but if pressure exceeds or is at limits
    expect(res.levels.level_1_foundation.footing_width_adopted_m).toBeGreaterThan(1.0);
  });

  it("detects excessive opening ratio on any wall face (> 50%)", () => {
    const res = calculateMathematicalElevation({
      building_length: 8.0,
      building_width: 6.0,
      openings: [
        { id: "big1", type: "window", width: 5.0, height: 2.0, count: 1, wall_side: "front" },
      ],
    });

    // Front wall length is 8.0m, opening width is 5.0m -> ratio = 5/8 = 62.5% > 50%
    const openErr = res.discrepancies.find((d) => d.id.includes("err-opening-ratio"));
    expect(openErr).toBeDefined();
    expect(openErr?.severity).toBe("critical");
  });

  it("respects an explicitly empty openings list instead of restoring defaults", () => {
    const result = calculateMathematicalElevation({ openings: [] });
    expect(result.input.openings).toEqual([]);
    expect(result.levels.level_3_superstructure.total_opening_deductions_m2).toBe(0);
  });

  it("normalizes malformed opening measurements to finite non-negative values", () => {
    const result = calculateMathematicalElevation({
      openings: [{
        id: "bad-opening",
        type: "window",
        width: Number.NaN,
        height: -2,
        count: Number.NaN,
        wall_side: "front",
      }],
    });
    const [opening] = result.input.openings;
    expect(opening.width).toBe(0);
    expect(opening.height).toBe(0);
    expect(opening.count).toBe(0);
    expect(Number.isFinite(result.levels.level_3_superstructure.net_masonry_area_m2)).toBe(true);
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
