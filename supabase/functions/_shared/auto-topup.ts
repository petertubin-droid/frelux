// =========================================================
// Auto top-up rules, kept pure so they can be tested without
// a provider, a database or a network.
//
// The dangerous direction of failure here is charging. A rule
// that wrongly says "charge" moves a stranger's money, so
// every uncertain state resolves to no charge with a reason
// that can be shown to the owner.
// =========================================================

/** Smallest automatic charge. Below this, card fees eat the top-up. */
export const AUTOTOPUP_MIN_USD = 5;

/**
 * Largest single automatic charge. Repeated unattended charges should be
 * small: an owner who wants two hundred dollars at once can do it by hand
 * and look at the amount while doing so.
 */
export const AUTOTOPUP_MAX_USD = 200;

/** Minimum gap between attempts, so a failed sweep cannot hammer a card. */
export const AUTOTOPUP_COOLDOWN_MINUTES = 10;

/**
 * After this many consecutive declines the owner's auto top-up is switched
 * off. A card that keeps failing is a card that has been cancelled, and
 * retrying it is how merchants lose their processing reputation.
 */
export const AUTOTOPUP_MAX_CONSECUTIVE_FAILURES = 2;

/** Version of the consent wording shown when auto top-up is enabled. */
export const AUTOTOPUP_CONSENT_VERSION = "autotopup-v1";

export type PrefValidation =
  | { ok: true; thresholdUsd: number; amountUsd: number }
  | { ok: false; error: string };

/**
 * Validate the owner's chosen threshold and amount.
 *
 * The threshold must sit below the amount, otherwise one charge can land the
 * balance below the threshold again and the next sweep charges immediately,
 * turning a safety net into a subscription.
 */
export function validateAutoTopupPrefs(input: {
  thresholdUsd: unknown;
  amountUsd: unknown;
}): PrefValidation {
  const threshold = Number(input.thresholdUsd);
  const amount = Number(input.amountUsd);

  if (!Number.isFinite(threshold) || threshold < 0)
    return {
      ok: false,
      error: "threshold_usd must be a number of zero or more",
    };
  if (!Number.isFinite(amount))
    return { ok: false, error: "amount_usd must be a number" };
  if (amount < AUTOTOPUP_MIN_USD)
    return {
      ok: false,
      error: `amount_usd must be at least ${AUTOTOPUP_MIN_USD}`,
    };
  if (amount > AUTOTOPUP_MAX_USD)
    return {
      ok: false,
      error: `amount_usd must be at most ${AUTOTOPUP_MAX_USD} for an automatic charge`,
    };
  if (Number(amount.toFixed(2)) !== amount)
    return {
      ok: false,
      error: "amount_usd must not have more than two decimals",
    };
  if (Number(threshold.toFixed(2)) !== threshold)
    return {
      ok: false,
      error: "threshold_usd must not have more than two decimals",
    };
  if (threshold >= amount)
    return {
      ok: false,
      error:
        "threshold_usd must be below amount_usd, or one charge would retrigger immediately",
    };

  return { ok: true, thresholdUsd: threshold, amountUsd: amount };
}

export interface ChargeDecisionInput {
  enabled: boolean;
  consentAt: string | null;
  cardId: string | null;
  balanceUsd: number;
  thresholdUsd: number;
  consecutiveFailures: number;
  lastAttemptAt: string | null;
  pendingAttempt: boolean;
  now: Date;
}

export type ChargeDecision =
  { charge: true } | { charge: false; reason: string };

/**
 * Decide whether a wallet should be topped up right now.
 *
 * Reasons are written for an owner to read, not for a log file: they end up
 * in the portal when auto top-up is quietly not working.
 */
export function shouldCharge(input: ChargeDecisionInput): ChargeDecision {
  if (!input.enabled) return { charge: false, reason: "auto top-up is off" };
  if (!input.consentAt)
    return {
      charge: false,
      reason: "no consent recorded for automatic charges",
    };
  if (!input.cardId) return { charge: false, reason: "no saved card" };
  if (input.consecutiveFailures >= AUTOTOPUP_MAX_CONSECUTIVE_FAILURES)
    return {
      charge: false,
      reason: "switched off after repeated declines",
    };
  if (input.pendingAttempt)
    return { charge: false, reason: "a charge is already in progress" };
  if (!(input.balanceUsd < input.thresholdUsd))
    return { charge: false, reason: "balance is above the threshold" };
  if (input.lastAttemptAt) {
    const last = new Date(input.lastAttemptAt).getTime();
    const gapMinutes = (input.now.getTime() - last) / 60000;
    if (Number.isFinite(gapMinutes) && gapMinutes < AUTOTOPUP_COOLDOWN_MINUTES)
      return {
        charge: false,
        reason: `last attempt was less than ${AUTOTOPUP_COOLDOWN_MINUTES} minutes ago`,
      };
  }
  return { charge: true };
}

/**
 * Whether a provider response may be treated as money received. Only an
 * explicit success counts: pending, processing and unknown all mean the
 * wallet is not credited, because a wallet credited on a maybe is a wallet
 * credited twice once the webhook also arrives.
 */
export function isProviderSuccess(status: unknown): boolean {
  return (
    typeof status === "string" && status.trim().toLowerCase() === "successful"
  );
}
