import { describe, it, expect } from "vitest";
import {
  designFoundation,
  SOIL_BEARING_CAPACITY,
  SOIL_DESCRIPTIONS,
  type FoundationDesignInput,
} from "./foundation-calculator";

describe("SOIL_BEARING_CAPACITY", () => {
  it("has capacity values for all soil types", () => {
    expect(SOIL_BEARING_CAPACITY.stiff_clay).toBeGreaterThan(0);
    expect(SOIL_BEARING_CAPACITY.rock).toBeGreaterThan(
      SOIL_BEARING_CAPACITY.loose_sand,
    );
  });

  it("has descriptions for all soil types", () => {
    expect(SOIL_DESCRIPTIONS.stiff_clay).toBeTruthy();
    expect(SOIL_DESCRIPTIONS.rock).toBeTruthy();
  });
});

describe("designFoundation — strip footing", () => {
  const baseInput: FoundationDesignInput = {
    shape: "strip",
    soil_type: "stiff_clay",
    wall_load: 80,
    foundation_depth: 0.9,
    concrete_grade: "C20",
    building_length: 20,
    building_width: 10,
  };

  it("calculates required width from bearing capacity", () => {
    const result = designFoundation(baseInput);
    expect(result.shape).toBe("strip");
    expect(result.required_width).toBeGreaterThan(0);
    expect(result.recommended_width).toBeGreaterThanOrEqual(300);
  });

  it("passes bearing check when load is within capacity", () => {
    const result = designFoundation(baseInput);
    expect(result.bearing_check_pass).toBe(true);
    expect(result.factor_of_safety).toBeGreaterThanOrEqual(1);
  });

  it("enforces minimum width of 300mm", () => {
    const lightLoad = { ...baseInput, wall_load: 10 };
    const result = designFoundation(lightLoad);
    expect(result.recommended_width).toBeGreaterThanOrEqual(300);
  });

  it("calculates excavation and concrete volumes", () => {
    const result = designFoundation(baseInput);
    expect(result.excavation_volume).toBeGreaterThan(0);
    expect(result.concrete_volume).toBeGreaterThan(0);
    expect(result.blinding_volume).toBeGreaterThan(0);
    expect(result.hardcore_volume).toBeGreaterThan(0);
  });

  it("includes soil warning for non-rock soils", () => {
    const result = designFoundation(baseInput);
    expect(result.warnings.some((w: string) => w.includes("soil test"))).toBe(
      true,
    );
  });

  it("rounds recommended width to nearest 50mm", () => {
    const result = designFoundation(baseInput);
    expect(result.recommended_width % 50).toBe(0);
  });

  it("warns when strip width exceeds 1500mm", () => {
    const heavyLoad = {
      ...baseInput,
      wall_load: 500,
      soil_type: "loose_sand" as const,
    };
    const result = designFoundation(heavyLoad);
    if (result.recommended_width > 1500) {
      expect(result.warnings.some((w: string) => w.includes("1500"))).toBe(
        true,
      );
    }
  });
});

describe("designFoundation — pad footing", () => {
  const baseInput: FoundationDesignInput = {
    shape: "pad",
    soil_type: "dense_sand",
    column_load: 300,
    wall_load: 0,
    foundation_depth: 1.5,
    concrete_grade: "C25",
  };

  it("calculates square pad dimensions", () => {
    const result = designFoundation(baseInput);
    expect(result.shape).toBe("pad");
    expect(result.required_width).toBeGreaterThan(0);
    expect(result.recommended_width).toBeGreaterThanOrEqual(600);
    expect(result.recommended_length).toBe(result.recommended_width);
  });

  it("passes bearing check for reasonable loads", () => {
    const result = designFoundation(baseInput);
    expect(result.bearing_check_pass).toBe(true);
  });

  it("reports area per pad", () => {
    const result = designFoundation(baseInput);
    expect(result.area_per_pad).toBeGreaterThan(0);
  });

  it("enforces minimum pad size of 600mm", () => {
    const lightLoad = { ...baseInput, column_load: 30 };
    const result = designFoundation(lightLoad);
    expect(result.recommended_width).toBeGreaterThanOrEqual(600);
  });

  it("rounds recommended side to nearest 100mm", () => {
    const result = designFoundation(baseInput);
    expect(result.recommended_width % 100).toBe(0);
  });
});

describe("designFoundation — raft foundation", () => {
  const baseInput: FoundationDesignInput = {
    shape: "raft",
    soil_type: "sandy_clay",
    wall_load: 50,
    foundation_depth: 1.2,
    concrete_grade: "C20",
    building_length: 15,
    building_width: 10,
  };

  it("calculates raft covering entire footprint", () => {
    const result = designFoundation(baseInput);
    expect(result.shape).toBe("raft");
    expect(result.required_width).toBe(0);
    expect(result.excavation_volume).toBeGreaterThan(0);
  });

  it("calculates concrete volume based on 300mm slab", () => {
    const result = designFoundation(baseInput);
    const expectedArea = 15 * 10;
    expect(result.concrete_volume).toBeCloseTo(expectedArea * 0.3, 0);
  });
});

describe("designFoundation — custom soil", () => {
  it("uses custom bearing capacity when provided", () => {
    const input: FoundationDesignInput = {
      shape: "strip",
      soil_type: "custom",
      custom_bearing_capacity: 200,
      wall_load: 50,
      foundation_depth: 1.0,
      concrete_grade: "C20",
      building_length: 10,
      building_width: 8,
    };
    const result = designFoundation(input);
    expect(result.bearing_capacity).toBe(200 / 2.5);
  });

  it("falls back to 150 kN/m² when custom capacity not provided", () => {
    const input: FoundationDesignInput = {
      shape: "strip",
      soil_type: "custom",
      wall_load: 50,
      foundation_depth: 1.0,
      concrete_grade: "C20",
    };
    const result = designFoundation(input);
    expect(result.bearing_capacity).toBe(150 / 2.5);
  });
});

describe("designFoundation — safety factor", () => {
  it("applies default safety factor of 2.5", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
    });
    const expected = SOIL_BEARING_CAPACITY.stiff_clay / 2.5;
    expect(result.bearing_capacity).toBeCloseTo(expected, 1);
  });

  it("applies custom safety factor", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
      safety_factor: 3.0,
    });
    const expected = SOIL_BEARING_CAPACITY.stiff_clay / 3.0;
    expect(result.bearing_capacity).toBeCloseTo(expected, 1);
  });
});

describe("designFoundation — formula transparency", () => {
  it("includes formula explanations in results", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
    });
    expect(result.formula_transparency.length).toBeGreaterThan(0);
    expect(
      result.formula_transparency.some((f: string) =>
        f.includes("bearing capacity"),
      ),
    ).toBe(true);
  });
});
