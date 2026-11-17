import { describe, expect, it } from "vitest";
import {
  bsMinimizedLinkLength,
  bsShapeLength,
  type BsShapeInput,
} from "@/lib/engineering/bbs-schedule";

/**
 * BS 8666:2020 Table 3 shape formulas, pinned to the published text.
 *
 * Source: the standard's own shape chart as published by Collins Reinforcements
 * (rebar.co.uk, BS 8666:2020 Table 3), which prints each code's length equation:
 *   33  2A + 1.7B + 2(C) - 4d
 *   41  A + B + C + D + (E) - 2r - 4d
 *   51  2[A + B + (C)] - 2.5r - 5d, minimized 2A + 2B + max(16d, 160)
 *   63  2A + 3B + (2C) - 3r - 6d
 *   67  A
 *   75  pi(A - d) + B + 25
 *   77  C pi (A - d), and where B is greater than A/5,
 *       L = C{[pi(A - d)]^2 + B^2}^0.5
 *   11  A + B - 0.5r - d
 *   21  A + B + C - r - 2d
 *
 * Every figure below is worked by hand from those equations at d = 16 mm and
 * r = 2d = 32 mm, so a formula that drifts from the chart fails here rather
 * than in a fabricator's bar list.
 */
const base: BsShapeInput = {
  A: 1000,
  B: 400,
  C: 300,
  D: 200,
  E: 500,
  d: 16,
  r: 32,
};

const cut = (shapeCode: Parameters<typeof bsShapeLength>[0], input = base) =>
  bsShapeLength(shapeCode, input);

describe("BS 8666 Table 3 shape formulas", () => {
  it("cuts a straight bar at its scheduled dimension", () => {
    expect(cut("00").L).toBe(1000);
    expect(cut("67").L).toBe(1000);
  });

  it("deducts half a radius and one diameter for a single bend", () => {
    // 1000 + 400 - 16 - 16 = 1368 ; with r = 2d = 32 the deduction is 32
    expect(cut("11").L).toBe(1000 + 400 - 0.5 * 32 - 16);
    expect(cut("11").L).toBe(1368);
  });

  it("deducts one radius and two diameters for a U-bar", () => {
    // 1000 + 400 + 300 - 32 - 32 = 1636
    expect(cut("21").L).toBe(1636);
  });

  it("applies the published 1.7B coefficient to shape 33", () => {
    // 2000 + 1.7 x 400 + 600 - 64 = 3216
    expect(cut("33").L).toBe(3216);
    expect(cut("33").formula).toContain("2A + 1.7B + 2(C) - 4d");
  });

  it("deducts two radii and four diameters for a four-bend bar", () => {
    // 1000 + 400 + 300 + 200 + 500 - 64 - 64 = 2272
    expect(cut("41").L).toBe(2272);
  });

  it("cuts a closed link on five half-radius deductions", () => {
    // 2 x 1700 - 80 - 80 = 3240
    expect(cut("51").L).toBe(3240);
    expect(cut("51").formula).toContain("2[A + B + (C)] - 2.5r - 5d");
  });

  it("cuts shape 63 on three radii and six diameters", () => {
    // 2000 + 1200 + 600 - 96 - 96 = 3608
    expect(cut("63").L).toBe(3608);
  });

  it("uses the minimized-hook link formulas where hooks are not scheduled", () => {
    // 51: 2000 + 800 + max(16 x 16 = 256, 160) = 3056
    expect(bsMinimizedLinkLength("51", base).L).toBe(3056);
    // 63 at d = 16: 2000 + 1200 + max(224, 140) = 3424
    expect(bsMinimizedLinkLength("63", base).L).toBe(3424);
    // 63 at d = 20: 2000 + 1200 + 13 x 20 = 3460
    expect(bsMinimizedLinkLength("63", { ...base, d: 20 }).L).toBe(3460);
  });

  it("spirals a helix at pi(A - d) per turn", () => {
    const helix = { A: 1000, C: 10, d: 16, r: 32 };
    // 10 x pi x 984 = 30913.27
    expect(cut("77", helix).L).toBeCloseTo(30913.27, 2);
  });

  it("switches to the pitched helix once the lap exceeds A/5", () => {
    const pitched = { A: 1000, B: 250, C: 10, d: 16, r: 32 };
    // 10 x sqrt((pi x 984)^2 + 250^2) = 31014.20
    expect(cut("77", pitched).L).toBeCloseTo(31014.2, 2);
    expect(cut("77", pitched).formula).toContain("B > A/5");
  });

  it("refuses a helix with no turn count and an unsupported code", () => {
    expect(() => cut("77", { A: 1000, C: 0, d: 16 })).toThrow(
      /number of turns/,
    );
    expect(() =>
      cut("75" as Parameters<typeof bsShapeLength>[0], base),
    ).toThrow(/Unsupported/);
  });
});
