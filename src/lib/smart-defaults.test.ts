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
} from "./smart-defaults";

describe("smart-defaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadPaintCalcDefaults returns empty object when nothing saved", () => {
    expect(loadPaintCalcDefaults()).toEqual({});
  });

  it("savePaintCalcDefaults stores and loads", () => {
    savePaintCalcDefaults({ coats: 3, wasteMargin: 15 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.coats).toBe(3);
    expect(loaded.wasteMargin).toBe(15);
  });

  it("savePaintCalcDefaults merges with existing", () => {
    savePaintCalcDefaults({ coats: 2 });
    savePaintCalcDefaults({ wasteMargin: 10 });
    const loaded = loadPaintCalcDefaults();
    expect(loaded.coats).toBe(2);
    expect(loaded.wasteMargin).toBe(10);
  });

  it("loadCostEstimateDefaults returns empty when nothing saved", () => {
    expect(loadCostEstimateDefaults()).toEqual({});
  });

  it("saveCostEstimateDefaults stores and loads", () => {
    saveCostEstimateDefaults({ currency: "NGN", includeLabor: true });
    expect(loadCostEstimateDefaults().currency).toBe("NGN");
    expect(loadCostEstimateDefaults().includeLabor).toBe(true);
  });

  it("loadScreedingDefaults returns empty when nothing saved", () => {
    expect(loadScreedingDefaults()).toEqual({});
  });

  it("saveScreedingDefaults stores and loads", () => {
    saveScreedingDefaults({ thickness: 12 });
    expect(loadScreedingDefaults().thickness).toBe(12);
  });

  it("loadTileDefaults returns empty when nothing saved", () => {
    expect(loadTileDefaults()).toEqual({});
  });

  it("saveTileDefaults stores and loads", () => {
    saveTileDefaults({ tileSize: "600x600", wasteMargin: 5 });
    expect(loadTileDefaults().tileSize).toBe("600x600");
  });

  it("loadPopDefaults returns empty when nothing saved", () => {
    expect(loadPopDefaults()).toEqual({});
  });

  it("savePopDefaults stores and loads", () => {
    savePopDefaults({ designType: "dome" });
    expect(loadPopDefaults().designType).toBe("dome");
  });
});
