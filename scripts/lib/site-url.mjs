/**
 * Node-side mirror of src/lib/site-config.ts.
 *
 * Build scripts (sitemap, prerender, IndexNow) need the public origin
 * before Vite exists, so it resolves from the environment with the same
 * fallback the client bundle uses. Update both together via
 * `npm run set-domain <domain>` — never edit one by hand.
 */
export const DEFAULT_SITE_URL = 'https://freluxtools.com';

export function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

export const SITE_URL = normalizeOrigin(
  process.env.SITE_URL || process.env.VITE_SITE_URL || DEFAULT_SITE_URL,
);

/** Host only, e.g. "frelux.com" (IndexNow host field). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
