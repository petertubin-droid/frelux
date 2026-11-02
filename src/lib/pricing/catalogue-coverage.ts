// What a supplier catalogue actually yields, in numbers an admin can check.
//
// Staged rows are not coverage. A market is only supplied when at least one
// staged product is tied to a Frelux material, so this module separates the
// rows that became prices from the rows that were set aside and why.

export type CoverageRow = {
  market: string;
  staged: number;
  mapped: number;
  awaiting_review: number;
  no_counterpart: number;
  bulk_listing: number;
  supplier_no_price: number;
  supplies_prices: boolean;
  last_seen: string | null;
};

export type CoverageTotals = {
  markets: CoverageRow[];
  staged: number;
  mapped: number;
  awaiting: number;
  decided: number;
  suppliesAny: boolean;
};

/** Adds the per-market rows into the totals the panel shows at the top. */
export function summariseCoverage(
  rows: readonly CoverageRow[],
): CoverageTotals {
  const markets = [...rows].sort((a, b) => b.staged - a.staged);
  const total = (pick: (row: CoverageRow) => number) =>
    markets.reduce((sum, row) => sum + (pick(row) || 0), 0);

  return {
    markets,
    staged: total((r) => r.staged),
    mapped: total((r) => r.mapped),
    awaiting: total((r) => r.awaiting_review),
    decided: total(
      (r) => r.no_counterpart + r.bulk_listing + r.supplier_no_price,
    ),
    suppliesAny: markets.some((r) => r.supplies_prices),
  };
}

/**
 * One sentence per market. A market with staged rows but no mapped product says
 * so plainly, because that is the state that must not be mistaken for coverage.
 */
export function coverageSentence(row: CoverageRow): string {
  const parts = [`${row.staged} staged`];
  parts.push(
    row.mapped > 0
      ? `${row.mapped} tied to a material`
      : "none tied to a material",
  );
  if (row.awaiting_review > 0)
    parts.push(`${row.awaiting_review} waiting on a decision`);
  const setAside =
    row.no_counterpart + row.bulk_listing + row.supplier_no_price;
  if (setAside > 0) parts.push(`${setAside} set aside`);
  return parts.join(", ");
}

export type ReasonRow = {
  match_status: string;
  rejection_reason: string | null;
};

export type ReasonGroup = { status: string; reason: string; count: number };

/**
 * Groups the set-aside rows by status and reason so the largest reason wins the
 * top of the list, which is usually the honest headline ("no cement in this
 * market's catalogue").
 */
export function groupReasons(rows: readonly ReasonRow[]): ReasonGroup[] {
  const seen = new Map<string, ReasonGroup>();
  rows.forEach((row) => {
    const reason = (row.rejection_reason ?? "").trim();
    if (!reason) return;
    const key = `${row.match_status}|${reason}`;
    const existing = seen.get(key);
    if (existing) existing.count += 1;
    else seen.set(key, { status: row.match_status, reason, count: 1 });
  });
  return [...seen.values()].sort((a, b) => b.count - a.count);
}
