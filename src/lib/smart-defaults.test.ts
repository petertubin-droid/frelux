import { describe, it, expect, beforeEach } from "vitest";
import {
  savePaintCalcDefaults,
  loadPaintCalcDefaults,
  saveCostEstimateDefaults,
  loadCostEstimateDefaults,
  getRecentTools,
  trackRecentTool,
} from "@/lib/smart-defaults";

beforeEach(() => {
  localStorage.clear();
});

describe("smart defaults", () => {
  it("returns empty object when nothing saved", () => {
    expect(loadPaintCalcDefaults()).toEqual({});
  });

  it("saves and loads paint calc defaults", () => {
    savePaintCalcDefaults({ coats: 3, wasteMargin: 15 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.coats).toBe(3);
    expect(loaded.wasteMargin).toBe(15);
  });

  it("merges paint calc defaults on subsequent saves", () => {
    savePaintCalcDefaults({ coats: 2 });
    savePaintCalcDefaults({ wasteMargin: 10 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.coats).toBe(2);
    expect(loaded.wasteMargin).toBe(10);
  });

  it("saves and loads cost estimate defaults", () => {
    saveCostEstimateDefaults({ currency: "USD", includeLabor: true });
    const loaded = loadCostEstimateDefaults();
    expect(loaded.currency).toBe("USD");
    expect(loaded.includeLabor).toBe(true);
  });
});

describe("recent tools", () => {
  it("returns empty array when nothing tracked", () => {
    expect(getRecentTools()).toEqual([]);
  });

  it("tracks tool usage", () => {
    trackRecentTool("/paint-calculator", "Paint Calculator", "Calculator");
    const tools = getRecentTools();
    expect(tools.length).toBe(1);
    expect(tools[0].label).toBe("Paint Calculator");
  });

  it("moves tool to front on re-visit", () => {
    trackRecentTool("/paint", "Paint", "Calculator");
    trackRecentTool("/tile", "Tile", "Grid3x3");
    trackRecentTool("/paint", "Paint", "Calculator");
    const tools = getRecentTools();
    expect(tools[0].path).toBe("/paint");
  });
});
