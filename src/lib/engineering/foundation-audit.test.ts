/**
 * Regression tests for the heavy/foundation audit fixes (2026-11-12).
 * Every expected value is a hand calculation shown in the test.
 */
import { describe, it, expect } from "vitest";
import {
  designFoundation,
  bearingCapacityFactors,
  terzaghiAllowablePressure,
} from "./foundation-calculator";
import { computeRetainingWallStability } from "../estimation/retaining-wall-engine";
import { calculateEarthwork } from "../estimation/advanced-takeoff-engine";
import {
  calculateDevelopmentLength,
  calculateLapLength,
} from "../estimation/reinforcement-engine";
import { marketBlocksPerM2 } from "../estimation/foundation-engine";

describe("foundation sizing, hand calculated", () => {
  it("strip: 30 kN/m on 150 kPa firm clay -> 300 mm to build", () => {
    const r = designFoundation({
      shape: "strip",
      soil_type: "firm_clay",
      wall_load: 30,
      foundation_depth: 1.0,
      concrete_grade: "C25/30",
      building_length: 10,
      building_width: 8,
    });
    expect(r.required_width).toBeCloseTo(220, 0); // 1.10 x 30 / 150
    expect(r.recommended_width).toBe(300); // practical minimum wins over 250
    expect(r.applied_pressure).toBeCloseTo(110, 0); // 33 / 0.3
    expect(r.excavation_volume).toBeCloseTo(10.8, 1); // 0.3 x 1.0 x 36
    const buildNote = r.formula_transparency.find((f) => f.startsWith("Width to build"));
    expect(buildNote).toBeTruthy();
  });

  it("pad: 200 kN on 100 kPa loose sand -> 1500 mm square", () => {
    const r = designFoundation({
      shape: "pad",
      soil_type: "loose_sand",
      column_load: 200,
      wall_load: 0,
      foundation_depth: 1.2,
      concrete_grade: "C25/30",
      column_width_mm: 225,
    });
    expect(r.recommended_width).toBe(1500);
    expect(r.area_per_pad).toBeCloseTo(2.25, 2);
    expect(r.applied_pressure).toBeCloseTo(97.8, 0); // 220 / 2.25
    const v = (1.4 * 200000) / (4 * (225 + 3 * 250) * 250);
    expect(r.punching_shear_stress!).toBeCloseTo(v, 2);
  });

  it("raft: the 1.10 self-weight allowance is applied to the pressure", () => {
    const r = designFoundation({
      shape: "raft",
      soil_type: "stiff_clay",
      wall_load: 40,
      foundation_depth: 0.6,
      concrete_grade: "C25/30",
      building_length: 10,
      building_width: 8,
    });
    // 40 kN/m x 36 m perimeter = 1440 kN, x1.10 = 1584 kN over 80 m2
    expect(r.applied_pressure).toBeCloseTo(19.8, 1);
    expect(r.formula_transparency.join(" ")).toContain("1.10 × 1440.0 kN");
  });
});

describe("derived (Terzaghi) bearing capacity", () => {
  it("reproduces undrained clay within the table value", () => {
    const t = terzaghiAllowablePressure({
      shape: "strip",
      widthM: 1,
      depthM: 1,
      phiDeg: 0,
      cohesionKpa: 150,
      unitWeightKnM3: 18,
      factorOfSafety: 3,
    });
    // (5.7 x 150 + 18 x 1) / 3 = 291 kPa vs the table's 300
    expect(t.allowable).toBeCloseTo(291, 0);
  });

  it("Nq for 28 degrees is 14.7", () => {
    const f = bearingCapacityFactors(28);
    expect(f.nq).toBeCloseTo(14.72, 1);
    expect(f.ngamma).toBeCloseTo(16.71, 1);
    expect(f.nc).toBeCloseTo(25.80, 1);
  });

  it("a high water table widens the footing", () => {
    const dry = designFoundation({
      shape: "strip",
      soil_type: "loose_sand",
      wall_load: 30,
      foundation_depth: 1.2,
      concrete_grade: "C25/30",
      bearing_method: "terzaghi",
    });
    const wet = designFoundation({
      shape: "strip",
      soil_type: "loose_sand",
      wall_load: 30,
      foundation_depth: 1.2,
      concrete_grade: "C25/30",
      bearing_method: "terzaghi",
      ground_water_depth_m: 0.5,
    });
    expect(wet.recommended_width).toBeGreaterThan(dry.recommended_width);
    expect(wet.bearing_capacity).toBeLessThan(dry.bearing_capacity);
  });
});

describe("retaining wall", () => {
  it("Rankine Ka for wet clay (20 degrees)", () => {
    const s = computeRetainingWallStability(3, 1.5, 0.3, "wet_clay", "block", 0.225);
    const phi = (20 * Math.PI) / 180;
    const ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
    expect(s.ka).toBeCloseTo(ka, 2);
    expect(s.active_thrust_kn_m).toBeCloseTo(0.5 * ka * 19 * 9, 0);
  });

  it("lateritic soil has its own profile (30 degrees)", () => {
    const s = computeRetainingWallStability(3, 1.5, 0.3, "lateritic", "block", 0.225);
    const phi = (30 * Math.PI) / 180;
    const ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
    expect(s.ka).toBeCloseTo(ka, 2);
    expect(s.active_thrust_kn_m).toBeCloseTo(0.5 * ka * 18.5 * 9, 0);
  });
});

describe("earthworks", () => {
  it("average end area, bulking and shrinkage", () => {
    const r = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 20, cutAreaM2: 10, fillAreaM2: 0 },
      ],
      bulkingPercent: 25,
      shrinkagePercent: 15,
      cutSuitableForFill: true,
    });
    expect(r.data!.cutBankM3).toBeCloseTo(200, 5);
    expect(r.data!.cutLooseM3).toBeCloseTo(250, 5);
  });

  it("100 m3 of compacted fill needs 117.65 m3 of bank", () => {
    const r = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 0, fillAreaM2: 10 },
        { chainageM: 10, cutAreaM2: 0, fillAreaM2: 10 },
      ],
      bulkingPercent: 25,
      shrinkagePercent: 15,
      cutSuitableForFill: true,
    });
    expect(r.data!.fillBankEquivalentM3).toBeCloseTo(117.647, 2);
  });
});

describe("BS 8110 anchorage follows both grades", () => {
  it("matches Table 3.27 at fy 460 / fcu 30", () => {
    // 460 / (4 x 0.5 x sqrt30) = 42.0 db -> 672 mm for a 16 mm bar
    expect(calculateDevelopmentLength(16, 30, 460, true, "bs8110")).toBe(672);
  });

  it("is longer on C20 concrete, which the old fixed 40db ignored", () => {
    const c20 = calculateDevelopmentLength(16, 20, 460, true, "bs8110");
    const c30 = calculateDevelopmentLength(16, 30, 460, true, "bs8110");
    expect(c20).toBe(823);
    expect(c20).toBeGreaterThan(c30);
  });

  it("is longer for 500 MPa steel", () => {
    expect(calculateDevelopmentLength(20, 30, 500, true, "bs8110")).toBe(913);
  });

  it("a lap inherits the grade-aware anchorage", () => {
    const anchorage = calculateDevelopmentLength(16, 20, 460, true, "bs8110");
    expect(calculateLapLength(16, 20, 460, true, "bs8110")).toBe(
      Math.ceil(Math.max(250, anchorage * 1.15)),
    );
  });
});

describe("market block defaults", () => {
  it("uses the local block face, not Nigeria's", () => {
    const ng = marketBlocksPerM2("NG")!;
    const us = marketBlocksPerM2("US")!;
    expect(ng.value).toBeCloseTo(9.13, 1);
    expect(us.value).toBeCloseTo(11.13, 1);
    expect(marketBlocksPerM2("ZZ")).toBeNull();
  });
});
