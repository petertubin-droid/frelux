/**
 * Walk-forward back-test harness + calibration tests — FRELUX
 * engine #3 "Predictive analytics & AI" milestone 2 (2026-10-15).
 *
 * Pins the honesty rules: no future leaks, MIN_TRAIN gate,
 * honest skips, out-of-sample interval calibration, and refusals
 * on empty/insufficient datasets (never invented metrics).
 */

import { describe, expect, it } from "vitest";
import { quantile, walkForwardBacktest } from "./backtest";
import type { ProjectOutcomeRecord } from "./outcomes";

let seq = 0;
function makeRecord(
  actual_end_date: string,
  delay_days: number | null,
  extra: Partial<ProjectOutcomeRecord> = {},
): ProjectOutcomeRecord {
  seq++;
  return {
    id: `r${String(seq).padStart(4, "0")}`,
    user_id: null,
    project_id: null,
    market_code: "NG",
    project_type: "detached duplex",
    finish_quality: "standard",
    size_m2: 200,
    stories: 2,
    planned_start_date: "2024-01-01",
    planned_end_date: "2024-06-01",
    actual_end_date,
    budgeted_amount: 100,
    budgeted_currency: "NGN",
    final_amount: null,
    delay_days,
    cost_overrun_pct: null,
    safety_incident_count: 0,
    rfi_count: null,
    weather_delay_days: null,
    notes: null,
    created_at: actual_end_date,
    ...extra,
  };
}

/** Deterministic predictor: the mean of earlier labelled delays. */
const meanPredictor = (train: ProjectOutcomeRecord[]) => {
  const labelled = train.filter(
    (r) => r.delay_days !== null && r.delay_days !== undefined,
  );
  if (labelled.length === 0) return null;
  return {
    prediction:
      labelled.reduce((s, r) => s + (r.delay_days as number), 0) /
      labelled.length,
  };
};

describe("quantile", () => {
  it("interpolates linearly and deterministically", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75, 10);
  });

  it("refuses empty arrays and out-of-range q", () => {
    expect(() => quantile([], 0.5)).toThrow(/empty array/);
    expect(() => quantile([1, 2], 0)).toThrow(/must be in \(0, 1\)/);
    expect(() => quantile([1, 2], 1)).toThrow(/must be in \(0, 1\)/);
  });
});

describe("walkForwardBacktest — gates and honesty", () => {
  it("refuses to invent metrics on an empty dataset", () => {
    const r = walkForwardBacktest({
      records: [],
      label: "delay_days",
      predictor: meanPredictor,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.mae).toBeNull();
    expect(r.calibrations).toEqual([]);
    expect(r.disclosure).toMatch(/no performance claim without evidence/i);
  });

  it("skips early targets honestly until MIN_TRAIN labelled history exists", () => {
    const records = Array.from({ length: 14 }, (_, i) =>
      makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
    );
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    // Targets 0..9 have < 10 labelled earlier records -> skipped.
    expect(r.skipped_insufficient_history).toBe(10);
    // Targets 10..13 scored with an exact-mean predictor: residual 0.
    expect(r.scored.length).toBe(4);
    expect(r.mae).toBe(0);
    expect(r.bias).toBe(0);
    expect(r.status).toBe("ok");
  });

  it("counts unlabelled targets and keeps them out of the metrics", () => {
    const records = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 5),
      ),
      makeRecord("2025-02-01", null),
      makeRecord("2025-02-02", 7),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    expect(r.skipped_unlabelled).toBe(1);
    expect(r.scored.length).toBe(1);
    expect(r.scored[0].actual).toBe(7);
  });

  it("orders by completion date regardless of input order (no future leaks)", () => {
    const records = [
      makeRecord("2025-06-01", 20),
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
      ),
      makeRecord("2025-03-01", 30),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    // First scored target must be the 2025-03-01 record (after 10
    // January records exist); the June record must be scored after it.
    expect(r.scored[0].target_id).toBe(
      records.find((x) => x.actual_end_date === "2025-03-01")!.id,
    );
  });

  it("MAPE is computed only on non-zero actuals, with its count disclosed", () => {
    const records = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 0),
      ),
      makeRecord("2025-02-01", 10),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: () => ({ prediction: 5 }),
    });
    // One scored target: actual 0 is excluded from MAPE; the one
    // at actual 10, predicted 5 gives |5/10| = 0.5.
    expect(r.mape).toEqual({ value: 0.5, on: 1 });
    expect(r.mae).toBe(5);
  });
});

describe("walkForwardBacktest — calibration with uncertainty bounds", () => {
  it("calibrates intervals on the earlier half and measures coverage later", () => {
    // 36 labelled records: 10 seed + 26 scored targets with
    // predictable residuals alternating +/- 3 around 10 (13 per
    // half — enough for the MIN_COVERAGE out-of-sample gate).
    const records = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
      ),
      ...Array.from({ length: 26 }, (_, i) =>
        makeRecord(
          `2025-02-${String(i + 1).padStart(2, "0")}`,
          i % 2 === 0 ? 13 : 7,
        ),
      ),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    expect(r.status).toBe("ok");
    expect(r.calibrations.length).toBe(2);
    const [p50, p80] = r.calibrations;
    expect(p50.nominal).toBe(0.5);
    expect(p80.nominal).toBe(0.8);
    // Residuals of scored targets alternate -3/+3 around the mean 10.
    // Both intervals must contain that full spread when calibrated on
    // enough residuals.
    expect(p80.offsets[0]).toBeLessThanOrEqual(-3);
    expect(p80.offsets[1]).toBeGreaterThanOrEqual(3);
    // Coverage on the later half: every residual is within [-3, +3].
    expect(p80.coverage).toBe(1);
    expect(p80.evaluated_on).toBeGreaterThanOrEqual(12);
    expect(p50.offsets[0]).toBeLessThanOrEqual(-3);
    expect(p50.offsets[1]).toBeGreaterThanOrEqual(3);
    expect(p50.coverage).toBe(1);
  });

  it("coverage is null when fewer than MIN_COVERAGE evaluation points exist", () => {
    // 10 seed + 10 scored -> evaluation half has 5 points.
    const records = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-02-${String(i + 1).padStart(2, "0")}`, 12),
      ),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    expect(r.scored.length).toBe(10);
    const p80 = r.calibrations.find((c) => c.nominal === 0.8)!;
    expect(p80.coverage).toBeNull();
    expect(p80.evaluated_on).toBe(5);
    expect(r.disclosure).toMatch(/not yet measurable out-of-sample/);
  });

  it("the disclosure names the protocol, skips and coverage honestly", () => {
    const records = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
      ),
      makeRecord("2025-02-01", 15),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: meanPredictor,
    });
    expect(r.disclosure).toMatch(/walk-forward/i);
    expect(r.disclosure).toMatch(/strictly earlier completions/);
    expect(r.disclosure).toMatch(/Deterministic; no AI/);
  });

  it("a declining predictor is skipped, never scored with invented output", () => {
    const records = [
      ...Array.from({ length: 12 }, (_, i) =>
        makeRecord(`2025-01-${String(i + 1).padStart(2, "0")}`, 10),
      ),
    ];
    const r = walkForwardBacktest({
      records,
      label: "delay_days",
      predictor: () => null,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.scored).toEqual([]);
    expect(r.skipped_insufficient_history).toBe(12);
  });
});
