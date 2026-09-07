// =========================================================
// PROJECT AGENT — RECOMMENDATION ENGINE TESTS (Stage 4)
//
// Acceptance matrix: test projects with
//   - no risks              → no risk conditions fabricated
//   - one known risk        → exactly one mapped recommendation
//   - multiple risks        → 1:1 mapping, severity-ordered
//   - conflicting evidence  → conflicting_measurements, both values kept
//   - insufficient data     → INSUFFICIENT DATA, never fabricated
//   - stale data            → stale_market_data, freshness-driven
//
// Every recommendation must carry ALL required fields with
// non-empty evidence and a concrete next step.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {}, isSupabaseConfigured: true }));

vi.mock("./session", () => ({
  assertProjectVisible: vi.fn(async (projectId: string) =>
    projectId === "proj-invisible"
      ? {
          ok: false,
          error: {
            code: "project_not_found" as const,
            message: "Project not found or not visible to this account.",
          },
        }
      : { ok: true, data: true as const },
  ),
}));

// ---------------------------------------------------------
// Fixture state — controls snapshot + analysis + context
// ---------------------------------------------------------
const NOW = "2026-09-07T12:00:00Z";

const fx = {
  snapshot: null as Record<string, unknown> | null,
  analysis: null as Record<string, unknown> | null,
  context: {
    gaps: [] as Array<{ area: string; key: string; reason: string }>,
    conflicts: [] as Array<{ key: string; description: string; resolution: string }>,
    analysis: null,
  },
  snapshotError: false,
};

function makeSnapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    projectId: "proj-1",
    now: NOW,
    project: { name: "Test Project", status: "in_progress", createdAt: "2026-06-01T00:00:00Z", updatedAt: NOW, progressPercentage: 50 },
    stages: [
      { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-07-01T00:00:00Z", hasPhoto: true, updatedAt: "2026-07-01T00:00:00Z" },
      { id: "st2", stageKey: "block", stageName: "Block work", sortOrder: 2, isCompleted: false, completedAt: null, hasPhoto: false, updatedAt: "2026-09-01T00:00:00Z" },
    ],
    shoppingItems: [],
    calculations: [],
    priceHistory: [],
    marketPrices: [
      { id: "mp1", label: "Cement (bag)", price: 5500, currencyCode: "NGN", marketCode: "NG", region: "Lagos", collectedAt: "2026-09-06T00:00:00Z", freshness: "fresh" },
    ],
    visualObservations: [],
    region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
    ...overrides,
  };
}

function risk(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "risk-1",
    category: "Cost",
    severity: "high",
    probability: null,
    title: "Budget at risk",
    evidence: [
      { kind: "shopping_item", label: "Recorded spend ₦1,200,000 of ₦5,000,000 budget", recordedAt: "2026-09-01T00:00:00Z", verification: "user_recorded" },
    ],
    affectedArea: "budget",
    recommendedAction: "Re-estimate remaining purchases",
    confidence: { score: 0.8, band: "high", method: "coverage 100% ×0.5 + freshness current ×0.3 + verified 80% ×0.2" },
    status: "open",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-05T00:00:00Z",
    ...overrides,
  };
}

vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(async (projectId: string, opts: { now?: string } | undefined) => {
    if (projectId === "proj-invisible" || fx.snapshot === null) return null;
    return { ...fx.snapshot, projectId, now: opts?.now ?? NOW };
  }),
}));

vi.mock("@/lib/predictive-intelligence/analysis", () => ({
  analyzeProject: vi.fn(() => fx.analysis),
}));

vi.mock("./context", () => ({
  buildProjectAgentContext: vi.fn(async (projectId: string, nowIso: string) => {
    if (projectId === "proj-invisible") {
      return {
        ok: false,
        error: { code: "project_not_found" as const, message: "nope" },
      };
    }
    return {
      ok: true,
      data: {
        projectId,
        generatedAt: nowIso,
        items: [],
        gaps: fx.context.gaps,
        conflicts: fx.context.conflicts,
        region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
        dataQuality: null,
        analysis: fx.analysis,
      },
    };
  }),
}));

import { buildRecommendations, riskCondition, SEVERITY_ORDER } from "./recommendations";

beforeEach(() => {
  fx.snapshot = makeSnapshot();
  fx.analysis = null;
  fx.context.gaps = [];
  fx.context.conflicts = [];
  fx.snapshotError = false;
});

// ---------------------------------------------------------
// Acceptance: required fields on every recommendation
// ---------------------------------------------------------
describe("recommendation contract", () => {
  it("every recommendation carries ALL required fields with real evidence", async () => {
    fx.analysis = {
      projectId: "proj-1",
      generatedAt: NOW,
      inputHash: "h",
      dataQuality: { rating: "fair", reason: "", coverage: [] },
      predictions: [],
      risks: [risk()],
      recommendations: [
        {
          riskId: "risk-1",
          observation: "spend rate exceeds budget pace",
          analysis: "at the recorded rate the budget will be exceeded",
          recommendation: "Re-estimate remaining purchases now",
          confidence: { score: 0.8, band: "high", method: "" },
          basedOnRisk: "budget",
        },
      ],
      health: { score: 60, band: "fair" },
      scenarios: [],
      limitations: [],
    };

    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.recommendations.length).toBeGreaterThan(0);
    for (const rec of res.data.recommendations) {
      expect(rec.recommendation.trim()).not.toBe("");
      expect(rec.evidence.length).toBeGreaterThan(0);
      expect(rec.evidence.every((e) => e.trim() !== "")).toBe(true);
      expect(rec.affectedElement.trim()).not.toBe("");
      expect(["low", "medium", "high", "critical"]).toContain(rec.severity);
      expect(rec.confidence).not.toBeNull();
      expect(Array.isArray(rec.assumptions)).toBe(true);
      expect(["current", "stale", "outdated", "unavailable"]).toContain(rec.dataFreshness);
      expect(rec.freshnessBasis.trim()).not.toBe("");
      expect(rec.nextStep.trim()).not.toBe("");
      expect(rec.source.trim()).not.toBe("");
    }
  });
});

// ---------------------------------------------------------
// Acceptance: no risks
// ---------------------------------------------------------
describe("no-risk project", () => {
  it("fabricates no risk conditions and says so honestly", async () => {
    fx.analysis = {
      projectId: "proj-1", generatedAt: NOW, inputHash: "h",
      dataQuality: { rating: "good", reason: "", coverage: [] },
      predictions: [], risks: [], recommendations: [],
      health: { score: 85, band: "good" }, scenarios: [], limitations: [],
    };
    fx.snapshot = makeSnapshot({ stages: [
      { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-07-01T00:00:00Z", hasPhoto: true, updatedAt: "2026-07-01T00:00:00Z" },
    ]});
    fx.context.gaps = [];

    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const conds = res.data.recommendations.map((r) => r.condition);
    expect(conds).not.toContain("budget_risk");
    expect(conds).not.toContain("schedule_risk");
    // no blocker was invented
    expect(res.data.insufficientData).toContainEqual({
      condition: "project_blocker",
      reason: expect.stringContaining("no open risks"),
    });
  });
});

// ---------------------------------------------------------
// Acceptance: one known risk
// ---------------------------------------------------------
describe("single-risk project", () => {
  it("maps one Cost risk to exactly one budget_risk recommendation", async () => {
    fx.analysis = {
      projectId: "proj-1", generatedAt: NOW, inputHash: "h",
      dataQuality: { rating: "fair", reason: "", coverage: [] },
      predictions: [], risks: [risk()], recommendations: [],
      health: { score: 60, band: "fair" }, scenarios: [], limitations: [],
    };
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const budget = res.data.recommendations.filter((r) => r.condition === "budget_risk");
    expect(budget).toHaveLength(1);
    expect(budget[0].severity).toBe("high");
    expect(budget[0].evidence[0]).toContain("₦1,200,000");
    expect(budget[0].nextStep).toBe("Re-estimate remaining purchases");
    expect(budget[0].source).toContain("risk-register");
  });

  it("folds the OAR recommendation into the next step when present", async () => {
    fx.analysis = {
      projectId: "proj-1", generatedAt: NOW, inputHash: "h",
      dataQuality: { rating: "fair", reason: "", coverage: [] },
      predictions: [], risks: [risk()], recommendations: [
        { riskId: "risk-1", observation: "obs", analysis: "analysis text", recommendation: "Practical next step", confidence: { score: 0.8, band: "high", method: "" }, basedOnRisk: "budget" },
      ],
      health: { score: 60, band: "fair" }, scenarios: [], limitations: [],
    };
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const budget = res.data.recommendations.find((r) => r.condition === "budget_risk");
    expect(budget?.nextStep).toBe("Practical next step");
    expect(budget?.recommendation).toContain("analysis text");
  });
});

// ---------------------------------------------------------
// Acceptance: multiple risks — 1:1, severity-ordered
// ---------------------------------------------------------
describe("multi-risk project", () => {
  it("maps every risk 1:1 and orders worst severity first", async () => {
    fx.analysis = {
      projectId: "proj-1", generatedAt: NOW, inputHash: "h",
      dataQuality: { rating: "fair", reason: "", coverage: [] },
      predictions: [],
      risks: [
        risk({ id: "risk-low", category: "Data quality", severity: "low", title: "Sparse coverage", affectedArea: "data quality" }),
        risk({ id: "risk-sched", category: "Schedule", severity: "high", title: "Block work behind", affectedArea: "schedule" }),
        risk({ id: "risk-cost", category: "Cost", severity: "medium", title: "Cost drift", affectedArea: "budget" }),
      ],
      recommendations: [],
      health: { score: 50, band: "fair" }, scenarios: [], limitations: [],
    };
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const fromRisk = res.data.recommendations.filter((r) => r.source.startsWith("risk-register"));
    expect(fromRisk).toHaveLength(3);
    const severities = res.data.recommendations.map((r) => SEVERITY_ORDER[r.severity]);
    expect([...severities]).toEqual([...severities].sort((a, b) => a - b));
    // every category mapped deterministically
    expect(res.data.recommendations.find((r) => r.id === "risk:risk-sched")?.condition).toBe("schedule_risk");
    expect(res.data.recommendations.find((r) => r.id === "risk:risk-cost")?.condition).toBe("budget_risk");
    expect(res.data.recommendations.find((r) => r.id === "risk:risk-low")?.condition).toBe("missing_information");
  });
});

// ---------------------------------------------------------
// Acceptance: conflicting evidence
// ---------------------------------------------------------
describe("conflicting evidence", () => {
  it("reports conflicting_measurements with BOTH values — never a silent pick", async () => {
    fx.context.conflicts = [
      {
        key: "progress_vs_stages",
        description: "User-entered progress (80%) differs from completed stages (50% — 1/2).",
        resolution: "Both values are reported side by side; the agent does NOT pick one silently.",
      },
    ];
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const conflict = res.data.recommendations.find(
      (r) => r.condition === "conflicting_measurements",
    );
    expect(conflict).toBeTruthy();
    expect(conflict?.evidence.join(" ")).toContain("80%");
    expect(conflict?.evidence.join(" ")).toContain("50%");
    expect(conflict?.nextStep).toContain("Verify");
  });
});

// ---------------------------------------------------------
// Acceptance: insufficient data
// ---------------------------------------------------------
describe("insufficient data", () => {
  it("null snapshot → INSUFFICIENT DATA report, zero fabricated recommendations", async () => {
    fx.snapshot = null;
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(res.data.recommendations).toHaveLength(0);
    expect(res.data.insufficientData.length).toBe(10);
    expect(res.data.summary).toContain("INSUFFICIENT DATA");
  });

  it("project isolation is enforced first", async () => {
    const res = await buildRecommendations("proj-invisible", NOW);
    expect(res.ok).toBe(false);
  });

  it("no stages / no prices → explicit per-condition INSUFFICIENT DATA, no substitutes", async () => {
    fx.analysis = {
      projectId: "proj-1", generatedAt: NOW, inputHash: "h",
      dataQuality: { rating: "poor", reason: "", coverage: [] },
      predictions: [], risks: [], recommendations: [],
      health: { score: 30, band: "poor" }, scenarios: [], limitations: [],
    };
    fx.snapshot = makeSnapshot({ stages: [], marketPrices: [] });
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const conds = res.data.insufficientData.map((i) => i.condition);
    expect(conds).toContain("incomplete_task");
    expect(conds).toContain("stale_market_data");
    const market = res.data.insufficientData.find((i) => i.condition === "stale_market_data");
    expect(market?.reason).toContain("NO other region's data");
    // and no fabricated recommendations of those types
    expect(res.data.recommendations.map((r) => r.condition)).not.toContain("incomplete_task");
    expect(res.data.recommendations.map((r) => r.condition)).not.toContain("stale_market_data");
  });

  it("context gaps become missing_information recommendations with honest next steps", async () => {
    fx.context.gaps = [{ area: "measurements", key: "footprint", reason: "no building model recorded" }];
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const missing = res.data.recommendations.find((r) => r.condition === "missing_information");
    expect(missing?.affectedElement).toBe("measurements");
    expect(missing?.evidence[0]).toContain("no building model recorded");
    expect(missing?.nextStep).toContain("will not guess");
  });
});

// ---------------------------------------------------------
// Acceptance: stale data
// ---------------------------------------------------------
describe("stale market data", () => {
  it("stale prices → stale_market_data recommendation with age evidence", async () => {
    fx.snapshot = makeSnapshot({
      marketPrices: [
        { id: "mp1", label: "Cement (bag)", price: 5500, currencyCode: "NGN", marketCode: "NG", region: "Lagos", collectedAt: "2026-03-01T00:00:00Z", freshness: "expired" },
      ],
    });
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const stale = res.data.recommendations.find(
      (r) => r.condition === "stale_market_data" && r.id === "market:stale",
    );
    expect(stale).toBeTruthy();
    expect(stale?.dataFreshness).toBe("outdated");
    expect(stale?.severity).toBe("high");
    expect(stale?.evidence[0]).toContain("2026-03-01");
  });
});

// ---------------------------------------------------------
// Derived conditions from recorded state
// ---------------------------------------------------------
describe("derived conditions", () => {
  it("pending stages → incomplete_task with the next pending stage", async () => {
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const task = res.data.recommendations.find((r) => r.condition === "incomplete_task");
    expect(task?.affectedElement).toBe("progress stage: Block work");
    expect(task?.evidence.join(" ")).toContain("1/2");
  });

  it("recorded price increases → procurement_risk with exact deltas", async () => {
    fx.snapshot = makeSnapshot({
      shoppingItems: [
        { id: "s1", category: "Masonry", name: "Cement", quantity: 10, unit: "bags", estimated_price: 5500, actual_price: 5700, total_price: 57000, supplier: null, notes: null, is_purchased: false, sort_order: 1 },
      ],
    });
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const proc = res.data.recommendations.find((r) => r.id === "procurement:increases");
    expect(proc?.condition).toBe("procurement_risk");
    expect(proc?.evidence[0]).toContain("5,500");
    expect(proc?.evidence[0]).toContain("5,700");
    expect(proc?.evidence[0]).toContain("+3.6%");
  });

  it("re-calculated saved totals → quantity_change", async () => {
    fx.snapshot = makeSnapshot({
      calculations: [
        { id: "c1", calculatorType: "build_to_roof", title: "First estimate", createdAt: "2026-07-01T00:00:00Z", estimatedTotal: 4_000_000 },
        { id: "c2", calculatorType: "build_to_roof", title: "Revised estimate", createdAt: "2026-08-15T00:00:00Z", estimatedTotal: 4_600_000 },
      ],
    });
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const qty = res.data.recommendations.find((r) => r.condition === "quantity_change");
    expect(qty?.evidence.length).toBe(2);
    expect(qty?.evidence[1]).toContain("4,600,000");
  });

  it("recorded price history → forecast_change (facts, not projections)", async () => {
    fx.snapshot = makeSnapshot({
      priceHistory: [
        { materialName: "Cement", oldPrice: 5500, newPrice: 5700, changedAt: "2026-09-05T00:00:00Z", priceSource: "market intelligence" },
      ],
    });
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const fc = res.data.recommendations.find((r) => r.condition === "forecast_change");
    expect(fc?.evidence[0]).toContain("Cement");
    expect(fc?.assumptions.join(" ")).toContain("not projections");
  });

  it("no price history → forecast_change is INSUFFICIENT DATA, not invented", async () => {
    const res = await buildRecommendations("proj-1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const fc = res.data.insufficientData.find((i) => i.condition === "forecast_change");
    expect(fc?.reason).toContain("no material price changes recorded");
  });
});

// ---------------------------------------------------------
// Pure mapping helpers
// ---------------------------------------------------------
describe("mapping helpers", () => {
  it("maps every risk category deterministically", () => {
    expect(riskCondition("Cost")).toBe("budget_risk");
    expect(riskCondition("Schedule")).toBe("schedule_risk");
    expect(riskCondition("Procurement")).toBe("procurement_risk");
    expect(riskCondition("Market")).toBe("stale_market_data");
    expect(riskCondition("Data quality")).toBe("missing_information");
    expect(riskCondition("Construction progress")).toBe("incomplete_task");
  });
});
