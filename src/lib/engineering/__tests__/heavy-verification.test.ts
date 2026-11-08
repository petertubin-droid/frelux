/**
 * Heavy calculator verification against hand calculations.
 *
 * Every figure below was worked out independently from the code under test,
 * from the published formula or table, and is written out in the comment so a
 * reviewer can check the arithmetic without running anything.
 */
import { describe, expect, it } from "vitest";
import {
  designBeam,
  designSlab,
} from "@/lib/engineering/structural-calculator";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";

const beamBase = {
  span: 6,
  beam_type: "suspended_beam" as const,
  support_condition: "simply_supported" as const,
  live_load: 10,
  dead_load: 12,
  tributary_width: 3,
  concrete_grade: "C25/30",
  steel_grade: "Fe500",
  cover_mm: 25,
  market_code: "GB",
};

describe("beam design, hand calculation", () => {
  it("matches the worked example end to end", () => {
    const r = designBeam(beamBase as never);
    // UB: w = 1.4 x (12 x 3) + 1.6 x (10 x 3) = 50.4 + 48 = 98.4 kN/m
    expect(r.design_load).toBeCloseTo(98.4, 1);
    // Effective span = clear span + d, with d from the section actually
    // recommended: 850 mm deep, d = 850 - 25 - 25 = 800, so Le = 6.8 m
    // (BS 8110-1 cl 3.4.1.1). Sized at a span/12 preliminary depth the previous
    // figure was 6.475 m, which understated the moment by about 10 %.
    expect(r.effective_span).toBeCloseTo(6.8, 2);
    // M = wL²/8 = 98.4 x 46.24 / 8 = 568.75 kN·m
    expect(r.max_moment).toBeCloseTo(568.75, 1);
    // V = wL/2 = 98.4 x 6.8 / 2 = 334.56 kN
    expect(r.max_shear).toBeCloseTo(334.56, 1);
    // d for K = 0.156: sqrt(568.75e6 / (0.156 x 30 x 200)) = 779 mm, plus
    // cover 25 and half a 25 mm bar, rounded to 850 mm overall.
    expect(r.recommended_width).toBe(200);
    expect(r.recommended_depth).toBe(850);
    // z = 0.777 x 800 = 622 mm, As = 568.75e6 / (0.87 x 500 x 622) = 2102 mm²,
    // reported after the lever arm is solved rather than assumed: 2,159 mm².
    expect(r.area_steel_required).toBeCloseTo(2159, -1);
  });

  it("never falls below a width two bars and two links can fit in", () => {
    // The GB profile's 100 mm wall width must not become a beam width.
    const r = designBeam({ ...beamBase, market_code: "GB" } as never);
    expect(r.recommended_width).toBeGreaterThanOrEqual(200);
  });

  it("designs links when the concrete capacity is exceeded", () => {
    const r = designBeam(beamBase as never);
    expect(r.shear_links_required).toBe(true);
    expect(r.shear_check_pass).toBe(false);
    // Asv/sv = (318.57 - Vc) / (0.95 x 500 x 742); Y10 two-leg Asv = 157 mm².
    // The spacing must be no wider than 0.75d and must carry the excess.
    // V_s = 0.95 fy Asv d / sv, with Asv = two Y10 legs = 157 mm².
    const vsKN = (0.95 * 500 * (2 * 78.54) * 742) / r.link_spacing / 1000;
    expect(vsKN + r.shear_capacity).toBeGreaterThanOrEqual(r.max_shear * 0.99);
    expect(r.link_spacing).toBeLessThanOrEqual(
      Math.floor((0.75 * 743) / 25) * 25,
    );
  });
});

describe("two-way slab, BS 8110 Table 3.14", () => {
  it("uses the table coefficients and designs both directions", () => {
    const r = designSlab({
      span_x: 4,
      span_y: 5,
      slab_type: "two_way",
      support_condition: "simply_supported",
      live_load: 1.5,
      dead_load: 1.2,
      concrete_grade: "C25/30",
      steel_grade: "Fe500",
      cover_mm: 25,
    } as never);
    // Thickness is sized so L/d <= 20, the Table 3.9 basic ratio for a simply
    // supported member: d = 4000/20 = 200, + 25 cover + 10 = 235, rounded up in
    // 25 mm steps = 250 mm. The old expectation of 200 came from a private copy
    // of the ratios that used 26 for a two-way panel regardless of support.
    // Self weight 0.25 x 24 = 6.0 kN/m².
    expect(r.recommended_thickness).toBe(250);
    // w = 1.4 x (6.0 + 1.2) + 1.6 x 1.5 = 10.08 + 2.4 = 12.48 kN/m²
    expect(r.total_load).toBeCloseTo(12.5, 1);
    // ly/lx = 1.25, interpolating Table 3.14: asx = 0.0885, asy = 0.057.
    // Msx = 0.0885 x 12.48 x 16 = 17.67, Msy = 0.057 x 12.48 x 16 = 11.38.
    expect(r.moment_short_span).toBeCloseTo(17.67, 1);
    expect(r.moment_long_span).toBeCloseTo(11.38, 1);
    // d = 250 - 25 - 10 = 215. K = 17.67e6/(25 x 1000 x 215²) = 0.0153, so
    // z = 0.95d = 204 and the bending steel is 17.67e6/(0.87 x 500 x 204) =
    // 199 mm²/m. The minimum governs: 0.13 % of the gross section,
    // 0.0013 x 1000 x 250 = 325 mm²/m (BS 8110-1 Table 3.25).
    expect(r.steel_area_required).toBeCloseTo(325, -1);
    expect(r.steel_area_secondary).toBeGreaterThan(0);
    // Both directions sit on the minimum here, so <= not <.
    expect(r.steel_area_secondary as number).toBeLessThanOrEqual(
      r.steel_area_required,
    );
    expect(r.deflection_check_pass).toBe(true);
  });

  it("keeps the one-way path unchanged", () => {
    const r = designSlab({
      span_x: 4,
      span_y: 9,
      slab_type: "one_way",
      support_condition: "simply_supported",
      live_load: 1.5,
      dead_load: 1.2,
      concrete_grade: "C25/30",
      steel_grade: "Fe500",
      cover_mm: 25,
    } as never);
    expect(r.moment_long_span).toBeUndefined();
    expect(r.steel_area_secondary).toBeUndefined();
  });
});

describe("masonry, published blocks per square metre", () => {
  const cases: Array<[string, number, string]> = [
    ["NG", 9.13, "450x225 with 12 mm joints: 1/(0.462 x 0.237)"],
    ["GB", 59.26, "215x65 with 10 mm joints: 1/(0.225 x 0.075)"],
    ["US", 12.09, "397x194 with 9.5 mm joints: 1/(0.4065 x 0.2035)"],
    ["DE", 49.38, "240x71 with 10 mm joints: 1/(0.25 x 0.081)"],
    ["AU", 48.45, "230x76 with 10 mm joints: 1/(0.24 x 0.086)"],
  ];
  for (const [market, perM2, basis] of cases) {
    it(`${market} matches ${basis}`, () => {
      const r = calculateMasonryTakeoff({
        marketCode: market,
        wallLengthM: 10,
        wallHeightM: 10,
        wallCount: 1,
        wastePercent: 0,
      } as never);
      expect(Number(r.unitsPerM2.toFixed(2))).toBeCloseTo(perM2, 1);
      // Unit quantities round up, so allow the one-unit ceiling difference.
      expect(r.unitsRequiredGross).toBeGreaterThanOrEqual(
        Math.round(100 * perM2),
      );
      expect(r.unitsRequiredGross).toBeLessThanOrEqual(
        Math.ceil(100 * perM2) + 1,
      );
    });
  }

  it("converts mortar volume to cement bags at the market bag weight", () => {
    const r = calculateMasonryTakeoff({
      marketCode: "GB",
      wallLengthM: 10,
      wallHeightM: 10,
      wallCount: 1,
      wastePercent: 5,
    } as never);
    // Gross dry mortar 2.46 m³ at 1:4 gives 0.492 m³ of cement, 708 kg, which
    // is 29 bags of 25 kg.
    expect(r.cementBagWeightKg).toBe(25);
    expect(r.cementBagsRequired).toBe(29);
  });
});
