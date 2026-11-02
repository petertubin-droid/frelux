/**
 * Storage keys and timing configuration for the periodic ad-free subscription prompt.
 */
export const AD_FREE_PROMPT_STORAGE_KEY_DISMISSED =
  "frelux_ad_free_prompt_dismissed_at";
export const AD_FREE_PROMPT_STORAGE_KEY_LAST_SHOWN =
  "frelux_ad_free_prompt_last_shown_at";

/**
 * Default timing parameters (can be overridden via props for tests).
 */
export const DEFAULT_INITIAL_DELAY_MS = 20 * 1000; // 20 seconds after page mount
export const DEFAULT_PERIODIC_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes periodic cycle
export const DEFAULT_AUTO_DISMISS_MS = 25 * 1000; // 25 seconds visible per cycle
export const DEFAULT_DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours after explicit close

/** Routes where an ad-free prompt is redundant or distracting */
export const EXCLUDED_ROUTE_PREFIXES = [
  "/pricing",
  "/checkout",
  "/admin",
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
];

export function safeGetStorage(key: string): number | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const item = window.localStorage.getItem(key);
    return item ? Number(item) : null;
  } catch {
    return null;
  }
}

export function safeSetStorage(key: string, val: number): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, String(val));
  } catch {
    // Gracefully handle storage errors (e.g. private browsing quota)
  }
}

export function isRouteExcluded(pathname: string): boolean {
  return EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
