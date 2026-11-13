// =========================================================
// The currency registry
//
// One table that says, for a currency: how many minor units it has,
// and which rails can actually collect it. Everything else derives
// from here - escrow funding, subscription checkout, token packs and
// the prices the site displays.
//
// Three separate currency lists used to live in this repo (escrow
// providers, subscription pricing, token pricing) and they disagreed,
// so a buyer could be quoted in rupees and charged in dollars, or
// hold a currency that escrow refused to collect. Keep one list.
// =========================================================

export type PaymentRail = "paystack" | "flutterwave";

export interface CurrencyRules {
  /** Minor units per major unit: 2 for most, 0 for yen/won/CFA. */
  exponent: 0 | 2;
  /** Rails that can settle a charge in this currency. Empty = none. */
  rails: readonly PaymentRail[];
}

const PAYSTACK: readonly PaymentRail[] = ["paystack", "flutterwave"];
const FLW: readonly PaymentRail[] = ["flutterwave"];

/**
 * Every currency FRELUX prices in. A currency absent here cannot be
 * charged at all, so nothing may be quoted in it.
 */
export const CURRENCY_REGISTRY: Readonly<Record<string, CurrencyRules>> =
  Object.freeze({
    USD: { exponent: 2, rails: PAYSTACK },
    EUR: { exponent: 2, rails: FLW },
    GBP: { exponent: 2, rails: FLW },
    NGN: { exponent: 2, rails: PAYSTACK },
    GHS: { exponent: 2, rails: PAYSTACK },
    KES: { exponent: 2, rails: PAYSTACK },
    ZAR: { exponent: 2, rails: PAYSTACK },
    CAD: { exponent: 2, rails: FLW },
    AUD: { exponent: 2, rails: FLW },
    AED: { exponent: 2, rails: FLW },
    SAR: { exponent: 2, rails: FLW },
    EGP: { exponent: 2, rails: FLW },
    INR: { exponent: 2, rails: FLW },
    BRL: { exponent: 2, rails: FLW },
    MXN: { exponent: 2, rails: FLW },
    CNY: { exponent: 2, rails: FLW },
    TRY: { exponent: 2, rails: FLW },
    RUB: { exponent: 2, rails: FLW },
    IDR: { exponent: 2, rails: FLW },
    JPY: { exponent: 0, rails: FLW },
    KRW: { exponent: 0, rails: FLW },
    XOF: { exponent: 0, rails: FLW },
    RWF: { exponent: 0, rails: FLW },
    UGX: { exponent: 0, rails: FLW },
    TZS: { exponent: 2, rails: FLW },
  });

/** Currencies quoted and charged, derived from the registry. */
export const CHARGEABLE_CURRENCIES: readonly string[] = Object.freeze(
  Object.keys(CURRENCY_REGISTRY).filter(
    (code) => (CURRENCY_REGISTRY[code]?.rails.length ?? 0) > 0,
  ),
);

function normalise(code: string | null | undefined): string {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

export function currencyRules(
  code: string | null | undefined,
): CurrencyRules | null {
  return CURRENCY_REGISTRY[normalise(code)] ?? null;
}

export function currencyExponent(code: string | null | undefined): 0 | 2 {
  return currencyRules(code)?.exponent ?? 2;
}

/** True when at least one rail can collect this currency. */
export function isChargeableCurrency(code: string | null | undefined): boolean {
  return (currencyRules(code)?.rails.length ?? 0) > 0;
}

export function railsForCurrency(
  code: string | null | undefined,
): readonly PaymentRail[] {
  return currencyRules(code)?.rails ?? [];
}

/**
 * The rail a charge should default to. Naira stays on Paystack: it is the
 * live integration with local settlement and the lowest cost for a Nigerian
 * buyer. Everything else uses the international rail.
 */
export function railForCurrency(
  code: string | null | undefined,
): PaymentRail | null {
  const rails = railsForCurrency(code);
  if (rails.length === 0) return null;
  return normalise(code) === "NGN" ? "paystack" : "flutterwave";
}

export function majorToMinor(
  amountMajor: number,
  code: string | null | undefined,
): number {
  const units = currencyExponent(code);
  return Math.round(amountMajor * 10 ** units);
}

export function minorToMajor(
  amountMinor: number,
  code: string | null | undefined,
): number {
  const units = currencyExponent(code);
  return amountMinor / 10 ** units;
}
