import { describe, it, expect } from "vitest";
import {
  FALLBACK_PRICES,
  scanMaterialPrices,
  type PriceScanReport,
} from "./price-scanner";

describe("estimation/price-scanner", () => {
  it("FALLBACK_PRICES has cement, block, sand, granite", () => {
    expect(FALLBACK_PRICES.cement_per_bag).toBeTruthy();
    expect(FALLBACK_PRICES.cement_per_bag.price).toBe(8500);
    expect(FALLBACK_PRICES.block_per_piece.price).toBe(450);
    expect(FALLBACK_PRICES.sand_per_m3).toBeTruthy();
    expect(FALLBACK_PRICES.granite_per_m3).toBeTruthy();
  });

  it("FALLBACK_PRICES has rebar entries", () => {
    expect(FALLBACK_PRICES.rebar_12mm_per_length.price).toBe(11500);
    expect(FALLBACK_PRICES.rebar_16mm_per_length.price).toBe(18500);
    expect(FALLBACK_PRICES.rebar_20mm_per_length.price).toBe(27000);
    expect(FALLBACK_PRICES.rebar_25mm_per_length.price).toBe(40000);
  });

  it("all fallback prices have price > 0 and unit", () => {
    for (const [key, val] of Object.entries(FALLBACK_PRICES)) {
      expect(val.price).toBeGreaterThan(0);
      expect(val.unit.length).toBeGreaterThan(0);
      expect(val.name.length).toBeGreaterThan(0);
    }
  });

  it("scanMaterialPrices returns a report", async () => {
    const report = await scanMaterialPrices({});
    expect(report.materials_scanned).toBeGreaterThan(0);
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.currency).toBe("NGN");
    expect(report.market_region).toBe("Nigeria");
    expect(report.materials_failed).toBe(0);
  });

  it("scanMaterialPrices respects options", async () => {
    const report = await scanMaterialPrices(
      {},
      { region: "Kenya", currency: "KES" },
    );
    expect(report.market_region).toBe("Kenya");
    expect(report.currency).toBe("KES");
  });

  it("scanMaterialPrices result items have required fields", async () => {
    const report = await scanMaterialPrices({});
    const item = report.results[0];
    expect(item.material_key).toBeTruthy();
    expect(item.material_name).toBeTruthy();
    expect(item.unit).toBeTruthy();
    expect(item.source).toBeTruthy();
    expect(item.confidence).toBeTruthy();
    expect(item.scanned_at).toBeTruthy();
    expect(item.success).toBe(true);
  });

  it("scanMaterialPrices compares against current prices", async () => {
    const currentPrices: Record<string, number> = {
      cement_per_bag: 8000,
    };
    const report = await scanMaterialPrices(currentPrices);
    const cement = report.results.find(
      (r) => r.material_key === "cement_per_bag",
    );
    expect(cement).toBeTruthy();
    expect(cement!.old_price).toBe(8000);
  });

  it("scanMaterialPrices uses fallback when current price missing", async () => {
    const report = await scanMaterialPrices({});
    const cement = report.results.find(
      (r) => r.material_key === "cement_per_bag",
    );
    expect(cement!.old_price).toBe(8500);
  });
});
