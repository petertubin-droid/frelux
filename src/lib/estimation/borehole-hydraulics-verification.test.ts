import { describe, expect, it } from "vitest";
import { calculateHazenWilliamsFrictionHead } from "./borehole-water-system-engine";

/**
 * The borehole pump head rests on one hydraulic relation, so it is checked
 * against a worked example rather than against itself: h = 10.67 L Q^1.852 /
 * (C^1.852 D^4.87) for Q in m3/s and D in m.
 *
 * 50 mm bore carrying 5 L/s over 100 m at C = 140 clears 2.55 m/s, which is a
 * normal design velocity for a rising main, and the published Hazen-Williams
 * loss for it is about 13 m per 100 m. The flow, diameter and length dependence
 * are checked separately against their exponents so a transposed exponent would
 * fail even if the single example still happened to pass.
 */
describe("Hazen-Williams friction head", () => {
  it("reproduces the published loss for 50 mm at 5 L/s over 100 m", () => {
    // Q in m3/h: 5 L/s = 18 m3/h.
    const h = calculateHazenWilliamsFrictionHead(100, 18, 50, 140);
    // 10.67 x 100 x 0.005^1.852 / (140^1.852 x 0.05^4.87) = 13.429 m.
    expect(h).toBeCloseTo(13.43, 2);
  });

  it("scales with the 1.852 flow exponent", () => {
    const single = calculateHazenWilliamsFrictionHead(100, 10, 50, 140);
    const triple = calculateHazenWilliamsFrictionHead(100, 30, 50, 140);
    expect(triple / single).toBeCloseTo(3 ** 1.852, 2);
  });

  it("scales with the 4.87 diameter exponent", () => {
    const small = calculateHazenWilliamsFrictionHead(100, 10, 50, 140);
    const large = calculateHazenWilliamsFrictionHead(100, 10, 100, 140);
    expect(small / large).toBeCloseTo(2 ** 4.87, 1);
  });

  it("scales with the 1.852 roughness exponent", () => {
    const smooth = calculateHazenWilliamsFrictionHead(100, 10, 50, 140);
    const rough = calculateHazenWilliamsFrictionHead(100, 10, 50, 100);
    expect(rough / smooth).toBeCloseTo((140 / 100) ** 1.852, 4);
  });

  it("scales linearly with length and refuses unusable input", () => {
    const hundred = calculateHazenWilliamsFrictionHead(100, 10, 50, 140);
    const threeHundred = calculateHazenWilliamsFrictionHead(300, 10, 50, 140);
    expect(threeHundred / hundred).toBeCloseTo(3, 6);
    expect(calculateHazenWilliamsFrictionHead(0, 10, 50, 140)).toBe(0);
    expect(calculateHazenWilliamsFrictionHead(100, 0, 50, 140)).toBe(0);
    expect(calculateHazenWilliamsFrictionHead(100, 10, 0, 140)).toBe(0);
  });
});
