/**
 * Single source of truth for FRELUX's public origin.
 *
 * Every canonical URL, structured-data @id, sitemap entry and share link
 * derives from here, so moving the site to a custom domain is a one-line
 * change (or `npm run set-domain <domain>`), never a repo-wide hunt for
 * hardcoded hosts.
 *
 * Resolution order:
 *   1. VITE_SITE_URL        (Netlify env var / .env.local)
 *   2. DEFAULT_SITE_URL     (below — the current canonical origin)
 */

/** Canonical public origin. Updated by `npm run set-domain`. */
export const DEFAULT_SITE_URL = "https://freluxtools.com";

/** Trailing slashes are stripped so callers can append paths safely. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Absolute site origin, e.g. "https://frelux.com". */
export const SITE_URL = normalizeOrigin(
  import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL,
);

/** Host only, e.g. "frelux.com" — for IndexNow host fields and mailto links. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Builds an absolute URL for a site path.
 * `siteUrl()` -> "https://frelux.com", `siteUrl("/pricing")` -> ".../pricing".
 */
export function siteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
