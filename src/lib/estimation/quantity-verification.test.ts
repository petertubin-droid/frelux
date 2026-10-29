/**
 * Hand-computed verification of the quantity engines.
 *
 * Every expected number below is worked out from first principles in the
 * comment above it, independently of the engine, so a change in the engine that
 * quietly moves a quantity fails here instead of reaching a customer quote.
 */
import { describe, it, expect } from "vitest";
import { calculateMasonryTakeoff } from "./masonry-standalone-engine";
import { calculatePlasteringTakeoff } from "./plastering-standalone-engine";
import {
  calculateTheoreticalLitres,
  calculateWallArea,
  calculateOpeningArea,
} from "./paint-engine";
import {
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
} from "@/lib/measurement/geometry";

describe("masonry quantities", () => {
  // 10 m x 3 m = 30 m2. NG 9-inch hollow block 450 x 225 mm on a 12 mm joint:
  // 1 / (0.462 x 0.237) = 9.13 blocks/m2 -> 273.9 blocks, +5% waste = 288.
  // Mortar at 0.018 m3/m2 scaled for a 225 mm block = 0.02025 m3/m2 wet
  // -> 0.6075 m3 wet, x1.33 dry conversion x1.05 waste = 0.848 m3.
  // 1:4 mortar -> cement 0.848 / 5 = 0.170 m3 x 1440 kg/m3 = 244 kg = 5 bags.
  it("sizes blocks, mortar and cement for a 30 m2 wall", () => {
    const r = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 1,
      wastePercent: 5,
    } as never);
    expect(r.unitsPerM2).toBeCloseTo(9.13, 2);
    expect(r.unitsRequiredNet).toBeCloseTo(273.9, 0);
    expect(r.unitsRequiredGross).toBe(288);
    expect(r.mortarVolumeM3Net).toBeCloseTo(0.607, 3);
    expect(r.mortarVolumeM3Gross).toBeCloseTo(0.848, 2);
    expect(r.cementBagsRequired).toBe(5);
    expect(r.sandVolumeM3).toBeCloseTo(0.71, 1);
  });

  it("deducts openings before counting blocks", () => {
    const withDoor = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wastePercent: 0,
      openings: [{ widthM: 0.9, heightM: 2.1, quantity: 1 }],
    } as never);
    // 30 - 1.89 = 28.11 m2 x 9.13 = 256.6 -> 257 blocks.
    expect(withDoor.netWallAreaM2).toBeCloseTo(28.11, 2);
    expect(withDoor.unitsRequiredGross).toBe(257);
  });
});

describe("plastering quantities", () => {
  // 30 m2 at 15 mm = 0.45 m3, plus the default 5% allowance for a smooth
  // substrate drawing in mortar = 0.4725 m3 wet. x1.33 = 0.6284 m3 dry,
  // x1.05 waste = 0.66 m3. 1:4 -> cement 0.132 m3 x 1440 = 190 kg -> 4 bags.
  it("sizes mortar and cement for a 15 mm 1:4 render", () => {
    const r = calculatePlasteringTakeoff({
      marketCode: "NG",
      surfaceAreaM2: 30,
      thicknessMm: 15,
      mixRatio: "1:4",
      wastePercent: 5,
    } as never);
    expect(r.totalAreaM2).toBe(30);
    expect(r.wetMortarVolumeM3).toBeCloseTo(0.472, 3);
    expect(r.dryMortarVolumeM3).toBeCloseTo(0.66, 2);
    expect(r.cementWeightKg).toBeCloseTo(190, -1);
    expect(r.cementBagsRequired).toBe(4);
    expect(r.sandVolumeM3).toBeCloseTo(0.53, 1);
  });
});

describe("painting geometry and coverage", () => {
  it("takes wall area as the perimeter times height", () => {
    // 2 x (5 + 4) x 2.7 = 48.6 m2
    expect(calculateWallArea(5, 4, 2.7)).toBe(48.6);
  });

  it("takes a single-run wall when no width is given", () => {
    // 2 x 5 x 2.7 = 27 m2
    expect(calculateWallArea(5, 0, 2.7)).toBe(27);
  });

  it("divides area x coats by coverage", () => {
    // 30 m2 x 2 coats / 10 m2 per litre = 6 litres
    expect(calculateTheoreticalLitres(30, 2, 10)).toBe(6);
    expect(calculateTheoreticalLitres(30, 2, 0)).toBe(0);
  });

  it("measures an opening", () => {
    // 0.9 x 2.1 = 1.89 m2, twice over = 3.78 m2
    expect(
      calculateOpeningArea([{ width: 0.9, height: 2.1, quantity: 2 }], "meters"),
    ).toBeCloseTo(3.78, 2);
  });
});

describe("tiling quantities", () => {
  it("counts tiles from the exact area, without rounding", () => {
    // 30 m2 / 0.6 x 0.6 m tile = 83.33 tiles
    expect(tilesRequired(30, 0.36)).toBeCloseTo(83.33, 2);
  });

  it("rounds cartons up, because half a carton cannot be bought", () => {
    // 83.33 tiles / 10 per carton = 8.33 -> 9 cartons
    expect(cartonsFromTileCount(83.33, 10)).toBe(9);
    // 30 m2 / 1.44 m2 per carton = 20.83 -> 21 cartons
    expect(cartonsFromCoverage(30, 1.44)).toBe(21);
  });

  it("returns nothing for a zero-sized surface or tile", () => {
    expect(tilesRequired(0, 0.36)).toBe(0);
    expect(tilesRequired(30, 0)).toBe(0);
    expect(cartonsFromTileCount(0, 10)).toBe(0);
  });
});
