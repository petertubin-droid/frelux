import { describe, it, expect } from "vitest";
import {
  designBeam,
  designColumn,
  designSlab,
  getConcreteStandardForMarket,
  resolveConcreteGrade,
  getConcreteGradeOptions,
  type BeamDesignInput,
  type ColumnDesignInput,
  type SlabDesignInput,
} from "./structural-calculator";

describe("designBeam", () => {
  const baseInput: BeamDesignInput = {
    span: 4.5,
    tributary_width: 3,
    dead_load: 8,
    live_load: 3,
    concrete_grade: "C25",
    steel_grade: "Fe500",
    support_condition: "simply_supported",
    cover_mm: 25,
    beam_type: "suspended_beam",
  };

  it("takes the effective span as clear span + effective depth", () => {
    const result = designBeam(baseInput);
    // BS 8110 cl. 3.4.1.1. Without a supplied depth the preliminary depth is
    // span/12 = 375 mm, so d = 375 - 25 cover = 350 mm.
    expect(result.effective_span).toBeCloseTo(4.5 + 0.35, 3);
  });

  it("applies correct factored load (1.4 dead + 1.6 live)", () => {
    const result = designBeam(baseInput);
    const expected = 1.4 * 24 + 1.6 * 9;
    expect(result.factored_load).toBeCloseTo(expected, 1);
  });

  it("calculates max moment", () => {
    const result = designBeam(baseInput);
    expect(result.max_moment).toBeGreaterThan(0);
  });

  it("calculates max shear", () => {
    const result = designBeam(baseInput);
    expect(result.max_shear).toBeGreaterThan(0);
  });

  it("applies higher moment for cantilever vs simply supported", () => {
    const cantilever = {
      ...baseInput,
      support_condition: "cantilever" as const,
    };
    const result = designBeam(cantilever);
    const simple = designBeam(baseInput);
    expect(result.max_moment).toBeGreaterThan(simple.max_moment);
  });

  it("calculates required depth and width", () => {
    const result = designBeam(baseInput);
    expect(result.required_depth).toBeGreaterThan(0);
    expect(result.required_width).toBeGreaterThan(0);
  });

  it("calculates steel area", () => {
    const result = designBeam(baseInput);
    expect(result.area_steel_required).toBeGreaterThan(0);
    expect(result.recommended_bar_count).toBeGreaterThan(0);
  });

  it("includes formula transparency", () => {
    const result = designBeam(baseInput);
    expect(result.formula_transparency.length).toBeGreaterThan(3);
  });

  it("checks deflection", () => {
    const result = designBeam(baseInput);
    expect(typeof result.deflection_check_pass).toBe("boolean");
  });
});

describe("designColumn", () => {
  const baseInput: ColumnDesignInput = {
    axial_load: 500,
    height: 3,
    concrete_grade: "C30",
    steel_grade: "Fe500",
    cover_mm: 40,
    is_rectangular: false,
    unbraced_height_ratio: 10,
  };

  it("calculates column dimensions", () => {
    const result = designColumn(baseInput);
    expect(result.recommended_width).toBeGreaterThan(0);
    expect(result.recommended_depth).toBeGreaterThan(0);
  });

  it("applies factored load (1.4 × service)", () => {
    const result = designColumn(baseInput);
    expect(result.factored_load).toBeCloseTo(700, 0);
  });

  it("calculates required area", () => {
    const result = designColumn(baseInput);
    expect(result.required_area).toBeGreaterThan(0);
  });

  it("recommends bars and links", () => {
    const result = designColumn(baseInput);
    expect(result.recommended_bar_diameter).toBeGreaterThan(0);
    expect(result.recommended_bar_count).toBeGreaterThan(0);
    expect(result.link_diameter).toBeGreaterThan(0);
  });

  it("performs slenderness check", () => {
    const result = designColumn(baseInput);
    expect(typeof result.slenderness_check).toBe("boolean");
    expect(["short", "slender"]).toContain(result.short_or_slender);
  });

  it("reports load capacity", () => {
    const result = designColumn(baseInput);
    expect(result.load_capacity).toBeGreaterThan(0);
  });
});

describe("designSlab", () => {
  const baseInput: SlabDesignInput = {
    span_x: 4,
    span_y: 3,
    slab_type: "two_way",
    support_condition: "simply_supported",
    dead_load: 5,
    live_load: 2,
    concrete_grade: "C25",
    steel_grade: "Fe500",
    cover_mm: 20,
  };

  it("calculates required and recommended thickness", () => {
    const result = designSlab(baseInput);
    expect(result.required_thickness).toBeGreaterThan(0);
    expect(result.recommended_thickness).toBeGreaterThanOrEqual(
      result.required_thickness,
    );
  });

  it("calculates loads", () => {
    const result = designSlab(baseInput);
    expect(result.self_weight).toBeGreaterThan(0);
    expect(result.total_load).toBeGreaterThan(0);
  });

  it("calculates moments and shear", () => {
    const result = designSlab(baseInput);
    expect(result.max_moment).toBeGreaterThan(0);
    expect(result.max_shear).toBeGreaterThan(0);
  });

  it("calculates steel area and bar spacing", () => {
    const result = designSlab(baseInput);
    expect(result.steel_area_required).toBeGreaterThan(0);
    expect(result.recommended_bar_diameter).toBeGreaterThan(0);
    expect(result.recommended_bar_spacing).toBeGreaterThan(0);
  });

  it("checks deflection", () => {
    const result = designSlab(baseInput);
    expect(typeof result.deflection_check_pass).toBe("boolean");
  });

  it("handles one-way slab", () => {
    const oneWay = { ...baseInput, slab_type: "one_way" as const };
    const result = designSlab(oneWay);
    expect(result.required_thickness).toBeGreaterThan(0);
    expect(result.steel_area_required).toBeGreaterThan(0);
  });
});

describe("Regional Concrete Standards & Presets", () => {
  it("resolves IS 456 standard for Indian market", () => {
    const std = getConcreteStandardForMarket("IN");
    expect(std.code).toBe("is_456");
    expect(std.name).toContain("IS 456");
    expect(std.defaultGrade).toBe("M25");
    expect(std.grades.map((g) => g.id)).toEqual(["M20", "M25", "M30", "M35"]);
  });

  it("resolves ACI 318 standard for US and North America", () => {
    const stdUS = getConcreteStandardForMarket("US");
    expect(stdUS.code).toBe("aci_astm");
    expect(stdUS.defaultGrade).toBe("3000_psi");
    expect(stdUS.grades.map((g) => g.id)).toEqual([
      "2500_psi",
      "3000_psi",
      "4000_psi",
      "5000_psi",
    ]);

    const stdCA = getConcreteStandardForMarket("CA");
    expect(stdCA.code).toBe("aci_astm");
  });

  it("resolves Eurocode 2 / BS 8110 for European and African markets", () => {
    expect(getConcreteStandardForMarket("GB").code).toBe("eurocode_bs");
    expect(getConcreteStandardForMarket("NG").code).toBe("eurocode_bs");
    expect(getConcreteStandardForMarket("DE").code).toBe("eurocode_bs");
  });

  it("resolves concrete grades with appropriate strength properties", () => {
    const m25 = resolveConcreteGrade("M25", "IN");
    expect(m25.fcu).toBe(25);
    expect(m25.standard).toBe("is_456");

    const psi3000 = resolveConcreteGrade("3000_psi", "US");
    expect(psi3000.fck).toBe(20.7);
    expect(psi3000.fcu).toBeCloseTo(25.9, 1);
    expect(psi3000.standard).toBe("aci_astm");

    const c2530 = resolveConcreteGrade("C25/30", "GB");
    expect(c2530.fck).toBe(25);
    expect(c2530.fcu).toBe(30);
    expect(c2530.standard).toBe("eurocode_bs");
  });

  it("designs beam with US ACI 318 preset and discloses formula transparency", () => {
    const result = designBeam({
      span: 5.0,
      tributary_width: 3.5,
      dead_load: 7,
      live_load: 3,
      concrete_grade: "3000_psi",
      steel_grade: "Fe500",
      support_condition: "simply_supported",
      cover_mm: 38,
      beam_type: "suspended_beam",
      market_code: "US",
    });
    expect(result.recommended_depth).toBeGreaterThan(0);
    expect(
      result.formula_transparency.some(
        (f) => f.includes("ACI 318") && f.includes("3,000 psi"),
      ),
    ).toBe(true);
  });

  it("designs column with Indian IS 456 preset and discloses formula transparency", () => {
    const result = designColumn({
      axial_load: 600,
      height: 3.2,
      concrete_grade: "M25",
      steel_grade: "Fe500",
      cover_mm: 40,
      is_rectangular: true,
      unbraced_height_ratio: 10,
      market_code: "IN",
    });
    expect(result.recommended_width).toBeGreaterThan(0);
    expect(
      result.formula_transparency.some(
        (f) => f.includes("IS 456") && f.includes("M25"),
      ),
    ).toBe(true);
  });
});

// ── Audit fixes 2026-10-26: standard-aware factors, exact lever arm, column moments ──

describe("audit fixes — F1/F2/F3", () => {
  const bsBeam: BeamDesignInput = {
    span: 4.5,
    tributary_width: 3,
    dead_load: 8,
    live_load: 3,
    concrete_grade: "C25",
    steel_grade: "Fe500",
    support_condition: "simply_supported",
    cover_mm: 25,
    beam_type: "suspended_beam",
  };

  it("F1: BS 8110 markets keep 1.4D + 1.6L", () => {
    const r = designBeam(bsBeam);
    expect(r.factored_load).toBeCloseTo(1.4 * 24 + 1.6 * 9, 1);
    expect(
      r.formula_transparency.some((f) => f.includes("BS 8110: 1.4Gk + 1.6Qk")),
    ).toBe(true);
  });

  it("F1: ACI 318 markets use 1.2D + 1.6L and Whitney-block steel design", () => {
    const r = designBeam({
      ...bsBeam,
      concrete_grade: "3000_psi",
      market_code: "US",
      cover_mm: 38,
    });
    // dead = 8×3 = 24, live = 3×3 = 9 → 1.2×24 + 1.6×9 = 43.2
    expect(r.factored_load).toBeCloseTo(1.2 * 24 + 1.6 * 9, 1);
    expect(
      r.formula_transparency.some((f) =>
        f.includes("ACI 318-19 LRFD: 1.2D + 1.6L"),
      ),
    ).toBe(true);
    expect(r.formula_transparency.some((f) => f.includes("Whitney"))).toBe(
      true,
    );
    expect(r.formula_transparency.some((f) => f.includes("§9.6.1.2"))).toBe(
      true,
    );
  });

  it("F1: IS 456 markets use 1.5(D+L)", () => {
    const r = designBeam({
      ...bsBeam,
      concrete_grade: "M25",
      market_code: "IN",
    });
    expect(r.factored_load).toBeCloseTo(1.5 * 24 + 1.5 * 9, 1);
    expect(
      r.formula_transparency.some((f) => f.includes("IS 456:2000: 1.5(D + L)")),
    ).toBe(true);
  });

  it("F2: lever arm uses the exact BS quadratic, never hard-coded 0.87d", () => {
    const r = designBeam(bsBeam);
    const f = r.formula_transparency.find((x) => x.startsWith("Lever arm:"));
    expect(f).toBeTruthy();
    // z line discloses the quadratic form and the 0.95d cap
    const zLine = r.formula_transparency.find((x) => x.startsWith("z = d(0.5"));
    expect(zLine).toBeTruthy();
    expect(zLine!).toContain("(≤ 0.95d)");
    // steel line must use the computed z, not 0.87 × d
    const steelLine = r.formula_transparency.find((x) =>
      x.startsWith("Steel area required"),
    );
    expect(steelLine).toBeTruthy();
  });

  it("F2: K > 0.156 flags doubly-reinforced with an explicit warning", () => {
    // Very heavily loaded short beam on C20: drives K above 0.156
    const r = designBeam({
      ...bsBeam,
      dead_load: 60,
      live_load: 25,
      concrete_grade: "C20",
    });
    const KLine = r.formula_transparency.find((x) =>
      x.startsWith("Lever arm:"),
    );
    expect(KLine).toBeTruthy();
    if (KLine!.includes("> 0.156")) {
      expect(r.warnings.some((w) => w.includes("doubly reinforced"))).toBe(
        true,
      );
    }
  });

  it("F3: column adds the code minimum moment e_min = max(h/300, 20mm)", () => {
    const r = designColumn({
      axial_load: 600,
      height: 3.0,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      cover_mm: 25,
      is_rectangular: true,
      unbraced_height_ratio: 10,
    });
    expect(
      r.formula_transparency.some((f) => f.includes("Minimum design moment")),
    ).toBe(true);
    expect(r.formula_transparency.some((f) => f.includes("e_min = max("))).toBe(
      true,
    );
    // Bending steel is now part of the total
    expect(
      r.formula_transparency.some((f) => f.startsWith("Bending steel")),
    ).toBe(true);
    // Capacity disclosure notes the axial-only basis
    expect(
      r.formula_transparency.some((f) => f.startsWith("Total steel")),
    ).toBe(true);
  });

  it("F3: slender column adds the BS 8110 additional moment M_add", () => {
    // height/width forced slender: 5m height on a small column
    const r = designColumn({
      axial_load: 400,
      height: 5.0,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      cover_mm: 25,
      is_rectangular: false,
      unbraced_height_ratio: 20,
    });
    expect(r.short_or_slender).toBe("slender");
    expect(r.formula_transparency.some((f) => f.includes("M_add"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("Additional moment"))).toBe(true);
  });

  it("F1: slab factored load follows the governing standard", () => {
    const slabUS = designSlab({
      span_x: 3.6,
      span_y: 5.0,
      slab_type: "one_way",
      support_condition: "simply_supported",
      live_load: 2.5,
      dead_load: 1.5,
      concrete_grade: "3000_psi",
      steel_grade: "Fe500",
      cover_mm: 25,
      market_code: "US",
    });
    expect(
      slabUS.formula_transparency.some((f) => f.includes("ACI 318-19 LRFD")),
    ).toBe(true);
  });
});
