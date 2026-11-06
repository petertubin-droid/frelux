/**
 * Locale URL prefixes that must never enter the index or the sitemap.
 *
 * Every locale-prefixed URL serves the same English page (prerender emits one
 * content-bearing page per route), so a locale URL is a duplicate of its
 * English counterpart. public/_headers keeps them out of the index with
 * X-Robots-Tag, and the sitemap must not advertise them: a submitted URL that
 * answers noindex is reported in Search Console as "Excluded by noindex".
 *
 * Keep this list in step with LANGUAGES in src/lib/i18n.tsx (every language
 * except "en"). src/lib/locale-url-policy.test.ts fails when they drift.
 */
export const LOCALE_PREFIXES = [
  "es",
  "fr",
  "de",
  "pt",
  "ru",
  "id",
  "sw",
  "ar",
  "hi",
  "zh",
  "ja",
  "nl",
];

/** True when the path's first segment is a locale prefix. */
export function isLocalePrefixed(path) {
  const first = String(path).replace(/^\/+/, "").split("/")[0];
  return LOCALE_PREFIXES.includes(first);
}
