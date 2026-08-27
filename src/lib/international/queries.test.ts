import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: any = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: any) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue(createChainable()),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
  isSupabaseConfigured: false,
}));

const {
  fetchMarketProfiles,
  fetchMarketProfile,
  upsertMarketProfile,
  deleteMarketProfile,
  fetchMaterialRulesDb,
  upsertMaterialRule,
  deleteMaterialRule,
  fetchMarketProductsDb,
  upsertMarketProduct,
  deleteMarketProduct,
  fetchMarketPricingDb,
  upsertMarketPricing,
  deleteMarketPricing,
  fetchCalculatorConfigsDb,
  upsertCalculatorConfig,
  toggleCalculatorAvailability,
  fetchUserMarketPreference,
  upsertUserMarketPreference,
} = await import("./queries");

describe("queries (supabase not configured)", () => {
  it("fetchMarketProfiles does not throw", async () => {
    await expect(fetchMarketProfiles()).resolves.not.toThrow();
  });
  it("fetchMarketProfile does not throw", async () => {
    await expect(fetchMarketProfile('NG')).resolves.not.toThrow();
  });
  it("upsertMarketProfile does not throw", async () => {
    await expect(upsertMarketProfile({ country_code: 'NG' } as any)).resolves.not.toThrow();
  });
  it("deleteMarketProfile does not throw", async () => {
    await expect(deleteMarketProfile('NG')).resolves.not.toThrow();
  });
  it("fetchMaterialRulesDb does not throw", async () => {
    await expect(fetchMaterialRulesDb('NG')).resolves.not.toThrow();
  });
  it("upsertMaterialRule does not throw", async () => {
    await expect(upsertMaterialRule({} as any)).resolves.not.toThrow();
  });
  it("deleteMaterialRule does not throw", async () => {
    await expect(deleteMaterialRule('id')).resolves.not.toThrow();
  });
  it("fetchMarketProductsDb does not throw", async () => {
    await expect(fetchMarketProductsDb('NG')).resolves.not.toThrow();
  });
  it("upsertMarketProduct does not throw", async () => {
    await expect(upsertMarketProduct({} as any)).resolves.not.toThrow();
  });
  it("deleteMarketProduct does not throw", async () => {
    await expect(deleteMarketProduct('id')).resolves.not.toThrow();
  });
  it("fetchMarketPricingDb does not throw", async () => {
    await expect(fetchMarketPricingDb('NG')).resolves.not.toThrow();
  });
  it("upsertMarketPricing does not throw", async () => {
    await expect(upsertMarketPricing({} as any)).resolves.not.toThrow();
  });
  it("deleteMarketPricing does not throw", async () => {
    await expect(deleteMarketPricing('id')).resolves.not.toThrow();
  });
  it("fetchCalculatorConfigsDb does not throw", async () => {
    await expect(fetchCalculatorConfigsDb('NG')).resolves.not.toThrow();
  });
  it("upsertCalculatorConfig does not throw", async () => {
    await expect(upsertCalculatorConfig({} as any)).resolves.not.toThrow();
  });
  it("toggleCalculatorAvailability does not throw", async () => {
    await expect(
      toggleCalculatorAvailability('NG', 'painting', true),
    ).resolves.not.toThrow();
  });
  it("fetchUserMarketPreference does not throw", async () => {
    await expect(fetchUserMarketPreference('user_1')).resolves.not.toThrow();
  });
  it("upsertUserMarketPreference does not throw", async () => {
    await expect(upsertUserMarketPreference('user_1', {} as any)).resolves.not.toThrow();
  });
});
