// =========================================================
// Dimension-aware pack conversion. parsePackUnits answers
// "litres per pack" (litre-based AI engine + NG/GB/DE/IN paint
// layers). Wall-finishing layers ALSO carry pack units
// ("20 L pail", "saco de 30 kg"): dividing a pack-unit quantity
// by a litres-per-pack number silently undercounts. These tests
// pin the dimension-correct behaviour layer by layer.
// =========================================================
import { describe, expect, it } from "vitest";
import { effectivePackSize, parsePackUnits } from "../prices";
import { calculateLayerCost } from "../cost-engine";
import type { ResolvedLayerPrice } from "@/types/wallfinishing";

const priced = (over: Partial<ResolvedLayerPrice>): ResolvedLayerPrice => ({
  materialName: "Test product",
  unitPrice: 100,
  packUnits: null,
  purchaseLabel: null,
  currency: "USD",
  resolvedMarket: "US",
  priceSource: null,
  scanSource: null,
  priceDate: null,
  isManualPrice: false,
  unpriced: false,
  ...over,
});

const labour = null;

describe("effectivePackSize", () => {
  it("pack-unit layers never divide: quantity is already packs", () => {
    expect(effectivePackSize("20 L pail", "pail 20 L", 20)).toBe(1);
    expect(effectivePackSize("saco de 30 kg", "bag 30 kg", null)).toBe(1);
    expect(effectivePackSize("lata de 18 L", "lata 18 L", 18)).toBe(1);
    expect(effectivePackSize("sac de 5 kg", "pot", null)).toBe(1);
    expect(effectivePackSize("box (16 kg)", "box 16 kg", null)).toBe(1);
    expect(effectivePackSize("roll (150 m / 500 ft)", "roll", null)).toBe(1);
    expect(effectivePackSize("feuilles", "pack", null)).toBe(1);
  });

  it("litre layers convert via litres-per-pack labels", () => {
    expect(effectivePackSize("litre", "20L", 20)).toBe(20);
    expect(effectivePackSize("litre", "10L", 10)).toBe(10);
    expect(effectivePackSize("litre", "gallon", 3.785)).toBe(3.785);
    expect(effectivePackSize("litre", "quart", 0.946)).toBe(0.946);
  });

  it("gallon layers convert litres-per-pack into gallons", () => {
    expect(effectivePackSize("gallon", "gallon", 3.785)).toBe(1);
    expect(effectivePackSize("gallon", "quart", 0.946)).toBe(0.25);
    // a 19 L galón = 5.0198 gallons per pack
    expect(effectivePackSize("gallon", "19 L", 19)).toBeCloseTo(19 / 3.785, 3);
  });

  it("kg labels convert for small-unit layers", () => {
    expect(effectivePackSize("litre", "16 kg can", null)).toBe(16);
    expect(effectivePackSize("kg", "25 kg bag", null)).toBe(25);
  });

  it("returns null when nothing parses (sold loose / per single unit)", () => {
    expect(effectivePackSize("litre", "litre", null)).toBe(null);
    expect(effectivePackSize("gallon", null, null)).toBe(null);
    expect(effectivePackSize("m3 mortar", "bag", null)).toBe(null);
  });

  it("parsePackUnits keeps its litres-per-pack contract", () => {
    expect(parsePackUnits("20L")).toBe(20);
    expect(parsePackUnits("gallon")).toBe(3.785);
    expect(parsePackUnits("quart")).toBe(0.946);
    expect(parsePackUnits("bag 25 kg")).toBe(null);
  });
});

describe("calculateLayerCost pack conversion", () => {
  it("pack-unit layer: quantity × price per pack, never divided", () => {
    // 3 "20 L pail" units at 100 per pail — the old code divided by 20.
    const r = calculateLayerCost({
      quantity: 3,
      purchaseUnit: "20 L pail",
      price: priced({ packUnits: 20, purchaseLabel: "pail 20 L" }),
      labour,
      areaM2: 60,
      labourRateOverride: undefined,
      layerName: "paint",
    });
    expect(r.materialCost).toBe(300);
  });

  it("litre layer with '20L' pack label divides into whole packs", () => {
    // 45 litres of paint → ceil(45/20) = 3 pails at 100 each.
    const r = calculateLayerCost({
      quantity: 45,
      purchaseUnit: "litre",
      price: priced({ packUnits: 20, purchaseLabel: "20L" }),
      labour,
      areaM2: 90,
      labourRateOverride: undefined,
      layerName: "paint",
    });
    expect(r.materialCost).toBe(300);
  });

  it("gallon layer with gallon label: gallons × price per gallon", () => {
    // purchaseQuantity arrives already rounded UP to 6 gallons.
    const r = calculateLayerCost({
      quantity: 6,
      purchaseUnit: "gallon",
      price: priced({ packUnits: 3.785, purchaseLabel: "gallon" }),
      labour,
      areaM2: 100,
      labourRateOverride: undefined,
      layerName: "paint",
    });
    expect(r.materialCost).toBe(600);
  });

  it("gallon layer with quart label: converts to quarts", () => {
    // 2 gallons ÷ 0.25 = 8 quarts at 100 each.
    const r = calculateLayerCost({
      quantity: 2,
      purchaseUnit: "gallon",
      price: priced({ packUnits: 0.946, purchaseLabel: "quart" }),
      labour,
      areaM2: 74,
      labourRateOverride: undefined,
      layerName: "primer",
    });
    expect(r.materialCost).toBe(800);
  });
});
