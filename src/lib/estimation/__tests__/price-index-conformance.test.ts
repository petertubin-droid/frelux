// =========================================================
// LIVE MATERIAL PRICE INDEX CONFORMANCE (audit #32)
//
// The forecast is a straight-line fit, so the expectation is arithmetic done by
// hand: a series rising 10 per 30 days projects 10 per month, and three months
// beyond the last point adds 30. Prices also cannot go negative.
// =========================================================
import { describe, expect, it } from "vitest";
import { forecastMaterialPrice } from "../price-forecast-engine";

const day = (n: number) =>
  new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString().slice(0, 10);

// A month is a calendar month, 365.25/12 = 30.44 days, not 30. The series below
// rises 20 over 60 days, so the slope is 1/3 per day and a month's change is
// 10.15, not 10. Expectations are computed from that definition.
const DAYS_PER_MONTH = 365.25 / 12;
const SLOPE_PER_DAY = 20 / 60;

const rising = [
  { date: day(0), price: 100 },
  { date: day(30), price: 110 },
  { date: day(60), price: 120 },
];

describe("price index: trend fit", () => {
  it("projects a straight line forward by the horizon", () => {
    // 100 -> 110 -> 120 over 60 days is 10 per 30 days, so +3 months is 130.
    const r = forecastMaterialPrice({
      history: rising,
      horizon_months: 3,
      rules: [],
    });
    expect(r.ok).toBe(true);
    expect(r.current_price).toBeCloseTo(120, 2);
    // 120 + (1/3 per day x 30.44 days) x 3 months = 150.44
    const expected = 120 + SLOPE_PER_DAY * DAYS_PER_MONTH * 3;
    expect(r.projected_price).toBeCloseTo(expected, 1);
    expect(r.trend).toBe("rising");
  });

  it("reports the monthly change the fit implies", () => {
    const r = forecastMaterialPrice({
      history: rising,
      horizon_months: 3,
      rules: [],
    });
    expect(r.monthly_change).toBeCloseTo(SLOPE_PER_DAY * DAYS_PER_MONTH, 1);
    expect(r.monthly_change_percent).toBeCloseTo(
      ((SLOPE_PER_DAY * DAYS_PER_MONTH) / 120) * 100,
      1,
    );
  });

  it("calls a falling series falling", () => {
    const r = forecastMaterialPrice({
      history: [
        { date: day(0), price: 200 },
        { date: day(30), price: 180 },
        { date: day(60), price: 160 },
      ],
      horizon_months: 2,
      rules: [],
    });
    expect(r.trend).toBe("falling");
    expect(r.projected_price).toBeLessThan(r.current_price as number);
  });

  it("calls a flat series flat", () => {
    const r = forecastMaterialPrice({
      history: [
        { date: day(0), price: 90 },
        { date: day(30), price: 90 },
        { date: day(60), price: 90 },
      ],
      horizon_months: 3,
      rules: [],
    });
    expect(r.trend).toBe("flat");
    expect(r.monthly_change).toBeCloseTo(0, 6);
  });

  it("never projects a negative price", () => {
    // A steep fall extrapolated far enough would cross zero; a price floor of
    // zero is the honest clamp, not a negative number.
    const r = forecastMaterialPrice({
      history: [
        { date: day(0), price: 100 },
        { date: day(30), price: 60 },
        { date: day(60), price: 20 },
      ],
      horizon_months: 24,
      rules: [],
    });
    expect(r.projected_price).not.toBeNull();
    expect(r.projected_price as number).toBeGreaterThanOrEqual(0);
  });

  it("sorts history given out of order", () => {
    const r = forecastMaterialPrice({
      history: [rising[2], rising[0], rising[1]],
      horizon_months: 3,
      rules: [],
    });
    expect(r.current_price).toBeCloseTo(120, 2);
    expect(r.projected_price).toBeCloseTo(
      120 + SLOPE_PER_DAY * DAYS_PER_MONTH * 3,
      1,
    );
  });

  it("will not forecast from a single point", () => {
    const r = forecastMaterialPrice({
      history: [{ date: day(0), price: 100 }],
      horizon_months: 3,
      rules: [],
    });
    expect(r.ok).toBe(false);
    expect(r.projected_price).toBeNull();
  });
});
