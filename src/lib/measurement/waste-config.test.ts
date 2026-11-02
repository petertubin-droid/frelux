import { describe, it, expect } from "vitest";
import {
  createWasteConfig,
  resolveWaste,
  resolveWasteFromRule,
  applyResolvedWaste,
  setGlobalDefaultWaste,
  setCountryWaste,
  setMarketWaste,
  setUserWaste,
  createNigeriaWasteConfig,
  wasteResolutionToText,
  WASTE_SOURCE_LABELS,
} from "./waste-config";
import type { CalculationRule } from "./rule-registry";

describe("waste-config", () => {
  describe("createWasteConfig & createNigeriaWasteConfig", () => {
    it("creates waste config with default values", () => {
      const config = createWasteConfig();
      expect(config.globalDefault).toBe(10);
      expect(config.byCountry).toEqual({});
      expect(config.byMarket).toEqual({});
      expect(config.userOverride).toBeUndefined();
    });

    it("creates waste config with partial inputs", () => {
      const config = createWasteConfig({
        globalDefault: 15,
        byCountry: { NG: 12 },
        userOverride: 5,
      });
      expect(config.globalDefault).toBe(15);
      expect(config.byCountry).toEqual({ NG: 12 });
      expect(config.userOverride).toBe(5);
    });

    it("creates Nigeria waste config", () => {
      const config = createNigeriaWasteConfig();
      expect(config.globalDefault).toBe(10);
      expect(config.byCountry).toEqual({ NG: 10 });
    });
  });

  describe("resolveWaste", () => {
    const config = createWasteConfig({
      globalDefault: 10,
      byCountry: { NG: 12, US: 8 },
      byMarket: { "NG-LAGOS": 15 },
    });

    it("priority 1: user override wins", () => {
      const res = resolveWaste(config, "NG", "NG-LAGOS", 20);
      expect(res.wastePercent).toBe(20);
      expect(res.source).toBe("user");
      expect(res.isOverride).toBe(true);
      expect(res.explanation).toContain("User specified 20% waste");
    });

    it("priority 2: market rule wins if no user override", () => {
      const res = resolveWaste(config, "NG", "NG-LAGOS");
      expect(res.wastePercent).toBe(15);
      expect(res.source).toBe("market");
      expect(res.isOverride).toBe(false);
      expect(res.explanation).toContain("Market rule for NG-LAGOS: 15% waste");
    });

    it("priority 3: country rule wins if no market rule or user override", () => {
      const res = resolveWaste(config, "NG", "NG-KANO");
      expect(res.wastePercent).toBe(12);
      expect(res.source).toBe("country");
      expect(res.isOverride).toBe(false);
      expect(res.explanation).toContain("Country rule for NG: 12% waste");
    });

    it("priority 4: global default falls back", () => {
      const res = resolveWaste(config, "FR", "FR-PARIS");
      expect(res.wastePercent).toBe(10);
      expect(res.source).toBe("global_default");
      expect(res.isOverride).toBe(false);
      expect(res.explanation).toContain("Global default: 10% waste");
    });
  });

  describe("resolveWasteFromRule", () => {
    const mockRule: CalculationRule = {
      ruleId: "rule-paint-01",
      ruleName: "Standard Paint Rule",
      category: "painting",
      scope: "global",
      formula: "area * coats",
      inputUnits: "m2",
      outputUnit: "litres",
      version: 1,
      effectiveDate: "2026-01-01",
      status: "active",
      approvalStatus: "approved",
      parameters: {
        defaultWastePercent: 8,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    it("resolves user override over rule parameters", () => {
      const res = resolveWasteFromRule(mockRule, 18);
      expect(res.wastePercent).toBe(18);
      expect(res.source).toBe("user");
      expect(res.isOverride).toBe(true);
    });

    it("resolves waste from rule parameters when available", () => {
      const res = resolveWasteFromRule(mockRule);
      expect(res.wastePercent).toBe(8);
      expect(res.source).toBe("rule");
      expect(res.ruleId).toBe("rule-paint-01");
      expect(res.isOverride).toBe(false);
    });

    it("falls back to 10% global default if rule has no waste parameter", () => {
      const ruleNoWaste: CalculationRule = {
        ...mockRule,
        parameters: {},
      };
      const res = resolveWasteFromRule(ruleNoWaste);
      expect(res.wastePercent).toBe(10);
      expect(res.source).toBe("global_default");
    });
  });

  describe("applyResolvedWaste", () => {
    it("applies resolved waste percentage to base quantity", () => {
      const resolution = resolveWaste(
        createWasteConfig(),
        undefined,
        undefined,
        10,
      );
      const result = applyResolvedWaste(100, resolution);
      expect(result.quantity).toBeCloseTo(110);
      expect(result.resolution).toBe(resolution);
    });
  });

  describe("waste config immutable setters", () => {
    it("setGlobalDefaultWaste", () => {
      const initial = createWasteConfig();
      const updated = setGlobalDefaultWaste(initial, 15);
      expect(updated.globalDefault).toBe(15);
      expect(initial.globalDefault).toBe(10);
    });

    it("setCountryWaste", () => {
      const initial = createWasteConfig();
      const updated = setCountryWaste(initial, "GH", 14);
      expect(updated.byCountry["GH"]).toBe(14);
      expect(initial.byCountry["GH"]).toBeUndefined();
    });

    it("setMarketWaste", () => {
      const initial = createWasteConfig();
      const updated = setMarketWaste(initial, "GH-ACCRA", 16);
      expect(updated.byMarket["GH-ACCRA"]).toBe(16);
      expect(initial.byMarket["GH-ACCRA"]).toBeUndefined();
    });

    it("setUserWaste", () => {
      const initial = createWasteConfig();
      const updated = setUserWaste(initial, 25);
      expect(updated.userOverride).toBe(25);
    });
  });

  describe("formatting and label constants", () => {
    it("has WASTE_SOURCE_LABELS", () => {
      expect(WASTE_SOURCE_LABELS.user).toBe("User Input");
      expect(WASTE_SOURCE_LABELS.market).toBe("Market Rule");
      expect(WASTE_SOURCE_LABELS.country).toBe("Country Rule");
      expect(WASTE_SOURCE_LABELS.global_default).toBe("Global Default");
      expect(WASTE_SOURCE_LABELS.rule).toBe("Calculation Rule");
    });

    it("wasteResolutionToText formats resolution", () => {
      const res = resolveWaste(createWasteConfig(), undefined, undefined, 10);
      const text = wasteResolutionToText(res);
      expect(text).toContain("10% waste (User Input)");
    });
  });
});
