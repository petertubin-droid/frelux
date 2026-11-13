// =========================================================
// What we can charge, mirrored from the server registry
//
// supabase/functions/_shared/currency-registry.ts is the authority.
// This file mirrors it so the site never quotes a currency the rails
// cannot collect - which is what made a visitor in India see rupees
// and get charged dollars.
// =========================================================

export type PaymentRail = "paystack" | "flutterwave";

interface Rules {
  exponent: 0 | 2;
  rails: readonly PaymentRail[];
}

const BOTH: readonly PaymentRail[] = ["paystack", "flutterwave"];
const FLW: readonly PaymentRail[] = ["flutterwave"];

export const CURRENCY_RULES: Readonly<Record<string, Rules>> = Object.freeze({
  USD: { exponent: 2, rails: BOTH },
  EUR: { exponent: 2, rails: FLW },
  GBP: { exponent: 2, rails: FLW },
  NGN: { exponent: 2, rails: BOTH },
  GHS: { exponent: 2, rails: BOTH },
  KES: { exponent: 2, rails: BOTH },
  ZAR: { exponent: 2, rails: BOTH },
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

const norm = (code: string | null | undefined) =>
  String(code ?? "")
    .trim()
    .toUpperCase();

export const CHARGEABLE_CURRENCIES: readonly string[] = Object.freeze(
  Object.keys(CURRENCY_RULES).filter((c) => CURRENCY_RULES[c].rails.length > 0),
);

export function isChargeableCurrency(code: string | null | undefined): boolean {
  return (CURRENCY_RULES[norm(code)]?.rails.length ?? 0) > 0;
}

export function currencyExponent(code: string | null | undefined): 0 | 2 {
  return CURRENCY_RULES[norm(code)]?.exponent ?? 2;
}

export function railsForCurrency(
  code: string | null | undefined,
): readonly PaymentRail[] {
  return CURRENCY_RULES[norm(code)]?.rails ?? [];
}
