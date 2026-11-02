// =========================================================
// PREDICTIVE INTELLIGENCE, PROCUREMENT-RISK TESTS (§12)
//
// Deterministic bands (documented in code):
//   high:   needed item with a recorded price increase > 25%
//   medium: needed unpurchased without supplier, or increase
//           5–25%, or stale market prices on needed items
//   low:    needs covered (all purchased, or no remaining work)
// Supplier AVAILABILITY is never claimed (limitation pinned).
// =========================================================
import { describe, it, expect } from "vitest";
import { analyzeProcurementRisk } from "./procurement-risk";
import type { ShoppingRow } from "./internal-types";

const NOW = "2026-09-18T12:00:00.000Z";
const D = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

function row(over: Partial<ShoppingRow> = {}): ShoppingRow {
  return {
    id: "r",
    project_id: "p",
    category: "c",
    name: "cement",
    quantity: 1,
    unit: "bag",
    estimated_price: 100,
    actual_price: null,
    total_price: 100,
    supplier: "Depot Ltd",
    notes: null,
    is_purchased: false,
    sort_order: 0,
    ...over,
  };
}
const mp = (label: string, collectedAt: string) => ({
  id: `mp-${label}`,
  label,
  price: 100,
  currencyCode: "NGN",
  marketCode: "ng",
  region: "Lagos",
  collectedAt,
  verified: true,
});

describe("analyzeProcurementRisk", () => {
  it("no shopping list → insufficient_data", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [],
      marketPrices: [],
      remainingWork: true,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.missingData).toContain("shopping_list");
  });

  it("no remaining work → LOW even with unpurchased items", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [row({ id: "a", name: "cement" })],
      marketPrices: [],
      remainingWork: false,
    });
    expect(r.result?.rating).toBe("low");
    expect(
      r.assumptions.some((a) => a.includes("no procurement is flagged")),
    ).toBe(true);
  });

  it("needed unpurchased item without supplier → MEDIUM", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [row({ id: "a", supplier: "" })],
      marketPrices: [],
      remainingWork: true,
    });
    expect(r.result?.rating).toBe("medium");
    expect(r.result?.unpurchasedCount).toBe(1);
    expect(r.result?.missingSupplierNames).toEqual(["cement"]);
  });

  it("needed item with a recorded price increase > 25% → HIGH", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [
        row({
          id: "a",
          estimated_price: 100,
          actual_price: 150,
          is_purchased: false,
        }),
      ],
      marketPrices: [],
      remainingWork: true,
    });
    expect(r.result?.rating).toBe("high"); // 150/100 - 1 = +50% > 25% on a needed item
    expect(
      r.limitations.some((l) =>
        l.includes("never claims a material is unavailable"),
      ),
    ).toBe(true);
  });

  it("needed item with a moderate recorded increase (5–25%) → MEDIUM", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [
        row({
          id: "a",
          estimated_price: 100,
          actual_price: 110,
          is_purchased: false,
        }),
      ],
      marketPrices: [],
      remainingWork: true,
    });
    expect(r.result?.rating).toBe("medium");
  });

  it("stale market prices on needed items → MEDIUM; fresh → LOW band inputs", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [row({ id: "a" })],
      marketPrices: [mp("cement bag", D(200))],
      remainingWork: true,
    });
    expect(r.result?.rating).toBe("medium");
    expect(r.freshness).toBe("outdated");
  });

  it("all purchased with suppliers → LOW", () => {
    const r = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [row({ id: "a", is_purchased: true, actual_price: 100 })],
      marketPrices: [],
      remainingWork: true,
    });
    expect(r.result?.rating).toBe("low");
  });
});
