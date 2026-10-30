import { describe, expect, it } from "vitest";
import {
  applyMaterialWaste,
  applyWaste,
  clampWastePercent,
  defaultWasteSettings,
  loadWasteSettings,
  presetFor,
  resolveWastePercent,
  saveWasteSettings,
  startingWastePercent,
  WASTE_MATERIALS,
  WASTE_PRESETS,
  WASTE_SETTINGS_KEY,
  wasteRows,
  wasteSummary,
} from "../waste-factor";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
}

describe("waste percentages", () => {
  it("adds the allowance to the base quantity", () => {
    const result = applyWaste(100, 10);
    expect(result.final).toBe(110);
    expect(result.additional).toBe(10);
    expect(result.applied).toBe(true);
  });

  it("matches the worked example in the brief", () => {
    expect(applyWaste(100, 10).final).toBe(110);
  });

  it("handles every preset", () => {
    expect(applyWaste(200, 0).final).toBe(200);
    expect(applyWaste(200, 5).final).toBe(210);
    expect(applyWaste(200, 10).final).toBe(220);
    expect(applyWaste(200, 15).final).toBe(230);
    expect(applyWaste(200, 20).final).toBe(240);
    expect(applyWaste(200, 25).final).toBe(250);
  });

  it("clamps outside the supported range instead of inflating an order", () => {
    expect(clampWastePercent(-4)).toBe(0);
    expect(clampWastePercent(80)).toBe(25);
    expect(applyWaste(100, 90).percent).toBe(25);
    expect(applyWaste(100, -10).final).toBe(100);
  });

  it("treats an unusable percentage as no allowance", () => {
    expect(applyWaste(100, Number.NaN).percent).toBe(0);
    expect(applyWaste(100, Number.NaN).final).toBe(100);
  });

  it("marks a zero allowance as not applied", () => {
    const result = applyWaste(50, 0);
    expect(result.applied).toBe(false);
    expect(result.final).toBe(50);
  });

  it("keeps precision on fractional quantities", () => {
    const result = applyWaste(12.3456, 7.5);
    expect(result.final).toBeCloseTo(13.27152, 5);
    expect(result.additional).toBeCloseTo(0.92592, 5);
  });
});

describe("package rounding", () => {
  it("rounds up to whole packages", () => {
    const result = applyWaste(100, 10, { packageSize: 12 });
    expect(result.final).toBe(110);
    expect(result.packages).toBe(10);
    expect(result.orderQuantity).toBe(120);
    expect(result.roundedUp).toBe(true);
  });

  it("leaves an exact multiple alone", () => {
    const result = applyWaste(100, 10, { packageSize: 11 });
    expect(result.packages).toBe(10);
    expect(result.orderQuantity).toBe(110);
    expect(result.roundedUp).toBe(false);
  });

  it("never returns zero packages for a tiny quantity", () => {
    const result = applyWaste(0.4, 5, { packageSize: 25 });
    expect(result.packages).toBe(1);
    expect(result.orderQuantity).toBe(25);
  });

  it("avoids floating point slips at exact boundaries", () => {
    // 0.1 + 0.2 style drift must not push an exact fit into another package.
    const result = applyWaste(0.3, 0, { packageSize: 0.1 });
    expect(result.packages).toBe(3);
  });

  it("ignores an unusable package size", () => {
    const result = applyWaste(100, 10, { packageSize: 0 });
    expect(result.packages).toBeNull();
    expect(result.orderQuantity).toBe(110);
  });
});

describe("materials", () => {
  it("covers the eleven requested materials", () => {
    expect(WASTE_MATERIALS.map((m) => m.key)).toEqual([
      "tiles",
      "paint",
      "screeding",
      "cement",
      "sand",
      "granite",
      "timber",
      "roofing",
      "steel",
      "flooring",
      "plumbing",
    ]);
  });

  it("gives tiles a larger allowance than steel", () => {
    const settings = defaultWasteSettings();
    expect(resolveWastePercent(settings, "tiles")).toBeGreaterThan(
      resolveWastePercent(settings, "steel"),
    );
  });

  it("keeps a different percentage per material", () => {
    const settings = defaultWasteSettings();
    settings.perMaterial.tiles = 15;
    settings.perMaterial.paint = 3;
    expect(applyMaterialWaste(100, "tiles", settings).final).toBe(115);
    expect(applyMaterialWaste(100, "paint", settings).final).toBe(103);
  });

  it("applies nothing at all when the allowance is switched off", () => {
    const settings = { ...defaultWasteSettings(), enabled: false };
    const result = applyMaterialWaste(100, "tiles", settings);
    expect(result.applied).toBe(false);
    expect(result.final).toBe(100);
    expect(resolveWastePercent(settings, "tiles")).toBe(0);
  });

  it("clamps a stored override above the range", () => {
    const settings = defaultWasteSettings();
    settings.perMaterial.sand = 60;
    expect(resolveWastePercent(settings, "sand")).toBe(25);
  });
});

describe("never applying twice", () => {
  it("refuses a quantity that already carries an allowance", () => {
    const result = applyWaste(110, 10, { alreadyIncludesWaste: true });
    expect(result.refused).toBe("already-applied");
    expect(result.applied).toBe(false);
    expect(result.final).toBe(110);
    expect(result.additional).toBe(0);
  });

  it("refuses rather than doubling when a caller passes a bad base", () => {
    expect(applyWaste(Number.NaN, 10).refused).toBe("invalid-base");
    expect(applyWaste(-5, 10).refused).toBe("invalid-base");
  });

  it("composes as an explicit two-step, so the second step must be marked", () => {
    const first = applyWaste(100, 10);
    const second = applyWaste(first.final, 10, { alreadyIncludesWaste: true });
    expect(first.orderQuantity).toBe(110);
    expect(second.orderQuantity).toBe(110);
  });
});

describe("settings persistence", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const settings = defaultWasteSettings();
    settings.enabled = false;
    settings.perMaterial.tiles = 20;
    saveWasteSettings(settings, storage);
    expect(storage.data[WASTE_SETTINGS_KEY]).toContain('"tiles":20');
    const loaded = loadWasteSettings(storage);
    expect(loaded.enabled).toBe(false);
    expect(loaded.perMaterial.tiles).toBe(20);
  });

  it("stores only the materials a visitor actually changed", () => {
    const storage = memoryStorage();
    const settings = defaultWasteSettings();
    settings.perMaterial.paint = 2;
    saveWasteSettings(settings, storage);
    const loaded = loadWasteSettings(storage);
    expect(loaded.perMaterial.paint).toBe(2);
    expect(loaded.perMaterial.tiles).toBeUndefined();
    expect(resolveWastePercent(loaded, "tiles")).toBe(10);
  });

  it("keeps a page's own starting margin until the visitor chooses", () => {
    const settings = defaultWasteSettings();
    // PaintCalculator has always started at 0 even though paint recommends 5.
    expect(startingWastePercent(settings, "paint", 0)).toBe(0);
    const chosen = { ...settings, perMaterial: { paint: 12 } };
    expect(startingWastePercent(chosen, "paint", 0)).toBe(12);
    expect(startingWastePercent(chosen, "tiles", 10)).toBe(10);
  });

  it("falls back to defaults when storage is empty or corrupt", () => {
    expect(
      resolveWastePercent(loadWasteSettings(memoryStorage()), "tiles"),
    ).toBe(10);
    const corrupt = memoryStorage({ [WASTE_SETTINGS_KEY]: "{not json" });
    expect(loadWasteSettings(corrupt).enabled).toBe(true);
  });

  it("clamps nonsense stored values", () => {
    const stored = memoryStorage({
      [WASTE_SETTINGS_KEY]: JSON.stringify({ perMaterial: { tiles: 400 } }),
    });
    expect(loadWasteSettings(stored).perMaterial.tiles).toBe(25);
  });
});

describe("presentation", () => {
  it("shows base, allowance, extra and final", () => {
    const rows = wasteRows(applyWaste(100, 10), "tiles");
    expect(rows.map((r) => r.label)).toEqual([
      "Base quantity",
      "Waste allowance",
      "Additional quantity",
      "Final quantity",
    ]);
    expect(rows[0].value).toBe("100 tiles");
    expect(rows[1].value).toBe("10%");
    expect(rows[3].value).toBe("110 tiles");
  });

  it("names packages when the material is packaged", () => {
    const rows = wasteRows(applyWaste(100, 10, { packageSize: 25 }), "kg");
    expect(rows[3].label).toBe("Recommended order");
    expect(rows[3].value).toBe("125 kg (5 packages)");
  });

  it("reads as a sentence in reports", () => {
    const text = wasteSummary(applyWaste(100, 10), "tiles");
    expect(text).toContain(
      "Base 100 tiles plus 10% waste (10 tiles) gives 110 tiles",
    );
    expect(text).not.toContain("—");
  });

  it("says plainly when nothing was added", () => {
    expect(wasteSummary(applyWaste(100, 0), "tiles")).toContain(
      "No waste allowance applied",
    );
  });

  it("labels presets, including values between them", () => {
    expect(presetFor(10)?.label).toBe("Standard");
    expect(presetFor(12)).toBeNull();
    expect(WASTE_PRESETS.map((p) => p.percent)).toEqual([0, 5, 10, 15, 20, 25]);
  });
});
