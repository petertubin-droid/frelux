/**
 * Contractor Credit-Score Engine tests (Future Engine 13)
 *
 * Every expected value is hand-computed from the deterministic
 * chain (rules: on_time 0.35, accuracy 0.35, volume 0.2,
 * jobs reference 50, dispute penalty 10 pts, Strong ≥ 70,
 * Excellent ≥ 90, rounding 1):
 *
 *   reliability = on_time / verified × 100
 *   accuracy    = 100 − avg error %
 *   volume      = min(verified / 50, 1) × 100
 *   base        = 0.35·rel + 0.35·acc + 0.2·vol
 *   penalty     = min(disputes × 10, base)
 *   score       = base − penalty
 *
 * Case A: 60 jobs, 54 on time, 1 dispute, 12% error
 *   → rel 90, acc 88, vol 100 → base 82.3 → penalty 10 → 72.3 Strong
 * Case B: 100/95/0/5% → rel 95, acc 95, vol 100 → base 86.5 → 86.5 Strong
 * Case D: 20/12/9/25% → rel 60, acc 75, vol 40 → base 55.25
 *   → penalty capped at 55.25 → score 0 Building
 * Case F: 100/100/0/0% → base 90 → Excellent exactly
 */

import { describe, it, expect } from "vitest";
import {
  calculateCreditScore,
  type CreditScoreRule,
} from "./contractor-credit-engine";

const rules: CreditScoreRule[] = [
  { rule_key: "on_time_weight", rule_value: { value: 0.35 } },
  { rule_key: "accuracy_weight", rule_value: { value: 0.35 } },
  { rule_key: "volume_weight", rule_value: { value: 0.2 } },
  { rule_key: "verified_jobs_reference", rule_value: { value: 50 } },
  { rule_key: "dispute_penalty_points", rule_value: { value: 10 } },
  { rule_key: "strong_threshold", rule_value: { value: 70 } },
  { rule_key: "excellent_threshold", rule_value: { value: 90 } },
  { rule_key: "rounding_decimals", rule_value: { value: 1 } },
];

const stats = (
  verified_jobs: number,
  on_time_jobs: number,
  dispute_count: number,
  avg_estimate_error_pct: number,
) => ({ verified_jobs, on_time_jobs, dispute_count, avg_estimate_error_pct });

describe("calculateCreditScore", () => {
  it("computes the hand-verified case A: 72.3 Strong with one dispute", () => {
    const r = calculateCreditScore({ stats: stats(60, 54, 1, 12), rules });
    expect(r.ok).toBe(true);
    expect(r.reliability_pct).toBe(90);
    expect(r.accuracy_pct).toBe(88);
    expect(r.volume_pct).toBe(100);
    expect(r.penalty).toBe(10);
    expect(r.score).toBe(72.3);
    expect(r.band).toBe("Strong");
    // the default weights sum to 0.9, so the engine reports the scale-down honestly
    expect(r.warnings.join(" ")).toMatch(/sum to 0.9, less than 1/);
  });

  it("computes the hand-verified case B: 86.5 Strong, no disputes", () => {
    const r = calculateCreditScore({ stats: stats(100, 95, 0, 5), rules });
    expect(r.ok).toBe(true);
    expect(r.score).toBe(86.5);
    expect(r.band).toBe("Strong");
  });

  it("caps the dispute penalty at the base score: the score never goes below zero", () => {
    // case D: base 55.25, 9 disputes × 10 = 90 → capped at 55.25 → score 0
    const r = calculateCreditScore({ stats: stats(20, 12, 9, 25), rules });
    expect(r.ok).toBe(true);
    expect(r.penalty).toBe(55.3); // 55.25 rounded to 1 decimal
    expect(r.score).toBe(0);
    expect(r.band).toBe("Building");
  });

  it("computes the hand-verified case F: exactly 90 → Excellent", () => {
    const r = calculateCreditScore({ stats: stats(100, 100, 0, 0), rules });
    expect(r.ok).toBe(true);
    expect(r.score).toBe(90);
    expect(r.band).toBe("Excellent");
  });

  it("refuses zero verified jobs: insufficient history is never a zero score", () => {
    const r = calculateCreditScore({ stats: stats(0, 0, 0, 0), rules });
    expect(r.ok).toBe(false);
    expect(r.score).toBeNull();
    expect(r.warnings[0]).toMatch(/no verified jobs on record/);
    expect(r.warnings[0]).toMatch(
      /insufficient verified history, not a zero score/,
    );
  });

  it("refuses on-time jobs exceeding verified jobs: an impossible record", () => {
    const r = calculateCreditScore({ stats: stats(40, 45, 0, 10), rules });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/cannot exceed verified jobs/);
  });

  it("refuses an average estimate error outside 0–100: never clamped", () => {
    const r = calculateCreditScore({ stats: stats(40, 40, 0, 120), rules });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/must be between 0 and 100/);
  });

  it("refuses missing scoring weights: never invents them", () => {
    const partial = rules.filter((x) => x.rule_key !== "accuracy_weight");
    const r = calculateCreditScore({
      stats: stats(60, 54, 1, 12),
      rules: partial,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/'accuracy_weight' rule is configured/);
    expect(r.warnings[0]).toMatch(/refuses to invent scoring weights/);
  });

  it("refuses weights summing above 1: scores cannot exceed 100", () => {
    const heavy = rules.map((x) =>
      x.rule_key === "volume_weight" ? { ...x, rule_value: { value: 0.5 } } : x,
    );
    const r = calculateCreditScore({
      stats: stats(60, 54, 1, 12),
      rules: heavy,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/exceeds 1/);
  });

  it("warns honestly (but still scores) when weights sum below 1", () => {
    const light = rules.map((x) =>
      x.rule_key === "volume_weight" ? { ...x, rule_value: { value: 0.1 } } : x,
    );
    const r = calculateCreditScore({
      stats: stats(60, 54, 1, 12),
      rules: light,
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/sum to 0.8, less than 1/);
    // base = 31.5 + 30.8 + 10 = 72.3 → penalty 10 → 62.3
    expect(r.score).toBe(62.3);
  });

  it("refuses missing bands: never invents a threshold", () => {
    const noBands = rules.filter(
      (x) =>
        x.rule_key !== "strong_threshold" &&
        x.rule_key !== "excellent_threshold",
    );
    const r = calculateCreditScore({
      stats: stats(60, 54, 1, 12),
      rules: noBands,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/strong_threshold/);
  });

  it("refuses an excellent threshold below the strong threshold", () => {
    const swapped = rules.map((x) =>
      x.rule_key === "excellent_threshold"
        ? { ...x, rule_value: { value: 60 } }
        : x,
    );
    const r = calculateCreditScore({
      stats: stats(60, 54, 1, 12),
      rules: swapped,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/at least the strong threshold/);
  });

  it("refuses non-integer job counts", () => {
    const r = calculateCreditScore({
      stats: {
        verified_jobs: 10.5,
        on_time_jobs: 10,
        dispute_count: 0,
        avg_estimate_error_pct: 5,
      },
      rules,
    });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/whole number/);
  });
});
