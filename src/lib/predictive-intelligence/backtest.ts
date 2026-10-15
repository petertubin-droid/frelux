/**
 * Walk-forward back-test harness + calibration metrics with
 * uncertainty bounds — FRELUX engine #3 "Predictive analytics &
 * AI" milestone 2 (2026-10-15).
 *
 * Everything here is DETERMINISTIC: ordering, splits, quantiles.
 * No AI calls. The harness evaluates ANY predictor of an
 * outcome label over the historical project-outcome dataset with
 * a strict walk-forward protocol:
 *
 *  1. Records are ordered by actual_end_date (ties broken by id
 *     for determinism).
 *  2. A target is only predicted from records that completed
 *     STRICTLY BEFORE it — no future leaks.
 *  3. A prediction requires at least MIN_TRAIN earlier records
 *     with a non-null label; otherwise the target is SKIPPED and
 *     counted honestly (`skipped_insufficient_history`), never
 *     scored with invented numbers.
 *  4. Calibration is out-of-sample by construction: residuals
 *     are split chronologically at the midpoint; prediction
 *     intervals are built from the EARLIER half and their
 *     coverage is measured on the LATER half. Coverage is only
 *     reported when at least MIN_COVERAGE evaluation points
 *     exist.
 *
 * Uncertainty bounds are empirical residual quantiles — the
 * harness never claims a parametric distribution it did not
 * test.
 */

import type { ProjectOutcomeRecord } from "./outcomes";

export type OutcomeLabelKey = "delay_days" | "cost_overrun_pct";

/** Minimum earlier labelled records before any prediction is attempted. */
export const MIN_TRAIN = 10;

/** Minimum later-half residuals before interval coverage is reported. */
export const MIN_COVERAGE = 12;

export interface OutcomePrediction {
  prediction: number;
}

/**
 * A deterministic predictor: given the training records (all
 * strictly earlier completions) and the target's covariates,
 * predict the label. Must NOT mutate the arrays.
 */
export type OutcomePredictor<L extends OutcomeLabelKey> = (
  train: ProjectOutcomeRecord[],
  target: ProjectOutcomeRecord,
) => OutcomePrediction | null;

export interface BacktestPoint {
  target_id: string;
  actual: number;
  prediction: number;
  residual: number;
}

export interface CalibrationReport {
  /** Nominal central coverage of the interval. */
  nominal: 0.5 | 0.8;
  /** Bounds added to a prediction: [lower offset, upper offset]. */
  offsets: [number, number];
  /** Out-of-sample coverage actually achieved (0..1), when measurable. */
  coverage: number | null;
  /** Residuals the quantiles were calibrated on. */
  calibrated_on: number;
  /** Later-half residuals the coverage was measured on. */
  evaluated_on: number;
}

export interface BacktestReport {
  status: "ok" | "insufficient_data";
  reason?: string;
  label: OutcomeLabelKey;
  /** Targets scored. */
  scored: BacktestPoint[];
  /** Targets skipped because fewer than MIN_TRAIN labelled earlier records existed. */
  skipped_insufficient_history: number;
  /** Targets skipped because their label is an honest null. */
  skipped_unlabelled: number;
  /** Mean absolute error over scored targets. */
  mae: number | null;
  /** Root mean squared error over scored targets. */
  rmse: number | null;
  /** Mean signed residual: positive = systematic under-prediction. */
  bias: number | null;
  /** MAPE where the actual is non-zero; count of points it covers. */
  mape: { value: number; on: number } | null;
  calibrations: CalibrationReport[];
  disclosure: string;
}

/** Deterministic order: completion date, then record id. */
function ordered(records: ProjectOutcomeRecord[]): ProjectOutcomeRecord[] {
  return [...records].sort((a, b) => {
    if (a.actual_end_date !== b.actual_end_date) {
      return a.actual_end_date < b.actual_end_date ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Linear-interpolated quantile of a SORTED array (deterministic). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) {
    throw new RangeError("quantile of an empty array is undefined; refusing.");
  }
  if (!(q > 0 && q < 1)) {
    throw new RangeError(`quantile q must be in (0, 1); received ${q}.`);
  }
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Build a calibration report for one nominal coverage level.
 * Residuals are ordered by their chronological position; the
 * earlier half calibrates the interval, the later half measures
 * out-of-sample coverage.
 */
function calibrate(
  points: BacktestPoint[],
  nominal: 0.5 | 0.8,
): CalibrationReport {
  // points arrive in chronological walk-forward order already.
  const mid = Math.floor(points.length / 2);
  const calibration = points.slice(0, mid);
  const evaluation = points.slice(mid);
  const calResiduals = calibration
    .map((p) => p.residual)
    .sort((a, b) => a - b);
  const tail = (1 - nominal) / 2;
  const lower = quantile(calResiduals, tail);
  const upper = quantile(calResiduals, 1 - tail);
  let coverage: number | null = null;
  if (evaluation.length >= MIN_COVERAGE) {
    let inside = 0;
    for (const p of evaluation) {
      if (p.residual >= lower && p.residual <= upper) inside++;
    }
    coverage = inside / evaluation.length;
  }
  return {
    nominal,
    offsets: [lower, upper],
    coverage,
    calibrated_on: calibration.length,
    evaluated_on: evaluation.length,
  };
}

/**
 * Walk-forward back-test of a predictor over the outcome
 * dataset for one label. Deterministic; no I/O; no randomness.
 */
export function walkForwardBacktest<L extends OutcomeLabelKey>(input: {
  records: ProjectOutcomeRecord[];
  label: L;
  predictor: OutcomePredictor<L>;
}): BacktestReport {
  const { records, label, predictor } = input;
  const sorted = ordered(records);

  const scored: BacktestPoint[] = [];
  let skippedHistory = 0;
  let skippedUnlabelled = 0;

  let trainWindow: ProjectOutcomeRecord[] = [];
  for (const target of sorted) {
    const actual = target[label];
    if (actual === null || actual === undefined) {
      skippedUnlabelled++;
      trainWindow.push(target); // still history for later targets
      continue;
    }
    const labelledEarlier = trainWindow.filter(
      (r) => r[label] !== null && r[label] !== undefined,
    );
    if (labelledEarlier.length < MIN_TRAIN) {
      skippedHistory++;
      trainWindow.push(target);
      continue;
    }
    const out = predictor(trainWindow, target);
    if (out === null || !Number.isFinite(out.prediction)) {
      // A predictor that declines is counted, never faked.
      skippedHistory++;
      trainWindow.push(target);
      continue;
    }
    scored.push({
      target_id: target.id,
      actual,
      prediction: out.prediction,
      residual: actual - out.prediction,
    });
    trainWindow.push(target);
  }

  const base = {
    label,
    scored,
    skipped_insufficient_history: skippedHistory,
    skipped_unlabelled: skippedUnlabelled,
  };

  if (scored.length === 0) {
    return {
      ...base,
      status: "insufficient_data",
      reason: `No target could be scored: every record was skipped (labelled history below ${MIN_TRAIN}, unlabelled, or declined by the predictor). No metric is invented.`,
      mae: null,
      rmse: null,
      bias: null,
      mape: null,
      calibrations: [],
      disclosure:
        "Back-test not run: insufficient labelled walk-forward history. FRELUX reports no performance claim without evidence.",
    };
  }

  const n = scored.length;
  const mae = scored.reduce((s, p) => s + Math.abs(p.residual), 0) / n;
  const rmse = Math.sqrt(
    scored.reduce((s, p) => s + p.residual * p.residual, 0) / n,
  );
  const bias = scored.reduce((s, p) => s + p.residual, 0) / n;

  const nonZero = scored.filter((p) => p.actual !== 0);
  const mape =
    nonZero.length > 0
      ? {
          value:
            nonZero.reduce(
              (s, p) => s + Math.abs(p.residual / p.actual),
              0,
            ) / nonZero.length,
          on: nonZero.length,
        }
      : null;

  const calibrations: CalibrationReport[] = [];
  for (const nominal of [0.5, 0.8] as const) {
    // Calibration needs a non-empty earlier half; guard and skip
    // honestly when there is not enough chronology.
    if (Math.floor(n / 2) > 0) {
      calibrations.push(calibrate(scored, nominal));
    }
  }

  const coverageNote = calibrations[1]?.coverage;
  return {
    ...base,
    status: "ok",
    mae,
    rmse,
    bias,
    mape,
    calibrations,
    disclosure:
      `Walk-forward back-test over ${n} scored ${label} predictions (targets predicted only from strictly earlier completions; ` +
      `${skippedHistory} skipped for < ${MIN_TRAIN} labelled history, ${skippedUnlabelled} unlabelled). ` +
      `Intervals are empirical residual quantiles calibrated on the earlier half and ${coverageNote === null ? "not yet measurable out-of-sample (too few evaluation points)" : `measured at ${(coverageNote * 100).toFixed(0)}% out-of-sample coverage`} ` +
      `against the nominal 80%. Deterministic; no AI.`,
  };
}
