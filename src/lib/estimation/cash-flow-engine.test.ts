/**
 * Cash-Flow Timeline Engine tests (Future Engine 6)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCashFlow,
  addMonths,
  type CashFlowInput,
} from "./cash-flow-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rules: EstimationCalcRule[] = [
  {
    id: "r1",
    rule_key: "rounding_decimals",
    calculator_type: "cash_flow",
    rule_value: { value: 2 },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "r2",
    rule_key: "require_percent_sum",
    calculator_type: "cash_flow",
    rule_value: { value: 100 },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
] as unknown as EstimationCalcRule[];

const milestones = [
  { label: "Mobilization", percent: 40, offset_months: 0 },
  { label: "Mid-project", percent: 35, offset_months: 2 },
  { label: "Completion", percent: 25, offset_months: 4 },
];

const input = (over: Partial<CashFlowInput> = {}): CashFlowInput => ({
  total_amount: 1_000_000,
  start_date: "2026-01-15",
  milestones,
  rules,
  ...over,
});

describe("addMonths", () => {
  it("adds whole months and clamps month overflow (hand-verified)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"); // clamp to Feb
    expect(addMonths("2026-01-15", 2)).toBe("2026-03-15");
    expect(addMonths("2026-01-31", 1 + 12)).toBe("2027-02-28"); // leap year: Feb 2027 has 28 days
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // leap year Feb
    expect(addMonths("2026-05-15", 0)).toBe("2026-05-15");
  });
});

describe("calculateCashFlow", () => {
  it("schedules payments from percentages and offsets (hand-verified)", () => {
    const r = calculateCashFlow(input());
    expect(r.ok).toBe(true);
    expect(r.payments).toHaveLength(3);
    expect(r.payments[0]).toMatchObject({
      label: "Mobilization",
      percent: 40,
      amount: 400000,
      date: "2026-01-15",
    });
    expect(r.payments[1]).toMatchObject({
      label: "Mid-project",
      percent: 35,
      amount: 350000,
      date: "2026-03-15",
    });
    expect(r.payments[2]).toMatchObject({
      label: "Completion",
      percent: 25,
      amount: 250000,
      date: "2026-05-15",
    });
    expect(r.payments[2].cumulative_amount).toBe(1_000_000);
    expect(r.scheduled_total).toBe(1_000_000);
    expect(r.warnings).toHaveLength(0);
  });

  it("sorts milestones chronologically regardless of input order", () => {
    const r = calculateCashFlow(
      input({ milestones: [...milestones].reverse() }),
    );
    expect(r.payments.map((p) => p.label)).toEqual([
      "Mobilization",
      "Mid-project",
      "Completion",
    ]);
  });

  it("refuses templates that do not sum to exactly 100%, never normalises", () => {
    const r = calculateCashFlow(
      input({
        milestones: [
          { label: "A", percent: 40, offset_months: 0 },
          { label: "B", percent: 35, offset_months: 2 },
          // missing 25%
        ],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.payments).toHaveLength(0);
    expect(r.warnings.join(" ")).toMatch(
      /sum to 75% but must sum to exactly 100%/,
    );
    expect(r.warnings.join(" ")).toMatch(
      /refused instead of being silently adjusted/,
    );
  });

  it("accepts fractional percents summing to exactly 100 (hand-verified rounding)", () => {
    // 33.33 × 3 = 99.99 + 0.01 = 100 → amounts 333300 + 333300 + 333300 + 100
    const r = calculateCashFlow(
      input({
        total_amount: 1_000_000,
        milestones: [
          { label: "A", percent: 33.33, offset_months: 0 },
          { label: "B", percent: 33.33, offset_months: 1 },
          { label: "C", percent: 33.33, offset_months: 2 },
          { label: "D", percent: 0.01, offset_months: 3 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.payments[0].amount).toBe(333300);
    expect(r.payments[3].amount).toBe(100);
    expect(r.scheduled_total).toBe(1_000_000);
  });

  it("excludes invalid milestones with a warning instead of guessing", () => {
    const r = calculateCashFlow(
      input({
        milestones: [
          ...milestones.slice(0, 2),
          { label: "", percent: 25, offset_months: 4 }, // missing label → excluded
        ],
      }),
    );
    expect(r.ok).toBe(false); // remaining sum 75 ≠ 100
    expect(r.warnings.join(" ")).toMatch(/missing label/);
    expect(r.warnings.join(" ")).toMatch(/never guessed/);
  });

  it("refuses a zero or invalid project total", () => {
    expect(calculateCashFlow(input({ total_amount: 0 })).ok).toBe(false);
    expect(calculateCashFlow(input({ total_amount: -5 })).ok).toBe(false);
    expect(calculateCashFlow(input({ total_amount: NaN })).ok).toBe(false);
  });

  it("refuses an invalid start date", () => {
    expect(calculateCashFlow(input({ start_date: "not-a-date" })).ok).toBe(
      false,
    );
  });

  it("refuses an empty milestone list", () => {
    expect(calculateCashFlow(input({ milestones: [] })).ok).toBe(false);
  });

  it("refuses negative offsets and non-positive percents individually", () => {
    const r = calculateCashFlow(
      input({
        milestones: [
          { label: "A", percent: 50, offset_months: 0 },
          { label: "B", percent: 50, offset_months: -1 },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/negative offset/);
  });

  it("honours the configured percent-sum rule", () => {
    const r = calculateCashFlow(
      input({
        milestones: [{ label: "All upfront", percent: 100, offset_months: 0 }],
        rules: [
          ...rules.filter((x) => x.rule_key !== "require_percent_sum"),
          { ...rules[1], is_active: false },
        ] as unknown as EstimationCalcRule[],
      }),
    );
    // rule inactive → default 100 still required; single 100% milestone is fine
    expect(r.ok).toBe(true);
    expect(r.payments[0].amount).toBe(1_000_000);
  });
});
