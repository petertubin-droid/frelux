import { describe, expect, it } from "vitest";
import {
  basicSpanDepthRatio,
  computeDesignShearCapacity,
  designBeam,
  ec2MeanTensileStrength,
  minReinforcementArea,
} from "@/lib/engineering/structural-calculator";

/**
 * Audit 4 conformance suite: Concrete & Structural.
 *
 * Every expected value below is computed here from the published clause, not
 * read back from the engine. Where the engine disagrees, the test fails and the
 * finding is recorded in docs/CALCULATOR_AUDIT.md before any code changes.
 */

// IS 456:2000 Table 19, as printed in the code's own notation:
//   tau_c = 0.85 sqrt(0.8 fck) (sqrt(1 + 5 beta) - 1) / (6 beta)
//   beta  = 0.8 fck / (6.89 pt), and beta is taken as 1 when it falls below 1.
const is456TauC = (fck: number, ptPercent: number) => {
  const beta = Math.max((0.8 * fck) / (6.89 * ptPercent), 1);
  return (
    (0.85 * Math.sqrt(0.8 * fck) * (Math.sqrt(1 + 5 * beta) - 1)) / (6 * beta)
  );
};

describe("Concrete & Structural: BS 8110-1 Table 3.9 basic span/depth", () => {
  it("quotes the table values for each support condition", () => {
    // Table 3.9: cantilever 7, simply supported 20, continuous 26.
    expect(basicSpanDepthRatio("cantilever")).toBe(7);
    expect(basicSpanDepthRatio("simply_supported")).toBe(20);
    expect(basicSpanDepthRatio("continuous")).toBe(26);
    expect(basicSpanDepthRatio("fixed")).toBe(26);
  });
});

describe("Concrete & Structural: EN 1992-1-1 Table 3.1 tensile strength", () => {
  it("uses fctm = 0.30 fck^(2/3) up to C50/60", () => {
    // 0.30 x 25^(2/3) = 2.565 MPa; 0.30 x 50^(2/3) = 4.072 MPa.
    expect(ec2MeanTensileStrength(25)).toBeCloseTo(2.565, 2);
    expect(ec2MeanTensileStrength(50)).toBeCloseTo(4.072, 2);
  });

  it("switches to the 2.12 ln(1 + fcm/10) branch above C50/60", () => {
    // fcm = 68 for C60/75, so fctm = 2.12 ln(7.8) = 4.354 MPa.
    expect(ec2MeanTensileStrength(60)).toBeCloseTo(2.12 * Math.log(7.8), 2);
  });
});

describe("Concrete & Structural: minimum tension reinforcement", () => {
  it("applies EN 1992-1-1 9.2.1.1, max(0.26 fctm/fyk, 0.0013)", () => {
    // C30/37, fy 500: fctm = 2.896 MPa, 0.26 x 2.896/500 = 0.1506%.
    const area = minReinforcementArea({
      code: "EUROCODE_2",
      fck: 30,
      fy: 500,
      b: 300,
      d: 500,
    });
    expect(area.ratio).toBeCloseTo(0.001506, 5);
    expect(area.areaMm2).toBeCloseTo(0.001506 * 300 * 500, 0);
  });

  it("applies the 0.13 per cent floor when fctm/fyk falls below it", () => {
    // C20/25, fy 500: 0.26 x 2.21/500 = 0.115%, so the floor governs.
    const area = minReinforcementArea({
      code: "EUROCODE_2",
      fck: 20,
      fy: 500,
      b: 300,
      d: 500,
    });
    expect(area.ratio).toBeCloseTo(0.0013, 6);
  });

  it("applies ACI 318-19 9.6.1.2, max(0.25 sqrt(f'c)/fy, 1.4/fy)", () => {
    // f'c 28 MPa, fy 420: 0.25 x 5.2915/420 = 0.315%, 1.4/420 = 0.333%.
    const area = minReinforcementArea({
      code: "ACI_318",
      fck: 28,
      fy: 420,
      b: 250,
      d: 500,
    });
    expect(area.ratio).toBeCloseTo(1.4 / 420, 6);
    expect(area.areaMm2).toBeCloseTo((1.4 / 420) * 250 * 500, 0);
  });

  it("applies BS 8110-1 Table 3.25: 0.24% for fy 250, 0.13% for fy 460", () => {
    const mild = minReinforcementArea({
      code: "BS_8110",
      fck: 25,
      fy: 250,
      b: 300,
      d: 500,
    });
    const high = minReinforcementArea({
      code: "BS_8110",
      fck: 25,
      fy: 460,
      b: 300,
      d: 500,
    });
    expect(mild.ratio).toBeCloseTo(0.0024, 6);
    expect(high.ratio).toBeCloseTo(0.0013, 6);
  });

  it("applies IS 456:2000 26.5.1.1, 0.85 b d / fy", () => {
    const area = minReinforcementArea({
      code: "IS_456",
      fck: 25,
      fy: 415,
      b: 300,
      d: 500,
    });
    expect(area.ratio).toBeCloseTo(0.85 / 415, 6);
  });
});

describe("Concrete & Structural: concrete shear capacity", () => {
  it("matches EN 1992-1-1 6.2.2 for a section without axial load", () => {
    // bw 300, d 500, fck 30, As 1000: rho = 0.006667, k = 1.632,
    // CRd,c = 0.18/1.5, vRdc = 0.12 x 1.632 x cbrt(20) = 0.5315 MPa.
    const rho = 1000 / (300 * 500);
    const k = Math.min(2, 1 + Math.sqrt(200 / 500));
    const vRdc = Math.max(
      0.035 * Math.pow(k, 1.5) * Math.sqrt(30),
      (0.18 / 1.5) * k * Math.cbrt(100 * rho * 30),
    );
    const res = computeDesignShearCapacity({
      standard: "eurocode_bs",
      bwMm: 300,
      dMm: 500,
      fckOrFcuMpa: 30,
      asMm2: 1000,
    });
    expect(res.vcMpa).toBeCloseTo(vRdc, 1);
    expect(res.vcCapacityKn).toBeCloseTo((vRdc * 300 * 500) / 1000, 0);
  });

  it("matches ACI 318-19 22.5.5.1(a) with no axial force", () => {
    // 0.17 x sqrt(28) = 0.8996 MPa on 250 x 500 = 112.5 kN.
    const res = computeDesignShearCapacity({
      standard: "aci_astm",
      bwMm: 250,
      dMm: 500,
      fckOrFcuMpa: 28,
      asMm2: 942,
    });
    expect(res.vcMpa).toBeCloseTo(0.17 * Math.sqrt(28), 2);
  });

  it("matches IS 456:2000 Table 19 tau_c for M20 at pt = 1.0 per cent", () => {
    // Published table value for M20, pt 1.00: 0.62 N/mm2.
    const res = computeDesignShearCapacity({
      standard: "is_456",
      bwMm: 300,
      dMm: 500,
      fckOrFcuMpa: 20,
      asMm2: 0.01 * 300 * 500,
    });
    expect(res.vcMpa).toBeCloseTo(is456TauC(20, 1.0), 2);
    expect(is456TauC(20, 1.0)).toBeCloseTo(0.62, 2);
  });

  it("matches IS 456:2000 Table 19 tau_c for M25 at pt = 0.5 per cent", () => {
    // 0.49 N/mm2 in the table.
    const res = computeDesignShearCapacity({
      standard: "is_456",
      bwMm: 300,
      dMm: 500,
      fckOrFcuMpa: 25,
      asMm2: 0.005 * 300 * 500,
    });
    expect(res.vcMpa).toBeCloseTo(is456TauC(25, 0.5), 2);
  });

  it("applies the ACI 318-19 axial compression factor with a gross area", () => {
    // Vc = 0.17 sqrt(f'c) (1 + Nu/(14 Ag)) bw d, Ag = 250 x 550 = 137 500 mm2.
    // Nu 500 kN: factor 1 + 500000/(14 x 137500) = 1.2597.
    const Ag = 250 * 550;
    const expected = 0.17 * Math.sqrt(28) * (1 + 500000 / (14 * Ag));
    const res = computeDesignShearCapacity({
      standard: "aci_astm",
      bwMm: 250,
      dMm: 500,
      memberDepthMm: 550,
      fckOrFcuMpa: 28,
      asMm2: 942,
      axialForceKn: 500,
    });
    expect(res.vcMpa).toBeCloseTo(expected, 2);
  });

  it("adds no axial bonus when the gross area is unknown", () => {
    // Without a gross depth the code factor cannot be formed, so the plain
    // concrete term is the only defensible answer.
    const res = computeDesignShearCapacity({
      standard: "aci_astm",
      bwMm: 250,
      dMm: 500,
      fckOrFcuMpa: 28,
      asMm2: 942,
      axialForceKn: 500,
    });
    expect(res.vcMpa).toBeCloseTo(0.17 * Math.sqrt(28), 2);
  });
});

describe("Concrete & Structural: beam sizing statics", () => {
  it("takes the moment and shear from the factored load, not from a table", () => {
    const beam = designBeam({
      span: 6,
      support_width_mm: 300,
      beam_type: "suspended_beam",
      support_condition: "simply_supported",
      live_load: 5,
      dead_load: 10,
      tributary_width: 3,
      concrete_grade: "C25/30",
      steel_grade: "Fe500",
      cover_mm: 25,
    });

    // w = 1.4 x (10 x 3) + 1.6 x (5 x 3) = 42 + 24 = 66 kN/m.
    const w = 1.4 * 30 + 1.6 * 15;
    expect(beam.factored_load).toBeCloseTo(w, 1);
    // M = wL^2/8 and V = wL/2 on the effective span.
    const L = beam.effective_span;
    expect(beam.max_moment).toBeCloseTo((w * L * L) / 8, 0);
    expect(beam.max_shear).toBeCloseTo((w * L) / 2, 0);
  });

  it("never recommends a depth shallower than Table 3.9 allows", () => {
    const beam = designBeam({
      span: 6,
      beam_type: "suspended_beam",
      support_condition: "simply_supported",
      live_load: 5,
      dead_load: 10,
      tributary_width: 3,
      concrete_grade: "C25/30",
      steel_grade: "Fe500",
      cover_mm: 25,
    });
    // Simply supported: basic span/effective depth 20, so d >= L/20.
    expect(beam.recommended_depth).toBeGreaterThanOrEqual(
      (beam.effective_span * 1000) / 20,
    );
    expect(beam.area_steel_required).toBeGreaterThanOrEqual(
      beam.min_steel_area,
    );
  });
});
