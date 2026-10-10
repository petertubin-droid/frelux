import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchWithOfflineCache,
  readCache,
  clearCache,
  saveDraft,
  loadDraft,
  clearDraft,
  describeAge,
  isOnline,
} from "@/lib/offline-store";

describe("offline-store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns live data and caches the payload when the fetch succeeds", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1 }]);
    const result = await fetchWithOfflineCache("estimates", fetcher);
    expect(result.source).toBe("live");
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.cachedAt).toBeNull();
    const cached = readCache<unknown[]>("estimates");
    expect(cached?.data).toEqual([{ id: 1 }]);
    expect(typeof cached?.cachedAt).toBe("string");
  });

  it("falls back to the cached payload when the fetch fails", async () => {
    // Prime the cache.
    await fetchWithOfflineCache(
      "estimates",
      vi.fn().mockResolvedValue(["primed"]),
    );
    const failing = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const result = await fetchWithOfflineCache("estimates", failing);
    expect(result.source).toBe("cache");
    expect(result.data).toEqual(["primed"]);
    expect(result.cachedAt).toBeTruthy();
  });

  it("re-throws when the fetch fails and nothing is cached", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fetch failed"));
    await expect(
      fetchWithOfflineCache("nothing-cached", failing),
    ).rejects.toThrow("fetch failed");
  });

  it("treats corrupt cache entries as missing", () => {
    localStorage.setItem("frelux-offline:corrupt", "{not json");
    expect(readCache("corrupt")).toBeNull();
  });

  it("clears a cache entry", async () => {
    await fetchWithOfflineCache("estimates", vi.fn().mockResolvedValue(["x"]));
    clearCache("estimates");
    expect(readCache("estimates")).toBeNull();
  });

  it("saves and loads drafts with a timestamp", () => {
    saveDraft("paint-calc", { wallHeight: 3, coats: 2 });
    const draft = loadDraft<{ wallHeight: number; coats: number }>(
      "paint-calc",
    );
    expect(draft?.value).toEqual({ wallHeight: 3, coats: 2 });
    expect(typeof draft?.savedAt).toBe("string");
    clearDraft("paint-calc");
    expect(loadDraft("paint-calc")).toBeNull();
  });

  it("ignores corrupt drafts", () => {
    localStorage.setItem("frelux-offline:draft:bad", "nope");
    expect(loadDraft("bad")).toBeNull();
  });

  it("describes cache age in human terms", () => {
    const now = Date.now();
    expect(describeAge(new Date(now - 30_000).toISOString())).toBe("just now");
    expect(describeAge(new Date(now - 5 * 60_000).toISOString())).toBe(
      "5 minutes ago",
    );
    expect(describeAge(new Date(now - 2 * 3_600_000).toISOString())).toBe(
      "2 hours ago",
    );
    expect(describeAge(new Date(now - 3 * 86_400_000).toISOString())).toBe(
      "3 days ago",
    );
    expect(describeAge(null)).toBe("");
  });

  it("reports online status from navigator", () => {
    expect(typeof isOnline()).toBe("boolean");
  });
});
