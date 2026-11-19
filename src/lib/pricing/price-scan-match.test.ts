import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error plain ESM script, no types
import {
  parseCatalogue,
  scoreMatch,
  sizeSignature,
} from "../../../scripts/price-scan/match.mjs";

describe("catalogue matcher", () => {
  it("reads a pack signature out of a material name", () => {
    expect(sizeSignature("K Rend HP12 basecoat (25 kg)")).toEqual(["25kg"]);
    expect(sizeSignature("Alkali resistant mesh 1 m x 50 m")).toEqual([
      "1m",
      "50m",
    ]);
    expect(sizeSignature("Interior emulsion 20 L")).toEqual(["20l"]);
  });

  it("refuses a product whose pack size differs", () => {
    const r = scoreMatch("Interior emulsion 20 L", "Interior emulsion 4 L");
    expect(r.score).toBe(0);
    expect(r.reason).toBe("pack size differs");
  });

  it("accepts a like-for-like product", () => {
    const r = scoreMatch(
      "K Rend HP12 basecoat (25 kg)",
      "K Rend HP12 Basecoat Render 25 kg",
    );
    expect(r.score).toBeGreaterThanOrEqual(0.8);
  });

  it("refuses a single generic word collision", () => {
    const r = scoreMatch("Timber per m", "Timber Inserts Type D M6x10 / each");
    expect(r.score).toBe(0);
  });

  it("parses a Shopify feed and a WooCommerce feed", () => {
    const shopify = parseCatalogue("shopify", {
      products: [
        { title: "Basecoat", variants: [{ title: "25 kg", price: "11.82" }] },
      ],
    });
    expect(shopify).toEqual([{ name: "Basecoat 25 kg", price: 11.82 }]);

    // WooCommerce quotes minor units, and a variable product only has a range.
    const woo = parseCatalogue("woocommerce", [
      {
        name: "Basecoat 25 kg",
        prices: { price: "4972", currency_minor_unit: 2 },
      },
      {
        name: "Varnish",
        prices: {
          price: "",
          currency_minor_unit: 2,
          price_range: { min_amount: "2500" },
        },
      },
    ]);
    expect(woo).toEqual([
      { name: "Basecoat 25 kg", price: 49.72 },
      { name: "Varnish", price: 25 },
    ]);
  });
});

describe("price scan registry", () => {
  const doc = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "scripts/price-scan/sources.json"),
      "utf8",
    ),
  ) as {
    catalogues: Array<{
      market: string;
      retailer: string;
      url: string;
      currency: string;
      platform: string;
    }>;
    sources: unknown[];
  };

  it("registers https catalogue feeds with a currency for the market", () => {
    expect(doc.catalogues.length).toBeGreaterThan(0);
    const expected: Record<string, string> = {
      AU: "AUD",
      CA: "CAD",
      AE: "AED",
      MX: "MXN",
      KE: "KES",
      ZA: "ZAR",
    };
    for (const c of doc.catalogues) {
      expect(c.url.startsWith("https://")).toBe(true);
      expect(c.currency).toBe(expected[c.market]);
      expect(["shopify", "woocommerce"]).toContain(c.platform);
    }
  });
});
