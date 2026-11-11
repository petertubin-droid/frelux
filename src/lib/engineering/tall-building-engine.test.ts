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

describe("tall building engine: screening limits", () => {
  it("always discloses that roof-specific actions are outside the model", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.checks.some((check) => check.id === "roof-not-modeled")).toBe(
      true,
    );
  });

  it("flags bounded or non-finite inputs that were normalized", () => {
    const bounded = calculateTallBuilding({ floors: 200 });
    expect(bounded.input.floors).toBe(140);
    expect(
      bounded.checks.some((check) => check.id === "input-normalized"),
    ).toBe(true);

    const invalid = calculateTallBuilding({ floors: Number.NaN });
    expect(
      invalid.checks.some((check) => check.id === "input-normalized"),
    ).toBe(true);
  });
});

describe("tall building engine: wind", () => {
  it("follows the square law on wind speed", () => {
    const base = calculateTallBuilding({ basic_wind_speed_ms: 20 });
    const doubled = calculateTallBuilding({ basic_wind_speed_ms: 40 });
    // The gust factor shifts slightly between the two speeds, so the ratio sits
    // near four rather than exactly on it.
    const ratio = doubled.wind.base_shear_mn / base.wind.base_shear_mn;
    expect(ratio).toBeGreaterThan(3.8);
    expect(ratio).toBeLessThan(4.6);
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

describe("tall building engine: wind hardening", () => {
  it("computes a gust factor inside the ASCE band and clamps the flexible minimum", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.wind.gust_factor).toBeGreaterThanOrEqual(0.8);
    expect(result.wind.gust_factor).toBeLessThanOrEqual(1.6);
    // A soft tower uses the flexible branch, which may not fall below 0.85.
    expect(result.wind.rigid_building).toBe(false);
    expect(result.wind.gust_factor).toBeGreaterThanOrEqual(0.85);
  });

  it("uses a rigid gust factor for a short stiff building", () => {
    const stiff = calculateTallBuilding({
      floors: 6,
      plan_length: 40,
      plan_width: 34,
    });
    expect(stiff.wind.rigid_building).toBe(true);
    expect(stiff.wind.gust_factor).toBeCloseTo(0.85, 1);
  });

  it("lowers the natural frequency as the building gets taller", () => {
    const low = calculateTallBuilding({ floors: 20 });
    const high = calculateTallBuilding({ floors: 70 });
    expect(high.wind.natural_frequency_hz).toBeLessThan(
      low.wind.natural_frequency_hz,
    );
    expect(high.wind.natural_period_s).toBeGreaterThan(
      low.wind.natural_period_s,
    );
  });

  it("reports a drift band around the central estimate", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.wind.drift_band_mm[0]).toBeLessThan(result.wind.drift_top_mm);
    expect(result.wind.drift_band_mm[1]).toBeGreaterThan(
      result.wind.drift_top_mm,
    );
  });

  it("separates flexural and shear drift and keeps the storey drift below the top drift", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.wind.flexural_drift_mm).toBeGreaterThan(0);
    expect(result.wind.shear_drift_mm).toBeGreaterThan(0);
    expect(
      result.wind.flexural_drift_mm + result.wind.shear_drift_mm,
    ).toBeCloseTo(result.wind.drift_top_mm, 0);
    expect(result.wind.storey_drift_max_mm).toBeLessThanOrEqual(
      result.wind.drift_top_mm,
    );
  });

  it("locates the peak stability coefficient at a storey, not at the base", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.wind.theta_level).toBeGreaterThan(1);
    expect(result.wind.theta_level).toBeLessThanOrEqual(
      DEFAULT_TALL_INPUT.floors,
    );
  });

  it("stiffens the building when the plan grows", () => {
    const small = calculateTallBuilding({ plan_length: 30, plan_width: 24 });
    const large = calculateTallBuilding({ plan_length: 60, plan_width: 48 });
    expect(large.wind.drift_top_mm).toBeLessThan(small.wind.drift_top_mm);
  });
});

describe("tall building engine: seismic hardening", () => {
  it("uses k = 1 for a short period and k = 2 for a long one", () => {
    const low = calculateTallBuilding({
      floors: 6,
      plan_length: 30,
      plan_width: 24,
    });
    const high = calculateTallBuilding({
      floors: 120,
      plan_length: 60,
      plan_width: 50,
      system: "mega_frame",
    });
    expect(low.seismic.k_exponent).toBeCloseTo(1, 2);
    // Above 2.5 s the exponent reaches 2; between 0.5 and 2.5 s it varies.
    expect(high.seismic.k_exponent).toBeGreaterThan(1);
    expect(high.seismic.k_exponent).toBeLessThanOrEqual(2);
    const formula = 1 + (high.seismic.approximate_period_s - 0.5) / 2;
    expect(high.seismic.k_exponent).toBeCloseTo(
      Math.min(2, Math.max(1, formula)),
      2,
    );
  });

  it("places the seismic resultant between half and seven tenths of the height", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.seismic.resultant_height_m).toBeGreaterThan(
      result.geometry.total_height_m * 0.5,
    );
    expect(result.seismic.resultant_height_m).toBeLessThan(
      result.geometry.total_height_m * 0.75,
    );
  });

  it("applies the long period floor only when S1 reaches 0.6", () => {
    const withoutS1 = calculateTallBuilding({ seismic_s1: 0 });
    const withS1 = calculateTallBuilding({ seismic_s1: 0.9 });
    expect(withoutS1.seismic.cs_floor).toBeCloseTo(
      0.044 * withoutS1.input.seismic_sds,
      3,
    );
    expect(withS1.seismic.cs_floor).toBeGreaterThan(withoutS1.seismic.cs_floor);
  });
});

describe("tall building engine: foundation hardening", () => {
  it("applies a group efficiency below one and uses it in the pile check", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.group_efficiency).toBeLessThanOrEqual(1);
    expect(result.foundation.group_efficiency).toBeGreaterThanOrEqual(0.7);
    expect(result.foundation.group_allowable_kn).toBeLessThan(
      result.foundation.pile_capacity_allowable_kn,
    );
  });

  it("reports tension on the far face when the resultant leaves the kern", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.eccentricity_m).toBeGreaterThan(0);
    if (result.foundation.eccentricity_m > Math.min(42, 32) / 6) {
      expect(result.foundation.pile_tension_kn).toBeGreaterThan(0);
      expect(result.foundation.piles_in_tension).toBeGreaterThan(0);
    }
  });

  it("reports settlement with a band and an angular distortion", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.settlement_band_mm[0]).toBeLessThan(
      result.foundation.estimated_settlement_mm,
    );
    expect(result.foundation.settlement_band_mm[1]).toBeGreaterThan(
      result.foundation.estimated_settlement_mm,
    );
    expect(result.foundation.angular_distortion).toBeGreaterThan(0);
  });

  it("checks core punching shear against the concrete resistance", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.foundation.punching_stress_mpa).toBeGreaterThan(0);
    expect(result.foundation.punching_resistance_mpa).toBeGreaterThan(0);
    expect(result.foundation.punching_ratio).toBeCloseTo(
      result.foundation.punching_stress_mpa /
        result.foundation.punching_resistance_mpa,
      1,
    );
  });
});

describe("tall building engine: architectural coupling", () => {
  it("runs the architectural module on the same geometry as the structure", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    expect(result.architecture.grossFloorAreaM2).toBeCloseTo(
      result.geometry.gross_floor_area_m2,
      0,
    );
    expect(result.architecture.facadeAreaM2).toBeCloseTo(
      result.geometry.facade_area_m2,
      -2,
    );
  });

  it("raises the lift count when the population rises", () => {
    const office = calculateTallBuilding({ occupancy: "office" });
    const school = calculateTallBuilding({ occupancy: "education" });
    expect(school.architecture.lifts.carsRequired).toBeGreaterThan(
      office.architecture.lifts.carsRequired,
    );
  });

  it("flags a core that cannot hold the lifts the population needs", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    if (
      result.architecture.lifts.coreAreaNeededM2 >
      result.geometry.core_plan_area_m2
    ) {
      expect(result.checks.some((check) => check.id === "lift-core")).toBe(
        true,
      );
    }
  });

  it("flags a clear height below the occupancy minimum", () => {
    const tight = calculateTallBuilding({
      floor_height: 2.6,
      occupancy: "office",
    });
    expect(tight.architecture.clearHeightOk).toBe(false);
    expect(tight.checks.some((check) => check.id === "clear-height")).toBe(
      true,
    );
  });
});

describe("tall building engine: bearing honesty", () => {
  it("never reports bearing OK while the contact pressure exceeds the allowable", () => {
    const result = calculateTallBuilding(DEFAULT_TALL_INPUT);
    const { foundation } = result;

    expect(foundation.bearing_utilisation_pct).toBeGreaterThan(100);
    expect(foundation.bearing_ok).toBe(false);
    expect(foundation.raft_alone_ok).toBe(false);
    // The scheme is still viable through the piles, reported on its own flag.
    expect(foundation.foundation_type).toBe("piled_raft");
    expect(foundation.pile_load_ok).toBe(true);
  });

  it("agrees with the utilisation on a raft that does fit", () => {
    const result = calculateTallBuilding({
      floors: 8,
      soil_type: "dense_sand",
      plan_length: 40,
      plan_width: 30,
      live_load_kpa: 2,
    });
    const { foundation } = result;
    expect(foundation.bearing_utilisation_pct).toBeLessThanOrEqual(100);
    expect(foundation.bearing_ok).toBe(true);
    expect(foundation.foundation_type).toBe("raft");
  });
});
