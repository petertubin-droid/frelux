import { describe, it, expect, beforeEach } from "vitest";
import {
  savePaintCalcDefaults,
  loadPaintCalcDefaults,
  saveCostEstimateDefaults,
  loadCostEstimateDefaults,
  saveScreedingDefaults,
  loadScreedingDefaults,
  saveTileDefaults,
  loadTileDefaults,
  savePopDefaults,
  loadPopDefaults,
  trackRecentTool,
  getRecentTools,
} from "@/lib/smart-defaults";

beforeEach(() => {
  localStorage.clear();
});

describe("smart-defaults — paint calculator", () => {
  it("saves and loads paint calc defaults", () => {
    savePaintCalcDefaults({ unit: "meters", coats: 2, wasteMargin: 10 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.unit).toBe("meters");
    expect(loaded.coats).toBe(2);
    expect(loaded.wasteMargin).toBe(10);
  });

  it("merges partial updates", () => {
    savePaintCalcDefaults({ unit: "feet", coats: 3 });
    savePaintCalcDefaults({ wasteMargin: 15 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.unit).toBe("feet");
    expect(loaded.coats).toBe(3);
    expect(loaded.wasteMargin).toBe(15);
  });

  it("returns empty object when nothing saved", () => {
    expect(loadPaintCalcDefaults()).toEqual({});
  });
});

describe("smart-defaults — cost estimate", () => {
  it("saves and loads cost estimate defaults", () => {
    saveCostEstimateDefaults({
      currency: "NGN",
      includeLabor: true,
      laborRate: 5000,
    });
    const loaded = loadCostEstimateDefaults()!;
    expect(loaded.currency).toBe("NGN");
    expect(loaded.includeLabor).toBe(true);
    expect(loaded.laborRate).toBe(5000);
  });

  it("merges partial updates", () => {
    saveCostEstimateDefaults({ currency: "USD" });
    saveCostEstimateDefaults({ includeLabor: false });
    const loaded = loadCostEstimateDefaults()!;
    expect(loaded.currency).toBe("USD");
    expect(loaded.includeLabor).toBe(false);
  });

  it("returns undefined when nothing saved", () => {
    expect(loadCostEstimateDefaults()).toEqual({});
  });
});

describe("smart-defaults — screeding", () => {
  it("saves and loads screeding defaults", () => {
    saveScreedingDefaults({ unit: "meters", thickness: 3 });
    const loaded = loadScreedingDefaults()!;
    expect(loaded.unit).toBe("meters");
    expect(loaded.thickness).toBe(3);
  });

  it("merges partial updates", () => {
    saveScreedingDefaults({ unit: "feet" });
    saveScreedingDefaults({ screedingType: "cement" });
    const loaded = loadScreedingDefaults()!;
    expect(loaded.unit).toBe("feet");
    expect(loaded.screedingType).toBe("cement");
  });
});

describe("smart-defaults — tile calculator", () => {
  it("saves and loads tile defaults", () => {
    saveTileDefaults({ unit: "meters", tileSize: "600x600", wasteMargin: 5 });
    const loaded = loadTileDefaults()!;
    expect(loaded.unit).toBe("meters");
    expect(loaded.tileSize).toBe("600x600");
    expect(loaded.wasteMargin).toBe(5);
  });
});

describe("smart-defaults — POP calculator", () => {
  it("saves and loads POP defaults", () => {
    savePopDefaults({ unit: "meters", designType: "simple" });
    const loaded = loadPopDefaults()!;
    expect(loaded.unit).toBe("meters");
    expect(loaded.designType).toBe("simple");
  });
});

describe("smart-defaults — recent tools", () => {
  it("tracks recently used tools", () => {
    trackRecentTool("/paint-calculator", "Paint Calculator", "paint");
    trackRecentTool("/tile-calculator", "Tile Calculator", "tile");
    const recent = getRecentTools();
    expect(recent).toHaveLength(2);
    expect(recent[0].path).toBe("/tile-calculator");
    expect(recent[1].path).toBe("/paint-calculator");
  });

  it("deduplicates by path", () => {
    trackRecentTool("/paint-calculator", "Paint Calculator", "paint");
    trackRecentTool("/paint-calculator", "Paint Calculator", "paint");
    expect(getRecentTools()).toHaveLength(1);
  });

  it("limits to 6 items", () => {
    for (let i = 0; i < 10; i++) {
      trackRecentTool(`/tool-${i}`, `Tool ${i}`, "icon");
    }
    const recent = getRecentTools();
    expect(recent).toHaveLength(6);
    expect(recent[0].path).toBe("/tool-9");
  });

  it("includes visitedAt timestamp", () => {
    trackRecentTool("/test", "Test", "icon");
    const recent = getRecentTools();
    expect(recent[0].visitedAt).toBeTruthy();
    expect(new Date(recent[0].visitedAt).getTime()).not.toBeNaN();
  });

  it("returns empty array when nothing tracked", () => {
    expect(getRecentTools()).toEqual([]);
  });
});

describe("smart-defaults — error handling", () => {
  it("handles corrupted localStorage gracefully for load", () => {
    localStorage.setItem("frelux_smart_defaults", "{invalid json");
    expect(loadPaintCalcDefaults()).toEqual({});
  });

  it("handles corrupted localStorage for recent tools", () => {
    localStorage.setItem("frelux_recent_tools", "{invalid json");
    expect(getRecentTools()).toEqual([]);
  });
});
