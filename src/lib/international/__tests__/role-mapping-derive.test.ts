/**
 * The derived table is allowed to close gaps. It is not allowed to invent a
 * price, shadow a curated mapping, or claim a product the market cannot price.
 */
import { describe, expect, it } from "vitest";
import {
  BUNDLED_PRICE_BOOK,
  BUNDLED_ROLE_MAPPINGS,
  getBundledRoleMapping,
} from "@/lib/international/bundled-price-books";
import { DERIVED_ROLE_MAPPINGS } from "@/lib/international/role-mapping-derive";
import { MATERIAL_ROLES } from "@/lib/estimation/market-materials";
import {
  roleCoverageByMarket,
  roleCoverageForMarket,
} from "@/lib/international/price-role-coverage";

describe("derived role mappings", () => {
  it("never points a market at a product it cannot price", () => {
    for (const [market, roles] of Object.entries(DERIVED_ROLE_MAPPINGS)) {
      for (const [role, mapping] of Object.entries(roles)) {
        const material = BUNDLED_PRICE_BOOK[mapping.slug];
        expect(material, `${market}/${role} -> ${mapping.slug}`).toBeDefined();
        expect(
          material.markets[market],
          `${market}/${role} has no ${market} price`,
        ).toBeDefined();
      }
    }
  });

  it("never overrides a curated mapping", () => {
    for (const [market, roles] of Object.entries(DERIVED_ROLE_MAPPINGS)) {
      for (const role of Object.keys(roles)) {
        expect(
          (BUNDLED_ROLE_MAPPINGS as Record<string, Record<string, unknown>>)[
            market
          ]?.[role],
          `${market}/${role} is both curated and derived`,
        ).toBeUndefined();
      }
    }
  });

  it("only uses real engine roles", () => {
    for (const roles of Object.values(DERIVED_ROLE_MAPPINGS)) {
      for (const role of Object.keys(roles)) {
        expect(MATERIAL_ROLES).toContain(role);
      }
    }
  });

  it("leaves the three markets that were already mapped untouched", () => {
    for (const market of ["NG", "GB", "US"]) {
      for (const role of MATERIAL_ROLES) {
        const curated = (
          BUNDLED_ROLE_MAPPINGS as Record<string, Record<string, unknown>>
        )[market]?.[role];
        if (!curated) continue;
        expect(getBundledRoleMapping(market, role)).toEqual(curated);
      }
    }
  });

  it("closes the UAE gap without inventing a dirham figure", () => {
    const before = DERIVED_ROLE_MAPPINGS.AE?.["concrete-mix"];
    expect(before?.slug).toBe("ae-cement-50kg");
    const ae = roleCoverageForMarket("AE");
    expect(ae.mapped).toBeGreaterThanOrEqual(8);
    expect(ae.priced).toBeGreaterThanOrEqual(8);
  });

  it("raises priced role coverage across the book", () => {
    const rows = roleCoverageByMarket();
    const pricedMarkets = rows.filter((row) => row.priced > 0).length;
    expect(pricedMarkets).toBeGreaterThanOrEqual(38);
  });
});
