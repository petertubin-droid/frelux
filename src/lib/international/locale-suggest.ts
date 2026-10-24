/**
 * Location-aware language suggestion (worldwide-first).
 *
 * Detects the visitor's likely language from two local, privacy-safe
 * signals — NO external geo-IP service, no data leaves the browser:
 *
 *  1. Timezone (Intl) — the location signal. A visitor in Paris
 *     resolves to Europe/Paris → French; São Paulo → Portuguese.
 *  2. Browser languages (navigator.languages) — the fallback when
 *     the timezone doesn't map to a supported language.
 *
 * The suggestion is only ever OFFERED with explicit consent via the
 * LocalePrompt banner (never applied silently). English is never
 * suggested — it is the site default, so there is nothing to switch.
 */

import { LANGUAGES, type Language } from "@/lib/i18n";

const REGISTERED = new Set<string>(LANGUAGES.map((l) => l.value));

/** Primary country/region timezones per supported language. Kept to
 * unambiguous home markets; English-speaking regions are absent
 * because English never needs a suggestion. */
export const LOCALE_TIMEZONES: Record<Exclude<Language, "en">, string[]> = {
  // fr: home market + francophone West/Central Africa and the DRC —
  // core ECOWAS/CEMAC construction markets for FRELUX. Added 2026-10-23:
  // the previous Europe-only map left Abidjan, Dakar, Kinshasa etc.
  // with no suggestion at all despite French being their sole official
  // language (i18n crawl finding: the product's own expansion region
  // was undetectable).
  fr: [
    "Europe/Paris",
    "Africa/Abidjan",
    "Africa/Dakar",
    "Africa/Bamako",
    "Africa/Ouagadougou",
    "Africa/Niamey",
    "Africa/Lome",
    "Africa/Porto-Novo",
    "Africa/Conakry",
    "Africa/Douala",
    "Africa/Libreville",
    "Africa/Brazzaville",
    "Africa/Kinshasa",
    "Africa/Bangui",
  ],
  es: ["Europe/Madrid", "Atlantic/Canary", "America/Mexico_City"],
  de: ["Europe/Berlin", "Europe/Vienna", "Europe/Zurich", "Europe/Busingen"],
  pt: [
    "Europe/Lisbon",
    "Atlantic/Azores",
    "Atlantic/Madeira",
    // Lusophone Africa (added 2026-10-23): Angola and Mozambique are
    // major construction markets where Portuguese is the official
    // language and previously produced no suggestion.
    "Africa/Luanda",
    "Africa/Maputo",
    "America/Sao_Paulo",
    "America/Bahia",
    "America/Fortaleza",
    "America/Recife",
    "America/Manaus",
    "America/Cuiaba",
    "America/Belem",
    "America/Rio_Branco",
  ],
  ru: [
    "Europe/Moscow",
    "Europe/Kaliningrad",
    "Europe/Volgograd",
    "Europe/Samara",
    "Asia/Yekaterinburg",
    "Asia/Omsk",
    "Asia/Novosibirsk",
    "Asia/Krasnoyarsk",
    "Asia/Irkutsk",
    "Asia/Yakutsk",
    "Asia/Vladivostok",
    "Asia/Magadan",
    "Asia/Kamchatka",
  ],
  id: ["Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"],
  sw: ["Africa/Nairobi", "Africa/Dar_es_Salaam", "Africa/Kampala"],
  ar: [
    "Africa/Cairo",
    // Maghreb (added 2026-10-23): Arabic-majority home markets that
    // previously produced no suggestion.
    "Africa/Algiers",
    "Africa/Casablanca",
    "Africa/Tunis",
    "Asia/Riyadh",
    "Asia/Dubai",
    "Asia/Qatar",
    "Asia/Kuwait",
    "Asia/Baghdad",
  ],
  hi: ["Asia/Kolkata", "Asia/Calcutta"],
  zh: ["Asia/Shanghai", "Asia/Urumqi", "Asia/Hong_Kong", "Asia/Macau"],
  ja: ["Asia/Tokyo"],
  nl: ["Europe/Amsterdam"],
};

const TIMEZONE_INDEX: Map<string, Language> = (() => {
  const map = new Map<string, Language>();
  for (const [lang, zones] of Object.entries(LOCALE_TIMEZONES)) {
    for (const zone of zones) map.set(zone, lang as Language);
  }
  return map;
})();

/** Europe/Paris → "fr"; America/Sao_Paulo → "pt"; null when unknown/English. */
export function languageForTimezone(
  timezone: string | null | undefined,
): Language | null {
  if (!timezone) return null;
  return TIMEZONE_INDEX.get(timezone) ?? null;
}

/** ["fr-FR", "en-US"] → "fr" (first browser language with a match;
 * "en" is skipped because it needs no suggestion). */
export function languageForBrowserLocales(
  locales: readonly string[] | null | undefined,
): Language | null {
  for (const raw of locales ?? []) {
    const base = String(raw).toLowerCase().split(/[-_]/)[0];
    if (base && base !== "en" && REGISTERED.has(base)) return base as Language;
  }
  return null;
}

export interface LocaleSignals {
  timezone?: string | null;
  browserLanguages?: readonly string[];
}

/** Location wins (the Paris requirement); browser language is the fallback. */
export function detectSuggestedLanguage(
  signals: LocaleSignals = {},
): Language | null {
  const fromTz = languageForTimezone(
    signals.timezone ??
      (typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null),
  );
  if (fromTz) return fromTz;

  const fromBrowser = languageForBrowserLocales(
    signals.browserLanguages ??
      (typeof navigator !== "undefined" ? navigator.languages : []),
  );
  return fromBrowser;
}
