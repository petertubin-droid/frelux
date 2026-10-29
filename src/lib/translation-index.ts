/**
 * Which locale URLs are currently indexable.
 *
 * A locale page may only be indexed when a reviewed translation has been
 * published for that exact content in that locale. Everything else stays a
 * noindex machine-translated view, which is what prevents 13 near-duplicate
 * copies of every English page in the index.
 *
 * Prerender writes the authoritative robots meta into each localized HTML
 * file. This registry is the client-side mirror: defense in depth for a stale
 * cache, a dev server, or a page rendered before its translation resolves.
 */
const indexable = new Set<string>();

/** Normalise "/es/learn/foo?x=1" -> "/es/learn/foo". */
function normalisePath(path: string): string {
  const withoutQuery = path.split("?")[0].split("#")[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

export function registerIndexableLocalePath(locale: string, path: string) {
  if (!locale || locale === "en") return;
  const clean = normalisePath(path);
  if (clean.startsWith(`/${locale}/`) || clean === `/${locale}`) {
    indexable.add(clean);
  }
}

export function isLocalePathIndexable(locale: string, path: string): boolean {
  if (!locale || locale === "en") return true;
  return indexable.has(normalisePath(path));
}

/** Test seam. */
export function __clearIndexableLocalePaths() {
  indexable.clear();
}

/** Locales whose prerendered pages may be indexed at all. Kept in sync with
 * scripts/prerender.mjs INDEXABLE_LOCALES; a locale leaves this list when its
 * translation coverage is live and reviewed. */
export const INDEXABLE_LOCALES = ["es"] as const;

export function isLocaleLaunched(locale: string): boolean {
  return (INDEXABLE_LOCALES as readonly string[]).includes(locale);
}
