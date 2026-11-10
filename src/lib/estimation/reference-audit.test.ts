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
