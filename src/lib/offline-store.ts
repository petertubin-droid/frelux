// =========================================================
// Offline read cache (workspace item 7)
//
// The service worker already precaches the app shell and serves
// a navigation fallback when offline, and the OfflineIndicator
// banner tells users they are offline. What was missing is the
// DATA: saved estimates, projects and case studies live in
// Supabase, so an offline visitor landed on empty pages.
//
// This module is a small read-through cache over localStorage:
// successful fetches write their payload to the cache; when a
// fetch fails (offline, 5xx, network error) the last cached
// payload is served instead. It also keeps drafts so calculator
// work started offline is not lost.
//
// Deliberately NOT a write queue: writes while offline still
// fail loudly. The cache only guarantees offline READS of data
// the user has viewed before, plus offline-safe drafts.
// =========================================================

const PREFIX = "frelux-offline:";

export type OfflineSource = "live" | "cache" | "none";

export interface OfflineResult<T> {
  data: T | null;
  source: OfflineSource;
  /** ISO timestamp of when the cached payload was fetched (null when live). */
  cachedAt: string | null;
}

interface CacheEnvelope<T> {
  cachedAt: string;
  data: T;
}

function safeParse<T>(raw: string | null): CacheEnvelope<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.cachedAt !== "string" || !("data" in parsed))
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** Read-through cache: run `fetcher`, cache the payload, fall back to the cache when it fails. */
export async function fetchWithOfflineCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<OfflineResult<T>> {
  try {
    const data = await fetcher();
    try {
      localStorage.setItem(
        `${PREFIX}${cacheKey}`,
        JSON.stringify({
          cachedAt: new Date().toISOString(),
          data,
        } satisfies CacheEnvelope<T>),
      );
    } catch {
      // Storage full or unavailable — caching is best-effort, never fail the fetch.
    }
    return { data, source: "live", cachedAt: null };
  } catch (err) {
    // Never log the payload; offline fallback is expected, not an error.
    const cached = readCache<T>(cacheKey);
    if (cached !== null) {
      return { data: cached.data, source: "cache", cachedAt: cached.cachedAt };
    }
    // Re-throw only when there is nothing to fall back to, so the
    // caller's error handling keeps working exactly as before.
    throw err;
  }
}

/** Read a previously cached payload (null when absent or corrupt). */
export function readCache<T>(cacheKey: string): CacheEnvelope<T> | null {
  try {
    return safeParse<T>(localStorage.getItem(`${PREFIX}${cacheKey}`));
  } catch {
    return null;
  }
}

/** Drop a cached payload (e.g. after the user deletes the underlying data). */
export function clearCache(cacheKey: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${cacheKey}`);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------
// Offline drafts: persist in-progress calculator work so a
// lost connection (or an accidental refresh while offline)
// never destroys what the user has typed.
// ---------------------------------------------------------

export function saveDraft(draftKey: string, value: unknown): void {
  try {
    localStorage.setItem(
      `${PREFIX}draft:${draftKey}`,
      JSON.stringify({ savedAt: new Date().toISOString(), value }),
    );
  } catch {
    // ignore
  }
}

export function loadDraft<T>(
  draftKey: string,
): { savedAt: string; value: T } | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}draft:${draftKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== "string" || !("value" in parsed))
      return null;
    return parsed as { savedAt: string; value: T };
  } catch {
    return null;
  }
}

export function clearDraft(draftKey: string): void {
  try {
    localStorage.removeItem(`${PREFIX}draft:${draftKey}`);
  } catch {
    // ignore
  }
}

/** "Saved 5 minutes ago" style label for cache/draft timestamps. */
export function describeAge(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "";
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
