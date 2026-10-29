// =========================================================
// Subscription Pricing Guard (shared edge-function module)
//
// SECURITY: subscription prices are ALWAYS resolved server-side
// from the `subscription_plan_prices` table. The client-supplied
// amount is never trusted. A transaction that does not match the
// configured price for its (plan, billing_cycle) must NOT activate
// a subscription — no fallback, no guessing.
//
// This closes the audit finding H1 (2026-09-10): the legacy
// subscription flow passed a client-controlled amount into
// Paystack checkout and activated on any successful transaction.
// =========================================================

/** The currency subscription prices are advertised and sold in. */
export const SUBSCRIPTION_CURRENCY = "USD";

export interface SubscriptionPlanPriceRow {
  plan: string;
  billing_cycle: string;
  /**
   * Price in minor units of the row's currency (cents for USD, kobo for
   * NGN). Canonical since 2026-10-29.
   */
  price_minor?: number | null;
  /** Legacy naira-only column, still read for rows written before USD. */
  price_kobo?: number | null;
  currency?: string | null;
  active: boolean;
}

export interface SubscriptionPriceResolution {
  /** Configured price in kobo, or null when no active plan row exists. */
  priceKobo: number | null;
}

export interface ResolvedPrice {
  /** Minor units in the resolved currency. */
  priceMinor: number;
  currency: string;
}

/**
 * Resolves the canonical server-side price for a plan + billing cycle.
 * Returns null unless an exact active row exists — never guesses.
 */
export function resolveSubscriptionPriceKobo(
  rows: SubscriptionPlanPriceRow[],
  plan: string,
  billingCycle: string,
): SubscriptionPriceResolution {
  // Legacy signature: NGN rows. USD purchases use resolveSubscriptionPrice.
  return resolveSubscriptionPriceNgn(rows, plan, billingCycle);
}

export type SubscriptionValidationReason =
  "PLAN_NOT_CONFIGURED" | "AMOUNT_MISMATCH";

/** Minor units for a row, tolerating pre-USD rows that only have kobo. */
function rowMinorUnits(row: SubscriptionPlanPriceRow): number | null {
  const raw = row.price_minor ?? row.price_kobo ?? null;
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * Resolves the canonical price for a plan, cycle and currency.
 *
 * USD is canonical. A row in another currency is a local settlement price
 * and only ever matches when that currency is explicitly requested, so a
 * naira row can never be charged for a dollar purchase by accident.
 */
export function resolveSubscriptionPrice(
  rows: SubscriptionPlanPriceRow[],
  plan: string,
  billingCycle: string,
  currency: string = SUBSCRIPTION_CURRENCY,
): ResolvedPrice | null {
  const wanted = currency.toUpperCase();
  const row = rows.find(
    (r) =>
      r.plan === plan &&
      r.billing_cycle === billingCycle &&
      r.active === true &&
      (r.currency ?? "NGN").toUpperCase() === wanted,
  );
  if (!row) return null;
  const priceMinor = rowMinorUnits(row);
  if (priceMinor === null) return null;
  return { priceMinor, currency: wanted };
}

/**
 * Naira price for (plan, cycle). Kept for callers that settle in NGN; new
 * code should call resolveSubscriptionPrice with USD.
 */
export function resolveSubscriptionPriceNgn(
  rows: SubscriptionPlanPriceRow[],
  plan: string,
  billingCycle: string,
): SubscriptionPriceResolution {
  const resolved = resolveSubscriptionPrice(rows, plan, billingCycle, "NGN");
  return { priceKobo: resolved?.priceMinor ?? null };
}

/** Exact-amount check for any currency. */
export function validateSubscriptionCharge(input: {
  rows: SubscriptionPlanPriceRow[];
  plan: string;
  billingCycle: string;
  currency: string;
  chargedMinor: number;
}):
  | { ok: true; priceMinor: number }
  | { ok: false; reason: SubscriptionValidationReason } {
  const resolved = resolveSubscriptionPrice(
    input.rows,
    input.plan,
    input.billingCycle,
    input.currency,
  );
  if (!resolved) return { ok: false, reason: "PLAN_NOT_CONFIGURED" };
  if (Math.round(input.chargedMinor) !== resolved.priceMinor) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }
  return { ok: true, priceMinor: resolved.priceMinor };
}

// ── Local settlement quotes ────────────────────────────────────────────
// When the advertised price is USD but the card is charged in naira, the
// rate used is quoted and stored at checkout time. Verification compares
// the charge to that quote, never to a freshly converted price, so a rate
// move between checkout and verification cannot fail a paying customer.

export interface SubscriptionQuote {
  reference: string;
  plan: string;
  billing_cycle: string;
  base_currency: string;
  base_minor: number;
  charge_currency: string;
  charge_minor: number;
  expires_at?: string | null;
}

export type QuoteValidationReason =
  | "QUOTE_MISSING"
  | "QUOTE_EXPIRED"
  | "PLAN_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "AMOUNT_MISMATCH";

export function validateQuotedCharge(
  quote: SubscriptionQuote | null,
  input: {
    plan: string;
    billingCycle: string;
    chargedMinor: number;
    chargedCurrency: string;
    now?: number;
  },
): { ok: true } | { ok: false; reason: QuoteValidationReason } {
  if (!quote) return { ok: false, reason: "QUOTE_MISSING" };
  if (quote.plan !== input.plan || quote.billing_cycle !== input.billingCycle) {
    return { ok: false, reason: "PLAN_MISMATCH" };
  }
  if (
    quote.charge_currency.toUpperCase() !== input.chargedCurrency.toUpperCase()
  ) {
    return { ok: false, reason: "CURRENCY_MISMATCH" };
  }
  const now = input.now ?? Date.now();
  if (quote.expires_at) {
    const expiry = Date.parse(quote.expires_at);
    if (Number.isFinite(expiry) && expiry < now) {
      return { ok: false, reason: "QUOTE_EXPIRED" };
    }
  }
  if (Math.round(input.chargedMinor) !== Math.round(quote.charge_minor)) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }
  return { ok: true };
}

/**
 * Converts a USD-cent price to kobo at a quoted rate (naira per dollar).
 * 499 cents at 1,550 naira/dollar is 773,450 kobo (NGN 7,734.50).
 * A rate outside a plausible band is treated as misconfiguration rather
 * than used to charge a wrong amount.
 */
export function usdCentsToNairaKobo(
  usdCents: number,
  nairaPerUsd: number,
): number | null {
  if (!Number.isFinite(usdCents) || usdCents <= 0) return null;
  if (
    !Number.isFinite(nairaPerUsd) ||
    nairaPerUsd < 100 ||
    nairaPerUsd > 100000
  ) {
    return null;
  }
  return Math.round(usdCents * nairaPerUsd);
}

/**
 * Validates that a Paystack transaction's paid amount matches the
 * canonical server-side price for the plan it claims to purchase.
 *
 * Returns { ok: true } only when an active price row exists AND the
 * transaction amount equals it exactly (kobo-precise).
 */
export function validateSubscriptionPayment(input: {
  rows: SubscriptionPlanPriceRow[];
  plan: string;
  billingCycle: string;
  transactionAmountKobo: number;
}):
  | { ok: true; priceKobo: number }
  | { ok: false; reason: SubscriptionValidationReason } {
  const { priceKobo } = resolveSubscriptionPriceKobo(
    input.rows,
    input.plan,
    input.billingCycle,
  );
  if (priceKobo === null) {
    return { ok: false, reason: "PLAN_NOT_CONFIGURED" };
  }
  if (Math.round(input.transactionAmountKobo) !== priceKobo) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }
  return { ok: true, priceKobo };
}

/**
 * Constant-time string comparison for signature verification.
 * Compares hex digests without early-exit timing leakage.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Gateway currency support ───────────────────────────────────────────
// A market's local price is only chargeable through a gateway that settles
// that currency. Everything else falls back to the dollar price.

export const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "IDR", "XOF"]);

/** Currencies Paystack settles directly. */
export const PAYSTACK_CURRENCIES = new Set(["NGN", "GHS", "ZAR", "KES", "USD"]);

/** Currencies Flutterwave can settle for international cards. */
export const FLUTTERWAVE_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "XOF",
  "RWF",
  "UGX",
  "TZS",
  "CAD",
  "AUD",
]);

export function currencyExponent(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/** Minor units to the major units a gateway's API expects. */
export function toMajorUnits(minor: number, currency: string): number {
  const exp = currencyExponent(currency);
  return Number((minor / 10 ** exp).toFixed(exp));
}

export interface MarketCharge {
  currency: string;
  priceMinor: number;
}

/**
 * Picks what to charge for a market: its local price when the gateway can
 * settle that currency, otherwise the canonical dollar price.
 */
export function resolveMarketCharge(input: {
  localPrice: { currency: string; price_minor: number } | null;
  usdPriceMinor: number;
  supported: Set<string>;
}): MarketCharge {
  const { localPrice, usdPriceMinor, supported } = input;
  if (
    localPrice &&
    Number(localPrice.price_minor) > 0 &&
    supported.has(String(localPrice.currency).toUpperCase())
  ) {
    return {
      currency: String(localPrice.currency).toUpperCase(),
      priceMinor: Math.round(Number(localPrice.price_minor)),
    };
  }
  return { currency: "USD", priceMinor: Math.round(usdPriceMinor) };
}
