import { describe, it, expect } from "vitest";
import {
  designBeam,
  designColumn,
  designSlab,
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

  it("calculates effective span as span + 0.1m", () => {
    const result = designBeam(baseInput);
    expect(result.effective_span).toBeCloseTo(4.6, 1);
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
