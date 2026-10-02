/**
 * Estimate Refresh Engine tests (Future Engine 6, part 2)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  refreshEstimate,
  type RefreshInput,
  type RefreshItemInput,
} from "./estimate-refresh-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule: EstimationCalcRule = {
  id: "r1",
  rule_key: "rounding_decimals",
  calculator_type: "estimate_refresh",
  rule_value: { value: 2 },
  rule_status: "verified_frelux",
  description: null,
  is_active: true,
  sort_order: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
} as unknown as EstimationCalcRule;

const item = (over: Partial<RefreshItemInput> = {}): RefreshItemInput => ({
  item_id: "i-1",
  item_name: "Emulsion paint",
  quantity: 10,
  unit: "litre",
  snapshot_unit_price: 5000,
  snapshot_currency: "NGN",
  snapshot_effective_date: "2026-01-01",
  price_type: "product",
  ref_id: "prod-1",
  ...over,
});

const input = (over: Partial<RefreshInput> = {}): RefreshInput => ({
  estimate_ref: "EST-001",
  currency: "NGN",
  items: [],
  currentPrices: {},
  rules: [rule],
  ...over,
});

describe("refreshEstimate", () => {
  it("refreshes a price change with hand-verified totals and delta", () => {
    // qty 10 × 5,000 = 50,000 then; today 6,000 → 60,000; delta +10,000 = +20%
    const r = refreshEstimate(
      input({
        items: [item()],
        currentPrices: {
          "product:prod-1": {
            price: 6000,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(1);
    const l = r.lines[0];
    expect(l.price_status).toBe("price_changed");
    expect(l.line_total_then).toBe(50000);
    expect(l.line_total_today).toBe(60000);
    expect(l.delta).toBe(10000);
    expect(l.delta_percent).toBe(20);
    expect(r.total_then).toBe(50000);
    expect(r.total_today).toBe(60000);
    expect(r.delta).toBe(10000);
    expect(r.delta_percent).toBe(20);
    expect(r.changed_count).toBe(1);
  });

  it("keeps a line at its snapshot price when no current price exists — never guesses", () => {
    const r = refreshEstimate(input({ items: [item()] }));
    expect(r.ok).toBe(true);
    expect(r.lines[0].price_status).toBe("no_current_price");
    expect(r.lines[0].current_unit_price).toBeNull();
    expect(r.lines[0].line_total_today).toBe(50000);
    expect(r.delta).toBe(0);
    expect(r.missing_count).toBe(1);
    expect(r.warnings.join(" ")).toMatch(/never extrapolates a missing price/);
  });

  it("marks unchanged prices as unchanged", () => {
    const r = refreshEstimate(
      input({
        items: [
          item({
            item_id: "i-2",
            item_name: "Primer",
            quantity: 4,
            snapshot_unit_price: 1200,
            ref_id: "prod-2",
          }),
        ],
        currentPrices: {
          "product:prod-2": {
            price: 1200,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.lines[0].price_status).toBe("unchanged");
    expect(r.unchanged_count).toBe(1);
    expect(r.delta).toBe(0);
  });

  it("ignores a current price in a different currency — never converts", () => {
    const r = refreshEstimate(
      input({
        items: [item()],
        currentPrices: {
          "product:prod-1": {
            price: 4,
            currency: "USD",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.lines[0].price_status).toBe("currency_mismatch");
    expect(r.lines[0].current_unit_price).toBeNull();
    expect(r.lines[0].line_total_today).toBe(50000);
    expect(r.warnings.join(" ")).toMatch(/never applies an exchange rate/);
  });

  it("flags lines with no price reference in their snapshot", () => {
    const r = refreshEstimate(
      input({ items: [item({ price_type: null, ref_id: null })] }),
    );
    expect(r.lines[0].price_status).toBe("no_price_reference");
    expect(r.lines[0].line_total_today).toBe(50000);
    expect(r.warnings.join(" ")).toMatch(/no price reference in its snapshot/);
  });

  it("computes the multi-line totals with mixed statuses (hand-verified)", () => {
    // A: 10 × 5,000 = 50,000 → today 6,000 → 60,000 (+10,000)
    // B: 2 × 7,500 = 15,000 → no current price → stays 15,000
    // C: 4 × 1,200 = 4,800 → unchanged 4,800
    // then = 69,800; today = 79,800; delta = +10,000 → 10,000/69,800 = 14.3266% → 14.33
    const r = refreshEstimate(
      input({
        items: [
          item(),
          item({
            item_id: "i-2",
            item_name: "POP cement",
            quantity: 2,
            snapshot_unit_price: 7500,
            ref_id: "mat-1",
          }),
          item({
            item_id: "i-3",
            item_name: "Primer",
            quantity: 4,
            snapshot_unit_price: 1200,
            ref_id: "prod-2",
          }),
        ],
        currentPrices: {
          "product:prod-1": {
            price: 6000,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
          "product:prod-2": {
            price: 1200,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.total_then).toBe(69800);
    expect(r.total_today).toBe(79800);
    expect(r.delta).toBe(10000);
    expect(r.delta_percent).toBe(14.33);
    expect(r.changed_count).toBe(1);
    expect(r.unchanged_count).toBe(1);
    expect(r.missing_count).toBe(1);
  });

  it("rounds fractional deltas to 2dp (hand-verified)", () => {
    // qty 3 × 1,234.567 = 3,703.701 → 3,703.70; today 1,300 → 3,900; delta 196.30
    const r = refreshEstimate(
      input({
        items: [
          item({
            quantity: 3,
            snapshot_unit_price: 1234.567,
            ref_id: "prod-9",
          }),
        ],
        currentPrices: {
          "product:prod-9": {
            price: 1300,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.total_then).toBe(3703.7);
    expect(r.total_today).toBe(3900);
    expect(r.delta).toBe(196.3);
    // (3900 − 3703.70) / 3703.70 × 100 = 5.2998% → 5.3
    expect(r.delta_percent).toBe(5.3);
  });

  it("refuses an estimate with no items or a missing ref", () => {
    expect(refreshEstimate(input()).ok).toBe(false);
    expect(refreshEstimate(input({ estimate_ref: "  " })).ok).toBe(false);
    expect(
      refreshEstimate(input({ estimate_ref: "  " })).warnings.join(" "),
    ).toMatch(/never refreshes without one/);
    expect(refreshEstimate(input({ items: [] })).warnings.join(" ")).toMatch(
      /nothing to refresh/,
    );
  });

  it("excludes malformed lines with a warning instead of guessing", () => {
    const r = refreshEstimate(
      input({
        items: [
          item({ item_id: "bad", quantity: -5 }),
          item({ item_id: "bad2", snapshot_unit_price: Number.NaN }),
          item({
            item_id: "good",
            quantity: 2,
            snapshot_unit_price: 1000,
            ref_id: "prod-3",
          }),
        ],
        currentPrices: {
          "product:prod-3": {
            price: 1000,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].item_id).toBe("good");
    expect(r.warnings.join(" ")).toMatch(/invalid quantity/);
    expect(r.warnings.join(" ")).toMatch(/invalid stored price/);
  });

  it("yields null delta_percent for a zero base instead of a fake number", () => {
    // Free line: snapshot 0, current 500 → delta exists but % is not computable
    const r = refreshEstimate(
      input({
        items: [
          item({ snapshot_unit_price: 0, quantity: 1, ref_id: "prod-4" }),
        ],
        currentPrices: {
          "product:prod-4": {
            price: 500,
            currency: "NGN",
            effective_date: "2026-10-01",
          },
        },
      }),
    );
    expect(r.delta).toBe(500);
    expect(r.delta_percent).toBeNull();
    expect(r.lines[0].delta_percent).toBeNull();
    expect(r.steps[r.steps.length - 1].detail).toMatch(
      /percentage not computable/,
    );
  });
});
