/**
 * UK and GB are one market.
 *
 * The canonical market list emits GB, but the masonry, cement and slab tables
 * were keyed by UK. A caller passing the canonical code used to fall through to
 * the Nigerian fallback, which quotes 9-inch blocks for a 215 mm brick wall.
 */
import { describe, expect, it } from "vitest";
import { canonicalMarketCode, marketCodeVariants } from "@/lib/international/market-codes";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { cementBagKg, masonryUnitsForMarket } from "@/config/masonry-units";
import {
  regionalVocabulary,
  slabVocabulary,
  tankVocabulary,
} from "@/lib/localization/regional-vocabulary";

describe("market code aliases", () => {
  it("canonicalises the legacy UK code to GB", () => {
    expect(canonicalMarketCode("UK")).toBe("GB");
    expect(canonicalMarketCode("uk")).toBe("GB");
    expect(canonicalMarketCode("GBR")).toBe("GB");
    expect(canonicalMarketCode("GB")).toBe("GB");
  });

  it("leaves every other market untouched", () => {
    for (const code of ALL_MARKET_CODES) {
      expect(canonicalMarketCode(code)).toBe(code);
    }
  });

  it("offers both spellings to tables keyed by either", () => {
    expect(marketCodeVariants("GB")).toContain("UK");
    expect(marketCodeVariants("UK")).toContain("GB");
    expect(marketCodeVariants("NG")).toEqual(["NG"]);
  });
});

describe("GB and UK resolve to the same British products", () => {
  it("returns the British brick for both spellings", () => {
    const gb = masonryUnitsForMarket("GB");
    const uk = masonryUnitsForMarket("UK");
    expect(gb.map((u) => u.key)).toEqual(uk.map((u) => u.key));
    expect(gb[0].key).toBe("uk-brick");
  });

  it("never falls back to the Nigerian block for GB", () => {
    expect(masonryUnitsForMarket("GB").some((u) => u.market === "NG")).toBe(false);
  });

  it("reads the same cement bag weight for both", () => {
    expect(cementBagKg("GB")).toBe(cementBagKg("UK"));
  });

  it("uses British slab and tank wording for both spellings", () => {
    expect(slabVocabulary("GB")).toEqual(slabVocabulary("UK"));
    expect(slabVocabulary("GB").title).toBe("Ground bearing slab");
    expect(tankVocabulary("GB")).toEqual(tankVocabulary("UK"));
  });

  it("resolves regional vocabulary through the alias", () => {
    expect(regionalVocabulary("GB")).toEqual(regionalVocabulary("UK"));
  });
});
