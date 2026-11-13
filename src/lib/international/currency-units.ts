// =========================================================
// Currency minor-unit helpers (frontend mirror of
// supabase/functions/_shared/currency-units.ts — keep the two maps
// in sync).
//
// Token pack prices for non-naira currencies are stored in minor
// units (e.g. 99 = $0.99); zero-decimal currencies (JPY, KRW) use
// the amount as-is.
// =========================================================

import { currencyExponent } from "@/lib/payments/charges";

/** Minor units per currency, from the shared registry (yen, won and CFA
 * francs have none). */
export function currencyMinorUnits(code: string | undefined | null): number {
  return currencyExponent(code);
}

/** Converts a major-unit amount to the currency's minor units. */
export function majorToMinor(amountMajor: number, code: string): number {
  const units = currencyMinorUnits(code);
  return Math.round(amountMajor * Math.pow(10, units));
}

/** Converts a minor-unit amount to the currency's major units. */
export function minorToMajor(amountMinor: number, code: string): number {
  const units = currencyMinorUnits(code);
  return amountMinor / Math.pow(10, units);
}
