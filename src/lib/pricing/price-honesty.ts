// What the price book actually contains, said in words.
//
// The snapshot behind price-verification.json is generated from the live book,
// so its counts are the real thing rather than a marketing number. This module
// turns those counts into sentences a visitor can act on, and it refuses to
// pretend: a market with no record says so, and a snapshot past its freshness
// window says that too.

import {
  PRICE_VERIFICATION_SCANNED_AT,
  getMarketPriceVerification,
  type MarketPriceVerification,
} from "@/lib/international/price-verification";

/** Past this many days, the coverage snapshot itself is old enough to say so. */
export const SNAPSHOT_STALE_DAYS = 45;

export interface MarketCoverage extends MarketPriceVerification {
  marketCode: string;
  /** Days since the snapshot was taken. */
  ageDays: number;
  /** True when the snapshot is older than SNAPSHOT_STALE_DAYS. */
  snapshotStale: boolean;
  /** One honest sentence about this market's prices. */
  sentence: string;
  /** Short label for a badge. */
  status: "local" | "partial" | "reference_only" | "unrecorded";
  statusLabel: string;
}

export function snapshotAgeDays(now: number = Date.now()): number {
  const taken = Date.parse(PRICE_VERIFICATION_SCANNED_AT);
  if (!Number.isFinite(taken)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now - taken) / 86_400_000));
}

export function snapshotDate(): string {
  return PRICE_VERIFICATION_SCANNED_AT.slice(0, 10);
}

export function isSnapshotStale(now: number = Date.now()): boolean {
  return snapshotAgeDays(now) > SNAPSHOT_STALE_DAYS;
}

function classify(
  entry: MarketPriceVerification,
): Pick<MarketCoverage, "status" | "statusLabel"> {
  if (entry.verified) {
    return { status: "local", statusLabel: "Local prices" };
  }
  if (entry.local_verified > 0) {
    return { status: "partial", statusLabel: "Partly local" };
  }
  return { status: "reference_only", statusLabel: "Reference only" };
}

function sentenceFor(
  marketCode: string,
  entry: MarketPriceVerification | null,
  ageDays: number,
): string {
  if (!entry) {
    return `No local price coverage is recorded for ${marketCode} yet, so estimates use the reference book until prices are reported for it.`;
  }
  const parts: string[] = [
    `${entry.local_verified} of ${entry.total} prices for ${marketCode} are local`,
  ];
  if (entry.fx_reference > 0) {
    parts.push(`${entry.fx_reference} are converted at a dated exchange rate`);
  }
  if (entry.stale > 0) {
    parts.push(`${entry.stale} are older than the freshness window`);
  }
  const core = parts.join(", ");
  const closing = entry.verified
    ? `last checked ${snapshotDate()}.`
    : `so treat totals as indicative until a supplier confirms them.`;
  const ageing =
    ageDays > SNAPSHOT_STALE_DAYS
      ? ` Coverage data is ${ageDays} days old.`
      : "";
  return `${core}, ${closing}${ageing}`;
}

export function coverageFor(
  marketCode: string | null | undefined,
  now: number = Date.now(),
): MarketCoverage | null {
  if (!marketCode) return null;
  const code = marketCode.toUpperCase();
  const ageDays = snapshotAgeDays(now);
  const entry = getMarketPriceVerification(code);
  if (!entry) {
    return {
      marketCode: code,
      total: 0,
      local_verified: 0,
      fx_reference: 0,
      stale: 0,
      verified: false,
      ageDays,
      snapshotStale: ageDays > SNAPSHOT_STALE_DAYS,
      sentence: sentenceFor(code, null, ageDays),
      status: "unrecorded",
      statusLabel: "No local prices",
    };
  }
  return {
    marketCode: code,
    ...entry,
    ageDays,
    snapshotStale: ageDays > SNAPSHOT_STALE_DAYS,
    sentence: sentenceFor(code, entry, ageDays),
    ...classify(entry),
  };
}

export function coverageList(
  marketCodes: readonly string[],
  now: number = Date.now(),
): MarketCoverage[] {
  return marketCodes
    .map((code) => coverageFor(code, now))
    .filter((entry): entry is MarketCoverage => entry !== null);
}
