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
  plotPresetsForMarket,
  hasPlotPresets,
  unitFaceAreaM2,
} from "@/config/masonry-units";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

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
  });

  it("no longer substitutes the Nigerian block in any supported market", () => {
    // 2026-11-18 globalization audit: 25 of the 32 markets had no table of
    // their own, so a German, Japanese or Brazilian wall was counted in
    // 9 inch sandcrete blocks.
    for (const market of ALL_MARKET_CODES) {
      for (const unit of masonryUnitsForMarket(market)) {
        expect(unit.substitutedFromMarket).toBeUndefined();
      }
    }
  });

  it("still flags a substitution for a market outside the supported list", () => {
    const fallback = masonryUnitsForMarket("AR");
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

  it("gives the new markets their own unit, not the Nigerian default", () => {
    expect(masonryUnitsForMarket("DE")[0].key).toBe("de-nf-brick");
    expect(masonryUnitsForMarket("FR")[0].key).toBe("fr-bloc-20");
    expect(masonryUnitsForMarket("JP")[0].key).toBe("jp-cb");
    expect(masonryUnitsForMarket("BR")[0].key).toBe("br-bloco");
    expect(masonryUnitsForMarket("ZA")[0].key).toBe("za-maxi-brick");
    expect(masonryUnitsForMarket("CN")[0].key).toBe("cn-brick");
    expect(masonryUnitsForMarket("KE")[0].key).toBe("ke-sandcrete");
    expect(masonryUnitsForMarket("NZ")[0].key).toBe("nz-block-190");
  });

  it("offers plot presets only where a plot is a real land unit", () => {
    expect(hasPlotPresets("NG")).toBe(true);
    expect(plotPresetsForMarket("NG")).toHaveLength(3);
    // A "full plot" is a Nigerian survey unit; it must not be offered in
    // markets that subdivide land in acres, perches or erven.
    for (const market of ["US", "GB", "CA", "AU", "ZA", "DE", "JP"]) {
      expect(plotPresetsForMarket(market)).toEqual([]);
      expect(hasPlotPresets(market)).toBe(false);
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
