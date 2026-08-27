import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockFrom,
  mockSelect,
  mockEq,
  mockIs,
  mockOrder,
  mockLimit,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIs: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

import {
  fetchCurrentPrice,
  fetchMarketPrices,
  fetchMarketProducts,
  resolveProductPrice,
  clearPriceCache,
} from "./pricing-resolver";
import type { MarketPricing, MarketProduct } from "@/types/international";

describe("pricing-resolver", () => {
  beforeEach(() => {
    clearPriceCache();
    vi.clearAllMocks();

    const chain: Record<string, unknown> = {};
    chain.select = mockSelect.mockReturnValue(chain);
    chain.eq = mockEq.mockReturnValue(chain);
    chain.is = mockIs.mockReturnValue(chain);
    chain.order = mockOrder.mockReturnValue(chain);
    chain.limit = mockLimit.mockReturnValue(chain);
    chain.maybeSingle = mockMaybeSingle;

    mockFrom.mockReturnValue(chain);
  });

  it("fetchCurrentPrice returns pricing data and caches result", async () => {
    const mockPricing: Partial<MarketPricing> = {
      id: "p1",
      market_code: "NG",
      product_id: "prod123",
      price: 15000,
      currency_code: "NGN",
    };
    mockMaybeSingle.mockResolvedValueOnce({ data: mockPricing, error: null });

    const result1 = await fetchCurrentPrice("NG", "prod123");
    expect(result1).toEqual(mockPricing);

    // Cached call - shouldn't call supabase again
    const result2 = await fetchCurrentPrice("NG", "prod123");
    expect(result2).toEqual(mockPricing);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("fetchCurrentPrice returns null on error or null data and caches null", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await fetchCurrentPrice("NG", "missing");
    expect(result).toBeNull();

    // Cache should hold null
    const resultCached = await fetchCurrentPrice("NG", "missing");
    expect(resultCached).toBeNull();
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("fetchMarketPrices returns pricing list", async () => {
    const mockList: Partial<MarketPricing>[] = [
      { id: "1", price: 100 },
      { id: "2", price: 200 },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.order = vi
      .fn()
      .mockReturnValue(Promise.resolve({ data: mockList, error: null }));
    mockFrom.mockReturnValue(chain);

    const prices = await fetchMarketPrices("KE");
    expect(prices).toEqual(mockList);
  });

  it("fetchMarketPrices with priceType adds extra eq condition", async () => {
    const mockList: Partial<MarketPricing>[] = [
      { id: "1", price_type: "labour" },
    ];

    const eqFn = vi.fn();
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = eqFn.mockImplementation(() => chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: mockList, error: null }).then(onfulfilled);

    mockFrom.mockReturnValue(chain);

    const prices = await fetchMarketPrices("KE", "labour");
    expect(prices).toEqual(mockList);
    expect(eqFn).toHaveBeenCalledWith("price_type", "labour");
  });

  it("fetchMarketPrices returns empty array on error", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.order = vi
      .fn()
      .mockReturnValue(
        Promise.resolve({ data: null, error: { message: "err" } }),
      );
    mockFrom.mockReturnValue(chain);

    const prices = await fetchMarketPrices("KE");
    expect(prices).toEqual([]);
  });

  it("fetchMarketProducts returns all products when no calculatorType provided", async () => {
    const mockProducts: Partial<MarketProduct>[] = [
      { id: "p1", calculator_compatibility: ["painting"] },
      { id: "p2", calculator_compatibility: ["tile"] },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: mockProducts, error: null }).then(onfulfilled);
    mockFrom.mockReturnValue(chain);

    const products = await fetchMarketProducts("KE");
    expect(products.length).toBe(2);
  });

  it("fetchMarketProducts filters by calculatorType", async () => {
    const mockProducts: Partial<MarketProduct>[] = [
      { id: "p1", calculator_compatibility: ["painting", "screeding"] },
      { id: "p2", calculator_compatibility: ["tile"] },
    ];

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: mockProducts, error: null }).then(onfulfilled);
    mockFrom.mockReturnValue(chain);

    const products = await fetchMarketProducts("KE", "painting");
    expect(products).toEqual([
      { id: "p1", calculator_compatibility: ["painting", "screeding"] },
    ]);
  });

  it("fetchMarketProducts returns empty array on error", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: { message: "err" } }).then(
        onfulfilled,
      );
    mockFrom.mockReturnValue(chain);

    const products = await fetchMarketProducts("KE");
    expect(products).toEqual([]);
  });

  it("resolveProductPrice returns detailed object or null", async () => {
    const mockPricing: Partial<MarketPricing> = {
      price: 2500,
      currency_code: "KES",
      price_unit: "per_litre",
      package_size: 20,
      package_unit: "litres",
    };
    mockMaybeSingle.mockResolvedValueOnce({ data: mockPricing, error: null });

    const res = await resolveProductPrice("KE", "paint-bucket");
    expect(res).toEqual({
      price: 2500,
      currency: "KES",
      priceUnit: "per_litre",
      packageSize: 20,
      packageUnit: "litres",
    });

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const nullRes = await resolveProductPrice("KE", "unknown");
    expect(nullRes).toBeNull();
  });

  it("clearPriceCache clears cached prices", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { price: 100 }, error: null });

    await fetchCurrentPrice("KE", "p1");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);

    clearPriceCache();

    await fetchCurrentPrice("KE", "p1");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });
});
