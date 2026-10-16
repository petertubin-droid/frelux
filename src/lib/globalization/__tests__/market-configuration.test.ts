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
  it("uses neutral labels for markets without curated equivalents", () => {
    expect(getConstructionTerm("wall_finishing", "DE", "Wall Finishing")).toBe(
      "Wall Finishing",
    );
    expect(
      getMarketNavigationLabel("/screeding-calculator", "DE", "Wall Screeding"),
    ).toBe("Wall Finishing");
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
    expect(us.title).toBe("Wall Mudding / Skim Coat");
    expect(us.to).toBe(base.to);
    expect(de.title).toBe("Wall Finishing");
    expect(de.to).toBe(base.to);
  });
});
