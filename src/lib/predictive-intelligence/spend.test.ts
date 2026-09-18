// =========================================================
// PREDICTIVE INTELLIGENCE, SPEND MATH TESTS (§12)
//
// Pure deterministic sums over real rows — every expected value
// below was computed by hand from the fixture rows before the
// test was written. Proxies are explicitly tested AS proxies.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  recordedStageProgress,
  recordedActualLines,
  purchasedLines,
  lineEstimatedTotal,
  lineActualTotal,
  estimatedShoppingTotal,
  recordedSpend,
  strictlyRecordedSpend,
  unpurchasedEstimatedTotal,
  estimateTimeline,
  originalEstimate,
  currentEstimate,
  linesWithRecordedPriceIncrease,
} from "./spend";
import type { ShoppingRow } from "./internal-types";

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
}); // no actual price

describe("spend math", () => {
  it("recordedStageProgress: null with no stages, exact fraction with rows", () => {
    expect(recordedStageProgress([])).toBeNull();
    expect(
      recordedStageProgress([
        { isCompleted: true },
        { isCompleted: false },
        { isCompleted: false },
      ] as never),
    ).toBeCloseTo(1 / 3, 10);
  });

  it("lineEstimatedTotal: total_price wins, falls back to qty × estimate", () => {
    expect(lineEstimatedTotal(A)).toBe(900);
    expect(lineEstimatedTotal({ ...A, total_price: 0 })).toBe(2 * 450);
    expect(
      lineEstimatedTotal({ ...A, total_price: 0, estimated_price: Number.NaN }),
    ).toBe(0);
  });

  it("lineActualTotal: actual × quantity when recorded, estimate proxy otherwise", () => {
    expect(lineActualTotal(A)).toBe(500 * 2); // recorded
    expect(lineActualTotal(C)).toBe(100); // proxy at estimate
  });

  it("recordedSpend counts purchased lines (proxies included); strictlyRecordedSpend excludes proxies", () => {
    expect(recordedSpend([A, B, C])).toBe(1000 + 100); // 1000 actual + 100 proxy
    expect(strictlyRecordedSpend([A, B, C])).toBe(1000); // A only
    expect(recordedActualLines([A, B, C])).toHaveLength(1);
    expect(purchasedLines([A, B, C])).toHaveLength(2);
  });

  it("estimatedShoppingTotal and unpurchasedEstimatedTotal (hand-calculated)", () => {
    expect(estimatedShoppingTotal([A, B, C])).toBe(900 + 600 + 100);
    expect(unpurchasedEstimatedTotal([A, B, C])).toBe(600);
    expect(estimatedShoppingTotal([])).toBe(0);
  });

  it("estimateTimeline keeps only positive finite totals, chronological", () => {
    const calcs = [
      {
        id: "c1",
        title: "old",
        estimatedTotal: 100,
        createdAt: "2026-01-05T00:00:00Z",
      },
      {
        id: "c2",
        title: "junk-null",
        estimatedTotal: null,
        createdAt: "2026-02-01T00:00:00Z",
      },
      {
        id: "c3",
        title: "junk-neg",
        estimatedTotal: -5,
        createdAt: "2026-02-02T00:00:00Z",
      },
      {
        id: "c4",
        title: "new",
        estimatedTotal: 200,
        createdAt: "2026-03-01T00:00:00Z",
      },
    ];
    const tl = estimateTimeline(calcs as never);
    expect(tl.map((p) => p.id)).toEqual(["c1", "c4"]);
    expect(originalEstimate(calcs as never)).toBe(100);
    expect(currentEstimate(calcs as never, [])).toBe(200);
  });

  it("currentEstimate falls back to the shopping-list budget when no saved calculations exist", () => {
    expect(currentEstimate([], [A, B])).toBe(1500);
    expect(currentEstimate([], [])).toBeNull();
    expect(originalEstimate([])).toBeNull();
  });

  it("linesWithRecordedPriceIncrease: only recorded actuals above their estimate", () => {
    const inc = linesWithRecordedPriceIncrease([A, B, C]);
    expect(inc).toHaveLength(1);
    expect(inc[0].item.id).toBe("a");
    expect(inc[0].increasePct).toBeCloseTo(500 / 450 - 1, 10);
  });
});
