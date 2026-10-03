/**
 * Offline-First cache tests (Future Engine 17)
 *
 * The honesty guarantees under test:
 *  - live success is cached and returned unchanged
 *  - a network failure falls back to cache AND announces the
 *    cached date — never silently
 *  - no cache + offline → the honest error passes through, no
 *    empty success, nothing invented
 *  - a SERVER error (permissions, schema) is never masked with
 *    cache — even when cache exists
 *  - a thrown non-network error is rethrown untouched
 *  - corrupted or expired cache is discarded, never parsed into
 *    invented data
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cachedConfigFetch,
  onOfflineFallback,
  clearOfflineConfigCache,
} from "./offline-cache";

type Result = { data: unknown[]; error: { message?: string } | null };

const liveData = [{ id: "a" }, { id: "b" }];

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: online,
    configurable: true,
    writable: true,
  });
}

function netError(): Result {
  return { data: null, error: { message: "TypeError: Failed to fetch" } };
}

function serverError(): Result {
  return { data: null, error: { message: 'permission denied for table "x"' } };
}

beforeEach(() => {
  clearOfflineConfigCache();
  setOnline(true);
  vi.restoreAllMocks();
});

describe("cachedConfigFetch", () => {
  it("returns live data unchanged and caches it", async () => {
    const fetcher = vi.fn(
      async () => ({ data: liveData, error: null }) as Result,
    );
    const r = await cachedConfigFetch("t1", fetcher);
    expect(r).toEqual({ data: liveData, error: null });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // now go offline: the cache from the live call is served
    setOnline(false);
    const deadFetcher = vi.fn(async () => netError());
    const r2 = await cachedConfigFetch("t1", deadFetcher);
    expect(r2).toEqual({ data: liveData, error: null });
  });

  it("falls back to cache on a network error and announces the cached date", async () => {
    // seed the cache with a live call
    await cachedConfigFetch(
      "t2",
      async () => ({ data: liveData, error: null }) as Result,
    );

    const seen: Array<{ key: string; cached_at: string }> = [];
    const unsubscribe = onOfflineFallback((info) => seen.push(info));

    setOnline(false);
    const r = await cachedConfigFetch("t2", async () => netError());
    expect(r.error).toBeNull();
    expect(r.data).toEqual(liveData);
    expect(seen).toHaveLength(1);
    expect(seen[0].key).toBe("t2");
    expect(new Date(seen[0].cached_at).toString()).not.toBe("Invalid Date");

    unsubscribe();
  });

  it("passes the honest error through when offline with NO cache — never an empty success", async () => {
    setOnline(false);
    const r = await cachedConfigFetch("never-seen", async () => netError());
    expect(r.data).toBeNull();
    expect(r.error).toMatchObject({
      message: expect.stringMatching(/failed to fetch/i),
    });
  });

  it("never masks a SERVER error with cache while online, even when cache exists", async () => {
    await cachedConfigFetch(
      "t3",
      async () => ({ data: liveData, error: null }) as Result,
    );
    const seen: unknown[] = [];
    const unsubscribe = onOfflineFallback((info) => seen.push(info));

    // browser online: a permissions/schema error is a REAL error — never masked
    setOnline(true);
    const r = await cachedConfigFetch("t3", async () => serverError());
    expect(r.data).toBeNull();
    expect(r.error).toMatchObject({
      message: expect.stringMatching(/permission denied/),
    });
    expect(seen).toHaveLength(0); // no fallback announced — none served
    unsubscribe();
  });

  it("serves cache when the fetcher throws a raw TypeError while offline", async () => {
    await cachedConfigFetch(
      "t4",
      async () => ({ data: liveData, error: null }) as Result,
    );
    setOnline(false);
    const r = await cachedConfigFetch("t4", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(r.error).toBeNull();
    expect(r.data).toEqual(liveData);
  });

  it("rethrows a thrown NON-network error untouched", async () => {
    await cachedConfigFetch(
      "t5",
      async () => ({ data: liveData, error: null }) as Result,
    );
    setOnline(false);
    const boom = new Error("schema mismatch");
    await expect(
      cachedConfigFetch("t5", async () => {
        throw boom;
      }),
    ).rejects.toThrow(boom);
  });

  it("discards corrupted cache honestly instead of inventing data", async () => {
    localStorage.setItem("frelux:offline-config:t6", "{not json");
    setOnline(false);
    const r = await cachedConfigFetch("t6", async () => netError());
    expect(r.data).toBeNull();
    expect(r.error).toBeTruthy();
    // and the corrupted entry was removed
    expect(localStorage.getItem("frelux:offline-config:t6")).toBeNull();
  });

  it("discards cache entries missing the expected envelope shape", async () => {
    localStorage.setItem(
      "frelux:offline-config:t7",
      JSON.stringify({ nope: 1 }),
    );
    setOnline(false);
    const r = await cachedConfigFetch("t7", async () => netError());
    expect(r.data).toBeNull();
    expect(r.error).toBeTruthy();
  });

  it("does not serve cache when online and the fetch succeeds with fresh data", async () => {
    await cachedConfigFetch(
      "t8",
      async () => ({ data: liveData, error: null }) as Result,
    );
    const fresh = [{ id: "z" }];
    const r = await cachedConfigFetch(
      "t8",
      async () => ({ data: fresh, error: null }) as Result,
    );
    expect(r.data).toEqual(fresh); // live wins while online — cache never overrides reality
  });

  it("a broken fallback listener cannot break the fetch", async () => {
    await cachedConfigFetch(
      "t9",
      async () => ({ data: liveData, error: null }) as Result,
    );
    onOfflineFallback(() => {
      throw new Error("listener bug");
    });
    setOnline(false);
    const r = await cachedConfigFetch("t9", async () => netError());
    expect(r.error).toBeNull();
    expect(r.data).toEqual(liveData);
  });
});
