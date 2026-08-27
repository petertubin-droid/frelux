import { describe, it, expect } from "vitest";
import {
  getMarketDefaults,
  isLengthUnitSupported,
  isAreaUnitSupported,
  getSafeLengthUnit,
  getSafeAreaUnit,
  normalizeLength,
  normalizeArea,
  denormalizeLength,
  denormalizeArea,
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
} from "./measurement-bridge";
import type { ResolvedMarketContext } from "@/types/international";

describe("measurement-bridge", () => {
  const mockMarket: ResolvedMarketContext = {
    marketCode: "US",
    currencyCode: "USD",
    profileVersion: "1.0",
    defaultLengthUnit: "feet",
    defaultAreaUnit: "sqft",
    supportedLengthUnits: ["feet", "meters", "inches"],
    supportedAreaUnits: ["sqft", "sqm"],
  } as unknown as never;

  it("getMarketDefaults returns correct default units", () => {
    const defaults = getMarketDefaults(mockMarket);
    expect(defaults).toEqual({
      length: "feet",
      area: "sqft",
    });
  });

  it("isLengthUnitSupported checks if unit is supported in market", () => {
    expect(isLengthUnitSupported(mockMarket, "feet")).toBe(true);
    expect(isLengthUnitSupported(mockMarket, "meters")).toBe(true);
    const limitedMarket: ResolvedMarketContext = {
      ...mockMarket,
      supportedLengthUnits: ["meters"],
    } as unknown as never;
    expect(isLengthUnitSupported(limitedMarket, "feet")).toBe(false);
  });

  it("isAreaUnitSupported checks if area unit is supported in market", () => {
    expect(isAreaUnitSupported(mockMarket, "sqft")).toBe(true);
    const limitedMarket: ResolvedMarketContext = {
      ...mockMarket,
      supportedAreaUnits: ["sqm"],
    } as unknown as never;
    expect(isAreaUnitSupported(limitedMarket, "sqft")).toBe(false);
  });

  it("getSafeLengthUnit returns unit if supported, or default if unsupported", () => {
    expect(getSafeLengthUnit(mockMarket, "meters")).toBe("meters");
    const limitedMarket: ResolvedMarketContext = {
      ...mockMarket,
      defaultLengthUnit: "meters",
      supportedLengthUnits: ["meters"],
    } as unknown as never;
    expect(getSafeLengthUnit(limitedMarket, "feet")).toBe("meters");
  });

  it("getSafeAreaUnit returns unit if supported, or default if unsupported", () => {
    expect(getSafeAreaUnit(mockMarket, "sqft")).toBe("sqft");
    const limitedMarket: ResolvedMarketContext = {
      ...mockMarket,
      defaultAreaUnit: "sqm",
      supportedAreaUnits: ["sqm"],
    } as unknown as never;
    expect(getSafeAreaUnit(limitedMarket, "sqft")).toBe("sqm");
  });

  it("normalizeLength converts length unit to meters", () => {
    expect(normalizeLength(10, "meters")).toBe(10);
    expect(normalizeLength(10, "feet")).toBeCloseTo(3.048, 3);
  });

  it("normalizeArea converts area unit to square meters", () => {
    expect(normalizeArea(10, "sqm")).toBe(10);
    expect(normalizeArea(100, "sqft")).toBeCloseTo(9.2903, 3);
  });

  it("denormalizeLength converts meters to requested display unit", () => {
    expect(denormalizeLength(10, "meters")).toBe(10);
    expect(denormalizeLength(3.048, "feet")).toBeCloseTo(10, 3);
  });

  it("denormalizeArea converts square meters to requested display unit", () => {
    expect(denormalizeArea(10, "sqm")).toBe(10);
    expect(denormalizeArea(9.2903, "sqft")).toBeCloseTo(100, 1);
  });

  it("re-exports utilities from measurement/units accurately", () => {
    expect(toMeters(1, "meters")).toBe(1);
    expect(fromMeters(1, "meters")).toBe(1);
    expect(toSqMeters(1, "sqm")).toBe(1);
    expect(fromSqMeters(1, "sqm")).toBe(1);
    expect(sqftToSqm(100)).toBeCloseTo(9.2903, 3);
    expect(sqmToSqft(10)).toBeCloseTo(107.639, 2);
    expect(getAllowedUnits("block")).toEqual(["feet", "meters", "inches"]);
    expect(isInchesAllowed("block")).toBe(true);
    expect(isInchesAllowed("painting")).toBe(false);
    expect(lengthUnitLabel("feet")).toBe("Feet");
    expect(lengthUnitShort("feet")).toBe("ft");
    expect(areaUnitLabel("sqm")).toBe("m²");
    expect(tileDimensionToMeters(600, "mm")).toBe(0.6);
    expect(tileAreaM2(600, 600, "mm")).toBeCloseTo(0.36, 4);
  });
});
