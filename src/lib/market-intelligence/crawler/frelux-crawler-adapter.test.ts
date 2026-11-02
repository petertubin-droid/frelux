import { describe, it, expect } from "vitest";
import {
  extractMultipleProducts,
  resetAdapterState,
  getRequestCount,
} from "./frelux-crawler-adapter";

describe("crawler/frelux-crawler-adapter", () => {
  it("resetAdapterState resets request count", () => {
    resetAdapterState();
    expect(getRequestCount()).toBe(0);
  });

  it("extractMultipleProducts returns result object", () => {
    resetAdapterState();
    const result = extractMultipleProducts(
      {
        html: "<html><body>No products</body></html>",
        url: "https://example.com",
        statusCode: 200,
        fetchedAt: new Date().toISOString(),
      },
      { country_code: "NG", name: "Test Source" } as unknown as never,
    );
    expect(result).toBeTruthy();
    expect(Array.isArray(result.products)).toBe(true);
    expect(result.method).toBeTruthy();
  });

  it("extractMultipleProducts derives currency from market", () => {
    resetAdapterState();
    const html = `
      <script type="application/ld+json">
      [{"@type":"Product","name":"Test Product","offers":{"price":"1000"}}]
      </script>
    `;
    const result = extractMultipleProducts(
      {
        html,
        url: "https://example.com",
        statusCode: 200,
        fetchedAt: new Date().toISOString(),
      },
      { country_code: "NG", name: "Nigeria" } as unknown as never,
    );
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products[0].currency).toBe("NGN");
  });
});
