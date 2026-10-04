/**
 * Global country list for selects (posting forms, browse filters,
 * price reporting). The site is not limited to any region — any
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

export const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(
  COUNTRY_OPTIONS.flatMap((g) =>
    g.countries.map((c) => [c.code, c.currency] as const),
  ),
);

/** Local currency for a market code; NGN fallback for unlisted ones. */
export function getCountryCurrency(code: string): string {
  return COUNTRY_CURRENCY[code] ?? "NGN";
}
