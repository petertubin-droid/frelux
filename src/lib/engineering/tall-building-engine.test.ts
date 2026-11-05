import { describe, expect, it } from "vitest";
import {
  calculateTallBuilding,
  concreteModulusMpa,
  DEFAULT_TALL_INPUT,
  liveLoadReduction,
  TALL_SOILS,
  velocityPressureCoefficient,
} from "./tall-building-engine";

describe("tall building engine: reference values", () => {
  it("reproduces the published ASCE 7-22 Kz values at 10 m", () => {
    // The power law and the tabulated row differ by up to about 0.03 because the
    // table is rounded; the band is asserted rather than a single digit.
    expect(Math.abs(velocityPressureCoefficient(10, "B") - 0.7)).toBeLessThan(
      0.03,
    );
    expect(Math.abs(velocityPressureCoefficient(10, "C") - 0.98)).toBeLessThan(
      0.03,
    );
    expect(Math.abs(velocityPressureCoefficient(10, "D") - 1.2)).toBeLessThan(
      0.03,
    );
  });

  it("uses the ACI 318-19 modulus for normal weight concrete", () => {
    expect(concreteModulusMpa(45)).toBeCloseTo(4700 * Math.sqrt(45), 0);
  });

  it("reduces live load with tributary area and stops at the floor value", () => {
    const small = liveLoadReduction(10, 1);
    const large = liveLoadReduction(200, 5);
    expect(small).toBeGreaterThan(large);
    expect(large).toBeGreaterThanOrEqual(0.4);
    expect(small).toBeLessThanOrEqual(1);
  });
});

describe("tall building engine: geometry and system", () => {
  it("computes height from the ground floor plus typical floors", () => {
    const result = calculateTallBuilding({
      floors: 40,
      floor_height: 3.6,
      ground_floor_height: 5,
    });
    expect(result.geometry.total_height_m).toBeCloseTo(5 + 39 * 3.6, 1);
    expect(result.geometry.floor_plate_m2).toBeCloseTo(42 * 32, 0);
  });

  it("selects a system that suits the storey count", () => {
    expect(calculateTallBuilding({ floors: 12 }).system.selected).toBe(
      "rigid_frame",
    );
    expect(calculateTallBuilding({ floors: 30 }).system.selected).toBe(
      "shear_core",
    );
    expect(calculateTallBuilding({ floors: 50 }).system.selected).toBe(
      "outrigger",
    );
    expect(calculateTallBuilding({ floors: 80 }).system.selected).toBe(
      "tube_in_tube",
    );
    expect(calculateTallBuilding({ floors: 110 }).system.selected).toBe(
      "mega_frame",
    );
  });

  it("flags a forced system that sits outside its practical range", () => {
    const result = calculateTallBuilding({ floors: 90, system: "rigid_frame" });
    expect(result.system.within_practical_range).toBe(false);
    expect(result.checks.some((check) => check.id === "system-range")).toBe(
      true,
    );
  });
});

describe("tall building engine: wind", () => {
  it("follows the square law on wind speed", () => {
    const base = calculateTallBuilding({ basic_wind_speed_ms: 20 });
    const doubled = calculateTallBuilding({ basic_wind_speed_ms: 40 });
    expect(doubled.wind.base_shear_mn / base.wind.base_shear_mn).toBeCloseTo(
      4,
      1,
    );
  });

  it("accumulates shear and moment up the height", () => {
    const low = calculateTallBuilding({ floors: 20 });
    const high = calculateTallBuilding({ floors: 60 });
    expect(high.wind.base_shear_mn).toBeGreaterThan(low.wind.base_shear_mn);
    expect(high.wind.overturning_moment_mnm).toBeGreaterThan(
      low.wind.overturning_moment_mnm * 3,
    );
  });

  it("reports drift as a ratio of height and applies the H/500 limit", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.wind.drift_ratio).toBeGreaterThan(0);
    expect(result.wind.drift_limit_h_over_500_mm).toBeCloseTo(
      (result.geometry.total_height_m * 1000) / 500,
      1,
    );
    expect(result.wind.passes_h_over_500).toBe(
      result.wind.drift_top_mm <= result.wind.drift_limit_h_over_500_mm,
    );
  });

  it("flags a slender tower and advises a wind tunnel study", () => {
    const slender = calculateTallBuilding({
      floors: 60,
      plan_length: 20,
      plan_width: 16,
    });
    expect(slender.geometry.slenderness_ratio).toBeGreaterThan(6);
    expect(slender.checks.some((check) => check.id === "wind-tunnel")).toBe(
      true,
    );
  });
});

describe("tall building engine: gravity and seismic", () => {
  it("includes structure self weight in the base load", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    const perSquareMetre =
      (result.gravity.total_gravity_load_mn * 1000) /
      result.geometry.gross_floor_area_m2;
    // Total building weight per gross floor area sits in a credible band for concrete.
    expect(perSquareMetre).toBeGreaterThan(10);
    expect(perSquareMetre).toBeLessThan(25);
  });

  it("sizes the base column from its tributary axial load", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.gravity.column_size_mm).toBeGreaterThanOrEqual(400);
    const taller = calculateTallBuilding({ ...DEFAULT_TALL_INPUT, floors: 60 });
    expect(taller.gravity.base_axial_per_column_mn).toBeGreaterThan(
      result.gravity.base_axial_per_column_mn,
    );
  });

  it("computes seismic base shear from Cs and the seismic weight", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.seismic.base_shear_mn).toBeCloseTo(
      result.seismic.spectral_response_acceleration *
        result.seismic.seismic_weight_mn,
      1,
    );
    expect(result.seismic.seismic_weight_mn).toBeLessThan(
      result.gravity.total_gravity_load_mn,
    );
  });

  it("raises seismic demand when the hazard rises", () => {
    const low = calculateTallBuilding({ seismic_sds: 0.2, seismic_sd1: 0.1 });
    const high = calculateTallBuilding({ seismic_sds: 0.9, seismic_sd1: 0.4 });
    expect(high.seismic.base_shear_mn).toBeGreaterThan(
      low.seismic.base_shear_mn * 3,
    );
  });
});

describe("tall building engine: foundation", () => {
  it("keeps a short building on a raft when the ground is strong", () => {
    const result = calculateTallBuilding({
      floors: 8,
      soil_type: "dense_sand",
      plan_length: 40,
      plan_width: 30,
      live_load_kpa: 2,
    });
    expect(result.foundation.piles_required).toBe(0);
    expect(result.foundation.raft_alone_ok).toBe(true);
  });

  it("moves to a piled raft when the raft pressure exceeds the allowable", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.piles_required).toBeGreaterThan(0);
    expect(result.foundation.foundation_type).toBe("piled_raft");
    expect(result.foundation.pile_load_ok).toBe(true);
  });

  it("grows the pile count with the load", () => {
    const short = calculateTallBuilding({ floors: 30 });
    const tall = calculateTallBuilding({ floors: 60 });
    expect(tall.foundation.piles_required).toBeGreaterThan(
      short.foundation.piles_required,
    );
  });

  it("uses the soil table for allowable bearing", () => {
    const result = calculateTallBuilding({ soil_type: "soft_clay" });
    expect(result.foundation.allowable_bearing_kpa).toBe(
      TALL_SOILS.soft_clay.allowable_bearing_kpa,
    );
  });

  it("counts piles so the maximum pile load including moment stays within capacity", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.pile_max_load_kn).toBeLessThanOrEqual(
      result.foundation.pile_capacity_allowable_kn * 1.01,
    );
    expect(result.foundation.eccentricity_m).toBeGreaterThan(0);
  });
});

describe("tall building engine: quantities and programme", () => {
  it("produces concrete and steel in a credible intensity per square metre", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    const concreteIntensity =
      result.quantities.total_concrete_m3 / result.geometry.gross_floor_area_m2;
    const steelIntensity =
      (result.quantities.total_rebar_tonnes * 1000) /
      result.geometry.gross_floor_area_m2;
    expect(concreteIntensity).toBeGreaterThan(0.25);
    expect(concreteIntensity).toBeLessThan(0.7);
    expect(steelIntensity).toBeGreaterThan(50);
    expect(steelIntensity).toBeLessThan(110);
  });

  it("builds the programme from the floor cycle", () => {
    const fiveDay = calculateTallBuilding({
      floors: 40,
      cycle_days_per_floor: 5,
    });
    const fourDay = calculateTallBuilding({
      floors: 40,
      cycle_days_per_floor: 4,
    });
    expect(fiveDay.schedule.structure_days).toBe(200);
    expect(fourDay.schedule.structure_days).toBe(160);
    expect(fiveDay.schedule.total_days).toBe(
      fiveDay.schedule.substructure_days +
        fiveDay.schedule.structure_days +
        fiveDay.schedule.facade_and_fitout_days,
    );
  });

  it("is deterministic for the same input", () => {
    const a = calculateTallBuilding(DEFAULT_TALL_INPUT);
    const b = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(a.wind.base_shear_mn).toBe(b.wind.base_shear_mn);
    expect(a.foundation.piles_required).toBe(b.foundation.piles_required);
    expect(a.quantities.total_concrete_m3).toBe(b.quantities.total_concrete_m3);
  });

  it("normalises malformed input instead of returning NaN", () => {
    const result = calculateTallBuilding({
      floors: Number.NaN,
      plan_length: -5,
      pile_length_m: Number.NaN,
    });
    expect(Number.isFinite(result.geometry.total_height_m)).toBe(true);
    expect(result.geometry.total_height_m).toBeGreaterThan(0);
    expect(Number.isFinite(result.foundation.pile_capacity_allowable_kn)).toBe(
      true,
    );
  });
});
