// Price freshness, stated plainly. An estimate is only as good as the date its
// prices were last checked, and in Nigerian material markets a month is enough
// for cement to move. Nothing here guesses: if the rows carry no usable date,
// the summary is "unknown" and the UI stays quiet rather than reassuring anyone.

export type FreshnessLevel = "fresh" | "recent" | "stale" | "unknown";

/** How a price row is timestamped. Both columns exist on material_prices. */
export interface PriceStampRow {
  updated_at?: string | null;
  created_at?: string | null;
  last_updated_via?: "api" | "crowdsourced" | "manual" | null;
}

export interface FreshnessSummary {
  level: FreshnessLevel;
  /** Most recent update across the priced rows. */
  latest: Date | null;
  /** Oldest update, which is the one that limits trust in the estimate. */
  oldest: Date | null;
  /** Age of the oldest price in whole days. */
  daysOld: number | null;
  rowCount: number;
  /** Sources present, most common first, for an honest attribution line. */
  sources: string[];
}

/** Thresholds in days. Thirty is the working month for local material prices. */
export const FRESH_DAYS = 30;
export const RECENT_DAYS = 90;

const SOURCE_LABELS: Record<string, string> = {
  api: "supplier feeds",
  crowdsourced: "community reports",
  manual: "team entry",
};

const MS_PER_DAY = 86_400_000;

function parseStamp(row: PriceStampRow): Date | null {
  for (const candidate of [row.updated_at, row.created_at]) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Summarises freshness from the rows an estimate actually used. Rows without a
 * parseable date are counted but do not invent a date, so a table of undated
 * rows reports unknown rather than fresh.
 */
export function summariseFreshness(
  rows: PriceStampRow[],
  now: Date = new Date(),
): FreshnessSummary {
  const stamps: Date[] = [];
  const sourceCounts = new Map<string, number>();

  rows.forEach((row) => {
    const stamp = parseStamp(row);
    if (stamp) stamps.push(stamp);
    const via = row.last_updated_via;
    if (via) sourceCounts.set(via, (sourceCounts.get(via) ?? 0) + 1);
  });

  const sources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => SOURCE_LABELS[key] ?? key);

  if (stamps.length === 0) {
    return {
      level: "unknown",
      latest: null,
      oldest: null,
      daysOld: null,
      rowCount: rows.length,
      sources,
    };
  }

  const latest = new Date(Math.max(...stamps.map((d) => d.getTime())));
  const oldest = new Date(Math.min(...stamps.map((d) => d.getTime())));
  const daysOld = Math.max(
    0,
    Math.floor((now.getTime() - oldest.getTime()) / MS_PER_DAY),
  );

  const level: FreshnessLevel =
    daysOld <= FRESH_DAYS
      ? "fresh"
      : daysOld <= RECENT_DAYS
        ? "recent"
        : "stale";

  return { level, latest, oldest, daysOld, rowCount: rows.length, sources };
}

/** ISO date in the form people read: 14 October 2026. */
export function formatStampDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * One sentence a site engineer can act on, plus a second line only when the
 * number is old enough to need checking. No em dashes, no hedging.
 */
export function freshnessMessage(summary: FreshnessSummary): string {
  if (
    summary.level === "unknown" ||
    !summary.oldest ||
    summary.daysOld === null
  ) {
    return "Prices in this estimate carry no update date, so treat the total as a guide only.";
  }
  const date = formatStampDate(summary.oldest);
  const source = summary.sources[0];
  const attribution = source ? ` from ${source}` : "";
  if (summary.daysOld === 0) {
    return `Prices${attribution} were last updated today (${date}).`;
  }
  if (summary.daysOld === 1) {
    return `Prices${attribution} were last updated yesterday (${date}).`;
  }
  return `Prices${attribution} were last updated ${summary.daysOld} days ago (${date}).`;
}

/** True when the total needs a verification prompt beside it. */
export function needsVerification(summary: FreshnessSummary): boolean {
  return summary.level === "stale" || summary.level === "unknown";
}

/** The shape fetchMarketPriceBook returns, narrowed to what dating needs. */
export interface PriceBookLike {
  byRef?: Map<string, number>;
  asOf?: Map<string, string>;
  stale?: Set<string>;
  verified?: Set<string>;
}

export interface PriceBookSummary {
  level: FreshnessLevel;
  pricedCount: number;
  staleCount: number;
  verifiedCount: number;
  daysOld: number | null;
  oldest: Date | null;
}

/**
 * Dates a market price book. A book can hold prices yet no verification stamps
 * at all, and a book can hold prices that have outlived their freshness window;
 * both cases are reported as they are instead of being rounded up to "current".
 */
export function summarisePriceBook(
  book: PriceBookLike,
  now: Date = new Date(),
): PriceBookSummary {
  const stamps: Date[] = [];
  // Older callers and cached shapes may hand over a partial book. Reading it
  // defensively keeps a missing stamp map from taking the price list down with it.
  (book.asOf ?? new Map<string, string>()).forEach((value) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) stamps.push(parsed);
  });

  const pricedCount = book.byRef?.size ?? 0;
  const staleCount = book.stale?.size ?? 0;
  const verifiedCount = book.verified?.size ?? 0;

  if (pricedCount === 0) {
    return {
      level: "unknown",
      pricedCount,
      staleCount,
      verifiedCount,
      daysOld: null,
      oldest: null,
    };
  }

  if (stamps.length === 0) {
    return {
      level: "unknown",
      pricedCount,
      staleCount,
      verifiedCount,
      daysOld: null,
      oldest: null,
    };
  }

  const oldest = new Date(Math.min(...stamps.map((d) => d.getTime())));
  const daysOld = Math.max(
    0,
    Math.floor((now.getTime() - oldest.getTime()) / MS_PER_DAY),
  );
  const level: FreshnessLevel =
    daysOld <= FRESH_DAYS
      ? "fresh"
      : daysOld <= RECENT_DAYS
        ? "recent"
        : "stale";

  return { level, pricedCount, staleCount, verifiedCount, daysOld, oldest };
}

/** Sentence for a price book summary, including how much of it is worn. */
export function priceBookMessage(summary: PriceBookSummary): string {
  if (summary.pricedCount === 0) {
    return "No priced materials are available for this market yet, so totals cannot be trusted.";
  }
  if (!summary.oldest || summary.daysOld === null) {
    return `${summary.pricedCount} priced materials in this market, none of them carrying a verification date.`;
  }
  const base =
    summary.daysOld === 0
      ? `This market's prices were last verified today (${formatStampDate(summary.oldest)}).`
      : `This market's prices were last verified ${summary.daysOld} days ago (${formatStampDate(summary.oldest)}).`;
  if (summary.staleCount === 0) return base;
  return `${base} ${summary.staleCount} of ${summary.pricedCount} are past their freshness window, so treat those lines as last known prices rather than current quotes.`;
}
