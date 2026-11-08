import { describe, expect, it } from "vitest";
import { designBeam } from "./structural-calculator";

/**
 * Independent verification of the beam span, deflection and section corrections.
 *
 * Hand arithmetic for the 8 m case, Gk 3 kN/m² and Qk 2 kN/m² over a 2 m
 * tributary, C25, Fe500, cover 25:
 *
 *   w                = 1.4(3×2) + 1.6(2×2) = 8.4 + 6.4 = 14.8 kN/m
 *   section          500 mm deep, d = 500 − 25 − 25 = 450 mm
 *   effective span   = 8 + 0.450 = 8.45 m (BS 8110-1 cl. 3.4.1.1)
 *   M                = 14.8 × 8.45²/8 = 132.1 kN·m
 *   L/d              = 8450/450 = 18.8
 *   basic ratio      20 simply supported (Table 3.9)
 *   f_s              = 2/3 × 500 × As,req/As,prov
 *   M/(bd²)          = 132.1e6/(225 × 450²) = 2.90 N/mm²
 *   mod factor       = 0.55 + (477 − f_s)/(120(0.9 + 2.90))
 *
 * The span and the depth are mutually dependent, so the engine iterates: the
 * first pass at a span/12 preliminary depth gives 8.67 m, which reports a
 * shallower section than the one finally recommended. Sized at 8.45 m the beam is
 * 500 mm deep and passes at L/d 18.8 against an allowance of about 20 × 0.87.
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
    expect(r.effective_span).toBeCloseTo(
      8 + (r.recommended_depth - 50) / 1000,
      3,
    );
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

describe("beam steel is sized on the section being reported", () => {
  const supplied = (depth: number) =>
    designBeam({
      ...BASE,
      span: 6,
      dead_load: 8,
      live_load: 5,
      tributary_width: 3,
      existing_width: 300,
      existing_depth: depth,
    });

  it("needs less steel as the supplied section gets deeper", () => {
    const shallow = supplied(450).area_steel_required;
    const middle = supplied(600).area_steel_required;
    const deep = supplied(700).area_steel_required;
    expect(middle).toBeLessThan(shallow);
    expect(deep).toBeLessThan(middle);
  });

  it("takes the minimum from the supplied depth, not the bending minimum", () => {
    // 0.13% of 300 x (600 - 25 - 25) = 214.5 mm² for Fe500.
    // The engine reports the area rounded up to a whole mm².
    expect(supplied(600).min_steel_area).toBe(
      Math.ceil(0.0013 * 300 * (600 - 50)),
    );
    expect(supplied(700).min_steel_area).toBe(
      Math.ceil(0.0013 * 300 * (700 - 50)),
    );
  });

  it("still warns when the supplied depth cannot carry the moment", () => {
    expect(supplied(450).warnings.join(" ")).toMatch(
      /compression steel|doubly reinforced|less than/i,
    );
  });
});

describe("beam effective span", () => {
  it("agrees with the depth it recommends, across spans and loads", () => {
    for (const span of [3, 4.5, 6, 7.5, 9]) {
      for (const live of [2, 6, 12]) {
        const r = designBeam({ ...BASE, span, live_load: live });
        expect(r.effective_span).toBeCloseTo(
          span + (r.recommended_depth - BASE.cover_mm - 25) / 1000,
          2,
        );
      }
    }
  });

  it("takes the moment on that span", () => {
    const r = designBeam(BASE);
    expect(r.max_moment).toBeCloseTo(
      (r.factored_load * r.effective_span ** 2) / 8,
      1,
    );
    expect(r.max_shear).toBeCloseTo(
      (r.factored_load * r.effective_span) / 2,
      1,
    );
  });
});

describe("doubly reinforced sections (BS 8110-1 Cl 3.4.4.4)", () => {
  const overloaded = (depth: number) =>
    designBeam({
      ...BASE,
      span: 5,
      dead_load: 15,
      live_load: 10,
      tributary_width: 5,
      existing_width: 300,
      existing_depth: depth,
    });

  it("splits the moment into a concrete part and a steel couple", () => {
    const r = overloaded(700);
    const d = 700 - BASE.cover_mm - 25;
    const kPrime = 0.156;
    const momentSingle = (kPrime * 25 * 300 * d ** 2) / 1e6;
    const excess = r.max_moment - momentSingle;
    const dPrime = BASE.cover_mm + 25;
    const expectedAsPrime =
      (excess * 1e6) / (0.87 * 500 * (d - dPrime));
    const expectedAsSingle =
      (momentSingle * 1e6) / (0.87 * 500 * 0.775 * d);
    expect(r.compression_steel_area).toBeCloseTo(expectedAsPrime, -1);
    expect(r.area_steel_required).toBeCloseTo(
      expectedAsSingle + expectedAsPrime,
      -1,
    );
  });

  it("asks for more tension steel than the formula that ignored the couple", () => {
    const r = overloaded(700);
    const d = 700 - BASE.cover_mm - 25;
    // The old output sized tension steel as M/(0.87 fy z) with z frozen at the
    // K = 0.156 lever arm, i.e. it let the concrete carry the whole moment at a
    // lever arm the concrete cannot reach. That understates the steel, so the
    // corrected figure has to be the larger of the two.
    const momentSingle = (0.156 * 25 * 300 * d ** 2) / 1e6;
    const oldStyle = (momentSingle * 1e6) / (0.87 * 500 * 0.775 * d);
    expect(r.area_steel_required).toBeGreaterThan(oldStyle);
    expect(r.compression_steel_area).toBeGreaterThan(0);
  });

  it("reports no compression steel when the section is singly reinforced", () => {
    const r = designBeam({ ...BASE, existing_width: 300, existing_depth: 700 });
    expect(r.compression_steel_area).toBe(0);
  });

  it("says so plainly when no bar arrangement will fit", () => {
    const r = overloaded(400);
    expect(r.area_steel_required).toBeGreaterThan(r.max_steel_area);
    expect(r.warnings.join(" ")).toMatch(/4 % practical maximum/i);
  });
});
