import { describe, it, expect } from "vitest";
import { buildCostLineItem, buildCostEstimate } from "./cost-integration";
import type {
  MaterialQuantityInput,
  MaterialPriceInput,
} from "./cost-integration";

describe("measurement/cost-integration", () => {
  const qty: MaterialQuantityInput = {
    materialName: "Cement",
    category: "Materials",
    quantity: 10,
    quantityUnit: "bags",
    quantitySource: "calculated",
  };

  const price: MaterialPriceInput = {
    materialName: "Cement",
    unitPrice: 5000,
    currency: "NGN",
    source: "market_intelligence",
    freshness: "fresh",
    confidence: "high",
  };

  it("buildCostLineItem computes lineTotal = quantity × unitPrice", () => {
    const item = buildCostLineItem(qty, price);
    expect(item.lineTotal).toBe(50000);
    expect(item.hasPrice).toBe(true);
    expect(item.currency).toBe("NGN");
    expect(item.priceSource).toBe("market_intelligence");
  });

  it("buildCostLineItem handles no price (hasPrice=false)", () => {
    const item = buildCostLineItem(qty, null);
    expect(item.hasPrice).toBe(false);
    expect(item.lineTotal).toBe(0);
    expect(item.unitPrice).toBe(0);
    expect(item.priceSource).toBe("not_configured");
    expect(item.explanation).toContain("no price configured");
  });

  it("buildCostLineItem marks user override", () => {
    const overridden: MaterialPriceInput = {
      ...price,
      source: "user_override",
      overridden: true,
    };
    const item = buildCostLineItem(qty, overridden);
    expect(item.priceOverridden).toBe(true);
    expect(item.explanation).toContain("user-overridden");
  });

  it("buildCostLineItem notes stale price", () => {
    const stale: MaterialPriceInput = { ...price, freshness: "stale" };
    const item = buildCostLineItem(qty, stale);
    expect(item.priceFreshness).toBe("stale");
    expect(item.explanation).toContain("stale");
  });

  it("buildCostEstimate groups by category and computes totals", () => {
    const quantities: MaterialQuantityInput[] = [
      {
        materialName: "Cement",
        category: "Materials",
        quantity: 10,
        quantityUnit: "bags",
        quantitySource: "calculated",
      },
      {
        materialName: "Sand",
        category: "Materials",
        quantity: 5,
        quantityUnit: "tons",
        quantitySource: "calculated",
      },
      {
        materialName: "Brushes",
        category: "Tools",
        quantity: 3,
        quantityUnit: "pcs",
        quantitySource: "manual",
      },
    ];
    const prices = new Map<string, MaterialPriceInput>([
      [
        "Cement",
        {
          materialName: "Cement",
          unitPrice: 5000,
          currency: "NGN",
          source: "market_intelligence",
        },
      ],
      [
        "Sand",
        {
          materialName: "Sand",
          unitPrice: 20000,
          currency: "NGN",
          source: "market_intelligence",
        },
      ],
    ]);
    const estimate = buildCostEstimate(quantities, prices, {
      labourTotal: 10000,
      contingencyPercent: 10,
    });

    expect(estimate.lineItems.length).toBe(3);
    expect(estimate.categories.length).toBe(2); // Materials + Tools
    expect(estimate.materialsTotal).toBe(150000); // 50000 + 100000
    expect(estimate.labourTotal).toBe(10000);
    expect(estimate.contingencyPercent).toBe(10);
    expect(estimate.contingencyAmount).toBe(16000); // 10% of 160000
    expect(estimate.grandTotal).toBe(176000);
    expect(estimate.pricedItemCount).toBe(2);
    expect(estimate.unpricedItemCount).toBe(1);
    expect(estimate.allPriced).toBe(false);
  });

  it("buildCostEstimate handles empty quantities", () => {
    const estimate = buildCostEstimate([], new Map());
    expect(estimate.lineItems.length).toBe(0);
    expect(estimate.materialsTotal).toBe(0);
    expect(estimate.grandTotal).toBe(0);
    expect(estimate.allPriced).toBe(true);
  });

  it("buildCostEstimate defaults currency to NGN", () => {
    const estimate = buildCostEstimate([], new Map());
    expect(estimate.currency).toBe("NGN");
  });

  it("buildCostEstimate tracks price source breakdown", () => {
    const quantities: MaterialQuantityInput[] = [
      {
        materialName: "A",
        category: "Cat",
        quantity: 1,
        quantityUnit: "bag",
        quantitySource: "calculated",
      },
      {
        materialName: "B",
        category: "Cat",
        quantity: 1,
        quantityUnit: "bag",
        quantitySource: "calculated",
      },
      {
        materialName: "C",
        category: "Cat",
        quantity: 1,
        quantityUnit: "bag",
        quantitySource: "manual",
      },
    ];
    const prices = new Map<string, MaterialPriceInput>([
      [
        "A",
        {
          materialName: "A",
          unitPrice: 100,
          currency: "NGN",
          source: "market_intelligence",
        },
      ],
      [
        "B",
        {
          materialName: "B",
          unitPrice: 200,
          currency: "NGN",
          source: "user_override",
        },
      ],
    ]);
    const estimate = buildCostEstimate(quantities, prices);
    expect(estimate.priceSourceBreakdown.market_intelligence).toBe(1);
    expect(estimate.priceSourceBreakdown.user_override).toBe(1);
    expect(estimate.priceSourceBreakdown.not_configured).toBe(1);
  });
});
