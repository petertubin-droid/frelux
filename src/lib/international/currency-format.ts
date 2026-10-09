// =========================================================
// Shared currency presentation API (DUP-08 consolidation).
//
// ONE place decides how a monetary amount is *displayed*:
//   - symbol resolution from the verified DISPLAY_CURRENCIES metadata
//   - symbol/amount joining (space for multi-character symbols)
//   - decimal precision (0, 2, adaptive, or currency-native minor units)
//   - grouping + rounding via toLocaleString
//
// Conversion and arithmetic STAY in their authoritative layers:
//   - monetary conversion: src/lib/international/fx-display.ts
//     (formatByCode/formatWithSymbol never convert; conversion-aware
//      wrappers in lib/utils.ts call fx-display exactly once)
//   - minor/major unit math: src/lib/international/currency-units.ts
//
// Previously four page-local formatters and two library functions
// each carried their own copies of this logic.
// =========================================================

import { DISPLAY_CURRENCIES } from "./fx-display";
import { currencyMinorUnits } from "./currency-units";

/** Verified symbol metadata keyed by ISO code (NGN -> "₦", GHS -> "GH₵", ...). */
const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  DISPLAY_CURRENCIES.map((c) => [c.code, c.symbol]),
);

/** Decimal presentation modes. */
export type CurrencyDecimals = 0 | 2 | "auto" | "native";

export interface CurrencyFormatOptions {
  /**
   * - 0: whole amounts only ({0, 0})
   * - 2: always two decimals ({2, 2})
   * - "auto": trailing decimals up to 2 ({0, 2})
   * - "native": the currency's own minor units (JPY/KRW -> 0, others -> 2)
   * @default 0
   */
  decimals?: CurrencyDecimals;
  /** Locale used for grouping/rounding. @default "en-US" */
  locale?: string;
}

/** Verified symbol for a currency code, or null when unknown. */
export function getCurrencySymbol(code: string): string | null {
  return CURRENCY_SYMBOLS[String(code ?? "").toUpperCase()] ?? null;
}

/** Multi-character symbols get a space between symbol and amount. */
function joinSymbol(symbol: string, formatted: string): string {
  return symbol.length === 1
    ? `${symbol}${formatted}`
    : `${symbol} ${formatted}`;
}

function decimalDigits(
  decimals: CurrencyDecimals,
  code: string,
): { min: number; max: number } {
  switch (decimals) {
    case 0:
      return { min: 0, max: 0 };
    case 2:
      return { min: 2, max: 2 };
    case "auto":
      return { min: 0, max: 2 };
    case "native":
      return currencyMinorUnits(code) === 0
        ? { min: 0, max: 0 }
        : { min: 2, max: 2 };
  }
}

/** Invalid input never renders as "NaN": it renders as zero. */
function safeAmount(amount: number): number {
  return typeof amount === "number" && !isNaN(amount) ? amount : 0;
}

/**
 * Format a monetary amount with a currency CODE (NGN, USD, GHS, ...).
 * The symbol is resolved from the verified currency metadata; unknown
 * codes fall back to the raw code as the symbol (e.g. "XYZ 1,234"),
 * never a guessed symbol.
 */
export function formatByCode(
  amount: number,
  code: string = "NGN",
  options: CurrencyFormatOptions = {},
): string {
  const upper = String(code || "NGN").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[upper] || upper;
  const { min, max } = decimalDigits(options.decimals ?? 0, upper);
  const formatted = safeAmount(amount).toLocaleString(
    options.locale ?? "en-US",
    {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    },
  );
  return joinSymbol(symbol, formatted);
}

/**
 * Format a monetary amount with a caller-supplied SYMBOL ("₦", "$", "GH₵").
 * Symbol mode joins TIGHT (legacy market-page style: "GH₵1,234") and never
 * converts; use when the presentation layer already knows the symbol.
 * Otherwise prefer formatByCode (auto-spaced, metadata-resolved).
 */
export function formatWithSymbol(
  amount: number,
  symbol: string = "₦",
  options: CurrencyFormatOptions = {},
): string {
  const { min, max } = decimalDigits(options.decimals ?? 0, "NGN");
  const formatted = safeAmount(amount).toLocaleString(
    options.locale ?? "en-US",
    {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    },
  );
  return `${symbol || "₦"}${formatted}`;
}
