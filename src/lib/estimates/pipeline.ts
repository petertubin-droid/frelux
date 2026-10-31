import type { DbClientEstimate } from "@/types/database";

/**
 * The commercial side of a client estimate: once a quote has been built and
 * sent, the question stops being "what does this cost" and becomes "where is it
 * and is the client going to answer". These helpers answer that from the row a
 * quote already stores, without touching the calculation engine.
 *
 * Everything here is a pure function of the stored estimate plus a clock, so the
 * numbers on screen can be checked against the record they came from.
 */

export type QuoteStage = DbClientEstimate["status"];

export const STAGE_ORDER: QuoteStage[] = [
  "draft",
  "sent",
  "viewed",
  "approved",
  "changes_requested",
  "expired",
];

/** Stages where money is still with the client rather than decided. */
export const OPEN_STAGES: QuoteStage[] = ["sent", "viewed"];

export const STAGE_LABELS: Record<QuoteStage, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  changes_requested: "Changes requested",
  expired: "Expired",
};

/**
 * How long a sent quote may sit before it is worth chasing. Three days is the
 * point where a quote is old enough that the client has probably read it and not
 * old enough that chasing reads as pressure.
 */
export const FOLLOW_UP_AFTER_DAYS = 3;

const MS_PER_DAY = 86_400_000;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days elapsed, floored at zero so a clock skew never reads as negative. */
export function daysSince(
  value: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY));
}

/**
 * The date the quote stops being an offer. Validity is counted from when the
 * client first had it, which is the send date, falling back to creation for a
 * quote that was never shared.
 */
export function quoteExpiryDate(
  estimate: Pick<
    DbClientEstimate,
    "validity_days" | "shared_at" | "created_at"
  >,
): Date | null {
  const start = parseDate(estimate.shared_at) ?? parseDate(estimate.created_at);
  if (!start) return null;
  const days = Number.isFinite(estimate.validity_days)
    ? Math.max(0, estimate.validity_days)
    : 0;
  return new Date(start.getTime() + days * MS_PER_DAY);
}

export function daysUntilExpiry(
  estimate: Pick<
    DbClientEstimate,
    "validity_days" | "shared_at" | "created_at" | "status"
  >,
  now: Date = new Date(),
): number | null {
  if (estimate.status === "approved" || estimate.status === "changes_requested")
    return null;
  const expiry = quoteExpiryDate(estimate);
  if (!expiry) return null;
  // Rounded up, so a quote that lapses this afternoon still reads as zero days
  // left rather than as one day gone.
  const days = Math.ceil((expiry.getTime() - now.getTime()) / MS_PER_DAY);
  // Ceil returns negative zero for a lapse inside the current day; report 0.
  return days === 0 ? 0 : days;
}

/**
 * A quote is stale when it is still open and nothing has happened for the follow
 * up window. The clock runs from the last client touch, so a quote the client
 * opened yesterday is not chased today.
 */
export function needsFollowUp(
  estimate: Pick<
    DbClientEstimate,
    "status" | "shared_at" | "viewed_at" | "created_at"
  >,
  now: Date = new Date(),
): boolean {
  if (!OPEN_STAGES.includes(estimate.status)) return false;
  // The row records no separate send timestamp: sharing the quote is the send.
  const lastTouch =
    estimate.viewed_at ?? estimate.shared_at ?? estimate.created_at;
  const elapsed = daysSince(lastTouch, now);
  return elapsed !== null && elapsed >= FOLLOW_UP_AFTER_DAYS;
}

export interface CurrencyTotals {
  currency: string;
  open: number;
  approved: number;
  draft: number;
  openCount: number;
  approvedCount: number;
  draftCount: number;
}

export interface QuoteSummary {
  totalQuotes: number;
  byStage: Record<QuoteStage, number>;
  /** One entry per currency. Values are never added across currencies. */
  currencies: CurrencyTotals[];
  /** Quotes the client has answered: approved or sent back for changes. */
  decidedCount: number;
  acceptedCount: number;
  /** approved / decided. Null until a client has actually answered something. */
  acceptanceRate: number | null;
  followUp: DbClientEstimate[];
  expiringSoon: DbClientEstimate[];
  openCount: number;
}

function emptyStageCounts(): Record<QuoteStage, number> {
  return {
    draft: 0,
    sent: 0,
    viewed: 0,
    approved: 0,
    changes_requested: 0,
    expired: 0,
  };
}

function totalsFor(currency: string): CurrencyTotals {
  return {
    currency,
    open: 0,
    approved: 0,
    draft: 0,
    openCount: 0,
    approvedCount: 0,
    draftCount: 0,
  };
}

/**
 * Roll a user's quotes into the numbers a contractor actually acts on: what is
 * still open, what was accepted, how often clients say yes, and which quotes
 * have gone quiet.
 */
export function summariseQuotes(
  estimates: DbClientEstimate[],
  now: Date = new Date(),
): QuoteSummary {
  const byStage = emptyStageCounts();
  const byCurrency = new Map<string, CurrencyTotals>();
  const followUp: DbClientEstimate[] = [];
  const expiringSoon: DbClientEstimate[] = [];

  for (const estimate of estimates) {
    const stage = estimate.status;
    byStage[stage] = (byStage[stage] ?? 0) + 1;

    const currency = (estimate.currency || "NGN").toUpperCase();
    const totals = byCurrency.get(currency) ?? totalsFor(currency);
    const amount = Number.isFinite(estimate.grand_total)
      ? estimate.grand_total
      : 0;

    if (stage === "approved") {
      totals.approved += amount;
      totals.approvedCount += 1;
    } else if (stage === "draft") {
      totals.draft += amount;
      totals.draftCount += 1;
    } else if (OPEN_STAGES.includes(stage)) {
      totals.open += amount;
      totals.openCount += 1;
    }
    byCurrency.set(currency, totals);

    if (needsFollowUp(estimate, now)) followUp.push(estimate);

    const remaining = daysUntilExpiry(estimate, now);
    if (OPEN_STAGES.includes(stage) && remaining !== null && remaining <= 3) {
      expiringSoon.push(estimate);
    }
  }

  const decidedCount = byStage.approved + byStage.changes_requested;
  const acceptedCount = byStage.approved;
  const currencies = [...byCurrency.values()].sort((a, b) => b.open - a.open);
  const openCount = byStage.sent + byStage.viewed;

  return {
    totalQuotes: estimates.length,
    byStage,
    currencies,
    decidedCount,
    acceptedCount,
    acceptanceRate: decidedCount > 0 ? acceptedCount / decidedCount : null,
    followUp: followUp.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    expiringSoon: expiringSoon.sort((a, b) => {
      const left = daysUntilExpiry(a, now) ?? 0;
      const right = daysUntilExpiry(b, now) ?? 0;
      return left - right;
    }),
    openCount,
  };
}

export type StageFilter = QuoteStage | "all" | "open";

export interface QuoteFilterOptions {
  stage: StageFilter;
  search?: string;
}

/** Filter for the pipeline list. Search matches number, title and client name. */
export function filterQuotes<T extends DbClientEstimate>(
  estimates: T[],
  options: QuoteFilterOptions,
): T[] {
  const needle = (options.search ?? "").trim().toLowerCase();
  return estimates.filter((estimate) => {
    if (options.stage === "open" && !OPEN_STAGES.includes(estimate.status))
      return false;
    if (
      options.stage !== "all" &&
      options.stage !== "open" &&
      estimate.status !== options.stage
    ) {
      return false;
    }
    if (!needle) return true;
    return (
      estimate.estimate_number.toLowerCase().includes(needle) ||
      estimate.title.toLowerCase().includes(needle) ||
      (estimate.client_name ?? "").toLowerCase().includes(needle)
    );
  });
}
