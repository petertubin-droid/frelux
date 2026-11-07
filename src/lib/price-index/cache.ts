import { invalidateCache } from "@/lib/data-cache";

/**
 * Price read cache.
 *
 * Calculator pages ask the same question repeatedly: what do prices look like
 * for these materials in this city. Each answer costs two round trips to
 * Supabase (price rows, then material names). The cache exists to collapse
 * those repeats within a browsing session.
 *
 * Rules it keeps, because a stale or borrowed price is worse than no price:
 *   - The key includes the market, city, materials, window and limit. Two
 *     different questions never share an entry.
 *   - Five minute lifetime on price rows. A price book that changes under a
 *     user is not something to hide.
 *   - Any write to `estimation_prices` calls `invalidatePriceCache`, so an
 *     admin edit is visible on the next read rather than on the next expiry.
 *   - A load that started before an invalidation cannot repopulate the entry,
 *     so a slow read cannot resurrect prices that were just changed.
 *   - The read result says whether it came from the cache and how old it is,
 *     so a surface that cares can say so. Nothing is silently reused.
 */

export const PRICE_CACHE_TTL_MS = 5 * 60_000;

type Entry = { value: unknown; fetchedAt: number; expiresAt: number };

const store = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
let generation = 0;

export type CacheRead<T> = {
  value: T;
  source: "cache" | "network";
  /** Milliseconds since the underlying read, 0 when just fetched. */
  ageMs: number;
  fetchedAt: number;
};

/** Stable key, so argument order cannot silently split or merge entries. */
export function priceCacheKey(parts: Record<string, unknown>): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value
        .map(normalize)
        .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map((key) => [
            key,
            normalize((value as Record<string, unknown>)[key]),
          ]),
      );
    }
    return value;
  };
  return JSON.stringify(normalize(parts));
}

export async function withPriceCache<T>(
  key: string,
  loader: () => Promise<T>,
  options?: { ttlMs?: number; now?: () => number },
): Promise<CacheRead<T>> {
  const now = options?.now ?? (() => Date.now());
  const ttlMs = options?.ttlMs ?? PRICE_CACHE_TTL_MS;
  const startedAt = now();
  const startedGeneration = generation;

  const hit = store.get(key);
  if (hit && hit.expiresAt > startedAt) {
    return {
      value: hit.value as T,
      source: "cache",
      ageMs: Math.max(0, startedAt - hit.fetchedAt),
      fetchedAt: hit.fetchedAt,
    };
  }
  if (hit) store.delete(key);

  const pending = inFlight.get(key);
  const load: Promise<T> = pending
    ? (pending as Promise<T>)
    : loader().finally(() => inFlight.delete(key));
  if (!pending) inFlight.set(key, load);

  const value = await load;
  if (generation === startedGeneration) {
    store.set(key, {
      value,
      fetchedAt: startedAt,
      expiresAt: startedAt + ttlMs,
    });
  }
  return { value, source: "network", ageMs: 0, fetchedAt: startedAt };
}

/** Drop everything. Called after any price write, and on sign out. */
export function invalidatePriceCache(): number {
  const dropped = store.size;
  store.clear();
  inFlight.clear();
  generation += 1;
  // The shared read cache also holds derived price answers (role lookups, city
  // refinements, the composed market price book). A price write must clear
  // those too or an admin edit would linger for the rest of its lifetime.
  invalidateCache("price-book");
  invalidateCache("role-price");
  invalidateCache("city-price");
  return dropped;
}

/** Diagnostics for tests and the admin price screen. */
export function priceCacheStats(now: number = Date.now()): {
  entries: number;
  live: number;
  oldestAgeMs: number | null;
} {
  let live = 0;
  let oldest: number | null = null;
  for (const entry of store.values()) {
    if (entry.expiresAt > now) {
      live += 1;
      const age = now - entry.fetchedAt;
      if (oldest === null || age > oldest) oldest = age;
    }
  }
  return { entries: store.size, live, oldestAgeMs: oldest };
}
