// =========================================================
// API wallet top-ups — the rules, kept pure so they can be
// tested without a payment provider, a database or a network.
//
// Money enters this module as an untrusted client value and
// leaves it as a validated USD amount. Nothing here rounds a
// charge: a client ledger and a provider ledger that disagree
// by a cent are indistinguishable from fraud, so amounts that
// do not fit the ledger's precision are refused, not adjusted.
// =========================================================

/** Smallest top-up we accept, in USD. */
export const TOPUP_MIN_USD = 5;

/** Largest single top-up, in USD. Above this, invoices belong with a human. */
export const TOPUP_MAX_USD = 2000;

/** The wallet ledger stores four decimals; we charge in whole cents. */
export const TOPUP_MAX_DECIMALS = 2;

/** Prefix identifying a wallet top-up among other Flutterwave charges. */
export const TOPUP_TX_PREFIX = "FLW_WALLETTOPUP_";

export type TopupValidation =
  { ok: true; amountUsd: number } | { ok: false; error: string };

/**
 * Validate a client-supplied top-up amount.
 *
 * Rejects rather than coerces: "20abc" is not 20, and 20.005 is not a
 * chargeable amount. A silent coercion here is how a caller pays one figure
 * and is credited another.
 */
export function validateTopupAmount(value: unknown): TopupValidation {
  if (value === null || value === undefined || value === "")
    return { ok: false, error: "amount_usd is required" };

  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(amount))
    return { ok: false, error: "amount_usd must be a number" };
  if (amount <= 0) return { ok: false, error: "amount_usd must be positive" };
  if (amount < TOPUP_MIN_USD)
    return { ok: false, error: `Minimum top-up is $${TOPUP_MIN_USD}` };
  if (amount > TOPUP_MAX_USD)
    return { ok: false, error: `Maximum top-up is $${TOPUP_MAX_USD}` };

  // 20.001 would be truncated to 20 by the ledger and the caller would pay
  // a amount they are not credited for.
  const cents = amount * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-9)
    return {
      ok: false,
      error: `amount_usd may have at most ${TOPUP_MAX_DECIMALS} decimals`,
    };

  return { ok: true, amountUsd: Math.round(cents) / 100 };
}

/** True when the stored reference belongs to this module. */
export function isWalletTopupRef(ref: unknown): ref is string {
  return typeof ref === "string" && ref.startsWith(TOPUP_TX_PREFIX);
}

/**
 * Build a reference that both names the purpose and stays unique per attempt.
 * The payment provider requires uniqueness; the prefix lets the webhook route
 * the charge without trusting anything else in the payload.
 */
export function buildTopupTxRef(userId: string, now = Date.now()): string {
  const user = (userId ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `${TOPUP_TX_PREFIX}${user}_${now}`;
}

export type CreditDecision =
  { credit: true; amountUsd: number } | { credit: false; reason: string };

/**
 * Decide whether a settled charge should credit the wallet, given what we
 * asked for and what the provider says it collected.
 *
 * The provider's figure is authoritative only if it matches what was quoted:
 * a charge in another currency, or for another amount, is not silently
 * converted or partially credited. It is refused for a human to reconcile.
 */
export function decideCredit(input: {
  expectedUsd: unknown;
  paidAmount: unknown;
  paidCurrency: unknown;
  expectedCurrency?: string;
}): CreditDecision {
  const currency = String(input.expectedCurrency ?? "USD").toUpperCase();
  const paidCurrency = String(input.paidCurrency ?? "").toUpperCase();
  if (paidCurrency !== currency)
    return {
      credit: false,
      reason: `Settled in ${paidCurrency || "an unknown currency"}, expected ${currency}`,
    };

  const expected = Number(input.expectedUsd);
  const paid = Number(input.paidAmount);
  if (!Number.isFinite(expected) || expected <= 0)
    return { credit: false, reason: "Quoted amount is missing" };
  if (!Number.isFinite(paid) || paid <= 0)
    return { credit: false, reason: "Settled amount is missing" };

  // Providers settle whole cents; a half-cent difference is a rounding
  // artefact, a larger one is a different transaction.
  if (Math.abs(paid - expected) > 0.005)
    return {
      credit: false,
      reason: `Paid ${paid} ${currency} against a quote of ${expected} ${currency}`,
    };

  return { credit: true, amountUsd: Math.round(expected * 100) / 100 };
}
