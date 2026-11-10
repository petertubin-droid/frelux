import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockFrom,
  mockSelect,
  mockEq,
  _mockIlike,
  _mockIn,
  mockOrder,
  mockLimit,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  _mockIlike: vi.fn(),
  _mockIn: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

import {
  resolveCalculatorPrice,
  resolveCalculatorPriceByName,
  resolveCalculatorPricesBulk,
  clearApprovedPriceCache,
  derivedFreshness,
} from "./price-resolver";
import { NO_PRICE_AVAILABLE } from "@/types/market-intelligence";
import type { MiApprovedPrice } from "@/types/market-intelligence";

describe("price-resolver", () => {
  beforeEach(() => {
    clearApprovedPriceCache();
    vi.clearAllMocks();
  });

  it("resolveCalculatorPrice returns best fresh price", async () => {
    const mockPrices: Partial<MiApprovedPrice>[] = [
      {
        price: 5000,
        currency_code: "NGN",
        freshness: "recent",
        confidence: "high",
        source_count: 2,
        // Both rows are aged from last_updated on read now, so this one has to
        // be genuinely older than the other for the test to mean anything.
        last_updated: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      },
      {
        price: 5200,
        currency_code: "NGN",
        freshness: "fresh",
        confidence: "high",
        source_count: 3,
        last_updated: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = mockSelect.mockReturnValue(chain);
    chain.eq = mockEq.mockReturnValue(chain);
    chain.order = mockOrder.mockReturnValue(chain);
    chain.limit = mockLimit.mockResolvedValueOnce({
      data: mockPrices,
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await resolveCalculatorPrice("NG", "p1");

    expect(res.found).toBe(true);
    expect(res.price).toBe(5200);
    expect(res.freshness).toBe("fresh");
    expect(res.isStale).toBe(false);
    expect(res.message).toBe("Current market price");
  });

  it("resolveCalculatorPrice uses regional filter if options.region matches", async () => {
    const mockPrices: Partial<MiApprovedPrice>[] = [
      {
        price: 5000,
        currency_code: "NGN",
        freshness: "fresh",
        region: "Lagos",
        last_updated: "2026-01-01T00:00:00Z",
      },
      {
        price: 4800,
        currency_code: "NGN",
        freshness: "fresh",
        region: "Abuja",
        last_updated: "2026-01-01T00:00:00Z",
      },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = mockSelect.mockReturnValue(chain);
    chain.eq = mockEq.mockReturnValue(chain);
    chain.order = mockOrder.mockReturnValue(chain);
    chain.limit = mockLimit.mockResolvedValueOnce({
      data: mockPrices,
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await resolveCalculatorPrice("NG", "p1", { region: "Abuja" });

    expect(res.found).toBe(true);
    expect(res.price).toBe(4800);
  });

  it("resolveCalculatorPrice tries fallback when query returns no data", async () => {
    const chain1: Record<string, unknown> = {};
    chain1.select = vi.fn().mockReturnValue(chain1);
    chain1.eq = vi.fn().mockReturnValue(chain1);
    chain1.order = vi.fn().mockReturnValue(chain1);
    chain1.limit = vi.fn().mockResolvedValueOnce({ data: [], error: null });

    const fallbackPrice: Partial<MiApprovedPrice> = {
      price: 6000,
      currency_code: "NGN",
      freshness: "fresh",
      confidence: "medium",
      source_count: 1,
      last_updated: "2026-01-01T00:00:00Z",
    };

    const chain2: Record<string, unknown> = {};
    chain2.select = vi.fn().mockReturnValue(chain2);
    chain2.eq = vi.fn().mockReturnValue(chain2);
    chain2.order = vi.fn().mockReturnValue(chain2);
    chain2.limit = vi
      .fn()
      .mockResolvedValueOnce({ data: [fallbackPrice], error: null });

    mockFrom.mockReturnValueOnce(chain1).mockReturnValueOnce(chain2);

    const res = await resolveCalculatorPrice("NG", "p1", { packageSize: 20 });

    expect(res.found).toBe(true);
    expect(res.price).toBe(6000);
    expect(res.isEstimated).toBe(true);
    expect(res.message).toContain("Estimated price (package mismatch)");
  });

  it("resolveCalculatorPrice returns NO_PRICE_AVAILABLE when fallback also fails or error occurs", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockRejectedValueOnce(new Error("DB failure"));

    mockFrom.mockReturnValue(chain);

    const res = await resolveCalculatorPrice("NG", "p1");
    expect(res).toEqual(NO_PRICE_AVAILABLE);
  });

  it("resolveCalculatorPriceByName searches by product name pattern", async () => {
    const mockPrices: Partial<MiApprovedPrice>[] = [
      {
        price: 3500,
        currency_code: "KES",
        freshness: "stale",
        last_updated: "2025-01-01T00:00:00Z",
      },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi
      .fn()
      .mockResolvedValueOnce({ data: mockPrices, error: null });

    mockFrom.mockReturnValue(chain);

    const res = await resolveCalculatorPriceByName("KE", "Dulux Emulsion");

    expect(res.found).toBe(true);
    expect(res.price).toBe(3500);
    expect(res.isStale).toBe(true);
    expect(res.message).toContain("Last known price (stale as of");
  });

  it("resolveCalculatorPriceByName returns NO_PRICE_AVAILABLE on empty result", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValueOnce({ data: [], error: null });

    mockFrom.mockReturnValue(chain);

    const res = await resolveCalculatorPriceByName("KE", "Nonexistent");
    expect(res).toEqual(NO_PRICE_AVAILABLE);
  });

  it("resolveCalculatorPricesBulk resolves multiple products at once", async () => {
    const mockRows: Partial<MiApprovedPrice>[] = [
      {
        canonical_product_id: "p1",
        price: 1000,
        currency_code: "NGN",
        freshness: "fresh",
        last_updated: "2026-01-01T00:00:00Z",
      },
      {
        canonical_product_id: "p2",
        price: 2000,
        currency_code: "NGN",
        freshness: "stale",
        last_updated: "2025-01-01T00:00:00Z",
      },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi
      .fn()
      .mockReturnValue(Promise.resolve({ data: mockRows, error: null }));

    mockFrom.mockReturnValue(chain);

    const map = await resolveCalculatorPricesBulk("NG", ["p1", "p2", "p3"]);

    expect(map.size).toBe(3);
    expect(map.get("p1")?.price).toBe(1000);
    expect(map.get("p2")?.price).toBe(2000);
    expect(map.get("p3")).toEqual(NO_PRICE_AVAILABLE);
  });

  it("resolveCalculatorPricesBulk returns empty map for empty input list", async () => {
    const map = await resolveCalculatorPricesBulk("NG", []);
    expect(map.size).toBe(0);
  });

  it("clearApprovedPriceCache does not throw", () => {
    expect(() => clearApprovedPriceCache()).not.toThrow();
  });
});

describe("approved price age is derived, not trusted", () => {
  const row = (stored: string, daysAgo: number) => ({
    freshness: stored,
    last_updated: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    approved_at: null,
  });

  it("reports an old price as stale however it was labelled", () => {
    // Nothing recomputes mi_approved_prices.freshness, so a price approved a
    // year ago still carries 'fresh' from the approve path.
    expect(derivedFreshness(row("fresh", 400) as never)).toBe("expired");
    expect(derivedFreshness(row("fresh", 45) as never)).toBe("stale");
    expect(derivedFreshness(row("fresh", 14) as never)).toBe("recent");
    expect(derivedFreshness(row("fresh", 2) as never)).toBe("fresh");
  });

  it("never talks a stored worse label up to fresher", () => {
    expect(derivedFreshness(row("expired", 1) as never)).toBe("expired");
    expect(derivedFreshness(row("stale", 2) as never)).toBe("stale");
  });

  it("falls back to the stored label when there is no date at all", () => {
    expect(derivedFreshness({ freshness: "recent", last_updated: null } as never)).toBe("recent");
  });
});
