import { describe, it, expect } from "vitest";
import {
  calculatorLabel,
  calculatorPath,
  CALCULATOR_META,
} from "@/lib/templates";

describe("calculatorLabel", () => {
  it("returns label for paint", () => {
    expect(calculatorLabel("paint")).toBeTruthy();
  });

  it("returns label for screeding", () => {
    expect(calculatorLabel("screeding")).toBeTruthy();
  });

  it("returns label for pop_ceiling", () => {
    expect(calculatorLabel("pop_ceiling")).toBeTruthy();
  });

  it("returns label for tile", () => {
    expect(calculatorLabel("tile")).toBeTruthy();
  });

  it("returns the type string for unknown types", () => {
    expect(calculatorLabel("unknown" as any)).toBe("unknown");
  });
});

describe("calculatorPath", () => {
  it("returns path for paint", () => {
    expect(calculatorPath("paint")).toMatch(/^\//);
  });

  it("returns path for tile", () => {
    expect(calculatorPath("tile")).toMatch(/^\//);
  });

  it("returns / for unknown types", () => {
    expect(calculatorPath("unknown" as any)).toBe("/");
  });
});

describe("CALCULATOR_META", () => {
  it("has entries for all major calculator types", () => {
    expect(CALCULATOR_META.paint).toBeDefined();
    expect(CALCULATOR_META.tile).toBeDefined();
    expect(CALCULATOR_META.screeding).toBeDefined();
    expect(CALCULATOR_META.pop).toBeDefined();
  });

  it("every entry has label and path", () => {
    Object.values(CALCULATOR_META).forEach((meta) => {
      expect(meta.label).toBeTruthy();
      expect(meta.path).toMatch(/^\//);
    });
  });
});
