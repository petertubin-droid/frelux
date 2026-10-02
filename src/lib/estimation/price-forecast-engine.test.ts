/**
 * Material Price Forecasting Engine tests (Future Engine 4)
 *
 * Every expected value below is hand-verified from the
 * least-squares fit of the recorded series.
 */

import { describe, it, expect } from "vitest";
import { forecastMaterialPrice } from "./price-forecast-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule = (
  key: string,
  value: Record<string, unknown>,
): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "price_forecast",
    rule_value: value,
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const rules = [
  rule("min_history_points", { value: 3 }),
  rule("max_forecast_months", { value: 12 }),
  rule("short_history_days", { value: 30 }),
];

// Exactly linear series: 100 → 110 → 120 over 60 days
// (dates 2026-01-01, 2026-01-31, 2026-03-02 are 30/30 days apart)
const linearSeries = [
  { date: "2026-01-01T00:00:00Z", price: 100 },
  { date: "2026-01-31T00:00:00Z", price: 110 },
  { date: "2026-03-02T00:00:00Z", price: 120 },
];

describe("forecastMaterialPrice", () => {
  it("projects a rising trend from recorded history (hand-verified)", () => {
    // Fit: slope 1/3 per day, intercept 100.
    // Horizon 6 months: day 60 + 6×30.4375 = 242.625 → 100 + 80.875 = 180.88
    const r = forecastMaterialPrice({
      history: linearSeries,
      horizon_months: 6,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.current_price).toBe(120);
    expect(r.projected_price).toBe(180.88);
    expect(r.trend).toBe("rising");
    expect(r.monthly_change).toBe(10.15);
    expect(r.monthly_change_percent).toBe(8.46);
    expect(r.history_points).toBe(3);
    expect(r.history_span_days).toBe(60);
    expect(r.warnings).toHaveLength(0);
  });

  it("sorts history chronologically regardless of input order", () => {
    const r = forecastMaterialPrice({
      history: [...linearSeries].reverse(),
      horizon_months: 6,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.projected_price).toBe(180.88);
  });

  it("clamps the horizon to the configured maximum with a warning", () => {
    // 24 months requested, max 12 → day 60 + 365.25 = 425.25 → 100 + 141.75 = 241.75
    const r = forecastMaterialPrice({
      history: linearSeries,
      horizon_months: 24,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.horizon_months).toBe(12);
    expect(r.projected_price).toBe(241.75);
    expect(r.warnings.join(" ")).toMatch(/clamped to 12 months/);
  });

  it("projects a falling trend and reports it as such", () => {
    // 100 → 95 → 90 over 60 days: slope -1/6/day, intercept 100.
    // 12 months: 100 - 70.875 = 29.13 (rounded)
    const r = forecastMaterialPrice({
      history: [
        { date: "2026-01-01T00:00:00Z", price: 100 },
        { date: "2026-01-31T00:00:00Z", price: 95 },
        { date: "2026-03-02T00:00:00Z", price: 90 },
      ],
      horizon_months: 12,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.trend).toBe("falling");
    expect(r.projected_price).toBe(29.13);
    expect(r.monthly_change).toBe(-5.07);
  });

  it("clamps a below-zero projection to 0 with a warning, never a negative price", () => {
    // 100 → 50 → 10: slope -1.5/day, intercept 98.33 → far below zero at 12 months
    const r = forecastMaterialPrice({
      history: [
        { date: "2026-01-01T00:00:00Z", price: 100 },
        { date: "2026-01-31T00:00:00Z", price: 50 },
        { date: "2026-03-02T00:00:00Z", price: 10 },
      ],
      horizon_months: 12,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.projected_price).toBe(0);
    expect(r.warnings.join(" ")).toMatch(/clamped to 0/);
  });

  it("reports a flat trend when the recorded price never moved", () => {
    const r = forecastMaterialPrice({
      history: [
        { date: "2026-01-01T00:00:00Z", price: 100 },
        { date: "2026-01-31T00:00:00Z", price: 100 },
        { date: "2026-03-02T00:00:00Z", price: 100 },
      ],
      horizon_months: 3,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.trend).toBe("flat");
    expect(r.projected_price).toBe(100);
    expect(r.monthly_change).toBe(0);
  });

  it("refuses to forecast with fewer than the minimum recorded points", () => {
    const r = forecastMaterialPrice({
      history: linearSeries.slice(0, 2),
      horizon_months: 6,
      rules,
    });
    expect(r.ok).toBe(false);
    expect(r.projected_price).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/at least 3 are required/);
    expect(r.warnings.join(" ")).toMatch(/does not guess a trend/);
  });

  it("refuses an invalid horizon", () => {
    expect(
      forecastMaterialPrice({ history: linearSeries, horizon_months: 0, rules })
        .ok,
    ).toBe(false);
    expect(
      forecastMaterialPrice({
        history: linearSeries,
        horizon_months: -3,
        rules,
      }).ok,
    ).toBe(false);
  });

  it("warns on a short history span (low confidence)", () => {
    const r = forecastMaterialPrice({
      history: [
        { date: "2026-01-01T00:00:00Z", price: 100 },
        { date: "2026-01-04T00:00:00Z", price: 105 },
        { date: "2026-01-11T00:00:00Z", price: 110 },
      ],
      horizon_months: 6,
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.history_span_days).toBe(10);
    expect(r.warnings.join(" ")).toMatch(
      /short series, treat the projection as low confidence/,
    );
  });

  it("ignores inactive rules and uses defaults", () => {
    const r = forecastMaterialPrice({
      history: linearSeries.slice(0, 2),
      horizon_months: 6,
      rules: [rule("min_history_points", { value: 3 })].map((x) => ({
        ...x,
        is_active: false,
      })),
    });
    // Default min_history_points = 3 still applies
    expect(r.ok).toBe(false);
  });

  it("ignores invalid history points instead of fitting garbage", () => {
    const r = forecastMaterialPrice({
      history: [
        ...linearSeries,
        { date: "garbage", price: 999 },
        { date: "2026-03-05T00:00:00Z", price: -5 },
      ],
      horizon_months: 6,
      rules,
    });
    expect(r.history_points).toBe(3);
    expect(r.projected_price).toBe(180.88);
  });
});
