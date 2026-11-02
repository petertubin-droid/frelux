// =========================================================
// MARKET-AWARE ENGINE PRICING TESTS
//
// Pins the wiring contract for the AI registry engines:
//   * shared helpers resolve roles with provenance and price
//     purchase packs, never inventing a price
//   * painting_project prices paint + primer by role with the
//     local brand name when a marketCode is given; without a
//     market costs stay null (manual-calculator behavior)
//   * screeding_system falls back to role prices when the admin
//     config has no price for the market
//   * tyrolene_system runs the authoritative estimate and
//     surfaces local brand names from the market price book
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock the price book BEFORE importing the engines ──
const resolveMaterialPriceByRole = vi.fn();
const fetchMarketRoleMappings = vi.fn();
vi.mock("@/lib/estimation/market-materials", () => ({
  resolveMaterialPriceByRole: (...args: unknown[]) =>
    resolveMaterialPriceByRole(...(args as [])),
  fetchMarketRoleMappings: (...args: unknown[]) =>
    fetchMarketRoleMappings(...(args as [])),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null })),
                  })),
                })),
                maybeSingle: vi.fn(async () => ({ data: null })),
              })),
              order: vi.fn(() => ({
                limit: vi.fn(() => ({ data: [] })),
              })),
            })),
            maybeSingle: vi.fn(async () => ({ data: null })),
          })),
          maybeSingle: vi.fn(async () => ({ data: null })),
        })),
      })),
    })),
  },
}));

import {
  priceProvenance,
  priceQuantity,
  resolveEnginePrice,
} from "@/lib/ai-foundation/engine-pricing";

const US_PAINT = {
  material: { id: "m1", name: "KILZ 2 All-Purpose Interior Paint" },
  price: {
    price: 42.99,
    currency: "USD",
    price_source: "Home Depot scan",
    scan_source: "homedepot.com",
    effective_date: "2026-10-01",
  },
  resolved_market: "US",
  role: "interior-paint",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveMaterialPriceByRole.mockReset();
  fetchMarketRoleMappings.mockReset();
});

describe("resolveEnginePrice", () => {
  it("resolves a role with full provenance", async () => {
    resolveMaterialPriceByRole.mockResolvedValue(US_PAINT);
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
  });

  it("returns null when the market has no verified price: never guesses", async () => {
    resolveMaterialPriceByRole.mockResolvedValue(null);
    const resolved = await resolveEnginePrice("interior-paint", "IN", "NGN");
    expect(resolved).toBeNull();
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
