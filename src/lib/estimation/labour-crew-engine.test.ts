/**
 * Labour & Crew Engine tests (Future Engine 7)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  calculateLabour,
  type LabourInput,
  type LabourRateLike,
} from "./labour-crew-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rate = (over: Partial<LabourRateLike> = {}): LabourRateLike => ({
  task_key: "screeding_wall",
  task_label: "Wall screeding (per sqm)",
  unit: "sqm",
  output_per_worker_day: 40,
  is_active: true,
  source_reference: "FRELUX contractor benchmark 2025",
  ...over,
});

const rule = (key: string, value: unknown): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "labour",
    rule_value: { value },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const defaultRules = () => [
  rule("efficiency_loss_percent", 15),
  rule("rounding_decimals", 2),
];

const input = (over: Partial<LabourInput> = {}): LabourInput => ({
  task_key: "screeding_wall",
  quantity: 240,
  crew_size: 2,
  rates: [rate()],
  rules: defaultRules(),
  ...over,
});

describe("calculateLabour", () => {
  it("computes effective rate, worker-days and whole calendar days (hand-verified)", () => {
    // 40 × (1 − 15%) = 34 sqm/wd; 240 ÷ 34 = 7.0588… → 7.06; 7.06 ÷ 2 = 3.53 → 4 days
    const r = calculateLabour(input());
    expect(r.ok).toBe(true);
    expect(r.base_rate).toBe(40);
    expect(r.efficiency_loss_percent).toBe(15);
    expect(r.effective_rate).toBe(34);
    expect(r.worker_days).toBe(7.06);
    expect(r.calendar_days).toBe(4);
    expect(r.warnings).toHaveLength(0);
    expect(r.steps[1].detail).toMatch(/never folded into the base rate/);
    expect(r.steps[3].detail).toMatch(/always rounded up/);
  });

  it("matches task keys case-insensitively", () => {
    const r = calculateLabour(input({ task_key: "  SCREEDING_WALL " }));
    expect(r.ok).toBe(true);
    expect(r.task_key).toBe("screeding_wall");
  });

  it("does not round away an exact whole day (hand-verified)", () => {
    // loss 0 → effective 40; 240 ÷ 40 = 6 wd; crew 3 → exactly 2 days
    const r = calculateLabour(
      input({
        crew_size: 3,
        rules: [
          rule("efficiency_loss_percent", 0),
          rule("rounding_decimals", 2),
        ],
      }),
    );
    expect(r.effective_rate).toBe(40);
    expect(r.worker_days).toBe(6);
    expect(r.calendar_days).toBe(2);
  });

  it("singles out a lone worker without altering worker-days", () => {
    // 100 ÷ 20 = 5 wd; crew 1 → 5 days
    const r = calculateLabour(
      input({
        quantity: 100,
        crew_size: 1,
        rates: [rate({ output_per_worker_day: 25 })],
        rules: [
          rule("efficiency_loss_percent", 20),
          rule("rounding_decimals", 2),
        ],
      }),
    );
    expect(r.effective_rate).toBe(20);
    expect(r.worker_days).toBe(5);
    expect(r.calendar_days).toBe(5);
  });

  it("refuses a task with no configured rate, never guesses", () => {
    const r = calculateLabour(input({ task_key: "marble_polishing" }));
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(
      /No labour rate is configured for 'marble_polishing'/,
    );
    expect(r.warnings.join(" ")).toMatch(/refuses to guess/);
  });

  it("ignores inactive rates", () => {
    const r = calculateLabour(input({ rates: [rate({ is_active: false })] }));
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/No labour rate is configured/);
  });

  it("refuses an invalid configured rate instead of guessing", () => {
    const r = calculateLabour(
      input({ rates: [rate({ output_per_worker_day: -5 })] }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/configured rate .* is invalid/);
  });

  it("ignores an out-of-range efficiency rule and warns (hand-verified default)", () => {
    const r = calculateLabour(
      input({
        rules: [
          rule("efficiency_loss_percent", 120),
          rule("rounding_decimals", 2),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.efficiency_loss_percent).toBe(15);
    expect(r.effective_rate).toBe(34);
    expect(r.warnings.join(" ")).toMatch(
      /ignored \(the default 15% was used\)/,
    );
  });

  it("refuses invalid quantities and crew sizes", () => {
    expect(calculateLabour(input({ quantity: 0 })).ok).toBe(false);
    expect(calculateLabour(input({ quantity: -5 })).ok).toBe(false);
    expect(calculateLabour(input({ quantity: NaN })).ok).toBe(false);
    expect(calculateLabour(input({ crew_size: 0 })).ok).toBe(false);
    expect(calculateLabour(input({ crew_size: 1.5 })).ok).toBe(false);
    expect(calculateLabour(input({ crew_size: -2 })).ok).toBe(false);
  });

  it("refuses an empty task key", () => {
    const r = calculateLabour(input({ task_key: "  " }));
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/never schedules work without one/);
  });

  it("carries the source reference through to the result", () => {
    const r = calculateLabour(input());
    expect(r.source_reference).toBe("FRELUX contractor benchmark 2025");
    expect(r.steps[0].detail).toMatch(
      /source: FRELUX contractor benchmark 2025/,
    );
  });
});
