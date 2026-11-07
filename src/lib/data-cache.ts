/**
 * Shared read cache for rarely-changing reference data.
 *
 * Every database read costs a full round trip to the Supabase region, so a
 * page that repeats the same reference query on each mount feels slow even
 * though the query itself runs in well under a millisecond. This cache keeps
 * those reads local for a short window and collapses concurrent callers onto
 * one in-flight request, so parallel components share a single trip.
 *
 * Rules:
 *  - Short TTLs only (seconds to minutes): these are cheap reads, not stale
 *    data. Admin writes call invalidateCache() so edits are visible at once.
 *  - A failed read is never cached, so a transient error cannot pin an empty
 *    result for the whole window.
 *  - Callers keep receiving the loader's own return shape, errors included.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Default lifetimes, in milliseconds. */
export const CACHE_TTL = {
  /**
   * Site settings and branding: edited by hand, read several times per page.
   * Kept deliberately short (one minute) so an admin edit still reaches
   * visitors quickly even if nothing explicitly invalidates the entry.
   */
  settings: 60 * 1000,
  /** Calculator catalogue rows (paint types, tile sizes, finish types). */
  catalogue: 5 * 60 * 1000,
  /** Market price lookups: short, so admin price edits land quickly. */
  prices: 60 * 1000,
} as const;

export async function cachedRead<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options: { failed?: (value: T) => boolean } = {},
): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    try {
      const value = await loader();
      const failed = options.failed ? options.failed(value) : false;
      if (!failed) entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, run);
  return run;
}

/** Drop one key, a key prefix, or the whole cache. */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    entries.clear();
    inFlight.clear();
    return;
  }
  for (const key of Array.from(entries.keys())) {
    if (key === prefix || key.startsWith(`${prefix}:`)) entries.delete(key);
  }
}

/** Test helper: reset between cases. */
export function __resetDataCache(): void {
  invalidateCache();
}
