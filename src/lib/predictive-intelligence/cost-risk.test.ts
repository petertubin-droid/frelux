// =========================================================
// PREDICTIVE INTELLIGENCE, COST-OVERRUN TESTS (§12/§18)
//
// Hand-calculated pro-rata burn math (estimate 10,000):
//   spend 6,500 at 50% progress → expected 5,000, burn +1,500
//   → burnPct 0.15 > 0.10 → HIGH; projected final 11,500 (+15%)
//   spend 4,000 → burnPct -0.20 → LOW (at or under pro-rata)
// Missing estimate or spend/progress → insufficient, never a
// reassuring zero.
// =========================================================
import { describe, it, expect } from "vitest";
import { analyzeCostOverrun } from "./cost-risk";
import type { ShoppingRow } from "./internal-types";

const NOW = "2026-09-18T12:00:00.000Z";

function row(over: Partial<ShoppingRow> = {}): ShoppingRow {
  return {
    id: "r",
    project_id: "p",
    category: "c",
    name: "item",
    quantity: 1,
    unit: "bag",
    estimated_price: 100,
    actual_price: null,
    total_price: 100,
    supplier: null,
    notes: null,
    is_purchased: false,
    sort_order: 0,
    ...over,
  };
}
function stage(done: number, total: number) {
  return Array.from({ length: total }, (_, i) => ({
    id: `s${i}`,
    stageKey: `stage-${i}`,
    stageName: `s${i}`,
    sortOrder: i + 1,
    isCompleted: i < done,
    completedAt: i < done ? "2026-06-01T00:00:00Z" : null,
    hasPhoto: false,
    updatedAt: "2026-06-01T00:00:00Z",
  }));
}
const calcs = [
  {
    id: "c1",
    title: "estimate",
    createdAt: "2026-01-01T00:00:00Z",
    estimatedTotal: 10_000,
    calculatorType: "paint",
  },
];

describe("analyzeCostOverrun", () => {
  it("no estimate → insufficient_data, honestly listing what is missing", () => {
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: [],
      shoppingItems: [],
      stages: [],
      userProgressPct: null,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.missingData).toContain("recorded_estimate");
    expect(r.result).toBeNull();
  });

  it("estimate but no spend or progress → still insufficient", () => {
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: calcs as never,
      shoppingItems: [],
      stages: [],
      userProgressPct: null,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.missingData).toContain("recorded_spend_or_progress");
  });

  it("hand-calculated HIGH burn: +15% over pro-rata at 50% progress", () => {
    const spend = row({
      quantity: 13,
      estimated_price: 500,
      actual_price: 500,
      total_price: 6500,
      is_purchased: true,
    });
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: calcs as never,
      shoppingItems: [spend],
      stages: stage(1, 2),
      userProgressPct: null,
    });
    expect(r.status).toBe("ok");
    if (!r.result) throw new Error("expected result");
    expect(r.result.rating).toBe("high");
    expect(r.result.currentEstimate).toBe(10_000);
    expect(r.result.progressFraction).toBe(0.5);
    expect(r.result.expectedSpendAtProgress).toBe(5_000);
    expect(r.result.burnVariance).toBe(1_500);
    expect(r.result.burnPct).toBeCloseTo(0.15, 10);
    expect(r.result.projectedFinalCost).toBe(11_500);
    expect(r.result.projectedOverrunPct).toBeCloseTo(0.15, 10);
    expect(r.prediction).toContain("HIGH");
  });

  it("LOW burn: recorded spend at or under the pro-rata estimate", () => {
    const spend = row({
      quantity: 8,
      estimated_price: 500,
      actual_price: 500,
      total_price: 4000,
      is_purchased: true,
    });
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: calcs as never,
      shoppingItems: [spend],
      stages: stage(1, 2),
      userProgressPct: null,
    });
    expect(r.result?.rating).toBe("low");
    expect(r.result?.burnPct).toBeCloseTo(-0.1, 10); // -1000 / 10000
  });

  it("falls back to user-stated progress when no stages are recorded", () => {
    const spend = row({
      quantity: 5,
      estimated_price: 1000,
      actual_price: 1000,
      total_price: 5000,
      is_purchased: true,
    });
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: calcs as never,
      shoppingItems: [spend],
      stages: [],
      userProgressPct: 50,
    });
    expect(r.result?.progressFraction).toBe(0.5);
    expect(r.result?.expectedSpendAtProgress).toBe(5_000);
    expect(r.result?.rating).toBe("low"); // exactly on pro-rata
  });

  it("shopping-list budget is a valid current estimate (fallback, disclosed)", () => {
    const spend = row({
      id: "a",
      name: "cement",
      quantity: 2,
      estimated_price: 450,
      actual_price: 500,
      total_price: 900,
      is_purchased: true,
    });
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: [],
      shoppingItems: [spend],
      stages: stage(1, 2),
      userProgressPct: null,
    });
    expect(r.status).toBe("ok");
    expect(r.result?.currentEstimate).toBe(900);
  });

  it("recorded price increases are surfaced as evidence rows", () => {
    const spend = row({
      id: "a",
      name: "cement",
      quantity: 1,
      estimated_price: 100,
      actual_price: 150,
      total_price: 100,
      is_purchased: true,
    });
    const r = analyzeCostOverrun({
      now: NOW,
      calculations: calcs as never,
      shoppingItems: [spend],
      stages: stage(1, 2),
      userProgressPct: null,
    });
    expect(r.result?.priceIncreasedLines).toHaveLength(1);
    expect(r.result?.priceIncreasedLines[0].increasePct).toBeCloseTo(0.5, 10);
  });
});
