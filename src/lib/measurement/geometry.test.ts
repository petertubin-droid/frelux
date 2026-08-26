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
    it("calculates wall area using perimeter × height", () => {
      expect(wallAreaM2(5, 4, 3)).toBeCloseTo(2 * (5 + 4) * 3);
    });

    it("falls back to 2 × length × height when width is undefined", () => {
      expect(wallAreaM2(5, undefined, 3)).toBeCloseTo(2 * 5 * 3);
    });

    it("returns 0 for zero height", () => {
      expect(wallAreaM2(5, 4, 0)).toBe(0);
    });

    it("returns 0 for zero length", () => {
      expect(wallAreaM2(0, 4, 3)).toBe(0);
    });

    it("returns 0 for negative dimensions", () => {
      expect(wallAreaM2(-5, 4, 3)).toBe(0);
    });
  });

  describe("ceilingAreaM2", () => {
    it("calculates length × width", () => {
      expect(ceilingAreaM2(5, 4)).toBe(20);
    });

    it("returns 0 when width is undefined", () => {
      expect(ceilingAreaM2(5, undefined)).toBe(0);
    });

    it("returns 0 for negative values", () => {
      expect(ceilingAreaM2(-5, 4)).toBe(0);
    });
  });

  describe("floorAreaM2", () => {
    it("same as ceiling area", () => {
      expect(floorAreaM2(5, 4)).toBe(ceilingAreaM2(5, 4));
    });
  });

  describe("singleSurfaceAreaM2", () => {
    it("calculates length × height", () => {
      expect(singleSurfaceAreaM2(5, 3)).toBe(15);
    });

    it("returns 0 for zero or negative values", () => {
      expect(singleSurfaceAreaM2(0, 3)).toBe(0);
      expect(singleSurfaceAreaM2(5, 0)).toBe(0);
      expect(singleSurfaceAreaM2(-5, 3)).toBe(0);
    });
  });

  describe("fenceDimensionAreaM2", () => {
    it("calculates partition area × partition count", () => {
      const partitionArea = singleSurfaceAreaM2(2, 1.5);
      expect(fenceDimensionAreaM2(2, 1.5, 4)).toBeCloseTo(partitionArea * 4);
    });

    it("uses minimum partition count of 1", () => {
      expect(fenceDimensionAreaM2(2, 1.5, 0)).toBeCloseTo(
        singleSurfaceAreaM2(2, 1.5),
      );
    });
  });

  describe("rectangularAreaM2", () => {
    it("calculates length × width", () => {
      expect(rectangularAreaM2(5, 4)).toBe(20);
    });

    it("returns 0 when width is undefined", () => {
      expect(rectangularAreaM2(5, undefined)).toBe(0);
    });
  });

  describe("openingAreaM2", () => {
    it("calculates width × height × count", () => {
      expect(openingAreaM2(1, 2, 3)).toBe(6);
    });

    it("returns 0 for zero or negative values", () => {
      expect(openingAreaM2(0, 2, 3)).toBe(0);
      expect(openingAreaM2(1, 0, 3)).toBe(0);
      expect(openingAreaM2(1, 2, 0)).toBe(0);
    });
  });

  describe("netAreaM2", () => {
    it("subtracts openings from gross", () => {
      expect(netAreaM2(50, 6)).toBe(44);
    });

    it("returns 0 when openings exceed gross", () => {
      expect(netAreaM2(10, 15)).toBe(0);
    });
  });

  describe("tilesRequired", () => {
    it("calculates area / tile area", () => {
      expect(tilesRequired(20, 0.5)).toBe(40);
    });

    it("returns 0 for zero or negative tile area", () => {
      expect(tilesRequired(20, 0)).toBe(0);
      expect(tilesRequired(0, 0.5)).toBe(0);
    });
  });

  describe("cartonsFromTileCount", () => {
    it("rounds up to whole cartons", () => {
      expect(cartonsFromTileCount(45, 12)).toBe(4);
    });

    it("returns 0 for invalid inputs", () => {
      expect(cartonsFromTileCount(0, 12)).toBe(0);
      expect(cartonsFromTileCount(45, 0)).toBe(0);
    });
  });

  describe("cartonsFromCoverage", () => {
    it("rounds up based on area / coverage", () => {
      expect(cartonsFromCoverage(20, 1.5)).toBe(14);
    });

    it("returns 0 for invalid inputs", () => {
      expect(cartonsFromCoverage(0, 1.5)).toBe(0);
      expect(cartonsFromCoverage(20, 0)).toBe(0);
    });
  });

  describe("applyWasteMargin", () => {
    it("applies positive waste margin", () => {
      expect(applyWasteMargin(100, 10)).toBeCloseTo(110);
    });

    it("clamps waste to 0-100", () => {
      expect(applyWasteMargin(100, -10)).toBe(100);
      expect(applyWasteMargin(100, 150)).toBe(200);
    });

    it("zero waste returns same area", () => {
      expect(applyWasteMargin(50, 0)).toBe(50);
    });
  });

  describe("roundForDisplay", () => {
    it("rounds to 2 decimals by default", () => {
      expect(roundForDisplay(3.14159)).toBe(3.14);
    });

    it("rounds to specified decimals", () => {
      expect(roundForDisplay(3.14159, 4)).toBe(3.1416);
    });

    it("returns 0 for NaN/Infinity", () => {
      expect(roundForDisplay(NaN)).toBe(0);
      expect(roundForDisplay(Infinity)).toBe(0);
    });
  });

  describe("roundUpToWholeUnit", () => {
    it("rounds up to next integer", () => {
      expect(roundUpToWholeUnit(3.2)).toBe(4);
      expect(roundUpToWholeUnit(5)).toBe(5);
    });

    it("returns 0 for non-positive values", () => {
      expect(roundUpToWholeUnit(0)).toBe(0);
      expect(roundUpToWholeUnit(-5)).toBe(0);
    });
  });

  describe("makeStep", () => {
    it("creates a CalculationStep object", () => {
      const step = makeStep("Area", "5 * 4", "20 m²");
      expect(step.label).toBe("Area");
      expect(step.formula).toBe("5 * 4");
      expect(step.value).toBe("20 m²");
    });
  });

  describe("formatM2", () => {
    it("formats value with m² unit", () => {
      expect(formatM2(20.5)).toBe("20.5 m²");
    });
  });

  describe("formatCount", () => {
    it("formats as integer string", () => {
      expect(formatCount(3.7)).toBe("4");
    });
  });
});
