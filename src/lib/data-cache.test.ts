import { describe, it, expect, vi } from "vitest";
import { cachedRead, invalidateCache, CACHE_TTL } from "@/lib/data-cache";

describe("cachedRead", () => {
  it("serves the second read from memory", async () => {
    const loader = vi.fn(async () => ({ data: 1, error: null }));
    await cachedRead("k", 1000, loader);
    await cachedRead("k", 1000, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("collapses concurrent callers onto one request", async () => {
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { data: "x", error: null };
    });
    const [a, b, c] = await Promise.all([
      cachedRead("k2", 1000, loader),
      cachedRead("k2", 1000, loader),
      cachedRead("k2", 1000, loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("expires after the ttl", async () => {
    const loader = vi.fn(async () => ({ data: Date.now(), error: null }));
    const first = await cachedRead("k3", 10, loader);
    await new Promise((r) => setTimeout(r, 25));
    const second = await cachedRead("k3", 10, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(first);
  });

  it("never caches a failed read", async () => {
    type Row = { data: string | null; error: { message: string } | null };
    const loader = vi
      .fn<() => Promise<Row>>()
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockResolvedValueOnce({ data: "ok", error: null });
    const failed = await cachedRead("k4", 1000, loader, {
      failed: (r) => Boolean(r.error),
    });
    expect(failed.error).toBeTruthy();
    const ok = await cachedRead("k4", 1000, loader, {
      failed: (r) => Boolean(r.error),
    });
    expect(ok.data).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("drops a key prefix on invalidation", async () => {
    const loader = vi.fn(async () => ({ data: 1, error: null }));
    await cachedRead("catalogue:tiles", 1000, loader);
    await cachedRead("settings:site", 1000, loader);
    invalidateCache("catalogue");
    await cachedRead("catalogue:tiles", 1000, loader);
    await cachedRead("settings:site", 1000, loader);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("keeps a sane default lifetime for price reads", () => {
    expect(CACHE_TTL.prices).toBeLessThanOrEqual(5 * 60 * 1000);
  });
});
