// =========================================================
// PROJECT AGENT, STAGE 14: COMPLETE END-TO-END VALIDATION
//
// Full real-world workflows, each running the REAL module
// chain against an in-memory supabase backing store:
//
//   RECORDED PROJECT DATA
//     → project snapshot (real buildProjectSnapshot)
//     → deterministic analysis
//     → guidance / evidence
//     → recommendation
//     → prepared action
//     → user approval
//     → authoritative write
//     → verification
//     → audit history
//
// NOTHING in the agent chain is mocked here except supabase
// itself (in-memory rows). The plan-vision persistence module is
// real too (plan_documents/plan_extractions tables, empty).
//
// Scenarios (per the Stage-14 plan):
//   A, new project: create → location → building info →
//        analyze → identify missing info → calculate → save.
//   B, existing project: load → status → detect changes →
//        identify risk → prepare → approve → execute → verify →
//        history (and idempotent re-execute).
//   C, cost change: verified material price change →
//        recalculate → explain cause → updated analysis.
//   D, schedule risk: progress change → schedule variance →
//        risk → recommended next action → executed.
//   E, failure: network/tool failure during execution →
//        graceful failure → retry → no duplicate execution.
//   F, unauthorized action: prohibited attempts are blocked.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";

const NOW = "2026-09-08T12:00:00.000Z";
const DAY_MS = 86_400_000;
const iso = (daysAgo: number) =>
  new Date(new Date(NOW).getTime() - daysAgo * DAY_MS).toISOString();

// ---------------------------------------------------------
// In-memory supabase, every table the REAL chain touches.
// fail.perTable / fail.all simulate outages.
// ---------------------------------------------------------
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
];

const db: {
  tables: Record<string, Row[]>;
  writes: Array<{ table: string; op: string }>;
  fail: { all: boolean; perTable: Set<string> };
} = {
  tables: Object.fromEntries(ALL_TABLES.map((t) => [t, [] as Row[]])),
  writes: [],
  fail: { all: false, perTable: new Set<string>() },
};

function resetDb() {
  ALL_TABLES.forEach((t) => {
    db.tables[t] = [];
  });
  db.writes = [];
  db.fail = { all: false, perTable: new Set<string>() };
}

function writeShouldFail(table: string): boolean {
  return db.fail.all || db.fail.perTable.has(table);
}

function rowOf(table: string, id: string): Row {
  return db.tables[table].find((r) => r.id === id) ?? {};
}

vi.mock("@/lib/supabase", () => {
  const NET_ERR = { message: "network unavailable (simulated outage)" };

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
        // Awaitable chain (supabase builders are thenable).
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
      insert: async (row: Row | Row[]) => {
        if (writeShouldFail(table))
          return { error: NET_ERR, data: null, count: null };
        const items = Array.isArray(row) ? row : [row];
        rows().push(
          ...items.map((r) => ({
            // Real DB default: created_at now() when absent.
            ...(r.created_at === undefined
              ? { created_at: new Date().toISOString() }
              : {}),
            ...r,
          })),
        );
        db.writes.push({ table, op: "insert" });
        return { error: null, data: null, count: null };
      },
      upsert: async (data: Row, opts?: { onConflict?: string }) => {
        if (writeShouldFail(table))
          return { error: NET_ERR, data: null, count: null };
        db.writes.push({ table, op: "upsert" });
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
            if (writeShouldFail(table))
              return resolve({ error: NET_ERR, data: null, count: null });
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
            if (writeShouldFail(table)) {
              return Promise.resolve({ data: null, error: NET_ERR });
            }
            rows().forEach((r) => {
              if (eqs.every(([k, v]) => r[k] === v)) {
                Object.assign(r, data);
                affected = { ...r };
              }
            });
            if (affected) db.writes.push({ table, op: "update" });
            return Promise.resolve({
              data: affected ? { ...affected } : null,
              error: null,
            });
          },
          then: (resolve: (v: unknown) => unknown) => {
            if (writeShouldFail(table)) {
              return resolve({ data: null, error: NET_ERR, count: null });
            }
            rows().forEach((r) => {
              if (eqs.every(([k, v]) => r[k] === v)) {
                Object.assign(r, data);
                affected = { ...r };
              }
            });
            if (affected) db.writes.push({ table, op: "update" });
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
// Entry points under test, the REAL agent chain.
// ---------------------------------------------------------
import { invokeAgentTool } from "./tools";
import { buildProjectAgentContext } from "./context";
import { buildGuidance } from "./guidance";
import { buildRecommendations } from "./recommendations";
import {
  prepareAction,
  requestApproval,
  decideApproval,
  type PrepareActionRequest,
} from "./actions";
import { executeApprovedAction } from "./execute";
import { detectProjectChanges } from "./changes";
import { getProjectStory } from "./audit";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type { AgentResult, AgentError } from "./types";

// AgentResult is a discriminated union, vitest's expect() cannot
// narrow it, so these helpers do (and fail loudly mid-test).
function data<T>(r: AgentResult<T>): T {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error.message}`);
  return r.data;
}
function errorOf<T>(r: AgentResult<T>): AgentError {
  if (r.ok) throw new Error("expected error, got ok");
  return r.error;
}

// ---------------------------------------------------------
// Seeds, realistic recorded state for one project.
// ---------------------------------------------------------
function seedProjectRow(id: string, withLocation = true): void {
  const row: Row = {
    id,
    name: "Duplex A",
    status: "in_progress",
    created_at: iso(60),
    updated_at: iso(1),
    progress_percentage: 40,
  };
  if (withLocation) row.location = { country_code: "NG", city: "Lagos" };
  db.tables.contractor_projects.push(row);
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
    {
      id: "stage-3",
      project_id: "proj-1",
      stage_key: "roofing",
      stage_name: "Roofing",
      sort_order: 3,
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
    actual_price: 6500,
    total_price: 500000,
    supplier: "Depot Ltd",
    notes: null,
    is_purchased: false,
    sort_order: 1,
  });
}

function seedMaterials(): void {
  db.tables.material_catalog.push({
    id: "mat-cement",
    name: "Cement",
    category: "Materials",
    unit: "bag",
    current_price: 5000,
    previous_price: 4800,
    price_updated_at: iso(10),
    price_source: "admin:verified",
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

/** Fully-seeded in-progress project with procurement + market risk. */
function seedRichProject(): void {
  seedProjectRow("proj-1");
  seedStages();
  seedShopping();
  seedMaterials();
  seedMarketPrices();
}

/** The full prepare → approve → execute loop. */
async function prepareApproveExecute(
  projectId: string,
  request: PrepareActionRequest,
): Promise<{
  executed: Awaited<ReturnType<typeof executeApprovedAction>>;
  actionId: string;
}> {
  const prep = await prepareAction(projectId, request, NOW);
  if (!prep.ok) throw new Error(`prepare failed: ${errorOf(prep).message}`);
  const actionId = data(prep).action.id;
  const req = await requestApproval(projectId, actionId, NOW);
  if (!req.ok)
    throw new Error(`approval request failed: ${errorOf(req).message}`);
  const dec = await decideApproval(projectId, data(req).id, "approved", NOW);
  if (!dec.ok) throw new Error(`approve failed: ${errorOf(dec).message}`);
  const exec = await executeApprovedAction(projectId, actionId, NOW);
  return { executed: exec, actionId };
}

beforeEach(() => {
  resetDb();
});

// =========================================================
// SCENARIO A, NEW PROJECT
// =========================================================
describe("Scenario A, new project workflow", () => {
  it("create → location → building info → analyze → missing info → calculate → save", async () => {
    // 1. Create project (recorded by the app).
    seedProjectRow("proj-new", false);

    // 2. Provide location, recorded on the project.
    rowOf("contractor_projects", "proj-new").location = {
      country_code: "NG",
      city: "Lagos",
    };

    // 3. Add building information, stage + shopping rows.
    db.tables.project_progress_stages.push({
      id: "ns-1",
      project_id: "proj-new",
      stage_key: "foundation",
      stage_name: "Foundation",
      sort_order: 1,
      is_completed: false,
      completed_at: null,
      photo_url: null,
      notes: null,
      updated_at: iso(0),
    });
    db.tables.project_shopping_list.push({
      id: "ni-1",
      project_id: "proj-new",
      category: "Materials",
      name: "Cement (bags)",
      quantity: 200,
      unit: "bag",
      estimated_price: 5000,
      actual_price: null,
      total_price: 1000000,
      supplier: null,
      notes: null,
      is_purchased: false,
      sort_order: 1,
    });

    // 4. Analyze, the real snapshot + context chain runs.
    const snap = await buildProjectSnapshot("proj-new", { now: NOW });
    expect(snap).not.toBeNull();
    expect(snap?.shoppingItems.length).toBe(1);
    expect(snap?.region.marketCode).toBe("NG");

    const context = await buildProjectAgentContext("proj-new", NOW);
    expect(context.ok).toBe(true);

    // 5. Identify missing information, honest, never invented.
    const guidance = await buildGuidance("proj-new", "missing_info", NOW);
    expect(guidance.ok).toBe(true);
    const text = JSON.stringify(data(guidance)).toLowerCase();
    expect(text).toMatch(/market|price|information/);
    // No market prices recorded for NG yet → reported as missing,
    // never substituted from another region.
    expect(text).not.toMatch(/ghana|kenya|united kingdom/);

    // 6. Calculate, deterministic engine via the tool surface.
    const calc = await invokeAgentTool(
      "proj-new",
      {
        tool: "project_timeline",
        params: { scope: { foundation: 200, blockwork: 350 } },
      },
      NOW,
    );
    expect(calc.ok).toBe(true);
    expect(data(calc).status).toBe("ok");
    expect(
      (data(calc).result as Record<string, unknown>).totalEstimatedDays,
    ).toBeTruthy();

    // 7. Save, the app records the calculation; snapshot reflects it.
    db.tables.project_calculations.push({
      id: "calc-1",
      project_id: "proj-new",
      calculator_type: "project_timeline",
      calc_title: "Timeline, duplex foundation",
      created_at: iso(0),
      result_summary: { totalEstimatedDays: 18 },
    });
    const snap2 = await buildProjectSnapshot("proj-new", { now: NOW });
    expect(snap2?.calculations.length).toBe(1);
  });
});

// =========================================================
// SCENARIO B, EXISTING PROJECT: THE FULL AGENT LOOP
// =========================================================
describe("Scenario B, existing project full workflow", () => {
  it("load → status → detect changes → risk → prepare → approve → execute → verify → history", async () => {
    seedRichProject();

    // 1–2. Load the project and inspect its status.
    const context = await buildProjectAgentContext("proj-1", NOW);
    expect(context.ok).toBe(true);
    expect(data(context).projectId).toBe("proj-1");
    expect(data(context).items.length).toBeGreaterThan(0);

    const whatNext = await buildGuidance("proj-1", "what_next", NOW);
    expect(whatNext.ok).toBe(true);
    expect(data(whatNext).items.length).toBeGreaterThan(0);

    // 3. Detect changes, first capture stores the baseline.
    const detect1 = await detectProjectChanges("proj-1", NOW);
    expect(detect1.ok).toBe(true);
    expect(data(detect1).status).toBe("first_capture");
    expect(data(detect1).changes.length).toBe(0);

    // 4. Identify risk, a procurement_risk recommendation exists,
    //    grounded in the recorded price increase.
    const recs = await buildRecommendations("proj-1", NOW);
    expect(recs.ok).toBe(true);
    const procRec = data(recs).recommendations.find(
      (r) => r.condition === "procurement_risk",
    );
    expect(procRec).toBeDefined();
    const procEvidence = procRec?.evidence.join(" ") ?? "";
    expect(procEvidence).toMatch(/Cement/);
    expect(procRec?.recommendation).toMatch(
      /Cement \(bags\) is 30% above its recorded estimate/,
    );

    // 5–7. Prepare → approve → execute the grounded action.
    const { executed, actionId } = await prepareApproveExecute("proj-1", {
      kind: "record_purchase",
      recommendationId: procRec!.id,
      params: { shoppingItemId: "item-cement", actualPrice: 6500 },
      idempotencyKey: "e2e-b-1",
    });
    expect(executed.ok).toBe(true);
    expect(data(executed).duplicate).toBe(false);

    // 8. Verify, the write actually stuck in the backing store.
    const item = rowOf("project_shopping_list", "item-cement");
    expect(item.is_purchased).toBe(true);
    expect(item.actual_price).toBe(6500);

    // Change detection now SEES the purchase against the baseline.
    const detect2 = await detectProjectChanges("proj-1", NOW);
    expect(detect2.ok).toBe(true);
    expect(data(detect2).status).toBe("ok");
    expect(data(detect2).changes.length).toBeGreaterThan(0);

    // The recorded state feeding the analysis changed, the line
    // is now recorded as purchased, not an open exposure.
    const recs2 = await buildRecommendations("proj-1", NOW);
    const procAfter = data(recs2).recommendations.find(
      (r) => r.condition === "procurement_risk",
    );
    const evidenceAfter = procAfter?.evidence.join(" ") ?? "";
    expect(evidenceAfter).toMatch(/Cement \(bags\), purchased/);
    expect(evidenceAfter).not.toMatch(/not yet purchased/);

    // 9. History, the audit story records the execution.
    const story = await getProjectStory("proj-1", NOW);
    expect(story.ok).toBe(true);
    const storyText = JSON.stringify(data(story));
    expect(storyText).toMatch(new RegExp(actionId));
    expect(storyText).toMatch(/executed|verified/);

    // 10. Re-execute is idempotent, no duplicate write.
    const writesBefore = db.writes.filter(
      (w) => w.table === "project_shopping_list",
    ).length;
    const again = await executeApprovedAction("proj-1", actionId, NOW);
    expect(again.ok).toBe(true);
    expect((data(again) as { duplicate: boolean }).duplicate).toBe(true);
    expect(
      db.writes.filter((w) => w.table === "project_shopping_list").length,
    ).toBe(writesBefore);
  });
});

// =========================================================
// SCENARIO C, COST CHANGE
// =========================================================
describe("Scenario C, cost change workflow", () => {
  it("verified material price change → recalculate → explain cause → updated analysis", async () => {
    seedRichProject();

    // The stale-market recommendation grounds a price update.
    const recs = await buildRecommendations("proj-1", NOW);
    const staleRec = data(recs).recommendations.find(
      (r) => r.condition === "stale_market_data",
    );
    expect(staleRec).toBeDefined();

    // Change the verified material price through the agent loop.
    const { executed } = await prepareApproveExecute("proj-1", {
      kind: "update_material_price",
      recommendationId: staleRec!.id,
      params: {
        materialId: "mat-cement",
        newPrice: 6500,
        source: "user:market check",
      },
      idempotencyKey: "e2e-c-1",
    });
    expect(executed.ok).toBe(true);
    expect(data(executed).duplicate).toBe(false);

    // The catalog write stuck; provenance recorded.
    const mat = rowOf("material_catalog", "mat-cement");
    expect(mat.current_price).toBe(6500);
    expect(mat.previous_price).toBe(5000);
    expect(String(mat.price_source)).toMatch(/user:market check/);

    // An audit-trail price-history row was written.
    const hist = db.tables.material_price_history.find(
      (r) => r.material_id === "mat-cement",
    );
    expect(hist).toBeDefined();
    expect(hist?.old_price).toBe(5000);
    expect(hist?.new_price).toBe(6500);

    // Recalculate + explain the cause: the budget-risk guidance
    // reports the recorded price change as evidence.
    const guidance = await buildGuidance("proj-1", "budget_risk", NOW);
    expect(guidance.ok).toBe(true);
    const text = JSON.stringify(data(guidance));
    expect(text).toMatch(/price|cost/i);

    // Updated project analysis: the snapshot's real price history
    // now reflects the change the agent executed.
    const snap = await buildProjectSnapshot("proj-1", { now: NOW });
    expect(snap).not.toBeNull();
    const histInSnap = (snap as PredictiveProjectSnapshot).priceHistory.find(
      (p) => p.materialName === "Cement",
    );
    expect(histInSnap?.newPrice).toBe(6500);
  });
});

// =========================================================
// SCENARIO D, SCHEDULE RISK
// =========================================================
describe("Scenario D, schedule risk workflow", () => {
  it("progress change → schedule variance → risk → recommended next action → executed", async () => {
    seedRichProject();

    // Change project progress, the last stage completion was
    // recorded 40 days ago (a real stall).
    const project = rowOf("contractor_projects", "proj-1");
    project.updated_at = iso(40);

    // Detect the schedule variance.
    const guidance = await buildGuidance("proj-1", "schedule", NOW);
    expect(guidance.ok).toBe(true);
    const schedText = JSON.stringify(data(guidance)).toLowerCase();
    expect(schedText).toMatch(/stall|40 day|schedule/);

    // Identify the risk as a recommendation with a next action.
    const recs = await buildRecommendations("proj-1", NOW);
    const schedRec = data(recs).recommendations.find(
      (r) => r.condition === "schedule_risk",
    );
    expect(schedRec).toBeDefined();
    expect(schedRec?.nextStep.length ?? 0).toBeGreaterThan(0);

    // The recommended next action (record the pending stage) is
    // prepareable and executes through the full loop.
    const { executed } = await prepareApproveExecute("proj-1", {
      kind: "confirm_stage_completion",
      recommendationId: schedRec!.id,
      params: { stageId: "stage-2" },
      idempotencyKey: "e2e-d-1",
    });
    expect(executed.ok).toBe(true);

    // The stage write stuck with a completion timestamp.
    const stage = rowOf("project_progress_stages", "stage-2");
    expect(stage.is_completed).toBe(true);
    expect(stage.completed_at).toBeTruthy();

    // Re-analysis: the stall is resolved, fresh completion date.
    const recs2 = await buildRecommendations("proj-1", NOW);
    expect(
      data(recs2).recommendations.find((r) => r.condition === "schedule_risk"),
    ).toBeUndefined();
  });
});

// =========================================================
// SCENARIO E, FAILURE & RETRY
// =========================================================
describe("Scenario E, graceful failure, retry, no duplicate execution", () => {
  it("partial outage: write fails, action is marked failed, retry via a NEW preparation executes exactly once", async () => {
    seedRichProject();
    const recs = await buildRecommendations("proj-1", NOW);
    const procRec = data(recs).recommendations.find(
      (r) => r.condition === "procurement_risk",
    );
    expect(procRec).toBeDefined();

    const prep = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: procRec!.id,
        params: { shoppingItemId: "item-cement", actualPrice: 6500 },
        idempotencyKey: "e2e-e-1",
      },
      NOW,
    );
    expect(prep.ok).toBe(true);
    const req = await requestApproval("proj-1", data(prep).action.id, NOW);
    expect(req.ok).toBe(true);
    const dec = await decideApproval("proj-1", data(req).id, "approved", NOW);
    expect(dec.ok).toBe(true);

    // Network fails for the authoritative write only.
    db.fail.perTable.add("project_shopping_list");
    const failed = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(failed.ok).toBe(false);
    expect(errorOf(failed).message).toMatch(/network unavailable/);

    // Graceful: no partial write on the shopping item.
    const item = rowOf("project_shopping_list", "item-cement");
    expect(item.is_purchased).toBe(false);

    // The action was honestly marked failed.
    const action = rowOf("project_agent_actions", data(prep).action.id);
    expect(action.state).toBe("failed");

    // Restore the network. Retrying the FAILED action is refused.
    db.fail.perTable.delete("project_shopping_list");
    const retryOld = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(retryOld.ok).toBe(false);

    // The user prepares a NEW action against fresh state.
    const recs2 = await buildRecommendations("proj-1", NOW);
    const procRec2 = data(recs2).recommendations.find(
      (r) => r.condition === "procurement_risk",
    );
    expect(procRec2).toBeDefined();
    const { executed } = await prepareApproveExecute("proj-1", {
      kind: "record_purchase",
      recommendationId: procRec2!.id,
      params: { shoppingItemId: "item-cement", actualPrice: 6500 },
      idempotencyKey: "e2e-e-2",
    });
    expect(executed.ok).toBe(true);

    // Exactly ONE authoritative purchase write happened overall.
    const purchaseWrites = db.writes.filter(
      (w) => w.table === "project_shopping_list" && w.op === "update",
    ).length;
    expect(purchaseWrites).toBe(1);
    expect(rowOf("project_shopping_list", "item-cement").is_purchased).toBe(
      true,
    );
  });

  it("total outage: nothing is written; retry after recovery executes once", async () => {
    seedRichProject();
    const recs = await buildRecommendations("proj-1", NOW);
    const procRec = data(recs).recommendations.find(
      (r) => r.condition === "procurement_risk",
    )!;

    const prep = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: procRec.id,
        params: { shoppingItemId: "item-cement", actualPrice: 6500 },
        idempotencyKey: "e2e-e-3",
      },
      NOW,
    );
    const req = await requestApproval("proj-1", data(prep).action.id, NOW);
    expect(req.ok).toBe(true);
    await decideApproval("proj-1", data(req).id, "approved", NOW);

    // Total outage: every write path fails.
    db.fail.all = true;
    const failed = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(failed.ok).toBe(false);
    expect(rowOf("project_shopping_list", "item-cement").is_purchased).toBe(
      false,
    );

    // Recovery: the same approved action executes cleanly.
    db.fail.all = false;
    const exec = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(exec.ok).toBe(true);
    expect(rowOf("project_shopping_list", "item-cement").is_purchased).toBe(
      true,
    );

    // Re-execution after recovery is a duplicate, no second write.
    const again = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(again.ok).toBe(true);
    expect((data(again) as { duplicate: boolean }).duplicate).toBe(true);
    expect(
      db.writes.filter(
        (w) => w.table === "project_shopping_list" && w.op === "update",
      ).length,
    ).toBe(1);
  });
});

// =========================================================
// SCENARIO F, UNAUTHORIZED ACTIONS
// =========================================================
describe("Scenario F, prohibited actions are blocked", () => {
  it("blocks execution without approval, kind mismatch, ghost projects, double decisions and ghost actions", async () => {
    seedRichProject();
    const recs = await buildRecommendations("proj-1", NOW);
    const procRec = data(recs).recommendations.find(
      (r) => r.condition === "procurement_risk",
    )!;
    const staleRec = data(recs).recommendations.find(
      (r) => r.condition === "stale_market_data",
    )!;

    // 1. Execute a prepared (but unapproved) action → refused.
    const prep = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: procRec.id,
        params: { shoppingItemId: "item-cement", actualPrice: 6500 },
        idempotencyKey: "e2e-f-1",
      },
      NOW,
    );
    expect(prep.ok).toBe(true);
    const tooEarly = await executeApprovedAction(
      "proj-1",
      data(prep).action.id,
      NOW,
    );
    expect(tooEarly.ok).toBe(false);
    expect(errorOf(tooEarly).code).toBe("invalid_state");

    // 2. Kind mismatch, a purchase grounded by market-data advice.
    const mismatch = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: staleRec.id,
        params: { shoppingItemId: "item-cement", actualPrice: 6500 },
        idempotencyKey: "e2e-f-2",
      },
      NOW,
    );
    expect(mismatch.ok).toBe(false);
    expect(errorOf(mismatch).code).toBe("kind_mismatch");

    // 3. Ghost project, invisible to this user → refused.
    const ghostRecs = await buildRecommendations("proj-ghost", NOW);
    expect(ghostRecs.ok).toBe(false);

    // 4. Approve, then decide again → refused (already decided).
    const req = await requestApproval("proj-1", data(prep).action.id, NOW);
    expect(req.ok).toBe(true);
    const dec = await decideApproval("proj-1", data(req).id, "approved", NOW);
    expect(dec.ok).toBe(true);
    const reDecide = await decideApproval(
      "proj-1",
      data(req).id,
      "rejected",
      NOW,
    );
    expect(reDecide.ok).toBe(false);

    // 5. Ghost action id → not found, nothing executed.
    const ghost = await executeApprovedAction("proj-1", "action-ghost", NOW);
    expect(ghost.ok).toBe(false);
    expect(errorOf(ghost).code).toBe("not_found");

    // 6. A REJECTED approval never executes.
    const prep2 = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: procRec.id,
        params: { shoppingItemId: "item-cement", actualPrice: 6500 },
        idempotencyKey: "e2e-f-3",
      },
      NOW,
    );
    const req2 = await requestApproval("proj-1", data(prep2).action.id, NOW);
    expect(req2.ok).toBe(true);
    const rej = await decideApproval("proj-1", data(req2).id, "rejected", NOW);
    expect(rej.ok).toBe(true);
    const execRejected = await executeApprovedAction(
      "proj-1",
      data(prep2).action.id,
      NOW,
    );
    expect(execRejected.ok).toBe(false);
    expect(rowOf("project_shopping_list", "item-cement").is_purchased).toBe(
      false,
    );
  });
});
