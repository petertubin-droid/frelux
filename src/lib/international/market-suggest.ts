/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Market Suggestion
 *
 * Detects the visitor's likely market (country) from two local,
 * privacy-safe signals - NO external geo-IP service, no data
 * leaves the browser (same rules as locale-suggest.ts):
 *
 *  1. Timezone (Intl) - the location signal. A visitor in New
 *     York resolves to America/New_York -> US market.
 *  2. Browser languages (navigator.languages) - the fallback
 *     when the timezone doesn't map to a supported market
 *     (e.g. "de-CH" -> no Swiss market yet, but "de-DE" -> DE).
 *
 * Nigeria stays the default when nothing maps: it is the reference
 * market and the only one with the full price book.
 *
 * The result is used by MarketProvider on the FIRST visit only
 * (no saved market). An explicit choice always wins from then on -
 * detection never overrides anything the user picked.
 */

const MARKET_TIMEZONES: Record<string, string[]> = {
  NG: ["Africa/Lagos"],
  GH: ["Africa/Accra"],
  KE: ["Africa/Nairobi"],
  ZA: ["Africa/Johannesburg"],
  JP: ["Asia/Tokyo"],
  FR: ["Europe/Paris"],
  BR: [
    "America/Sao_Paulo",
    "America/Bahia",
    "America/Fortaleza",
    "America/Recife",
    "America/Belem",
    "America/Boa_Vista",
    "America/Campo_Grande",
    "America/Cuiaba",
    "America/Eirunepe",
    "America/Manaus",
    "America/Rio_Branco",
    "America/Santarem",
  ],
  SA: ["Asia/Riyadh"],
  AE: ["Asia/Dubai"],
  US: [
    "America/New_York",
    "America/Detroit",
    "America/Kentucky/Louisville",
    "America/Kentucky/Monticello",
    "America/Indiana/Indianapolis",
    "America/Indiana/Vincennes",
    "America/Indiana/Winamac",
    "America/Indiana/Marengo",
    "America/Indiana/Petersburg",
    "America/Indiana/Tell_City",
    "America/Chicago",
    "America/Menominee",
    "America/North_Dakota/Center",
    "America/North_Dakota/New_Salem",
    "America/North_Dakota/Beulah",
    "America/Denver",
    "America/Boise",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Juneau",
    "America/Sitka",
    "America/Metlakatla",
    "America/Yakutat",
    "America/Nome",
    "America/Adak",
    "Pacific/Honolulu",
  ],
  CA: [
    "America/Toronto",
    "America/Montreal",
    "America/Winnipeg",
    "America/Regina",
    "America/Saskatoon",
    "America/Swift_Current",
    "America/Edmonton",
    "America/Cambridge_Bay",
    "America/Yellowknife",
    "America/Inuvik",
    "America/Whitehorse",
    "America/Dawson",
    "America/Vancouver",
    "America/Halifax",
    "America/Glace_Bay",
    "America/Goose_Bay",
    "America/St_Johns",
    "America/Iqaluit",
    "America/Pangnirtung",
    "America/Thunder_Bay",
    "America/Nipigon",
    "America/Rainy_River",
    "America/Atikokan",
  ],
  GB: ["Europe/London", "Europe/Belfast"],
  AU: [
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Australia/Adelaide",
    "Australia/Darwin",
    "Australia/Hobart",
    "Australia/Lord_Howe",
    "Australia/Broken_Hill",
    "Australia/Eucla",
  ],
  DE: ["Europe/Berlin", "Europe/Busingen"],
  IN: ["Asia/Kolkata", "Asia/Calcutta"],
};

/** All market codes detection can return. */
export const DETECTABLE_MARKETS: string[] = Object.keys(MARKET_TIMEZONES);

/** True when the code is a market detection can produce. */
export function isDetectableMarket(code: string): boolean {
  return MARKET_TIMEZONES[code] !== undefined;
}

/** Resolve the market for a timezone, or null when it does not map. */
export function timezoneToMarket(timezone: string | null): string | null {
  if (!timezone) return null;
  const tz = timezone;
  for (const [code, zones] of Object.entries(MARKET_TIMEZONES)) {
    if (zones.includes(tz)) return code;
  }
  return null;
}

/** Resolve the market for the visitor's timezone, or null. */
export function detectMarketFromTimezone(): string | null {
  let tz: string | null = null;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
  return timezoneToMarket(tz);
}

/** Normalize "en-US" -> "US"; returns null for a bare language tag. */
function regionFromLanguageTag(tag: string): string | null {
  const parts = tag.split("-");
  const region = parts.length >= 2 ? parts[parts.length - 1] : null;
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : null;
}

/** Resolve the market from explicit language tags, or null. */
export function localesToMarket(
  tags: readonly (string | null)[],
): string | null {
  for (const tag of tags) {
    if (!tag) continue;
    const region = regionFromLanguageTag(tag);
    if (region && isDetectableMarket(region)) return region;
  }
  return null;
}

/** Resolve the market from the browser's language regions, or null. */
export function detectMarketFromLocale(): string | null {
  let langs: readonly string[] = [];
  try {
    langs =
      typeof navigator !== "undefined" && navigator.languages?.length
        ? navigator.languages
        : typeof navigator !== "undefined" && navigator.language
          ? [navigator.language]
          : [];
  } catch {
    return null;
  }
  for (const tag of langs) {
    const region = regionFromLanguageTag(tag);
    if (region && isDetectableMarket(region)) return region;
  }
  return localesToMarket(langs);
}

/**
 * Best-effort market detection for a first-time visitor:
 * timezone first (a location signal), browser language region
 * second (a locale signal). Null when nothing maps - the caller
 * keeps the Nigeria default.
 */
export function detectMarketCode(): string | null {
  return detectMarketFromTimezone() ?? detectMarketFromLocale();
}

/**
 * Testable core: explicit signals instead of the ambient browser.
 * Timezone wins over language regions (a location signal beats a
 * locale signal), mirroring the language suggestion rules.
 */
export function marketForSignals(signals: {
  timezone?: string | null;
  browserLanguages?: readonly (string | null)[];
}): string | null {
  return (
    timezoneToMarket(signals.timezone ?? null) ??
    localesToMarket(signals.browserLanguages ?? [])
  );
}
