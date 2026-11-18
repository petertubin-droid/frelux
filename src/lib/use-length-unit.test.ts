import { describe, expect, it } from "vitest";
import {
  areaToSquareMetres,
  areaUnitLabel,
  squareMetresToArea,
} from "./use-length-unit";
import { unitShortLabel, unitToMeters } from "./utils";

describe("length and area input units", () => {
  it("converts typed lengths through the single SI table", () => {
    expect(unitToMeters(10, "feet")).toBeCloseTo(3.048, 10);
    expect(unitToMeters(12, "inches")).toBeCloseTo(0.3048, 10);
    expect(unitToMeters(250, "centimeters")).toBeCloseTo(2.5, 10);
    expect(unitShortLabel("feet")).toBe("ft");
  });

  it("converts typed areas exactly", () => {
    // 100 sq ft = 9.290304 m², exact by the international foot.
    expect(areaToSquareMetres(100, "sqft")).toBeCloseTo(9.290304, 6);
    expect(areaToSquareMetres(100, "sqm")).toBe(100);
    expect(squareMetresToArea(9.290304, "sqft")).toBeCloseTo(100, 6);
  });

  it("answers zero for half-typed areas instead of NaN", () => {
    expect(areaToSquareMetres(NaN, "sqft")).toBe(0);
    expect(squareMetresToArea(NaN, "sqm")).toBe(0);
  });

  it("labels areas the way each market reads them", () => {
    expect(areaUnitLabel("sqft")).toBe("sq ft");
    expect(areaUnitLabel("sqm")).toBe("m²");
  });
});
