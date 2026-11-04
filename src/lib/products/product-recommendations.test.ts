import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchEstimationMaterials = vi.fn();
const resolveMaterialPrice = vi.fn();
const resolvePrice = vi.fn();
const fetchMarketRoleMappings = vi.fn();
const fetchPricedMaterialIds = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimationMaterials: (...args: unknown[]) =>
    fetchEstimationMaterials(...args),
  fetchPricedMaterialIds: (...args: unknown[]) =>
    fetchPricedMaterialIds(...args),
}));

vi.mock("@/lib/pricing/price-gateway", () => ({
  resolveMaterialPrice: (...args: unknown[]) => resolveMaterialPrice(...args),
  resolvePrice: (...args: unknown[]) => resolvePrice(...args),
}));

vi.mock("@/lib/estimation/market-materials", () => ({
  fetchMarketRoleMappings: (...args: unknown[]) =>
    fetchMarketRoleMappings(...args),
}));

import {
  clearRecommendationCache,
  loadProductRecommendations,
} from "./product-recommendations";

const material = (id: string, name: string, category = "paint") => ({
  id,
  name,
  category,
  notes: null,
});

const priced = (
  price: number,
  currency = "EUR",
  source = "Hornbach survey",
) => ({
  unitPrice: price,
  currency,
  provenance: { priceSource: source, effectiveDate: "2026-10-11" },
});

const unpriced = () => ({
  unitPrice: null,
  currency: null,
  provenance: { priceSource: null, effectiveDate: null },
});

describe("product recommendations", () => {
  beforeEach(() => {
    clearRecommendationCache();
    fetchEstimationMaterials.mockReset();
    resolveMaterialPrice.mockReset();
    resolvePrice.mockReset();
    fetchMarketRoleMappings.mockReset();
    fetchPricedMaterialIds.mockReset();
    fetchPricedMaterialIds.mockImplementation(
      async (_market: string, ids: readonly string[]) => new Set(ids),
    );
    fetchEstimationMaterials.mockResolvedValue({ data: [], error: null });
    resolveMaterialPrice.mockResolvedValue(unpriced());
    resolvePrice.mockResolvedValue({
      unitPrice: null,
      currency: null,
      provenance: { effectiveDate: null, priceSource: null },
    });
    fetchMarketRoleMappings.mockResolvedValue([]);
  });

  it("falls back to the curated catalogue when the market book has no product rows", async () => {
    const { items, error } = await loadProductRecommendations({
      category: "paint",
      market: "NG",
    });

    expect(error).toBeNull();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.origin === "curated")).toBe(true);
    expect(items[0].brand).toBe("Berger");
  });

  it("shows the published price range as a range, not a single invented figure", async () => {
    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "NG",
      limit: 1,
    });

    const price = items[0].price;
    expect(price).not.toBeNull();
    expect(price?.low).toBe(119110);
    expect(price?.high).toBe(131795);
    expect(price?.currency).toBe("NGN");
  });

  it("keeps products without a published pack price, with the reason attached", async () => {
    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "NG",
      limit: 10,
    });

    const dulux = items.find((i) => i.brand === "Dulux");
    expect(dulux).toBeDefined();
    expect(dulux?.price).toBeNull();
    expect(dulux?.priceNote).toBeTruthy();
  });

  it("prefers the market's own priced products over the curated list", async () => {
    fetchEstimationMaterials.mockResolvedValue({
      data: [
        material("m1", "Alpinaweiss Wandfarbe Original 10L (AT)"),
        material("m2", "Zinsser Bullseye 123 1L (AT)"),
        material("m3", "Cement 25 kg (AT)", "cement"),
      ],
      error: null,
    });
    resolveMaterialPrice.mockImplementation(
      async ({ refId }: { refId: string }) =>
        refId === "m1" ? priced(49.95) : unpriced(),
    );

    const { items, error } = await loadProductRecommendations({
      category: "paint",
      market: "AT",
      limit: 4,
    });

    expect(error).toBeNull();
    expect(items[0].origin).toBe("market-book");
    expect(items[0].name).toBe("Alpinaweiss Wandfarbe Original 10L (AT)");
    expect(items[0].price?.low).toBe(49.95);
    expect(items[0].detail).toBe("10 L");
    expect(items[0].priceNote).toContain("Hornbach survey");
  });

  it("never promotes an unpriced material into the list", async () => {
    fetchEstimationMaterials.mockResolvedValue({
      data: [material("m2", "Zinsser Bullseye 123 1L (AT)")],
      error: null,
    });
    fetchPricedMaterialIds.mockResolvedValue(new Set(["m2"]));

    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "AT",
      limit: 4,
    });

    expect(items.some((i) => i.name.includes("Zinsser"))).toBe(false);
  });

  it("only considers materials the market actually prices", async () => {
    fetchEstimationMaterials.mockResolvedValue({
      data: [material("a1", "Cement (NG)"), material("a2", "Cement (AT)")],
      error: null,
    });
    fetchPricedMaterialIds.mockResolvedValue(new Set(["a1"]));
    resolveMaterialPrice.mockResolvedValue(priced(15500, "NGN", "NG survey"));

    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "NG",
      limit: 6,
    });

    const fromBook = items.filter((i) => i.origin === "market-book");
    expect(fromBook.map((i) => i.name)).toEqual(["Cement (NG)"]);
  });

  it("does not price products from a category the page did not ask for", async () => {
    fetchEstimationMaterials.mockResolvedValue({
      data: [material("m3", "Cement 25 kg (AT)", "cement")],
      error: null,
    });
    resolveMaterialPrice.mockResolvedValue(priced(7.5));

    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "AT",
      limit: 4,
    });

    expect(items.some((i) => i.name.includes("Cement"))).toBe(false);
  });

  it("returns an honest error without throwing when the catalogue read fails", async () => {
    fetchEstimationMaterials.mockRejectedValue(new Error("network down"));

    const { items, error } = await loadProductRecommendations({
      category: "paint",
      market: "NG",
    });

    expect(items.length).toBeGreaterThan(0);
    expect(error).toBeTruthy();
  });

  it("falls back to the market's role prices when the category has no product rows", async () => {
    fetchMarketRoleMappings.mockResolvedValue([
      {
        market: "NG",
        role: "waterproofer",
        material_slug: "ng-waterproofer",
        display_name: "Waterproofer, 20 kg",
        unit_label: "20 kg pail",
        notes: "Cementitious waterproofer for wet areas.",
      },
    ]);
    resolvePrice.mockResolvedValue({
      unitPrice: 24500,
      currency: "NGN",
      provenance: { effectiveDate: "2026-10-30", priceSource: "NG survey" },
    });

    const { items, error } = await loadProductRecommendations({
      category: "waterproofing",
      market: "NG",
      limit: 3,
    });

    expect(error).toBeNull();
    expect(items[0].name).toBe("Waterproofer, 20 kg");
    expect(items[0].detail).toBe("20 kg pail");
    expect(items[0].price?.low).toBe(24500);
    expect(items[0].price?.currency).toBe("NGN");
    expect(items[0].source.retrieved).toBe("2026-10-30");
  });

  it("keeps role prices out when the market has no mapping for the role", async () => {
    fetchMarketRoleMappings.mockResolvedValue([]);
    resolvePrice.mockResolvedValue({
      unitPrice: 24500,
      currency: "NGN",
      provenance: { effectiveDate: "2026-10-30", priceSource: "NG survey" },
    });

    const { items } = await loadProductRecommendations({
      category: "waterproofing",
      market: "NG",
      limit: 3,
    });

    expect(items).toEqual([]);
  });

  it("returns each market's own catalogue, priced in its own currency", async () => {
    const expectations: Array<[string, string, string]> = [
      ["GB", "GBP", "Dulux Trade Vinyl Matt"],
      ["KE", "KES", "Crown Silk Vinyl Emulsion"],
      ["ZA", "ZAR", "Plascon Double Velvet"],
    ];

    for (const [market, currency, name] of expectations) {
      clearRecommendationCache();
      const { items } = await loadProductRecommendations({
        category: "paint",
        market,
        limit: 4,
      });
      const curated = items.filter((i) => i.origin === "curated");
      expect(curated.length).toBeGreaterThan(0);
      expect(curated[0].name).toBe(name);
      expect(curated[0].price?.currency).toBe(currency);
      expect(curated.every((i) => i.price?.currency === currency)).toBe(true);
    }
  });

  it("never shows a Nigerian brand in another market", async () => {
    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "GB",
      limit: 6,
    });
    expect(items.some((i) => i.name.includes("Luxol"))).toBe(false);
    expect(items.some((i) => i.name.includes("Superstar"))).toBe(false);
  });

  it("caches per market and category so a page does not reprice on every render", async () => {
    await loadProductRecommendations({ category: "paint", market: "NG" });
    await loadProductRecommendations({ category: "paint", market: "NG" });

    expect(fetchEstimationMaterials).toHaveBeenCalledTimes(1);
  });
});
