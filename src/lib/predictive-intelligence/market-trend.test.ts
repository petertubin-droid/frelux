// =========================================================
// PREDICTIVE INTELLIGENCE, MARKET-TREND TESTS (§16)
//
// Deterministic trend math pinned by hand:
//   increasing at ≥ +5%, decreasing at ≤ -5%, else stable
//   volatility: CV > 0.15 high, > 0.05 moderate, else low
//   fewer than 3 dated points = insufficient, never a trend
// Region gate: another region's prices are never used.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  computeMaterialTrends,
  MIN_TREND_POINTS,
  TREND_THRESHOLD_PCT,
  CV_MODERATE,
  CV_HIGH,
} from "./market-trend";

const NOW = "2026-09-18T12:00:00.000Z";
const D = (i: number) => `2026-09-${String(i).padStart(2, "0")}T00:00:00Z`;

function pt(name: string, price: number, day: number) {
  return {
    materialName: name,
    price,
    date: D(day),
    source: "obs",
    currency: "NGN",
    region: "ng",
    verified: true,
  };
}

describe("computeMaterialTrends", () => {
  it("documented thresholds", () => {
    expect(MIN_TREND_POINTS).toBe(3);
    expect(TREND_THRESHOLD_PCT).toBeCloseTo(0.05, 10);
    expect(CV_MODERATE).toBeCloseTo(0.05, 10);
    expect(CV_HIGH).toBeCloseTo(0.15, 10);
  });

  it("fewer than 3 points → insufficient, never a trend", () => {
    const { trends, insufficient } = computeMaterialTrends([
      pt("cement", 100, 1),
      pt("cement", 110, 2),
    ]);
    expect(trends).toHaveLength(0);
    expect(insufficient).toEqual(["cement"]);
  });

  it("increasing: 100 → 110 (+10%) over 3 dated points", () => {
    const { trends, insufficient } = computeMaterialTrends([
      pt("cement", 100, 1),
      pt("cement", 105, 2),
      pt("cement", 110, 3),
    ]);
    expect(insufficient).toEqual([]);
    expect(trends).toHaveLength(1);
    const t = trends[0];
    expect(t.direction).toBe("increasing");
    expect(t.changePct).toBeCloseTo(0.1, 10);
    expect(t.firstPrice).toBe(100);
    expect(t.lastPrice).toBe(110);
    expect(t.dataPoints).toBe(3);
  });

  it("decreasing: 200 → 180 (-10%)", () => {
    const { trends } = computeMaterialTrends([
      pt("sand", 200, 1),
      pt("sand", 190, 2),
      pt("sand", 180, 3),
    ]);
    expect(trends[0].direction).toBe("decreasing");
    expect(trends[0].changePct).toBeCloseTo(-0.1, 10);
  });

  it("stable: within the ±5% threshold", () => {
    const { trends } = computeMaterialTrends([
      pt("paint", 100, 1),
      pt("paint", 102, 2),
      pt("paint", 103, 3),
    ]);
    expect(trends[0].direction).toBe("stable");
    expect(trends[0].volatility).toBe("low"); // tight prices, low CV
  });

  it("volatility bands: CV > 0.15 high, > 0.05 moderate", () => {
    // mean 100, prices 60/100/140 → variance 1066.7, sd 32.66 → CV 0.3266 > 0.15
    const { trends } = computeMaterialTrends([
      pt("tiles", 60, 1),
      pt("tiles", 100, 2),
      pt("tiles", 140, 3),
    ]);
    expect(trends[0].volatility).toBe("high");
    // mean 100, 90/100/110 → sd 8.16 → CV 0.0816 → moderate
    const mod = computeMaterialTrends([
      pt("bricks", 90, 1),
      pt("bricks", 100, 2),
      pt("bricks", 110, 3),
    ]);
    expect(mod.trends[0].volatility).toBe("moderate");
  });

  it("invalid prices (≤ 0, NaN) never enter a trend", () => {
    const { trends, insufficient } = computeMaterialTrends([
      pt("cement", -5, 1),
      pt("cement", Number.NaN, 2),
      pt("cement", 100, 3),
      pt("cement", 110, 4),
      pt("cement", 108, 5),
    ]);
    expect(insufficient).toEqual([]); // the 3 valid points made a trend
    expect(trends[0].dataPoints).toBe(3);
  });

  it("materials are grouped independently", () => {
    const { trends, insufficient } = computeMaterialTrends([
      pt("a", 100, 1),
      pt("a", 110, 2),
      pt("a", 120, 3),
      pt("b", 50, 1),
      pt("b", 51, 2),
    ]);
    expect(trends).toHaveLength(1);
    expect(insufficient).toEqual(["b"]);
  });
});
