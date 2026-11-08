import { describe, expect, it } from "vitest";
import { isKnownLengthUnit, unitToMeters } from "@/lib/utils";

describe("unitToMeters", () => {
  it("converts the five selectable units exactly", () => {
    expect(unitToMeters(12, "feet")).toBeCloseTo(3.6576, 10);
    expect(unitToMeters(96, "inches")).toBeCloseTo(2.4384, 10);
    expect(unitToMeters(250, "centimeters")).toBeCloseTo(2.5, 10);
    expect(unitToMeters(2700, "millimeters")).toBeCloseTo(2.7, 10);
    expect(unitToMeters(4.5, "meters")).toBe(4.5);
  });

  it("answers zero for a unit it does not know, never NaN", () => {
    // A stored preference or a legacy record can carry any string at runtime.
    const bogus = "furlongs" as unknown as "meters";
    expect(unitToMeters(12, bogus)).toBe(0);
    expect(Number.isNaN(unitToMeters(12, bogus))).toBe(false);
    expect(isKnownLengthUnit(bogus)).toBe(false);
  });

  it("answers zero for a non-finite value rather than propagating it", () => {
    expect(unitToMeters(Number.NaN, "meters")).toBe(0);
    expect(unitToMeters(Number.POSITIVE_INFINITY, "feet")).toBe(0);
  });

  it("recognises every unit it offers", () => {
    for (const unit of [
      "meters",
      "feet",
      "inches",
      "centimeters",
      "millimeters",
    ] as const) {
      expect(isKnownLengthUnit(unit)).toBe(true);
    }
  });
});
