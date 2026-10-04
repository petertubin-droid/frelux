/**
 * FRELUX visitor currency display layer (International Phase A).
 *
 * Estimates CALCULATE in Naira from the Nigerian price books; that is
 * the authoritative number and never changes. This module converts a
 * Naira amount into the visitor's chosen currency for DISPLAY only,
 * using rates the owner configured in site_settings.display_currencies.
 *
 * Rules:
 *  - No rate configured for a currency means that currency is offered
 *    in the picker but values render in Naira unchanged (no guessing).
 *  - NGN (the default) renders exactly as before: symbol + grouping,
 *    zero decimals. Non-NGN uses up to 2 decimals.
 *  - The visitor's choice persists in localStorage ("frelux_currency"),
 *    per the project rule that user preferences live in localStorage.
 *  - The Phase 45 market architecture is untouched: an active market
 *    with real local prices always beats an FX conversion.
 *
 * Integration: utils.formatCurrency() consults this module's display
 * state when asked to format a Naira amount. Engine-internal formatting
 * (lib/estimation/pricing.ts) does NOT, so engine results, tests and
 * deterministic behaviour stay exactly as they were.
 */

/** localStorage key for the visitor's display-currency choice. */
export const CURRENCY_STORAGE_KEY = "frelux_currency";

export interface DisplayCurrency {
  /** ISO 4217 code. */
  code: string;
  /** Human name shown in the picker. */
  name: string;
  /** Symbol used to prefix amounts. */
  symbol: string;
  /** Where the currency matters most (picker hint). */
  hint: string;
}

/**
 * The display currencies offered in the picker. NGN first (default),
 * then the visitor currencies the owner can enable rates for.
 * Additions are pure list entries: the widget translates the site
 * text; this only affects how amounts are shown.
 */
export const DISPLAY_CURRENCIES: DisplayCurrency[] = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", hint: "Nigeria" },
  { code: "USD", name: "US Dollar", symbol: "$", hint: "United States" },
  { code: "EUR", name: "Euro", symbol: "€", hint: "Europe" },
  { code: "GBP", name: "British Pound", symbol: "£", hint: "United Kingdom" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", hint: "Ghana" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", hint: "Kenya" },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    hint: "South Africa",
  },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", hint: "Canada" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", hint: "West Africa" },
  // Worldwide majors — every registered locale gets its currency.
  { code: "JPY", name: "Japanese Yen", symbol: "¥", hint: "Japan" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", hint: "China" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", hint: "India" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", hint: "Brazil" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", hint: "Canada" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", hint: "Australia" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", hint: "Russia" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", hint: "Indonesia" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", hint: "Mexico" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", hint: "Türkiye" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", hint: "Saudi Arabia" },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    hint: "United Arab Emirates",
  },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", hint: "Egypt" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", hint: "South Korea" },
];

/** Shape of site_settings.display_currencies. */
export interface DisplayCurrencyConfig {
  enabled: boolean;
  /** units of CODE that 1 NGN buys, e.g. { USD: 0.00065 }. */
  rates: Record<string, number>;
  note?: string;
  updated_at?: string;
}

// ── Module display state ────────────────────────────────────────────
// Set synchronously from localStorage at module load (before first
// render, so no flash of wrong currency), then updated by the
// CurrencyProvider once admin rates load or the visitor changes pick.

let activeCode = readStoredCurrency();
let config: DisplayCurrencyConfig = { enabled: false, rates: {} };

function readStoredCurrency(): string {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && DISPLAY_CURRENCIES.some((c) => c.code === stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable (SSR/private mode): stay on default.
  }
  return "NGN";
}

/** Set the display state. Called by the CurrencyProvider. */
export function setDisplayCurrencyState(
  code: string,
  cfg: DisplayCurrencyConfig,
): void {
  activeCode = DISPLAY_CURRENCIES.some((c) => c.code === code) ? code : "NGN";
  config = {
    enabled: !!cfg?.enabled,
    rates: cfg?.rates ?? {},
    note: cfg?.note,
    updated_at: cfg?.updated_at,
  };
}

/** Current display currency code (NGN unless the visitor chose one). */
export function getActiveDisplayCurrency(): string {
  return activeCode;
}

/** True when the display layer actually converts (non-NGN + rate + enabled). */
export function isConverting(): boolean {
  return activeCode !== "NGN" && config.enabled && hasFxRate(activeCode);
}

/** True when the owner configured a usable rate for a currency. */
export function hasFxRate(code: string): boolean {
  const rate = config.rates?.[code];
  return typeof rate === "number" && rate > 0 && Number.isFinite(rate);
}

/** Symbol for the active display currency (₦ when not converting). */
export function activeCurrencySymbol(): string {
  const meta = DISPLAY_CURRENCIES.find((c) => c.code === activeCode);
  return meta ? meta.symbol : "₦";
}

/**
 * Convert a Naira amount into the active display currency.
 * Returns the ORIGINAL amount when not converting, so callers can
 * always treat the result as "the amount to format".
 */
export function convertFromNGN(amountNGN: number): number {
  if (!isConverting()) return amountNGN;
  const safe =
    typeof amountNGN === "number" && !isNaN(amountNGN) ? amountNGN : 0;
  return safe * config.rates[activeCode];
}

/** The rate used, for the "approx." disclosure (e.g. "1 ₦ = $0.00065"). */
export function activeRateDescription(): string | null {
  if (!isConverting()) return null;
  const meta = DISPLAY_CURRENCIES.find((c) => c.code === activeCode);
  const rate = config.rates[activeCode];
  return `1 ₦ = ${meta?.symbol ?? activeCode}${rate}`;
}

/**
 * Format a NAIRA amount for display in the visitor's currency.
 * This is the display-layer twin of utils.formatCurrency: NGN renders
 * exactly like before (₦ + grouping, 0 decimals); a converting currency
 * renders with its own symbol and up to 2 decimals.
 */
export function formatNGNForDisplay(amountNGN: number): string {
  if (!isConverting()) {
    const safe =
      typeof amountNGN === "number" && !isNaN(amountNGN) ? amountNGN : 0;
    return `₦${safe.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  const converted = convertFromNGN(amountNGN);
  return `${activeCurrencySymbol()}${converted.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** True when a formatCurrency(…, currency) argument means Naira. */
export function isNairaSymbol(currency: string | undefined): boolean {
  return currency === "₦" || (currency || "").toUpperCase() === "NGN";
}

// Keep localStorage in sync whenever the visitor changes currency.
if (typeof localStorage !== "undefined") {
  // re-read on tab focus in case another tab changed the preference
  window.addEventListener("storage", (e) => {
    if (e.key === CURRENCY_STORAGE_KEY && e.newValue) {
      activeCode = DISPLAY_CURRENCIES.some((c) => c.code === e.newValue)
        ? e.newValue
        : "NGN";
    }
  });
}
