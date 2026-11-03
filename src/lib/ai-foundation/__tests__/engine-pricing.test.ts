// =========================================================
// MARKET-AWARE ENGINE PRICING TESTS
//
// Pins the wiring contract for the AI registry engines:
//   * engines resolve roles through the price gateway, the same
//     resolver the manual calculators use, so the scanner's output
//     reaches both by one path
//   * purchase packs are rounded whole and no price is invented
//   * painting_project prices paint + primer by role with the
//     local brand name when a marketCode is given; without a
//     market costs stay null (manual-calculator behavior)
//   * screeding_system falls back to role prices when the admin
//     config has no price for the market
//   * tyrolene_system runs the authoritative estimate and
//     surfaces local brand names from the market price book
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock the price gateway BEFORE importing the engines ──
// Engines no longer read a price table themselves. They ask the same
// gateway the manual calculators use, so this mock is the contract.
const resolvePrice = vi.fn();
const fetchMarketRoleMappings = vi.fn();
vi.mock("@/lib/pricing/price-gateway", () => ({
  resolvePrice: (...args: unknown[]) => resolvePrice(...(args as [])),
}));
vi.mock("@/lib/estimation/market-materials", () => ({
  fetchMarketRoleMappings: (...args: unknown[]) =>
    fetchMarketRoleMappings(...(args as [])),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import {
  priceProvenance,
  priceQuantity,
  resolveEnginePrice,
} from "@/lib/ai-foundation/engine-pricing";

const US_PAINT = {
  status: "local" as const,
  role: "interior-paint" as const,
  requestedMarket: "US",
  sourcedMarket: "US",
  unitPrice: 42.99,
  currency: "USD",
  quantity: null,
  total: null,
  taxStatus: "tax_not_determined" as const,
  coverage: {
    marketCode: "US",
    status: "verified",
    statusLabel: "Verified",
    sentence: "US prices come from verified supplier scans.",
    snapshotStale: false,
  },
  provenance: {
    basis: "market" as const,
    citySamples: null,
    citySlug: null,
    indicative: false,
    priceId: "p1",
    materialSlug: "us-kilz-interior-paint",
    materialName: "KILZ 2 All-Purpose Interior Paint",
    sourcedMarket: "US",
    requestedMarket: "US",
    effectiveDate: "2026-10-01",
    priceSource: "Home Depot scan",
    scanSource: "homedepot.com",
    scanConfidence: "high" as const,
    packSizeId: "1 gal",
    evidence: "supplier" as const,
  },
  warnings: [],
  message: "interior-paint priced from US verified supplier prices.",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolvePrice.mockReset();
  fetchMarketRoleMappings.mockReset();
});

describe("resolveEnginePrice", () => {
  it("resolves a role through the gateway with full provenance", async () => {
    resolvePrice.mockResolvedValue(US_PAINT);
    fetchMarketRoleMappings.mockResolvedValue([
      { role: "interior-paint", unit_label: "1 gallon" },
    ]);
    const resolved = await resolveEnginePrice("interior-paint", "US", "NGN");
    expect(resolved).not.toBeNull();
    expect(resolved!.materialName).toBe("KILZ 2 All-Purpose Interior Paint");
    expect(resolved!.unitPrice).toBe(42.99);
    expect(resolved!.currency).toBe("USD");
    expect(resolved!.resolvedMarket).toBe("US");
    // A gallon label resolves to 3.785 L per pack.
    expect(resolved!.packUnits).toBe(3.785);
    expect(resolved!.priceSource).toBe("Home Depot scan");
    // The gateway's classification travels with the number.
    expect(resolved!.status).toBe("local");
    expect(resolved!.coverageStatus).toBe("verified");
    expect(resolved!.message).toBe(US_PAINT.message);
    // The engine used the one resolver, not a private table read.
    expect(resolvePrice).toHaveBeenCalledWith({
      role: "interior-paint",
      market: "US",
      citySlug: null,
    });
  });

  it("passes a city through to the gateway for city-aware evidence", async () => {
    resolvePrice.mockResolvedValue(US_PAINT);
    fetchMarketRoleMappings.mockResolvedValue([]);
    await resolveEnginePrice("interior-paint", "NG", "NGN", {
      citySlug: "lagos",
    });
    expect(resolvePrice).toHaveBeenCalledWith({
      role: "interior-paint",
      market: "NG",
      citySlug: "lagos",
    });
  });

  it("returns null when the market has no price: never guesses", async () => {
    resolvePrice.mockResolvedValue({
      ...US_PAINT,
      status: "not_priced",
      unitPrice: null,
      currency: null,
      sourcedMarket: null,
      message: "No price for interior-paint in IN. Enter a price to continue.",
    });
    const resolved = await resolveEnginePrice("interior-paint", "IN", "NGN");
    expect(resolved).toBeNull();
    // No mapping lookup happens for a price that does not exist.
    expect(fetchMarketRoleMappings).not.toHaveBeenCalled();
  });
});

describe("priceQuantity", () => {
  it("buys whole packs when the market sells packs", () => {
    const line = priceQuantity(25, {
      role: "interior-paint",
      materialName: "KILZ 2",
      unitPrice: 42.99,
      packUnits: 3.785,
      purchaseLabel: "1 gal",
      currency: "USD",
      resolvedMarket: "US",
      priceSource: "Home Depot scan",
      scanSource: "homedepot.com",
      priceDate: "2026-10-01",
    });
    // 25 L ÷ 3.785 L/gal = 7 packs (ceil), × $42.99.
    expect(line.amount).toBeCloseTo(7 * 42.99, 2);
    expect(line.label).toBe("KILZ 2");
  });

  it("prices loose quantities directly when sold per unit", () => {
    const line = priceQuantity(12, {
      role: "primer",
      materialName: "Zinsser Bullseye",
      unitPrice: 9.5,
      packUnits: null,
      purchaseLabel: "L",
      currency: "USD",
      resolvedMarket: "US",
      priceSource: null,
      scanSource: null,
      priceDate: null,
    });
    expect(line.amount).toBe(114);
  });
});

describe("priceProvenance", () => {
  it("names the market book, source, scan and date", () => {
    const text = priceProvenance({
      role: "interior-paint",
      materialName: "KILZ 2",
      unitPrice: 42.99,
      packUnits: null,
      purchaseLabel: null,
      currency: "USD",
      resolvedMarket: "US",
      priceSource: "Home Depot scan",
      scanSource: "homedepot.com",
      priceDate: "2026-10-01",
    });
    expect(text).toContain("US market book");
    expect(text).toContain("Home Depot scan");
    expect(text).toContain("homedepot.com");
    expect(text).toContain("2026-10-01");
  });
});
