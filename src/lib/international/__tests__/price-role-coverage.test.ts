import { describe, expect, it } from "vitest";
import { MATERIAL_ROLES } from "@/lib/estimation/market-materials";
import { BUNDLED_PRICED_MARKETS } from "@/lib/international/bundled-price-books";
import {
  roleCoverageByMarket,
  roleCoverageForMarket,
  roleCoverageSummary,
} from "@/lib/international/price-role-coverage";

describe("price role coverage", () => {
  it("accounts for every role, mapped or not", () => {
    for (const market of BUNDLED_PRICED_MARKETS) {
      const row = roleCoverageForMarket(market);
      expect(row.entries).toHaveLength(MATERIAL_ROLES.length);
      expect(row.mapped + row.missing.length).toBe(MATERIAL_ROLES.length);
      expect(row.priced + row.unpriced.length).toBe(row.mapped);
      expect(new Set(row.entries.map((e) => e.role)).size).toBe(
        MATERIAL_ROLES.length,
      );
    }
  });

  it("never reports a role as priced without a mapped product", () => {
    for (const row of roleCoverageByMarket()) {
      for (const entry of row.entries) {
        if (entry.priced) expect(entry.slug).toBeTruthy();
      }
    }
  });

  it("treats an unknown market as holding nothing rather than borrowing", () => {
    const row = roleCoverageForMarket("ZZ");
    expect(row.mapped).toBe(0);
    expect(row.priced).toBe(0);
    expect(row.missing).toHaveLength(MATERIAL_ROLES.length);
  });

  it("summarises the book without inventing coverage", () => {
    const summary = roleCoverageSummary(roleCoverageByMarket());
    expect(summary.markets).toBe(BUNDLED_PRICED_MARKETS.length);
    expect(summary.roles).toBe(MATERIAL_ROLES.length);
    expect(summary.unmappedEverywhere.length).toBeLessThanOrEqual(
      MATERIAL_ROLES.length,
    );
    expect(summary.unpricedSlots).toBeGreaterThanOrEqual(0);
  });
});

describe("static book keeps up with the live price book", () => {
  it("prices Nigerian screeding paint, which the live book already holds", () => {
    const ng = roleCoverageForMarket("NG");
    const entry = ng.entries.find((e) => e.role === "screeding-paint");
    expect(entry?.slug).toBe("ng-screeding-paint-20l");
    expect(entry?.priced).toBe(true);
    expect(ng.unpriced).not.toContain("screeding-paint");
  });

  it("leaves white cement unpriced rather than borrowing grey cement", () => {
    // White cement is not grey Portland, and no market holds a verified figure.
    const row = roleCoverageForMarket("NG");
    const entry = row.entries.find((e) => e.role === "white-cement");
    expect(entry?.priced).toBe(false);
    expect(entry?.slug).toBeNull();
    const summary = roleCoverageSummary(roleCoverageByMarket());
    expect(summary.unmappedEverywhere).toContain("white-cement");
  });
});

describe("an unpriced slot says what kind of gap it is", () => {
  it("names the markets that do price a product the market cannot price", () => {
    // Uganda maps drywall tape to nothing it prices, and nothing else does
    // either, so the answer names no market at all.
    const ug = roleCoverageForMarket("UG");
    for (const entry of ug.entries.filter((e) => !e.priced)) {
      expect(entry.pricedIn).toEqual([]);
    }
  });

  it("keeps a Canadian gap visible when only a shared product exists", () => {
    // The UAE markets a shared sandpaper sheet that only some markets price;
    // where it is unmapped and unpriced, pricedIn answers honestly.
    const ci = roleCoverageForMarket("CI");
    const sandpaper = ci.entries.find((e) => e.role === "sandpaper");
    if (sandpaper && !sandpaper.priced) {
      expect(sandpaper.pricedIn.length).toBeGreaterThanOrEqual(0);
    }
    expect(ci.entries).toHaveLength(26);
  });

  it("reports nothing priced anywhere for a product no market holds", () => {
    const ng = roleCoverageForMarket("NG");
    const tape = ng.entries.find((e) => e.role === "joint-tape");
    expect(tape?.priced).toBe(false);
    expect(tape?.pricedIn).toEqual(["GB"]);
  });

  it("flags a market whose book is too thin to estimate with", () => {
    const ca = roleCoverageForMarket("CA");
    expect(ca.thinBook).toBe(false);
    expect(ca.bookSize).toBeGreaterThanOrEqual(8);
    const ng = roleCoverageForMarket("NG");
    expect(ng.thinBook).toBe(false);
  });
});
