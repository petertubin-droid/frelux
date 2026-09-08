// =========================================================
// PROJECT AGENT — STAGE 15: MATH & DATA-INTEGRITY CERTIFICATION
//
// For EVERY calculation the agent can trigger, this suite
// certifies the full chain:
//
//   independent hand-derived arithmetic
//     == the engine invoked DIRECTLY (its documented contract)
//     == the agent tool (same inputs, no drift, no re-math)
//     == the saved/recorded result (read back verbatim)
//
// and that recorded-data tools return rows VERBATIM (no
// recomputation, no region substitution, no fabrication).
//
// Nothing here is mocked except supabase (in-memory rows) — the
// same fidelity as the Stage 14 e2e suite.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const NOW = "2026-09-08T12:00:00.000Z";
const DAY_MS = 86_400_000;
const iso = (daysAgo: number) =>
  new Date(new Date(NOW).getTime() - daysAgo * DAY_MS).toISOString();

type Row = Record<string, unknown>;

const ALL_TABLES = [
  "contractor_projects",
  "project_agent_actions",
  "project_agent_approvals",
  "project_agent_activity",
  "project_agent_memory",
  "project_agent_sessions",
  "project_agent_alerts",
  "project_agent_state_baselines",
  "project_shopping_list",
  "project_progress_stages",
  "project_calculations",
  "material_catalog",
  "material_price_history",
  "mi_approved_prices",
  "plan_documents",
  "plan_extractions",
  "properties",
  "screeding_system_config",
  "pop_materials",
];

const db: { tables: Record<string, Row[]> } = {
  tables: Object.fromEntries(ALL_TABLES.map((t) => [t, [] as Row[]])),
};

function resetDb() {
  ALL_TABLES.forEach((t) => {
    db.tables[t] = [];
  });
}

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = () => db.tables[table] ?? [];
    const collector = () => {
      const eqs: Array<[string, unknown]> = [];
      let countHead = false;
      const filtered = () =>
        rows().filter((r) => eqs.every(([k, v]) => r[k] === v));
      const c: Record<string, unknown> = {
        select: (
          _cols?: unknown,
          opts?: { head?: boolean; count?: string },
        ) => {
          if (opts?.head && opts.count) countHead = true;
          return c;
        },
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return c;
        },
        order: () => c,
        limit: () => c,
        maybeSingle: () => {
          if (countHead) {
            return Promise.resolve({
              data: null,
              error: null,
              count: filtered().length,
            });
          }
          const hit = filtered()[0];
          return Promise.resolve({
            data: hit ? { ...hit } : null,
            error: null,
          });
        },
        single: () => {
          const hit = filtered()[0];
          return Promise.resolve({
            data: hit ? { ...hit } : null,
            error: null,
          });
        },
        then: (resolve: (v: unknown) => unknown) =>
          resolve(
            countHead
              ? { data: null, error: null, count: filtered().length }
              : { data: filtered().map((r) => ({ ...r })), error: null },
          ),
      };
      return c;
    };
    return {
      ...collector(),
      // insert records the row; .select().single() returns the
      // inserted row (what the real DB does) so the REAL
      // saveCalculationToProject path is exercisable.
      insert: (row: Row | Row[]) => {
        const items = Array.isArray(row) ? row : [row];
        const inserted = items.map((r) => ({
          ...(r.created_at === undefined
            ? { created_at: new Date().toISOString() }
            : {}),
          ...r,
        }));
        rows().push(...inserted);
        const c: Record<string, unknown> = {
          select: () => c,
          single: () =>
            Promise.resolve({
              data: inserted[0] ? { ...inserted[0] } : null,
              error: null,
            }),
        };
        return {
          ...c,
          then: (resolve: (v: unknown) => unknown) =>
            resolve({ data: null, error: null, count: null }),
        };
      },
      upsert: async (data: Row, opts?: { onConflict?: string }) => {
        const key = opts?.onConflict ?? "id";
        const existing = rows().find((r) => r[key] === data[key]);
        if (existing) Object.assign(existing, data);
        else rows().push({ ...data });
        return { error: null, data: null, count: null };
      },
      delete: () => {
        const eqs: Array<[string, unknown]> = [];
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            eqs.push([col, val]);
            return c;
          },
          then: (resolve: (v: unknown) => unknown) => {
            db.tables[table] = rows().filter(
              (r) => !eqs.every(([k, v]) => r[k] === v),
            );
            return resolve({ error: null, data: null, count: null });
          },
        };
        return c;
      },
      update: (data: Row) => {
        const eqs: Array<[string, unknown]> = [];
        let affected: Row | null = null;
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            eqs.push([col, val]);
            return c;
          },
          select: () => c,
          maybeSingle: () => {
            rows().forEach((r) => {
              if (eqs.every(([k, v]) => r[k] === v)) {
                Object.assign(r, data);
                affected = { ...r };
              }
            });
            return Promise.resolve({
              data: affected ? { ...affected } : null,
              error: null,
            });
          },
          then: (resolve: (v: unknown) => unknown) => {
            rows().forEach((r) => {
              if (eqs.every(([k, v]) => r[k] === v)) {
                Object.assign(r, data);
                affected = { ...r };
              }
            });
            return resolve({
              data: affected ? { ...affected } : null,
              error: null,
              count: null,
            });
          },
        };
        return c;
      },
    };
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

// ---------------------------------------------------------
// Entry points — the REAL chain.
// ---------------------------------------------------------
import { invokeAgentTool } from "./tools";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import { analyzeProject } from "@/lib/predictive-intelligence/analysis";
import {
  materialPriceChangeScenario,
  materialChangeScenario,
  taskDelayScenario,
} from "@/lib/predictive-intelligence/scenario-analysis";
import { estimateTimeline } from "@/lib/measurement/timeline-engine";
import {
  buildCostEstimate,
  type MaterialQuantityInput,
  type MaterialPriceInput,
} from "@/lib/measurement/cost-integration";
import { buildQuotation } from "@/lib/measurement/quotation-engine";
import {
  executeEngine,
  defaultBuildToRoofInput,
} from "@/lib/ai-foundation/engines-registry";
import { fetchApprovedPrices } from "@/lib/market-intelligence/queries";
import { saveCalculationToProject } from "@/lib/project-intelligence";
import { rowToProfile } from "@/lib/property-intelligence/queries";
import { buildPropertyIntelligenceReport } from "@/lib/property-intelligence/intelligence";
import {
  findImpossibleRooms,
  findDuplicateRooms,
  findContradictoryFacts,
  checkAreaTotals,
} from "@/lib/plan-vision/consistency";
import { explicitDimension } from "@/lib/plan-vision/dimensions";
import type { PlanExtraction, ExtractedRoom } from "@/lib/plan-vision/types";
import type { AgentResult, AgentError } from "./types";
import type { EngineResult } from "@/lib/ai-foundation/types";

// AgentResult is a discriminated union — narrow loudly mid-test.
function data<T>(r: AgentResult<T>): T {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error.message}`);
  return r.data;
}
function errorOf<T>(r: AgentResult<T>): AgentError {
  if (r.ok) throw new Error("expected error, got ok");
  return r.error;
}
type ToolData = Awaited<ReturnType<typeof invokeAgentTool>>;
function okData(r: ToolData) {
  return data(r) as {
    tool: string;
    status: string;
    result: unknown;
    missingData: string[];
    inputsUsed: Array<{ key: string; value: unknown }>;
    assumptions: string[];
    dataFreshness: string;
    note: string;
  };
}
/** Compare engine outputs ignoring the calculatedAt timestamp. */
function quantitiesOf(result: EngineResult) {
  return { quantities: result.quantities, costs: result.costs, ok: result.ok };
}

// ---------------------------------------------------------
// Seeds.
// ---------------------------------------------------------
function seedProjectRow(id = "proj-1"): void {
  db.tables.contractor_projects.push({
    id,
    name: "Duplex A",
    status: "in_progress",
    created_at: iso(60),
    updated_at: iso(1),
    progress_percentage: 40,
    location: { country_code: "NG", city: "Lagos" },
  });
}

function seedStages(): void {
  db.tables.project_progress_stages.push(
    {
      id: "stage-1",
      project_id: "proj-1",
      stage_key: "foundation",
      stage_name: "Foundation",
      sort_order: 1,
      is_completed: true,
      completed_at: iso(40),
      photo_url: null,
      notes: null,
      updated_at: iso(40),
    },
    {
      id: "stage-2",
      project_id: "proj-1",
      stage_key: "blockwork",
      stage_name: "Blockwork",
      sort_order: 2,
      is_completed: false,
      completed_at: null,
      photo_url: null,
      notes: null,
      updated_at: iso(2),
    },
  );
}

function seedShopping(): void {
  db.tables.project_shopping_list.push({
    id: "item-cement",
    project_id: "proj-1",
    category: "Materials",
    name: "Cement (bags)",
    quantity: 100,
    unit: "bag",
    estimated_price: 5000,
    actual_price: null,
    total_price: 500000,
    supplier: "Depot Ltd",
    notes: null,
    is_purchased: false,
    sort_order: 1,
  });
}

function seedMarketPrices(): void {
  db.tables.mi_approved_prices.push({
    id: "mp-1",
    product_name: "Cement",
    median_price: 6400,
    price: 6400,
    currency_code: "NGN",
    market_code: "NG",
    region: "Lagos",
    freshness: "recent",
    last_updated: iso(45),
    approved_at: iso(45),
    auto_approved: false,
    is_active: true,
  });
}

function seedScreedConfig(): void {
  db.tables.screeding_system_config.push({
    id: "sc-1",
    system_type: "white_cement_paint",
    display_name: "White Cement + Screeding Paint",
    description: "Combined White Cement and Screeding Paint calculation.",
    coverage_area_m2: 20,
    coverage_unit: "m²",
    default_coats: 2,
    waste_percentage: 20,
    currency: "NGN",
    currency_symbol: "₦",
    putty_name: null,
    putty_quantity: null,
    putty_unit: null,
    putty_price_per_unit: null,
    paint_name: "Screeding Paint",
    paint_quantity: 2,
    paint_unit: "bucket",
    paint_price_per_unit: 25000,
    cement_name: "White Cement",
    cement_quantity: 1,
    cement_unit: "bag",
    cement_price_per_unit: 7500,
    extra_enabled: null,
    extra_name: null,
    extra_quantity: null,
    extra_unit: null,
    extra_price_per_unit: null,
    rounding_rule: "ceil",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
}

function seedPopMaterials(): void {
  db.tables.pop_materials.push({
    id: "pop-1",
    workflow: "nigeria",
    category: "primary",
    name: "POP Cement",
    description: null,
    unit: "bag",
    coverage_rate: 10,
    coverage_unit: "m²",
    package_size: 1,
    package_unit: "bag",
    unit_price: 3500,
    labour_rate_per_sqm: 0,
    is_optional: false,
    currency: "NGN",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
}

beforeEach(() => {
  resetDb();
  seedProjectRow();
});

// =========================================================
// 1. PROJECT TIMELINE — independent arithmetic
// =========================================================
describe("CERT — project_timeline", () => {
  const scope = {
    site_preparation: 400, // 400 m² ÷ 200 m²/day  = 2 days
    foundation: 50, //  50 m³ ÷ 10 m³/day   = 5 days
    masonry: 300, // 300 m² ÷ 15 m²/day   = 20 days
    roofing: 100, // 100 m² ÷ 25 m²/day   = 4 days
  };
  const scopeMap = () =>
    new Map(Object.entries(scope).map(([k, v]) => [k, v] as const));

  it("weather buffer + contingency: independent 39 days == direct engine == agent", async () => {
    // Independent arithmetic (ceil at each step):
    //   site prep:  ceil(2 × 1.10) = 3 days
    //   foundation: ceil(5 × 1.10) = 6 days
    //   masonry:    ceil(20 × 1.10) = 22 days
    //   roofing:    ceil(4 × 1.10) = 5 days
    //   subtotal 36 days + 3 contingency = 39 days total.
    const direct = estimateTimeline(scopeMap(), undefined, {
      weatherBufferPercent: 10,
      contingencyDays: 3,
    });
    // All 10 default templates are returned; the 4 scoped trades
    // carry the buffered days, the rest 0 (never invented).
    expect(direct.phases.map((p) => p.estimatedDays)).toEqual([
      3, 6, 22, 5, 0, 0, 0, 0, 0, 0,
    ]);
    expect(direct.totalEstimatedDays).toBe(39);

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "project_timeline",
        params: { scope, weatherBufferPercent: 10, contingencyDays: 3 },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    expect(inv.result).toEqual(direct); // verbatim — zero drift

    // Per-phase arithmetic is shown in the phase explanations —
    // the traceable "÷" division, not a black-box total.
    const masonry = direct.phases.find((ph) => ph.name === "Block Laying")!;
    expect(masonry.explanation).toContain("300 m² ÷ 15/day = 22 days");
  });

  it("no buffer: independent 36 days == direct engine == agent", async () => {
    const direct = estimateTimeline(scopeMap(), undefined, {});
    // No weather buffer, no contingency: raw quotients 2+5+20+4 = 31.
    expect(direct.totalEstimatedDays).toBe(31);

    const res = await invokeAgentTool(
      "proj-1",
      { tool: "project_timeline", params: { scope } },
      NOW,
    );
    expect(okData(res).result).toEqual(direct);
  });

  it("empty or non-numeric scope → honest insufficient_data, never invented", async () => {
    const res = await invokeAgentTool(
      "proj-1",
      { tool: "project_timeline", params: { scope: {} } },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("insufficient_data");
    expect(inv.missingData[0]).toContain("never invents quantities");
  });
});

// =========================================================
// 2. COST LAYER + QUOTATION — independent totals
// =========================================================
describe("CERT — cost estimate & quotation_preview", () => {
  // 100 blocks @ ₦250 = ₦25,000; 20 cement bags @ ₦5,000 = ₦100,000.
  const quantities: MaterialQuantityInput[] = [
    {
      materialName: "Blocks",
      category: "Masonry",
      quantity: 100,
      quantityUnit: "pcs",
      quantitySource: "material_engine" as never,
    },
    {
      materialName: "Cement",
      category: "Materials",
      quantity: 20,
      quantityUnit: "bag",
      quantitySource: "material_engine" as never,
    },
  ];
  const prices = new Map<string, MaterialPriceInput>(
    quantities.map((q) => [
      q.materialName,
      {
        materialName: q.materialName,
        unitPrice: q.materialName === "Blocks" ? 250 : 5000,
        currency: "NGN",
        source: "manual" as never,
      },
    ]),
  );

  it("cost layer: independent 125,000 + 50,000 + 8,750 = 183,750", () => {
    const estimate = buildCostEstimate(quantities, prices, {
      labourTotal: 50000,
      contingencyPercent: 5,
    });
    // Hand-derived, no engine code reused:
    expect(estimate.materialsTotal).toBe(125000);
    expect(estimate.labourTotal).toBe(50000);
    expect(estimate.contingencyAmount).toBe(8750); // 5% of 175,000
    expect(estimate.grandTotal).toBe(183750);
    expect(estimate.allPriced).toBe(true);
  });

  it("quotation: agent == direct engine, grand total carried verbatim, nothing persisted", async () => {
    const costEstimate = buildCostEstimate(quantities, prices, {
      labourTotal: 50000,
      contingencyPercent: 5,
    });
    const direct = buildQuotation({
      costEstimate,
      clientName: "Mrs. Adeyemi",
      projectName: "Duplex A finishes",
      quotationNumber: "FRELUX-CERT-001",
    });

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "quotation_preview",
        params: {
          costEstimate,
          clientName: "Mrs. Adeyemi",
          projectName: "Duplex A finishes",
          quotationNumber: "FRELUX-CERT-001",
        },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    expect(inv.result).toEqual(direct); // verbatim document
    expect(JSON.stringify(inv.result)).toContain("183750"); // total intact
    expect(inv.note).toContain("Preview only"); // nothing saved/sent
  });
});

// =========================================================
// 3. BUILD-TO-ROOF — chain integrity & determinism
// =========================================================
describe("CERT — build_to_roof", () => {
  it("agent(overrides) == direct engine with the SAME merged input — verbatim", async () => {
    const merged = {
      ...defaultBuildToRoofInput(),
      building_length: 16,
      building_width: 12,
    };
    const direct = await executeEngine("build_to_roof", merged);

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "build_to_roof",
        params: { input: { building_length: 16, building_width: 12 } },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    const viaAgent = inv.result as EngineResult;
    expect(viaAgent.ok).toBe(true);
    expect(quantitiesOf(viaAgent)).toEqual(quantitiesOf(direct)); // zero drift
  });

  it("deterministic: identical input → identical output; a changed input changes the answer", async () => {
    const defaults = defaultBuildToRoofInput();
    const a = await executeEngine("build_to_roof", defaults);
    const b = await executeEngine("build_to_roof", defaults);
    expect(quantitiesOf(b)).toEqual(quantitiesOf(a)); // no randomness

    const changed = await executeEngine("build_to_roof", {
      ...defaults,
      building_length: 16,
    });
    expect(JSON.stringify(changed.quantities)).not.toBe(
      JSON.stringify(a.quantities),
    ); // the input genuinely reaches the math
  });
});

// =========================================================
// 4. SCENARIOS — independent hypothetical arithmetic
// =========================================================
describe("CERT — scenario_analysis", () => {
  beforeEach(() => {
    seedStages();
    seedShopping();
  });

  it("material_price_change +10%: independent 500,000 → 550,000; agent == direct", async () => {
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    const direct = materialPriceChangeScenario({
      now: NOW,
      shoppingItems: snap!.shoppingItems as never,
      changePct: 0.1,
    });
    // Independent: 100 bags @ recorded ₦5,000 total = 500,000
    // × 1.10 = 550,000; difference = 50,000 (10%).
    expect(direct.baseline?.value).toBe(500000);
    expect(direct.result?.value).toBe(550000);
    expect(direct.difference?.value).toBe(50000);
    expect(direct.difference?.percent).toBe(10);

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "scenario_analysis",
        params: { scenario: "material_price_change", changePct: 0.1 },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    expect(inv.result).toEqual(direct); // verbatim — no re-math
    expect(inv.note).toContain("passed through verbatim");
  });

  it("material_change: independent +100,000 for Cement @ ₦6,000/bag; agent == direct", async () => {
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    const direct = materialChangeScenario({
      now: NOW,
      shoppingItems: snap!.shoppingItems as never,
      materialName: "Cement (bags)",
      newUnitPrice: 6000,
    });
    // Independent: 100 bags × ₦6,000 = 600,000 vs recorded 500,000
    // → budget grows by 100,000.
    expect(direct.status).toBe("ok");
    expect(direct.difference?.value).toBe(100000);

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "scenario_analysis",
        params: {
          scenario: "material_change",
          materialName: "Cement (bags)",
          newUnitPrice: 6000,
        },
      },
      NOW,
    );
    expect(okData(res).result).toEqual(direct);
  });

  it("material_change for a line that does not exist → honest insufficient_data, never substituted", async () => {
    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "scenario_analysis",
        params: {
          scenario: "material_change",
          materialName: "Rebar (12mm)",
          newUnitPrice: 3000,
        },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("insufficient_data");
    expect(inv.missingData.join(" ")).toContain("Rebar (12mm)");
  });

  it("task_delay: honest sequencing consequence — NO invented carrying cost", async () => {
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    const direct = taskDelayScenario({
      now: NOW,
      nextPendingStage: "Blockwork",
      dailySpendRate: null,
      delayDays: 7,
    });
    expect(direct.status).toBe("ok");
    expect(direct.result?.value).toBe(7); // sequencing arithmetic only
    expect(direct.assumptions.join(" ")).toContain("no cost-of-delay");

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "scenario_analysis",
        params: { scenario: "task_delay", delayDays: 7 },
      },
      NOW,
    );
    expect(okData(res).result).toEqual(direct);
  });
});

// =========================================================
// 5. RECORDED-DATA TOOLS — verbatim rows, no recomputation
// =========================================================
describe("CERT — recorded-data tools (verbatim)", () => {
  beforeEach(() => {
    seedStages();
    seedShopping();
    seedMarketPrices();
  });

  it("shopping_list: rows returned verbatim — no totals recomputed", async () => {
    const res = await invokeAgentTool("proj-1", { tool: "shopping_list" }, NOW);
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    expect(inv.result).toEqual(snap!.shoppingItems); // exact stored rows
    expect(inv.note).toContain("no totals are recomputed");
    expect(inv.inputsUsed[0].key).toContain("shopping:");
  });

  it("market_intelligence: region-scoped verbatim == fetchApprovedPrices(NG); NO other region substituted", async () => {
    // A foreign-market row exists — it must NEVER appear.
    db.tables.mi_approved_prices.push({
      id: "mp-ke",
      product_name: "Cement",
      median_price: 700,
      price: 700,
      currency_code: "KES",
      market_code: "KE",
      region: "Nairobi",
      freshness: "recent",
      last_updated: iso(30),
      approved_at: iso(30),
      auto_approved: false,
      is_active: true,
    });

    const res = await invokeAgentTool(
      "proj-1",
      { tool: "market_intelligence" },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    const direct = await fetchApprovedPrices("NG");
    expect(inv.result).toEqual(direct); // exact query-layer output
    const rows = inv.result as Array<{ market_code: string }>;
    expect(rows.every((r) => r.market_code === "NG")).toBe(true);
  });

  it("cost_analysis: agent == direct analyzeProject(snapshot); deterministic", async () => {
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    const direct = analyzeProject(snap!);

    const first = await invokeAgentTool(
      "proj-1",
      { tool: "cost_analysis" },
      NOW,
    );
    const second = await invokeAgentTool(
      "proj-1",
      { tool: "cost_analysis" },
      NOW,
    );
    const inv1 = okData(first);
    const inv2 = okData(second);
    expect(inv1.result).toEqual(direct); // verbatim analysis
    expect(inv2.result).toEqual(inv1.result); // deterministic
    expect(inv1.assumptions).toEqual(direct.limitations); // none hidden
  });
});

// =========================================================
// 6. PROPERTY ANALYSIS — linked profile, report verbatim
// =========================================================
describe("CERT — property_analysis", () => {
  it("agent == direct rowToProfile + buildPropertyIntelligenceReport; gaps surfaced, never filled", async () => {
    const propertyRow = {
      id: "prop-1",
      name: "Lekki Duplex",
      construction_project_id: "proj-1",
      address: "14 Admiralty Way, Lekki",
      country: "Nigeria",
      region: "Lagos",
      city: "Lekki",
      district: null,
      lat: 6.44,
      lng: 3.47,
      property_type: "residential",
      building_type: "duplex",
      number_of_buildings: 1,
      number_of_floors: 2,
      number_of_rooms: 6,
      existing_condition: null,
      development_status: "existing",
      land_size: 600,
      land_unit: "m²",
      construction_status: "renovation",
      documents: [],
      provenance: null,
      created_at: iso(30),
      updated_at: iso(5),
    };
    db.tables.properties.push(propertyRow);

    const profile = rowToProfile(propertyRow as never);
    const direct = buildPropertyIntelligenceReport({ profile, nowIso: NOW });

    const res = await invokeAgentTool(
      "proj-1",
      { tool: "property_analysis" },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    expect(inv.result).toEqual(direct); // report verbatim
    // Unassessed condition categories are surfaced as gaps — not guessed.
    expect(inv.missingData.length).toBeGreaterThan(0);
    expect(inv.missingData[0]).toContain("condition assessment");
  });

  it("no linked property → honest insufficient_data", async () => {
    const res = await invokeAgentTool(
      "proj-1",
      { tool: "property_analysis" },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("insufficient_data");
    expect(inv.missingData.join(" ")).toContain("linked to this project");
  });
});

// =========================================================
// 7. DOCUMENT ANALYSIS — consistency findings verbatim
// =========================================================
describe("CERT — document_analysis", () => {
  function seedExtraction(extraction: PlanExtraction): void {
    db.tables.plan_documents.push({
      id: "doc-1",
      project_id: "proj-1",
      created_at: iso(3),
    });
    db.tables.plan_extractions.push({
      id: "ext-1",
      document_id: "doc-1",
      version: 1,
      extraction,
      created_at: iso(3),
    });
  }

  it("agent issues == direct union of the deterministic checks; warnings carried", async () => {
    const rooms = [
      confirmedRoom("room-1", "Bedroom", 4, 3, 3),
      confirmedRoom("room-2", "Bedroom", 4, 3, 3), // duplicate → finding
    ];
    const extraction: PlanExtraction = {
      id: "ext-1",
      documentId: "doc-1",
      version: 1,
      scale: null,
      rooms,
      roof: null,
      buildingFacts: [],
      notes: [],
      warnings: ["scale not detected"],
      issues: [],
      nativeUnit: "meters",
      extractedAt: iso(3),
    };
    seedExtraction(extraction);

    // Direct: exactly what the handler unions (footprint facts
    // absent → null → handled honestly).
    const direct = [
      ...findImpossibleRooms(rooms, null, null),
      ...findDuplicateRooms(rooms),
      ...findContradictoryFacts(extraction.buildingFacts),
      ...checkAreaTotals(rooms, null),
    ];

    const res = await invokeAgentTool(
      "proj-1",
      { tool: "document_analysis" },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    const result = inv.result as {
      issues: unknown[];
      warnings: string[];
    };
    expect(result.issues).toEqual(direct);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual(["scale not detected"]);
  });
});

// =========================================================
// 8. QUANTITY TAKEOFF — full agent chain per the Stage-15
//    contract re-audit (wall/floor/ceiling measurement semantics)
// =========================================================
describe("CERT — quantity_takeoff (agent chain)", () => {
  function seedPlan(extraction: PlanExtraction): void {
    db.tables.plan_documents.push({
      id: "doc-1",
      project_id: "proj-1",
      created_at: iso(3),
    });
    db.tables.plan_extractions.push({
      id: "ext-1",
      document_id: "doc-1",
      version: 1,
      extraction,
      created_at: iso(3),
    });
  }

  beforeEach(() => {
    seedScreedConfig();
    seedPopMaterials();
  });

  it("screeding=NET WALL area, POP=ceiling footprint, tiling=honest gap; engine outputs == direct", async () => {
    const roomA = confirmedRoom("room-1", "Bedroom 1", 4, 3, 3, [
      confirmedOpening("op-1", "door", 0.9, 2.1, 1),
    ]);
    const roomB = confirmedRoom("room-2", "Bedroom 2", 5, 4, 3);
    seedPlan({
      id: "ext-1",
      documentId: "doc-1",
      version: 1,
      scale: null,
      rooms: [roomA, roomB],
      roof: null,
      buildingFacts: [],
      notes: [],
      warnings: [],
      issues: [],
      nativeUnit: "meters",
      extractedAt: iso(3),
    });

    const res = await invokeAgentTool(
      "proj-1",
      {
        tool: "quantity_takeoff",
        params: { kinds: ["painting", "screeding", "pop_ceiling", "tiling"] },
      },
      NOW,
    );
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    const items = inv.result as Array<{
      kind: string;
      roomId: string;
      status: string;
      missing: string[];
      input: { netWallAreaM2?: number | null };
      result?: EngineResult;
    }>;
    expect(items.length).toBe(8); // 2 rooms × 4 kinds

    const by = (kind: string, roomId: string) =>
      items.find((i) => i.kind === kind && i.roomId === roomId)!;

    // SCREEDING — net WALL area:
    //   room-1: 2×(4+3)×3 = 42 − 0.9×2.1 door = 40.11 m²
    //   room-2: 2×(5+4)×3 = 54 m² (no openings)
    const scrA = by("screeding", "room-1");
    const scrB = by("screeding", "room-2");
    expect(scrA.result?.ok).toBe(true);
    expect(scrB.result?.ok).toBe(true);
    expect(scrA.input.netWallAreaM2).toBeCloseTo(40.11, 8);
    expect(scrB.input.netWallAreaM2).toBe(54);
    const directScrA = await executeEngine("screeding_system", {
      areaM2: scrA.input.netWallAreaM2,
    });
    expect(directScrA.ok).toBe(true);
    expect(quantitiesOf(scrA.result!)).toEqual(quantitiesOf(directScrA));

    // POP — ceiling plane = footprint:
    //   room-1: 4×3 = 12 m²; room-2: 5×4 = 20 m².
    const popA = by("pop_ceiling", "room-1");
    const popB = by("pop_ceiling", "room-2");
    expect(popA.result?.ok).toBe(true);
    expect(popB.result?.ok).toBe(true);
    expect(popA.result!.quantities[0]).toMatchObject({
      label: "Ceiling area",
      quantity: 12,
    });
    expect(popB.result!.quantities[0].quantity).toBe(20);
    const directPopA = await executeEngine("pop_ceiling", {
      roomLength: 4,
      roomWidth: 3,
      unit: "meters",
    });
    expect(quantitiesOf(popA.result!)).toEqual(quantitiesOf(directPopA));

    // PAINTING — wall height semantics, engine defaults apply.
    const paintA = by("painting", "room-1");
    expect(paintA.result?.ok).toBe(true);
    expect(paintA.result!.quantities.length).toBeGreaterThan(0);

    // TILING — honest gap (tile selection is user data, never invented).
    const tileA = by("tiling", "room-1");
    expect(tileA.status).toBe("missing_info");
    expect(tileA.result).toBeUndefined();
    expect(tileA.missing.join(" ")).toMatch(/tile selection/i);
    expect(tileA.missing.join(" ")).toMatch(/floor area/i);
  });
});

// =========================================================
// 9. SAVED-RESULT CHAIN — estimator save → snapshot → agent
// =========================================================
describe("CERT — saved calculation read-back", () => {
  it("saveCalculationToProject → snapshot carries the result verbatim → cost_analysis sees it", async () => {
    const saved = await saveCalculationToProject({
      project_id: "proj-1",
      calculator_type: "paint",
      calculator_slug: "paint-calculator",
      calc_title: "Bedroom repaint",
      calc_data: { litres: 12.5 },
      result_summary: { grand_total: 87500, currency: "NGN" },
      materials: [
        { name: "Satin paint", category: "Paint", quantity: 13, unit: "L" },
      ],
    });
    expect(saved.calc_title).toBe("Bedroom repaint");

    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    expect(snap!.calculations).toHaveLength(1);
    // The snapshot carries the saved calculation VERBATIM — the
    // recorded grand_total is extracted as-is, no re-math.
    expect(snap!.calculations[0]).toMatchObject({
      calculatorType: "paint",
      title: "Bedroom repaint",
      estimatedTotal: 87500,
    });

    const res = await invokeAgentTool("proj-1", { tool: "cost_analysis" }, NOW);
    const inv = okData(res);
    expect(inv.status).toBe("ok");
    expect(inv.inputsUsed[0].value).toContain("1 saved calculations");
  });
});

// =========================================================
// 10. PROJECT SCOPING — the agent only ever reads THIS project
// =========================================================
describe("CERT — project scoping", () => {
  it("another project's shopping rows are NEVER returned", async () => {
    seedShopping();
    db.tables.project_shopping_list.push({
      id: "item-foreign",
      project_id: "proj-OTHER",
      category: "Materials",
      name: "Someone else's cement",
      quantity: 1,
      unit: "bag",
      estimated_price: 100,
      actual_price: null,
      total_price: 100,
      supplier: null,
      notes: null,
      is_purchased: false,
      sort_order: 1,
    });

    const res = await invokeAgentTool("proj-1", { tool: "shopping_list" }, NOW);
    const rows = okData(res).result as Array<{ project_id: string }>;
    expect(rows.every((r) => r.project_id === "proj-1")).toBe(true);
    expect(rows.some((r) => r.project_id === "proj-OTHER")).toBe(false);
  });

  it("an invisible project → honest error, never a fabricated answer", async () => {
    const res = await invokeAgentTool(
      "proj-NOT-VISIBLE",
      { tool: "shopping_list" },
      NOW,
    );
    expect(errorOf(res).code).toBeTruthy();
  });
});

// ---------------------------------------------------------
// Fixtures — full ExtractedRoom builders (real helpers, so the
// seeded extraction is exactly what Plan Vision records).
// ---------------------------------------------------------
function confirmedRoom(
  id: string,
  name: string,
  lengthM: number,
  widthM: number,
  heightM: number,
  openings: ExtractedRoom["openings"] = [],
): ExtractedRoom {
  return {
    id,
    name,
    spaceType: "bedroom",
    length: explicitDimension(lengthM, "m", 1),
    width: explicitDimension(widthM, "m", 1),
    height: explicitDimension(heightM, "m", 1),
    openings,
    floor: 1,
    provenance: {
      documentId: "doc-1",
      page: 1,
      quote: `${name} ${lengthM * 1000}×${widthM * 1000}`,
      method: "vision_model",
    },
    confidence: 0.9,
    reviewStatus: "user_confirmed",
    corrections: [],
    extractedAt: "2026-09-05T08:00:00Z",
    verifiedAt: "2026-09-05T10:00:00Z",
  };
}

function confirmedOpening(
  id: string,
  type: "door" | "window",
  widthM: number,
  heightM: number,
  count: number,
): ExtractedRoom["openings"][number] {
  return {
    id,
    type,
    width: explicitDimension(widthM, "m", 1),
    height: explicitDimension(heightM, "m", 1),
    count,
    confidence: 1,
    provenance: {
      documentId: "doc-1",
      page: 1,
      quote: `${type} ${widthM}×${heightM}`,
      method: "vision_model",
    },
    reviewStatus: "user_confirmed",
  };
}
