import { describe, it, expect } from "vitest";
import {
  extractProductsFromHtml,
  deriveCurrencyFromMarket,
} from "./content-extractor";

describe("crawler/content-extractor", () => {
  it("deriveCurrencyFromMarket maps known markets", () => {
    expect(deriveCurrencyFromMarket("NG")).toBe("NGN");
    expect(deriveCurrencyFromMarket("GH")).toBe("GHS");
    expect(deriveCurrencyFromMarket("KE")).toBe("KES");
    expect(deriveCurrencyFromMarket("ZA")).toBe("ZAR");
  });

  it("deriveCurrencyFromMarket returns null for unknown market", () => {
    expect(deriveCurrencyFromMarket("XX")).toBeNull();
    expect(deriveCurrencyFromMarket("")).toBeNull();
  });

  it("extractProductsFromHtml returns result object", () => {
    const result = extractProductsFromHtml(
      "<html><body>No products</body></html>",
      "https://example.com",
    );
    expect(result).toBeTruthy();
    expect(result.url).toBe("https://example.com");
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("extractProductsFromHtml extracts JSON-LD products", () => {
    const html = `
      <html>
      <head>
      <script type="application/ld+json">
      [{"@type":"Product","name":"Cement 50kg","offers":{"price":"5000","priceCurrency":"NGN"}}]
      </script>
      </head>
      <body></body>
      </html>
    `;
    const result = extractProductsFromHtml(html, "https://example.com");
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.extractionMethod).toBe("jsonld");
  });
});
