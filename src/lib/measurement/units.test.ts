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
  LengthUnit,
  AreaUnit,
  CalculatorContext,
} from "./units";

describe("units", () => {
  describe("constants", () => {
    it("defines exact conversion constants", () => {
      expect(FT_TO_M).toBe(0.3048);
      expect(INCH_TO_M).toBe(0.0254);
      expect(M_TO_FT).toBeCloseTo(1 / 0.3048);
      expect(SQFT_TO_SQM).toBeCloseTo(0.3048 * 0.3048);
      expect(SQM_TO_SQFT).toBeCloseTo(1 / (0.3048 * 0.3048));
    });
  });

  describe("length conversions", () => {
    it("toMeters converts feet, meters, inches correctly", () => {
      expect(toMeters(10, "meters")).toBe(10);
      expect(toMeters(10, "feet")).toBeCloseTo(3.048);
      expect(toMeters(100, "inches")).toBeCloseTo(2.54);
    });

    it("toMeters throws error on invalid length unit", () => {
      expect(() => toMeters(10, "invalid" as LengthUnit)).toThrowError(
        "Unknown length unit: invalid",
      );
    });

    it("fromMeters converts meters to user length units", () => {
      expect(fromMeters(10, "meters")).toBe(10);
      expect(fromMeters(3.048, "feet")).toBeCloseTo(10);
      expect(fromMeters(2.54, "inches")).toBeCloseTo(100);
    });

    it("fromMeters throws error on invalid length unit", () => {
      expect(() => fromMeters(10, "invalid" as LengthUnit)).toThrowError(
        "Unknown length unit: invalid",
      );
    });
  });

  describe("area conversions", () => {
    it("toSqMeters converts sqft and sqm correctly", () => {
      expect(toSqMeters(100, "sqm")).toBe(100);
      expect(toSqMeters(100, "sqft")).toBeCloseTo(9.290304);
    });

    it("toSqMeters throws on invalid area unit", () => {
      expect(() => toSqMeters(100, "invalid" as AreaUnit)).toThrowError(
        "Unknown area unit: invalid",
      );
    });

    it("fromSqMeters converts sqm to target area unit", () => {
      expect(fromSqMeters(100, "sqm")).toBe(100);
      expect(fromSqMeters(9.290304, "sqft")).toBeCloseTo(100);
    });

    it("fromSqMeters throws on invalid area unit", () => {
      expect(() => fromSqMeters(100, "invalid" as AreaUnit)).toThrowError(
        "Unknown area unit: invalid",
      );
    });

    it("sqftToSqm and sqmToSqft helper functions work", () => {
      expect(sqftToSqm(100)).toBeCloseTo(9.290304);
      expect(sqmToSqft(9.290304)).toBeCloseTo(100);
    });
  });

  describe("context-aware unit configuration", () => {
    it("getAllowedUnits returns appropriate units for context", () => {
      expect(getAllowedUnits("block")).toEqual(["feet", "meters", "inches"]);
      expect(getAllowedUnits("painting")).toEqual(["feet", "meters"]);
      expect(getAllowedUnits("screeding")).toEqual(["feet", "meters"]);
      expect(getAllowedUnits("tiling")).toEqual(["feet", "meters"]);
      expect(getAllowedUnits("unknown" as CalculatorContext)).toEqual([
        "feet",
        "meters",
      ]);
    });

    it("isInchesAllowed returns true only for block context", () => {
      expect(isInchesAllowed("block")).toBe(true);
      expect(isInchesAllowed("painting")).toBe(false);
      expect(isInchesAllowed("screeding")).toBe(false);
    });
  });

  describe("labels and formatting", () => {
    it("lengthUnitLabel returns human readable labels", () => {
      expect(lengthUnitLabel("feet")).toBe("Feet");
      expect(lengthUnitLabel("meters")).toBe("Metres");
      expect(lengthUnitLabel("inches")).toBe("Inches");
      expect(lengthUnitLabel("other" as LengthUnit)).toBe("other");
    });

    it("lengthUnitShort returns short symbols", () => {
      expect(lengthUnitShort("feet")).toBe("ft");
      expect(lengthUnitShort("meters")).toBe("m");
      expect(lengthUnitShort("inches")).toBe("in");
      expect(lengthUnitShort("other" as LengthUnit)).toBe("other");
    });

    it("areaUnitLabel returns human readable area symbols", () => {
      expect(areaUnitLabel("sqm")).toBe("m²");
      expect(areaUnitLabel("sqft")).toBe("ft²");
      expect(areaUnitLabel("other" as AreaUnit)).toBe("other");
    });
  });

  describe("tile dimension conversions", () => {
    it("tileDimensionToMeters converts mm, cm, m to meters", () => {
      expect(tileDimensionToMeters(600, "mm")).toBe(0.6);
      expect(tileDimensionToMeters(60, "cm")).toBe(0.6);
      expect(tileDimensionToMeters(0.6, "m")).toBe(0.6);
    });

    it("tileDimensionToMeters throws on unknown unit", () => {
      expect(() => tileDimensionToMeters(600, "km" as any)).toThrowError(
        "Unknown tile dimension unit: km",
      );
    });

    it("tileAreaM2 computes area in m²", () => {
      expect(tileAreaM2(600, 600, "mm")).toBeCloseTo(0.36);
      expect(tileAreaM2(60, 60, "cm")).toBeCloseTo(0.36);
      expect(tileAreaM2(0.6, 0.6, "m")).toBeCloseTo(0.36);
    });
  });
});
