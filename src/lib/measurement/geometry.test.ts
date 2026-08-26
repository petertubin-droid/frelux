import { describe, it, expect } from "vitest";
import {
  wallAreaM2,
  ceilingAreaM2,
  floorAreaM2,
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  rectangularAreaM2,
  openingAreaM2,
  netAreaM2,
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
  applyWasteMargin,
  roundForDisplay,
  roundUpToWholeUnit,
  makeStep,
  formatM2,
  formatCount,
} from "./geometry";

describe("geometry", () => {
  describe("wallAreaM2", () => {
    it("calculates perimeter * height when width is provided", () => {
      // perimeter = 2 * (4 + 3) = 14, height = 2.5 -> 14 * 2.5 = 35
      expect(wallAreaM2(4, 3, 2.5)).toBe(35);
    });

    it("falls back to 2 * length * height when width is undefined or <= 0", () => {
      expect(wallAreaM2(4, undefined, 2.5)).toBe(20);
      expect(wallAreaM2(4, 0, 2.5)).toBe(20);
      expect(wallAreaM2(4, -1, 2.5)).toBe(20);
    });

    it("returns 0 if length or height is <= 0", () => {
      expect(wallAreaM2(0, 3, 2.5)).toBe(0);
      expect(wallAreaM2(-5, 3, 2.5)).toBe(0);
      expect(wallAreaM2(4, 3, 0)).toBe(0);
      expect(wallAreaM2(4, 3, -1)).toBe(0);
    });
  });

  describe("ceilingAreaM2 & floorAreaM2 & rectangularAreaM2", () => {
    it("calculates length * width", () => {
      expect(ceilingAreaM2(5, 4)).toBe(20);
      expect(floorAreaM2(5, 4)).toBe(20);
      expect(rectangularAreaM2(5, 4)).toBe(20);
    });

    it("returns 0 when dimensions are invalid or width missing", () => {
      expect(ceilingAreaM2(5, undefined)).toBe(0);
      expect(ceilingAreaM2(5, 0)).toBe(0);
      expect(ceilingAreaM2(0, 4)).toBe(0);
      expect(ceilingAreaM2(-1, 4)).toBe(0);

      expect(floorAreaM2(5, undefined)).toBe(0);
      expect(rectangularAreaM2(5, undefined)).toBe(0);
    });
  });

  describe("singleSurfaceAreaM2", () => {
    it("calculates length * height", () => {
      expect(singleSurfaceAreaM2(10, 3)).toBe(30);
    });

    it("returns 0 for non-positive inputs", () => {
      expect(singleSurfaceAreaM2(0, 3)).toBe(0);
      expect(singleSurfaceAreaM2(10, -1)).toBe(0);
    });
  });

  describe("fenceDimensionAreaM2", () => {
    it("calculates partition length * height * max(1, count)", () => {
      expect(fenceDimensionAreaM2(3, 2, 4)).toBe(24);
      expect(fenceDimensionAreaM2(3, 2, 0)).toBe(6);
      expect(fenceDimensionAreaM2(3, 2, -2)).toBe(6);
    });
  });

  describe("openingAreaM2 & netAreaM2", () => {
    it("calculates opening area", () => {
      expect(openingAreaM2(1, 2, 2)).toBe(4);
      expect(openingAreaM2(0, 2, 2)).toBe(0);
      expect(openingAreaM2(1, -1, 2)).toBe(0);
      expect(openingAreaM2(1, 2, 0)).toBe(0);
    });

    it("subtracts opening area from gross area bounded at 0", () => {
      expect(netAreaM2(50, 10)).toBe(40);
      expect(netAreaM2(10, 50)).toBe(0);
    });
  });

  describe("tile geometry", () => {
    it("tilesRequired calculates exact tiles", () => {
      expect(tilesRequired(20, 0.5)).toBe(40);
      expect(tilesRequired(0, 0.5)).toBe(0);
      expect(tilesRequired(20, 0)).toBe(0);
    });

    it("cartonsFromTileCount rounds up", () => {
      expect(cartonsFromTileCount(41, 10)).toBe(5);
      expect(cartonsFromTileCount(40, 10)).toBe(4);
      expect(cartonsFromTileCount(0, 10)).toBe(0);
      expect(cartonsFromTileCount(40, 0)).toBe(0);
    });

    it("cartonsFromCoverage rounds up", () => {
      expect(cartonsFromCoverage(25, 10)).toBe(3);
      expect(cartonsFromCoverage(20, 10)).toBe(2);
      expect(cartonsFromCoverage(0, 10)).toBe(0);
      expect(cartonsFromCoverage(20, 0)).toBe(0);
    });
  });

  describe("applyWasteMargin", () => {
    it("applies waste percentage within 0-100 range", () => {
      expect(applyWasteMargin(100, 10)).toBeCloseTo(110);
      expect(applyWasteMargin(100, -5)).toBeCloseTo(100);
      expect(applyWasteMargin(100, 150)).toBeCloseTo(200);
    });
  });

  describe("rounding and formatting helpers", () => {
    it("roundForDisplay rounds to given decimal places", () => {
      expect(roundForDisplay(12.3456, 2)).toBe(12.35);
      expect(roundForDisplay(12.341, 2)).toBe(12.34);
      expect(roundForDisplay(NaN)).toBe(0);
      expect(roundForDisplay(Infinity)).toBe(0);
    });

    it("roundUpToWholeUnit rounds positive numbers up", () => {
      expect(roundUpToWholeUnit(4.1)).toBe(5);
      expect(roundUpToWholeUnit(4.0)).toBe(4);
      expect(roundUpToWholeUnit(-1)).toBe(0);
      expect(roundUpToWholeUnit(NaN)).toBe(0);
    });

    it("makeStep creates CalculationStep object", () => {
      expect(makeStep("Wall Area", "2 * (4 + 3) * 2.5", "35 m²")).toEqual({
        label: "Wall Area",
        formula: "2 * (4 + 3) * 2.5",
        value: "35 m²",
      });
    });

    it("formatM2 and formatCount format strings correctly", () => {
      expect(formatM2(12.345)).toBe("12.35 m²");
      expect(formatCount(12.6)).toBe("13");
    });
  });
});
