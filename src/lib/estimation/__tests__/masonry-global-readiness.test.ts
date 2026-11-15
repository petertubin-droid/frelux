import { describe, expect, it } from "vitest";

import {
  MASONRY_MARKET_REGISTRY,
  calculateMasonryTakeoff,
  defaultLeafCountFor,
} from "@/lib/estimation/masonry-standalone-engine";

/**
 * Global readiness for the masonry engine, market by market.
 *
 * The engine claims 32 markets. These tests do not check that claim by trusting
 * the registry: they run every market's own units through the arithmetic and
 * assert the properties that must hold anywhere in the world, so a bad entry in
 * any one country fails here rather than in a customer's take-off.
 */

const MARKETS = Object.keys(MASONRY_MARKET_REGISTRY);

/** Markets whose catalogue carries a single wall thickness today. */
const SINGLE_WIDTH_MARKETS: string[] = [];

describe("every market the masonry engine claims", () => {
  it("has a maintained profile rather than the generic placeholder", () => {
    expect(MARKETS.length).toBeGreaterThanOrEqual(32);
    for (const code of MARKETS) {
      const config = MASONRY_MARKET_REGISTRY[code];
      expect(config.marketCode).toBe(code);
      expect(config.countryName.length).toBeGreaterThan(2);
      expect(config.regulatoryNote.length).toBeGreaterThan(20);
      // A market that fell back to the placeholder would carry this phrase.
      expect(config.regulatoryNote).not.toMatch(/generic geometry/i);
    }
  });

  it("offers its default unit in its own catalogue", () => {
    for (const code of MARKETS) {
      const config = MASONRY_MARKET_REGISTRY[code];
      const ids = config.availableUnits.map((unit) => unit.id);
      expect(ids).toContain(config.defaultUnit.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("states real dimensions, joints, mixes and cement packaging", () => {
    for (const code of MARKETS) {
      const config = MASONRY_MARKET_REGISTRY[code];
      expect(config.cementBagWeightKg).toBeGreaterThanOrEqual(20);
      expect(config.cementBagWeightKg).toBeLessThanOrEqual(50);
      for (const unit of config.availableUnits) {
        expect(unit.lengthMm).toBeGreaterThanOrEqual(150);
        expect(unit.heightMm).toBeGreaterThanOrEqual(50);
        expect(unit.widthMm).toBeGreaterThanOrEqual(50);
        expect(unit.standardJointMm).toBeGreaterThanOrEqual(0);
        expect(unit.standardJointMm).toBeLessThanOrEqual(20);
        expect(["1:3", "1:4", "1:5", "1:6"]).toContain(unit.standardMixRatio);
        expect(unit.sourceStandard.length).toBeGreaterThan(3);
        expect(unit.name.length).toBeGreaterThan(3);
      }
    }
  });

  it("can build a thin partition and an ordinary wall", () => {
    for (const code of MARKETS) {
      const { availableUnits } = MASONRY_MARKET_REGISTRY[code];
      const widths = [...new Set(availableUnits.map((unit) => unit.widthMm))];
      if (SINGLE_WIDTH_MARKETS.includes(code)) continue;
      // Two thicknesses is what a real job needs: a partition and a wall.
      expect(widths.length).toBeGreaterThanOrEqual(2);
      expect(defaultLeafCountFor(code)).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the list of one-width markets from growing", () => {
    const singleWidth = MARKETS.filter((code) => {
      const widths = new Set(
        MASONRY_MARKET_REGISTRY[code].availableUnits.map(
          (unit) => unit.widthMm,
        ),
      );
      return widths.size < 2;
    });
    // Every market now prices both a partition and an ordinary wall. An empty
    // list here is the assertion: no market may fall back to a single wall
    // thickness without this test failing first.
    expect(singleWidth.sort()).toEqual([...SINGLE_WIDTH_MARKETS].sort());
  });

  it("counts blocks per square metre from the unit's own module", () => {
    for (const code of MARKETS) {
      const config = MASONRY_MARKET_REGISTRY[code];
      for (const unit of config.availableUnits) {
        const result = calculateMasonryTakeoff({
          marketCode: code,
          wallLengthM: 100,
          wallHeightM: 1,
          selectedUnitId: unit.id,
        });
        const moduleM2 =
          ((unit.lengthMm + unit.standardJointMm) / 1000) *
          ((unit.heightMm + unit.standardJointMm) / 1000);
        // The reported rate is rounded to two places, so compare at that
        // resolution rather than pretending to more precision than it shows.
        expect(result.unitsPerM2).toBeCloseTo(1 / moduleM2, 2);
        // 100 m² of wall must order at least the net count, never less.
        expect(result.unitsRequiredNet).toBeGreaterThanOrEqual(
          Math.round(100 * (1 / moduleM2)) - 1,
        );
        expect(result.unitsRequiredGross).toBeGreaterThanOrEqual(
          result.unitsRequiredNet,
        );
      }
    }
  });

  it("never reports a negative or unbounded quantity for a 10 m² wall", () => {
    for (const code of MARKETS) {
      const result = calculateMasonryTakeoff({
        marketCode: code,
        wallLengthM: 5,
        wallHeightM: 2,
      });
      expect(result.unitsRequiredNet).toBeGreaterThan(0);
      expect(result.mortarVolumeM3Net).toBeGreaterThan(0);
      expect(result.cementBagsRequired).toBeGreaterThan(0);
      expect(Number.isFinite(result.cementBagsRequired)).toBe(true);
      expect(result.sandVolumeM3).toBeGreaterThan(0);
    }
  });
});

describe("feet and metres are the same wall", () => {
  it("gives one answer for a wall entered either way", () => {
    const metric = calculateMasonryTakeoff({
      marketCode: "US",
      wallLengthM: 10,
      wallHeightM: 3,
      selectedUnitId: "us-cmu-8in",
    });
    const imperial = calculateMasonryTakeoff({
      marketCode: "US",
      wallLengthM: 10 / 0.3048,
      wallHeightM: 3 / 0.3048,
      lengthUnit: "ft",
      selectedUnitId: "us-cmu-8in",
    });
    expect(imperial.netWallAreaM2).toBeCloseTo(metric.netWallAreaM2, 6);
    expect(imperial.unitsRequiredGross).toBe(metric.unitsRequiredGross);
    expect(imperial.cementBagsRequired).toBe(metric.cementBagsRequired);
    expect(imperial.lengthUnit).toBe("ft");
  });

  it("reads openings in the same unit as the wall", () => {
    const inFeet = calculateMasonryTakeoff({
      marketCode: "US",
      wallLengthM: 20,
      wallHeightM: 9,
      lengthUnit: "ft",
      selectedUnitId: "us-cmu-8in",
      openings: [
        { id: "w", description: "window", widthM: 4, heightM: 4, quantity: 2 },
      ],
    });
    // 2 x 4 ft x 4 ft = 32 sq ft = 2.97 m², not 32 m².
    expect(inFeet.openingsAreaM2).toBeCloseTo(2.97, 1);
    expect(inFeet.openingsAreaM2).toBeLessThan(5);
  });

  it("still treats millimetres and centimetres as the small units they are", () => {
    const millimetres = calculateMasonryTakeoff({
      marketCode: "DE",
      wallLengthM: 4000,
      wallHeightM: 2500,
      lengthUnit: "mm",
    });
    const metres = calculateMasonryTakeoff({
      marketCode: "DE",
      wallLengthM: 4,
      wallHeightM: 2.5,
    });
    expect(millimetres.netWallAreaM2).toBeCloseTo(metres.netWallAreaM2, 6);
    expect(millimetres.unitsRequiredGross).toBe(metres.unitsRequiredGross);
  });

  it("defaults to metres when no unit is given", () => {
    const result = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 2.4,
    });
    expect(result.lengthUnit).toBe("m");
    expect(result.netWallAreaM2).toBeCloseTo(24, 6);
  });

  it("treats an unmaintained unit as unread instead of guessing", () => {
    const result = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 2.4,
      lengthUnit: "furlong" as never,
    });
    expect(result.netWallAreaM2).toBe(0);
    expect(result.unitsRequiredNet).toBe(0);
  });
});
