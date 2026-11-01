import { describe, it, expect } from "vitest";
import {
  calculateGlobalRebarWeight,
  calculateGlobalConcrete,
  calculateIrregularPolygonArea,
  GLOBAL_CONCRETE_GRADE_MAP,
  GLOBAL_DRY_SHRINKAGE_FACTOR,
  GLOBAL_CEMENT_DENSITY_KG_M3,
} from "../universal-construction-math";

describe("Universal Global Construction Math & Physics", () => {
  describe("1. Global Bar Bending Schedule (BBS) & Rebar Weight", () => {
    it("calculates metric rebar weight using ISO/EN physics formula (D^2 / 162)", () => {
      // 12 mm bar, 10 m length: (144 / 162) * 10 = 8.8888... -> 8.89 kg
      const result = calculateGlobalRebarWeight(12, 10, "metric");
      expect(result.weight).toBe(8.89);
      expect(result.unit).toBe("kg");
      expect(result.unitSystem).toBe("metric");
      expect(result.unitWeightPerUnitLength).toBeCloseTo(144 / 162, 2);
    });

    it("calculates metric rebar weight when passed as string diameter", () => {
      const result = calculateGlobalRebarWeight("16", 12, "metric");
      // (256 / 162) * 12 = 18.96 kg
      expect(result.weight).toBe(18.96);
      expect(result.unit).toBe("kg");
    });

    it("calculates imperial rebar weight using ASTM standard formula (Bar#^2 * 0.04167)", () => {
      // #4 bar (1/2 inch), 20 feet length: 4^2 * 0.04167 * 20 = 13.3344 -> 13.33 lbs
      const result = calculateGlobalRebarWeight(4, 20, "imperial");
      expect(result.weight).toBe(13.33);
      expect(result.unit).toBe("lbs");
      expect(result.unitSystem).toBe("imperial");
      expect(result.unitWeightPerUnitLength).toBeCloseTo(0.667, 3);
    });

    it("handles imperial rebar passed with # prefix", () => {
      const result = calculateGlobalRebarWeight("#5", 10, "imperial");
      // 5^2 * 0.04167 * 10 = 25 * 0.4167 = 10.42 lbs
      expect(result.weight).toBe(10.42);
      expect(result.unit).toBe("lbs");
    });

    it("throws RangeError for non-positive lengths or diameters", () => {
      expect(() => calculateGlobalRebarWeight(12, 0, "metric")).toThrow(
        RangeError,
      );
      expect(() => calculateGlobalRebarWeight(0, 10, "metric")).toThrow(
        RangeError,
      );
      expect(() => calculateGlobalRebarWeight(4, -5, "imperial")).toThrow(
        RangeError,
      );
    });
  });

  describe("2. Global Concrete Structural Grade & Materials Engine", () => {
    it("respects universal physical constants", () => {
      expect(GLOBAL_DRY_SHRINKAGE_FACTOR).toBe(1.54);
      expect(GLOBAL_CEMENT_DENSITY_KG_M3).toBe(1440);
    });

    it("computes C15 / M15 lean mix (1:2:4)", () => {
      const result = calculateGlobalConcrete(10, "C15");
      expect(result.mixRatio).toEqual([1, 2, 4]);
      expect(result.wetVolumeM3).toBe(10);
      expect(result.dryVolumeM3).toBe(15.4); // 10 * 1.54
      // cement vol = (1/7) * 15.4 = 2.2 m3. cement kg = 2.2 * 1440 = 3168 kg -> 3.17 tonnes
      expect(result.cementMetricTons).toBe(3.17);
      expect(result.sandCubicMeters).toBe(4.4); // (2/7) * 15.4 = 4.4
      expect(result.gravelCubicMeters).toBe(8.8); // (4/7) * 15.4 = 8.8
    });

    it("computes C20 / M20 structural mix (1:1.5:3)", () => {
      const result = calculateGlobalConcrete(10, "C20");
      expect(result.mixRatio).toEqual([1, 1.5, 3]);
      // total parts = 5.5. dry volume = 15.4
      // cement vol = (1/5.5) * 15.4 = 2.8 m3 -> cement kg = 2.8 * 1440 = 4032 kg -> 4.03 tonnes
      expect(result.cementMetricTons).toBe(4.03);
      expect(result.cementKg).toBe(4032);
      expect(result.sandCubicMeters).toBe(4.2); // (1.5/5.5) * 15.4 = 4.2
      expect(result.gravelCubicMeters).toBe(8.4); // (3/5.5) * 15.4 = 8.4
    });

    it("computes C25 / M25 high-strength mix (1:1:2)", () => {
      const result = calculateGlobalConcrete(10, "C25");
      expect(result.mixRatio).toEqual([1, 1, 2]);
      // total parts = 4. dry volume = 15.4
      // cement vol = (1/4) * 15.4 = 3.85 m3 -> cement kg = 3.85 * 1440 = 5544 kg -> 5.54 tonnes
      expect(result.cementMetricTons).toBe(5.54);
      expect(result.cementKg).toBe(5544);
      expect(result.sandCubicMeters).toBe(3.85); // (1/4) * 15.4 = 3.85
      expect(result.gravelCubicMeters).toBe(7.7); // (2/4) * 15.4 = 7.7
    });

    it("defaults to 1:2:4 if unrecognized grade is supplied", () => {
      const result = calculateGlobalConcrete(10, "CUSTOM_UNKNOWN");
      expect(result.mixRatio).toEqual([1, 2, 4]);
    });

    it("throws RangeError for invalid volume", () => {
      expect(() => calculateGlobalConcrete(0, "C20")).toThrow(RangeError);
      expect(() => calculateGlobalConcrete(-10, "C20")).toThrow(RangeError);
    });
  });

  describe("3. Advanced Irregular Polygon Geometry (Shoelace Formula)", () => {
    it("calculates exact area of a simple 10x10 square (100 m²)", () => {
      const square = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ] as [number, number][];
      expect(calculateIrregularPolygonArea(square)).toBe(100);
    });

    it("calculates exact area of a right-angled triangle", () => {
      const triangle = [
        [0, 0],
        [6, 0],
        [0, 8],
      ] as [number, number][];
      // Area = 0.5 * 6 * 8 = 24
      expect(calculateIrregularPolygonArea(triangle)).toBe(24);
    });

    it("calculates area of an irregular 5-sided polygon with object coordinates {x, y}", () => {
      const polygon = [
        { x: 3, y: 4 },
        { x: 5, y: 11 },
        { x: 12, y: 8 },
        { x: 9, y: 5 },
        { x: 5, y: 6 },
      ];
      // Shoelace cross product:
      // (3*11 - 4*5) + (5*8 - 11*12) + (12*5 - 8*9) + (9*6 - 5*5) + (5*4 - 6*3)
      // = (33 - 20) + (40 - 132) + (60 - 72) + (54 - 25) + (20 - 18)
      // = 13 - 92 - 12 + 29 + 2 = -60 -> | -60 | / 2 = 30
      expect(calculateIrregularPolygonArea(polygon)).toBe(30);
    });

    it("handles reverse vertex winding (clockwise vs counter-clockwise) identically", () => {
      const ccw = [
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ] as [number, number][];
      const cw = [
        [0, 0],
        [0, 3],
        [4, 3],
        [4, 0],
      ] as [number, number][];
      expect(calculateIrregularPolygonArea(ccw)).toBe(12);
      expect(calculateIrregularPolygonArea(cw)).toBe(12);
    });

    it("refuses polygons with fewer than 3 vertices", () => {
      expect(() =>
        calculateIrregularPolygonArea([
          [0, 0],
          [1, 1],
        ]),
      ).toThrow(RangeError);
    });

    it("refuses vertices with non-finite coordinates", () => {
      expect(() =>
        calculateIrregularPolygonArea([
          [0, 0],
          [Number.NaN, 5],
          [5, 5],
        ]),
      ).toThrow(RangeError);
    });
  });
});
