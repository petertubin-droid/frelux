import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const registryPath = resolve(
  process.cwd(),
  "scripts/price-scan/verified-sources.json",
);
const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
  probed_at: string;
  minimum_building_products: number;
  sources: Array<{
    market: string;
    retailer: string;
    base_url: string;
    catalogue_url: string;
    platform: string;
    source_class: string;
    source_format: string;
    products: number;
    building_products: number;
    access_status: string;
  }>;
  rejected: Array<{ base_url: string; market: string; reason: string }>;
};

describe("verified supplier catalogue registry", () => {
  it("registers only sources that clear the building-product threshold", () => {
    expect(registry.sources.length).toBeGreaterThan(0);
    for (const source of registry.sources) {
      expect(source.building_products).toBeGreaterThanOrEqual(
        registry.minimum_building_products,
      );
      expect(source.building_products).toBeLessThanOrEqual(source.products);
    }
  });

  it("uses https catalogue endpoints only", () => {
    for (const source of registry.sources) {
      expect(source.catalogue_url.startsWith("https://")).toBe(true);
      expect(source.base_url.startsWith("https://")).toBe(true);
    }
  });

  it("classifies every source as something that may carry a price", () => {
    const priced = new Set([
      "actual_supplier_price",
      "wholesale_catalogue",
      "retail_catalogue",
      "distributor_price_list",
    ]);
    for (const source of registry.sources) {
      expect(priced.has(source.source_class)).toBe(true);
      expect(source.source_format).toBe("json");
      expect(source.access_status).toBe("ok");
    }
  });

  it("never lists the same catalogue twice", () => {
    const urls = registry.sources.map((s) => s.catalogue_url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps market codes as two-letter upper case", () => {
    for (const source of registry.sources) {
      expect(source.market).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("records why each rejected source failed", () => {
    expect(registry.rejected.length).toBeGreaterThan(0);
    for (const rejection of registry.rejected) {
      expect(rejection.reason.length).toBeGreaterThan(20);
      expect(rejection.market).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("records how each registered source behaves live", () => {
    for (const source of registry.sources as Array<{ live_state?: string }>) {
      expect(typeof source.live_state).toBe("string");
      expect(source.live_state!.length).toBeGreaterThan(30);
    }
  });

  it("never registers a tools merchant as a material source", () => {
    const tools = ["paintaccess.com.au", "toolstation.com", "screwfix.com"];
    for (const source of registry.sources) {
      for (const tool of tools) {
        expect(source.base_url.includes(tool)).toBe(false);
      }
    }
  });

  it("does not claim a market it has no source for", () => {
    const markets = new Set(registry.sources.map((s) => s.market));
    expect(markets.size).toBeLessThan(32);
    // Markets the owner asked about that still have nothing verified.
    for (const missing of ["MX", "AE", "CN"]) {
      expect(markets.has(missing)).toBe(false);
    }
  });
});
