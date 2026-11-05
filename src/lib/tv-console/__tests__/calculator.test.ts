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

  it("sums each modeled rectangular panel and makes the math auditable", () => {
    const input = dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]);
    const result = calculateConsoleEstimate(input, " USD ");
    const expectedArea = (2 * 400 * 350 + 2 * (1800 - 36) * 350 + 2 * (1800 - 36) * 350 + 1800 * 400) / 1_000_000;
    expect(result.carcassAreaM2).toBeCloseTo(expectedArea, 10);
    expect(result.panelSchedule.map((line) => line.part)).toEqual([
      "Side panels", "Top and bottom panels", "Internal shelves", "Back panel",
    ]);
    expect(result.theoreticalSheetCount).toBe(Math.ceil(result.grossAreaWithUserWasteM2 / result.theoreticalSheetAreaM2));
    expect(result.currency).toBe("USD");
  });

  it("includes dividers and equal overlay doors using explicit clearance", () => {
    const input = { ...dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]), dividerCount: 1, doorCount: 2, doorClearanceMm: 3 };
    const result = calculateConsoleEstimate(input);
    const dividerArea = (400 - 36) * 350 / 1_000_000;
    const doorArea = 2 * ((1800 - 3 * 3) / 2) * (400 - 6) / 1_000_000;
    expect(result.panelSchedule.find((line) => line.part === "Vertical dividers")?.areaM2).toBeCloseTo(dividerArea);
    expect(result.panelSchedule.find((line) => line.part === "Overlay doors")?.areaM2).toBeCloseTo(doorArea);
  });

  it("defaults to zero assumed waste and applies only the user's allowance", () => {
    const input = dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]);
    const zero = calculateConsoleEstimate(input);
    input.wastePercent = 15;
    const withAllowance = calculateConsoleEstimate(input);
    expect(zero.grossAreaWithUserWasteM2).toBe(zero.carcassAreaM2);
    expect(withAllowance.grossAreaWithUserWasteM2).toBeCloseTo(zero.carcassAreaM2 * 1.15);
  });

  it("does not invent a price when none is entered, while accepting an explicit zero", () => {
    const input = dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]);
    expect(calculateConsoleEstimate(input).materialCost).toBeNull();
    input.sheetPrice = 0;
    expect(calculateConsoleEstimate(input).materialCost).toBe(0);
  });

  it("accounts for outer and inter-door clearances", () => {
    const input = { ...dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]), doorCount: 2, doorClearanceMm: 3 };
    const result = calculateConsoleEstimate(input);
    const doors = result.panelSchedule.find((line) => line.part === "Overlay doors");
    expect(doors?.widthMm).toBe((1800 - 9) / 2);
  });

  it("rejects component counts that physically consume all opening space", () => {
    const input = { ...dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]), shelfCount: 22 };
    expect(() => calculateConsoleEstimate(input)).toThrow(/Shelf thickness/);
  });

  it.each([
    { widthMm: 0 },
    { widthMm: 30, panelThicknessMm: 18 },
    { shelfCount: -1 },
    { shelfCount: 1.2 },
    { dividerCount: 31 },
    { doorCount: -1 },
    { doorClearanceMm: 101 },
    { wastePercent: 101 },
    { sheetPrice: -1 },
    { sheetLengthMm: 12_000 },
  ])("rejects invalid parameters: %o", (patch) => {
    const input = { ...dimensionsFromTemplate(TV_CONSOLE_TEMPLATES[0]), ...patch };
    expect(() => calculateConsoleEstimate(input)).toThrow();
  });
});
