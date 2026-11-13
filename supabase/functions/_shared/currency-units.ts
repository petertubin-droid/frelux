// =========================================================
// Currency minor-unit helpers (shared by the Flutterwave edge
// functions and mirrored by src/lib/international/currency-units.ts
// for the frontend — keep the two maps in sync).
//
// Flutterwave amounts are in the currency's MAJOR unit, while the
// canonical token prices are stored in minor units. This map says
// how many minor units each supported currency has.
// =========================================================

export {
  CHARGEABLE_CURRENCIES,
  currencyExponent as currencyMinorUnits,
} from "./currency-registry.ts";

import { currencyExponent } from "./currency-registry.ts";

/** Converts a major-unit amount (what Flutterwave reports/charges
 * in) to that currency's minor units. */
export function majorToMinor(amountMajor: number, code: string): number {
  return Math.round(amountMajor * Math.pow(10, currencyExponent(code)));
}

/** Converts a minor-unit price to the major unit Flutterwave expects. */
export function minorToMajor(amountMinor: number, code: string): number {
  return amountMinor / Math.pow(10, currencyExponent(code));
}
