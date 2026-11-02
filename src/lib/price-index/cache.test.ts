import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidatePriceCache,
  priceCacheKey,
  priceCacheStats,
  withPriceCache,
} from "./cache";

const clock = () => {
  let t = 1_000_000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
};

beforeEach(() => {
  invalidatePriceCache();
});

describe("priceCacheKey", () => {
  it("ignores key order and material order but not values", () => {
    const a = priceCacheKey({ city: "lagos", ids: ["m2", "m1"], limit: 10 });
    const b = priceCacheKey({ limit: 10, ids: ["m1", "m2"], city: "lagos" });
    const c = priceCacheKey({ city: "abuja", ids: ["m1", "m2"], limit: 10 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("withPriceCache", () => {
  it("serves the second read from the cache without calling the loader", async () => {
    const loader = vi.fn().mockResolvedValue([1, 2, 3]);
    const first = await withPriceCache("k", loader);
    const second = await withPriceCache("k", loader);
    expect(first.source).toBe("network");
    expect(second.source).toBe("cache");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("expires an entry after its lifetime", async () => {
    const clockRef = clock();
    const loader = vi.fn().mockResolvedValue("v");
    await withPriceCache("k", loader, { ttlMs: 1000, now: clockRef.now });
    clockRef.advance(999);
    const fresh = await withPriceCache("k", loader, {
      ttlMs: 1000,
      now: clockRef.now,
    });
    expect(fresh.source).toBe("cache");
    clockRef.advance(2);
    const stale = await withPriceCache("k", loader, {
      ttlMs: 1000,
      now: clockRef.now,
    });
    expect(stale.source).toBe("network");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("reports how old a cached read is", async () => {
    const clockRef = clock();
    const loader = vi.fn().mockResolvedValue("v");
    await withPriceCache("k", loader, { now: clockRef.now });
    clockRef.advance(30_000);
    const cached = await withPriceCache("k", loader, { now: clockRef.now });
    expect(cached.ageMs).toBe(30_000);
  });

  it("drops everything on invalidation", async () => {
    const loader = vi.fn().mockResolvedValue("v");
    await withPriceCache("k", loader);
    expect(priceCacheStats().entries).toBe(1);
    expect(invalidatePriceCache()).toBe(1);
    const after = await withPriceCache("k", loader);
    expect(after.source).toBe("network");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("refuses to let a load that began before invalidation refill the entry", async () => {
    let release: (value: string) => void = () => {};
    const loader = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const pending = withPriceCache("k", loader);
    invalidatePriceCache();
    release("stale");
    await pending;
    expect(priceCacheStats().entries).toBe(0);
    const next = await withPriceCache("k", vi.fn().mockResolvedValue("fresh"));
    expect(next.source).toBe("network");
    expect(next.value).toBe("fresh");
  });

  it("collapses concurrent duplicate loads", async () => {
    const loader = vi.fn().mockResolvedValue("v");
    const [a, b] = await Promise.all([
      withPriceCache("k", loader),
      withPriceCache("k", loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a.value).toBe("v");
    expect(b.value).toBe("v");
  });

  it("keeps different markets apart", async () => {
    const loader = vi.fn(async (m: string) => m);
    const ng = await withPriceCache("NG", () => loader("NG"));
    const us = await withPriceCache("US", () => loader("US"));
    expect(ng.value).toBe("NG");
    expect(us.value).toBe("US");
  });
});
