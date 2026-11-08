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
