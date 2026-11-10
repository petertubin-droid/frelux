/**
 * Reference audit: Building Structure and Building Services engines.
 *
 * Every number here is an independent, published value, not a snapshot of what
 * the engine currently returns. A failure means the engine has drifted away from
 * its own source, which is the only kind of error that reaches a customer as a
 * wrong quantity of steel, cable or concrete.
 *
 * The references, by engine:
 *
 * Structure
 * · Reinforcement: unit mass = pi/4 d^2 x 7850 kg/m3 (BS 8666 / EN 10080 nominal
 *   mass, the d^2/162.2 rule), bend allowance per BS 8666, anchorage per
 *   EN 1992-1-1 8.4.4 and ACI 318-19 Table 25.4.2.3, lap per EN 1992-1-1 8.7.3.
 * · Steel: published nominal masses, IPE 150 = 14.0, IPE 200 = 22.4,
 *   UB 203x133x30 = 30.0 kg/m (EN 10365 / Advance section tables).
 * · Masonry: module count = 1 / ((L + joint)(H + joint)), mortar dry factor 1.33,
 *   concrete dry factor 1.54, cement loose bulk density 1440 kg/m3.
 * · Paving: paver count on nominal face plus joint.
 *
 * Services
 * · Electrical: BS 7671 Table 4D5 clipped-direct capacities for 70 C
 *   thermoplastic multicore, and the 3% / 5% voltage-drop limits of
 *   Appendix 4 section 6 (BS 7671 525).
 * · Water: Hazen-Williams, SI form hf = 10.67 L Q^1.852 / (C^1.852 D^4.87).
 * · Drainage: BS EN 752 / Part H self-cleansing gradients, 1:80 at DN110 and
 *   1:150 at DN160.
 * · Septic: retention sizing on the design flow, with freeboard on top.
 */
import { describe, expect, it } from "vitest";
import {
  bendDeductionMm,
  bs8666MandrelDiameterMm,
  calculateDevelopmentLength,
  calculateLapLength,
  rebarKgPerMetre,
} from "./reinforcement-engine";
import { STEEL_PROFILES } from "./steel-beam-engine";
import { calculatePavingTakeoff } from "./paving-standalone-engine";
import {
  selectBreaker,
  COPPER_AMPACITY_A,
  STANDARD_MCB_RATINGS_A,
  VOLTAGE_DROP_LIMITS,
  voltageDropPercent,
} from "./electrical-engine";
import { calculateHazenWilliamsFrictionHead } from "./borehole-water-system-engine";
import { calculateSepticSizing } from "./septic-sizing-engine";
import { MORTAR_PARTS, wallThicknessForLeaves } from "./masonry-standalone-engine";
import { designFoundation } from "@/lib/engineering/foundation-calculator";
import { calculateRoofFraming } from "./advanced-takeoff-engine";
import { calculateSolarPv } from "./solar-pv-engine";
import { calculatePlumbingEngineeringMetrics } from "./plumbing-engine";
import { calculateDrainageTakeoff } from "./drainage-standalone-engine";

describe("reinforcement: nominal mass per metre", () => {
  // pi/4 d^2 x 7850 / 1e6 kg/m, the same rule as the d^2/162 shortcut.
  it.each([
    [8, 0.3944],
    [10, 0.6165],
    [12, 0.8878],
    [16, 1.5783],
    [20, 2.4662],
    [25, 3.8534],
    [32, 6.3133],
  ])("bar %i mm weighs %f kg/m", (diameter, expected) => {
    expect(rebarKgPerMetre(diameter)).toBeCloseTo(expected, 3);
  });
});

describe("reinforcement: BS 8666 bend allowance", () => {
  it("deducts the standard allowance for a 90 degree bend", () => {
    const d = 16;
    const r = bs8666MandrelDiameterMm(d) / 2;
    const theta = Math.PI / 2;
    const expected = 2 * (r + d) * Math.tan(theta / 2) - theta * (r + d / 2);
    expect(bendDeductionMm(d, 90)).toBeCloseTo(expected, 6);
  });

  it("scales with the bar, never returning a negative allowance", () => {
    expect(bendDeductionMm(20, 90)).toBeGreaterThan(bendDeductionMm(12, 90));
    expect(bendDeductionMm(12, 180)).toBeGreaterThanOrEqual(0);
  });
});

describe("reinforcement: anchorage and laps", () => {
  it("anchors a 16 mm B500 bar in C25/30 at the Eurocode value", () => {
    // fctd = 0.21 fck^(2/3)/1.5 = 1.197 MPa, fbd = 2.25 fctd, lb,rqd = 646 mm.
    expect(calculateDevelopmentLength(16, 25, 500, true, "eurocode")).toBe(646);
  });

  it("uses the No. 6 divisor for small ACI bars and No. 7 above", () => {
    // 12 mm (No. 4) in 3000 psi at 500 MPa: fy db / (25 sqrt f'c) = 636 mm.
    expect(calculateDevelopmentLength(12, 3000, 500, true, "aci")).toBe(636);
    // 25 mm (No. 8): the 20 divisor applies, 1656 mm.
    expect(calculateDevelopmentLength(25, 3000, 500, true, "aci")).toBe(1656);
  });

  it("never returns a splice shorter than its anchorage", () => {
    for (const code of ["eurocode", "aci", "bs8110"] as const) {
      for (const d of [10, 16, 25]) {
        const anchorage = calculateDevelopmentLength(d, 25, 500, true, code);
        const lap = calculateLapLength(d, 25, 500, true, code, false);
        expect(lap).toBeGreaterThanOrEqual(anchorage);
      }
    }
  });

  it("lengthens the lap when more than half the bars lap in one section", () => {
    const few = calculateLapLength(16, 25, 500, true, "eurocode", false);
    const many = calculateLapLength(16, 25, 500, true, "eurocode", true);
    expect(many).toBeGreaterThan(few);
  });
});

describe("steel: published profile masses", () => {
  it("carries the nominal kg/m of each section", () => {
    const byKey = Object.fromEntries(
      STEEL_PROFILES.map((p) => [p.key, p.kg_per_m]),
    );
    expect(byKey.ipe_150).toBe(14);
    expect(byKey.ipe_200).toBe(22.4);
    expect(byKey.ub_203_133_30).toBe(30);
  });
});

describe("masonry: module and mix basis", () => {
  it("keeps the one-to-four default mix available", () => {
    expect(MORTAR_PARTS["1:4"]).toEqual({ cement: 1, sand: 4 });
    expect(MORTAR_PARTS["1:6"].sand).toBe(6);
  });

  it("turns a leaf count into a real wall thickness", () => {
    // One 225 mm leaf, and a two leaf 225 + 10 joint + 225 wall.
    expect(wallThicknessForLeaves(225, 10, 1)).toBe(225);
    expect(wallThicknessForLeaves(225, 10, 2)).toBe(460);
  });
});

describe("paving: paver count on nominal face plus joint", () => {
  it("counts 200 x 100 pavers at 3 mm joints with 5% waste", () => {
    const result = calculatePavingTakeoff({
      marketCode: "NG",
      areaM2: 100,
      paverLengthMm: 200,
      paverWidthMm: 100,
      jointWidthMm: 3,
      wastePercent: 5,
      beddingDepthMm: 30,
      subbaseDepthMm: 150,
    });
    // 1 / (0.203 x 0.103) = 47.83 pavers/m2, so 100 m2 plus 5% is 5,022.
    expect(result.paversRequired).toBe(5022);
    expect(result.beddingSandVolumeM3).toBeCloseTo(3.15, 2);
    expect(result.looseSubbaseVolumeM3).toBeCloseTo(18.75, 2);
  });
});

describe("electrical: BS 7671 tables and limits", () => {
  it("carries the Table 4D5 capacities for clipped direct multicore", () => {
    const table = Object.fromEntries(COPPER_AMPACITY_A);
    expect(table[1.5]).toBe(19.5);
    expect(table[2.5]).toBe(27);
    expect(table[4]).toBe(36);
    expect(table[6]).toBe(46);
    expect(table[10]).toBe(63);
    expect(table[16]).toBe(85);
    expect(table[25]).toBe(112);
    expect(table[35]).toBe(138);
    expect(table[50]).toBe(168);
  });

  it("holds the 3% lighting and 5% power drop limits", () => {
    expect(VOLTAGE_DROP_LIMITS.lighting).toBe(3);
    expect(VOLTAGE_DROP_LIMITS.power).toBe(5);
  });

  it("drops about 2% over 20 m of 2.5 mm2 carrying 3 kW at 230 V", () => {
    const verdict = voltageDropPercent({
      run_m: 20,
      load_watts: 3000,
      voltage: 230,
      cross_section_mm2: 2.5,
      power_factor: 1,
    });
    // 2 x 20 m x 13.04 A x 0.0172..0.0225 = 3.6..4.7 V on 230 V.
    expect(verdict.drop_percent).toBeGreaterThan(1.4);
    expect(verdict.drop_percent).toBeLessThan(2.4);
    expect(verdict.passes).toBe(true);
  });

  it("selects the smallest standard breaker above the design current", () => {
    const verdict = selectBreaker({
      design_current_a: 13,
      cable_ampacity_a: 19.5,
    });
    expect(verdict.rating_a).toBe(16);
    expect(verdict.complies).toBe(true);
    expect(STANDARD_MCB_RATINGS_A).toContain(16);
  });
});

describe("water: Hazen-Williams SI form", () => {
  it("gives 1.86 m of head for 1 m3/h through 100 m of 25 mm at C = 140", () => {
    expect(calculateHazenWilliamsFrictionHead(100, 1, 25, 140)).toBeCloseTo(
      1.859,
      2,
    );
  });

  it("rises with flow and falls with bore", () => {
    const base = calculateHazenWilliamsFrictionHead(100, 1, 25, 140);
    expect(calculateHazenWilliamsFrictionHead(100, 2, 25, 140)).toBeGreaterThan(
      base * 3,
    );
    expect(calculateHazenWilliamsFrictionHead(100, 1, 32, 140)).toBeLessThan(
      base / 2,
    );
  });
});

describe("septic: retention sizing", () => {
  it("sizes 6 occupants at 180 L and 2 days retention to 2.16 m3", () => {
    const result = calculateSepticSizing({
      marketCode: "NG",
      occupants: 6,
      designFlowLitresPerPersonPerDay: 180,
      retentionDays: 2,
      freeboardPercent: 0,
    });
    expect(result.dailyDesignFlowLitres).toBe(1080);
    expect(result.tankWorkingVolumeM3).toBeCloseTo(2.16, 2);
    expect(result.tankWorkingVolumeGallons).toBeCloseTo(570.6, 0);
  });

  it("adds freeboard on top of the working volume", () => {
    const result = calculateSepticSizing({
      marketCode: "NG",
      occupants: 6,
      designFlowLitresPerPersonPerDay: 180,
      retentionDays: 2,
      freeboardPercent: 10,
    });
    expect(result.tankTotalVolumeM3).toBeCloseTo(2.376, 2);
  });
});

describe("foundation: bearing pressure includes the footing it sized", () => {
  it("sizes a strip footing on 150 kN/m2 for a 50 kN/m wall", () => {
    // 1.10 x 50 / 150 = 0.367 m, rounded up to the next 50 mm.
    const design = designFoundation({
      shape: "strip",
      soil_type: "custom",
      custom_bearing_capacity: 150,
      wall_load: 50,
      foundation_depth: 1,
      concrete_grade: "C25",
      building_length: 10,
      building_width: 8,
    });
    expect(design.recommended_width).toBe(400);
    // The check weighs the same 1.10 the width was sized with: 55 / 0.4.
    expect(design.applied_pressure).toBeCloseTo(137.5, 1);
    expect(design.bearing_check_pass).toBe(true);
  });

  it("sizes a square pad and keeps the pressure under the allowable", () => {
    const design = designFoundation({
      shape: "pad",
      soil_type: "custom",
      custom_bearing_capacity: 150,
      wall_load: 0,
      column_load: 300,
      column_width_mm: 225,
      foundation_depth: 1,
      concrete_grade: "C25",
    });
    // 1.10 x 300 = 330 kN / 150 = 2.2 m2, so a 1.5 m pad on 2.25 m2.
    expect(design.recommended_width).toBe(1500);
    expect(design.applied_pressure).toBeCloseTo(146.7, 1);
    expect(design.bearing_check_pass).toBe(true);
  });

  it("divides an ultimate bearing value by the safety factor", () => {
    const design = designFoundation({
      shape: "strip",
      soil_type: "custom",
      custom_bearing_capacity: 300,
      custom_capacity_is_ultimate: true,
      safety_factor: 3,
      wall_load: 50,
      foundation_depth: 1,
      concrete_grade: "C25",
    });
    expect(design.bearing_capacity).toBe(100);
  });
});

describe("roof framing: trigonometry and board feet", () => {
  const sections = {
    common: { widthIn: 2, depthIn: 6 },
    jack: { widthIn: 2, depthIn: 6 },
    hip: { widthIn: 2, depthIn: 8 },
    ridge: { widthIn: 2, depthIn: 8 },
  };

  it("raises a 6/12 gable to 26.57 degrees and spans it with 5.03 m rafters", () => {
    const result = calculateRoofFraming({
      lengthM: 10,
      widthM: 8,
      pitchRisePer12: 6,
      overhangM: 0.5,
      spacingM: 0.6,
      roofType: "gable",
      sections,
    });
    if (!result.ok || result.data === null) throw new Error("roof framing refused");
    // Half of (8 + 2 x 0.5) = 4.5 m run, so 4.5 / cos(26.565) = 5.031 m.
    expect(result.data.roofRiseM).toBeCloseTo(2.25, 2);
    const common = result.data.groups.find((g) => g.label.toLowerCase().includes("common"));
    expect(common).toBeDefined();
    expect(common!.lengthM).toBeCloseTo(5.03, 1);
  });

  it("counts a 2 x 6 member as 1.0 board foot per foot", () => {
    const result = calculateRoofFraming({
      lengthM: 10,
      widthM: 8,
      pitchRisePer12: 6,
      overhangM: 0.5,
      spacingM: 0.6,
      roofType: "gable",
      sections,
    });
    if (!result.ok || result.data === null) throw new Error("roof framing refused");
    const common = result.data.groups.find((g) => g.label.toLowerCase().includes("common"))!;
    // 2 x 6 x 12 in = 1 BF per running foot of member.
    expect(common.boardFeet / (common.lengthM * 3.28084 * common.count)).toBeCloseTo(1, 2);
  });
});

const SOLAR_RULES = [
  { rule_key: "peak_sun_hours_day", rule_value: { value: 5.0 } },
  { rule_key: "system_loss_factor", rule_value: { value: 0.2 } },
  { rule_key: "inverter_dc_ac_ratio", rule_value: { value: 1.15 } },
  { rule_key: "rails_per_panel", rule_value: { value: 2 } },
  { rule_key: "mid_clamps_per_panel", rule_value: { value: 2 } },
  { rule_key: "end_clamps_per_panel", rule_value: { value: 4 } },
  { rule_key: "mc4_pairs_per_panel", rule_value: { value: 1 } },
  { rule_key: "dc_cable_per_panel_m", rule_value: { value: 2 } },
  { rule_key: "string_size_max", rule_value: { value: 10 } },
  { rule_key: "labor_cost_per_panel_naira", rule_value: { value: 15000 } },
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
];

describe("solar: yield is kWp x sun hours x derate", () => {
  it("converts 100 m2 of roof into array, daily energy and inverter", () => {
    const result = calculateSolarPv({
      mode: "roof_area",
      panel: {
        watt_peak: 550,
        length_m: 2.278,
        width_m: 1.134,
        unit_price_naira: null,
      },
      usable_roof_area_m2: 100,
      cable_run_m: 20,
      // No configured prices: quantities still compute, totals stay unclaimed.
      prices: {},
      rules: SOLAR_RULES,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100 / 2.58 m2 = 38 whole panels, 20.9 kWp, on a 5 sun hour day at 20%
    // system loss (the configured default) = 83.6 kWh/day.
    expect(result.panel_count).toBe(38);
    expect(result.array_kwp).toBeCloseTo(20.9, 1);
    expect(result.daily_energy_kwh).toBeCloseTo(result.array_kwp! * 5 * 0.8, 1);
  });
});

describe("plumbing: fixture units to peak flow", () => {
  it("reads 4 taps, 1 sink, 2 showers and 3 WCs as a 1.85 L/s peak", () => {
    const metrics = calculatePlumbingEngineeringMetrics({
      taps: 4,
      sinks: 1,
      showers: 2,
      wcs: 3,
      floor_drains: 2,
    });
    // 4 x 1.0 + 1 x 1.5 + 2 x 2.0 + 3 x 2.5 = 17 WSFU.
    expect(metrics.total_wsfu).toBeCloseTo(17, 3);
    // Above 10 units the curve is 0.4 x WSFU^0.55 = 1.85 L/s.
    expect(metrics.peak_flow_lps).toBeCloseTo(0.4 * Math.pow(17, 0.55), 2);
    // 1.85 L/s at 1.8 m/s needs a bore above 36 mm, so 40 mm PPR.
    expect(metrics.required_bore_mm).toBeGreaterThan(30);
  });
});

describe("drainage: self-cleansing gradients", () => {
  it("warns when a 110 mm run falls flatter than 1:80", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 5 }],
    });
    const text = JSON.stringify(result);
    expect(text).toMatch(/12\.5 mm\/m/);
  });

  it("stays quiet when the gradient is adequate", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 20 }],
    });
    expect(JSON.stringify(result)).not.toMatch(/below the 12\.5/);
  });
});
