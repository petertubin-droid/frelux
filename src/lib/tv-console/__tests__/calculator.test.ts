import { describe, expect, it } from "vitest";
import { calculateConsoleEstimate, dimensionsFromTemplate } from "../calculator";
import { TV_CONSOLE_TEMPLATES } from "../templates";

describe("TV console calculator", () => {
  it("provides ten editable presets with positive dimensions", () => {
    expect(TV_CONSOLE_TEMPLATES).toHaveLength(10);
    expect(new Set(TV_CONSOLE_TEMPLATES.map((t) => t.id)).size).toBe(10);
    for (const template of TV_CONSOLE_TEMPLATES) {
      expect(template.widthMm).toBeGreaterThan(0);
      expect(template.heightMm).toBeGreaterThan(0);
      expect(template.depthMm).toBeGreaterThan(0);
      expect(template.imagePage).toMatch(/^https:\/\//);
    }
  });

  it("computes a transparent board-area estimate and entered-price subtotal", () => {
    const input = dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]);
    input.sheetPrice = 40;
    const result = calculateConsoleEstimate(input, "USD");
    expect(result.carcassAreaM2).toBeGreaterThan(0);
    expect(result.theoreticalSheetCount).toBe(Math.ceil(result.grossAreaWithUserWasteM2 / result.theoreticalSheetAreaM2));
    expect(result.materialCost).toBe(result.theoreticalSheetCount * 40);
    expect(result.currency).toBe("USD");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("defaults to no assumed workshop waste and accepts explicit allowance", () => {
    const input = dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]);
    const zero = calculateConsoleEstimate(input);
    input.wastePercent = 15;
    const withAllowance = calculateConsoleEstimate(input);
    expect(zero.grossAreaWithUserWasteM2).toBe(zero.carcassAreaM2);
    expect(withAllowance.grossAreaWithUserWasteM2).toBeCloseTo(zero.carcassAreaM2 * 1.15);
  });

  it.each([
    { widthMm: 0 },
    { shelfCount: -1 },
    { shelfCount: 1.2 },
    { wastePercent: 101 },
  ])("rejects invalid parameters: %o", (patch) => {
    const input = { ...dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]), ...patch };
    expect(() => calculateConsoleEstimate(input)).toThrow();
  });
});
