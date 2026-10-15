/**
 * Regional data-quality + bias assessment — FRELUX engine #3
 * "Predictive analytics & AI" milestone 3 (2026-10-15).
 *
 * Deterministic assessment of a market's outcome dataset BEFORE
 * any predictive claim may be made from it. Every verdict comes
 * with specific, checkable reasons — no opaque score.
 *
 * Checks per market:
 *  - SAMPLE:  enough labelled records for the requested label.
 *  - RECENCY: newest completion within RECENCY_MAX_MONTHS;
 *    older data is disclosed as stale, not silently used.
 *  - SPAN:   history spans at least SPAN_MIN_MONTHS of completions
 *            (a single month of projects is a snapshot, not a trend).
 *  - COMPLETENESS: share of records carrying the requested label.
 *  - TYPE CONCENTRATION: no single project type may dominate the
 *    sample (TYPE_DOMINANCE_MAX); a one-type sample cannot support
 *    cross-type claims.
 *  - SIZE SPREAD: labelled records must cover more than one
 *    distinct size (a size-collapsed sample is flagged).
 *
 * Verdicts:
 *  - "adequate"            — every gate passed; predictive use allowed
 *  - "insufficient_data"   — below sample/completeness gates
 *  - "stale"              — usable history exists but is outdated;
 *                            must be disclosed, never hidden
 *  - "biased_sample"      — concentration/spread gates failed;
 *                            usable only with a bias disclosure
 * Verdict composition: adequate requires ALL gates; failures
 * combine into the disclosed reasons list. A dataset that is both
 * stale and biased reports both.
 */

import type { ProjectOutcomeRecord } from "./outcomes";
import type { OutcomeLabelKey } from "./backtest";

export const MIN_SAMPLE = 20;
export const RECENCY_MAX_MONTHS = 24;
export const SPAN_MIN_MONTHS = 6;
export const MIN_COMPLETENESS = 0.8;
export const TYPE_DOMINANCE_MAX = 0.8;

export type DataQualityVerdict =
  | "adequate"
  | "insufficient_data"
  | "stale"
  | "biased_sample";

export interface DataQualityFinding {
  check: string;
  passed: boolean;
  detail: string;
}

export interface MarketDataQualityReport {
  market_code: string;
  label: OutcomeLabelKey;
  verdict: DataQualityVerdict;
  sample_size: number;
  labelled_size: number;
  newest_completion: string | null;
  oldest_completion: string | null;
  span_months: number;
  completeness: number;
  dominant_type: { type: string; share: number } | null;
  distinct_sizes: number;
  findings: DataQualityFinding[];
  disclosure: string;
}

function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth())
  );
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Assess one market's outcome dataset for one label. Pure and
 * deterministic; `now` is injectable for tests and freshness
 * pinning. Unknown markets are refused (they can have no dataset).
 */
export function assessMarketDataQuality(input: {
  market_code: string;
  label: OutcomeLabelKey;
  records: ProjectOutcomeRecord[];
  now?: Date;
}): MarketDataQualityReport {
  const { market_code, label } = input;
  const now = input.now ?? new Date("2026-10-15T00:00:00Z");
  const records = input.records.filter(
    (r) => r.market_code === market_code,
  );

  const labelled = records.filter(
    (r) => r[label] !== null && r[label] !== undefined,
  );
  const completeness = records.length > 0 ? labelled.length / records.length : 0;

  let newest: string | null = null;
  let oldest: string | null = null;
  let span_months = 0;
  for (const r of records) {
    if (!newest || r.actual_end_date > newest) newest = r.actual_end_date;
    if (!oldest || r.actual_end_date < oldest) oldest = r.actual_end_date;
  }
  if (newest && oldest) {
    span_months = monthsBetween(parseDate(oldest), parseDate(newest));
  }

  // Type concentration over labelled records.
  const typeCounts = new Map<string, number>();
  for (const r of labelled) {
    typeCounts.set(r.project_type, (typeCounts.get(r.project_type) ?? 0) + 1);
  }
  let dominantType: { type: string; share: number } | null = null;
  if (labelled.length > 0) {
    const [type, count] = [...typeCounts.entries()].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
    )[0];
    dominantType = { type, share: count / labelled.length };
  }

  const distinctSizes = new Set(
    labelled.map((r) => (r.size_m2 ?? 0)).filter((s) => s > 0),
  ).size;

  const findings: DataQualityFinding[] = [];
  const recencyMonths =
    newest !== null ? monthsBetween(parseDate(newest), now) : Infinity;

  findings.push({
    check: "sample",
    passed: labelled.length >= MIN_SAMPLE,
    detail:
      labelled.length >= MIN_SAMPLE
        ? `${labelled.length} labelled ${label} records (minimum ${MIN_SAMPLE}).`
        : `${labelled.length} labelled ${label} records — below the minimum of ${MIN_SAMPLE} for any predictive use.`,
  });
  findings.push({
    check: "recency",
    passed: recencyMonths <= RECENCY_MAX_MONTHS,
    detail:
      newest === null
        ? "No completions recorded."
        : recencyMonths <= RECENCY_MAX_MONTHS
          ? `Newest completion ${newest}, ${recencyMonths} month(s) old (limit ${RECENCY_MAX_MONTHS}).`
          : `Newest completion ${newest} is ${recencyMonths} month(s) old — beyond the ${RECENCY_MAX_MONTHS}-month limit; the dataset is stale.`,
  });
  findings.push({
    check: "span",
    passed: span_months >= SPAN_MIN_MONTHS,
    detail:
      records.length === 0
        ? "No completions recorded."
        : `Completions span ${span_months} month(s) (minimum ${SPAN_MIN_MONTHS} for a trend, not a snapshot).`,
  });
  findings.push({
    check: "completeness",
    passed: records.length > 0 && completeness >= MIN_COMPLETENESS,
    detail:
      records.length === 0
        ? "No records at all."
        : `${Math.round(completeness * 100)}% of ${records.length} records carry the ${label} label (minimum ${Math.round(MIN_COMPLETENESS * 100)}%).`,
  });
  findings.push({
    check: "type_concentration",
    passed:
      labelled.length === 0 ||
      (dominantType !== null && dominantType.share <= TYPE_DOMINANCE_MAX),
    detail:
      dominantType === null
        ? "No labelled records."
        : `Dominant project type "${dominantType.type}" is ${Math.round(dominantType.share * 100)}% of the labelled sample (limit ${Math.round(TYPE_DOMINANCE_MAX * 100)}%).`,
  });
  findings.push({
    check: "size_spread",
    passed: labelled.length === 0 || distinctSizes > 1,
    detail:
      labelled.length === 0
        ? "No labelled records."
        : `${distinctSizes} distinct recorded size(s) in the labelled sample${distinctSizes <= 1 ? " — size-collapsed; no cross-size claim is supported" : ""}.`,
  });

  const sampleOk = findings[0].passed;
  const completenessOk = findings[3].passed;
  const recencyOk = findings[1].passed;
  const biasOk = findings[4].passed && findings[5].passed && findings[2].passed;

  let verdict: DataQualityVerdict;
  if (!sampleOk || !completenessOk) {
    verdict = "insufficient_data";
  } else if (!recencyOk && !biasOk) {
    verdict = "stale"; // stale dominates the disclosure; bias also listed
  } else if (!recencyOk) {
    verdict = "stale";
  } else if (!biasOk) {
    verdict = "biased_sample";
  } else {
    verdict = "adequate";
  }

  const failed = findings.filter((f) => !f.passed);
  const disclosure =
    verdict === "adequate"
      ? `${market_code} ${label}: ${labelled.length} labelled records across ${span_months} month(s) pass every data-quality gate (sample, recency, span, completeness, type concentration, size spread). Predictive use is supported; the back-test report remains the source of measured accuracy.`
      : `${market_code} ${label}: NOT adequate for predictive claims — ${failed.map((f) => f.check).join(", ")} failed. ${failed.map((f) => f.detail).join(" ")}`;

  return {
    market_code,
    label,
    verdict,
    sample_size: records.length,
    labelled_size: labelled.length,
    newest_completion: newest,
    oldest_completion: oldest,
    span_months,
    completeness,
    dominant_type: dominantType,
    distinct_sizes: distinctSizes,
    findings,
    disclosure,
  };
}
