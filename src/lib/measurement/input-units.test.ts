import { describe, expect, it } from "vitest";
import {
  areaToSquareMetres,
  areaUnitOptions,
  defaultAreaUnit,
  defaultLengthUnit,
  lengthToMetres,
  lengthUnitOptions,
  metresToLength,
  squareMetresToArea,
  areaUnitLabel,
} from "./input-units";

describe("measurement/input-units", () => {
  it("offers feet first for imperial markets and metres first otherwise", () => {
    expect(lengthUnitOptions("imperial")[0]).toBe("feet");
    expect(lengthUnitOptions("metric")[0]).toBe("meters");
    expect(defaultLengthUnit("imperial")).toBe("feet");
    expect(defaultLengthUnit("metric")).toBe("meters");
    expect(areaUnitOptions("imperial")[0]).toBe("sqft");
    expect(areaUnitOptions("metric")[0]).toBe("sqm");
    expect(defaultAreaUnit("imperial")).toBe("sqft");
  });

  it("converts a typed length to metres exactly", () => {
    expect(lengthToMetres(10, "feet")).toBeCloseTo(3.048, 10);
    expect(lengthToMetres(12, "inches")).toBeCloseTo(0.3048, 10);
    expect(lengthToMetres(250, "centimeters")).toBeCloseTo(2.5, 10);
    expect(lengthToMetres(4.2, "meters")).toBeCloseTo(4.2, 10);
  });

  it("round-trips a length through the visitor's unit", () => {
    const metres = lengthToMetres(12.5, "feet");
    expect(metresToLength(metres, "feet")).toBeCloseTo(12.5, 10);
  });

  it("converts square feet to square metres", () => {
    // 100 sq ft = 9.290304 m², the exact international definition.
    expect(areaToSquareMetres(100, "sqft")).toBeCloseTo(9.290304, 6);
    expect(areaToSquareMetres(100, "sqm")).toBe(100);
    expect(squareMetresToArea(9.290304, "sqft")).toBeCloseTo(100, 6);
  });

  it("answers zero instead of NaN for half-typed values", () => {
    expect(lengthToMetres(NaN, "feet")).toBe(0);
    expect(areaToSquareMetres(NaN, "sqft")).toBe(0);
    expect(metresToLength(NaN, "feet")).toBe(0);
    expect(squareMetresToArea(NaN, "sqm")).toBe(0);
  });

  it("labels areas the way each market reads them", () => {
    expect(areaUnitLabel("sqft")).toBe("sq ft");
    expect(areaUnitLabel("sqm")).toBe("m²");
  });
});
