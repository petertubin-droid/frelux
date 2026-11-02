// =========================================================
// PREDICTIVE INTELLIGENCE, CASH-FLOW TESTS (§12)
//
// Hand-calculated cash-flow from real rows:
//   planned 1600 = 900 (cement, est) + 600 (sand) + 100 (nails)
//   recorded 1100 = 500×2 actual cement + 100 nail proxy
//   remaining 500, variance -500, upcoming = sand 600
// No-shopping-list projects are INSUFFICIENT, never zero-OK.
// =========================================================
import { describe, it, expect } from "vitest";
import { analyzeCashflow } from "./cashflow";
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

const A = row({
  id: "a",
  name: "cement",
  quantity: 2,
  estimated_price: 450,
  actual_price: 500,
  total_price: 900,
  is_purchased: true,
});
const B = row({
  id: "b",
  name: "sand",
  quantity: 3,
  estimated_price: 200,
  total_price: 600,
  is_purchased: false,
});
const C = row({
  id: "c",
  name: "nails",
  quantity: 1,
  estimated_price: 100,
  total_price: 100,
  is_purchased: true,
});

const calc = (id: string, total: number | null, createdAt: string) => ({
  id,
  title: `calc-${id}`,
  createdAt,
  estimatedTotal: total,
  calculatorType: "paint",
});

describe("analyzeCashflow", () => {
  it("no shopping list → insufficient_data with honest missing-data list", () => {
    const r = analyzeCashflow({
      now: NOW,
      calculations: [],
      shoppingItems: [],
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.result).toBeNull();
    expect(r.missingData).toContain("shopping_list");
    expect(r.confidence).toBeNull();
  });

  it("hand-calculated planned/recorded/remaining/variance/upcoming", () => {
    const r = analyzeCashflow({
      now: NOW,
      calculations: [calc("c1", 1500, "2026-09-01T00:00:00Z")],
      shoppingItems: [A, B, C],
    });
    expect(r.status).toBe("ok");
    expect(r.result).not.toBeNull();
    if (!r.result) throw new Error("expected result");
    expect(r.result.plannedSpending).toBe(1600);
    expect(r.result.recordedSpending).toBe(1100);
    expect(r.result.remainingEstimatedCost).toBe(500);
    expect(r.result.spendingVariance).toBe(-500);
    expect(r.result.upcomingRequirements).toEqual([
      { name: "sand", estimated: 600 },
    ]);
    expect(r.result.proxiedLineCount).toBe(1); // nails: purchased, no actual price
  });

  it("proxied lines are DISCLOSED as a lower-bound assumption", () => {
    const r = analyzeCashflow({
      now: NOW,
      calculations: [],
      shoppingItems: [A, C],
    });
    expect(r.assumptions.some((a) => /1 purchased line\(s\)/.test(a))).toBe(
      true,
    );
  });

  it("the prediction string carries the real numbers", () => {
    const r = analyzeCashflow({
      now: NOW,
      calculations: [],
      shoppingItems: [A, B, C],
    });
    expect(r.prediction).toContain("1600.00");
    expect(r.prediction).toContain("1100.00");
    expect(r.prediction).toContain("600.00");
    expect(r.prediction).toContain("1 unpurchased item(s)");
  });

  it("evidence rows trace to real rows; freshness from calculation dates", () => {
    const r = analyzeCashflow({
      now: NOW,
      calculations: [calc("c1", 1600, "2026-09-10T00:00:00Z")],
      shoppingItems: [A, B],
    });
    expect(r.evidence.length).toBe(3); // 2 items + 1 calculation
    expect(r.freshness).toBe("current");
    expect(r.inputs.find((i) => i.key === "planned_spending")?.value).toBe(
      1500,
    );
  });

  it("remaining cost never goes negative when spend exceeds the plan", () => {
    const over = row({
      id: "z",
      name: "tiles",
      quantity: 5,
      estimated_price: 100,
      actual_price: 400,
      total_price: 500,
      is_purchased: true,
    });
    const r = analyzeCashflow({
      now: NOW,
      calculations: [],
      shoppingItems: [over],
    });
    expect(r.result?.recordedSpending).toBe(2000);
    expect(r.result?.remainingEstimatedCost).toBe(0);
    expect(r.result?.spendingVariance).toBe(1500);
  });
});
