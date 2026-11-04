import { describe, it, expect } from "vitest";
import { VERIFIED_PRODUCTS, verifiedProductsFor } from "./verified-products";

/**
 * The catalogue's whole value is that a reader can trace every figure back to a
 * page. These tests fail the build when an entry stops being traceable, rather
 * than letting an untraceable number reach a customer.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("verified product catalogue", () => {
  it("carries at least one product", () => {
    expect(VERIFIED_PRODUCTS.length).toBeGreaterThan(0);
  });

  it("uses unique ids", () => {
    const ids = VERIFIED_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names a manufacturer page and the day it was read for every product", () => {
    for (const product of VERIFIED_PRODUCTS) {
      expect(product.sourceUrl, product.id).toMatch(/^https:\/\//);
      expect(product.sourceName.length, product.id).toBeGreaterThan(3);
      expect(product.retrieved, product.id).toMatch(ISO_DATE);
      expect(
        Number.isNaN(Date.parse(product.retrieved)),
        `${product.id} retrieved date must parse`,
      ).toBe(false);
    }
  });

  it("describes every product without leaving the summary blank", () => {
    for (const product of VERIFIED_PRODUCTS) {
      expect(product.brand.trim().length, product.id).toBeGreaterThan(0);
      expect(product.line.trim().length, product.id).toBeGreaterThan(0);
      expect(product.summary.trim().length, product.id).toBeGreaterThan(10);
    }
  });

  it("uses uppercase ISO market and currency codes", () => {
    for (const product of VERIFIED_PRODUCTS) {
      expect(product.market, product.id).toMatch(/^[A-Z]{2}$/);
      expect(product.currency, product.id).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("keeps every published price range ordered and positive", () => {
    for (const product of VERIFIED_PRODUCTS) {
      for (const pack of product.packs) {
        expect(pack.size, product.id).toBeGreaterThan(0);
        expect(pack.priceLow, product.id).toBeGreaterThan(0);
        expect(pack.priceHigh, product.id).toBeGreaterThanOrEqual(
          pack.priceLow,
        );
      }
    }
  });

  it("never states a coverage rate of zero or a fractional number of coats", () => {
    for (const product of VERIFIED_PRODUCTS) {
      if (product.coveragePerLitre !== null) {
        expect(product.coveragePerLitre, product.id).toBeGreaterThan(0);
      }
      if (product.coats !== null) {
        expect(Number.isInteger(product.coats), product.id).toBe(true);
        expect(product.coats, product.id).toBeGreaterThan(0);
      }
    }
  });

  it("attributes a coverage figure that came from a different page", () => {
    for (const product of VERIFIED_PRODUCTS) {
      if (!product.coveragePerLitre) continue;
      const samePage = product.sourceUrl.includes("dulux");
      if (!samePage) {
        expect(
          product.coverageSourceUrl,
          `${product.id} publishes coverage, so it must name where that came from`,
        ).toMatch(/^https:\/\//);
      }
    }
  });

  it("explains every product sold without a published pack price", () => {
    for (const product of VERIFIED_PRODUCTS) {
      if (product.packs.length > 0) continue;
      expect(
        product.caveat,
        `${product.id} has no pack price, so it must say why`,
      ).toBeTruthy();
    }
  });

  it("filters by category and market without leaking another market", () => {
    const nigerianPaint = verifiedProductsFor("paint", "ng");
    expect(nigerianPaint.length).toBeGreaterThan(0);
    expect(nigerianPaint.every((p) => p.market === "NG")).toBe(true);

    const elsewhere = verifiedProductsFor("paint", "PT");
    expect(elsewhere).toEqual([]);
  });
});
