import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchLiveFxRates,
  clearFxCache,
  FX_TTL_MS,
} from "@/lib/international/fx-live";

describe("fetchLiveFxRates", () => {
  beforeEach(() => {
    clearFxCache();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns live worldwide rates and caches them", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        result: "success",
        rates: { USD: 0.00065, EUR: 0.0006, JPY: 0.1 },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const rates = await fetchLiveFxRates();
    expect(rates).toEqual({ USD: 0.00065, EUR: 0.0006, JPY: 0.1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    // Second call is served from cache without a network fetch.
    const cached = await fetchLiveFxRates();
    expect(cached).toEqual(rates);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns null when the feed fails and no cache exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    expect(await fetchLiveFxRates()).toBeNull();
  });

  it("serves stale cache when the network fails", async () => {
    // Prime the cache with an expired entry.
    localStorage.setItem(
      "frelux_fx_live",
      JSON.stringify({
        fetchedAt: Date.now() - FX_TTL_MS - 1000,
        rates: { USD: 0.0006 },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    expect(await fetchLiveFxRates()).toEqual({ USD: 0.0006 });
  });

  it("never throws on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await fetchLiveFxRates()).toBeNull();
  });
});
