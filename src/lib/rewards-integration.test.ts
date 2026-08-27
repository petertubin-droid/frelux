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

const {
  trackCalculationWithRewards,
  trackProjectSaveWithRewards,
  trackBuildToRoofRewards,
  trackAiPhotoEstimatorRewards,
  trackReferralRewards,
  trackReturnVisitRewards,
} = await import("./rewards-integration");

describe("rewards-integration (supabase not configured)", () => {
  it("trackCalculationWithRewards does not throw", async () => {
    await expect(
      trackCalculationWithRewards({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("trackProjectSaveWithRewards does not throw", async () => {
    await expect(trackProjectSaveWithRewards()).resolves.not.toThrow();
  });
  it("trackBuildToRoofRewards does not throw", async () => {
    await expect(trackBuildToRoofRewards()).resolves.not.toThrow();
  });
  it("trackAiPhotoEstimatorRewards does not throw", async () => {
    await expect(trackAiPhotoEstimatorRewards()).resolves.not.toThrow();
  });
  it("trackReferralRewards does not throw", async () => {
    await expect(
      trackReferralRewards({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("trackReturnVisitRewards does not throw", async () => {
    await expect(trackReturnVisitRewards()).resolves.not.toThrow();
  });
});
