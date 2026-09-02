import { describe, it, expect } from "vitest";
import {
  generatePaintShoppingList,
  shoppingListToText,
} from "@/lib/shopping-list";
import type { CalculatorResult, CalculatorInput } from "@/types";

const mockResult: CalculatorResult = {
  totalArea: 100,
  paintableArea: 90,
  totalRecommendedLiters: 15,
  recommendedContainers: [
    { size: 4, count: 3, label: "4 L" },
    { size: 1, count: 1, label: "1 L" },
  ],
  wasteAmount: 2,
  coatBreakdown: [],
} as unknown as CalculatorResult;

const mockInput: CalculatorInput = {
  projectType: "room",
  length: 10,
  width: 8,
  height: 3,
  coats: 2,
  wasteMargin: 10,
  doors: [],
  windows: [],
} as unknown as CalculatorInput;

describe("generatePaintShoppingList", () => {
  it("generates items for paint containers", () => {
    const items = generatePaintShoppingList(mockResult, mockInput, "Premium");
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.name.includes("Premium"))).toBe(true);
  });

  it("includes container count in quantity", () => {
    const items = generatePaintShoppingList(mockResult, mockInput, "Premium");
    const containerItem = items.find((i) => i.name.includes("4 L"));
    expect(containerItem?.quantity).toContain("3");
  });

  it("adds primer for multi-coat projects", () => {
    const items = generatePaintShoppingList(mockResult, mockInput, "Premium");
    expect(items.some((i) => i.name === "Primer")).toBe(true);
  });

  it("does not add primer for single coat", () => {
    const singleCoatInput = { ...mockInput, coats: 1 };
    const items = generatePaintShoppingList(mockResult, singleCoatInput, "Premium");
    expect(items.some((i) => i.name === "Primer")).toBe(false);
  });

  it("all items start unchecked", () => {
    const items = generatePaintShoppingList(mockResult, mockInput, "Premium");
    expect(items.every((i) => i.checked === false)).toBe(true);
  });
});

describe("shoppingListToText", () => {
  it("converts shopping list to text", () => {
    const items = generatePaintShoppingList(mockResult, mockInput, "Premium");
    const text = shoppingListToText(items);
    expect(text).toContain("Premium");
    expect(text.length).toBeGreaterThan(0);
  });
});
