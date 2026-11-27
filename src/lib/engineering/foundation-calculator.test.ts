import { describe, it, expect } from "vitest";
import {
  designFoundation,
  validateAndResolveColumnFace,
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

describe("designFoundation, strip footing", () => {
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

describe("designFoundation, pad footing", () => {
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

describe("designFoundation, raft foundation", () => {
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

describe("designFoundation, custom soil", () => {
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
    // A supplied bearing value is treated as an allowable pressure, which is
    // what the built-in soil table holds. Dividing again by the safety factor
    // double-counted it and produced footings 2.5x too large.
    expect(result.bearing_capacity).toBe(200);
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
    expect(result.bearing_capacity).toBe(150);
  });
});

describe("designFoundation, safety factor", () => {
  it("uses the built-in soil value as an allowable pressure", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
    });
    expect(result.bearing_capacity).toBeCloseTo(
      SOIL_BEARING_CAPACITY.stiff_clay,
      1,
    );
  });

  it("divides only when the supplied capacity is an ultimate value", () => {
    const asAllowable = designFoundation({
      shape: "strip",
      soil_type: "custom",
      custom_bearing_capacity: 300,
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
    });
    const asUltimate = designFoundation({
      shape: "strip",
      soil_type: "custom",
      custom_bearing_capacity: 900,
      custom_capacity_is_ultimate: true,
      safety_factor: 3.0,
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
    });
    expect(asAllowable.bearing_capacity).toBeCloseTo(300, 1);
    expect(asUltimate.bearing_capacity).toBeCloseTo(300, 1);
  });

  // A strip footing on stiff clay carrying 100 kN/m: the width follows the soil,
  // 1.10 x 100 / 300 = 0.37 m, so the 300 mm practical minimum governs.
  it("sizes a strip footing from the allowable pressure, not a divided one", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 100,
      foundation_depth: 1.0,
      concrete_grade: "C25",
      building_length: 10,
      building_width: 8,
    });
    expect(result.required_width).toBeLessThanOrEqual(400);
    expect(result.recommended_width).toBe(400);
    expect(result.bearing_check_pass).toBe(true);
    expect(result.applied_pressure).toBeLessThanOrEqual(300);
  });
});

describe("designFoundation, formula transparency", () => {
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

// ── Audit fix F4 (2026-10-26): self-weight multiplier + punching shear ──

describe("audit fix F4 — pad footing self-weight & punching shear", () => {
  const baseInput: FoundationDesignInput = {
    shape: "pad",
    soil_type: "dense_sand",
    column_load: 300,
    wall_load: 0,
    foundation_depth: 1.5,
    concrete_grade: "C25",
  };

  it("sizes the pad area with the 1.10 self-weight multiplier", () => {
    const result = designFoundation(baseInput);
    const allowable = 300; // dense sand, assumed allowable
    const expectedArea = (1.1 * 300) / allowable;
    expect(result.formula_transparency.some((f) => f.includes("1.10"))).toBe(
      true,
    );
    expect(result.area_per_pad).toBeGreaterThanOrEqual(
      Math.round(expectedArea * 1000) / 1000,
    );
  });

  it("checks punching shear at 1.5d from the column face", () => {
    const result = designFoundation(baseInput);
    expect(result.punching_shear_stress).toBeDefined();
    expect(result.punching_shear_capacity).toBeDefined();
    expect(result.punching_shear_check_pass).toBeDefined();
    expect(
      result.formula_transparency.some((f) => f.startsWith("Punching shear:")),
    ).toBe(true);
    // u1 = 4×(225 + 3×250) = 3900 mm disclosed
    expect(result.formula_transparency.some((f) => f.includes("u1"))).toBe(
      true,
    );
  });

  it("warns to increase pad depth when punching shear fails", () => {
    // Very heavy column on a small pad drives v above v_c
    const heavy = {
      ...baseInput,
      column_load: 1200,
      soil_type: "rock" as const,
    };
    const result = designFoundation(heavy);
    if (!result.punching_shear_check_pass) {
      expect(
        result.warnings.some(
          (w) => w.includes("punching shear") || w.includes("Punching shear"),
        ),
      ).toBe(true);
    }
  });

  it("strip footing required width also carries the 1.10 multiplier", () => {
    const result = designFoundation({
      shape: "strip",
      soil_type: "stiff_clay",
      wall_load: 80,
      foundation_depth: 0.9,
      concrete_grade: "C20",
      building_length: 20,
      building_width: 10,
    });
    expect(result.formula_transparency.some((f) => f.includes("1.10"))).toBe(
      true,
    );
  });

  it("recognizes soft_clay_swamp soil and recommends raft or pile foundation with C25/30 concrete", () => {
    const swampInput = {
      ...baseInput,
      shape: "pad" as const,
      soil_type: "soft_clay_swamp" as const,
      column_load: 450, // heavy column load
      foundation_depth: 1.2,
      ground_water_depth_m: 0.8, // shallow water table < 1.0 m
    };
    const result = designFoundation(swampInput);

    expect(result.bearing_capacity).toBe(60);
    expect(result.recommended_foundation_type).toBe("pile");
    expect(result.recommended_concrete_grade).toBe("C25/30");
    expect(result.water_table_classification).toBe("shallow_high_risk");
    expect(result.geotechnical_advisory).toContain("buoyant uplift");

    // COREN Geotechnical Audit Sheet
    expect(result.coren_audit_sheet).toBeDefined();
    expect(result.coren_audit_sheet?.governing_code).toContain("BS 8004");
    expect(result.coren_audit_sheet?.coren_endorsement_placeholder).toContain(
      "COREN Registered",
    );
  });
});

describe("validateAndResolveColumnFace, global engineering-code & axial validation", () => {
  it("validates user-specified column face conforming to code and axial capacity", () => {
    const res = validateAndResolveColumnFace({
      column_width_mm: 300,
      column_load_kn: 300,
      concrete_grade: "C25",
    });

    expect(res.is_user_specified).toBe(true);
    expect(res.column_face_mm).toBe(300);
    expect(res.column_length_mm).toBe(300);
    expect(res.axial_capacity_check_pass).toBe(true);
    expect(res.engineering_status).toBe("verified_conforming");
    expect(
      res.validation_notes.some((n) => n.includes("verified conforming")),
    ).toBe(true);
  });

  it("flags user-specified column below 200 mm physical structural code minimum", () => {
    const res = validateAndResolveColumnFace({
      column_width_mm: 150,
      column_load_kn: 100,
      concrete_grade: "C25",
      design_code: "Eurocode 2",
    });

    expect(res.is_user_specified).toBe(true);
    expect(res.column_face_mm).toBe(150);
    expect(res.engineering_status).toBe("warning_undersized");
    expect(
      res.validation_notes.some((n) =>
        n.includes("below the 200 mm structural concrete code minimum"),
      ),
    ).toBe(true);
  });

  it("flags user-specified column that crushes under heavy axial load", () => {
    // 200 mm column on 1500 kN load (factored N = 2100 kN, area = 40,000 mm² => stress = 52.5 MPa > 13.28 MPa)
    const res = validateAndResolveColumnFace({
      column_width_mm: 200,
      column_load_kn: 1500,
      concrete_grade: "C25",
    });

    expect(res.is_user_specified).toBe(true);
    expect(res.axial_capacity_check_pass).toBe(false);
    expect(res.engineering_status).toBe("warning_undersized");
    expect(
      res.validation_notes.some((n) =>
        n.includes("structurally undersized for factored axial load"),
      ),
    ).toBe(true);
    expect(res.axial_capacity_minimum_mm).toBeGreaterThan(350);
  });

  it("supports rectangular column dimensions and verifies combined cross-sectional area", () => {
    const res = validateAndResolveColumnFace({
      column_width_mm: 250,
      column_length_mm: 400,
      column_load_kn: 600,
      concrete_grade: "C25",
    });

    expect(res.column_face_mm).toBe(250);
    expect(res.column_length_mm).toBe(400);
    expect(res.axial_capacity_check_pass).toBe(true);
  });

  it("resolves market modular standard for Nigeria (225 mm) and India (230 mm)", () => {
    const resNG = validateAndResolveColumnFace({
      column_load_kn: 200,
      concrete_grade: "C25",
      market_code: "NG",
    });
    expect(resNG.is_user_specified).toBe(false);
    expect(resNG.column_face_mm).toBe(225);
    expect(resNG.governing_code).toContain("BS 8110");

    const resIN = validateAndResolveColumnFace({
      column_load_kn: 200,
      concrete_grade: "C25",
      market_code: "IN",
    });
    expect(resIN.column_face_mm).toBe(230);
    expect(resIN.governing_code).toContain("IS 456");
  });

  it("elevates thin masonry leaf markets (GB 100mm, BR 90mm) to the 200 mm structural RC minimum", () => {
    const resGB = validateAndResolveColumnFace({
      column_load_kn: 150,
      concrete_grade: "C25",
      market_code: "GB",
    });
    expect(resGB.column_face_mm).toBe(200);

    const resBR = validateAndResolveColumnFace({
      column_load_kn: 150,
      concrete_grade: "C25",
      market_code: "BR",
    });
    expect(resBR.column_face_mm).toBe(200);
  });

  it("automatically sizes column face when axial load demands larger dimension than code floor", () => {
    // 1200 kN service load => factored load 1680 kN
    // at C25 allowable stress 13.28 MPa => required area ~ 126,506 mm² => raw face ~ 355.6 mm => 375 mm
    const res = validateAndResolveColumnFace({
      column_load_kn: 1200,
      concrete_grade: "C25",
    });

    expect(res.is_user_specified).toBe(false);
    expect(res.column_face_mm).toBeGreaterThanOrEqual(375);
    expect(res.engineering_status).toBe("axial_load_governed");
    expect(res.axial_capacity_check_pass).toBe(true);
    expect(
      res.validation_notes.some((n) => n.includes("automatically sized to")),
    ).toBe(true);
  });
});

describe("designFoundation, pad footing complete engineering integration", () => {
  it("integrates user-specified column face into punching shear and provides validation breakdown", () => {
    const res = designFoundation({
      shape: "pad",
      soil_type: "dense_sand",
      wall_load: 0,
      column_load: 400,
      column_width_mm: 350,
      foundation_depth: 1.5,
      concrete_grade: "C25",
    });

    expect(res.column_validation).toBeDefined();
    expect(res.column_validation?.column_face_mm).toBe(350);
    expect(res.column_validation?.is_user_specified).toBe(true);
    expect(res.punching_shear_check_pass).toBe(true);
    expect(res.column_validation?.face_shear_check_pass).toBe(true);
    expect(
      res.formula_transparency.some((f) =>
        f.includes("Column face validation: 350×350 mm [User-Specified]"),
      ),
    ).toBe(true);
  });

  it("warns when user-specified column face is undersized for the axial load", () => {
    const res = designFoundation({
      shape: "pad",
      soil_type: "rock",
      wall_load: 0,
      column_load: 1400,
      column_width_mm: 200, // structurally undersized for 1400 kN
      foundation_depth: 1.5,
      concrete_grade: "C25",
    });

    expect(res.column_validation?.axial_capacity_check_pass).toBe(false);
    expect(
      res.warnings.some((w) =>
        w.includes("structurally undersized for factored axial load"),
      ),
    ).toBe(true);
  });

  it("populates COREN audit sheet with column structural evaluation", () => {
    const res = designFoundation({
      shape: "pad",
      soil_type: "dense_sand",
      wall_load: 0,
      column_load: 300,
      market_code: "NG",
      foundation_depth: 1.5,
      concrete_grade: "C25",
    });

    expect(res.coren_audit_sheet?.column_structural_evaluation).toBeDefined();
    expect(res.coren_audit_sheet?.column_structural_evaluation).toContain(
      "225×225 mm",
    );
    expect(res.coren_audit_sheet?.column_structural_evaluation).toContain(
      "PASS",
    );
  });
});

describe("global engineering standards & rectangular column validation", () => {
  it("flags rectangular column when second dimension is below 200 mm code minimum", () => {
    const res = validateAndResolveColumnFace({
      column_width_mm: 350,
      column_length_mm: 150,
      column_load_kn: 150,
      concrete_grade: "C25",
    });

    expect(res.is_user_specified).toBe(true);
    expect(res.column_face_mm).toBe(350);
    expect(res.column_length_mm).toBe(150);
    expect(res.code_minimum_check_pass).toBe(false);
    expect(res.engineering_status).toBe("warning_undersized");
    expect(
      res.validation_notes.some((n) =>
        n.includes(
          "Column dimension of 150 mm (350×150 mm) is below the 200 mm structural concrete code minimum",
        ),
      ),
    ).toBe(true);
  });

  it("accurately maps all global building codes across international markets", () => {
    const za = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "ZA",
    });
    expect(za.governing_code).toContain("SANS 10100");

    const br = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "BR",
    });
    expect(br.governing_code).toContain("ABNT NBR 6118");

    const cn = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "CN",
    });
    expect(cn.governing_code).toContain("GB 50010");
    expect(cn.column_face_mm).toBe(240);

    const jp = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "JP",
    });
    expect(jp.governing_code).toContain("AIJ");

    const sa = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "SA",
    });
    expect(sa.governing_code).toContain("SBC 304");

    const id = validateAndResolveColumnFace({
      column_load_kn: 100,
      concrete_grade: "C25",
      market_code: "ID",
    });
    expect(id.governing_code).toContain("SNI 2847");
  });

  it("honors explicit user design_code override", () => {
    const res = validateAndResolveColumnFace({
      column_width_mm: 300,
      column_load_kn: 200,
      concrete_grade: "C25",
      design_code: "ACI 318-19 / IBC 2024",
      market_code: "NG",
    });

    expect(res.governing_code).toBe("ACI 318-19 / IBC 2024");
  });

  it("enlarges pad footing side to satisfy minimum 150 mm projection beyond large column", () => {
    const res = designFoundation({
      shape: "pad",
      soil_type: "rock",
      wall_load: 0,
      column_load: 100,
      column_width_mm: 500,
      foundation_depth: 1.0,
      concrete_grade: "C25",
    });

    expect(res.recommended_width).toBeGreaterThanOrEqual(800);
    expect(
      res.formula_transparency.some((f) =>
        f.includes(
          "Pad side enlarged to 800 mm to satisfy minimum structural projection (≥ 150 mm) beyond 500×500 mm column",
        ),
      ),
    ).toBe(true);
  });
});
