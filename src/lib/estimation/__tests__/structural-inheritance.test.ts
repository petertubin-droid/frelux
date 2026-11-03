/**
 * Structural estimators follow the market inheritance chain.
 *
 * A market that carries no local material used to read as unpriced here while
 * the painting and screeding calculators priced the same market from its
 * parent. One platform, one answer: these tests pin the chain, the sourced
 * market that travels with the number, and the honest label when the price is
 * borrowed from an ancestor.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;

const materials = new Map<string, Row>();
const prices = new Map<string, Row>();
const profiles = new Map<string, Row>();

function lookup(table: string, filters: Record<string, unknown>): Row | null {
  if (table === "estimation_materials") {
    return materials.get(String(filters.slug)) ?? null;
  }
  if (table === "estimation_prices") {
    return (
      prices.get(`${String(filters.ref_id)}:${String(filters.market)}`) ?? null
    );
  }
  if (table === "market_profiles") {
    return profiles.get(String(filters.country_code)) ?? null;
  }
  return null;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: lookup(table, filters) }),
      };
      return chain;
    },
  },
}));

vi.mock("@/lib/international/bundled-book", () => ({
  shouldUseBundledBook: () => false,
  bundledCategoryMaterials: () => [],
}));

import {
  resolveMarketDoorsWindows,
  resolveMarketPlumbing,
} from "../structural-market";

beforeEach(() => {
  materials.clear();
  prices.clear();
  profiles.clear();
});

describe("structural market inheritance", () => {
  it("prices a plumbing key from the parent market and says so", async () => {
    profiles.set("IE", { inherits_from: "NG" });
    profiles.set("NG", { inherits_from: null });
    materials.set("ng-pipe-cold", {
      id: "m-pipe-cold",
      name: "Cold water pipe 20mm",
    });
    prices.set("m-pipe-cold:NG", {
      price: 4200,
      scan_confidence: "high",
      price_source: "Supplier scan",
    });

    const result = await resolveMarketPlumbing("IE");

    expect(result.overrides["plumb-pipe-cold"]).toBe(4200);
    const row = result.provenance.find(
      (p) => p.engineKey === "plumb-pipe-cold",
    );
    expect(row?.resolved).toBe(true);
    // The book that supplied the figure, not the market that was asked for.
    expect(row?.bookMarket).toBe("NG");
    expect(row?.explanation).toContain("inherited by IE");
  });

  it("prefers the market's own price over the parent's", async () => {
    profiles.set("IE", { inherits_from: "NG" });
    materials.set("ie-pipe-cold", {
      id: "m-ie-cold",
      name: "Cold water pipe 20mm (IE)",
    });
    materials.set("ng-pipe-cold", {
      id: "m-ng-cold",
      name: "Cold water pipe 20mm (NG)",
    });
    prices.set("m-ie-cold:IE", { price: 3100, scan_confidence: "high" });
    prices.set("m-ng-cold:NG", { price: 4200, scan_confidence: "high" });

    const result = await resolveMarketPlumbing("IE");

    expect(result.overrides["plumb-pipe-cold"]).toBe(3100);
    const row = result.provenance.find(
      (p) => p.engineKey === "plumb-pipe-cold",
    );
    expect(row?.bookMarket).toBe("IE");
    expect(row?.explanation).not.toContain("inherited");
  });

  it("still reports an item neither the market nor its parent prices", async () => {
    profiles.set("IE", { inherits_from: "NG" });
    const result = await resolveMarketPlumbing("IE");

    expect(result.overrides["plumb-pipe-cold"]).toBeUndefined();
    expect(result.unresolved).toContain("plumb-pipe-cold");
  });

  it("inherits a doors key and labels the source market", async () => {
    profiles.set("IE", { inherits_from: "NG" });
    materials.set("ng-door-flush", { id: "m-door", name: "Flush door" });
    prices.set("m-door:NG", {
      price: 78000,
      scan_confidence: "high",
      price_source: "Supplier scan",
    });

    const result = await resolveMarketDoorsWindows("IE");

    expect(result.overrides["door-flush"]).toBe(78000);
    const row = result.provenance.find((p) => p.engineKey === "door-flush");
    expect(row?.bookMarket).toBe("NG");
    expect(row?.explanation).toContain("inherited by IE");
  });
});
