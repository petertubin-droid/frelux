// =========================================================
// Currency minor-unit helpers (frontend mirror of
// supabase/functions/_shared/currency-units.ts — keep the two maps
// in sync).
//
// Token pack prices for non-naira currencies are stored in minor
// units (e.g. 99 = $0.99); zero-decimal currencies (JPY, KRW) use
// the amount as-is.
// =========================================================

/** Minor units per currency (0 for zero-decimal currencies). */
const MINOR_UNITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
};

export function currencyMinorUnits(code: string | undefined | null): number {
  return MINOR_UNITS[String(code ?? "").toUpperCase()] ?? 2;
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
