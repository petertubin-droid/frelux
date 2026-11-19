/**
 * Global country list for selects (posting forms, browse filters,
 * price reporting). The site is not limited to any region - any
 * country outside these options can still use "OTHER" on posting
 * forms, and unknown countries get free-text region entry.
 * Currency is the local currency used by the community price
 * pipeline (submission currency per market).
 */

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
}

export interface CountryGroup {
  group: string;
  countries: CountryOption[];
}

export const COUNTRY_OPTIONS: CountryGroup[] = [
  {
    group: "Africa",
    countries: [
      { code: "NG", name: "Nigeria", currency: "NGN" },
      { code: "GH", name: "Ghana", currency: "GHS" },
      { code: "KE", name: "Kenya", currency: "KES" },
      { code: "ZA", name: "South Africa", currency: "ZAR" },
      { code: "ET", name: "Ethiopia", currency: "ETB" },
      { code: "EG", name: "Egypt", currency: "EGP" },
      { code: "TZ", name: "Tanzania", currency: "TZS" },
      { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
    ],
  },
  {
    group: "Americas",
    countries: [
      { code: "US", name: "United States", currency: "USD" },
      { code: "CA", name: "Canada", currency: "CAD" },
      { code: "BR", name: "Brazil", currency: "BRL" },
      { code: "MX", name: "Mexico", currency: "MXN" },
    ],
  },
  {
    group: "Europe",
    countries: [
      { code: "GB", name: "United Kingdom", currency: "GBP" },
      { code: "DE", name: "Germany", currency: "EUR" },
      { code: "FR", name: "France", currency: "EUR" },
      { code: "IT", name: "Italy", currency: "EUR" },
      { code: "ES", name: "Spain", currency: "EUR" },
      { code: "NL", name: "Netherlands", currency: "EUR" },
      { code: "PL", name: "Poland", currency: "PLN" },
      { code: "SE", name: "Sweden", currency: "SEK" },
      { code: "CH", name: "Switzerland", currency: "CHF" },
    ],
  },
  {
    group: "Asia & Middle East",
    countries: [
      { code: "CN", name: "China", currency: "CNY" },
      { code: "JP", name: "Japan", currency: "JPY" },
      { code: "ID", name: "Indonesia", currency: "IDR" },
      { code: "IN", name: "India", currency: "INR" },
      { code: "KR", name: "South Korea", currency: "KRW" },
      { code: "SG", name: "Singapore", currency: "SGD" },
      { code: "AE", name: "United Arab Emirates", currency: "AED" },
      { code: "SA", name: "Saudi Arabia", currency: "SAR" },
      { code: "TR", name: "Türkiye", currency: "TRY" },
    ],
  },
  {
    group: "Oceania",
    countries: [
      { code: "AU", name: "Australia", currency: "AUD" },
      { code: "NZ", name: "New Zealand", currency: "NZD" },
    ],
  },
];

/** Flat list of the approved market codes (the 32-market registry). */
export const APPROVED_MARKET_CODES: string[] = COUNTRY_OPTIONS.flatMap((g) =>
  g.countries.map((c) => c.code),
);

export const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(
  COUNTRY_OPTIONS.flatMap((g) =>
    g.countries.map((c) => [c.code, c.currency] as const),
  ),
);

/**
 * Local currency for a market code.
 *
 * Codes are matched case-insensitively, because "us" and "US" name the same
 * market. A code this registry does not list returns USD: the site is global,
 * and a market nobody confirmed must not be silently priced in naira.
 */
export function getCountryCurrency(code: string | null | undefined): string {
  const normalised = (code ?? "").trim().toUpperCase();
  if (!normalised) return "USD";
  return COUNTRY_CURRENCY[normalised] ?? "USD";
}

import { DIAL_CODES } from "@/lib/phone/msisdn";

/**
 * Convert a 2-letter ISO country code (e.g. "NG", "US", "GB") to its unicode flag emoji.
 * Returns a fallback globe emoji "🌐" for missing or invalid codes.
 */
export function getCountryFlag(code?: string | null): string {
  if (!code || typeof code !== "string") return "🌐";
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return "🌐";
  const first = clean.charCodeAt(0) - 65 + 0x1f1e6;
  const second = clean.charCodeAt(1) - 65 + 0x1f1e6;
  if (
    first < 0x1f1e6 ||
    first > 0x1f1ff ||
    second < 0x1f1e6 ||
    second > 0x1f1ff
  ) {
    return "🌐";
  }
  return String.fromCodePoint(first, second);
}

/**
 * Return the human-readable country name for a market code (e.g. "NG" -> "Nigeria").
 */
export function getCountryName(code?: string | null): string {
  const clean = (code ?? "").trim().toUpperCase();
  if (!clean) return "Unknown";
  for (const group of COUNTRY_OPTIONS) {
    const found = group.countries.find((c) => c.code === clean);
    if (found) return found.name;
  }
  return clean;
}

/**
 * Return the telephone dial code for a country code (e.g. "NG" -> "234", "US" -> "1").
 */
export function getCountryDialCode(code?: string | null): string | null {
  const clean = (code ?? "").trim().toUpperCase();
  if (!clean) return null;
  return DIAL_CODES[clean] ?? null;
}

/**
 * Infer country code from a phone number string when country_code is not explicitly stored.
 * Checks Nigerian domestic patterns (070, 080, 081, 090, 091...) and international dial codes.
 */
export function inferCountryFromPhone(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  // Nigerian domestic patterns
  if (/^0[789][01]\d{8}$/.test(digits)) return "NG";

  const sorted = Object.entries(DIAL_CODES).sort(
    (a, b) => b[1].length - a[1].length,
  );
  for (const [, dial] of sorted) {
    if (!digits.startsWith(dial) || digits.length < dial.length + 6) continue;
    const matches = Object.entries(DIAL_CODES)
      .filter(([, candidate]) => candidate === dial)
      .map(([code]) => code);
    // Shared calling codes (for example +1 for the US and Canada) do not
    // identify a country on their own. Keep the country unset rather than guess.
    return matches.length === 1 ? matches[0] : null;
  }
  return null;
}

export interface UserCountryInfo {
  code: string | null;
  flag: string;
  name: string;
  dialCode: string | null;
  source: "reported" | "phone" | "unset";
}

/**
 * Resolve country code, flag, name, and dial code for a user record.
 */
export function resolveUserCountry(
  user?: {
    country_code?: string | null;
    phone?: string | null;
  } | null,
): UserCountryInfo {
  const rawCode = (user?.country_code ?? "").trim().toUpperCase();
  const validCode =
    rawCode && rawCode.length === 2 && /^[A-Z]{2}$/.test(rawCode)
      ? rawCode
      : inferCountryFromPhone(user?.phone);

  if (!validCode) {
    return {
      code: null,
      flag: "🌐",
      name: "Unset",
      dialCode: null,
      source: "unset",
    };
  }

  return {
    code: validCode,
    flag: getCountryFlag(validCode),
    name: getCountryName(validCode),
    dialCode: getCountryDialCode(validCode),
    source: rawCode ? "reported" : "phone",
  };
}
