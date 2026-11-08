import { describe, expect, it } from "vitest";
import { designSlab } from "./structural-calculator";

/**
 * Independent verification of the slab corrections.
 *
 * Hand calculation, 5 m one-way panel, 150 mm deep, 25 mm cover, C30, Fe500,
 * Gk 2 + self weight, Qk 5:
 *
 *   self weight   0.150 x 24                     = 3.6 kN/m2
 *   factored      1.4 x (3.6 + 2) + 1.6 x 5      = 15.84 kN/m2
 *   M             wL^2/8 = 15.84 x 25 / 8        = 49.5 kN.m/m
 *   d             150 - 25 - 10                  = 115 mm
 *   K             M/(fcu b d^2) = 49.5e6/(30x1000x115^2) = 0.1248
 *   z             d(0.5 + sqrt(0.25 - K/0.9))
 *                 = 115(0.5 + sqrt(0.11137)) = 115 x 0.8337 = 95.9 mm
 *   As            M/(0.87 fy z) = 49.5e6/(0.87 x 500 x 95.9) = 1,187 mm2/m
 *   min As        0.13 % x 1000 x 150 (gross)    = 195 mm2/m
 *   M/(b d^2)     49.5e6/(1000 x 115^2)          = 3.743 N/mm2
 *   fs            2/3 x 500 x (1187/1508)        = 262 N/mm2
 *   mod factor    0.55 + (477-262)/(120(0.9+3.743)) = 0.94
 *   allowable     basic 20 x 0.94                = 18.7
 *   L/d           5000/115                       = 43.5  -> FAIL
 */
const THIN = {
  span_x: 5,
  span_y: 9,
  slab_type: "one_way" as const,
  support_condition: "simply_supported" as const,
  live_load: 5,
  dead_load: 2,
  concrete_grade: "C30" as const,
  steel_grade: "Fe500" as const,
  cover_mm: 25,
  existing_thickness: 150,
  market_code: "NG",
};

describe("slab lever arm", () => {
  const result = designSlab(THIN);

  it("sizes steel on the real lever arm, matching the hand value", () => {
    // z = 95.9 mm is 0.834d, not the 0.87d the engine used to assume.
    const K = 49.5e6 / (30 * 1000 * 115 * 115);
    const z = 115 * (0.5 + Math.sqrt(0.25 - K / 0.9));
    const expected = 49.5e6 / (0.87 * 500 * z);
    expect(result.steel_area_required).toBeCloseTo(expected, -1);
    expect(
      Math.abs(result.steel_area_required - expected) / expected,
    ).toBeLessThan(0.02);
  });

  it("regression: does not understate steel by pinning z at 0.87d", () => {
    // With z = 0.87d the same section would have been given 1,137 mm2/m.
    const at087 = 49.5e6 / (0.87 * 500 * 0.87 * 115);
    expect(result.steel_area_required).toBeGreaterThan(at087 * 1.02);
  });

  it("takes minimum steel from the gross section, not the effective depth", () => {
    // 0.13 % x 1000 x 150 = 195; the old rule used d and gave 149.5.
    const gross = (0.13 * 1000 * 150) / 100;
    const onDepth = (0.13 * 1000 * 115) / 100;
    expect(gross).toBeGreaterThan(onDepth);
    // A lightly loaded slab shows the minimum directly.
    const light = designSlab({ ...THIN, live_load: 0.1, dead_load: 0 });
    const lightMin = Math.max(
      (0.13 * 1000 * light.recommended_thickness) / 100,
      0,
    );
    expect(light.steel_area_required).toBeGreaterThanOrEqual(
      Math.max(lightMin, (0.13 * 1000 * 115) / 100),
    );
  });
});

describe("slab bar selection", () => {
  it("never details less steel than the design requires", () => {
    for (const span of [3, 4, 5, 6]) {
      for (const live of [2, 4, 6]) {
        const r = designSlab({ ...THIN, span_x: span, live_load: live });
        const provided =
          (1000 * Math.PI * Math.pow(r.recommended_bar_diameter / 2, 2)) /
          r.recommended_bar_spacing;
        expect(provided).toBeGreaterThanOrEqual(r.steel_area_required - 1);
      }
    }
  });

  it("regression: the case that used to be detailed under-strength", () => {
    // Required 1,187 was detailed as Y12@100 = 1,131 before the ladder.
    const result = designSlab(THIN);
    const provided =
      (1000 * Math.PI * Math.pow(result.recommended_bar_diameter / 2, 2)) /
      result.recommended_bar_spacing;
    expect(result.steel_area_required).toBeGreaterThan(1131);
    expect(provided).toBeGreaterThanOrEqual(result.steel_area_required);
  });
});

describe("slab deflection", () => {
  it("is a real check: a thin slab on a long span fails", () => {
    const result = designSlab(THIN);
    expect(result.deflection_check_pass).toBe(false);
    expect(result.span_to_depth_ratio).toBeCloseTo(43.5, 1);
    expect(result.warnings.join(" ")).toMatch(/Deflection check failed/i);
  });

  it("passes the slab it sized itself", () => {
    const result = designSlab({ ...THIN, existing_thickness: undefined });
    expect(result.deflection_check_pass).toBe(true);
    // The section it recommends must clear the panel's own minimum thickness
    // rule even though the modification factor lets it be thinner than the
    // bare span/depth requirement (audit fix F4).
    const floor = Math.max(100, (THIN.span_x * 1000) / 20);
    expect(result.recommended_thickness).toBeGreaterThanOrEqual(floor);
  });

  it("applies the modification factor, not the bare basic ratio", () => {
    // A generously reinforced slab gets a factor above 1.0 and a longer
    // allowable span/depth than the basic 20.
    const result = designSlab({
      ...THIN,
      existing_thickness: undefined,
      live_load: 1,
      dead_load: 0.5,
    });
    const formula = result.formula_transparency.find((f) =>
      f.startsWith("Modification factor"),
    );
    expect(formula).toBeTruthy();
    expect(result.deflection_check_pass).toBe(true);
  });
});

describe("slab two-way behaviour", () => {
  const twoWay = designSlab({
    ...THIN,
    span_x: 4,
    span_y: 5,
    slab_type: "two_way",
    support_condition: "simply_supported",
    existing_thickness: undefined,
  });

  it("designs steel in both directions", () => {
    expect(twoWay.moment_long_span).toBeGreaterThan(0);
    expect(twoWay.steel_area_secondary ?? 0).toBeGreaterThan(0);
    expect(twoWay.moment_long_span as number).toBeLessThan(twoWay.max_moment);
  });

  it("says when it is not crediting continuity", () => {
    const continuous = designSlab({
      ...THIN,
      span_x: 4,
      span_y: 5,
      slab_type: "two_way",
      support_condition: "continuous",
      existing_thickness: undefined,
    });
    expect(continuous.warnings.join(" ")).toMatch(/Table 3.15/);
  });
});

describe("basic span/depth ratios", () => {
  it("uses Table 3.9 values and nothing else", async () => {
    const { basicSpanDepthRatio } = await import("./structural-calculator");
    expect(basicSpanDepthRatio("cantilever")).toBe(7);
    expect(basicSpanDepthRatio("simply_supported")).toBe(20);
    expect(basicSpanDepthRatio("continuous")).toBe(26);
    expect(basicSpanDepthRatio("fixed")).toBe(26);
  });

  it("sizes a simply supported two-way panel to 20, not 26", () => {
    const r = designSlab({
      ...THIN,
      span_x: 4,
      span_y: 5,
      slab_type: "two_way",
      support_condition: "simply_supported",
      existing_thickness: undefined,
    });
    // The bare Table 3.9 ratio of 20 for a simply supported member is what
    // required_thickness reports: d = 4000/20 = 200 mm, + 25 cover + 10 = 235,
    // rounded to 250 mm. The recommended section may be thinner than that
    // because the Cl 3.4.6.5 modification factor for the steel provided is
    // applied, and that is the check that must pass (audit fix F4).
    const dRequired = r.required_thickness - 35;
    expect(dRequired).toBeGreaterThanOrEqual(200);
    expect(r.deflection_check_pass).toBe(true);
    expect(r.recommended_thickness).toBeLessThan(r.required_thickness);
  });

  it("sizes a continuous panel to 26, not 32", () => {
    const r = designSlab({
      ...THIN,
      span_x: 6,
      span_y: 7,
      slab_type: "one_way",
      support_condition: "continuous",
      existing_thickness: undefined,
    });
    const d = r.recommended_thickness - 35;
    expect(d).toBeGreaterThanOrEqual(Math.floor(6000 / 26 - 1));
  });
});
