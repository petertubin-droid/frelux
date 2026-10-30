// Where the engine's rates come from, how long they are reused, and what
// happens when the rate service cannot be reached.
//
// Order: a cached table inside its refresh interval, then a fresh read of the
// recorded rates, then the last good table even if it is older, and only after
// that the bundled snapshot. Every step is visible through `source`, so a
// converted figure can always say where its rate came from.

import type { RateQuote, RateTable } from "./engine";

export const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
export const MIN_REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * Recorded rates captured from open.er-api.com, kept so a calculator still
 * converts when the network is down. Conversions built on this table are
 * reported as `fallback`, never as live rates.
 */
export const BUNDLED_RATE_SNAPSHOT: RateTable = {
  source: "bundled",
  fetchedAt: "2026-10-30T17:20:14Z",
  quotes: [
    {
      base: "USD",
      quote: "AED",
      rate: 3.6725,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "AUD",
      rate: 1.422859,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "CAD",
      rate: 1.398868,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "CNY",
      rate: 6.676858,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "EUR",
      rate: 0.895934,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "GBP",
      rate: 0.749154,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "GHS",
      rate: 11.686603,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-15T05:10:00Z",
    },
    {
      base: "USD",
      quote: "INR",
      rate: 95.252751,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-15T05:10:00Z",
    },
    {
      base: "USD",
      quote: "JPY",
      rate: 158.305497,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-15T05:10:00Z",
    },
    {
      base: "USD",
      quote: "KES",
      rate: 129.725167,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-15T05:10:00Z",
    },
    {
      base: "USD",
      quote: "MXN",
      rate: 18.833591,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "NGN",
      rate: 1346.223823,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "USD",
      quote: "ZAR",
      rate: 16.579734,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-15T05:10:00Z",
    },
  ],
};

export interface RateRowLike {
  base_currency: string;
  quote_currency: string;
  rate: number;
  provider: string;
  fetched_at: string;
  is_active?: boolean;
}

/** Turns recorded fx_rates rows into a table, newest row per pair. */
export function buildRateTable(
  rows: readonly RateRowLike[],
  source: RateTable["source"] = "database",
): RateTable {
  const newest = new Map<string, RateQuote>();
  let fetchedAt = "";
  rows.forEach((row) => {
    if (row.is_active === false) return;
    if (!Number.isFinite(row.rate) || row.rate <= 0) return;
    const base = (row.base_currency || "").toUpperCase();
    const quote = (row.quote_currency || "").toUpperCase();
    if (!base || !quote) return;
    const key = `${base}/${quote}`;
    const previous = newest.get(key);
    if (
      previous &&
      new Date(previous.fetchedAt).getTime() >=
        new Date(row.fetched_at).getTime()
    )
      return;
    newest.set(key, {
      base,
      quote,
      rate: row.rate,
      provider: row.provider,
      fetchedAt: row.fetched_at,
    });
    if (new Date(row.fetched_at).getTime() > new Date(fetchedAt || 0).getTime())
      fetchedAt = row.fetched_at;
  });
  return {
    source,
    fetchedAt: fetchedAt || new Date(0).toISOString(),
    quotes: [...newest.values()],
  };
}

export interface RateLoadResult {
  table: RateTable;
  fromCache: boolean;
  /** Set when the live read failed, so the UI can say rates were not refreshed. */
  error: string | null;
}

export interface RateCache {
  get(force?: boolean): Promise<RateLoadResult>;
  peek(): RateTable | null;
  invalidate(): void;
  setRefreshInterval(ms: number): void;
  refreshInterval(): number;
  ttl(): number;
}

export interface RateCacheOptions {
  ttlMs?: number;
  refreshIntervalMs?: number;
  now?: () => number;
  fallback?: RateTable;
}

export function createRateCache(
  loader: () => Promise<RateTable>,
  options: RateCacheOptions = {},
): RateCache {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const fallback = options.fallback ?? BUNDLED_RATE_SNAPSHOT;
  let refreshIntervalMs = Math.max(
    MIN_REFRESH_INTERVAL_MS,
    options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS,
  );
  let cached: RateTable | null = null;
  let loadedAt = 0;

  return {
    async get(force = false): Promise<RateLoadResult> {
      if (!force && cached && now() - loadedAt < ttlMs) {
        return { table: cached, fromCache: true, error: null };
      }
      try {
        const table = await loader();
        if (!table.quotes.length)
          throw new Error("The rate source returned no rates");
        cached = table;
        loadedAt = now();
        return { table, fromCache: false, error: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Rates could not be loaded";
        if (cached) return { table: cached, fromCache: true, error: message };
        return { table: fallback, fromCache: false, error: message };
      }
    },
    peek: () => cached,
    invalidate: () => {
      cached = null;
      loadedAt = 0;
    },
    setRefreshInterval: (ms: number) => {
      refreshIntervalMs = Math.max(MIN_REFRESH_INTERVAL_MS, ms);
    },
    refreshInterval: () => refreshIntervalMs,
    ttl: () => ttlMs,
  };
}

/** Reads the rates the platform has already recorded, through the app client. */
export async function loadRecordedRates(): Promise<RateTable> {
  const { fetchFxRateRows } = await import("@/lib/fx/fx-converter");
  const rows = await fetchFxRateRows();
  return buildRateTable(rows as unknown as RateRowLike[]);
}

let defaultCache: RateCache | null = null;

/** The app-wide cache. Created on first use so tests stay offline. */
export function rateCache(): RateCache {
  defaultCache ??= createRateCache(loadRecordedRates);
  return defaultCache;
}
