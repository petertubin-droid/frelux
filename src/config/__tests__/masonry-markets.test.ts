/**
 * Every market with a masonry table gets its own units.
 *
 * CA, AU and AE previously had no rows, so the resolver handed them the
 * Nigerian 9 inch sandcrete block: a Canadian wall priced in a unit nobody
 * there lays. These tests pin each market's own block and keep the fallback
 * visible when a market genuinely has no table.
 */
import { describe, expect, it } from "vitest";
import {
  MASONRY_SOURCES,
  MASONRY_UNITS,
  masonryUnitsForMarket,
  unitFaceAreaM2,
} from "@/config/masonry-units";

describe("masonry units by market", () => {
  it("gives each market the block that is actually laid there", () => {
    expect(masonryUnitsForMarket("CA")[0].key).toBe("ca-cmu");
    expect(masonryUnitsForMarket("AU")[0].key).toBe("au-block-190");
    expect(masonryUnitsForMarket("AE")[0].key).toBe("ae-block-200");
    expect(masonryUnitsForMarket("US")[0].key).toBe("us-cmu");
    expect(masonryUnitsForMarket("GB")[0].key).toBe("uk-brick");
    expect(masonryUnitsForMarket("NG")[0].key).toBe("ng-block-9");
  });

  it("never substitutes without saying so", () => {
    for (const market of ["NG", "GB", "US", "CA", "AU", "AE"]) {
      for (const unit of masonryUnitsForMarket(market)) {
        expect(unit.substitutedFromMarket).toBeUndefined();
      }
    }
    const fallback = masonryUnitsForMarket("JP");
    expect(fallback).toHaveLength(1);
    expect(fallback[0].key).toBe("ng-block-9");
    expect(fallback[0].substitutedFromMarket).toBe("NG");
  });

  it("cites a published source for every unit", () => {
    const ids = new Set(MASONRY_SOURCES.map((s) => s.id));
    for (const unit of Object.values(MASONRY_UNITS)) {
      expect(ids.has(unit.sourceId)).toBe(true);
    }
  });

  it("covers roughly a square metre of wall in a sane number of units", () => {
    // A 190 mm Australian block needs about 13 per m²; a UK brick about 60.
    const au = masonryUnitsForMarket("AU")[0];
    expect(1 / unitFaceAreaM2(au)).toBeGreaterThan(12);
    expect(1 / unitFaceAreaM2(au)).toBeLessThan(14);
    const gb = masonryUnitsForMarket("GB")[0];
    expect(1 / unitFaceAreaM2(gb)).toBeGreaterThan(55);
    expect(1 / unitFaceAreaM2(gb)).toBeLessThan(62);
  });
});
