import { describe, it, expect } from "vitest";
import {
  generatePaintShoppingList,
  generateCostEstimateShoppingList,
  shoppingListToText,
  type ShoppingListItem,
} from "./shopping-list";

const baseResult = {
  paintableArea: 50,
  adjustedLiters: 10,
  totalRecommendedLiters: 12,
  recommendedContainers: [] as { count: number; size: number }[],
};

const baseInput = {
  coats: 2,
  wasteMargin: 10,
  paintableArea: 50,
};

describe("shopping-list", () => {
  it("generatePaintShoppingList creates items for containers", () => {
    const items = generatePaintShoppingList(
      {
        ...baseResult,
        recommendedContainers: [
          { count: 2, size: 5 },
          { count: 1, size: 2 },
        ],
      } as any,
      baseInput as any,
      "Satin",
    );
    expect(items.length).toBeGreaterThan(3);
    const paintItems = items.filter((i) => i.name.includes("Satin"));
    expect(paintItems.length).toBe(2);
  });

  it("generatePaintShoppingList shows liters when no containers", () => {
    const items = generatePaintShoppingList(
      { ...baseResult, recommendedContainers: [] } as any,
      { ...baseInput, coats: 1 } as any,
      "Emulsion",
    );
    const paintItem = items.find((i) => i.name.includes("Emulsion"));
    expect(paintItem).toBeTruthy();
    expect(paintItem!.quantity).toContain("12");
  });

  it("generatePaintShoppingList includes primer for multi-coat", () => {
    const items = generatePaintShoppingList(
      { ...baseResult } as any,
      { ...baseInput, coats: 3 } as any,
      "Satin",
    );
    expect(items.some((i) => i.name === "Primer")).toBe(true);
  });

  it("generatePaintShoppingList excludes primer for single coat", () => {
    const items = generatePaintShoppingList(
      { ...baseResult } as any,
      { ...baseInput, coats: 1 } as any,
      "Satin",
    );
    expect(items.some((i) => i.name === "Primer")).toBe(false);
  });

  it("generatePaintShoppingList includes accessories", () => {
    const items = generatePaintShoppingList(
      { ...baseResult } as any,
      { ...baseInput, coats: 1 } as any,
      "Satin",
    );
    expect(items.some((i) => i.name.includes("Sandpaper"))).toBe(true);
    expect(items.some((i) => i.name.includes("brush"))).toBe(true);
    expect(items.some((i) => i.name.includes("roller"))).toBe(true);
    expect(items.some((i) => i.name.includes("Masking"))).toBe(true);
    expect(items.some((i) => i.name.includes("Drop cloth"))).toBe(true);
  });

  it("all items start unchecked", () => {
    const items = generatePaintShoppingList(
      { ...baseResult } as any,
      { ...baseInput, coats: 1 } as any,
      "Satin",
    );
    expect(items.every((i) => i.checked === false)).toBe(true);
  });

  it("generateCostEstimateShoppingList creates items for priced materials", () => {
    const items = generateCostEstimateShoppingList(
      {
        paintCost: 5000,
        paintContainerCount: 2,
        primerCost: 1000,
        fillerCost: 0,
        puttyCost: 500,
        sandpaperCost: 0,
        brushesCost: 200,
        rollersCost: 0,
        otherMaterialsCost: 100,
        total: 6800,
        currencySymbol: "₦",
      } as any,
      {
        paintLiters: 10,
        paintableArea: 50,
      } as any,
      "Satin",
    );
    expect(items.length).toBe(5); // paint, primer, putty, brushes, other
    expect(items.some((i) => i.name.includes("Satin"))).toBe(true);
    expect(items.some((i) => i.name === "Primer")).toBe(true);
    expect(items.some((i) => i.name === "Putty")).toBe(true);
    expect(items.some((i) => i.name === "Brushes")).toBe(true);
    expect(items.some((i) => i.name === "Other materials")).toBe(true);
  });

  it("generateCostEstimateShoppingList shows liters when no container count", () => {
    const items = generateCostEstimateShoppingList(
      {
        paintCost: 5000,
        paintContainerCount: 0,
        currencySymbol: "₦",
      } as any,
      { paintLiters: 10, paintableArea: 50 } as any,
      "Satin",
    );
    const paint = items.find((i) => i.name.includes("Satin"));
    expect(paint?.quantity).toContain("10");
  });

  it("shoppingListToText generates text output", () => {
    const items: ShoppingListItem[] = [
      {
        name: "Paint",
        quantity: "2 containers",
        detail: "10 L",
        checked: false,
      },
      { name: "Brushes", quantity: "2-3", checked: true },
    ];
    const text = shoppingListToText(items);
    expect(text).toContain("FRELUX Shopping List");
    expect(text).toContain("Paint");
    expect(text).toContain("☐");
    expect(text).toContain("✅");
    expect(text).toContain("freluxtools");
  });
});
