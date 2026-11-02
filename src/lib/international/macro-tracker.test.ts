import { describe, it, expect } from "vitest";
import {
  calculateMacroAdjustment,
  matchMacroRule,
  simulateMacroImpact,
  DEFAULT_MACRO_INDICATORS,
  DEFAULT_ELASTICITY_RULES,
} from "./macro-tracker";

describe("System A: Macro Tracker & Fluctuation Filter", () => {
  it("applies rule-based filter when steel spikes by 6% in Kenya", () => {
    // KE default steel indicator has pct_change_30d = 6.03%
    const res = calculateMacroAdjustment({
      marketCode: "KE",
      materialCategory: "steel",
      basePrice: 1000,
      indicators: DEFAULT_MACRO_INDICATORS.KE,
      rules: DEFAULT_ELASTICITY_RULES,
    });

    expect(res.triggerIndicator).toBeDefined();
    expect(res.triggerIndicator?.indicator_type).toBe("steel");
    expect(res.ruleApplied).toBeDefined();
    expect(res.ruleApplied?.elasticity_multiplier).toBe(1.0);
    expect(res.adjustmentPct).toBe(6.03);
    expect(res.adjustedPrice).toBe(1060); // 1000 * 1.0603 = 1060
  });

  it("applies 65% elasticity multiplier for concrete when cement shifts", () => {
    const res = calculateMacroAdjustment({
      marketCode: "KE",
      materialCategory: "concrete",
      basePrice: 10000,
      indicators: DEFAULT_MACRO_INDICATORS.KE,
      rules: DEFAULT_ELASTICITY_RULES,
    });

    // KE cement shifted +3.82%, threshold is 3.0%, elasticity is 0.65
    // 3.82 * 0.65 = 2.483%
    expect(res.triggerIndicator?.indicator_type).toBe("cement");
    expect(res.adjustmentPct).toBe(2.48);
    expect(res.adjustedPrice).toBe(10248);
  });

  it("does not adjust when indicator change is below activation threshold", () => {
    const lowIndicators = [
      {
        ...DEFAULT_MACRO_INDICATORS.KE[0],
        pct_change_30d: 1.5, // Below 3% activation threshold
      },
    ];

    const res = calculateMacroAdjustment({
      marketCode: "KE",
      materialCategory: "steel",
      basePrice: 1000,
      indicators: lowIndicators,
      rules: DEFAULT_ELASTICITY_RULES,
    });

    expect(res.adjustmentPct).toBe(0);
    expect(res.adjustedPrice).toBe(1000);
    expect(res.rationale).toContain("safe fluctuation band");
  });

  it("matches wildcard rule when market-specific rule does not exist", () => {
    const rule = matchMacroRule("GH", "roofing", DEFAULT_ELASTICITY_RULES);
    expect(rule).toBeDefined();
    expect(rule?.material_category).toBe("roofing");
    expect(rule?.commodity_trigger).toBe("steel");
  });

  it("correctly simulates macro impact across multiple categories", () => {
    const simulation = simulateMacroImpact({
      marketCode: "KE",
      commodity: "steel",
      simulatedSpikePct: 10.0,
      sampleItems: [
        { category: "steel", basePrice: 2000, name: "Y12 Rebar" },
        { category: "roofing", basePrice: 1500, name: "Box Profile Sheet" },
      ],
    });

    expect(simulation).toHaveLength(2);
    // Y12 Rebar (1.0x elasticity) -> +10% -> 2200
    expect(simulation[0].adjustedPrice).toBe(2200);
    expect(simulation[0].pct).toBe(10);
    // Roofing (0.75x elasticity) -> +7.5% -> 1613
    expect(simulation[1].adjustedPrice).toBe(1613);
    expect(simulation[1].pct).toBe(7.5);
  });
});
