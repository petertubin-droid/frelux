import { describe, expect, it } from "vitest";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import {
  DEFAULT_MARKET_CONFIGURATIONS,
  getDefaultMarketConfiguration,
  validateMarketConfiguration,
} from "../market-configuration";
import {
  getConstructionTerm,
  getMarketNavigationLabel,
  getMarketToolCopy,
  TERMINOLOGY_MARKETS,
} from "../construction-terminology";
describe("market configuration", () => {
  it("matches all 32 configured market profiles without inventing material sizes", () => {
    expect(
      DEFAULT_MARKET_CONFIGURATIONS.map((x) => x.marketCode).sort(),
    ).toEqual(BUILTIN_MARKET_PROFILES.map((x) => x.country_code).sort());
    expect(DEFAULT_MARKET_CONFIGURATIONS).toHaveLength(32);
    for (const x of DEFAULT_MARKET_CONFIGURATIONS) {
      expect(x.masonrySpecifications).toEqual([]);
      expect(x.boardSpecifications).toEqual([]);
      expect(x.tax.ratePercent).toBeNull();
    }
  });
  it("looks up and validates records", () => {
    expect(getDefaultMarketConfiguration("US")?.currency.code).toBe("USD");
    expect(getDefaultMarketConfiguration("XX")).toBeUndefined();
    expect(validateMarketConfiguration({ schemaVersion: 9 }).ok).toBe(false);
  });
});
describe("construction terminology", () => {
  it("localizes stable terms for verified terminology markets", () => {
    expect(getConstructionTerm("board_material", "US")).toBe("Drywall");
    expect(getConstructionTerm("board_material", "GB")).toBe("Plasterboard");
    expect(getConstructionTerm("board_material", "NG")).toBe(
      "Gypsum Board / Ceiling Sheet",
    );
    expect(getConstructionTerm("wall_finishing", "US")).toBe(
      "Wall Mudding / Skim Coating",
    );
    expect(getConstructionTerm("wall_finishing", "GB")).toBe("Wall Skimming");
    expect(getConstructionTerm("wall_finishing", "NG")).toBe("Wall Screeding");
    expect(getConstructionTerm("temporary_concrete_support", "NG")).toBe(
      "Wood Boarding / Carpentry Box",
    );
  });
  it("covers every built-in market with a non-empty term for each operation", () => {
    const profileCodes = BUILTIN_MARKET_PROFILES.map(
      (profile) => profile.country_code,
    ).sort();
    expect([...TERMINOLOGY_MARKETS].sort()).toEqual(profileCodes);

    for (const marketCode of TERMINOLOGY_MARKETS) {
      for (const operation of [
        "board_material",
        "wall_finishing",
        "reinforcement",
        "temporary_concrete_support",
      ] as const) {
        expect(getConstructionTerm(operation, marketCode).trim()).not.toBe("");
      }
      const base = {
        title: "Base",
        does: "Base",
        enters: "Base",
        gets: "Base",
      };
      expect(
        getMarketToolCopy("screeding", marketCode, base).title.trim(),
      ).not.toBe("");
      expect(
        getMarketToolCopy("reinforcement", marketCode, base).title.trim(),
      ).not.toBe("");
    }
  });
  it("preserves supplied fallbacks for unknown markets and unrelated routes", () => {
    expect(getConstructionTerm("wall_finishing", "XX", "Wall Finishing")).toBe(
      "Wall Finishing",
    );
    expect(getConstructionTerm("wall_finishing", "DE")).toBe("Wall Finishing");
    expect(getMarketNavigationLabel("/unrelated", "US", "Existing Label")).toBe(
      "Existing Label",
    );
    expect(
      getMarketNavigationLabel(
        "/screeding-calculator",
        "US",
        "Screeding Calculator",
      ),
    ).toBe("Wall Mudding / Skim Coat Calculator");
  });

  it("localizes catalogue copy without changing stable slugs or routes", () => {
    const base = {
      title: "Wall Screeding",
      does: "Calculate screeding",
      enters: "Area",
      gets: "Materials",
      slug: "screeding",
      to: "/screeding-calculator",
    };
    const us = getMarketToolCopy("screeding", "US", base);
    const de = getMarketToolCopy("screeding", "DE", base);
    const usRebar = getMarketToolCopy("reinforcement", "US", base);
    expect(us.title).toBe("Wall Mudding / Skim Coat");
    expect(us.to).toBe(base.to);
    expect(de.title).toBe("Wall Finishing");
    expect(usRebar.title).toBe("Rebar Estimator");
    expect(de.to).toBe(base.to);
  });
});
