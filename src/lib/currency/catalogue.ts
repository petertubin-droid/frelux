// The currencies Frelux estimates can be priced and displayed in.
//
// Every code carries the metadata formatting and suggestion need: symbol,
// minor-unit decimals and the countries whose users should be offered it. New
// currencies join through registerCurrency, so nothing here is a closed list.

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** Minor units printed after the decimal point. Yen has none. */
  decimals: number;
  /** Countries whose users are offered this currency first. */
  countries: readonly string[];
}

const EURO_COUNTRIES = [
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "PT",
  "IE",
  "AT",
  "BE",
  "FI",
  "GR",
  "SK",
  "SI",
  "LT",
  "LV",
  "EE",
  "LU",
  "CY",
  "MT",
  "HR",
];

const BASE_CURRENCIES: readonly CurrencyMeta[] = [
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    decimals: 2,
    countries: ["NG"],
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimals: 2,
    countries: ["US", "EC", "SV", "PA"],
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    decimals: 2,
    countries: ["GB"],
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimals: 2,
    countries: EURO_COUNTRIES,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    decimals: 2,
    countries: ["CA"],
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    decimals: 2,
    countries: ["AU"],
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "CN¥",
    decimals: 2,
    countries: ["CN"],
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "AED",
    decimals: 2,
    countries: ["AE"],
  },
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    decimals: 2,
    countries: ["MX"],
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    decimals: 2,
    countries: ["KE"],
  },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    decimals: 2,
    countries: ["ZA"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    decimals: 2,
    countries: ["IN"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    decimals: 2,
    countries: ["GH"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    decimals: 0,
    countries: ["JP"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    decimals: 2,
    countries: ["BR"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    decimals: 2,
    countries: ["SA"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    decimals: 0,
    countries: ["ID"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    decimals: 0,
    countries: ["KR"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "Br",
    decimals: 2,
    countries: ["ET"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    decimals: 2,
    countries: ["EG"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    decimals: 2,
    countries: ["TZ"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "XOF",
    name: "West African CFA Franc",
    symbol: "CFA",
    decimals: 0,
    countries: ["CI"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "PLN",
    name: "Polish Złoty",
    symbol: "zł",
    decimals: 2,
    countries: ["PL"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    decimals: 2,
    countries: ["SE"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    decimals: 2,
    countries: ["CH"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    decimals: 2,
    countries: ["SG"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    decimals: 2,
    countries: ["TR"],
  },
  {
    // Added 2026-11-09 (audit UX-4): the 32-market registry uses this currency
    // but the catalogue had no entry, so the UI printed the ISO code as the
    // symbol and gave zero-decimal money two decimals.
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    decimals: 2,
    countries: ["NZ"],
  },
];

const registry = new Map<string, CurrencyMeta>(
  BASE_CURRENCIES.map((c) => [c.code, c]),
);
const byCountry = new Map<string, string>();
BASE_CURRENCIES.forEach((c) =>
  c.countries.forEach((country) => byCountry.set(country, c.code)),
);

/** The currencies shipped with the engine, in selector order. */
export const CURRENCY_CODES: readonly string[] = BASE_CURRENCIES.map(
  (c) => c.code,
);

export function listCurrencies(): CurrencyMeta[] {
  return [...registry.values()];
}

/** Adds or replaces a currency so markets beyond the initial set are supported. */
export function registerCurrency(meta: CurrencyMeta): void {
  const code = meta.code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code))
    throw new Error(`"${meta.code}" is not a three-letter currency code`);
  registry.set(code, { ...meta, code });
  meta.countries.forEach((country) =>
    byCountry.set(country.trim().toUpperCase(), code),
  );
}

export function isSupportedCurrency(code: string): boolean {
  return registry.has(code.trim().toUpperCase());
}

/** Unknown codes still format as a bare ISO code rather than crashing a page. */
export function currencyMeta(code: string): CurrencyMeta {
  const key = (code || "").trim().toUpperCase();
  return (
    registry.get(key) ?? {
      code: key || "USD",
      name: key || "US Dollar",
      symbol: key || "$",
      decimals: 2,
      countries: [],
    }
  );
}

/**
 * The currency a visitor from this country is offered first. Anything outside
 * the catalogue falls back to USD, which is the platform's canonical currency.
 */
export function suggestCurrency(
  countryCode: string | null | undefined,
): string {
  const country = (countryCode || "").trim().toUpperCase();
  return byCountry.get(country) ?? "USD";
}
