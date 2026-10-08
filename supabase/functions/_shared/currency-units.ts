// =========================================================
// Currency minor-unit helpers (shared by the Flutterwave edge
// functions and mirrored by src/lib/international/currency-units.ts
// for the frontend — keep the two maps in sync).
//
// Flutterwave amounts are in the currency's MAJOR unit, while the
// canonical token prices are stored in minor units. This map says
// how many minor units each supported currency has.
// =========================================================

/** Currencies FRELUX can charge token purchases in via Flutterwave. */
export const CHARGEABLE_CURRENCIES: string[] = [
  "USD",
  "EUR",
  "GBP",
  "GHS",
  "KES",
  "ZAR",
  "CAD",
  "XOF",
  "JPY",
  "CNY",
  "INR",
  "BRL",
  "AUD",
  "RUB",
  "IDR",
  "MXN",
  "TRY",
  "SAR",
  "AED",
  "EGP",
  "KRW",
];

/** Minor units per currency (0 for zero-decimal currencies). */
const MINOR_UNITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
};

export function currencyMinorUnits(code: string | undefined | null): number {
  return MINOR_UNITS[String(code ?? "").toUpperCase()] ?? 2;
}

/** Converts a major-unit amount (what Flutterwave reports/charges
 * in) to that currency's minor units. */
export function majorToMinor(amountMajor: number, code: string): number {
  const units = currencyMinorUnits(code);
  return Math.round(amountMajor * Math.pow(10, units));
}

/** Converts a minor-unit price to the major unit Flutterwave expects. */
export function minorToMajor(amountMinor: number, code: string): number {
  const units = currencyMinorUnits(code);
  return amountMinor / Math.pow(10, units);
}
