import { describe, it, expect } from "vitest";
import { compareEstimates, type ComparisonColumn } from "./project-comparison";
import type { CostEstimate } from "./cost-integration";

function makeEstimate(
  grandTotal: number,
  lineItems: {
    materialName: string;
    category: string;
    lineTotal: number;
  }[] = [],
  categories: { name: string; subtotal: number }[] = [],
): CostEstimate {
  return {
    lineItems: lineItems.map((li, i) => ({
      id: `li-${i}`,
      materialName: li.materialName,
      category: li.category,
      quantity: 1,
      quantityUnit: "unit",
      unitPrice: li.lineTotal,
      lineTotal: li.lineTotal,
      priced: true,
    })),
    categories: categories.map((c) => ({
      name: c.name,
      items: [],
      subtotal: c.subtotal,
      itemCount: 0,
      allPriced: true,
    })),
    materialsTotal: grandTotal,
    labourTotal: 0,
    contingencyPercent: 0,
    contingencyAmount: 0,
    grandTotal,
    currency: "NGN",
    confidence: "high",
    pricedItemCount: lineItems.length,
  } as unknown as CostEstimate;
}

describe("measurement/project-comparison", () => {
  it("returns empty result for less than 2 columns", () => {
    const cols: ComparisonColumn[] = [
      { label: "A", estimate: makeEstimate(100) },
    ];
    const result = compareEstimates(cols);
    expect(result.materialRows).toEqual([]);
    expect(result.summary.materialCount).toBe(0);
    expect(result.explanation).toContain(
      "Need at least 2 estimates to compare.",
    );
  });

  it("compares 2 estimates and finds cheapest/most expensive", () => {
    const cols: ComparisonColumn[] = [
      { label: "Budget", estimate: makeEstimate(1000) },
      { label: "Premium", estimate: makeEstimate(1500) },
    ];
    const result = compareEstimates(cols);
    expect(result.summary.cheapestLabel).toBe("Budget");
    expect(result.summary.mostExpensiveLabel).toBe("Premium");
    expect(result.summary.spread).toBe(500);
  });

  it("builds material rows with values and deltas", () => {
    const cols: ComparisonColumn[] = [
      {
        label: "A",
        estimate: makeEstimate(
          300,
          [
            { materialName: "Cement", category: "Materials", lineTotal: 200 },
            { materialName: "Sand", category: "Materials", lineTotal: 100 },
          ],
          [{ name: "Materials", subtotal: 300 }],
        ),
      },
      {
        label: "B",
        estimate: makeEstimate(
          400,
          [
            { materialName: "Cement", category: "Materials", lineTotal: 250 },
            { materialName: "Sand", category: "Materials", lineTotal: 150 },
          ],
          [{ name: "Materials", subtotal: 400 }],
        ),
      },
    ];
    const result = compareEstimates(cols);
    expect(result.materialRows.length).toBe(2);
    const cement = result.materialRows.find((r) => r.materialName === "Cement");
    expect(cement?.values).toEqual([200, 250]);
    expect(cement?.deltas).toEqual([0, 50]);
    expect(cement?.spread).toBe(50);
  });

  it("handles missing materials in some columns", () => {
    const cols: ComparisonColumn[] = [
      {
        label: "A",
        estimate: makeEstimate(100, [
          { materialName: "Cement", category: "M", lineTotal: 100 },
        ]),
      },
      {
        label: "B",
        estimate: makeEstimate(200, [
          { materialName: "Blocks", category: "M", lineTotal: 200 },
        ]),
      },
    ];
    const result = compareEstimates(cols);
    expect(result.materialRows.length).toBe(2);
    const cement = result.materialRows.find((r) => r.materialName === "Cement");
    expect(cement?.values).toEqual([100, null]);
  });

  it("builds category rows", () => {
    const cols: ComparisonColumn[] = [
      {
        label: "A",
        estimate: makeEstimate(
          300,
          [],
          [
            { name: "Materials", subtotal: 200 },
            { name: "Labour", subtotal: 100 },
          ],
        ),
      },
      {
        label: "B",
        estimate: makeEstimate(
          400,
          [],
          [
            { name: "Materials", subtotal: 250 },
            { name: "Labour", subtotal: 150 },
          ],
        ),
      },
    ];
    const result = compareEstimates(cols);
    expect(result.categoryRows.length).toBe(2);
  });

  it("generates explanation strings", () => {
    const cols: ComparisonColumn[] = [
      { label: "Budget", estimate: makeEstimate(1000) },
      { label: "Premium", estimate: makeEstimate(2000) },
    ];
    const result = compareEstimates(cols);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanation.some((e) => e.includes("Cheapest"))).toBe(true);
    expect(result.explanation.some((e) => e.includes("Most expensive"))).toBe(
      true,
    );
  });
});
