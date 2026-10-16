import { describe, expect, it } from "vitest";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import {
  DEFAULT_MARKET_CONFIGURATIONS,
  getDefaultMarketConfiguration,
  validateMarketConfiguration,
} from "../market-configuration";
import { getConstructionTerm } from "../construction-terminology";
describe("market configuration", () => {
  it("matches all 20 existing market profiles without inventing material sizes", () => {
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
describe("construction terminology", () =>
  it("localizes stable terms", () => {
    expect(getConstructionTerm("board_material", "US")).toBe("Drywall");
    expect(getConstructionTerm("board_material", "GB")).toBe("Plasterboard");
    expect(getConstructionTerm("board_material", "NG")).toBe(
      "Gypsum Board / Ceiling Sheet",
    );
    expect(getConstructionTerm("wall_finishing", "GB")).toBe("Skimming");
    expect(getConstructionTerm("temporary_concrete_support", "NG")).toBe(
      "Wood Boarding / Carpentry Box",
    );
  }));
