import { describe, it, expect } from "vitest";
import { groupByCategory, materialSummaryToText } from "./material-summary";
import type { MaterialLineItem } from "./material-summary";

describe("measurement/material-summary", () => {
  it("groupByCategory groups lines by category", () => {
    const lines: MaterialLineItem[] = [
      {
        lineId: "1",
        materialId: "m1",
        category: "paint",
        productName: "Paint A",
        areaM2: 10,
        requiredQuantity: 2,
        purchaseQuantity: 3,
        buyQuantity: 1,
        packageSize: 20,
        packageUnit: "litres",
        quantityUnit: "bucket",
        alreadyHaveQuantity: 1,
        coveragePerUnit: 10,
        coats: 2,
        wastePercent: 10,
        unitPrice: 5000,
        lineTotal: 15000,
        source: "test",
      },
      {
        lineId: "2",
        materialId: "m2",
        category: "paint",
        productName: "Paint B",
        areaM2: 20,
        requiredQuantity: 4,
        purchaseQuantity: 5,
        buyQuantity: 5,
        packageSize: 20,
        packageUnit: "litres",
        quantityUnit: "bucket",
        alreadyHaveQuantity: 0,
        coveragePerUnit: 10,
        coats: 2,
        wastePercent: 10,
        unitPrice: 6000,
        lineTotal: 30000,
        source: "test",
      },
      {
        lineId: "3",
        materialId: "m3",
        category: "cement",
        productName: "Cement",
        areaM2: 50,
        requiredQuantity: 10,
        purchaseQuantity: 12,
        buyQuantity: 12,
        packageSize: 50,
        packageUnit: "kg",
        quantityUnit: "bag",
        alreadyHaveQuantity: 0,
        coveragePerUnit: 5,
        coats: 1,
        wastePercent: 5,
        unitPrice: 4500,
        lineTotal: 54000,
        source: "test",
      },
    ];
    const groups = groupByCategory(lines);
    expect(groups.length).toBe(2);
    const paint = groups.find((g) => g.category === "paint");
    expect(paint!.lines.length).toBe(2);
    expect(paint!.totalPurchaseQuantity).toBe(8);
    expect(paint!.totalBuyQuantity).toBe(6);
  });

  it("groupByCategory handles empty array", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("materialSummaryToText produces non-empty string", () => {
    const summary = {
      projectName: "Test Project",
      lineItems: [],
      categorySubtotals: [],
      grandTotalAreaM2: 0,
      grandTotalPurchase: 0,
      grandTotalBuy: 0,
      grandTotalCost: 0,
      currency: "NGN",
    };
    const text = materialSummaryToText(summary);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });
});
