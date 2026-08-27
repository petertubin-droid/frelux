import { describe, it, expect } from "vitest";
import { groupByCategory, materialSummaryToText } from "./material-summary";
import type { MaterialLineItem, ProjectMaterialSummary } from "./material-summary";

describe("measurement/material-summary", () => {
  it("groupByCategory groups lines by category", () => {
    const lines: MaterialLineItem[] = [
      {
        lineId: "1",
        materialId: "m1",
        category: "paint",
        materialName: "Paint A",
        finishType: "emulsion",
        areaM2: 10,
        coats: 2,
        baseQuantity: 2,
        wastePercent: 10,
        quantityWithWaste: 2.2,
        purchaseQuantity: 3,
        alreadyHaveQuantity: 1,
        buyQuantity: 1,
        quantityUnit: "bucket",
        source: "test",
      },
      {
        lineId: "2",
        materialId: "m2",
        category: "paint",
        materialName: "Paint B",
        finishType: "emulsion",
        areaM2: 20,
        coats: 2,
        baseQuantity: 4,
        wastePercent: 10,
        quantityWithWaste: 4.4,
        purchaseQuantity: 5,
        alreadyHaveQuantity: 0,
        buyQuantity: 5,
        quantityUnit: "bucket",
        source: "test",
      },
      {
        lineId: "3",
        materialId: "m3",
        category: "cement",
        materialName: "Cement",
        finishType: "screed",
        areaM2: 50,
        coats: 1,
        baseQuantity: 10,
        wastePercent: 5,
        quantityWithWaste: 10.5,
        purchaseQuantity: 12,
        alreadyHaveQuantity: 0,
        buyQuantity: 12,
        quantityUnit: "bag",
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
    const summary: ProjectMaterialSummary = {
      projectName: "Test Project",
      lineItems: [],
      categorySubtotals: [],
      grandTotalAreaM2: 0,
      totalLines: 0,
    };
    const text = materialSummaryToText(summary);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });
});
