import { describe, it, expect } from "vitest";
import {
  calculateGlobalRebarWeight,
  calculateGlobalConcrete,
  calculateIrregularPolygonArea,
  GLOBAL_DRY_SHRINKAGE_FACTOR,
  GLOBAL_CEMENT_DENSITY_KG_M3,
} from "../universal-construction-math";

describe("Universal Global Construction Math & Physics", () => {
  describe("1. Global Bar Bending Schedule (BBS) & Rebar Weight", () => {
    it("calculates metric rebar weight at the BS 4449 nominal mass", () => {
      // 12 mm bar, 10 m length: 0.006165 * 144 * 10 = 8.8776 -> 8.88 kg, the
      // published 0.888 kg/m. The D^2/162 approximation gave 8.89, which is
      // 0.13 per cent heavy.
      const result = calculateGlobalRebarWeight(12, 10, "metric");
      expect(result.weight).toBe(8.88);
      expect(result.unit).toBe("kg");
      expect(result.unitSystem).toBe("metric");
      expect(result.unitWeightPerUnitLength).toBeCloseTo(0.888, 2);
    });

    it("agrees with the published nominal mass across bar sizes", () => {
      // BS 4449 / EN 10080 table values, kg/m.
      const published: Array<[number, number]> = [
        [8, 0.395],
        [10, 0.617],
        [12, 0.888],
        [16, 1.578],
        [20, 2.466],
        [25, 3.853],
        [32, 6.313],
      ];
      for (const [diameter, kgPerM] of published) {
        const oneMetre = calculateGlobalRebarWeight(diameter, 1, "metric");
        expect(oneMetre.unitWeightPerUnitLength, `${diameter} mm`).toBeCloseTo(
          kgPerM,
          2,
        );
        expect(oneMetre.weight, `${diameter} mm`).toBeCloseTo(kgPerM, 1);
      }
    });

    it("calculates metric rebar weight when passed as string diameter", () => {
      const result = calculateGlobalRebarWeight("16", 12, "metric");
      // 0.006165 * 256 * 12 = 18.94 kg
      expect(result.weight).toBe(18.94);
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

  describe("2. Explicit-ratio concrete materials takeoff", () => {
    it("exposes disclosed planning defaults, not universal grade mappings", () => {
      expect(GLOBAL_DRY_SHRINKAGE_FACTOR).toBe(1.54);
      expect(GLOBAL_CEMENT_DENSITY_KG_M3).toBe(1440);
    });

    it("computes quantities from a user-supplied volumetric ratio", () => {
      const result = calculateGlobalConcrete(10, [1, 2, 4], "Mix A");
      expect(result.grade).toBe("Mix A");
      expect(result.mixRatio).toEqual([1, 2, 4]);
      expect(result.wetVolumeM3).toBe(10);
      expect(result.dryVolumeM3).toBe(15.4);
      expect(result.cementMetricTons).toBe(3.17);
      expect(result.sandCubicMeters).toBe(4.4);
      expect(result.gravelCubicMeters).toBe(8.8);
    });

    it("allows project-specific dry-volume and cement-density assumptions", () => {
      const result = calculateGlobalConcrete(1, [1, 1, 1], "Trial", {
        dryVolumeFactor: 1.5,
        cementDensityKgM3: 1400,
      });
      expect(result.dryVolumeM3).toBe(1.5);
      expect(result.cementKg).toBe(700);
      expect(result.sandCubicMeters).toBe(0.5);
      expect(result.gravelCubicMeters).toBe(0.5);
    });

    it("rejects strength-grade strings instead of silently mapping them to ratios", () => {
      expect(() => calculateGlobalConcrete(10, "C20" as never)).toThrow(
        RangeError,
      );
      expect(() => calculateGlobalConcrete(10, [1, 0, 2] as never)).toThrow(
        RangeError,
      );
      expect(() =>
        calculateGlobalConcrete(10, [1, 2, Number.NaN] as never),
      ).toThrow(RangeError);
    });

    it("requires finite positive volume and physical assumptions", () => {
      expect(() => calculateGlobalConcrete(0, [1, 2, 4])).toThrow(RangeError);
      expect(() => calculateGlobalConcrete(-10, [1, 2, 4])).toThrow(RangeError);
      expect(() =>
        calculateGlobalConcrete(1, [1, 2, 4], "Mix", { dryVolumeFactor: 0 }),
      ).toThrow(RangeError);
      expect(() =>
        calculateGlobalConcrete(1, [1, 2, 4], "Mix", {
          cementDensityKgM3: Infinity,
        }),
      ).toThrow(RangeError);
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
