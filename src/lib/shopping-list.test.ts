import { describe, it, expect } from "vitest";
import {
  generatePaintShoppingList,
  generateCostEstimateShoppingList,
  shoppingListToText,
} from "./shopping-list";
import type {
  CalculatorResult,
  CostEstimateResult,
  CalculatorInput,
  CostEstimateInput,
} from "@/types";

function calcResult(
  overrides: Partial<CalculatorResult> = {},
): CalculatorResult {
  return {
    paintableArea: 40,
    totalRecommendedLiters: 10,
    recommendedContainers: [{ size: 5, count: 2 }],
    ...overrides,
  } as CalculatorResult;
}

function calcInput(overrides: Partial<CalculatorInput> = {}): CalculatorInput {
  return { coats: 2, wasteMargin: 10, ...overrides } as CalculatorInput;
}

describe("generatePaintShoppingList", () => {
  it("lists a shopping item per recommended container", () => {
    const items = generatePaintShoppingList(
      calcResult(),
      calcInput(),
      "Emulsion",
    );
    const paintItem = items.find((i) => i.name.includes("Emulsion"));
    expect(paintItem?.quantity).toBe("2 containers");
  });

  it("falls back to total liters when no containers are recommended", () => {
    const items = generatePaintShoppingList(
      calcResult({ recommendedContainers: [] }),
      calcInput(),
      "Emulsion",
    );
    const paintItem = items.find((i) => i.name === "Emulsion paint");
    expect(paintItem?.quantity).toContain("10");
  });

  it("adds a primer item only for multi-coat jobs", () => {
    const multiCoat = generatePaintShoppingList(
      calcResult(),
      calcInput({ coats: 2 }),
      "Emulsion",
    );
    const singleCoat = generatePaintShoppingList(
      calcResult(),
      calcInput({ coats: 1 }),
      "Emulsion",
    );
    expect(multiCoat.some((i) => i.name === "Primer")).toBe(true);
    expect(singleCoat.some((i) => i.name === "Primer")).toBe(false);
  });

  it("always includes standard prep and application supplies", () => {
    const items = generatePaintShoppingList(
      calcResult(),
      calcInput(),
      "Emulsion",
    );
    const names = items.map((i) => i.name);
    expect(names).toContain("Sandpaper (fine grit)");
    expect(names).toContain("Paint brushes");
    expect(names).toContain("Paint rollers + tray");
    expect(names).toContain("Masking tape");
    expect(names).toContain("Drop cloth / plastic sheet");
  });

  it("marks every generated item as unchecked initially", () => {
    const items = generatePaintShoppingList(
      calcResult(),
      calcInput(),
      "Emulsion",
    );
    expect(items.every((i) => i.checked === false)).toBe(true);
  });
});

describe("generateCostEstimateShoppingList", () => {
  function costResult(
    overrides: Partial<CostEstimateResult> = {},
  ): CostEstimateResult {
    return {
      paintCost: 20000,
      paintContainerCount: 2,
      primerCost: 0,
      fillerCost: 0,
      puttyCost: 0,
      sandpaperCost: 1500,
      brushesCost: 0,
      rollersCost: 3000,
      otherMaterialsCost: 0,
      currencySymbol: "₦",
      ...overrides,
    } as CostEstimateResult;
  }

  function costInput(
    overrides: Partial<CostEstimateInput> = {},
  ): CostEstimateInput {
    return { paintLiters: 10, ...overrides } as CostEstimateInput;
  }

  it("only includes line items with a nonzero cost", () => {
    const items = generateCostEstimateShoppingList(
      costResult(),
      costInput(),
      "Emulsion",
    );
    const names = items.map((i) => i.name);
    expect(names).toContain("Emulsion paint");
    expect(names).toContain("Sandpaper");
    expect(names).toContain("Rollers");
    expect(names).not.toContain("Primer");
    expect(names).not.toContain("Filler");
  });

  it("shows liters when paint container count is 0", () => {
    const items = generateCostEstimateShoppingList(
      costResult({ paintContainerCount: 0 }),
      costInput({ paintLiters: 12.5 }),
      "Emulsion",
    );
    const paintItem = items.find((i) => i.name === "Emulsion paint");
    expect(paintItem?.quantity).toContain("12.5");
  });

  it("formats detail costs with the given currency symbol", () => {
    const items = generateCostEstimateShoppingList(
      costResult(),
      costInput(),
      "Emulsion",
    );
    const paintItem = items.find((i) => i.name === "Emulsion paint");
    expect(paintItem?.detail).toContain("₦");
  });
});

describe("shoppingListToText", () => {
  it("renders checked and unchecked items with the expected markers", () => {
    const text = shoppingListToText([
      { name: "Paint", quantity: "2 containers", checked: true },
      { name: "Brush", quantity: "1", checked: false, detail: "Fine bristle" },
    ]);
    expect(text).toContain("✅ 2 containers, Paint");
    expect(text).toContain("☐ 1, Brush");
    expect(text).toContain("Fine bristle");
  });

  it("includes the FRELUX branding link", () => {
    const text = shoppingListToText([]);
    expect(text).toContain("freluxtools.netlify.app");
  });
});
