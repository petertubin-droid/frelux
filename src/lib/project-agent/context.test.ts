// =========================================================
// PROJECT AGENT, CONTROLLED CONTEXT ENGINE TESTS (Stage 2)
//
// Acceptance matrix: complete project, partially completed,
// empty project, missing measurements, missing market data,
// conflicting information, the agent states what is KNOWN and
// what is MISSING. Nothing invented, nothing substituted.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => {
  const state: {
    documents: Record<string, number>;
    properties: Record<string, { id: string; name: string } | null>;
  } = { documents: {}, properties: {} };
  const supabaseMock = {
    from: vi.fn((table: string) => {
      let lastEq = "";
      const eq = vi.fn((_col: string, val: string) => {
        lastEq = val;
        return chain;
      });
      const chain = {
        select: vi.fn(() => chain),
        eq,
        maybeSingle: vi.fn(() => {
          if (table === "properties")
            return { data: state.properties[lastEq] ?? null, error: null };
          return { data: null, error: null };
        }),
        __count: undefined as number | undefined,
      };
      // plan_documents head-count: select('id', {count:'exact', head:true}) then .eq()
      (chain.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        if (table === "plan_documents") {
          return {
            eq: vi.fn((_c: string, v: string) => ({
              count: state.documents[v] ?? 0,
              error: null,
            })),
          };
        }
        return chain;
      });
      return chain;
    }),
    __state: state,
  };
  return { supabase: supabaseMock };
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

vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(
    async (projectId: string, opts: { now?: string } | undefined) => {
      if (projectId === "proj-invisible" || projectId === "proj-null-snapshot")
        return null;
      return makeSnapshot(projectId, opts?.now ?? NOW, currentFixture);
    },
  ),
}));

import { supabase } from "@/lib/supabase";
import {
  buildProjectAgentContext,
  summariseContext,
  type ContextGap,
} from "./context";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";

const NOW = "2026-09-07T14:00:00Z";
const typedSupabase = supabase as unknown as {
  __state: {
    documents: Record<string, number>;
    properties: Record<string, { id: string; name: string } | null>;
  };
};

// ---------------------------------------------------------
// Fixtures
// ---------------------------------------------------------

interface Fixture {
  progress: number | null;
  stages: Array<{
    id: string;
    stageKey: string;
    stageName: string;
    sortOrder: number;
    isCompleted: boolean;
    completedAt: string | null;
    hasPhoto: boolean;
    updatedAt: string;
  }>;
  shopping: Array<Record<string, unknown>>;
  calculations: Array<{
    id: string;
    calculatorType: string;
    title: string;
    createdAt: string;
    estimatedTotal: number | null;
  }>;
  marketPrices: Array<Record<string, unknown>>;
  observations: Array<Record<string, unknown>>;
  region: {
    marketCode: string | null;
    countryCode: string | null;
    city: string | null;
  };
  documents: number;
  property: { id: string; name: string } | null;
}

const EMPTY_FIXTURE: Fixture = {
  progress: null,
  stages: [],
  shopping: [],
  calculations: [],
  marketPrices: [],
  observations: [],
  region: { marketCode: null, countryCode: null, city: null },
  documents: 0,
  property: null,
};

const COMPLETE_FIXTURE: Fixture = {
  ...EMPTY_FIXTURE,
  progress: 50,
  stages: [
    {
      id: "s1",
      stageKey: "foundation",
      stageName: "Foundation",
      sortOrder: 1,
      isCompleted: true,
      completedAt: "2026-08-01T00:00:00Z",
      hasPhoto: true,
      updatedAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "s2",
      stageKey: "framing",
      stageName: "Framing",
      sortOrder: 2,
      isCompleted: false,
      completedAt: null,
      hasPhoto: false,
      updatedAt: "2026-08-20T00:00:00Z",
    },
  ],
  shopping: [
    {
      id: "shop-1",
      project_id: "proj-1",
      category: "materials",
      name: "Cement bags",
      quantity: 100,
      unit: "bag",
      estimated_price: 8500,
      actual_price: 9000,
      total_price: 900000,
      supplier: "Depot",
      notes: null,
      is_purchased: true,
      sort_order: 1,
    },
  ],
  calculations: [
    {
      id: "c1",
      calculatorType: "roof_area",
      title: "Roof area",
      createdAt: "2026-08-10T00:00:00Z",
      estimatedTotal: 1250000,
    },
  ],
  marketPrices: [
    {
      id: "mp1",
      product_name: "Cement",
      median_price: 8700,
      price: 8700,
      currency_code: "NGN",
      market_code: "NG",
      region: "Lagos",
      freshness: "recent",
      last_updated: NOW,
      approved_at: NOW,
      auto_approved: false,
    },
  ],
  observations: [
    {
      id: "o1",
      observation: "Roof framing visible",
      observedAt: NOW,
      confidence: 0.9,
      verification: "user_confirmed",
      sourceLabel: "photo",
    },
    {
      id: "o2",
      observation: "Possible wall crack",
      observedAt: NOW,
      confidence: 0.7,
      verification: "unverified",
      sourceLabel: "photo",
    },
  ],
  region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
  documents: 2,
  property: { id: "prop-1", name: "Ikeja duplex" },
};

let currentFixture: Fixture = COMPLETE_FIXTURE;

function makeSnapshot(
  projectId: string,
  now: string,
  f: Fixture,
): PredictiveProjectSnapshot {
  return {
    projectId,
    now,
    project: {
      name: "P",
      status: "in_progress",
      createdAt: "2026-07-01T00:00:00Z",
      updatedAt: now,
      progressPercentage: f.progress,
    },
    stages: f.stages,
    shoppingItems: f.shopping as never,
    calculations: f.calculations,
    priceHistory: [],
    marketPrices: f.marketPrices as never,
    visualObservations: f.observations as never,
    region: f.region,
  } as PredictiveProjectSnapshot;
}

beforeEach(() => {
  currentFixture = COMPLETE_FIXTURE;
  typedSupabase.__state.documents = { "proj-1": COMPLETE_FIXTURE.documents };
  typedSupabase.__state.properties = { "proj-1": COMPLETE_FIXTURE.property };
});

// ---------------------------------------------------------
// Tests
// ---------------------------------------------------------

describe("project isolation", () => {
  it("an invisible project → project_not_found, no context built", async () => {
    const result = await buildProjectAgentContext("proj-invisible", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("project_not_found");
  });

  it("a snapshot that returns null (RLS-shaped) → project_not_found", async () => {
    const result = await buildProjectAgentContext("proj-null-snapshot", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("project_not_found");
  });
});

describe("complete project", () => {
  it("labels every item with its data class, no unlabelled data", async () => {
    const result = await buildProjectAgentContext("proj-1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    for (const item of result.data.items) {
      expect(item.dataClass, `item ${item.key}`).toBeTruthy();
      expect(item.source, `item ${item.key}`).toBeTruthy();
    }
  });

  it("engine calculations are estimated; AI observations require confirmation; forecasts are ai_analysis", async () => {
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const calc = result.data.items.find((i) => i.key === "calc:c1");
    expect(calc?.dataClass).toBe("estimated");

    const confirmed = result.data.items.find((i) => i.key === "observation:o1");
    expect(confirmed?.dataClass).toBe("ai_extracted");
    expect(confirmed?.requiresConfirmation).toBe(false); // user_confirmed

    const unverified = result.data.items.find(
      (i) => i.key === "observation:o2",
    );
    expect(unverified?.requiresConfirmation).toBe(true); // unverified, must be confirmed

    const forecast = result.data.items.find((i) => i.area === "forecasts");
    expect(forecast?.dataClass).toBe("ai_analysis");

    const bm = result.data.items.find((i) => i.area === "building_model");
    expect(bm?.dataClass).toBe("verified");
  });

  it("known areas are NOT listed as gaps", async () => {
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const gapKeys = result.data.gaps.map((g: ContextGap) => g.key);
    expect(gapKeys).not.toContain("stages");
    expect(gapKeys).not.toContain("calculations");
    expect(gapKeys).not.toContain("shopping_list");
    expect(gapKeys).not.toContain("plan_documents");
    expect(gapKeys).not.toContain("building_model");
    expect(gapKeys).not.toContain("linked_property");
    expect(gapKeys).not.toContain("market_prices");
  });
});

describe("empty project", () => {
  it("states what is known and what is missing, nothing invented", async () => {
    currentFixture = EMPTY_FIXTURE;
    typedSupabase.__state.documents = {};
    typedSupabase.__state.properties = {};
    const result = await buildProjectAgentContext("proj-1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const gapKeys = result.data.gaps.map((g) => g.key);
    for (const expected of [
      "progress",
      "stages",
      "calculations",
      "shopping_list",
      "plan_documents",
      "building_model",
      "linked_property",
      "market_prices",
    ]) {
      expect(gapKeys, `missing gap: ${expected}`).toContain(expected);
    }
    // identity items still present and honestly labelled
    const progress = result.data.items.find((i) => i.key === "progress");
    expect(progress?.value).toBe(null);
    expect(result.data.items.find((i) => i.key === "name")).toBeTruthy();
  });
});

describe("missing market data / region", () => {
  it("no region on project → regional gap, and NO substitution from another region", async () => {
    currentFixture = {
      ...COMPLETE_FIXTURE,
      region: { marketCode: null, countryCode: null, city: null },
      marketPrices: [],
    };
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const marketGap = result.data.gaps.find((g) => g.key === "market");
    expect(marketGap?.reason).toContain("no regional profile applies");
    expect(marketGap?.reason).toContain("substituted");
    const priceGap = result.data.gaps.find((g) => g.key === "market_prices");
    expect(priceGap?.reason).toContain("is substituted from another region");
    // no regional_profile item was fabricated
    expect(
      result.data.items.find((i) => i.area === "regional_profile"),
    ).toBeUndefined();
  });
});

describe("conflicting information", () => {
  it("progress vs completed stages ≥ 20% → conflict with a stated resolution (no silent pick)", async () => {
    currentFixture = {
      ...COMPLETE_FIXTURE,
      progress: 80, // stages say 50%
    };
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const conflict = result.data.conflicts.find(
      (c) => c.key === "progress_vs_stages",
    );
    expect(conflict).toBeTruthy();
    expect(conflict?.description).toContain("80%");
    expect(conflict?.description).toContain("50%");
    expect(conflict?.resolution).toContain("does NOT pick one silently");
  });

  it("a completed stage without a timestamp → conflict flagged", async () => {
    currentFixture = {
      ...COMPLETE_FIXTURE,
      stages: COMPLETE_FIXTURE.stages.map((s) =>
        s.id === "s1" ? { ...s, completedAt: null } : s,
      ),
    };
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const conflict = result.data.conflicts.find(
      (c) => c.key === "completed_without_timestamp",
    );
    expect(conflict?.description).toContain("Foundation");
    expect(conflict?.resolution).toContain("flagged");
  });

  it("consistent project → no progress conflicts", async () => {
    const result = await buildProjectAgentContext("proj-1", NOW); // 50% vs 50%
    if (!result.ok) return;
    expect(
      result.data.conflicts.find((c) => c.key === "progress_vs_stages"),
    ).toBeUndefined();
    expect(
      result.data.conflicts.find(
        (c) => c.key === "completed_without_timestamp",
      ),
    ).toBeUndefined();
  });
});

describe("partially completed project", () => {
  it("known parts are labelled, missing parts are gaps, both visible", async () => {
    currentFixture = {
      ...COMPLETE_FIXTURE,
      shopping: [],
      marketPrices: [],
      documents: 2,
      property: null,
    };
    typedSupabase.__state.properties = {};
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const gapKeys = result.data.gaps.map((g) => g.key);
    expect(gapKeys).toContain("shopping_list");
    expect(gapKeys).toContain("market_prices");
    expect(gapKeys).toContain("linked_property");
    // building model still known
    expect(
      result.data.items.find((i) => i.area === "building_model"),
    ).toBeTruthy();
  });
});

describe("summariseContext", () => {
  it("renders known, conflicts and missing sections honestly", async () => {
    currentFixture = { ...EMPTY_FIXTURE, documents: 0 };
    typedSupabase.__state.documents = {};
    typedSupabase.__state.properties = {};
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const summary = summariseContext(result.data);
    expect(summary).toContain("Known");
    expect(summary).toContain("Missing");
  });

  it("with no gaps, states that nothing is REPORTED missing, not that nothing is missing", async () => {
    const result = await buildProjectAgentContext("proj-1", NOW);
    if (!result.ok) return;
    const summary = summariseContext(result.data);
    expect(summary).toContain("not a claim that nothing is missing");
  });
});
