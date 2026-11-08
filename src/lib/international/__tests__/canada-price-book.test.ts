/**
 * Canada held two products in the whole static book, so a Canadian project
 * could not price cement, sand or paint from the fallback at all. The rows
 * below were surveyed at Home Depot Canada and carry their source and date,
 * so a later reader can tell a survey from an indicator.
 */
import { describe, expect, it } from "vitest";
import {
  BUNDLED_PRICE_BOOK,
  getBundledRoleMapping,
} from "@/lib/international/bundled-price-books";
import { roleCoverageForMarket } from "@/lib/international/price-role-coverage";

const CA_ROLES = [
  "concrete-mix",
  "sand",
  "interior-paint",
  "exterior-paint",
  "primer",
  "sandpaper",
] as const;

describe("Canadian static price book", () => {
  it("prices the six roles a Canadian estimate cannot start without", () => {
    for (const role of CA_ROLES) {
      const mapping = getBundledRoleMapping("CA", role);
      expect(mapping, role).toBeTruthy();
      const material = BUNDLED_PRICE_BOOK[mapping!.slug];
      const price = material?.markets.CA;
      expect(price, `${role} -> ${mapping!.slug}`).toBeDefined();
      expect(price!.c).toBe("CAD");
      expect(price!.p).toBeGreaterThan(0);
    }
  });

  it("records where each figure came from and when", () => {
    const caRows = Object.entries(BUNDLED_PRICE_BOOK).filter(
      ([slug, material]) => slug.startsWith("ca-") && material.markets.CA,
    );
    expect(caRows.length).toBeGreaterThanOrEqual(8);
    for (const [slug, material] of caRows) {
      const price = material.markets.CA;
      expect(price.v, slug).toMatch(/^2026-/);
      expect(price.s ?? "", slug).toMatch(/survey|Kent|Home Depot|verified/i);
    }
  });

  it("surveys a plausible retail band rather than a converted figure", () => {
    const cement = BUNDLED_PRICE_BOOK["ca-quikrete-portland-40kg"].markets.CA;
    expect(cement.p).toBeGreaterThan(15);
    expect(cement.p).toBeLessThan(40);
    const sand =
      BUNDLED_PRICE_BOOK["ca-sakrete-multipurpose-sand-25kg"].markets.CA;
    expect(sand.p).toBeLessThan(cement.p);
  });

  it("lifts Canada out of the thin-book state", () => {
    const ca = roleCoverageForMarket("CA");
    expect(ca.thinBook).toBe(false);
    expect(ca.priced).toBe(9);
    // Nine of the 26 engine roles resolve on Canadian rows; the rest are
    // unmapped rather than borrowed from another market.
    expect(ca.unpriced).not.toContain("concrete-mix");
    expect(ca.unpriced).not.toContain("sand");
  });
});
