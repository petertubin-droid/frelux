// =========================================================
// PROJECT AGENT — PREPARED ACTIONS TESTS (Stage 6)
//
// Stage 6 acceptance:
//   - The agent PREPARES actions without committing them:
//     what / why / data used / assumptions / expected result are
//     all derived, never invented.
//   - A prepared action is GROUNDED in a recommendation that is
//     re-derived fresh — stale state means refusal, not a guess.
//   - Params are validated against recorded state; changed
//     state (already purchased / completed) means refusal.
//   - Approve / Edit / Reject / Cancel ride the Stage-1 state
//     machine; decisions are final; approvals expire (terminal).
//   - Idempotency: duplicate submissions collapse.
//   - NOTHING writes project data — approving is not executing.
//     The only writes are to the agent's own tables.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRecommendation } from "./recommendations";
import type { PreparedAction } from "./types";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";

const NOW = "2026-09-07T12:00:00.000Z";
// 16 minutes later — past the 15-minute approval window.
const AFTER_TTL = "2026-09-07T12:16:00.000Z";

// ---------------------------------------------------------
// In-memory supabase — agent tables, material catalog, and a
// project table that MUST never receive a write.
// ---------------------------------------------------------
type Row = Record<string, unknown>;

const db: {
  tables: Record<string, Row[]>;
  writes: Array<{ table: string; op: string }>;
  activity: Array<{ kind: string; summary: string }>;
  visible: boolean;
} = {
  tables: {
    project_agent_actions: [],
    project_agent_approvals: [],
    material_catalog: [],
    // A project data table — Stage 6 must NEVER write here.
    project_shopping_list: [],
  },
  writes: [],
  activity: [],
  visible: true,
};

function resetDb() {
  db.tables.project_agent_actions = [];
  db.tables.project_agent_approvals = [];
  db.tables.material_catalog = [
    { id: "mat1", name: "Cement (50kg)", current_price: 5500 },
  ];
  db.tables.project_shopping_list = [];
  db.writes = [];
  db.activity = [];
  db.visible = true;
}

vi.mock("@/lib/supabase", () => {
  /** Minimal chain engine: select/eq/order/maybeSingle,
   *  insert, update — exactly the shapes actions.ts uses. */
  function from(table: string) {
    const rows = () => db.tables[table] ?? [];

    const collector = () => {
      const eqs: Array<[string, unknown]> = [];
      const c: Record<string, unknown> = {
        select: () => c,
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return c;
        },
        order: () => ({
          data: rows().filter((r) => eqs.every(([k, v]) => r[k] === v)),
          error: null,
        }),
        maybeSingle: async () => ({
          data:
            rows().find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null,
          error: null,
        }),
      };
      return c;
    };

    return {
      ...collector(),
      insert: async (row: Row) => {
        db.writes.push({ table, op: "insert" });
        rows().push({ ...row });
        return { error: null };
      },
      update: (data: Row) => {
        db.writes.push({ table, op: "update" });
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            rows().forEach((r) => {
              if (r[col] === val) Object.assign(r, data);
            });
            return c;
          },
          select: () => ({
            maybeSingle: async () => ({
              data:
                rows().find(
                  (r) =>
                    Object.entries(data).every(([k, v]) => r[k] === v),
                ) ?? null,
              error: null,
            }),
          }),
        };
        return c;
      },
    };
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

// ---------------------------------------------------------
// Module mocks — session, recommendations, snapshot
// ---------------------------------------------------------
vi.mock("./session", () => ({
  assertProjectVisible: vi.fn(async () =>
    db.visible
      ? { ok: true as const, data: true as const }
      : {
          ok: false as const,
          error: {
            code: "project_not_found" as const,
            message: "Project not found or not visible to this account.",
          },
        },
  ),
  recordActivity: vi.fn(
    async (
      _projectId: string,
      entry: { kind: string; summary: string },
    ) => {
      db.activity.push({ kind: entry.kind, summary: entry.summary });
      return { ok: true as const, data: null };
    },
  ),
}));

// Fresh recommendation report — controllable per test.
const reportState: {
  recommendations: AgentRecommendation[];
} = {
  recommendations: [],
};

function rec(
  id: string,
  condition: AgentRecommendation["condition"],
): AgentRecommendation {
  return {
    id,
    condition,
    recommendation: `Grounded recommendation ${id}`,
    evidence: [`evidence for ${id}`],
    affectedElement: "budget",
    severity: "medium",
    confidence: null,
    assumptions: [`assumption of ${id}`],
    dataFreshness: "current" as AgentRecommendation["dataFreshness"],
    freshnessBasis: NOW,
    nextStep: `Next step for ${id}`,
    source: `engine:${id}`,
  };
}

vi.mock("./recommendations", () => ({
  buildRecommendations: vi.fn(async () => ({
    ok: true as const,
    data: {
      projectId: "proj-1",
      generatedAt: NOW,
      status: "ok" as const,
      recommendations: reportState.recommendations,
      insufficientData: [],
      summary: "",
    },
  })),
}));

// Fresh recorded snapshot — controllable per test.
const snapState: { snap: PredictiveProjectSnapshot | null } = {
  snap: null,
};

function baseSnapshot(): PredictiveProjectSnapshot {
  return {
    projectId: "proj-1",
    now: NOW,
    project: {
      name: "Duplex A",
      status: "in_progress",
      createdAt: NOW,
      updatedAt: NOW,
      progressPercentage: 40,
    },
    stages: [
      {
        id: "st1",
        stageKey: "foundation",
        stageName: "Foundation",
        sortOrder: 1,
        isCompleted: true,
        completedAt: NOW,
        hasPhoto: false,
        updatedAt: NOW,
      },
      {
        id: "st2",
        stageKey: "block",
        stageName: "Block work",
        sortOrder: 2,
        isCompleted: false,
        completedAt: null,
        hasPhoto: false,
        updatedAt: NOW,
      },
    ],
    shoppingItems: [
      {
        id: "s1",
        project_id: "proj-1",
        category: "materials",
        name: "Cement",
        quantity: 10,
        unit: "bags",
        estimated_price: 5500,
        actual_price: null,
        total_price: 55000,
        supplier: null,
        notes: null,
        is_purchased: false,
        sort_order: 1,
      },
      {
        id: "s2",
        project_id: "proj-1",
        category: "materials",
        name: "Sand",
        quantity: 2,
        unit: "trips",
        estimated_price: 12000,
        actual_price: 12000,
        total_price: 24000,
        supplier: null,
        notes: null,
        is_purchased: true,
        sort_order: 2,
      },
    ],
    calculations: [],
    priceHistory: [],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
  };
}

vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(async () => snapState.snap),
}));

// Import AFTER mocks.
import {
  prepareAction,
  requestApproval,
  decideApproval,
  cancelAction,
  amendPreparedAction,
  listPreparedActions,
  describePreparedAction,
  availableDecisions,
} from "./actions";

beforeEach(() => {
  resetDb();
  snapState.snap = baseSnapshot();
  reportState.recommendations = [
    rec("rec-buy", "procurement_risk"),
    rec("rec-stage", "incomplete_task"),
    rec("rec-price", "stale_market_data"),
    rec("rec-budget", "budget_risk"),
  ];
});

// ---------------------------------------------------------
// prepareAction — grounding, validation, idempotency
// ---------------------------------------------------------

describe("prepareAction — record_purchase", () => {
  it("prepares WITHOUT committing: derived display, prepared state", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-buy",
        params: { shoppingItemId: "s1", actualPrice: 5600 },
        idempotencyKey: "buy-s1",
      },
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const a = res.data.action;
    expect(a.state).toBe("prepared");
    expect(a.permission).toBe("confirm");
    expect(a.approvalRequired).toBe(true);
    expect(a.what).toContain("Cement");
    expect(a.what).toContain("5600");
    expect(a.what).toContain("purchased");
    expect(a.why).toBe("Grounded recommendation rec-buy");
    expect(a.dataUsed).toContain("recommendation:rec-buy");
    expect(a.dataUsed).toContain("shopping_item:s1");
    expect(a.assumptions).toContain("assumption of rec-buy");
    expect(a.expectedResult).toContain("recorded as purchased");
    expect(res.data.duplicate).toBe(false);
    // Preparation was logged — nothing was committed.
    expect(db.activity.some((e) => e.kind === "preparation")).toBe(true);
    expect(
      db.writes.some((w) => w.table === "project_shopping_list"),
    ).toBe(false);
  });

  it("collapses duplicate submissions (same idempotency key)", async () => {
    const req = {
      kind: "record_purchase" as const,
      recommendationId: "rec-buy",
      params: { shoppingItemId: "s1", actualPrice: 5600 },
      idempotencyKey: "buy-s1",
    };
    const first = await prepareAction("proj-1", req, NOW);
    const second = await prepareAction("proj-1", req, NOW);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.data.duplicate).toBe(true);
    expect(second.data.action.id).toBe(first.data.action.id);
    expect(db.tables.project_agent_actions).toHaveLength(1);
  });

  it("refuses when the recommendation no longer exists in fresh state", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-gone",
        params: { shoppingItemId: "s1" },
        idempotencyKey: "buy-gone",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("recommendation_not_found");
  });

  it("refuses a kind the recommendation does not support", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-budget",
        params: { shoppingItemId: "s1" },
        idempotencyKey: "buy-budget",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("kind_mismatch");
  });

  it("refuses items not in the recorded shopping list", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-buy",
        params: { shoppingItemId: "unknown" },
        idempotencyKey: "buy-unknown",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("invalid_params");
  });

  it("refuses items already recorded as purchased (state changed)", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-buy",
        params: { shoppingItemId: "s2" },
        idempotencyKey: "buy-s2",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message).toContain("already recorded as purchased");
  });

  it("refuses a non-positive actual price", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-buy",
        params: { shoppingItemId: "s1", actualPrice: 0 },
        idempotencyKey: "buy-zero",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("invalid_params");
  });
});

describe("prepareAction — confirm_stage_completion", () => {
  it("prepares a pending stage for completion", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "confirm_stage_completion",
        recommendationId: "rec-stage",
        params: { stageId: "st2" },
        idempotencyKey: "stage-st2",
      },
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.action.what).toContain("Block work");
    expect(res.data.action.state).toBe("prepared");
  });

  it("refuses a stage already recorded as completed", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "confirm_stage_completion",
        recommendationId: "rec-stage",
        params: { stageId: "st1" },
        idempotencyKey: "stage-st1",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message).toContain("already recorded as completed");
  });
});

describe("prepareAction — update_material_price", () => {
  it("prepares a price update with old and new price traceable", async () => {
    const res = await prepareAction(
      "proj-1",
      {
        kind: "update_material_price",
        recommendationId: "rec-price",
        params: { materialId: "mat1", newPrice: 6000, source: "user:market check" },
        idempotencyKey: "price-mat1",
      },
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.action.what).toContain("Cement (50kg)");
    expect(res.data.action.what).toContain("6000");
    expect(res.data.action.expectedResult).toContain("from 5500");
    expect(res.data.action.dataUsed).toContain("material:mat1");
  });

  it("refuses an unknown material and a bad price", async () => {
    const unknown = await prepareAction(
      "proj-1",
      {
        kind: "update_material_price",
        recommendationId: "rec-price",
        params: { materialId: "nope", newPrice: 10 },
        idempotencyKey: "price-nope",
      },
      NOW,
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.code).toBe("invalid_params");

    const badPrice = await prepareAction(
      "proj-1",
      {
        kind: "update_material_price",
        recommendationId: "rec-price",
        params: { materialId: "mat1", newPrice: -5 },
        idempotencyKey: "price-bad",
      },
      NOW,
    );
    expect(badPrice.ok).toBe(false);
    if (!badPrice.ok) expect(badPrice.error.code).toBe("invalid_params");
  });
});

describe("prepareAction — isolation", () => {
  it("an invisible project resolves to project_not_found", async () => {
    db.visible = false;
    const res = await prepareAction(
      "proj-1",
      {
        kind: "record_purchase",
        recommendationId: "rec-buy",
        params: { shoppingItemId: "s1" },
        idempotencyKey: "buy-hidden",
      },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("project_not_found");
  });
});

// ---------------------------------------------------------
// Approval lifecycle
// ---------------------------------------------------------

async function preparedBuyAction(key = "buy-s1") {
  const res = await prepareAction(
    "proj-1",
    {
      kind: "record_purchase",
      recommendationId: "rec-buy",
      params: { shoppingItemId: "s1", actualPrice: 5600 },
      idempotencyKey: key,
    },
    NOW,
  );
  if (!res.ok) throw new Error(res.error.message);
  return res.data.action;
}

describe("requestApproval", () => {
  it("creates a pending approval with a 15-minute window", async () => {
    const action = await preparedBuyAction();
    const res = await requestApproval("proj-1", action.id, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.state).toBe("pending");
    expect(res.data.expiresAt).toBe("2026-09-07T12:15:00.000Z");
    expect(db.activity.some((e) => e.kind === "approval_request")).toBe(true);
  });

  it("is idempotent — a repeated request returns the same approval", async () => {
    const action = await preparedBuyAction();
    const first = await requestApproval("proj-1", action.id, NOW);
    const second = await requestApproval("proj-1", action.id, NOW);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.data.id).toBe(first.data.id);
    expect(db.tables.project_agent_approvals).toHaveLength(1);
  });
});

describe("decideApproval — Approve / Reject / finality", () => {
  it("approve moves the action to approved — and commits NOTHING", async () => {
    const action = await preparedBuyAction();
    const approval = await requestApproval("proj-1", action.id, NOW);
    if (!approval.ok) throw new Error("approval failed");
    const res = await decideApproval(
      "proj-1",
      approval.data.id,
      "approved",
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.action.state).toBe("approved");
    expect(res.data.approval.state).toBe("approved");
    expect(res.data.approval.decidedAt).toBe(NOW);
    expect(db.activity.some((e) => e.kind === "approval_decision")).toBe(true);
    // THE Stage-6 invariant: approving is not executing.
    expect(
      db.writes.filter((w) => w.table !== "project_agent_actions" &&
        w.table !== "project_agent_approvals"),
    ).toHaveLength(0);
  });

  it("rejects: terminal, and the decision cannot be repeated", async () => {
    const action = await preparedBuyAction();
    const approval = await requestApproval("proj-1", action.id, NOW);
    if (!approval.ok) throw new Error("approval failed");
    const res = await decideApproval(
      "proj-1",
      approval.data.id,
      "rejected",
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.action.state).toBe("rejected");
    const again = await decideApproval(
      "proj-1",
      approval.data.id,
      "approved",
      NOW,
    );
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("invalid_state");
  });

  it("cancel via decision: terminal; approval can no longer be requested", async () => {
    const action = await preparedBuyAction();
    const approval = await requestApproval("proj-1", action.id, NOW);
    if (!approval.ok) throw new Error("approval failed");
    const res = await decideApproval(
      "proj-1",
      approval.data.id,
      "cancelled",
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.action.state).toBe("cancelled");
    const reRequest = await requestApproval("proj-1", action.id, NOW);
    expect(reRequest.ok).toBe(false);
    if (!reRequest.ok) expect(reRequest.error.code).toBe("invalid_state");
  });

  it("a lapsed window expires BOTH records — terminal, re-prepare required", async () => {
    const action = await preparedBuyAction();
    const approval = await requestApproval("proj-1", action.id, NOW);
    if (!approval.ok) throw new Error("approval failed");
    const res = await decideApproval(
      "proj-1",
      approval.data.id,
      "approved",
      AFTER_TTL,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("action_expired");
    const actionRow = db.tables.project_agent_actions[0] as { state: string };
    const approvalRow = db.tables.project_agent_approvals[0] as {
      state: string;
    };
    expect(actionRow.state).toBe("expired");
    expect(approvalRow.state).toBe("expired");
    // Terminal: a later decision on the same approval is refused.
    const again = await decideApproval(
      "proj-1",
      approval.data.id,
      "approved",
      AFTER_TTL,
    );
    expect(again.ok).toBe(false);
  });
});

// ---------------------------------------------------------
// Edit & direct cancel
// ---------------------------------------------------------

describe("amendPreparedAction — Edit", () => {
  it("edits params on a still-prepared action and re-validates", async () => {
    const action = await preparedBuyAction();
    const res = await amendPreparedAction(
      "proj-1",
      action.id,
      { params: { shoppingItemId: "s1", actualPrice: 5800 }, assumptions: ["checked with supplier"] },
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.what).toContain("5800");
    expect(res.data.assumptions).toContain("checked with supplier");
    expect(res.data.state).toBe("prepared");
    expect(
      db.activity.some(
        (e) => e.kind === "preparation" && e.summary.startsWith("Edited"),
      ),
    ).toBe(true);
  });

  it("refuses an edit that no longer matches recorded state", async () => {
    const action = await preparedBuyAction();
    // Recorded state moved on: the item was purchased meanwhile.
    (snapState.snap!.shoppingItems[0] as { is_purchased: boolean }).is_purchased = true;
    const res = await amendPreparedAction(
      "proj-1",
      action.id,
      { params: { shoppingItemId: "s1" } },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_params");
  });

  it("refuses an edit after approval — decisions are final", async () => {
    const action = await preparedBuyAction();
    const approval = await requestApproval("proj-1", action.id, NOW);
    if (!approval.ok) throw new Error("approval failed");
    await decideApproval("proj-1", approval.data.id, "approved", NOW);
    const res = await amendPreparedAction(
      "proj-1",
      action.id,
      { params: { shoppingItemId: "s1", actualPrice: 9999 } },
      NOW,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_state");
  });
});

describe("cancelAction", () => {
  it("cancels a prepared action and its pending approval", async () => {
    const action = await preparedBuyAction();
    await requestApproval("proj-1", action.id, NOW);
    const res = await cancelAction("proj-1", action.id, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.state).toBe("cancelled");
    const approvalRow = db.tables.project_agent_approvals[0] as {
      state: string;
    };
    expect(approvalRow.state).toBe("cancelled");
  });
});

// ---------------------------------------------------------
// List, display, decisions
// ---------------------------------------------------------

describe("listPreparedActions & lazy expiry", () => {
  it("lazily expires actions whose approval window has lapsed", async () => {
    const action = await preparedBuyAction();
    await requestApproval("proj-1", action.id, NOW);
    const res = await listPreparedActions("proj-1", AFTER_TTL);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toHaveLength(1);
    expect(res.data[0].action.state).toBe("expired");
    expect(res.data[0].availableDecisions).toHaveLength(0);
    expect(res.data[0].note).toContain("terminal");
  });
});

describe("describePreparedAction — the approval display", () => {
  it("shows what / why / data used / assumptions / expected result", async () => {
    const action = await preparedBuyAction();
    await requestApproval("proj-1", action.id, NOW);
    const res = await describePreparedAction("proj-1", action.id, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const d = res.data.display;
    expect(d).toContain("WHAT: Mark \"Cement\"");
    expect(d).toContain("WHY: Grounded recommendation rec-buy");
    expect(d).toContain("DATA USED: recommendation:rec-buy");
    expect(d).toContain("ASSUMPTIONS: assumption of rec-buy");
    expect(d).toContain("EXPECTED RESULT:");
    expect(d).toContain("RECOMMENDATION: rec-buy");
    expect(res.data.availableDecisions).toEqual([
      "approved",
      "rejected",
      "cancelled",
    ]);
  });
});

describe("availableDecisions — deterministic decision surface", () => {
  const base: PreparedAction = {
    id: "a1",
    kind: "record_purchase",
    what: "what",
    why: "why",
    dataUsed: [],
    assumptions: [],
    expectedResult: "expected",
    permission: "confirm",
    approvalRequired: true,
    payload: {},
    recommendationId: "rec",
    recommendationSummary: "summary",
    idempotencyKey: "k",
    createdAt: NOW,
    updatedAt: NOW,
    state: "prepared",
  };

  it("prepared + open approval → approve / reject / cancel", () => {
    const { decisions } = availableDecisions(
      { ...base, state: "prepared" },
      {
        id: "ap1",
        actionId: "a1",
        state: "pending",
        requestedAt: NOW,
        expiresAt: "2026-09-07T12:15:00.000Z",
        idempotencyKey: "approval:a1",
      },
      NOW,
    );
    expect(decisions).toEqual(["approved", "rejected", "cancelled"]);
  });

  it("prepared without approval → request / edit / cancel", () => {
    const { decisions, note } = availableDecisions(
      { ...base, state: "prepared" },
      null,
      NOW,
    );
    expect(decisions).toEqual([]);
    expect(note).toContain("request approval");
  });

  it("approved → execution is Stage 7's job", () => {
    const { decisions, note } = availableDecisions(
      { ...base, state: "approved" },
      null,
      NOW,
    );
    expect(decisions).toEqual([]);
    expect(note).toContain("Stage 7");
  });

  it("terminal states → re-prepare only", () => {
    for (const state of ["rejected", "cancelled", "expired"] as const) {
      const { decisions, note } = availableDecisions(
        { ...base, state },
        null,
        NOW,
      );
      expect(decisions).toEqual([]);
      expect(note).toContain("terminal");
    }
  });
});

// ---------------------------------------------------------
// The Stage-6 invariant, end to end
// ---------------------------------------------------------

describe("prepare-without-committing — the invariant", () => {
  it("the full lifecycle never writes a single project data table", async () => {
    const action = await preparedBuyAction();
    await requestApproval("proj-1", action.id, NOW);
    const approval = await requestApproval("proj-1", action.id, NOW); // idempotent repeat
    expect(approval.ok).toBe(true);
    if (approval.ok) {
      await decideApproval("proj-1", approval.data.id, "approved", NOW);
    }
    await describePreparedAction("proj-1", action.id, NOW);
    await listPreparedActions("proj-1", NOW);
    // Insert action, insert approval, record the approval decision,
    // transition the action — agent tables ONLY, never project data.
    expect(db.writes.map((w) => w.table)).toEqual([
      "project_agent_actions",
      "project_agent_approvals",
      "project_agent_approvals",
      "project_agent_actions",
    ]);
  });
});
