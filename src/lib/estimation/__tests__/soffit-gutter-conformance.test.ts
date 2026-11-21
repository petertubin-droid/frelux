import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOFFIT_GUTTER_RULES,
  calculateSoffitGutter,
  resolveEavesPerimeter,
  type SoffitGutterInput,
} from "../soffit-gutter-engine";

/**
 * Conformance suite for soffit, fascia and gutter.
 *
 * Expectations come from the geometry of an eaves line and from how the
 * materials are bought:
 *
 * - The eaves perimeter of a rectangular roof oversailing on all four sides is
 *   2(L + 2o) + 2(W + 2o), measured at the fascia, not at the wall.
 * - Fascia and gutter are linear runs along that perimeter, bought with a
 *   cutting allowance.
 * - The soffit is a BAND around the building, not a strip: its area is the
 *   outer rectangle minus the footprint, (L + 2o)(W + 2o) - LW. Multiplying
 *   perimeter by overhang counts the four corner squares twice.
 * - Downpipes and brackets are bought as whole pieces at a spacing.
 */
const RULES = DEFAULT_SOFFIT_GUTTER_RULES;

const footprint: SoffitGutterInput = {
  mode: "footprint",
  building_length_m: 15,
  building_width_m: 10,
  overhang_m: 0.6,
  material: "aluminium",
};

describe("soffit: eaves perimeter", () => {
  it("measures at the fascia, so the overhang adds to all four sides", () => {
    // 2(15 + 1.2) + 2(10 + 1.2) = 32.4 + 22.4 = 54.8 m
    expect(resolveEavesPerimeter(footprint)).toBeCloseTo(54.8, 2);
  });

  it("accepts a measured perimeter as it stands", () => {
    expect(
      resolveEavesPerimeter({
        mode: "perimeter",
        perimeter_m: 54.8,
        overhang_m: 0.6,
        material: "pvc",
      }),
    ).toBeCloseTo(54.8, 2);
  });

  it("refuses a footprint with a missing side or a negative overhang", () => {
    expect(
      resolveEavesPerimeter({ ...footprint, building_width_m: null }),
    ).toBeNull();
    expect(resolveEavesPerimeter({ ...footprint, overhang_m: -0.1 })).toBeNull();
    expect(
      resolveEavesPerimeter({ ...footprint, building_length_m: 0 }),
    ).toBeNull();
  });
});

describe("soffit: the band, not the strip", () => {
  it("takes the band area as the outer rectangle minus the footprint", () => {
    const r = calculateSoffitGutter(
      { ...footprint, overhang_m: 0.6 },
      { ...RULES, waste_pct: 0 },
      {},
    );
    // (15 + 1.2)(10 + 1.2) - 150 = 181.44 - 150 = 31.44 m2
    const soffit = r.lines.find((l) => l.key === "soffit")!;
    expect(soffit.quantity).toBeCloseTo(31.44, 2);
  });

  it("does not double-count the four corner squares", () => {
    const r = calculateSoffitGutter(
      { ...footprint, overhang_m: 0.6 },
      { ...RULES, waste_pct: 0 },
      {},
    );
    const soffit = r.lines.find((l) => l.key === "soffit")!;
    const strip = 54.8 * 0.6; // the old figure: perimeter x overhang
    expect(soffit.quantity!).toBeLessThan(strip);
    expect(strip - soffit.quantity!).toBeCloseTo(4 * 0.6 * 0.6, 2);
  });

  it("keeps the strip figure as an upper bound when only a perimeter is known", () => {
    const r = calculateSoffitGutter(
      {
        mode: "perimeter",
        perimeter_m: 54.8,
        overhang_m: 0.6,
        material: "aluminium",
      },
      { ...RULES, waste_pct: 0 },
      {},
    );
    const soffit = r.lines.find((l) => l.key === "soffit")!;
    expect(soffit.quantity).toBeCloseTo(54.8 * 0.6, 2);
  });

  it("the gap between the two methods is the corner area, and grows with overhang", () => {
    const band = (o: number) =>
      (15 + 2 * o) * (10 + 2 * o) - 15 * 10;
    const strip = (o: number) => (2 * (15 + 2 * o) + 2 * (10 + 2 * o)) * o;
    for (const o of [0.3, 0.6, 1.0]) {
      expect(strip(o) - band(o)).toBeCloseTo(4 * o * o, 6);
    }
    // A 1 m overhang on the same building overstates by 4 m2 of panel.
    expect(strip(1) - band(1)).toBeCloseTo(4, 6);
  });
});

describe("soffit: linear runs and fittings", () => {
  it("runs fascia and gutter along the perimeter with the cutting allowance", () => {
    const r = calculateSoffitGutter(footprint, { ...RULES, waste_pct: 5 }, {});
    const fascia = r.lines.find((l) => l.key === "fascia")!;
    const gutter = r.lines.find((l) => l.key === "gutter")!;
    expect(fascia.quantity).toBeCloseTo(54.8 * 1.05, 2);
    expect(gutter.quantity).toBeCloseTo(54.8 * 1.05, 2);
  });

  it("buys downpipes as whole pieces at the spacing", () => {
    const r = calculateSoffitGutter(footprint, RULES, {});
    const downpipes = r.lines.find((l) => l.key === "downpipes")!;
    // 54.8 / 12 = 4.57, so 5 pieces.
    expect(downpipes.quantity).toBe(5);
    expect(downpipes.unit).toBe("pieces");
  });

  it("buys brackets along the gutter at 600 mm centres", () => {
    const r = calculateSoffitGutter(footprint, RULES, {});
    const brackets = r.lines.find((l) => l.key === "brackets")!;
    // 57.54 m of gutter (5 per cent waste) / 0.6 = 95.9, so 96.
    expect(brackets.quantity).toBe(96);
  });

  it("a tighter bracket spacing buys more brackets", () => {
    const wide = calculateSoffitGutter(footprint, { ...RULES, bracket_spacing_m: 0.9 }, {});
    const tight = calculateSoffitGutter(footprint, { ...RULES, bracket_spacing_m: 0.45 }, {});
    const q = (r: ReturnType<typeof calculateSoffitGutter>) =>
      r.lines.find((l) => l.key === "brackets")!.quantity!;
    expect(q(tight)).toBeGreaterThan(q(wide));
  });

  it("selects the soffit panel line the chosen material implies", () => {
    const aluminium = calculateSoffitGutter(footprint, RULES, {});
    const pvc = calculateSoffitGutter({ ...footprint, material: "pvc" }, RULES, {});
    const slug = (r: ReturnType<typeof calculateSoffitGutter>) =>
      r.lines.find((l) => l.key === "soffit")!.material_slug;
    expect(slug(aluminium)).toBe("soffit-panel-aluminium-per-m2");
    expect(slug(pvc)).toBe("soffit-panel-pvc-per-m2");
  });
});

describe("soffit: refusals and honesty", () => {
  it("refuses to price a run with no perimeter at all", () => {
    const r = calculateSoffitGutter(
      { mode: "perimeter", perimeter_m: null, overhang_m: 0.6, material: "pvc" },
      RULES,
      {},
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/perimeter/i);
  });

  it("warns that the eaves line is not the wall line", () => {
    const r = calculateSoffitGutter(footprint, RULES, {});
    expect(r.warnings.join(" ")).toMatch(/eaves line, not at the wall/i);
  });

  it("flags a deep overhang that needs support", () => {
    const shallow = calculateSoffitGutter({ ...footprint, overhang_m: 0.6 }, RULES, {});
    const deep = calculateSoffitGutter({ ...footprint, overhang_m: 1.2 }, RULES, {});
    expect(shallow.warnings.join(" ")).not.toMatch(/soffit support or bearer/i);
    expect(deep.warnings.join(" ")).toMatch(/soffit support or bearer/i);
  });

  it("says outlets, stop ends and the receiving water are not included", () => {
    const r = calculateSoffitGutter(footprint, RULES, {});
    expect(r.warnings.join(" ")).toMatch(/outlets, stop ends/i);
  });
});
