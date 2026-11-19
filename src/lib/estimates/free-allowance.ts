/**
 * The free saved-estimate allowance.
 *
 * A signed-out visitor can save an estimate on this device: the row is bound to
 * their client hash, so their work survives a reload without an account. The
 * allowance is deliberately small and stated up front, because the failure it
 * prevents is a visitor doing real work and losing it at the save.
 *
 * The number is mirrored in the saved_estimate_allowances table, which the
 * database trigger reads. This constant exists so the interface can say what the
 * allowance is before the save fails; the trigger stays the authority.
 */

export const FREE_DEVICE_ESTIMATE_LIMIT = 2;

/** The database raises this prefix when the allowance is spent. */
const LIMIT_MESSAGE_PREFIX = "Saved estimate allowance reached";

export interface SavedEstimateAllowanceStatus {
  used: number;
  limit: number;
  remaining: number;
  /** True when a further save would be refused. */
  exhausted: boolean;
  /** Plain sentence for the interface, naming the allowance. */
  message: string;
}

export interface SavedEstimateErrorClassification {
  /** True only when the database refused the save for the allowance. */
  limited: boolean;
  limit: number;
  message: string;
  /** What the visitor can do next; empty when the error is unrelated. */
  nextStep: string;
}

export function savedEstimateAllowanceStatus(
  used: number,
  limit: number = FREE_DEVICE_ESTIMATE_LIMIT,
): SavedEstimateAllowanceStatus {
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : FREE_DEVICE_ESTIMATE_LIMIT;
  const safeUsed = Number.isFinite(used) && used > 0 ? Math.floor(used) : 0;
  const remaining = Math.max(0, safeLimit - safeUsed);
  return {
    used: safeUsed,
    limit: safeLimit,
    remaining,
    exhausted: remaining === 0,
    message:
      remaining === 0
        ? `All ${safeLimit} saved estimates on this device are in use. Delete one, or sign in to keep more.`
        : `${remaining} of ${safeLimit} saved estimates left on this device. Sign in to keep them across devices.`,
  };
}

/**
 * Reads a database error and says whether it was the allowance.
 *
 * Every other failure is passed through untouched: a network error is not a
 * spent allowance, and telling a visitor to delete their work when the request
 * merely failed would be a lie that costs them data.
 */
export function classifySavedEstimateError(
  message: string | null | undefined,
  limit: number = FREE_DEVICE_ESTIMATE_LIMIT,
): SavedEstimateErrorClassification {
  const text = (message ?? "").trim();
  if (!text.startsWith(LIMIT_MESSAGE_PREFIX)) {
    return { limited: false, limit, message: text, nextStep: "" };
  }
  return {
    limited: true,
    limit,
    message: `You can keep ${limit} saved estimates on this device.`,
    nextStep: "Delete one of your saved estimates, or sign in to keep more.",
  };
}
