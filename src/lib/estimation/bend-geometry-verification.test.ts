import { describe, it, expect } from "vitest";
import {
  bendDeductionMm,
  bs8666CutLength,
  bs8666MandrelDiameterMm,
  rebarKgPerMetre,
} from "./reinforcement-engine";

/**
 * Bend geometry, checked against the geometry itself.
 *
 * A bar dimensioned as legs to the outside corner points is longer than the bar.
 * Each leg runs (r + d) past the tangent point, and the arc replaces the corner:
 *
 *     deduction(θ) = 2(r + d)·tan(θ/2) − θ·(r + d/2)
 *
 * with the BS 8666 minimum mandrel of 4d for bars up to 16 mm and 7d above it.
 * These tests fix the arithmetic so a bend cannot drift back to a remembered
 * constant.
 */

describe("bend deductions", () => {
  it("uses the BS 8666 mandrel: 4d up to 16 mm, 7d above", () => {
    expect(bs8666MandrelDiameterMm(8)).toBe(32);
    expect(bs8666MandrelDiameterMm(16)).toBe(64);
    expect(bs8666MandrelDiameterMm(20)).toBe(140);
    expect(bs8666MandrelDiameterMm(32)).toBe(224);
  });

  it("gives the familiar 2.07d at a 90° bend, which is the 2d of practice", () => {
    // r = 2d, so 2(3d) − (π/2)(2.5d) = 6d − 3.927d = 2.073d
    for (const d of [6, 8, 10, 12, 16]) {
      expect(bendDeductionMm(d, 90) / d).toBeCloseTo(2.073, 3);
    }
  });

  it("grows for a larger mandrel on heavy bars", () => {
    // r = 3.5d: 2(4.5d) − (π/2)(4d) = 2.717d
    expect(bendDeductionMm(20, 90) / 20).toBeCloseTo(2.717, 3);
    expect(bendDeductionMm(25, 90) / 25).toBeCloseTo(2.717, 3);
  });

  it("is far larger at 135°, which is why a hook is not a 90° bend", () => {
    // 2(24)tan(67.5°) − (3π/4)(20) = 115.88 − 47.12 = 68.76 mm for an 8 mm bar
    expect(bendDeductionMm(8, 135)).toBeCloseTo(68.758, 3);
    expect(bendDeductionMm(8, 135) / 8).toBeCloseTo(8.59, 2);
    expect(bendDeductionMm(8, 135)).toBeGreaterThan(
      4 * bendDeductionMm(8, 90),
    );
  });

  it("vanishes at a straight bar", () => {
    expect(bendDeductionMm(12, 0)).toBeCloseTo(0, 9);
  });
});

describe("cut lengths", () => {
  it("shortens an L-bar by one 90° deduction", () => {
    // 2000 − 2(32 + 16) + (π/2)(32 + 8) = 2000 − 96 + 62.83 = 1966.8
    const cut = bs8666CutLength({
      shapeCode: "11",
      diameterMm: 16,
      dims: { a: 1000, b: 1000 },
    });
    expect(cut.cutLengthMm).toBeCloseTo(1966.8, 1);
    expect(cut.bendRadiusMm).toBe(32);
  });

  it("shortens a U-bar by two 90° deductions", () => {
    const cut = bs8666CutLength({
      shapeCode: "21",
      diameterMm: 12,
      dims: { a: 1000, b: 400, c: 1000 },
    });
    const d = 12;
    const r = 24;
    const expected = 2400 - 4 * (r + d) + 2 * ((Math.PI / 2) * (r + d / 2));
    expect(cut.cutLengthMm).toBeCloseTo(expected, 0);
  });

  it("deducts both 135° hook bends on a link", () => {
    // 2(250 + 450) − 8(24) + 4(π/2)(20) + 2(80) − 2(68.758) = 1356.1
    const cut = bs8666CutLength({
      shapeCode: "51",
      diameterMm: 8,
      dims: { a: 250, b: 450 },
    });
    const hooks = 2 * 80;
    const corners = -8 * 24 + 4 * ((Math.PI / 2) * 20);
    const hookBends = -2 * bendDeductionMm(8, 135);
    expect(cut.cutLengthMm).toBeCloseTo(
      1400 + corners + hooks + hookBends,
      0,
    );
    expect(cut.hookBendDeductionMm).toBeCloseTo(137.5, 1);
    // Without the hook deductions the bar would be cut 137.5 mm long: scrap at
    // best, a hook that will not close at worst.
    expect(1400 + corners + hooks - (cut.cutLengthMm as number)).toBeCloseTo(
      137.5,
      0,
    );
  });

  it("keeps the schedule mass arithmetic exact", () => {
    // 0.006165 d² is steel at 7,850 kg/m³: π/4 × 7.85e-3 × d² = 0.006165 d²
    for (const d of [6, 8, 10, 12, 16, 20, 25, 32]) {
      expect(rebarKgPerMetre(d)).toBeCloseTo(
        (Math.PI / 4) * d * d * 0.00000785 * 1000,
        3,
      );
    }
    // The site rule d²/162 must agree with it to better than 0.5 %.
    for (const d of [8, 12, 16, 25]) {
      const rule = (d * d) / 162;
      expect(Math.abs(rule - rebarKgPerMetre(d)) / rebarKgPerMetre(d)).toBeLessThan(
        0.005,
      );
    }
  });
});
