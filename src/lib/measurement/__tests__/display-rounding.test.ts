import { describe, expect, it } from "vitest";
import { roundForDisplay, roundUpToWholeUnit } from "@/lib/measurement/geometry";

describe("display rounding and purchasable units", () => {
  it("rounds a stored half cent away from zero", () => {
    expect(roundForDisplay(8.165, 2)).toBe(8.17);
    expect(roundForDisplay(1.005, 2)).toBe(1.01);
    expect(roundForDisplay(Number.NaN, 2)).toBe(0);
  });

  it("does not add a carton for a floating point hair", () => {
    // 4.2 litres over 1.4 litre cartons divides to 3.0000000000000004 in
    // binary, which used to order a fourth carton for nothing.
    expect(roundUpToWholeUnit(4.2 / 1.4)).toBe(3);
    expect(roundUpToWholeUnit(4.000000000000001)).toBe(4);
    // A genuine part carton still rounds up.
    expect(roundUpToWholeUnit(4.4)).toBe(5);
    expect(roundUpToWholeUnit(3.9999)).toBe(4);
  });
});
