/**
 * City-aware calculator price layer.
 *
 * These tests exist because this layer can change what a person is quoted. The
 * contract: a city figure replaces the market figure only when the city sample
 * clears the gate for that same material; otherwise the market figure stands
 * and is labelled as a market figure; and a failed read never moves a price.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const marketMaterials = vi.hoisted(() => ({ resolveMaterialPriceByRole: vi.fn() }));
vi.mock("@/lib/estimation/market-materials", () => marketMaterials);

const queries = vi.hoisted(() => ({ fetchListings: vi.fn() }));
vi.mock("@/lib/price-index/queries", () => queries);

import {
  describePriceBasis,
  resolveCityAwarePriceByRole,
} from "./calculator-prices";

const basePrice = (price = 4000) => ({
  role: "interior-paint" as const,
  resolved_market: "NG",
  material: {
    id: "mat-paint",
    name: "Interior emulsion",
    slug: "ng-paint-interior",
  },
  price: { id: "price-1", price, currency: "NGN", market: "NG" },
});

const listing = (price: number, over: Record<string, unknown> = {}) => ({
  price_id: `p-${Math.random().toString(36).slice(2)}`,
  material_id: "mat-paint",
  name: "Interior emulsion",
  slug: "ng-paint-interior",
  category: "paint",
  sale_unit: "bucket",
  price,
  currency: "NGN",
  price_kind: "retail" as const,
  market: "NG",
  city_slug: "lagos",
  supplier_name: "Depot",
  source_url: null,
  price_source: null,
  effective_date: "2026-10-20",
  verified_at: null,
  verification_status: "verified" as const,
  supporting_submissions: 1,
  ...over,
});

describe("resolveCityAwarePriceByRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marketMaterials.resolveMaterialPriceByRole.mockResolvedValue(basePrice(4000));
  });

  it("uses the city median when three verified prices exist there", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [listing(5000), listing(5100), listing(5200)],
      error: null,
    });

    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");

    expect(result?.basis).toBe("city");
    expect(result?.price.price).toBe(5100);
    expect(result?.city_samples).toBe(3);
    expect(result?.city_slug).toBe("lagos");
    expect(describePriceBasis(result!)).toMatch(/3 independent prices in lagos/);
  });

  it("keeps the market price when the city has only one observation", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [listing(9000)],
      error: null,
    });

    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");

    expect(result?.basis).toBe("market");
    expect(result?.price.price).toBe(4000);
    expect(describePriceBasis(result!)).toMatch(/not a city-specific figure/);
  });

  it("never uses another material's city price for this role", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [listing(5000, { material_id: "other-mat" })],
      error: null,
    });

    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");
    expect(result?.basis).toBe("market");
    expect(result?.price.price).toBe(4000);
  });

  it("ignores flagged prices entirely", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [
        listing(5000, { verification_status: "flagged" }),
        listing(5100),
        listing(5200),
      ],
      error: null,
    });

    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");
    expect(result?.basis).toBe("market");
  });

  it("does not query the index for a non-Nigerian market", async () => {
    marketMaterials.resolveMaterialPriceByRole.mockResolvedValue({
      ...basePrice(900),
      resolved_market: "GB",
    });

    const result = await resolveCityAwarePriceByRole("interior-paint", "GB", "lagos");

    expect(queries.fetchListings).not.toHaveBeenCalled();
    expect(result?.basis).toBe("market");
  });

  it("keeps the market price when the index read fails", async () => {
    queries.fetchListings.mockRejectedValue(new Error("network down"));

    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");

    expect(result?.basis).toBe("market");
    expect(result?.price.price).toBe(4000);
  });

  it("returns null when the market has no price for the role at all", async () => {
    marketMaterials.resolveMaterialPriceByRole.mockResolvedValue(null);
    const result = await resolveCityAwarePriceByRole("interior-paint", "NG", "lagos");
    expect(result).toBeNull();
  });
});
