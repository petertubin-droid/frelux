import { describe, it, expect } from "vitest";
import {
  calculateInflationBuffer,
  calculateDiasporaBudgetTracker,
} from "../diaspora-budget-tracker-engine";

describe("Diaspora Budget Tracker & Inflation Engine", () => {
  it("calculates time-weighted inflation multiplier correctly", () => {
    // 24% annual inflation over 6 months -> (1 + 0.24)^(6/12) = sqrt(1.24) ~ 1.11355
    const projected = calculateInflationBuffer(10000, 24, 6);
    expect(projected).toBeCloseTo(11135.53, 1);

    // 0 months -> same cost
    expect(calculateInflationBuffer(5000, 20, 0)).toBe(5000);
  });

  it("calculates diaspora budget tracking, FX gap, and material deviation", () => {
    const summary = calculateDiasporaBudgetTracker({
      sponsorBaseBudgetForeign: 15000,
      sponsorCurrency: "USD",
      localCurrency: "NGN",
      parallelExchangeRate: 1600,
      officialExchangeRate: 1450,
      annualInflationRatePercent: 24,
      timelineMonths: 6,
      milestones: [
        { name: "Phase 1 Foundation", allocatedForeign: 5000, spentLocal: 7200000, completed: true },
        { name: "Phase 2 Framing", allocatedForeign: 10000, spentLocal: 0, completed: false },
      ],
    });

    expect(summary.totalSentForeign).toBe(5000);
    expect(summary.remainingBudgetForeign).toBe(10000);
    expect(summary.totalSpentLocal).toBe(7200000);
    expect(summary.equivalentSpentForeign).toBe(4500); // 7.2M / 1600 = 4500
    expect(summary.exchangeRateGapPercent).toBe(10.3); // (1600 - 1450) / 1450 * 100
    expect(summary.inflationMultiplier).toBe(1.114);
    expect(summary.inflationAdjustedProjectedForeign).toBe(16710);
    expect(summary.isOverBudget).toBe(false);
  });

  it("detects over-budget and material variance", () => {
    const summary = calculateDiasporaBudgetTracker({
      sponsorBaseBudgetForeign: 10000,
      sponsorCurrency: "USD",
      localCurrency: "NGN",
      parallelExchangeRate: 1600,
      milestones: [
        { name: "All Work", allocatedForeign: 10000, spentLocal: 17600000, completed: true },
      ],
    });

    // 17.6M / 1600 = 11,000 USD -> 10% over budget!
    expect(summary.equivalentSpentForeign).toBe(11000);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.materialDeviationPercent).toBe(10);
  });
});
