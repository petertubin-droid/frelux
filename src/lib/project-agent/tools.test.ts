// =========================================================
// PROJECT AGENT — TOOL ORCHESTRATION LAYER TESTS (Stage 3)
//
// Stage 3 acceptance: for every supported tool,
//   agent request → correct tool → authoritative result
// must produce the SAME mathematical result as using the
// engine directly. These tests compare the agent's result
// against a direct engine call — verbatim, field by field.
//
// Also verified:
//   - project isolation (invisible project → project_not_found)
//   - unknown tools are refused (no fallback)
//   - missing inputs → insufficient_data (never fabricated)
//   - no region substitution in market intelligence
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------
// Supabase mock — RLS-scoped reads, per-table fixtures
// ---------------------------------------------------------
interface PlanDocRow { id: string; project_id: string; }
interface PropertyRowFixture { construction_project_id: string; name: string; }

const state: {
  planDocuments: PlanDocRow[];
  extractions: Record<string, unknown>;
  properties: PropertyRowFixture[];
} = {
  planDocuments: [],
  extractions: {},
  properties: [],
};

vi.mock("@/lib/supabase", () => {
  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "plan_documents") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_c: string, projectId: string) => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => {
                    const docs = state.planDocuments.filter(
                      (d) => d.project_id === projectId,
                    );
                    // latest first — the tool orders created_at desc
                    return { data: docs[docs.length - 1] ?? null, error: null };
                  }),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "plan_extractions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_c: string, documentId: string) => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: state.extractions[documentId]
                      ? { extraction: state.extractions[documentId] }
                      : null,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "properties") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_c: string, projectId: string) => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(async () => {
                  const row = state.properties.find(
                    (p) => p.construction_project_id === projectId,
                  );
                  return row ? { data: row, error: null } : { data: null, error: null };
                }),
              })),
            })),
          })),
        };
      }
      // contractor_projects visibility check
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "x" }, error: null })),
          })),
        })),
      };
    }),
  };
  return { supabase: supabaseMock, isSupabaseConfigured: true };
});

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
// Predictive snapshot mock — feeds shopping_list, scenarios,
// cost analysis, market intelligence, calculator lookup
// ---------------------------------------------------------
const snapshotState: {
  shoppingItems: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
  calculations: Array<Record<string, unknown>>;
  region: { marketCode: string | null; countryCode: string | null; city: string | null };
  nullSnapshot: boolean;
} = {
  shoppingItems: [],
  stages: [],
  calculations: [],
  region: { marketCode: null, countryCode: null, city: null },
  nullSnapshot: false,
};

vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(async (projectId: string, opts: { now?: string } | undefined) => {
    if (projectId === "proj-invisible" || snapshotState.nullSnapshot) return null;
    return {
      projectId,
      project: {
        id: projectId,
        name: "Test Project",
        status: "active",
        progressPercentage: 40,
        budgetTotal: 5_000_000,
        budgetSpent: 1_200_000,
        updatedAt: opts?.now ?? "",
      },
      stages: snapshotState.stages,
      shoppingItems: snapshotState.shoppingItems,
      calculations: snapshotState.calculations,
      priceHistory: [],
      marketPrices: [],
      visualObservations: [],
      region: snapshotState.region,
    };
  }),
}));

// Market intelligence query mock — records the market it was asked for
const miState: { requestedMarket: string | null; prices: Array<Record<string, unknown>> } = {
  requestedMarket: null,
  prices: [],
};
vi.mock("@/lib/market-intelligence/queries", () => ({
  fetchApprovedPrices: vi.fn(async (marketCode?: string) => {
    miState.requestedMarket = marketCode ?? null;
    return miState.prices;
  }),
  rowToProfile: undefined, // not used from here (property path uses real mapper below)
}));

// Property intelligence: use the REAL engine with a mocked row mapper
vi.mock("@/lib/property-intelligence/queries", () => ({
  rowToProfile: vi.fn(() => ({
    id: "prop-1",
    name: "Duplex A",
    location: { country: "Nigeria", region: null, city: "Lagos", district: null },
    propertyType: "residential",
    constructionStatus: "completed",
  })),
}));

vi.mock("@/lib/predictive-intelligence/analysis", () => ({
  analyzeProject: vi.fn((snapshot: { projectId: string }) => ({
    projectId: snapshot.projectId,
    generatedAt: "2026-09-07T12:00:00Z",
    inputHash: "hash-1",
    dataQuality: {
      rating: "fair",
      reason: "some coverage missing",
      coverage: [{ area: "shopping_list", available: false, note: "no items" }],
    },
    predictions: [],
    risks: [],
    recommendations: [],
    health: { score: 70, band: "fair" },
    scenarios: [],
    limitations: ["coverage limits apply"],
  })),
}));

// ---------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------
import { invokeAgentTool, listAgentTools, describeAgentTool } from "./tools";
import { executeEngine, defaultBuildToRoofInput } from "@/lib/ai-foundation/engines-registry";
import { estimateTimeline } from "@/lib/measurement/timeline-engine";
import { buildQuotation } from "@/lib/measurement/quotation-engine";
import {
  materialPriceChangeScenario,
  taskDelayScenario,
} from "@/lib/predictive-intelligence/scenario-analysis";
import { buildPropertyIntelligenceReport } from "@/lib/property-intelligence/intelligence";
import type { CostEstimate } from "@/lib/measurement/cost-integration";

const NOW = "2026-09-07T12:00:00Z";

beforeEach(() => {
  state.planDocuments = [];
  state.extractions = {};
  state.properties = [];
  snapshotState.shoppingItems = [];
  snapshotState.stages = [];
  snapshotState.calculations = [];
  snapshotState.region = { marketCode: "NG", countryCode: "NG", city: "Lagos" };
  snapshotState.nullSnapshot = false;
  miState.requestedMarket = null;
  miState.prices = [];
});

// ---------------------------------------------------------
// Registry & dispatcher basics
// ---------------------------------------------------------
describe("agent tool registry", () => {
  it("exposes 11 read-only tools with provenance metadata", () => {
    const tools = listAgentTools();
    expect(tools).toHaveLength(11);
    for (const t of tools) {
      expect(t.permission).toBe("read");
      expect(t.creditedAs).toBeTruthy();
      expect(t.requiredInputs.length).toBeGreaterThan(0);
    }
  });

  it("describes known tools and refuses unknown ones", () => {
    expect(describeAgentTool("build_to_roof")?.title).toBe("Build-to-Roof estimate");
    expect(describeAgentTool("make_payment")).toBeNull();
  });
});

describe("dispatcher", () => {
  it("refuses unknown tools — no fallback", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "pay_money" as never }, NOW);
    expect(res.ok).toBe(false);
  });

  it("enforces project isolation before any tool work", async () => {
    const res = await invokeAgentTool("proj-invisible", { tool: "shopping_list" }, NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("project_not_found");
  });

  it("rejects invisible projects even for read-only tools", async () => {
    const res = await invokeAgentTool("proj-invisible", { tool: "cost_analysis" }, NOW);
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------
// Acceptance: identical results to direct engine use
// ---------------------------------------------------------
describe("build_to_roof — verbatim engine parity", () => {
  it("returns EXACTLY the engine's EngineResult for the same input", async () => {
    const overrides = { location: "Lagos" };
    const defaults = defaultBuildToRoofInput();
    const input = { ...defaults, ...overrides };
    const direct = await executeEngine("build_to_roof", input);

    const res = await invokeAgentTool("proj-1", {
      tool: "build_to_roof",
      params: { input: overrides },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("ok");
    // Same math as direct use — verbatim EngineResult (the only
    // permitted difference is the calculatedAt timestamp itself).
    expect({ ...(direct as object), calculatedAt: undefined }).toEqual(
      { ...(res.data.result as object), calculatedAt: undefined },
    );
    expect((res.data.result as { costs: { total: number } }).costs.total)
      .toEqual(direct.costs?.total);
    expect(res.data.engineUsed).toContain("build_to_roof");
    // Provenance: user-supplied overrides marked user_provided.
    const loc = res.data.inputsUsed.find((i) => i.key === "location");
    expect(loc?.dataClass).toBe("user_provided");
  });

  it("labels default-sourced inputs as assumptions, not verified", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "build_to_roof" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const btr = res.data.inputsUsed.find((i) => i.key === "building_type");
    expect(btr?.dataClass).toBe("assumption");
  });
});

describe("project_timeline — verbatim engine parity", () => {
  it("matches estimateTimeline called directly", async () => {
    const scope = { "Block work": 1200, Roofing: 1 };
    const direct = estimateTimeline(new Map(Object.entries(scope)), undefined, {
      weatherBufferPercent: 10,
    });
    const res = await invokeAgentTool("proj-1", {
      tool: "project_timeline",
      params: { scope, weatherBufferPercent: 10 },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.result).toEqual(direct);
  });

  it("refuses to invent a scope — insufficient_data, never a guess", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "project_timeline" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(res.data.missingData.length).toBeGreaterThan(0);
    expect(res.data.result).toBeNull();
  });
});

describe("quotation_preview — verbatim engine parity, preview only", () => {
  const costEstimate = {
    lineItems: [
      { id: "l1", materialName: "Cement", category: "Masonry", quantity: 50, quantityUnit: "bags", unitPrice: 5500, lineTotal: 275000 },
    ],
    categories: [{ name: "Masonry", total: 275000, percentage: 100 }],
    materialsTotal: 275000,
    labourTotal: 150000,
    contingencyPercent: 5,
    contingencyAmount: 13750,
    grandTotal: 438750,
    currency: "NGN",
    confidence: "medium",
    pricedItemCount: 1,
    unpricedItemCount: 0,
    stalePriceCount: 0,
    overriddenPriceCount: 0,
    priceSourceBreakdown: {},
    allPriced: true,
    totalExplanation: "one line item",
  } as unknown as CostEstimate;

  it("matches buildQuotation called directly", async () => {
    const direct = buildQuotation({
      costEstimate,
      clientName: "Mrs Ada",
      projectName: "Test Project",
      quotationNumber: "FRELUX-AGENTTEST-1",
    });
    const res = await invokeAgentTool("proj-1", {
      tool: "quotation_preview",
      params: {
        costEstimate,
        clientName: "Mrs Ada",
        projectName: "Test Project",
        quotationNumber: "FRELUX-AGENTTEST-1",
      },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.result).toEqual(direct);
    expect(res.data.note).toContain("Preview only");
  });

  it("refuses to invent a cost estimate", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "quotation_preview" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
  });
});

describe("scenario_analysis — verbatim engine parity", () => {
  it("price change scenario matches direct engine call", async () => {
    snapshotState.shoppingItems = [
      { id: "s1", name: "Cement", quantity: 10, estimated_price: 5500, total_price: 55000, actual_price: null, is_purchased: false, unit: "bags" },
    ];
    const direct = materialPriceChangeScenario({
      now: NOW,
      shoppingItems: snapshotState.shoppingItems as never,
      changePct: 0.1,
    });
    const res = await invokeAgentTool("proj-1", {
      tool: "scenario_analysis",
      params: { scenario: "material_price_change", changePct: 0.1 },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.result).toEqual(direct);
  });

  it("task delay: passes the pending stage through the deterministic engine", async () => {
    snapshotState.stages = [
      { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-08-01T00:00:00Z", hasPhoto: false, updatedAt: NOW },
      { id: "st2", stageKey: "block", stageName: "Block work", sortOrder: 2, isCompleted: false, completedAt: null, hasPhoto: false, updatedAt: NOW },
    ];
    const direct = taskDelayScenario({
      now: NOW,
      nextPendingStage: "Block work",
      dailySpendRate: null,
      delayDays: 7,
    });
    const res = await invokeAgentTool("proj-1", {
      tool: "scenario_analysis",
      params: { scenario: "task_delay", delayDays: 7 },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.result).toEqual(direct);
  });

  it("engine's honest insufficient_data is passed through, not padded", async () => {
    // no shopping items recorded
    const res = await invokeAgentTool("proj-1", {
      tool: "scenario_analysis",
      params: { scenario: "material_price_change", changePct: 0.1 },
    }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(res.data.missingData).toContain("shopping_list");
  });

  it("rejects unknown scenario kinds and missing parameters", async () => {
    const a = await invokeAgentTool("proj-1", {
      tool: "scenario_analysis",
      params: { scenario: "interest_rate_drop" },
    }, NOW);
    const b = await invokeAgentTool("proj-1", {
      tool: "scenario_analysis",
      params: { scenario: "material_price_change" },
    }, NOW);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.status).toBe("insufficient_data");
      expect(b.data.status).toBe("insufficient_data");
    }
  });
});

describe("cost_analysis & shopping_list & calculator_lookup — recorded data verbatim", () => {
  it("cost analysis returns the deterministic analysis verbatim", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "cost_analysis" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("ok");
    const analysis = res.data.result as { dataQuality: { coverage: unknown[] }; limitations: string[] };
    expect(analysis.dataQuality.coverage).toHaveLength(1);
    expect(analysis.limitations).toEqual(["coverage limits apply"]);
    expect(res.data.assumptions).toEqual(["coverage limits apply"]);
  });

  it("shopping list returns recorded items with estimated/actual intact", async () => {
    snapshotState.shoppingItems = [
      { id: "s1", name: "Cement", quantity: 10, estimated_price: 5500, actual_price: 5600, is_purchased: true, updated_at: "2026-09-01T00:00:00Z" },
    ];
    const res = await invokeAgentTool("proj-1", { tool: "shopping_list" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.result).toEqual(snapshotState.shoppingItems);
    expect(res.data.dataFreshness).toBe("2026-09-01T00:00:00Z");
  });

  it("empty shopping list is an explicit gap, not a fabricated total", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "shopping_list" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((res.data.result as unknown[]).length).toBe(0);
    expect(res.data.missingData[0]).toContain("none recorded");
  });

  it("calculator lookup lists registry engines + saved calculations", async () => {
    snapshotState.calculations = [
      { id: "c1", calculatorType: "build_to_roof", title: "Main build", createdAt: NOW, estimatedTotal: 4_200_000 },
    ];
    const res = await invokeAgentTool("proj-1", { tool: "calculator_lookup" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const { engines, savedCalculations } = res.data.result as {
      engines: Array<{ id: string; authoritative: true }>;
      savedCalculations: Array<{ id: string }>;
    };
    expect(engines.length).toBeGreaterThanOrEqual(4);
    for (const e of engines) expect(e.authoritative).toBe(true);
    expect(savedCalculations).toEqual([
      { id: "c1", calculatorType: "build_to_roof", title: "Main build", createdAt: NOW, estimatedTotal: 4_200_000 },
    ]);
  });
});

describe("property_analysis — linked property only", () => {
  it("runs the real Property Intelligence engine on the linked property", async () => {
    state.properties = [{ construction_project_id: "proj-1", name: "Duplex A" }];
    const res = await invokeAgentTool("proj-1", { tool: "property_analysis" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("ok");
    // Compare with the engine called directly with the same profile.
    const direct = buildPropertyIntelligenceReport({
      profile: {
        id: "prop-1",
        name: "Duplex A",
        location: { country: "Nigeria", region: null, city: "Lagos", district: null },
        propertyType: "residential",
        constructionStatus: "completed",
      } as never,
      nowIso: NOW,
    });
    expect(res.data.result).toEqual(direct);
  });

  it("no linked property → insufficient_data, never a substitute", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "property_analysis" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
  });
});

describe("market_intelligence — project's OWN region only", () => {
  it("queries exactly the project market and returns prices verbatim", async () => {
    miState.prices = [
      { id: "p1", product_name: "Cement", market_code: "NG", median_price: 5500, last_updated: "2026-09-06T00:00:00Z" },
    ];
    const res = await invokeAgentTool("proj-1", { tool: "market_intelligence" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(miState.requestedMarket).toBe("NG");
    expect(res.data.result).toEqual(miState.prices);
    expect(res.data.dataFreshness).toBe("2026-09-06T00:00:00Z");
  });

  it("no confirmed location → insufficient_data, NO region substitution", async () => {
    snapshotState.region = { marketCode: null, countryCode: null, city: null };
    const res = await invokeAgentTool("proj-1", { tool: "market_intelligence" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(miState.requestedMarket).toBeNull(); // never queried another market
    expect(res.data.missingData[0]).toContain("NO other region");
  });

  it("empty price records → explicit gap, no invented prices", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "market_intelligence" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(res.data.missingData[0]).toContain("none on record");
  });
});

describe("quantity_takeoff & document_analysis — extraction-gated", () => {
  const extraction = {
    id: "ext-1",
    documentId: "doc-1",
    version: 1,
    scale: null,
    rooms: [
      {
        id: "room-1",
        name: "Bedroom",
        reviewStatus: "user_confirmed",
        length: 4,
        width: 3.5,
        height: 3,
        unit: "meters",
      },
    ],
    roof: null,
    buildingFacts: [],
    notes: [],
    warnings: ["scale not detected"],
    issues: [],
    nativeUnit: "meters",
    extractedAt: "2026-09-06T08:00:00Z",
  };

  it("both tools: no document/extraction → insufficient_data", async () => {
    const a = await invokeAgentTool("proj-1", { tool: "quantity_takeoff" }, NOW);
    const b = await invokeAgentTool("proj-1", { tool: "document_analysis" }, NOW);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.status).toBe("insufficient_data");
      expect(b.data.status).toBe("insufficient_data");
    }
  });

  it("takeoff: executes the existing planner + registry engines per room", async () => {
    state.planDocuments = [{ id: "doc-1", project_id: "proj-1" }];
    state.extractions["doc-1"] = extraction;
    const res = await invokeAgentTool("proj-1", { tool: "quantity_takeoff" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("ok");
    const items = res.data.result as Array<{
      kind: string;
      status: string;
      result?: { ok: boolean; engine: string };
    }>;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      if (item.result) {
        // Engine results carry their engine id and honest status.
        expect(item.result.engine).toBeTruthy();
      }
    }
    expect(res.data.assumptions).toContain("scale not detected");
    expect(res.data.inputsUsed.find((i) => i.key === "room:room-1")?.dataClass).toBe("verified");
  });

  it("document analysis: consistency findings verbatim + warnings carried", async () => {
    state.planDocuments = [{ id: "doc-1", project_id: "proj-1" }];
    // duplicate room → deterministic duplicate finding
    state.extractions["doc-1"] = {
      ...extraction,
      rooms: [
        ...extraction.rooms,
        { ...extraction.rooms[0], id: "room-2", name: "Bedroom" },
      ],
    };
    const res = await invokeAgentTool("proj-1", { tool: "document_analysis" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const result = res.data.result as {
      issues: Array<{ code: string }>;
      warnings: string[];
    };
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual(["scale not detected"]);
    expect(res.data.dataFreshness).toBe("2026-09-06T08:00:00Z");
  });
});
