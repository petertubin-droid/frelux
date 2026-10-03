/**
 * Offline-First configuration cache (Future Engine 17)
 *
 * The service worker already precaches the app shell, and
 * calculation results cache in localStorage — but until now the
 * engine CONFIG data (factors, prices, rules from the database)
 * required connectivity, so every calculator died offline.
 *
 * This module closes that gap honestly:
 *
 *  - Live fetch succeeds → the result is cached with a timestamp
 *    and returned. Normal behaviour, zero change.
 *  - Live fetch fails with a NETWORK error (offline) → the cached
 *    copy is served, and every fallback is announced to
 *    subscribers (the OfflineIndicator banner) with its cached
 *    date, so a user on a plane KNOWS they are seeing stored
 *    configuration, not a live one.
 *  - No cache exists and offline → the original error passes
 *    through untouched. Nothing is invented, no empty success.
 *  - A SERVER error (permissions, schema) is NEVER masked with
 *    cache — that would hide a real problem. Cache fallback is
 *    for network failures only.
 *  - Corrupted cache entries are discarded with a console
 *    warning, never parsed into invented data.
 */

const CACHE_PREFIX = "frelux:offline-config:";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days: expired cache is discarded, not served

export interface ConfigFetchResult<T> {
  data: T;
  error: unknown;
}

type AnyConfigResult = { data: unknown; error: unknown };

interface CachedEnvelope<T> {
  cached_at: string;
  data: T;
}

type FallbackListener = (info: { key: string; cached_at: string }) => void;
const fallbackListeners = new Set<FallbackListener>();

/** Subscribe to cache fallbacks (used by the OfflineIndicator). */
export function onOfflineFallback(listener: FallbackListener): () => void {
  fallbackListeners.add(listener);
  return () => fallbackListeners.delete(listener);
}

function emitFallback(key: string, cachedAt: string): void {
  for (const listener of fallbackListeners) {
    try {
      listener({ key, cached_at: cachedAt });
    } catch {
      // a broken listener must never break a fetch
    }
  }
}

function isNetworkError(error: unknown): boolean {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const networkRe =
    /failed to fetch|networkerror|network request failed|fetch failed|offline|load failed|ERR_NAME/i;
  if (networkRe.test(msg)) return true;
  // The browser reports offline: treat failures as network failures —
  // UNLESS the thrown error carries a clearly non-network signature
  // (a named Error that is not a TypeError), which is rethrown/masked
  // honestly instead.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (error instanceof Error && error.name !== "TypeError") return false;
    return true;
  }
  return false;
}

function readCache<T>(key: string): CachedEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (
      !parsed ||
      typeof parsed.cached_at !== "string" ||
      !("data" in parsed)
    ) {
      console.warn(`[offline-cache] discarding malformed cache entry '${key}'`);
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    const age = Date.now() - new Date(parsed.cached_at).getTime();
    if (Number.isFinite(age) && age > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    console.warn(`[offline-cache] discarding unreadable cache entry '${key}'`);
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
      // storage unavailable (private mode) — behave as no cache
    }
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const envelope: CachedEnvelope<T> = {
      cached_at: new Date().toISOString(),
      data,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(envelope));
  } catch {
    // storage full or unavailable — cache is best-effort, never fatal
  }
}

/**
 * Runs a config fetch with honest offline fallback.
 * The fetcher's return shape ({ data, error }) is preserved
 * exactly — callers cannot tell the difference in type, only
 * through the fallback announcement.
 */
export async function cachedConfigFetch<R extends AnyConfigResult>(
  key: string,
  liveFetch: () => Promise<R>,
): Promise<R> {
  let live: R;
  try {
    live = await liveFetch();
  } catch (thrown) {
    // supabase-js can throw raw TypeErrors when offline
    if (!isNetworkError(thrown)) throw thrown;
    const cached = readCache<unknown>(key);
    if (cached) {
      emitFallback(key, cached.cached_at);
      return { data: cached.data, error: null } as R;
    }
    return { data: null, error: thrown } as unknown as R;
  }

  if (live.error && isNetworkError(live.error)) {
    const cached = readCache<unknown>(key);
    if (cached) {
      emitFallback(key, cached.cached_at);
      return { data: cached.data, error: null } as R;
    }
    return live; // honest failure: no cache, nothing invented
  }

  if (!live.error) {
    writeCache(key, live.data);
  }
  // a server-side error (permissions, schema) is passed through
  // untouched — cache must never mask a real problem
  return live;
}

/** Test-only: clear the config cache. */
export function clearOfflineConfigCache(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch {
    // storage unavailable — nothing to clear
  }
}
