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
  fetchProviders,
  upsertProvider,
  toggleProvider,
  fetchSources,
  upsertSource,
  deleteSource,
  fetchProductAliases,
  upsertProductAlias,
  verifyProductAlias,
  deleteProductAlias,
  fetchObservations,
  insertObservation,
  updateObservationStatus,
  setObservationFreshness,
  fetchApprovedPrices,
  upsertApprovedPrice,
  deactivateApprovedPrice,
  fetchCrawlLogs,
  insertCrawlLog,
  fetchProviderUsage,
  fetchAnomalies,
  resolveAnomaly,
  insertAnomalyFlag,
  manuallyEnterPrice,
} = await import("./queries");

describe("queries (supabase not configured)", () => {
  it("fetchProviders does not throw", async () => {
    await expect(fetchProviders({} as any)).resolves.not.toThrow();
  });
  it("upsertProvider does not throw", async () => {
    await expect(upsertProvider({} as any)).resolves.not.toThrow();
  });
  it("toggleProvider does not throw", async () => {
    await expect(toggleProvider({} as any)).resolves.not.toThrow();
  });
  it("fetchSources does not throw", async () => {
    await expect(fetchSources({} as any)).resolves.not.toThrow();
  });
  it("upsertSource does not throw", async () => {
    await expect(upsertSource({} as any)).resolves.not.toThrow();
  });
  it("deleteSource does not throw", async () => {
    await expect(deleteSource({} as any)).resolves.not.toThrow();
  });
  it("fetchProductAliases does not throw", async () => {
    await expect(fetchProductAliases({} as any)).resolves.not.toThrow();
  });
  it("upsertProductAlias does not throw", async () => {
    await expect(upsertProductAlias({} as any)).resolves.not.toThrow();
  });
  it("verifyProductAlias does not throw", async () => {
    await expect(verifyProductAlias({} as any)).resolves.not.toThrow();
  });
  it("deleteProductAlias does not throw", async () => {
    await expect(deleteProductAlias({} as any)).resolves.not.toThrow();
  });
  it("fetchObservations does not throw", async () => {
    await expect(fetchObservations({} as any)).resolves.not.toThrow();
  });
  it("insertObservation does not throw", async () => {
    await expect(insertObservation({} as any)).resolves.not.toThrow();
  });
  it("updateObservationStatus does not throw", async () => {
    await expect(updateObservationStatus({} as any)).resolves.not.toThrow();
  });
  it("setObservationFreshness does not throw", async () => {
    await expect(setObservationFreshness({} as any)).resolves.not.toThrow();
  });
  it("fetchApprovedPrices does not throw", async () => {
    await expect(fetchApprovedPrices({} as any)).resolves.not.toThrow();
  });
  it("upsertApprovedPrice does not throw", async () => {
    await expect(upsertApprovedPrice({} as any)).resolves.not.toThrow();
  });
  it("deactivateApprovedPrice does not throw", async () => {
    await expect(deactivateApprovedPrice({} as any)).resolves.not.toThrow();
  });
  it("fetchCrawlLogs does not throw", async () => {
    await expect(fetchCrawlLogs({} as any)).resolves.not.toThrow();
  });
  it("insertCrawlLog does not throw", async () => {
    await expect(insertCrawlLog({} as any)).resolves.not.toThrow();
  });
  it("fetchProviderUsage does not throw", async () => {
    await expect(fetchProviderUsage({} as any)).resolves.not.toThrow();
  });
  it("fetchAnomalies does not throw", async () => {
    await expect(fetchAnomalies({} as any)).resolves.not.toThrow();
  });
  it("resolveAnomaly does not throw", async () => {
    await expect(resolveAnomaly({} as any)).resolves.not.toThrow();
  });
  it("insertAnomalyFlag does not throw", async () => {
    await expect(
      insertAnomalyFlag("obs1", "price_spike", {}),
    ).resolves.not.toThrow();
  });
  it("manuallyEnterPrice is callable", async () => {
    // This function chains multiple supabase calls that need real data;
    // just verify it doesn't crash on import and is callable.
    expect(typeof manuallyEnterPrice).toBe("function");
  });
});
