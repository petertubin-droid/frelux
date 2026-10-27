import { describe, expect, it } from "vitest";
import {
  JURISDICTION_CODES,
  defaultJurisdictionForMarket,
  designBeam,
  designSlab,
  ec2MeanTensileStrength,
  jurisdictionStandard,
  minReinforcementArea,
  minReinforcementRatio,
  type BeamDesignInput,
} from "./structural-calculator";

describe("jurisdictional code mode", () => {
  it("exposes the four selectable codes with their governing documents", () => {
    expect(Object.keys(JURISDICTION_CODES)).toEqual([
      "ACI_318",
      "EUROCODE_2",
      "BS_8110",
      "IS_456",
    ]);
    expect(JURISDICTION_CODES.EUROCODE_2.governingCode).toBe("BS EN 1992-1-1");
    expect(JURISDICTION_CODES.BS_8110.standard).toBe("eurocode_bs");
    expect(JURISDICTION_CODES.ACI_318.standard).toBe("aci_astm");
  });

  it("maps markets to the code that governs them", () => {
    expect(defaultJurisdictionForMarket("US")).toBe("ACI_318");
    expect(defaultJurisdictionForMarket("IN")).toBe("IS_456");
    expect(defaultJurisdictionForMarket("GB")).toBe("EUROCODE_2");
    expect(defaultJurisdictionForMarket("NL")).toBe("EUROCODE_2");
    expect(defaultJurisdictionForMarket("NG")).toBe("BS_8110");
    expect(defaultJurisdictionForMarket("GH")).toBe("BS_8110");
    expect(defaultJurisdictionForMarket(undefined)).toBe("BS_8110");
  });

  it("keeps ACI and Eurocode minimum ratios distinct", () => {
    const aci = minReinforcementRatio({ code: "ACI_318", fck: 25, fy: 410 });
    const ec2 = minReinforcementRatio({ code: "EUROCODE_2", fck: 25, fy: 410 });
    expect(aci.percent).toBeCloseTo(0.3415, 3); // 1.4/fy governs
    expect(ec2.percent).toBeCloseTo(0.1626, 3); // 0.26 x 2.565 / 410
    expect(aci.ratio).toBeGreaterThan(ec2.ratio);
    expect(aci.clause).toContain("9.6.1.2");
    expect(ec2.clause).toContain("9.2.1.1");
  });

  it("applies the 0.13% Eurocode floor when tension strength is low", () => {
    const ec2 = minReinforcementRatio({ code: "EUROCODE_2", fck: 20, fy: 500 });
    expect(ec2.percent).toBeCloseTo(0.13, 3);
    expect(ec2.formula).toContain("floor governs");
  });

  it("uses BS 8110 Table 3.25 percentages by steel grade", () => {
    const low = minReinforcementRatio({ code: "BS_8110", fck: 30, fy: 250 });
    const high = minReinforcementRatio({ code: "BS_8110", fck: 30, fy: 500 });
    expect(low.percent).toBeCloseTo(0.24, 3);
    expect(high.percent).toBeCloseTo(0.13, 3);
  });

  it("uses the IS 456 0.85/fy rule", () => {
    const is456 = minReinforcementRatio({ code: "IS_456", fck: 25, fy: 410 });
    expect(is456.percent).toBeCloseTo(0.2073, 3);
    expect(is456.formula).toContain("0.85 b d / fy");
  });

  it("derives EC2 mean tensile strength with the high-strength branch", () => {
    expect(ec2MeanTensileStrength(30)).toBeCloseTo(2.896, 2);
    expect(ec2MeanTensileStrength(60)).toBeGreaterThan(4.0);
  });

  it("computes area from the governing ratio, not a hard-coded percentage", () => {
    const aci = minReinforcementArea({
      code: "ACI_318",
      fck: 30,
      fy: 500,
      b: 230,
      d: 450,
    });
    // max(0.25*sqrt(30), 1.4)/500 = 0.0028 -> x 230 x 450
    expect(aci.areaMm2).toBeCloseTo(289.83, 0);
    const is456 = minReinforcementArea({
      code: "IS_456",
      fck: 30,
      fy: 500,
      b: 230,
      d: 450,
    });
    expect(is456.areaMm2).toBeCloseTo((0.85 / 500) * 230 * 450, 1);
  });

  it("refuses a non-positive yield strength instead of inventing a ratio", () => {
    expect(() =>
      minReinforcementRatio({ code: "ACI_318", fck: 25, fy: 0 }),
    ).toThrow(/positive/);
  });

  it("maps a jurisdiction to the concrete family it designs with", () => {
    expect(jurisdictionStandard("ACI_318")).toBe("aci_astm");
    expect(jurisdictionStandard("IS_456")).toBe("is_456");
    expect(jurisdictionStandard("EUROCODE_2")).toBe("eurocode_bs");
    expect(jurisdictionStandard("BS_8110")).toBe("eurocode_bs");
  });
});

describe("designBeam / designSlab code mode", () => {
  const beam: BeamDesignInput = {
    span: 5,
    beam_type: "suspended_beam",
    support_condition: "simply_supported",
    live_load: 3,
    dead_load: 2,
    tributary_width: 3,
    concrete_grade: "C25/30",
    steel_grade: "Fe500",
    cover_mm: 25,
  };

  it("leaves legacy behaviour untouched when no code is selected", () => {
    const plain = designBeam(beam);
    expect(plain.jurisdiction_code).toBeUndefined();
    expect(plain.min_steel_area).toBeGreaterThan(0);
  });

  it("applies the selected code and reports the ratio it used", () => {
    const aci = designBeam({ ...beam, jurisdiction_code: "ACI_318" });
    const ec2 = designBeam({ ...beam, jurisdiction_code: "EUROCODE_2" });
    const is456 = designBeam({ ...beam, jurisdiction_code: "IS_456" });

    expect(aci.jurisdiction_code).toBe("ACI_318");
    expect(ec2.jurisdiction_code).toBe("EUROCODE_2");
    expect(is456.jurisdiction_code).toBe("IS_456");

    // Minimum areas differ because the codes differ.
    expect(aci.min_steel_area).not.toBe(ec2.min_steel_area);
    expect(aci.min_steel_ratio_percent).toBeGreaterThan(
      ec2.min_steel_ratio_percent!,
    );
    expect(aci.formula_transparency.some((f) => f.includes("ACI 318-19"))).toBe(
      true,
    );
    expect(
      ec2.formula_transparency.some((f) => f.includes("BS EN 1992-1-1")),
    ).toBe(true);
  });

  it("uses the code's own load factors alongside the code's minimum steel", () => {
    const bs = designBeam({ ...beam, jurisdiction_code: "BS_8110" });
    const aci = designBeam({ ...beam, jurisdiction_code: "ACI_318" });
    // Unfactored load is identical; the factored load carries the code's own
    // partial factors: BS 1.4Gk + 1.6Qk vs ACI 1.2D + 1.6L.
    expect(bs.design_load).toBe(aci.design_load);
    expect(bs.factored_load).toBeCloseTo(1.4 * 6 + 1.6 * 9, 2);
    expect(aci.factored_load).toBeCloseTo(1.2 * 6 + 1.6 * 9, 2);
    expect(bs.factored_load).toBeGreaterThan(aci.factored_load);
  });

  it("applies the selected code to slabs too", () => {
    const slabBase = {
      span_x: 4,
      span_y: 5,
      slab_type: "one_way" as const,
      support_condition: "simply_supported" as const,
      live_load: 2,
      dead_load: 1.5,
      concrete_grade: "C25/30" as const,
      steel_grade: "Fe500" as const,
      cover_mm: 20,
    };
    const is456 = designSlab({ ...slabBase, jurisdiction_code: "IS_456" });
    const bs = designSlab(slabBase);
    expect(is456.jurisdiction_code).toBe("IS_456");
    expect(is456.min_steel_ratio_percent).toBeCloseTo((0.85 / 500) * 100, 2);
    expect(bs.jurisdiction_code).toBeUndefined();
    expect(is456.formula_transparency.some((f) => f.includes("IS 456"))).toBe(
      true,
    );
  });
});
