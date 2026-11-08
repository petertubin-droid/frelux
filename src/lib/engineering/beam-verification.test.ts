import { describe, expect, it } from "vitest";
import { designBeam } from "./structural-calculator";

/**
 * Independent verification of the beam deflection and minimum-steel corrections.
 *
 * Hand arithmetic for the deflection check, 8 m simply supported beam,
 * Gk 3 kN/m² and Qk 2 kN/m² over a 2 m tributary, C25, Fe500, cover 25:
 *
 *   preliminary d    = 8000/12 ≈ 666 mm  -> effective span 8.666 m
 *   w                = 1.4(3×2) + 1.6(2×2) = 8.4 + 6.4 = 14.8 kN/m
 *   M                = 14.8 × 8.666²/8 = 138.9 kN·m
 *   L/d on a 500 mm section, d = 450: 8666/450 = 19.3
 *   basic ratio      20 for a simply supported beam (BS 8110-1 Table 3.9)
 *   f_s              = 2/3 × 500 × As,req/As,prov
 *   M/(bd²)          = 138.9e6/(225 × 450²) = 3.05 N/mm²
 *   mod factor       = 0.55 + (477 − f_s)/(120(0.9 + 3.05))
 *
 * With f_s near 300 N/mm² the factor is about 0.86, so the allowable L/d is
 * 17.2 and a 500 mm section at 19.3 fails. The engine therefore deepens the
 * section until the check it reports against passes, which is the behaviour
 * asserted below.
 */
const BASE = {
  span: 6,
  dead_load: 12,
  live_load: 8,
  tributary_width: 3,
  concrete_grade: "C25" as const,
  steel_grade: "Fe500" as const,
  cover_mm: 25,
  support_condition: "simply_supported" as const,
  market_code: "NG",
  beam_type: "suspended_beam" as const,
};

describe("beam deflection check", () => {
  it("measures span/depth on the section it recommends, not the strength depth", () => {
    for (const span of [4, 6, 8]) {
      for (const live of [2, 8, 15]) {
        const r = designBeam({ ...BASE, span, live_load: live });
        const d = r.recommended_depth - BASE.cover_mm - 25;
        expect(r.span_to_depth_ratio).toBeCloseTo(
          (r.effective_span * 1000) / d,
          0,
        );
      }
    }
  });

  it("does not pass a long, lightly loaded beam on a depth it will not build", () => {
    // Before the correction this case was measured against a strength depth of
    // about 250 mm and reported a failing L/d while recommending a beam that
    // was comfortably stiff enough.
    const r = designBeam({
      ...BASE,
      span: 8,
      dead_load: 3,
      live_load: 2,
      tributary_width: 2,
    });
    expect(r.deflection_check_pass).toBe(true);
    expect(r.recommended_depth).toBeGreaterThanOrEqual(450);
  });

  it("deepens the section until the modification factor is satisfied", () => {
    for (const span of [5, 6, 7, 8, 9]) {
      const r = designBeam({ ...BASE, span, live_load: 6 });
      expect(r.deflection_check_pass).toBe(true);
      expect(
        r.formula_transparency.some(
          (f) =>
            f.includes("allowable") && f.includes("Cl 3.4.6.5"),
        ),
      ).toBe(true);
    }
  });

  it("still fails when the user fixes a depth that is too shallow", () => {
    const r = designBeam({ ...BASE, span: 8, existing_depth: 300 });
    expect(r.recommended_depth).toBe(300);
    expect(r.deflection_check_pass).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/Deflection check failed/i);
  });
});

describe("beam minimum steel", () => {
  it("reports the BS 8110 Table 3.25 ratio for the steel grade in use", () => {
    const r = designBeam(BASE);
    // Fe500 -> 0.13% of b d
    expect(r.min_steel_area).toBeGreaterThan(0);
    const d = r.required_depth - BASE.cover_mm - 25;
    expect(r.min_steel_area).toBeCloseTo(0.0013 * r.required_width * d, -1);
  });

  it("never asks for less than 0.13% of the section being reported", () => {
    // Steel is sized on the required strength depth, which is conservative
    // against a deeper supplied section; the minimum must still be at least
    // 0.13% of the member the user actually has.
    const r = designBeam({ ...BASE, existing_depth: 450, existing_width: 250 });
    const providedDepth = 450 - BASE.cover_mm - 25;
    expect(r.min_steel_area).toBeGreaterThanOrEqual(
      0.0013 * 250 * providedDepth,
    );
  });
});

describe("beam section warnings", () => {
  it("flags a section that needs compression steel", () => {
    const r = designBeam({
      ...BASE,
      span: 7,
      dead_load: 25,
      live_load: 20,
      tributary_width: 4,
      existing_width: 250,
      existing_depth: 400,
    });
    expect(r.warnings.join(" ")).toMatch(/compression steel|doubly reinforced/i);
  });

  it("keeps shear capacity inside the Table 3.8 ceiling", () => {
    const r = designBeam({
      ...BASE,
      span: 4,
      dead_load: 30,
      live_load: 20,
      tributary_width: 5,
      concrete_grade: "C50",
      existing_width: 300,
      existing_depth: 600,
    });
    const d = r.required_depth - BASE.cover_mm - 25;
    const vcFromCapacity = (r.shear_capacity * 1000) / (r.required_width * d);
    // min(0.8 sqrt(min(fcu,40)), 5) = min(5.06, 5) = 5.0 MPa
    expect(vcFromCapacity).toBeLessThanOrEqual(5.01);
  });
});
