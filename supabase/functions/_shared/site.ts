/**
 * Edge-function mirror of src/lib/site-config.ts.
 *
 * Canonical public origin for edge functions that emit absolute URLs
 * (sitemap, API docs links, web-push contact). Resolves from the SITE_URL
 * secret with the same fallback the client bundle uses.
 */
export const DEFAULT_SITE_URL = "https://freluxtools.netlify.app";

export function normalizeOrigin(origin: string): string {
  return String(origin || "").trim().replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const deno = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  const fromEnv = deno?.env?.get?.("SITE_URL") ?? "";
  return normalizeOrigin(fromEnv || DEFAULT_SITE_URL);
}

export function getSiteHost(): string {
  return getSiteUrl().replace(/^https?:\/\//, "");
}
