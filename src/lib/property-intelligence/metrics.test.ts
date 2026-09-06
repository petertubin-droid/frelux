/**
 * Property Intelligence — metrics tests (Prompt 4, Phase 19: mathematical).
 *
 * Deterministic, unit-safe, currency-safe. No silent mixing of periods,
 * currencies, or missing values.
 */

import { describe, it, expect } from "vitest";
import {
  grossRentalYield,
  netRentalYield,
  totalDevelopmentCost,
  developmentMargin,
} from "./metrics";

describe("grossRentalYield", () => {
  it("calculates annual rent yield deterministically", () => {
    const result = grossRentalYield({
      rent: { amount: 1_200_000, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
    });
    expect(result.status).toBe("calculated");
    expect(result.value).toBeCloseTo(10, 10); // 1.2M / 12M = 10%
  });

  it("converts monthly rent to annual EXPLICITLY and records the assumption", () => {
    const result = grossRentalYield({
      rent: { amount: 100_000, period: "monthly", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
    });
    expect(result.status).toBe("calculated");
    expect(result.value).toBeCloseTo(10, 10); // 100k × 12 = 1.2M
    expect(result.assumptions.some((a) => a.includes("× 12"))).toBe(true);
  });

  it("rejects mixed currencies instead of silently converting", () => {
    const result = grossRentalYield({
      rent: { amount: 2_000, period: "annual", currency: "USD" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
    });
    expect(result.status).toBe("invalid_input");
    expect(result.reason).toContain("USD");
    expect(result.reason).toContain("NGN");
    expect(result.value).toBeUndefined();
  });

  it("returns insufficient_data for missing or non-positive inputs", () => {
    const result = grossRentalYield({
      rent: { amount: 0, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.value).toBeUndefined();
  });

  it("does not prematurely round — precision preserved", () => {
    const result = grossRentalYield({
      rent: { amount: 100_000, period: "monthly", currency: "NGN" },
      propertyPrice: { amount: 9_850_000, currency: "NGN" },
    });
    expect(result.value).toBeCloseTo(1_200_000 / 9_850_000 * 100, 10);
  });
});

describe("netRentalYield", () => {
  it("calculates net yield only when expenses are provided", () => {
    const result = netRentalYield({
      rent: { amount: 1_200_000, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
      annualOperatingExpenses: { amount: 200_000, currency: "NGN" },
    });
    expect(result.status).toBe("calculated");
    // (1.2M − 0.2M) / 12M = 8.333...%
    expect(result.value).toBeCloseTo(1_000_000 / 12_000_000 * 100, 10);
  });

  it("returns insufficient_data without expenses — never guesses them", () => {
    const result = netRentalYield({
      rent: { amount: 1_200_000, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.reason).toContain("not guessed");
  });

  it("rejects expenses in a different currency", () => {
    const result = netRentalYield({
      rent: { amount: 1_200_000, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 12_000_000, currency: "NGN" },
      annualOperatingExpenses: { amount: 200, currency: "USD" },
    });
    expect(result.status).toBe("invalid_input");
  });
});

describe("totalDevelopmentCost", () => {
  const base = {
    currency: "NGN",
    purchaseCost: { amount: 5_000_000, currency: "NGN" },
    constructionCost: {
      amount: 8_000_000,
      currency: "NGN",
      source: "Construction Intelligence estimate",
    },
  };

  it("sums known costs in one currency", () => {
    const result = totalDevelopmentCost({
      ...base,
      otherKnownCosts: [{ label: "Legal fees", amount: 500_000, currency: "NGN" }],
    });
    expect(result.status).toBe("calculated");
    expect(result.totalKnownCost).toBe(13_500_000);
    expect(result.knownCostBreakdown).toHaveLength(3);
  });

  it("rejects cross-currency items instead of mixing", () => {
    const result = totalDevelopmentCost({
      ...base,
      otherKnownCosts: [{ label: "Imported fittings", amount: 2_000, currency: "USD" }],
    });
    expect(result.status).toBe("invalid_input");
    expect(result.reason).toContain("USD");
    expect(result.totalKnownCost).toBeUndefined();
  });

  it("tracks unpriced items explicitly — the true cost is stated as higher", () => {
    const result = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
      unpricedItems: ["professional fees", "utility connections"],
    });
    expect(result.status).toBe("calculated");
    expect(result.totalKnownCost).toBe(5_000_000);
    expect(result.unpricedItems).toContain("professional fees");
    expect(result.reason).toContain("true total is at least as high");
  });

  it("returns insufficient_data when nothing is priced", () => {
    const result = totalDevelopmentCost({ currency: "NGN" });
    expect(result.status).toBe("insufficient_data");
    expect(result.totalKnownCost).toBeUndefined();
  });
});

describe("developmentMargin", () => {
  it("calculates margin from a priced cost result", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
      constructionCost: { amount: 8_000_000, currency: "NGN", source: "CI estimate" },
      otherKnownCosts: [{ label: "Legal fees", amount: 500_000, currency: "NGN" }],
    });
    const margin = developmentMargin(cost, { amount: 18_000_000, currency: "NGN" });
    expect(margin.status).toBe("calculated");
    // (18M − 13.5M) / 13.5M = 33.33...%
    expect(margin.value).toBeCloseTo(4_500_000 / 13_500_000 * 100, 10);
  });

  it("does not assume an expected sale value", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
    });
    const margin = developmentMargin(cost, undefined);
    expect(margin.status).toBe("insufficient_data");
    expect(margin.reason).toContain("does not assume");
  });

  it("notes unpriced items in the margin assumptions", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
      unpricedItems: ["utility connections"],
    });
    const margin = developmentMargin(cost, { amount: 9_000_000, currency: "NGN" });
    expect(margin.status).toBe("calculated");
    expect(margin.assumptions.some((a) => a.includes("utility connections"))).toBe(true);
  });

  it("rejects a sale value in a different currency", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
    });
    const margin = developmentMargin(cost, { amount: 12_000, currency: "USD" });
    expect(margin.status).toBe("invalid_input");
  });
});

describe("mathematical boundary & invalid-value audit (Phase 12)", () => {
  it("handles extremely large values without overflow or precision loss", () => {
    const result = grossRentalYield({
      rent: { amount: 9e15, period: "annual", currency: "NGN" },
      propertyPrice: { amount: 9e17, currency: "NGN" },
    });
    expect(result.status).toBe("calculated");
    expect(result.value).toBeCloseTo(1, 12); // 9e15 / 9e17 = 1%
  });

  it("rejects non-finite inputs (NaN, Infinity)", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = grossRentalYield({
        rent: { amount: bad, period: "annual", currency: "NGN" },
        propertyPrice: { amount: 12_000_000, currency: "NGN" },
      });
      expect(result.status).toBe("insufficient_data");
      expect(result.value).toBeUndefined();
    }
  });

  it("rejects negative and zero prices and rents", () => {
    for (const bad of [0, -5_000_000]) {
      const result = grossRentalYield({
        rent: { amount: 1_200_000, period: "annual", currency: "NGN" },
        propertyPrice: { amount: bad, currency: "NGN" },
      });
      expect(result.status).toBe("insufficient_data");
      expect(result.reason).toContain("positive");
    }
  });

  it("rejects negative costs in the development total", () => {
    const result = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: -1, currency: "NGN" },
    });
    expect(result.status).not.toBe("calculated");
    expect(result.unpricedItems.join(" ")).toContain("invalid amount");
  });

  it("rejects non-finite sale values in the margin", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
    });
    const margin = developmentMargin(cost, { amount: Number.NaN, currency: "NGN" });
    expect(margin.status).toBe("insufficient_data");
    expect(margin.value).toBeUndefined();
  });

  it("preserves full precision through chained metric calculations", () => {
    const cost = totalDevelopmentCost({
      currency: "NGN",
      purchaseCost: { amount: 5_000_000, currency: "NGN" },
      constructionCost: { amount: 8_000_000, currency: "NGN", source: "CI" },
      otherKnownCosts: [{ label: "Fees", amount: 1_666_667, currency: "NGN" }],
    });
    expect(cost.totalKnownCost).toBeCloseTo(14_666_667, 6);
    const margin = developmentMargin(cost, { amount: 19_000_000, currency: "NGN" });
    expect(margin.value).toBeCloseTo(4_333_333 / 14_666_667 * 100, 9);
  });
});
