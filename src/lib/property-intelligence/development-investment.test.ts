// =========================================================
// DEVELOPMENT & INVESTMENT, DETERMINISTIC FORMULA TESTS (§7–9, §13, §14)
// Includes the controlled reference calculation (§23).
// =========================================================

import { describe, it, expect } from "vitest";
import {
  requiredInformationFor,
  analyseScenario,
  compareDevelopmentScenarios,
  buildPropertyCostView,
  analyseInvestment,
  simulateInvestmentScenario,
} from "./development-investment";

describe("requiredInformationFor (§7)", () => {
  it("lists exactly what is missing, no guessing", () => {
    const reqs = requiredInformationFor("extension", {
      hasBuildingSize: false,
      hasFloorCount: false,
      hasLandSize: true,
      hasConstructionEstimate: false,
      hasMarketData: false,
    });
    expect(reqs.some((r) => r.includes("Building size"))).toBe(true);
    expect(reqs.some((r) => r.includes("Floor count"))).toBe(true);
    expect(reqs.some((r) => r.includes("construction estimate"))).toBe(true);
    expect(reqs.some((r) => r.includes("qualified professional"))).toBe(true);
    expect(reqs.some((r) => r.toLowerCase().includes("site size"))).toBe(false); // land known
  });

  it("requires only market data for as-is", () => {
    expect(
      requiredInformationFor("as_is", { hasMarketData: true }),
    ).toHaveLength(0);
    expect(
      requiredInformationFor("as_is", { hasMarketData: false }),
    ).toHaveLength(1);
  });
});

describe("compareDevelopmentScenarios (§8)", () => {
  it("marks unpriced scenarios unavailable, no invented costs", () => {
    const cmp = compareDevelopmentScenarios([
      { kind: "as_is", scope: "Do nothing", assumptions: [], knownRisks: [] },
      {
        kind: "extension",
        scope: "Add 2 rooms",
        assumptions: [],
        knownRisks: [],
      },
    ]);
    expect(cmp.scenarios[1].cost.status).toBe("unavailable");
    expect(cmp.scenarios[1].limitations.join(" ")).toContain(
      "none was invented",
    );
    expect(cmp.note).toContain("not computed");
  });

  it("computes deltas only between priced scenarios", () => {
    const cmp = compareDevelopmentScenarios([
      { kind: "as_is", scope: "Do nothing", assumptions: [], knownRisks: [] },
      {
        kind: "renovation",
        scope: "Full renovation",
        assumptions: [],
        knownRisks: [],
        construction: {
          currency: "NGN",
          totalCost: 5_000_000,
          costSource: {
            kind: "engine",
            engineId: "painting_project",
            source: "Painting engine",
          },
        },
      },
      {
        kind: "new_construction",
        scope: "Demolish and rebuild",
        assumptions: [],
        knownRisks: [],
        construction: {
          currency: "NGN",
          totalCost: 50_000_000,
          costSource: {
            kind: "engine",
            engineId: "build_to_roof",
            source: "Build-to-Roof engine",
          },
        },
      },
    ]);
    // baseline as_is has no price → no deltas, honest note
    expect(cmp.scenarios[1].deltaVsBaseline).toBeUndefined();
    expect(cmp.note).toContain("no priced construction estimate");
  });

  it("computes deltas when the baseline is priced", () => {
    const cmp = compareDevelopmentScenarios([
      {
        kind: "as_is",
        scope: "Do nothing",
        assumptions: [],
        knownRisks: [],
        construction: {
          currency: "NGN",
          totalCost: 0.0000001,
          costSource: { kind: "user", source: "existing" },
        },
      },
      {
        kind: "renovation",
        scope: "Renovate",
        assumptions: [],
        knownRisks: [],
        construction: {
          currency: "NGN",
          totalCost: 5_000_000,
          costSource: {
            kind: "engine",
            engineId: "painting_project",
            source: "Painting engine",
          },
        },
      },
    ]);
    expect(
      cmp.scenarios[1].deltaVsBaseline?.totalCostDifference,
    ).toBeGreaterThan(0);
  });

  it("non as-is scenarios carry the structural feasibility note (§7)", () => {
    const a = analyseScenario({
      kind: "renovation",
      scope: "x",
      assumptions: [],
      knownRisks: [],
    });
    expect(a.limitations.join(" ")).toContain("qualified professional");
  });
});

describe("buildPropertyCostView (§9)", () => {
  it("keeps contingency as a separate assumption, never in the total", () => {
    const view = buildPropertyCostView({
      currency: "NGN",
      acquisitionCost: { amount: 50_000_000, currency: "NGN" },
      constructionCost: {
        amount: 20_000_000,
        currency: "NGN",
        source: "Build-to-Roof engine",
      },
      contingencyPercent: 10,
      professionalCosts: [],
    });
    expect(view.cost.totalKnownCost).toBe(70_000_000); // contingency NOT added
    expect(view.contingency?.amount).toBe(7_000_000);
    expect(view.contingency?.note).toContain("NOT added to the total");
    expect(view.unknownCosts).toContain(
      "professional fees (not supplied, not invented)",
    );
  });

  it("rejects cross-currency costs instead of mixing them", () => {
    const view = buildPropertyCostView({
      currency: "NGN",
      acquisitionCost: { amount: 50_000_000, currency: "USD" },
    });
    expect(view.cost.status).toBe("invalid_input");
    expect(view.cost.reason).toContain("not mixed");
  });
});

describe("analyseInvestment, CONTROLLED REFERENCE (§13, §23)", () => {
  it("hand-checked totals, margin, yield, return", () => {
    const analysis = analyseInvestment({
      currency: "NGN",
      acquisitionCost: { amount: 50_000_000, currency: "NGN" },
      constructionCost: {
        amount: 20_000_000,
        currency: "NGN",
        source: "Build-to-Roof engine",
      },
      estimatedSaleValue: {
        amount: 90_000_000,
        currency: "NGN",
        source: "indicative comparable estimate",
        sourceKind: "indicative_estimate",
      },
      monthlyGrossRent: { amount: 500_000, currency: "NGN" },
      floorArea: { value: 200, unit: "m²" },
    });

    // Total known cost = 70,000,000 (§23 controlled reference)
    expect(analysis.totalKnownCost).toBe(70_000_000);
    // Cost per area = 70,000,000 / 200 = 350,000
    expect(analysis.costPerArea?.value).toBe(350_000);
    // Margin = ((90M − 70M) / 70M) × 100 = 28.57%
    expect(analysis.grossDevelopmentMargin?.status).toBe("calculated");
    expect(analysis.grossDevelopmentMargin?.value).toBeCloseTo(28.57, 2);
    // Sale scenario: net proceeds 20M; simple return 20/70 = 28.57%
    expect(analysis.saleScenario?.netProceeds).toBe(20_000_000);
    expect(analysis.saleScenario?.simpleReturnPercent).toBeCloseTo(28.57, 2);
    // Gross yield against acquisition cost: (500k × 12) / 50M = 12%
    expect(analysis.grossYield?.status).toBe("calculated");
    expect(analysis.grossYield?.value).toBeCloseTo(12, 5);
    // Indicative sale value source is disclosed as not a professional valuation
    expect(analysis.assumptions.join(" ")).toContain(
      "not a professional valuation",
    );
    expect(analysis.limitations.join(" ")).toContain(
      "not personalized financial advice",
    );
  });

  it("produces NO margin when sale value is missing (§13: no assumed value)", () => {
    const analysis = analyseInvestment({
      currency: "NGN",
      acquisitionCost: { amount: 50_000_000, currency: "NGN" },
    });
    // The deterministic margin engine refuses to compute without a
    // sale value, it returns insufficient_data, never a guess.
    expect(analysis.grossDevelopmentMargin?.status).toBe("insufficient_data");
    expect(analysis.grossDevelopmentMargin?.reason).toContain(
      "does not assume one",
    );
    expect(analysis.saleScenario).toBeUndefined();
    expect(analysis.limitations.join(" ")).toContain("does not assume one");
  });
});

describe("simulateInvestmentScenario (§14)", () => {
  const baseline = {
    currency: "NGN",
    acquisitionCost: { amount: 50_000_000, currency: "NGN" },
    constructionCost: {
      amount: 20_000_000,
      currency: "NGN",
      source: "Build-to-Roof engine",
    },
    estimatedSaleValue: {
      amount: 90_000_000,
      currency: "NGN",
      source: "test",
      sourceKind: "user" as const,
    },
  };

  it("what-if: construction costs +15%, deterministic re-run", () => {
    const sim = simulateInvestmentScenario(baseline, {
      kind: "construction_cost_factor",
      percent: 15,
    });
    expect(sim.hypothetical).toBe(true);
    expect(sim.difference.note).toContain("not a prediction");
    // 20M × 1.15 = 23M → total 73M (baseline 70M) → +3M
    expect(sim.scenario.totalKnownCost).toBe(73_000_000);
    expect(sim.difference.totalKnownCostDifference).toBe(3_000_000);
    // return drops from 28.57% to (90−73)/73 = 23.29%
    expect(sim.scenario.saleScenario?.simpleReturnPercent).toBeCloseTo(
      23.29,
      2,
    );
    expect(sim.difference.simpleReturnDifferencePercent).toBeCloseTo(
      23.29 - 28.57,
      2,
    );
  });

  it("what-if: rented instead of sold removes sale scenario and adds rent scenario", () => {
    const sim = simulateInvestmentScenario(baseline, {
      kind: "rent_instead_of_sale",
      monthlyGrossRent: 600_000,
    });
    expect(sim.scenario.saleScenario).toBeUndefined();
    expect(sim.scenario.rentScenario?.annualGrossRent).toBe(7_200_000);
    expect(sim.changedAssumption).toContain("rented");
  });
});
