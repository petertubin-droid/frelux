import { describe, it, expect } from "vitest";
import {
  FT_TO_M,
  INCH_TO_M,
  M_TO_FT,
  SQM_TO_SQFT,
  SQFT_TO_SQM,
  toMeters,
  fromMeters,
  toSqMeters,
  fromSqMeters,
  sqftToSqm,
  sqmToSqft,
  getAllowedUnits,
  isInchesAllowed,
  lengthUnitLabel,
  lengthUnitShort,
  areaUnitLabel,
  tileDimensionToMeters,
  tileAreaM2,
} from "@/lib/measurement/units";

describe("conversion constants", () => {
  it("FT_TO_M = 0.3048", () => expect(FT_TO_M).toBe(0.3048));
  it("INCH_TO_M = 0.0254", () => expect(INCH_TO_M).toBe(0.0254));
  it("M_TO_FT = 1/0.3048", () => expect(M_TO_FT).toBeCloseTo(3.28084, 5));
  it("SQFT_TO_SQM = 0.092903", () =>
    expect(SQFT_TO_SQM).toBeCloseTo(0.092903, 5));
  it("SQM_TO_SQFT = 10.7639", () =>
    expect(SQM_TO_SQFT).toBeCloseTo(10.7639, 3));
});

describe("toMeters", () => {
  it("returns meters unchanged", () => expect(toMeters(5, "meters")).toBe(5));
  it("converts feet to meters", () =>
    expect(toMeters(10, "feet")).toBeCloseTo(3.048, 4));
  it("converts inches to meters", () =>
    expect(toMeters(100, "inches")).toBeCloseTo(2.54, 3));
  it("handles zero", () => expect(toMeters(0, "meters")).toBe(0));
});

describe("fromMeters", () => {
  it("returns meters unchanged", () => expect(fromMeters(5, "meters")).toBe(5));
  it("converts meters to feet", () =>
    expect(fromMeters(1, "feet")).toBeCloseTo(3.28084, 4));
  it("converts meters to inches", () =>
    expect(fromMeters(1, "inches")).toBeCloseTo(39.3701, 3));
});

describe("toSqMeters", () => {
  it("returns sqm unchanged", () => expect(toSqMeters(10, "sqm")).toBe(10));
  it("converts sqft to sqm", () =>
    expect(toSqMeters(100, "sqft")).toBeCloseTo(9.2903, 3));
});

describe("fromSqMeters", () => {
  it("returns sqm unchanged", () => expect(fromSqMeters(10, "sqm")).toBe(10));
  it("converts sqm to sqft", () =>
    expect(fromSqMeters(10, "sqft")).toBeCloseTo(107.639, 2));
});

describe("sqftToSqm / sqmToSqft", () => {
  it("sqftToSqm converts correctly", () =>
    expect(sqftToSqm(100)).toBeCloseTo(9.2903, 3));
  it("sqmToSqft converts correctly", () =>
    expect(sqmToSqft(10)).toBeCloseTo(107.639, 2));
  it("are inverses", () =>
    expect(sqmToSqft(sqftToSqm(100))).toBeCloseTo(100, 0));
});

describe("getAllowedUnits", () => {
  it("block includes inches", () => {
    expect(getAllowedUnits("block")).toContain("inches");
    expect(getAllowedUnits("block")).toHaveLength(3);
  });
  it("painting excludes inches", () => {
    expect(getAllowedUnits("painting")).not.toContain("inches");
    expect(getAllowedUnits("painting")).toHaveLength(2);
  });
  it("tiling excludes inches", () => {
    expect(getAllowedUnits("tiling")).not.toContain("inches");
  });
  it("screeding excludes inches", () => {
    expect(getAllowedUnits("screeding")).not.toContain("inches");
  });
  it("all non-block contexts return only feet and meters", () => {
    const ctxs = [
      "painting",
      "screeding",
      "tiling",
      "grafitex",
      "pop",
      "tyrolene",
      "fence_screeding",
      "fence_painting",
    ] as const;
    ctxs.forEach((ctx) => {
      const units = getAllowedUnits(ctx);
      expect(units).toEqual(["feet", "meters"]);
    });
  });
});

describe("isInchesAllowed", () => {
  it("true for block", () => expect(isInchesAllowed("block")).toBe(true));
  it("false for painting", () =>
    expect(isInchesAllowed("painting")).toBe(false));
  it("false for tiling", () => expect(isInchesAllowed("tiling")).toBe(false));
});

describe("lengthUnitLabel", () => {
  it("feet → 'Feet'", () => expect(lengthUnitLabel("feet")).toBe("Feet"));
  it("meters → 'Metres'", () =>
    expect(lengthUnitLabel("meters")).toBe("Metres"));
  it("inches → 'Inches'", () =>
    expect(lengthUnitLabel("inches")).toBe("Inches"));
});

describe("lengthUnitShort", () => {
  it("feet → 'ft'", () => expect(lengthUnitShort("feet")).toBe("ft"));
  it("meters → 'm'", () => expect(lengthUnitShort("meters")).toBe("m"));
  it("inches → 'in'", () => expect(lengthUnitShort("inches")).toBe("in"));
});

describe("areaUnitLabel", () => {
  it("sqm → 'm²'", () => expect(areaUnitLabel("sqm")).toBe("m²"));
  it("sqft → 'ft²'", () => expect(areaUnitLabel("sqft")).toBe("ft²"));
});

describe("tileDimensionToMeters", () => {
  it("mm → m", () => expect(tileDimensionToMeters(600, "mm")).toBe(0.6));
  it("cm → m", () => expect(tileDimensionToMeters(60, "cm")).toBe(0.6));
  it("m → m", () => expect(tileDimensionToMeters(0.6, "m")).toBe(0.6));
});

describe("tileAreaM2", () => {
  it("600mm × 600mm = 0.36 m²", () => {
    expect(tileAreaM2(600, 600, "mm")).toBeCloseTo(0.36, 4);
  });
  it("60cm × 60cm = 0.36 m²", () => {
    expect(tileAreaM2(60, 60, "cm")).toBeCloseTo(0.36, 4);
  });
  it("1m × 1m = 1 m²", () => {
    expect(tileAreaM2(1, 1, "m")).toBe(1);
  });
});
