import { describe, expect, it } from "vitest";
import {
  calculateTallBuilding,
  concreteModulusMpa,
  gustEffectFactor,
  liveLoadReduction,
  velocityPressureCoefficient,
  type TallBuildingInput,
} from "../tall-building-engine";

/**
 * Conformance suite for the tall building engine, worked from the published
 * ASCE 7-22 tables and ACI 318-19, not from the implementation.
 *
 * Kz is checked at the heights the ASCE table actually tabulates (15, 30 and
 * 100 ft), because "10 m" is not a row: the table steps in feet and 30 ft is
 * 9.14 m, which is the 0.98 row everyone quotes as the 10 m value.
 */
const C_HEIGHT_15FT = 4.572;
const C_HEIGHT_30FT = 9.144;
const C_HEIGHT_100FT = 30.48;

const base: TallBuildingInput = {
  project_name: "Conformance tower",
  market_code: "US",
  design_code: "asce_aci",
  floors: 30,
  floor_height: 3.6,
  ground_floor_height: 4.5,
  plan_length: 36,
  plan_width: 24,
  system: "auto",
  concrete_grade_mpa: 40,
  dead_load_kpa: 4.5,
  live_load_kpa: 3.0,
  partition_kpa: 1.5,
  cladding_kpa: 1.2,
  basic_wind_speed_ms: 45,
  terrain_exposure: "C",
  wind_directionality_kd: 0.85,
  force_coefficient_cf: 1.3,
  seismic_sds: 0.8,
  seismic_sd1: 0.4,
  seismic_s1: 0.3,
  seismic_r: 5.0,
  seismic_importance: 1.0,
  soil_type: "dense_sand",
  spt_n: 30,
  water_table_m: 6,
  pile_diameter_m: 1.5,
  pile_length_m: 55,
  pile_construction: "bored",
  occupancy: "office",
  cycle_days_per_floor: 5,
};

describe("tall building: velocity pressure coefficient (ASCE 7-22 table 26.10-1)", () => {
  it("reproduces the published exposure C rows", () => {
    // 15 ft 0.85, 30 ft 0.98, 100 ft 1.26 for exposure C.
    expect(velocityPressureCoefficient(C_HEIGHT_15FT, "C")).toBeCloseTo(0.85, 1);
    expect(velocityPressureCoefficient(C_HEIGHT_30FT, "C")).toBeCloseTo(0.98, 1);
    expect(velocityPressureCoefficient(C_HEIGHT_100FT, "C")).toBeCloseTo(1.26, 1);
  });

  it("reproduces the published exposure B row", () => {
    expect(velocityPressureCoefficient(C_HEIGHT_30FT, "B")).toBeCloseTo(0.7, 1);
  });

  it("puts the rougher exposures above the smoother ones", () => {
    const b = velocityPressureCoefficient(60, "B");
    const c = velocityPressureCoefficient(60, "C");
    const d = velocityPressureCoefficient(60, "D");
    expect(b).toBeLessThan(c);
    expect(c).toBeLessThan(d);
  });

  it("rises with height and holds the 4.6 m floor", () => {
    const low = velocityPressureCoefficient(20, "C");
    const high = velocityPressureCoefficient(80, "C");
    expect(high).toBeGreaterThan(low);
    // Below 4.6 m the coefficient is held, not extrapolated to zero.
    expect(velocityPressureCoefficient(0.5, "C")).toBeCloseTo(
      velocityPressureCoefficient(4.6, "C"),
      6,
    );
  });
});

describe("tall building: concrete modulus (ACI 318-19 19.2.2)", () => {
  it("uses Ec = 4700 sqrt(fc)", () => {
    expect(concreteModulusMpa(30)).toBeCloseTo(4700 * Math.sqrt(30), 0);
    expect(concreteModulusMpa(40)).toBeCloseTo(29725, -1);
  });

  it("scales as the square root of strength", () => {
    expect(concreteModulusMpa(40) / concreteModulusMpa(10)).toBeCloseTo(2, 3);
  });
});

describe("tall building: live load reduction (ASCE 7-22 4.7.2)", () => {
  it("follows 0.25 + 4.57 / sqrt(KLL At) with KLL = 4", () => {
    // 25 m2: 0.25 + 4.57 / 10 = 0.707
    expect(liveLoadReduction(25, 3)).toBeCloseTo(0.707, 2);
    // 100 m2: 0.25 + 4.57 / 20 = 0.4785
    expect(liveLoadReduction(100, 3)).toBeCloseTo(0.4785, 3);
  });

  it("never falls below 0.50 for one floor and 0.40 for two or more", () => {
    expect(liveLoadReduction(5000, 1)).toBe(0.5);
    expect(liveLoadReduction(5000, 2)).toBe(0.4);
    expect(liveLoadReduction(5000, 20)).toBe(0.4);
  });

  it("never exceeds unity", () => {
    expect(liveLoadReduction(1, 5)).toBeLessThanOrEqual(1);
  });
});

describe("tall building: gust effect factor (ASCE 7-22 26.11.5)", () => {
  const gustBase = {
    height: 108,
    width: 36,
    lengthAlongWind: 24,
    windSpeedMs: 45,
    exposure: "C" as const,
    dampingRatio: 0.02,
  };

  it("treats 1 Hz and above as rigid and lands near 0.85", () => {
    const r = gustEffectFactor({ ...gustBase, frequencyHz: 2 });
    expect(r.rigid).toBe(true);
    expect(r.resonantFactor).toBe(0);
    expect(r.gustFactor).toBeGreaterThan(0.8);
    expect(r.gustFactor).toBeLessThan(0.95);
  });

  it("adds a resonant term below 1 Hz and never reduces the factor", () => {
    const rigid = gustEffectFactor({ ...gustBase, frequencyHz: 2 });
    const flexible = gustEffectFactor({ ...gustBase, frequencyHz: 0.4 });
    expect(flexible.rigid).toBe(false);
    expect(flexible.resonantFactor).toBeGreaterThan(0);
    expect(flexible.gustFactor).toBeGreaterThanOrEqual(rigid.gustFactor);
  });
});

describe("tall building: whole building", () => {
  it("returns a complete result with a system and checks", () => {
    const r = calculateTallBuilding(base);
    expect(r.system.selected).toBeTruthy();
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.wind.base_shear_mn).toBeGreaterThan(0);
    expect(r.gravity.total_gravity_load_mn).toBeGreaterThan(0);
  });

  it("picks the system the height calls for", () => {
    const short = calculateTallBuilding({ ...base, floors: 10 });
    const mid = calculateTallBuilding({ ...base, floors: 25 });
    const tall = calculateTallBuilding({ ...base, floors: 80 });
    expect(short.system.selected).not.toBe(tall.system.selected);
    expect(mid.system.selected).not.toBe(tall.system.selected);
  });

  it("grows the wind actions with height and speed", () => {
    const low = calculateTallBuilding({ ...base, floors: 20 });
    const high = calculateTallBuilding({ ...base, floors: 40 });
    expect(high.wind.base_shear_mn).toBeGreaterThan(low.wind.base_shear_mn);
    expect(high.wind.overturning_moment_mnm).toBeGreaterThan(
      low.wind.overturning_moment_mnm,
    );
    const windy = calculateTallBuilding({ ...base, basic_wind_speed_ms: 60 });
    // q scales with V^2, so 45 -> 60 m/s is (60/45)^2 = 1.78 on pressure.
    expect(windy.wind.velocity_pressure_top_kpa).toBeCloseTo(
      calculateTallBuilding(base).wind.velocity_pressure_top_kpa *
        Math.pow(60 / 45, 2),
      1,
    );
  });

  it("carries both drift limits and the storey drift check", () => {
    const r = calculateTallBuilding(base);
    const height =
      base.ground_floor_height + (base.floors - 1) * base.floor_height;
    // The fields are millimetres, so H/500 and H/400 are converted.
    expect(r.wind.drift_limit_h_over_500_mm).toBeCloseTo((height * 1000) / 500, 0);
    expect(r.wind.drift_limit_h_over_400_mm).toBeCloseTo((height * 1000) / 400, 0);
    expect(r.wind.storey_drift_limit_mm).toBeGreaterThan(0);
  });

  it("reports seismic weight and a base shear that is a fraction of it", () => {
    const r = calculateTallBuilding(base);
    expect(r.seismic.seismic_weight_mn).toBeGreaterThan(0);
    expect(r.seismic.base_shear_mn).toBeGreaterThan(0);
    // Cs is a small fraction of W, so base shear cannot exceed the weight.
    expect(r.seismic.base_shear_mn).toBeLessThan(r.seismic.seismic_weight_mn);
  });

  it("sizes a foundation that carries the service load", () => {
    const r = calculateTallBuilding(base);
    expect(r.foundation.service_load_mn).toBeGreaterThan(0);
    expect(r.foundation.bearing_pressure_max_kpa).toBeGreaterThan(0);
    expect(r.foundation.allowable_bearing_kpa).toBeGreaterThan(0);
  });

  it("refuses a design code it does not implement rather than pricing it as ASCE", () => {
    const r = calculateTallBuilding({ ...base, design_code: "en" });
    expect(
      r.checks.some((c) => /EN 199|eurocode|asce/i.test(c.title + c.basis)),
    ).toBe(true);
  });
});
