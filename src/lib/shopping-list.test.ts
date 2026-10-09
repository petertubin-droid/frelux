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
    const items = generatePaintShoppingList(
      mockResult,
      singleCoatInput,
      "Premium",
    );
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

import { buildShoppingList } from "@/lib/shopping-list";
import type { DbEstimateHistory } from "@/types/database";

function makeEst(overrides: Partial<DbEstimateHistory>): DbEstimateHistory {
  return {
    id: "e1",
    user_id: "u1",
    calculator_type: "pop",
    project_name: "Living room ceiling",
    total_cost: 1000,
    material_cost: 800,
    labour_cost: 200,
    currency: "NGN",
    input_data: {},
    result_data: {},
    created_at: "2026-10-09T10:00:00Z",
    ...overrides,
  } as DbEstimateHistory;
}

describe("buildShoppingList (estimate history export)", () => {
  it("extracts material lines and formats a checklist", () => {
    const est = makeEst({
      result_data: {
        ceilingArea: 20,
        materials: [
          { name: "POP Cement", quantity: 3, unit: "bags", cost: 450 },
          { name: "Bonding Agent", quantity: 1.5, unit: "litres", cost: 120 },
        ],
        warnings: ["Coverage rate is not configured"],
      },
    });
    const text = buildShoppingList(est);
    expect(text).toContain("FRELUX SHOPPING LIST");
    expect(text).toContain("Project: Living room ceiling");
    expect(text).toContain("[ ] POP Cement: 3 bags");
    expect(text).toContain("[ ] Bonding Agent: 1.5 litres");
    expect(text).toContain("Material cost: NGN 800");
    expect(text).toContain("Total: NGN 1,000");
    expect(text).toContain("5-10% wastage");
    expect(text).not.toContain("Coverage rate");
  });

  it("handles estimates without an itemised breakdown honestly", () => {
    const est = makeEst({
      calculator_type: "paint",
      result_data: { totalLitres: 10 },
    });
    const text = buildShoppingList(est);
    expect(text).toContain("does not include an itemised material breakdown");
    expect(text).toContain("Calculator: paint");
  });

  it("lists quantity-bearing flat arrays like tile counts", () => {
    const est = makeEst({
      calculator_type: "tile",
      result_data: {
        tileRequirements: [{ label: "Floor tiles", count: 44, unit: "pieces" }],
      },
    });
    const text = buildShoppingList(est);
    expect(text).toContain("[ ] Floor tiles: 44 pieces");
  });
});
