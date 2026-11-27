import { describe, expect, it } from "vitest";
import {
  calculateGlobalRebarWeight,
  ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT,
  calculateGlobalConcrete,
  type ConcreteMixRatio,
} from "../universal-construction-math";
import { designConcreteCapacity } from "../../engineering/design-code-concrete";
import { computeRetainingWallStability } from "../../estimation/retaining-wall-engine";
import { boresFor, sizePipe } from "../../estimation/pipe-sizing-engine";
import { calculateSepticSizing } from "../../estimation/septic-sizing-engine";
import {
  calculateManningGravityFlow,
  calculateDrainageTakeoff,
} from "../../estimation/drainage-standalone-engine";
import {
  STEEL_PROFILE_BY_KEY,
  steelMassKg,
} from "../../estimation/steel-beam-engine";
import { verifyConduitFill } from "../../estimation/conduit-wiring-engine";
import { calculateUpcIpcWaterSupply } from "../../estimation/plumbing-standards-engine";

describe("Universal Construction Math: ASTM Imperial Rebar Standards", () => {
  it("verifies ASTM A615 Table 1 nominal unit weights across all standard bar sizes", () => {
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[3]).toBe(0.376);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[4]).toBe(0.668);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[5]).toBe(1.043);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[6]).toBe(1.502);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[7]).toBe(2.044);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[8]).toBe(2.670);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[9]).toBe(3.400);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[10]).toBe(4.303);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[11]).toBe(5.313);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[14]).toBe(7.650);
    expect(ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[18]).toBe(13.600);
  });

  it("calculates imperial rebar weight using exact ASTM table when opted in", () => {
    // 20 ft of #10 bar (ASTM 4.303 lb/ft vs formula 4.167 lb/ft)
    const tableResult = calculateGlobalRebarWeight(10, 20, "imperial", {
      standardTable: true,
    });
    expect(tableResult.unitWeightPerUnitLength).toBe(4.303);
    expect(tableResult.weight).toBe(86.06);

    // 20 ft of #4 bar
    const tableResult4 = calculateGlobalRebarWeight(4, 20, "imperial", {
      standardTable: true,
    });
    expect(tableResult4.unitWeightPerUnitLength).toBe(0.668);
    expect(tableResult4.weight).toBe(13.36);
  });

  it("emits dual Metric and North American Imperial concrete constituent takeoff", () => {
    const mix: ConcreteMixRatio = [1, 2, 4];
    const res = calculateGlobalConcrete(10, mix, "1:2:4 Grade 20 Concrete");

    // Metric validation
    expect(res.wetVolumeM3).toBe(10);
    expect(res.dryVolumeM3).toBe(15.4);
    expect(res.cementMetricTons).toBeGreaterThan(3);

    // Imperial validation
    expect(res.wetVolumeYd3).toBeCloseTo(13.08, 1);
    expect(res.dryVolumeYd3).toBeCloseTo(20.14, 1);
    expect(res.cementLbs).toBeGreaterThan(6000);
    expect(res.cementBags94lb).toBe(Math.ceil(res.cementLbs / 94));
    expect(res.sandCubicYards).toBeGreaterThan(0);
    expect(res.gravelCubicYards).toBeGreaterThan(0);
  });
});

describe("Concrete Design Codes: ACI 318-19 & BS 8110 Rigor", () => {
  it("computes code-exact beta1 and net tensile strain epsilon_t for ACI 318-19", () => {
    // High strength concrete f'c = 42 MPa (> 28 MPa):
    // beta1 = 0.85 - 0.05 * (42 - 28) / 7 = 0.85 - 0.10 = 0.75
    const rHigh = designConcreteCapacity({
      code: "ACI_318",
      b: 300,
      d: 500,
      As: 1200,
      fck: 42,
      fy: 420,
    });
    expect(rHigh.formulaTransparency.some((line) => line.includes("beta1 = 0.750"))).toBe(true);
    expect(rHigh.capacityFactor).toBe(0.9); // tension controlled
  });

  it("reduces phi in the transition zone when epsilon_t < 0.005 per ACI 318-19 Table 21.2.2", () => {
    // Heavily reinforced section: As = 2400 mm2, b = 250, d = 450, fck = 28, fy = 420
    const rTrans = designConcreteCapacity({
      code: "ACI_318",
      b: 250,
      d: 450,
      As: 2400,
      fck: 28,
      fy: 420,
    });
    expect(rTrans.capacityFactor).toBeLessThan(0.90);
    expect(rTrans.capacityFactor).toBeGreaterThan(0.65);
    expect(rTrans.warnings.some((w) => w.includes("over-reinforced"))).toBe(true);
  });

  it("strictly enforces BS 8110-1:1997 Cl 3.4.4.4 lever arm cap (z <= 0.95d)", () => {
    // Lightly reinforced beam: As = 200 mm2, b = 300, d = 500, fck = 30, fy = 500
    // xu = 0.87*500*200 / (0.405*30*300) = 87000 / 3645 = 23.87 mm
    // zUncapped = 500 - 0.45*23.87 = 489.26 mm > 0.95*500 (475 mm)
    // z must be capped at 475 mm!
    const rBs = designConcreteCapacity({
      code: "BS_8110",
      b: 300,
      d: 500,
      As: 200,
      fck: 30,
      fy: 500,
    });
    expect(rBs.leverArmMm).toBe(475);
    expect(rBs.flexuralCapacityKNm).toBeCloseTo((0.87 * 500 * 200 * 475) / 1e6, 1);
  });
});

describe("Geotechnical Engineering: Retaining Wall Stability", () => {
  it("calculates realistic triangular ground pressure on heel liftoff (e > B/6)", () => {
    // Wall with retained height H = 2.2 m and base B = 1.0 m:
    // Resultant falls within base (x_bar ~ 0.197 m > 0) but outside middle third (e ~ 0.303 m > B/6 = 0.167 m)
    const res = computeRetainingWallStability(
      2.2,
      1.0,
      0.25,
      "loose_sand",
      "block",
      0.23,
    );
    expect(res.middle_third_pass).toBe(false);
    expect(res.max_bearing_pressure_kpa).toBeCloseTo(75.4, 0);
    expect(res.eccentricity_m).toBeGreaterThan(0.167);
  });
});

describe("Building Services: Pipe Sizing Across Global Families", () => {
  it("supports PEX and PVC pipe families alongside Copper and PPR", () => {
    const pexBores = boresFor("pex");
    expect(pexBores.length).toBeGreaterThanOrEqual(6);
    expect(pexBores.some((b) => b.label.includes("1/2-inch PEX"))).toBe(true);

    const pvcBores = boresFor("pvc");
    expect(pvcBores.length).toBeGreaterThanOrEqual(6);
    expect(pvcBores.some((b) => b.label.includes("PVC (Sch 40)"))).toBe(true);
  });

  it("sizes PEX pipe accurately based on internal diameter", () => {
    // 0.5 L/s flow with 1.5 m/s velocity limit:
    // required bore = sqrt((4 * 0.5 * 1000) / (pi * 1.5)) = sqrt(424.4) = 20.6 mm
    // Smallest passing bore is 1-inch PEX (inner_mm: 22.2 mm, velocity = 1.29 m/s <= 1.5 m/s)
    const res = sizePipe({
      flow_lps: 0.5,
      velocity_limit_mps: 1.5,
      family: "pex",
    });
    expect(res.feasible).toBe(true);
    expect(res.chosen?.label).toBe("1-inch PEX");
    expect(res.chosen?.inner_mm).toBe(22.2);
  });
});

describe("Sanitary & Drainage: Septic Dual-Units & Manning Equation", () => {
  it("provides exact UK/Imperial gallon capacity alongside US gallons", () => {
    const res = calculateSepticSizing({
      marketCode: "GB",
      occupants: 6,
      designFlowLitresPerPersonPerDay: 150,
      retentionDays: 1,
      storageAllowanceDays: 1,
      freeboardPercent: 20,
    });
    // 900 L/day
    expect(res.dailyDesignFlowLitres).toBe(900);
    expect(res.dailyDesignFlowGallons).toBeCloseTo(900 * 0.264172, 1);
    expect(res.dailyDesignFlowImperialGallons).toBeCloseTo(900 * 0.219969, 1);
    // Imperial gallons are ~80% of US gallons (1 US gal = 0.83267 Imp gal)
    expect(res.dailyDesignFlowImperialGallons).toBeLessThan(res.dailyDesignFlowGallons);
  });

  it("calculates gravity drainage velocity and flow using Manning's equation", () => {
    // 110 mm pipe (0.110 m) at 1 in 80 slope (12.5 mm/m) half-full:
    const flow = calculateManningGravityFlow(110, 12.5, 0.010, 0.5);
    expect(flow).not.toBeNull();
    expect(flow?.velocityMPerS).toBeCloseTo(1.02, 1);
    expect(flow?.isSelfCleansing).toBe(true); // >= 0.75 m/s
    expect(flow?.isScourSafe).toBe(true); // <= 3.0 m/s
    expect(flow?.flowRateLitresPerSecond).toBeGreaterThan(4);
  });

  it("warns when 50 mm branch pipe has less than 1 in 48 (20.8 mm/m) fall per IPC 704.1", () => {
    const res = calculateDrainageTakeoff({
      marketCode: "US",
      runs: [{ lengthM: 5, pipeDiameterMm: 50, fallMmPerM: 10 }], // 10 mm/m is 1 in 100 (too flat)
    });
    expect(res.cautions.some((c) => c.includes("50 mm run falls 10 mm/m, below the 20.8 mm/m"))).toBe(true);
  });
});

describe("Structural Steel: Global Profiles (AISC W-Shapes & Euronorm HEA/HEB)", () => {
  it("carries American AISC W-Shapes with correct nominal weights", () => {
    const w8_15 = STEEL_PROFILE_BY_KEY.w8_15;
    expect(w8_15).toBeDefined();
    expect(w8_15.kg_per_m).toBe(22.3);

    const w10_22 = STEEL_PROFILE_BY_KEY.w10_22;
    expect(w10_22).toBeDefined();
    expect(w10_22.kg_per_m).toBe(32.7);
  });

  it("computes steel mass accurately for AISC W-Shape beam", () => {
    // 5m span + 0.3m bearing allowance = 5.3m cut length
    // 2 beams of W8x15 (22.3 kg/m): 5.3 * 2 * 22.3 = 236.38 kg
    const mass = steelMassKg({
      profile: "w8_15",
      span_m: 5,
      beam_count: 2,
      price_per_tonne: 1200,
      columns_included: false,
    });
    expect(mass).toBeCloseTo(236.38, 1);
  });
});

describe("Electrical & Plumbing Standards: NEC Conduit Fill & Hunter's Curve", () => {
  it("verifies electrical conduit fill percentage per NEC Chapter 9 Table 1 / BS 7671", () => {
    // 20 mm inner diameter conduit (Area = pi * 20^2 / 4 = 314.16 mm2)
    // Three 3.0 mm OD conductors (Area = 3 * pi * 3^2 / 4 = 21.2 mm2): fill = 6.75% <= 40%
    const pass = verifyConduitFill(20, [{ count: 3, outerDiameterMm: 3.0 }]);
    expect(pass?.passesCode).toBe(true);
    expect(pass?.maxAllowedFillPercentage).toBe(40);
    expect(pass?.fillPercentage).toBeGreaterThanOrEqual(6.7);
    expect(pass?.fillPercentage).toBeLessThanOrEqual(6.8);

    // Overcrowded conduit: ten 6.0 mm OD cables (Area = 10 * pi * 36 / 4 = 282.7 mm2): fill = 90% > 40%
    const fail = verifyConduitFill(20, [{ count: 10, outerDiameterMm: 6.0 }]);
    expect(fail?.passesCode).toBe(false);
    expect(fail?.warning).toContain("exceeding code maximum 40%");
  });

  it("calculates peak water supply flow rate from WSFU using Hunter's Curve per IPC / UPC", () => {
    // Single family house: 3 WCs, 3 lavatories, 2 showers, 1 kitchen sink, 1 dishwasher, 1 clothes washer
    const fixtures = {
      water_closets: 3, // 3 * 2.2 = 6.6
      lavatories: 3, // 3 * 1.0 = 3.0
      showers: 2, // 2 * 1.4 = 2.8
      kitchen_sinks: 1, // 1.4
      dishwashers: 1, // 1.4
      clothes_washers: 1, // 1.4
    };
    // Total WSFU = 6.6 + 3.0 + 2.8 + 1.4 + 1.4 + 1.4 = 16.6 WSFU
    const supply = calculateUpcIpcWaterSupply(fixtures, "flush_tank");
    expect(supply.total_wsfu).toBe(16.6);
    expect(supply.peak_flow_gpm).toBeGreaterThan(10);
    expect(supply.peak_flow_lps).toBeGreaterThan(0.6);
    expect(supply.recommended_service_pipe_inches).toBe('1"');
  });
});
