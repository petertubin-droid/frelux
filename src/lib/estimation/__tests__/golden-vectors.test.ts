/**
 * Golden vectors.
 *
 * Every number in this file was computed by hand from the published rule,
 * outside this codebase, and then frozen. They are not the engine's own
 * output copied back in: a test built that way proves only that the code
 * still does what it did, never that it is right.
 *
 * Room: 4.5 m x 3.2 m, 2.7 m high. Two doors 0.9 x 2.1, one window 1.2 x 1.2.
 *   perimeter       = 2 x (4.5 + 3.2)      = 15.4 m
 *   gross wall      = 15.4 x 2.7           = 41.58 m2
 *   deductions      = 2 x (0.9 x 2.1) + 1.44 = 5.22 m2
 *   net wall        = 36.36 m2
 *   floor / ceiling = 4.5 x 3.2            = 14.40 m2
 */
import { describe, expect, it } from "vitest";
import {
  applyWasteMargin,
  cartonsFromTileCount,
  ceilingAreaM2,
  floorAreaM2,
  netAreaM2,
  openingAreaM2,
  roundUpToWholeUnit,
  tilesRequired,
  wallAreaM2,
} from "@/lib/measurement/geometry";
import {
  calculateTheoreticalLitres,
  normalizeCoverage,
} from "@/lib/estimation/paint-engine";
import {
  LITRES_PER_US_GALLON,
  resolvePaintPackLitres,
} from "@/lib/estimation/paint-packaging";
import { toMeters } from "@/lib/measurement/units";

const L = 4.5;
const W = 3.2;
const H = 2.7;
const NET_WALL = 36.36;

describe("golden vectors: room areas", () => {
  it("matches the hand-computed perimeter wall area", () => {
    expect(wallAreaM2(L, W, H)).toBeCloseTo(41.58, 10);
  });

  it("matches the hand-computed openings deduction", () => {
    const doors = openingAreaM2(0.9, 2.1, 2);
    const window = openingAreaM2(1.2, 1.2, 1);
    expect(doors).toBeCloseTo(3.78, 10);
    expect(window).toBeCloseTo(1.44, 10);
    expect(doors + window).toBeCloseTo(5.22, 10);
    expect(netAreaM2(41.58, doors + window)).toBeCloseTo(NET_WALL, 10);
  });

  it("matches the hand-computed floor and ceiling", () => {
    expect(floorAreaM2(L, W)).toBeCloseTo(14.4, 10);
    expect(ceilingAreaM2(L, W)).toBeCloseTo(14.4, 10);
  });

  it("reaches the same net area from imperial measurements", () => {
    const feet = (v: number) => toMeters(v, "feet");
    const wall = wallAreaM2(feet(14.7638), feet(10.4987), feet(8.8583));
    expect(wall).toBeCloseTo(41.58, 2);
  });
});

describe("golden vectors: tile takeoff", () => {
  // 36.36 m2 of wall, 10 per cent cutting waste, four tiles to a carton.
  const cases: Array<{ tile: number; tiles: number; cartons: number }> = [
    { tile: 0.36, tiles: 111.1, cartons: 28 },
    { tile: 0.09, tiles: 444.4, cartons: 112 },
    { tile: 0.64, tiles: 62.4938, cartons: 16 },
  ];

  it.each(cases)(
    "prices a $tile m2 tile honestly",
    ({ tile, tiles, cartons }) => {
      const adjusted = applyWasteMargin(NET_WALL, 10);
      expect(adjusted).toBeCloseTo(39.996, 10);
      const needed = tilesRequired(adjusted, tile);
      expect(needed).toBeCloseTo(tiles, 3);
      expect(cartonsFromTileCount(needed, 4)).toBe(cartons);
    },
  );

  it("never sells a part carton", () => {
    expect(cartonsFromTileCount(1, 4)).toBe(1);
    expect(cartonsFromTileCount(0, 4)).toBe(0);
  });
});

describe("golden vectors: paint litres and containers", () => {
  it("matches the hand-computed litres at 10 m2 per litre over two coats", () => {
    // 36.36 x 2 / 10 = 7.272 -> 7.27
    expect(calculateTheoreticalLitres(NET_WALL, 2, 10)).toBe(7.27);
  });

  it("matches the hand-computed litres at 12 m2 per litre", () => {
    // 36.36 x 2 / 12 = 6.06
    expect(calculateTheoreticalLitres(NET_WALL, 2, 12)).toBe(6.06);
  });

  it("converts a US square-feet-per-gallon figure the way the shelf means it", () => {
    // 350 ft2/gal -> 350 x 0.09290304 / 3.785411784 = 8.58983536 m2 per litre
    const perLitre = normalizeCoverage(
      350,
      "ft2_per_gallon",
      resolvePaintPackLitres("US"),
    );
    expect(perLitre).toBeCloseTo(8.58983536, 8);
    // 36.36 x 2 / 8.58983536 = 8.4659 -> 8.47
    expect(calculateTheoreticalLitres(NET_WALL, 2, perLitre)).toBe(8.47);
  });

  it("buys one 20 litre bucket in Nigeria for a 7.27 litre job", () => {
    expect(roundUpToWholeUnit(7.27 / resolvePaintPackLitres("NG"))).toBe(1);
  });

  it("buys two one-gallon cans in the US for the same 7.27 litres", () => {
    // 7.27 / 3.785411784 = 1.92 -> 2. One gallon is the can a US shelf
    // sells decorative paint in; the five-gallon pail is contractor and
    // ceiling stock.
    expect(roundUpToWholeUnit(7.27 / LITRES_PER_US_GALLON)).toBe(2);
  });

  // Open question for the owner, not asserted either way: when neither the
  // product nor a rule names a pack, getPackSizeLitres falls back to the
  // market's LARGEST container, so a small US repaint is quoted a five-gallon
  // pail. That is right for a Nigerian 20 litre bucket and generous for a US
  // gallon. Changing it would move existing US estimates, so it stays as it is
  // until the owner decides.
  it("refuses to divide by a coverage of zero", () => {
    expect(calculateTheoreticalLitres(NET_WALL, 2, 0)).toBe(0);
  });
});
