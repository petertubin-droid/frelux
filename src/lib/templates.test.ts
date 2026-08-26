import type { CalculatorType } from "@/types/database";
import { describe, it, expect } from "vitest";
import {
  CALCULATOR_META,
  calculatorLabel,
  calculatorPath,
  TEMPLATE_CATEGORIES,
  BUILDING_TYPES,
} from "@/lib/templates";

describe("templates — CALCULATOR_META", () => {
  it("has entries for all calculator types", () => {
    expect(CALCULATOR_META.paint).toBeTruthy();
    expect(CALCULATOR_META.tile).toBeTruthy();
    expect(CALCULATOR_META.pop).toBeTruthy();
    expect(CALCULATOR_META.screeding).toBeTruthy();
  });

  it("each entry has label, path, and icon", () => {
    for (const [, meta] of Object.entries(CALCULATOR_META)) {
      expect(meta.label).toBeTruthy();
      expect(meta.path).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(meta.path).toContain("/");
    }
  });
});

describe("templates — calculatorLabel", () => {
  it("returns label for known type", () => {
    expect(calculatorLabel("paint")).toBe("Painting");
    expect(calculatorLabel("tile")).toBe("Tiling");
    expect(calculatorLabel("pop")).toBe("POP Ceiling");
    expect(calculatorLabel("screeding")).toBe("Wall Screeding");
  });

  it("returns type string for unknown type", () => {
    expect(calculatorLabel("unknown" as unknown as CalculatorType)).toBe(
      "unknown",
    );
  });
});

describe("templates — calculatorPath", () => {
  it("returns path for known type", () => {
    expect(calculatorPath("paint")).toContain("/paint-calculator");
    expect(calculatorPath("tile")).toContain("/tile-calculator");
    expect(calculatorPath("pop")).toContain("/pop-ceiling-calculator");
    expect(calculatorPath("screeding")).toContain("/screeding-calculator");
  });

  it("returns / for unknown type", () => {
    expect(calculatorPath("unknown" as unknown as CalculatorType)).toBe("/");
  });
});

describe("templates — TEMPLATE_CATEGORIES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(TEMPLATE_CATEGORIES)).toBe(true);
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe("templates — BUILDING_TYPES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(BUILDING_TYPES)).toBe(true);
    expect(BUILDING_TYPES.length).toBeGreaterThan(0);
  });
});
