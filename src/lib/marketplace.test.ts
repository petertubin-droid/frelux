import { describe, it, expect, vi } from "vitest";

/** Creates a chainable supabase mock that returns empty/null results by default. */
function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  // Self-extending: any method not defined returns `chain` for chaining
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
  },
  isSupabaseConfigured: false,
}));

const {
  fetchListings,
  fetchListing,
  fetchMyListings,
  createListing,
  updateListing,
  cancelListing,
  incrementListingView,
} = await import("./marketplace");

describe("marketplace (supabase not configured)", () => {
  it("fetchListings returns listings array", async () => {
    const result = await fetchListings({} as unknown as never);
    expect(result).toBeTruthy();
    expect(result.listings).toEqual([]);
  });

  it("fetchListing returns null when no data", async () => {
    const result = await fetchListing("test-id");
    expect(result).toBeNull();
  });

  it("fetchMyListings returns array", async () => {
    const result = await fetchMyListings("user1");
    expect(Array.isArray(result)).toBe(true);
  });

  it("createListing returns null (no data)", async () => {
    const result = await createListing({} as unknown as never);
    expect(result).toBeNull();
  });

  it("updateListing returns null (no data)", async () => {
    const result = await updateListing("id1", {});
    expect(result).toBeNull();
  });

  it("cancelListing resolves without error", async () => {
    await expect(cancelListing("id1", "reason")).resolves.not.toThrow();
  });

  it("incrementListingView resolves without error", async () => {
    await expect(incrementListingView("id1")).resolves.toBeUndefined();
  });
});
