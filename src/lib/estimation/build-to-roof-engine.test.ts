import { describe, it, expect } from "vitest";
import {
  CEMENT_VOLUME_PER_BAG,
  DRY_WET_RATIO,
  MORTAR_DRY_WET_RATIO,
  SHEET_COVERAGE,
  SCREWS_PER_SHEET,
  PURLIN_ROWS_PER_SLOPE,
  RAFTER_SPACING,
  M_PER_FT,
  M3_PER_TRIP,
  m3ToTrips,
  concreteToMaterials,
  mortarToMaterials,
  blocksPerM2,
  calculateRoofArea,
  roofingSheetsCount,
  getSheetCoverage,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
  estimateTimberMeters,
} from "@/lib/estimation/build-to-roof-engine";

describe("constants", () => {
  it("CEMENT_VOLUME_PER_BAG = 0.0347", () =>
    expect(CEMENT_VOLUME_PER_BAG).toBe(0.0347));
  it("DRY_WET_RATIO = 1.54", () => expect(DRY_WET_RATIO).toBe(1.54));
  it("MORTAR_DRY_WET_RATIO = 1.33", () =>
    expect(MORTAR_DRY_WET_RATIO).toBe(1.33));
  it("SCREWS_PER_SHEET = 10", () => expect(SCREWS_PER_SHEET).toBe(10));
  it("PURLIN_ROWS_PER_SLOPE = 4", () => expect(PURLIN_ROWS_PER_SLOPE).toBe(4));
  it("RAFTER_SPACING = 0.9", () => expect(RAFTER_SPACING).toBe(0.9));
  it("M_PER_FT = 0.3048", () => expect(M_PER_FT).toBe(0.3048));
  it("M3_PER_TRIP = 3.5", () => expect(M3_PER_TRIP).toBe(3.5));
  it("SHEET_COVERAGE has all materials", () => {
    expect(SHEET_COVERAGE.long_span_aluminium).toBe(1.5);
    expect(SHEET_COVERAGE.stone_coated).toBe(0.53);
    expect(SHEET_COVERAGE.gi_sheet).toBe(1.52);
    expect(SHEET_COVERAGE.shingle).toBe(0.93);
    expect(SHEET_COVERAGE.custom).toBe(1.5);
  });
});

describe("m3ToTrips", () => {
  it("converts m³ to trips", () => expect(m3ToTrips(7)).toBeCloseTo(2, 5));
  it("returns 0 for 0", () => expect(m3ToTrips(0)).toBe(0));
});

describe("concreteToMaterials", () => {
  it("returns zeros for zero volume", () => {
    expect(concreteToMaterials(0, 1, 2, 4)).toEqual({
      cement_bags: 0,
      sand_m3: 0,
      granite_m3: 0,
    });
  });
  it("calculates 1:2:4 mix correctly", () => {
    const r = concreteToMaterials(1, 1, 2, 4);
    const dryVol = 1 * 1.54;
    expect(r.cement_bags).toBeCloseTo((dryVol * (1 / 7)) / 0.0347, 4);
    expect(r.sand_m3).toBeCloseTo(dryVol * (2 / 7), 4);
    expect(r.granite_m3).toBeCloseTo(dryVol * (4 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = concreteToMaterials(5, 1, 3, 6);
    const dryVol = 5 * 1.54;
    const cementVol = r.cement_bags * 0.0347;
    expect(cementVol + r.sand_m3 + r.granite_m3).toBeCloseTo(dryVol, 3);
  });
  it("returns zeros for invalid mix", () => {
    expect(concreteToMaterials(1, 0, 0, 0)).toEqual({
      cement_bags: 0,
      sand_m3: 0,
      granite_m3: 0,
    });
  });
});

describe("mortarToMaterials", () => {
  it("returns zeros for zero volume", () => {
    expect(mortarToMaterials(0, 1, 6)).toEqual({ cement_bags: 0, sand_m3: 0 });
  });
  it("calculates 1:6 mix correctly", () => {
    const r = mortarToMaterials(1, 1, 6);
    const dryVol = 1 * 1.33;
    expect(r.cement_bags).toBeCloseTo((dryVol * (1 / 7)) / 0.0347, 4);
    expect(r.sand_m3).toBeCloseTo(dryVol * (6 / 7), 4);
  });
  it("mass balance holds", () => {
    const r = mortarToMaterials(3, 1, 4);
    const dryVol = 3 * 1.33;
    const cementVol = r.cement_bags * 0.0347;
    expect(cementVol + r.sand_m3).toBeCloseTo(dryVol, 3);
  });
});

describe("blocksPerM2", () => {
  it("calculates for standard 18×9 inch block", () => {
    const result = blocksPerM2(18, 9);
    const blockArea = 18 * 0.0254 * (9 * 0.0254);
    expect(result).toBeCloseTo(1 / blockArea, 4);
  });
  it("returns 0 for zero dimensions", () => {
    expect(blocksPerM2(0, 9)).toBe(0);
    expect(blocksPerM2(18, 0)).toBe(0);
  });
});

describe("calculateRoofArea", () => {
  it("returns footprint for flat roof", () => {
    expect(calculateRoofArea(10, 8, 0, 0.6, "flat")).toBe(
      (10 + 1.2) * (8 + 1.2),
    );
  });
  it("applies pitch factor for gable", () => {
    const result = calculateRoofArea(10, 8, 30, 0.6, "gable");
    const footprint = (10 + 1.2) * (8 + 1.2);
    expect(result).toBeCloseTo(footprint / Math.cos((30 * Math.PI) / 180), 2);
  });
  it("returns footprint for 90° pitch", () => {
    const result = calculateRoofArea(10, 8, 90, 0.6, "gable");
    const footprint = (10 + 1.2) * (8 + 1.2);
    expect(result).toBeCloseTo(footprint, 2);
  });
});

describe("roofingSheetsCount", () => {
  it("rounds up to whole sheets", () => {
    expect(roofingSheetsCount(100, 1.5)).toBe(67);
  });
  it("exact division", () => {
    expect(roofingSheetsCount(15, 1.5)).toBe(10);
  });
  it("returns 0 for zero coverage", () => {
    expect(roofingSheetsCount(100, 0)).toBe(0);
  });
  it("returns 0 for zero area", () => {
    expect(roofingSheetsCount(0, 1.5)).toBe(0);
  });
});

describe("getSheetCoverage", () => {
  it("returns coverage for known material", () => {
    expect(getSheetCoverage("long_span_aluminium")).toBe(1.5);
    expect(getSheetCoverage("stone_coated")).toBe(0.53);
  });
  it("falls back to custom for unknown", () => {
    expect(getSheetCoverage("custom")).toBe(1.5);
  });
});

describe("calculateRidgeLength", () => {
  it("returns length for gable", () => {
    expect(calculateRidgeLength(10, 8, "gable")).toBe(10);
  });
  it("returns length - width for hip", () => {
    expect(calculateRidgeLength(10, 8, "hip")).toBe(2);
  });
  it("returns 0 for mono_pitch", () => {
    expect(calculateRidgeLength(10, 8, "mono_pitch")).toBe(0);
  });
  it("returns 0 for flat", () => {
    expect(calculateRidgeLength(10, 8, "flat")).toBe(0);
  });
  it("hip ridge is never negative", () => {
    expect(calculateRidgeLength(5, 10, "hip")).toBe(0);
  });
});

describe("calculateHipLength", () => {
  it("calculates 4 hips for hip roof", () => {
    const result = calculateHipLength(10, 8, 30);
    const halfWidth = 4;
    const hipSlope = halfWidth / Math.cos((30 * Math.PI) / 180);
    expect(result).toBeCloseTo(4 * hipSlope, 2);
  });
});

describe("calculateFasciaLength", () => {
  it("calculates perimeter with overhang", () => {
    expect(calculateFasciaLength(10, 8, 0.6)).toBe(
      2 * (10 + 1.2) + 2 * (8 + 1.2),
    );
  });
  it("works with zero overhang", () => {
    expect(calculateFasciaLength(10, 8, 0)).toBe(36);
  });
});

describe("estimateTimberMeters", () => {
  it("returns minimal timber for flat roof", () => {
    const result = estimateTimberMeters(100, 10, 8, 0, 0.6, "flat");
    expect(result).toBe(200);
  });
  it("calculates rafters + purlins for gable", () => {
    const result = estimateTimberMeters(100, 10, 8, 30, 0.6, "gable");
    expect(result).toBeGreaterThan(0);
    // Rafters: ceil(10/0.9)+1 = 12, slopeLength = (4+0.6)/cos(30°)
    const slopeLen = (4 + 0.6) / Math.cos((30 * Math.PI) / 180);
    const rafterCount = Math.ceil(10 / 0.9) + 1; // 13
    const rafterTotal = rafterCount * 2 * slopeLen;
    const purlinTotal = 4 * 2 * 10;
    expect(result).toBeCloseTo(rafterTotal + purlinTotal, 1);
  });
});
