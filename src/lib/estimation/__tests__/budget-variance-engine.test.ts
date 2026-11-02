/**
 * Tests for budget-variance-engine (roadmap Wave 1.1).
 * Pure-function coverage: category math, thresholds, degenerate
 * cases, and the internationalization contract (currency never
 * enters the math).
 */
import { describe, expect, it } from "vitest";
import {
  clampFraction,
  computeBudgetVariance,
  OVER_FRACTION,
  ON_TRACK_FRACTION,
  type VarianceExpense,
} from "../budget-variance-engine";

function exp(
  category: string,
  amount: number,
): VarianceExpense {
  return { category, amount };
}

describe("computeBudgetVariance", () => {
  it("computes per-category estimated vs actual with deltas", () => {
    const result = computeBudgetVariance({
      estimated: { material: 1000, labour: 500, transport: 100, misc: 50 },
      expenses: [
        exp("material", 800),
        exp("material", 150),
        exp("labour", 450),
        exp("transport", 120),
      ],
    });

    expect(result.totalEstimated).toBe(1650);
    expect(result.totalActual).toBe(1520);
    expect(result.totalDelta).toBeCloseTo(-130);

    const material = result.categories.find((c) => c.category === "material")!;
    expect(material.estimated).toBe(1000);
    expect(material.actual).toBe(950);
    expect(material.delta).toBe(-50);
    expect(material.usedFraction).toBeCloseTo(0.95);
    expect(material.status).toBe("on_track");

    const labour = result.categories.find((c) => c.category === "labour")!;
    expect(labour.status).toBe("on_track");

    const transport = result.categories.find((c) => c.category === "transport")!;
    expect(transport.usedFraction).toBeCloseTo(1.2);
    expect(transport.status).toBe("over");

    const misc = result.categories.find((c) => c.category === "misc")!;
    expect(misc.actual).toBe(0);
    expect(misc.status).toBe("under");

    expect(result.overBudget).toBe(false);
    expect(result.unbudgetedCount).toBe(0);
  });

  it("flags over-budget when actual exceeds total estimated", () => {
    const result = computeBudgetVariance({
      estimated: { material: 500 },
      expenses: [exp("material", 400), exp("misc", 200)],
    });
    expect(result.totalActual).toBe(600);
    expect(result.totalEstimated).toBe(500);
    expect(result.overBudget).toBe(true);
    expect(result.totalUsedFraction).toBeCloseTo(1.2);
  });

  it("treats unknown categories defensively (counted, not added)", () => {
    const result = computeBudgetVariance({
      estimated: { material: 100 },
      expenses: [exp("material", 100), exp("weird_category", 999)],
    });
    expect(result.unbudgetedCount).toBe(1);
    expect(result.totalActual).toBe(100); // unknown row excluded from totals
  });

  it("handles zero estimated budget with spend", () => {
    const result = computeBudgetVariance({
      estimated: {},
      expenses: [exp("labour", 300)],
    });
    const labour = result.categories.find((c) => c.category === "labour")!;
    expect(labour.usedFraction).toBe(1);
    expect(labour.status).toBe("over");
    // No estimated total at all: not "over budget", but fully used
    expect(result.overBudget).toBe(false);
    expect(result.totalUsedFraction).toBe(1);
  });

  it("handles empty expenses and empty estimates", () => {
    const result = computeBudgetVariance({ estimated: {}, expenses: [] });
    expect(result.totalEstimated).toBe(0);
    expect(result.totalActual).toBe(0);
    expect(result.totalUsedFraction).toBe(0);
    expect(result.overBudget).toBe(false);
    expect(result.unbudgetedCount).toBe(0);
    for (const row of result.categories) {
      expect(row.status).toBe("under");
    }
  });

  it("ignores non-finite and negative amounts", () => {
    const result = computeBudgetVariance({
      estimated: { material: Number.NaN, labour: -50, transport: 200 },
      expenses: [
        exp("transport", Number.POSITIVE_INFINITY),
        exp("transport", -10),
        exp("transport", 100),
      ],
    });
    const transport = result.categories.find((c) => c.category === "transport")!;
    expect(transport.actual).toBe(100);
    expect(transport.estimated).toBe(200);
  });

  it("thresholds: under < 0.9 <= on_track <= 1.05 < over", () => {
    expect(ON_TRACK_FRACTION).toBeLessThan(OVER_FRACTION);
    const r1 = computeBudgetVariance({
      estimated: { material: 100 },
      expenses: [exp("material", 89)],
    });
    expect(r1.categories[0].status).toBe("under");

    const r2 = computeBudgetVariance({
      estimated: { material: 100 },
      expenses: [exp("material", 91)],
    });
    expect(r2.categories[0].status).toBe("on_track");

    const r3 = computeBudgetVariance({
      estimated: { material: 100 },
      expenses: [exp("material", 106)],
    });
    expect(r3.categories[0].status).toBe("over");
  });

  it("is currency-agnostic: same math for any currency magnitude", () => {
    // IDR-sized numbers (millions) and NGN-sized numbers behave identically
    const small = computeBudgetVariance({
      estimated: { material: 500 },
      expenses: [exp("material", 600)],
    });
    const large = computeBudgetVariance({
      estimated: { material: 5_000_000 },
      expenses: [exp("material", 6_000_000)],
    });
    expect(large.categories[0].usedFraction).toBeCloseTo(
      small.categories[0].usedFraction,
    );
    expect(large.overBudget).toBe(small.overBudget);
  });
});

describe("clampFraction", () => {
  it("clamps to [0,1] and defends against NaN", () => {
    expect(clampFraction(0)).toBe(0);
    expect(clampFraction(0.5)).toBe(0.5);
    expect(clampFraction(1.4)).toBe(1);
    expect(clampFraction(-3)).toBe(0);
    expect(clampFraction(Number.NaN)).toBe(0);
  });
});
