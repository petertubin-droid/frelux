/**
 * Sync scheduler (Engine #11 — sync & offline-first)
 *
 * Deterministic planning logic for retrying the offline field
 * queue. No timers, no events, no globals inside this module:
 * the page supplies `now`, `online` and attempt history, and the
 * planner answers questions. That keeps every rule testable and
 * keeps the page honest about WHY a sync ran or did not run.
 *
 *  - Exponential backoff with jitter: 1 min, 2, 4, 8 … capped at
 *    30 min. Jitter is seeded deterministically from the capture
 *    id so tests (and repeated runs) are reproducible.
 *  - A sync runs when: auto_sync is enabled by the admin rules,
 *    the browser is online, the queue is non-empty, and either
 *    there is no previous attempt or the backoff window has
 *    elapsed. Manual Sync-now is never gated (the page decides).
 *  - Nothing here touches the network. The page calls
 *    syncFieldCaptures() itself and records the outcome.
 */

export const BACKOFF_BASE_MS = 60 * 1000;
export const BACKOFF_FACTOR = 2;
export const BACKOFF_CAP_MS = 30 * 60 * 1000;
/** ±20% jitter, seeded: never thundering-herd, still deterministic per id. */
const JITTER_FRACTION = 0.2;

export interface SyncHistory {
  /** consecutive failed runs since the last success (0 = none failed) */
  consecutiveFailures: number;
  /** ISO timestamp of the last attempted sync run (success or failure) */
  lastAttemptAt: string | null;
}

/** Deterministic jitter in [-0.2, +0.2] from an id string. */
function seededJitterFraction(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // map 32-bit hash to [-JITTER_FRACTION, +JITTER_FRACTION]
  const unit = (h % 1000) / 1000; // [0, 1)
  return (unit - 0.5) * 2 * JITTER_FRACTION;
}

/**
 * The raw backoff delay before jitter: 1 min, 2, 4, 8 … capped at
 * 30 min. Failure count 0 → no delay (immediately allowed).
 */
export function backoffDelayMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  const exp = BACKOFF_BASE_MS * Math.pow(BACKOFF_FACTOR, consecutiveFailures - 1);
  return Math.min(exp, BACKOFF_CAP_MS);
}

/**
 * Full delay including jitter for a given queue-capture id seed.
 * Deterministic: same id, same failures → same delay.
 */
export function nextAttemptDelayMs(
  consecutiveFailures: number,
  seed: string,
): number {
  const base = backoffDelayMs(consecutiveFailures);
  if (base === 0) return 0;
  const jittered = base * (1 + seededJitterFraction(seed));
  return Math.max(BACKOFF_BASE_MS / 2, Math.min(BACKOFF_CAP_MS, jittered));
}

/**
 * Honest next-attempt disclosure for the UI: "next auto-sync
 * attempt in ~4 minutes (after 2 failed attempts)".
 */
export function describeNextAttempt(
  consecutiveFailures: number,
  seed: string,
): string {
  if (consecutiveFailures <= 0) return "Auto-sync will run when connectivity returns";
  const ms = nextAttemptDelayMs(consecutiveFailures, seed);
  const minutes = Math.round(ms / 60000);
  return `Next auto-sync attempt in ~${minutes} minute${minutes === 1 ? "" : "s"} (after ${consecutiveFailures} failed ${consecutiveFailures === 1 ? "attempt" : "attempts"})`;
}

export interface AutoSyncDecisionInput {
  autoSync: boolean;
  online: boolean;
  queueCount: number;
  history: SyncHistory;
  /** id seed for the jittered delay (first queued capture id) */
  seed: string;
  now: Date;
}

export interface AutoSyncDecision {
  shouldSync: boolean;
  reason: string;
}

/**
 * Should an automatic sync run RIGHT NOW? Pure and total: every
 * refusal states its honest reason so the UI can show it.
 */
export function shouldAutoSync(
  input: AutoSyncDecisionInput,
): AutoSyncDecision {
  if (!input.autoSync) {
    return { shouldSync: false, reason: "Auto-sync is disabled by your admin configuration" };
  }
  if (!input.online) {
    return { shouldSync: false, reason: "You are offline; queued captures stay on this device" };
  }
  if (input.queueCount === 0) {
    return { shouldSync: false, reason: "Nothing to sync" };
  }
  if (!input.history.lastAttemptAt) {
    return { shouldSync: true, reason: "Connectivity is back and the queue has work" };
  }
  const last = new Date(input.history.lastAttemptAt).getTime();
  if (Number.isNaN(last)) {
    return { shouldSync: true, reason: "Previous attempt time unreadable; trying now" };
  }
  const wait = nextAttemptDelayMs(input.history.consecutiveFailures, input.seed);
  const elapsed = input.now.getTime() - last;
  if (elapsed < wait) {
    const remainingMin = Math.max(1, Math.round((wait - elapsed) / 60000));
    return {
      shouldSync: false,
      reason: `Waiting for retry backoff (~${remainingMin} minute${remainingMin === 1 ? "" : "s"} left)`,
    };
  }
  return { shouldSync: true, reason: "Backoff window elapsed; retrying queued captures" };
}
