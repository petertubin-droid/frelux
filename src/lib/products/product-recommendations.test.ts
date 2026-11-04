import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchEstimationMaterials = vi.fn();
const resolveMaterialPrice = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimationMaterials: (...args: unknown[]) =>
    fetchEstimationMaterials(...args),
}));

vi.mock("@/lib/pricing/price-gateway", () => ({
  resolveMaterialPrice: (...args: unknown[]) => resolveMaterialPrice(...args),
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
    fetchEstimationMaterials.mockResolvedValue({ data: [], error: null });
    resolveMaterialPrice.mockResolvedValue(unpriced());
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

    const { items } = await loadProductRecommendations({
      category: "paint",
      market: "AT",
      limit: 4,
    });

    expect(items.some((i) => i.name.includes("Zinsser"))).toBe(false);
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

  it("caches per market and category so a page does not reprice on every render", async () => {
    await loadProductRecommendations({ category: "paint", market: "NG" });
    await loadProductRecommendations({ category: "paint", market: "NG" });

    expect(fetchEstimationMaterials).toHaveBeenCalledTimes(1);
  });
});
