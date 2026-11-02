import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: Record<string, unknown>, prop: string) {
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

const mod = await import("./queries");

describe("queries (supabase not configured)", () => {
  it("fetchColorCategories resolves", async () => {
    await expect(mod.fetchColorCategories()).resolves.toBeTruthy();
  });

  it("fetchColorCombinations resolves", async () => {
    await expect(mod.fetchColorCombinations()).resolves.toBeTruthy();
  });

  it("fetchColorBySlug resolves", async () => {
    await expect(mod.fetchColorBySlug("blue")).resolves.toBeTruthy();
  });

  it("fetchRelatedColors resolves", async () => {
    await expect(
      mod.fetchRelatedColors(["cat1"], "exclude1"),
    ).resolves.toBeTruthy();
  });

  it("fetchLegalPage resolves", async () => {
    await expect(mod.fetchLegalPage("terms")).resolves.toBeTruthy();
  });

  it("fetchSiteSettings resolves", async () => {
    await expect(mod.fetchSiteSettings()).resolves.toBeTruthy();
  });

  it("fetchPaintTypes resolves", async () => {
    await expect(mod.fetchPaintTypes()).resolves.toBeTruthy();
  });

  it("fetchPaintProducts resolves", async () => {
    await expect(mod.fetchPaintProducts()).resolves.toBeTruthy();
  });

  it("fetchMaterialPrices resolves", async () => {
    await expect(mod.fetchMaterialPrices()).resolves.toBeTruthy();
  });

  it("fetchLaborRates resolves", async () => {
    await expect(mod.fetchLaborRates()).resolves.toBeTruthy();
  });

  it("fetchScreedingMaterials resolves", async () => {
    await expect(mod.fetchScreedingMaterials()).resolves.toBeTruthy();
  });

  it("fetchFinishTypes resolves", async () => {
    await expect(mod.fetchFinishTypes()).resolves.toBeTruthy();
  });

  it("fetchAllFinishTypes resolves", async () => {
    await expect(mod.fetchAllFinishTypes()).resolves.toBeTruthy();
  });

  it("fetchPopMaterials resolves", async () => {
    await expect(mod.fetchPopMaterials()).resolves.toBeTruthy();
  });

  it("fetchPopWorkflows resolves", async () => {
    await expect(mod.fetchPopWorkflows()).resolves.toBeTruthy();
  });

  it("fetchTileSizes resolves", async () => {
    await expect(mod.fetchTileSizes()).resolves.toBeTruthy();
  });

  it("fetchTileMaterials resolves", async () => {
    await expect(mod.fetchTileMaterials()).resolves.toBeTruthy();
  });

  it("fetchArticleVersions resolves", async () => {
    await expect(mod.fetchArticleVersions("art1")).resolves.toBeTruthy();
  });

  it("saveArticleVersion resolves", async () => {
    await expect(
      mod.saveArticleVersion("art1", 1, "title", "content", null, null),
    ).resolves.toBeTruthy();
  });

  it("logAnalyticsEvent resolves (void)", async () => {
    await expect(mod.logAnalyticsEvent("test_event")).resolves.toBeUndefined();
  });

  it("trackColorView resolves (void)", async () => {
    await expect(mod.trackColorView("color1")).resolves.toBeUndefined();
  });

  it("fetchRewardedUnlockStats resolves", async () => {
    await expect(mod.fetchRewardedUnlockStats(30)).resolves.toBeTruthy();
  });

  it("fetchRewardedAdEventStats resolves", async () => {
    await expect(mod.fetchRewardedAdEventStats(30)).resolves.toBeTruthy();
  });
});
