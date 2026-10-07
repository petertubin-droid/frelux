/**
 * Worldwide live FX feed for the visitor display-currency layer.
 *
 * Source: open.er-api.com (free, keyless, no signup) - rates for
 * ~160 world currencies, expressed as "units of CODE per 1 NGN",
 * exactly the semantics of site_settings.display_currencies.
 *
 * Behaviour:
 *  - cached in localStorage for FX_TTL_MS (12h) so repeat page loads
 *    cost nothing,
 *  - fetch has a hard FX_TIMEOUT_MS timeout and never throws: on any
 *    failure the layer simply falls back to the owner-configured
 *    admin rates (no guessing),
 *  - admin-configured rates always override live rates per currency
 *    (see currency-context.tsx), so the owner stays in control.
 */

const FX_CACHE_KEY = "frelux_fx_live";
export const FX_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const FX_TIMEOUT_MS = 8000;

interface CachedRates {
  fetchedAt: number;
  rates: Record<string, number>;
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (
      typeof parsed.fetchedAt !== "number" ||
      typeof parsed.rates !== "object" ||
      parsed.rates === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Live worldwide rates (units per 1 NGN), or null when unavailable
 * (offline, API down, no fresh cache). Never throws.
 */
export async function fetchLiveFxRates(): Promise<Record<
  string,
  number
> | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < FX_TTL_MS) {
    return cached.rates;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FX_TIMEOUT_MS);
    const res = await fetch("https://open.er-api.com/v6/latest/NGN", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return cached?.rates ?? null;
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== "success" || typeof data.rates !== "object") {
      return cached?.rates ?? null;
    }
    const rates = data.rates;
    try {
      localStorage.setItem(
        FX_CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), rates } satisfies CachedRates),
      );
    } catch {
      // storage full/unavailable: rates still work for this session
    }
    return rates;
  } catch {
    // network blocked or timeout: stale cache is better than nothing
    return cached?.rates ?? null;
  }
}

/** Test hook: clear the live-rate cache. */
export function clearFxCache(): void {
  try {
    localStorage.removeItem(FX_CACHE_KEY);
  } catch {
    // ignore
  }
}
