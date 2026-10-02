/**
 * Regional Cost Index Engine tests (Future Engine 3)
 *
 * Every expected value below is hand-verified. Fallbacks are
 * documented behaviour, never silent guesses.
 */

import { describe, it, expect } from "vitest";
import {
  applyRegionalCost,
  statesWithIndices,
  type RegionalCostInput,
} from "./regional-cost-engine";
import type { EstimationCalcRule, RegionalCostIndex } from "@/types/estimation";

const idx = (over: Partial<RegionalCostIndex> = {}): RegionalCostIndex =>
  ({
    id: "i-1",
    state: "Lagos",
    category: "labour",
    cost_factor: 1.25,
    description: null,
    source_reference: "Q3 2026 market survey",
    effective_date: "2026-07-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  }) as unknown as RegionalCostIndex;

const rule = (
  key: string,
  value: Record<string, unknown>,
): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "regional_cost",
    rule_value: value,
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const input = (over: Partial<RegionalCostInput> = {}): RegionalCostInput => ({
  base_cost: 100000,
  state: "Lagos",
  category: "labour",
  indices: [idx()],
  rules: [rule("national_baseline_factor", { factor: 1.0 })],
  ...over,
});

describe("applyRegionalCost", () => {
  it("applies the exact state+category factor (hand-verified)", () => {
    // 100,000 × 1.25 = 125,000
    const r = applyRegionalCost(input());
    expect(r.ok).toBe(true);
    expect(r.adjusted_cost).toBe(125000);
    expect(r.applied_factor).toBe(1.25);
    expect(r.applied_source).toBe("state_category");
    expect(r.warnings).toHaveLength(0);
    expect(r.steps[0].detail).toMatch(/Q3 2026 market survey/);
  });

  it("matches state and category case-insensitively", () => {
    const r = applyRegionalCost(input({ state: "lagos" }));
    expect(r.applied_source).toBe("state_category");
    expect(r.adjusted_cost).toBe(125000);
  });

  it("falls back to the state general index with a warning (no silent guess)", () => {
    // Abuja has only a general index (1.10); request category 'materials'
    const r = applyRegionalCost(
      input({
        state: "Abuja",
        category: "materials",
        indices: [
          idx({
            id: "i-2",
            state: "Abuja",
            category: "general",
            cost_factor: 1.1,
          }),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.applied_source).toBe("state_general");
    expect(r.applied_factor).toBe(1.1);
    expect(r.adjusted_cost).toBe(110000);
    expect(r.warnings.join(" ")).toMatch(
      /general index \(1\.10\) was applied instead/,
    );
  });

  it("falls back to the national baseline when the state has no index at all", () => {
    const r = applyRegionalCost(input({ state: "Kebbi", indices: [] }));
    expect(r.ok).toBe(true);
    expect(r.applied_source).toBe("national_baseline");
    expect(r.applied_factor).toBe(1.0);
    expect(r.adjusted_cost).toBe(100000);
    expect(r.warnings.join(" ")).toMatch(
      /No regional cost index is configured for Kebbi/,
    );
  });

  it("uses the configured national baseline when it differs from 1.0", () => {
    const r = applyRegionalCost(
      input({
        state: "Kebbi",
        indices: [],
        rules: [rule("national_baseline_factor", { factor: 0.95 })],
      }),
    );
    expect(r.applied_factor).toBe(0.95);
    expect(r.adjusted_cost).toBe(95000);
  });

  it("treats 'general' category requests as exact matches, not fallbacks", () => {
    const r = applyRegionalCost(
      input({
        category: "general",
        indices: [idx({ category: "general", cost_factor: 1.15 })],
      }),
    );
    expect(r.applied_source).toBe("state_category");
    expect(r.adjusted_cost).toBe(115000);
    expect(r.warnings).toHaveLength(0);
  });

  it("refuses a negative or missing base cost", () => {
    expect(applyRegionalCost(input({ base_cost: -1 })).ok).toBe(false);
    expect(applyRegionalCost(input({ base_cost: NaN })).ok).toBe(false);
  });

  it("refuses without a state", () => {
    const r = applyRegionalCost(input({ state: " " }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/target state is required/i);
  });

  it("refuses with an invalid configured factor instead of applying garbage", () => {
    const r = applyRegionalCost(input({ indices: [idx({ cost_factor: 0 })] }));
    expect(r.ok).toBe(false);
    expect(r.adjusted_cost).toBeNull();
    expect(r.warnings[0]).toMatch(/invalid factor/i);
  });

  it("ignores inactive indices", () => {
    const r = applyRegionalCost(
      input({
        indices: [idx({ is_active: false })],
      }),
    );
    expect(r.applied_source).toBe("national_baseline");
    expect(r.warnings.join(" ")).toMatch(
      /No regional cost index is configured/,
    );
  });

  it("rounds the adjusted cost to 2 decimals", () => {
    const r = applyRegionalCost(
      input({ base_cost: 9999.99, indices: [idx({ cost_factor: 1.333 })] }),
    );
    expect(r.adjusted_cost).toBe(13329.99);
  });
});

describe("statesWithIndices", () => {
  it("returns a unique, sorted list of active states", () => {
    const states = statesWithIndices([
      idx({ state: "Zamfara" }),
      idx({ id: "i-3", state: "Lagos", category: "general" }),
      idx({ id: "i-4", state: "Abuja" }),
      idx({ id: "i-5", state: "Hidden", is_active: false }),
    ]);
    expect(states).toEqual(["Abuja", "Lagos", "Zamfara"]);
  });
});
