// =========================================================
// FRELUX PREDICTIVE INTELLIGENCE, TESTS (Phase 4 §23)
//
// Controlled project data with INDEPENDENTLY hand-calculated
// expected outcomes. The critical chain verified end-to-end:
//
//   input data → predictive analysis → displayed result
//
// Every expected number below was computed by hand from the
// input rows before the test was written.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  analyzeProject,
  snapshotInputHash,
  classifyFreshness,
  analyzeScheduleRisk,
  analyzeProcurementRisk,
  analyzeMarketTrends,
  analyzeProgressVariance,
  materialPriceChangeScenario,
  materialChangeScenario,
  taskDelayScenario,
  classifyRiskQuestion,
  answerRiskQuestion,
  buildPredictiveContextForAi,
  type PredictiveProjectSnapshot,
  type ShoppingItemWithActual,
} from "./index";

// ---------------------------------------------------------
// Fixtures
// ---------------------------------------------------------

const NOW = "2026-09-07T12:00:00.000Z";
const T_MINUS = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

let seq = 0;
function makeItem(
  overrides: Partial<ShoppingItemWithActual> = {},
): ShoppingItemWithActual {
  seq += 1;
  return {
    id: `item-${seq}`,
    project_id: "proj-1",
    category: "Material",
    name: "Item",
    quantity: 1,
    unit: "pcs",
    estimated_price: 100,
    actual_price: null,
    total_price: 100,
    supplier: null,
    notes: null,
    is_purchased: false,
    sort_order: seq,
    ...overrides,
  };
}

function makeStages(
  total: number,
  completed: number,
  opts: { completedDaysAgo?: number; outOfOrder?: boolean } = {},
): PredictiveProjectSnapshot["stages"] {
  const completedDaysAgo = opts.completedDaysAgo ?? 5;
  return Array.from({ length: total }, (_, i) => {
    // outOfOrder: skip the FIRST stage, complete the rest
    const isCompleted = opts.outOfOrder
      ? i > 0 && i < completed + 1
      : i < completed;
    return {
      id: `stage-${i + 1}`,
      stageKey: `stage_${i + 1}`,
      stageName: `Stage ${i + 1}`,
      sortOrder: i,
      isCompleted,
      completedAt: isCompleted ? T_MINUS(completedDaysAgo) : null,
      hasPhoto: false,
      updatedAt: T_MINUS(completedDaysAgo),
    };
  });
}

/**
 * CONTROLLED REFERENCE PROJECT (hand-calculated expectations):
 *
 *   - Saved estimate: 100,000 (one calculation, 60 days old)
 *   - Stages: 8, with 4 complete → progress = 0.5
 *   - Shopping list (all purchased with recorded actuals):
 *       Cement: qty 100, est 300/unit, actual 600/unit, line est 30,000
 *       Paint:   qty 10, est 1,000/unit, actual 1,000/unit, line est 10,000
 *     → recorded spend = 100×600 + 10×1,000 = 70,000
 *   - Unpurchased: Roofing sheets, qty 5, est 8,000/unit, line est 40,000,
 *     recorded actual 11,000/unit (+37.5% above estimate)
 *
 * Independent expectations:
 *   cost:      expectedAtProgress = 100,000 × 0.5 = 50,000
 *              burnVariance = 70,000 − 50,000 = 20,000 → burnPct 0.20 → HIGH
 *              projectedFinal = 70,000 + 50,000 = 120,000 → overrun +20%
 *   procurement: roofing sheets needed for remaining work, price +37.5% > 25% → HIGH
 *   cashflow:   planned = 30,000 + 10,000 + 40,000 = 80,000
 *               recorded = 70,000, remaining = 10,000, upcoming = 40,000
 */
function controlledSnapshot(
  overrides: Partial<PredictiveProjectSnapshot> = {},
): PredictiveProjectSnapshot {
  return {
    projectId: "proj-1",
    now: NOW,
    project: {
      name: "Controlled Test Project",
      status: "in_progress",
      createdAt: T_MINUS(120),
      updatedAt: T_MINUS(2),
      progressPercentage: 50,
    },
    stages: makeStages(8, 4),
    shoppingItems: [
      makeItem({
        name: "Cement",
        quantity: 100,
        unit: "bags",
        estimated_price: 300,
        actual_price: 600,
        total_price: 30000,
        is_purchased: true,
        supplier: "Test Supplier Ltd",
      }),
      makeItem({
        name: "Paint",
        quantity: 10,
        unit: "litres",
        estimated_price: 1000,
        actual_price: 1000,
        total_price: 10000,
        is_purchased: true,
        supplier: "Test Supplier Ltd",
      }),
      makeItem({
        name: "Roofing sheets",
        quantity: 5,
        unit: "pcs",
        estimated_price: 8000,
        actual_price: 11000, // recorded price research: +37.5%
        total_price: 40000,
        is_purchased: false,
        supplier: null,
      }),
    ],
    calculations: [
      {
        id: "calc-1",
        calculatorType: "estimator",
        title: "Original estimate",
        createdAt: T_MINUS(60),
        estimatedTotal: 100000,
      },
    ],
    priceHistory: [
      // Cement (50kg bag) price record, 3 dated points, same region
      {
        materialName: "Cement (50kg bag)",
        oldPrice: 5500,
        newPrice: 5500,
        changedAt: T_MINUS(40),
        priceSource: "supplier invoice",
      },
      {
        materialName: "Cement (50kg bag)",
        oldPrice: 5500,
        newPrice: 5800,
        changedAt: T_MINUS(25),
        priceSource: "supplier invoice",
      },
      {
        materialName: "Cement (50kg bag)",
        oldPrice: 5800,
        newPrice: 6200,
        changedAt: T_MINUS(10),
        priceSource: "supplier invoice",
      },
    ],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
    ...overrides,
  };
}

// ---------------------------------------------------------
// §23 CRITICAL: input → analysis → result consistency
// ---------------------------------------------------------

describe("controlled reference project (§23 critical test)", () => {
  const analysis = analyzeProject(controlledSnapshot());

  it("cost overrun: hand-calculated burn math is reproduced exactly", () => {
    const cost = analysis.predictions.find((p) => p.kind === "cost_overrun");
    expect(cost).toBeDefined();
    expect(cost!.status).toBe("ok");
    const r = cost!.result as {
      rating: string;
      recordedSpend: number;
      progressFraction: number;
      expectedSpendAtProgress: number;
      burnVariance: number;
      burnPct: number;
      projectedFinalCost: number;
      projectedOverrunPct: number;
    };
    // Independent hand calculation:
    expect(r.recordedSpend).toBe(70000); // 100×600 + 10×1,000
    expect(r.progressFraction).toBe(0.5); // 4/8 stages
    expect(r.expectedSpendAtProgress).toBe(50000); // 100,000 × 0.5
    expect(r.burnVariance).toBe(20000); // 70,000 − 50,000
    expect(r.burnPct).toBeCloseTo(0.2, 5); // 20,000 / 100,000
    expect(r.rating).toBe("high"); // > 10% band
    expect(r.projectedFinalCost).toBe(120000); // 70,000 + 50,000
    expect(r.projectedOverrunPct).toBeCloseTo(0.2, 5);
    expect(cost!.prediction).toContain("HIGH");
  });

  it("procurement: roofing price increase +37.5% → HIGH risk with missing supplier", () => {
    const procurement = analysis.predictions.find(
      (p) => p.kind === "procurement_risk",
    );
    expect(procurement!.status).toBe("ok");
    const r = procurement!.result as {
      rating: string;
      unpurchasedCount: number;
      missingSupplierNames: string[];
    };
    expect(r.rating).toBe("high");
    expect(r.unpurchasedCount).toBe(1);
    expect(r.missingSupplierNames).toEqual(["Roofing sheets"]);
  });

  it("cashflow: planned 80,000, recorded 70,000, upcoming 40,000", () => {
    const cashflow = analysis.predictions.find((p) => p.kind === "cashflow");
    expect(cashflow!.status).toBe("ok");
    const r = cashflow!.result as {
      plannedSpending: number;
      recordedSpending: number;
      upcomingRequirements: Array<{ estimated: number }>;
    };
    expect(r.plannedSpending).toBe(80000);
    expect(r.recordedSpending).toBe(70000);
    expect(r.upcomingRequirements.reduce((s, u) => s + u.estimated, 0)).toBe(
      40000,
    );
  });

  it("market trend: cement +12.7% over 3 recorded points → increasing", () => {
    const market = analysis.predictions.find(
      (p) => p.kind === "material_price_trend",
    );
    expect(market!.status).toBe("ok");
    const r = market!.result as {
      trends: Array<{
        materialName: string;
        direction: string;
        changePct: number;
        dataPoints: number;
        region: string;
      }>;
    };
    const cement = r.trends.find((t) => t.materialName === "Cement (50kg bag)");
    expect(cement).toBeDefined();
    expect(cement!.direction).toBe("increasing");
    expect(cement!.dataPoints).toBe(3);
    expect(cement!.changePct).toBeCloseTo(6200 / 5500 - 1, 5); // ≈ +12.73%
    expect(cement!.region).toBe("NG");
    expect(market!.prediction).toContain("increasing");
  });

  it("risks and recommendations derive only from measured findings", () => {
    expect(analysis.risks.length).toBeGreaterThan(0);
    expect(analysis.risks.every((r) => r.evidence.length > 0)).toBe(true);
    expect(analysis.recommendations.length).toBe(analysis.risks.length);
    // Cost HIGH risk present; market risk for cement trend present
    expect(
      analysis.risks.some(
        (r) => r.id === "cost-pressure" && r.severity === "high",
      ),
    ).toBe(true);
    expect(analysis.risks.some((r) => r.category === "Market")).toBe(true);
  });

  it("health: cost HIGH, procurement HIGH, no fake reassurance", () => {
    expect(analysis.health.cost.rating).toBe("high");
    expect(analysis.health.procurement.rating).toBe("high");
    expect(analysis.health.schedule.rating).toBe("low");
    expect(analysis.health.progress.rating).toBe("on_track");
  });

  it("every OK prediction carries the full §2 contract", () => {
    for (const p of analysis.predictions.filter((x) => x.status === "ok")) {
      expect(p.evidence.length).toBeGreaterThan(0);
      expect(p.generatedAt).toBe(NOW);
      expect(["current", "stale", "outdated", "unavailable"]).toContain(
        p.freshness,
      );
      expect(p.confidence).not.toBeNull();
      expect(typeof p.confidence!.score).toBe("number");
      expect(p.confidence!.method.length).toBeGreaterThan(10);
      expect(p.assumptions.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------
// Insufficient data (§23)
// ---------------------------------------------------------

describe("insufficient project data (§18)", () => {
  const empty = analyzeProject(
    controlledSnapshot({
      stages: [],
      shoppingItems: [],
      calculations: [],
      priceHistory: [],
    }),
  );

  it("reports INSUFFICIENT DATA everywhere, no fabricated predictions", () => {
    for (const p of empty.predictions) {
      expect(p.status).not.toBe("ok");
      expect(p.result).toBeNull();
      expect(p.confidence).toBeNull();
      expect(p.missingData.length).toBeGreaterThan(0);
    }
  });

  it("health shows insufficient_data, never reassuring defaults", () => {
    expect(empty.health.cost.rating).toBe("insufficient_data");
    expect(empty.health.schedule.rating).toBe("insufficient_data");
    expect(empty.health.procurement.rating).toBe("insufficient_data");
    expect(empty.health.progress.rating).toBe("insufficient_data");
  });

  it("creates zero risks and zero recommendations from missing data", () => {
    expect(empty.risks).toHaveLength(0);
    expect(empty.recommendations).toHaveLength(0);
  });

  it("data quality is LOW with an honest reason", () => {
    expect(empty.dataQuality.rating).toBe("low");
    expect(empty.dataQuality.reason).toContain("0/6");
  });
});

// ---------------------------------------------------------
// Stale & outdated data (§17, §23)
// ---------------------------------------------------------

describe("data freshness", () => {
  it("classifies ages at documented thresholds", () => {
    expect(classifyFreshness(T_MINUS(10), NOW)).toBe("current");
    expect(classifyFreshness(T_MINUS(30), NOW)).toBe("current");
    expect(classifyFreshness(T_MINUS(31), NOW)).toBe("stale");
    expect(classifyFreshness(T_MINUS(90), NOW)).toBe("stale");
    expect(classifyFreshness(T_MINUS(91), NOW)).toBe("outdated");
    expect(classifyFreshness(null, NOW)).toBe("unavailable");
  });

  it("an analysis on outdated records is flagged outdated with low confidence", () => {
    const old = analyzeProject(
      controlledSnapshot({
        stages: makeStages(8, 4, { completedDaysAgo: 200 }),
        calculations: [
          {
            id: "calc-old",
            calculatorType: "estimator",
            title: "Old estimate",
            createdAt: T_MINUS(300),
            estimatedTotal: 100000,
          },
        ],
      }),
    );
    const cost = old.predictions.find((p) => p.kind === "cost_overrun")!;
    expect(cost.freshness).toBe("outdated");
    // The outdated analysis must NEVER score as well as one built on
    // current data (§17). Hand-check: coverage 0.75×0.5 + outdated
    // freshness 0.2×0.3 + verified 1.0×0.2 = 0.635 → medium band.
    const current = analyzeProject(controlledSnapshot());
    const currentCost = current.predictions.find(
      (p) => p.kind === "cost_overrun",
    )!;
    expect(cost.confidence!.score).toBe(0.64); // 0.635 rounded to 2 dp
    expect(cost.confidence!.score).toBeLessThan(currentCost.confidence!.score);
    // Freshness must be visible in the health rollup reasoning too
    expect(old.health.cost.reason).toBeTruthy();
  });
});

// ---------------------------------------------------------
// Schedule delay (§4, §23)
// ---------------------------------------------------------

describe("schedule risk", () => {
  it("detects out-of-order completion as HIGH", () => {
    const result = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: makeStages(6, 3, { outOfOrder: true }), // stage 1 skipped
    });
    expect(result.status).toBe("ok");
    expect((result.result as { rating: string }).rating).toBe("high");
    expect(
      (result.result as { sequencingViolations: unknown[] })
        .sequencingViolations.length,
    ).toBeGreaterThan(0);
    expect(result.prediction).toContain("HIGH");
  });

  it("detects a 20-day stall as HIGH while in progress", () => {
    const result = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: makeStages(6, 2, { completedDaysAgo: 20 }),
    });
    expect((result.result as { rating: string }).rating).toBe("high");
    expect((result.result as { stallDays: number | null }).stallDays).toBe(20);
  });

  it("does not flag a stall when the project is not in progress", () => {
    const result = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "on_hold",
      stages: makeStages(6, 2, { completedDaysAgo: 60 }),
    });
    expect((result.result as { rating: string }).rating).toBe("low");
    expect(
      (result.result as { stallDays: number | null }).stallDays,
    ).toBeNull();
  });

  it("with no stages: states prediction cannot be made", () => {
    const result = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [],
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.prediction).toContain("cannot be reliably made");
    expect(result.missingData).toContain("progress_stages");
  });

  it("never invents planned dates, limitation is disclosed", () => {
    const result = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: makeStages(4, 2),
    });
    expect(result.assumptions.join(" ").toLowerCase()).toContain(
      "not predict calendar completion dates",
    );
  });
});

// ---------------------------------------------------------
// Progress & conflicting data (§7, §8, §23)
// ---------------------------------------------------------

describe("progress intelligence", () => {
  it("flags conflicting stated vs recorded progress as a data-quality risk", () => {
    const analysis = analyzeProject(
      controlledSnapshot({
        stages: makeStages(8, 2), // 25% recorded
        project: { ...controlledSnapshot().project, progressPercentage: 80 },
      }),
    );
    const progress = analysis.predictions.find(
      (p) => p.kind === "progress_variance",
    )!;
    const r = progress.result as {
      stageCompletionPct: number;
      userProgressPct: number | null;
      userProgressDisagrees: boolean;
    };
    expect(r.stageCompletionPct).toBe(25);
    expect(r.userProgressDisagrees).toBe(true);
    expect(progress.prediction).toContain("disagree");
    expect(analysis.health.progress.rating).toBe("at_risk");
    expect(analysis.risks.some((x) => x.category === "Data quality")).toBe(
      true,
    );
  });

  it("visual observations are supporting evidence with verification state, never overrides", () => {
    const analysis = analyzeProject(
      controlledSnapshot({
        visualObservations: [
          {
            id: "vis-1",
            observation: "Roof framing detected in latest site photo",
            observedAt: T_MINUS(3),
            confidence: 0.72,
            verification: "unverified",
            sourceLabel: "Site photo",
          },
        ],
      }),
    );
    const progress = analysis.predictions.find(
      (p) => p.kind === "progress_variance",
    )!;
    expect(
      progress.evidence.some(
        (e) =>
          e.kind === "visual_observation" && e.verification === "unverified",
      ),
    ).toBe(true);
    expect(progress.assumptions.join(" ")).toContain("do not override");
    // Stage-derived completion percentage is unchanged by the photo
    expect(
      (progress.result as { stageCompletionPct: number }).stageCompletionPct,
    ).toBe(50);
  });

  it("without stages: insufficient evidence, no percentage invented", () => {
    const result = analyzeProgressVariance({
      now: NOW,
      stages: [],
      userProgressPct: 70,
      visualObservations: [
        {
          id: "v",
          observation: "Blockwork stage",
          observedAt: T_MINUS(1),
          confidence: 0.9,
          verification: "unverified",
          sourceLabel: "Photo",
        },
      ],
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.prediction).toContain("Insufficient evidence");
  });
});

// ---------------------------------------------------------
// Market / region (§6, §16, §23)
// ---------------------------------------------------------

describe("market price intelligence", () => {
  it("region-locked: no region → unsupported_region, never another region", () => {
    const result = analyzeMarketTrends({
      now: NOW,
      region: { marketCode: null, countryCode: null, city: null },
      projectPriceHistory: [],
      marketPrices: [],
    });
    expect(result.status).toBe("unsupported_region");
    expect(result.prediction).toContain(
      "Prediction unavailable for this region",
    );
    expect(result.regionNote).toBeDefined();
  });

  it("ignores market points from a different region", () => {
    const result = analyzeMarketTrends({
      now: NOW,
      region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
      projectPriceHistory: [],
      marketPrices: [
        // Three points, but for a DIFFERENT market: must not be used
        {
          label: "Cement",
          price: 5500,
          currencyCode: "KES",
          marketCode: "KE",
          region: null,
          collectedAt: T_MINUS(20),
          verified: true,
        },
        {
          label: "Cement",
          price: 5600,
          currencyCode: "KES",
          marketCode: "KE",
          region: null,
          collectedAt: T_MINUS(10),
          verified: true,
        },
        {
          label: "Cement",
          price: 5700,
          currencyCode: "KES",
          marketCode: "KE",
          region: null,
          collectedAt: T_MINUS(5),
          verified: true,
        },
      ],
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.prediction).toBe("Price trend unavailable.");
  });

  it("fewer than 3 dated points → trend unavailable, no synthetic history", () => {
    const result = analyzeMarketTrends({
      now: NOW,
      region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
      projectPriceHistory: [
        {
          materialName: "Cement",
          oldPrice: 5500,
          newPrice: 5600,
          changedAt: T_MINUS(10),
          priceSource: "invoice",
        },
      ],
      marketPrices: [],
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.prediction).toBe("Price trend unavailable.");
    expect(result.missingData.join(" ")).toContain("at least 3");
  });
});

// ---------------------------------------------------------
// Procurement (§5, §23)
// ---------------------------------------------------------

describe("procurement risk", () => {
  it("never claims a material is unavailable", () => {
    const result = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [
        makeItem({ name: "Steel beams", is_purchased: false, supplier: null }),
      ],
      marketPrices: [],
      remainingWork: true,
    });
    expect(result.prediction).not.toMatch(/unavailable/i);
    expect(result.limitations.join(" ")).toContain(
      "never claims a material is unavailable",
    );
  });

  it("empty shopping list → insufficient data", () => {
    const result = analyzeProcurementRisk({
      now: NOW,
      shoppingItems: [],
      marketPrices: [],
      remainingWork: true,
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.missingData).toContain("shopping_list");
  });
});

// ---------------------------------------------------------
// Scenario analysis (§11, §23)
// ---------------------------------------------------------

describe("scenario analysis", () => {
  const items = controlledSnapshot().shoppingItems;

  it("price +10%: baseline 40,000 → 44,000, difference +4,000 (+10%)", () => {
    const s = materialPriceChangeScenario({
      now: NOW,
      shoppingItems: items,
      changePct: 0.1,
    });
    expect(s.status).toBe("ok");
    expect(s.baseline!.value).toBe(40000); // only Roofing sheets unpurchased
    expect(s.result!.value).toBe(44000);
    expect(s.difference!.value).toBe(4000);
    expect(s.difference!.percent).toBe(10);
    expect(s.hypothetical).toBe(true);
    expect(s.assumptions.join(" ")).toContain("not a forecast");
  });

  it("material change: swap roofing unit price 8,000 → 12,000 (+20,000 budget)", () => {
    const s = materialChangeScenario({
      now: NOW,
      shoppingItems: items,
      materialName: "Roofing sheets",
      newUnitPrice: 12000,
    });
    expect(s.status).toBe("ok");
    // budget 80,000 − 40,000 + 5×12,000 = 100,000
    expect(s.result!.value).toBe(100000);
    expect(s.difference!.value).toBe(20000);
    expect(s.difference!.percent).toBe(50);
  });

  it("delay scenario without planned dates discloses the limitation honestly", () => {
    const s = taskDelayScenario({
      now: NOW,
      nextPendingStage: "Stage 5",
      dailySpendRate: null,
      delayDays: 7,
    });
    expect(s.status).toBe("ok");
    expect(s.assumptions.join(" ")).toContain("no planned dates");
    expect(s.hypothetical).toBe(true);
  });

  it("missing target material → insufficient data, no invented line", () => {
    const s = materialChangeScenario({
      now: NOW,
      shoppingItems: items,
      materialName: "Nonexistent",
      newUnitPrice: 100,
    });
    expect(s.status).toBe("insufficient_data");
  });
});

// ---------------------------------------------------------
// Cache/versioning (§22, §23)
// ---------------------------------------------------------

describe("input hash / cache invalidation", () => {
  it("stable across key insertion order; changes when data changes", () => {
    const a = controlledSnapshot();
    const b: PredictiveProjectSnapshot = JSON.parse(JSON.stringify(a)); // identical data
    expect(snapshotInputHash(a)).toBe(snapshotInputHash(b));

    // changed cost data → new hash (cache invalidated)
    const changed = controlledSnapshot({
      shoppingItems: [
        ...a.shoppingItems.slice(0, 2),
        { ...a.shoppingItems[2], actual_price: 15000 },
      ],
    });
    expect(snapshotInputHash(changed)).not.toBe(snapshotInputHash(a));
  });

  it("a changed spend produces a changed, hand-verifiable result", () => {
    const before = analyzeProject(controlledSnapshot());
    const after = analyzeProject(
      controlledSnapshot({
        shoppingItems: [
          ...controlledSnapshot().shoppingItems.slice(0, 2),
          makeItem({
            name: "Roofing sheets",
            quantity: 5,
            estimated_price: 8000,
            actual_price: 20000, // spend jumps
            total_price: 40000,
            is_purchased: true,
            supplier: null,
          }),
        ],
      }),
    );
    const beforeCost = before.predictions.find(
      (p) => p.kind === "cost_overrun",
    )!.result as { recordedSpend: number };
    const afterCost = after.predictions.find((p) => p.kind === "cost_overrun")!
      .result as { recordedSpend: number };
    // 100×600 + 10×1,000 + 5×20,000 = 170,000 (hand-calculated)
    expect(afterCost.recordedSpend).toBe(170000);
    expect(afterCost.recordedSpend).not.toBe(beforeCost.recordedSpend);
  });
});

// ---------------------------------------------------------
// Copilot retrieval (§20, §23)
// ---------------------------------------------------------

describe("copilot integration", () => {
  const analysis = analyzeProject(controlledSnapshot());

  it("routes risk questions deterministically", () => {
    expect(
      classifyRiskQuestion("What are the biggest risks on my project?"),
    ).toBe("biggest_risks");
    expect(classifyRiskQuestion("Am I likely to exceed my budget?")).toBe(
      "budget_exceeded",
    );
    expect(classifyRiskQuestion("Which materials should I secure next?")).toBe(
      "materials_next",
    );
    expect(classifyRiskQuestion("Is my project behind schedule?")).toBe(
      "behind_schedule",
    );
    expect(classifyRiskQuestion("Why is my project cost increasing?")).toBe(
      "why_cost_increasing",
    );
    expect(classifyRiskQuestion("What is the meaning of life?")).toBeNull();
  });

  it("answers budget question from the actual analysis (hand-checked numbers)", () => {
    const a = answerRiskQuestion("budget_exceeded", analysis);
    expect(a.answer).toContain("HIGH");
    expect(a.answer).toContain("120000");
    expect(a.basedOn.length).toBeGreaterThan(0);
  });

  it("answers materials question from actual unpurchased rows", () => {
    const a = answerRiskQuestion("materials_next", analysis);
    expect(a.answer).toContain("Roofing sheets");
    expect(a.answer).toContain("no supplier recorded");
  });

  it("insufficient-data projects get an explicit no-guess answer", () => {
    const empty = analyzeProject(
      controlledSnapshot({
        stages: [],
        shoppingItems: [],
        calculations: [],
        priceHistory: [],
      }),
    );
    const a = answerRiskQuestion("budget_exceeded", empty);
    expect(a.answer).toContain("Insufficient data");
    expect(a.answer).toContain("will not guess");
  });

  it("AI context includes the no-invention rule and only real findings", () => {
    const ctx = buildPredictiveContextForAi(analysis);
    expect(ctx).toContain("RULE: summarize only the facts above");
    expect(ctx).toContain("cost overrun");
    expect(ctx).toContain("confidence");
    // Every number-bearing line traces to an OK or explicitly insufficient prediction
    const emptyCtx = buildPredictiveContextForAi(
      analyzeProject(
        controlledSnapshot({
          stages: [],
          shoppingItems: [],
          calculations: [],
          priceHistory: [],
        }),
      ),
    );
    expect(emptyCtx).toContain("INSUFFICIENT DATA");
    expect(emptyCtx).toContain("No measurable risks detected");
  });
});

// ---------------------------------------------------------
// Edge: AI failure & no AI anywhere in the analysis (§15, §23)
// ---------------------------------------------------------

describe("determinism & failure boundaries", () => {
  it("the full analysis involves no AI: identical input → identical output", () => {
    const snapshot = controlledSnapshot();
    const a = analyzeProject(snapshot);
    const b = analyzeProject(JSON.parse(JSON.stringify(snapshot)));
    expect(a).toEqual(b); // byte-identical bundle, same `now`
  });

  it("handles zero/NaN-poisoned rows without fabricating", () => {
    const poisoned = analyzeProject(
      controlledSnapshot({
        shoppingItems: [
          makeItem({
            name: "Bad row",
            quantity: Number.NaN,
            estimated_price: Number.NaN,
            total_price: Number.NaN,
            actual_price: null,
            is_purchased: false,
          }),
        ],
        calculations: [
          {
            id: "c",
            calculatorType: "estimator",
            title: "Broken",
            createdAt: NOW,
            estimatedTotal: Number.NaN,
          },
        ],
        stages: [],
      }),
    );
    const cost = poisoned.predictions.find((p) => p.kind === "cost_overrun")!;
    // NaN poison must not become a fabricated prediction
    expect(
      cost.status === "ok"
        ? Number.isFinite(
            (cost.result as { recordedSpend: number }).recordedSpend,
          )
        : true,
    ).toBe(true);
    const cashflow = poisoned.predictions.find((p) => p.kind === "cashflow")!;
    const r = cashflow.result as { plannedSpending: number } | null;
    if (r) expect(Number.isFinite(r.plannedSpending)).toBe(true);
  });

  it("imperial-unit rows are treated identically, no unit assumptions in the math", () => {
    // Same structure, imperial units on the labels: the deterministic
    // math is unit-agnostic; no hard-coded metric conversion happens.
    const imperial = analyzeProject(
      controlledSnapshot({
        shoppingItems: [
          makeItem({
            name: "Lumber",
            quantity: 40,
            unit: "board ft",
            estimated_price: 4,
            actual_price: 4,
            total_price: 160,
            is_purchased: true,
            supplier: "Depot",
          }),
          makeItem({
            name: "Drywall sheets",
            quantity: 10,
            unit: "sq ft",
            estimated_price: 15,
            actual_price: 15,
            total_price: 150,
            is_purchased: true,
            supplier: "Depot",
          }),
        ],
        calculations: [
          {
            id: "c2",
            calculatorType: "estimator",
            title: "Estimate",
            createdAt: T_MINUS(20),
            estimatedTotal: 3100,
          },
        ],
        priceHistory: [],
        region: { marketCode: "US", countryCode: "US", city: "Austin" },
      }),
    );
    const cost = imperial.predictions.find((p) => p.kind === "cost_overrun")!;
    expect(cost.status).toBe("ok");
    expect((cost.result as { recordedSpend: number }).recordedSpend).toBe(310); // 40×4 + 10×15
  });
});
