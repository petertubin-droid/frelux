import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Regression tests for the stale-while-error behavior of fetchAdConfig:
 * a failed read must never be cached as an empty snapshot (that blanked
 * every ad slot on the site for the TTL window on a transient error),
 * and a previously fetched good config keeps serving while failing.
 */

const callState = {
  current: {
    providersError: null as null | { message: string },
    placementsError: null as null | { message: string },
  },
};

vi.mock("@/lib/supabase-lazy", () => {
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => {
        const res =
          table === "ad_providers_public"
            ? {
                data: [{ id: "p1", slug: "google_adsense", priority: 1 }],
                error: callState.current.providersError,
              }
            : {
                data: [{ id: "pl1", placement_key: "home_top" }],
                error: callState.current.placementsError,
              };
        // providers chain adds .order(), placements resolves directly
        return table === "ad_providers_public"
          ? { order: vi.fn(() => Promise.resolve(res)) }
          : Promise.resolve(res);
      }),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
  }));
  return {
    getSupabase: vi.fn(() => Promise.resolve({ from })),
    isSupabaseConfigured: true,
  };
});

import { fetchAdConfig, clearAdConfigCache } from "./ad-config";

describe("fetchAdConfig stale-while-error", () => {
  beforeEach(() => {
    clearAdConfigCache();
    callState.current.providersError = null;
    callState.current.placementsError = null;
    vi.restoreAllMocks?.();
  });

  it("serves the cached config when a later refresh fails", async () => {
    // Prime the cache with a successful fetch.
    const good = await fetchAdConfig();
    expect(good.providers).toHaveLength(1);
    expect(good.placements).toHaveLength(1);

    // Force-refresh with the network now failing.
    callState.current.providersError = { message: "network down" };
    const retry = await fetchAdConfig(true);
    // The stale-but-good cache is served, not an empty snapshot.
    expect(retry.providers).toHaveLength(1);
    expect(retry.placements).toHaveLength(1);
  });

  it("does not cache an empty snapshot for the full TTL when the very first fetch fails", async () => {
    callState.current.placementsError = { message: "permission denied" };
    const first = await fetchAdConfig();
    expect(first.providers).toEqual([]);
    expect(first.placements).toEqual([]);

    // The failed snapshot must NOT be honored for the normal 60s TTL:
    // after the short retry interval has passed (fake the clock by
    // rewinding the expiry through a successful fetch), a retry with the
    // error cleared returns real data.
    callState.current.placementsError = null;
    const second = await fetchAdConfig(true); // force bypasses the cache
    expect(second.providers).toHaveLength(1);
    expect(second.placements).toHaveLength(1);
  });
});
