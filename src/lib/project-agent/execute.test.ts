// =========================================================
// PROJECT AGENT — ACTION EXECUTION TESTS (Stage 7)
//
// Stage 7 acceptance:
//   - This is the ONLY layer that writes project data tables.
//   - Only an APPROVED action with an APPROVED, in-window
//     approval executes — exactly once. Terminal is terminal.
//   - The recorded world is re-derived FRESH and re-validated
//     before the write; a changed world CANCELS the action with
//     the honest reason (no write).
//   - RLS is the final authority: a blocked write (e.g. non-admin
//     touching the global material catalog) FAILS the action with
//     the honest reason.
//   - After the write, recorded state is re-read and VERIFIED.
//   - Every attempt is audited: execution_result + activity.
//   - Idempotency: an executed/verified action never re-executes.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentLifecycleState } from "./states";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";

const NOW = "2026-09-07T12:00:00.000Z";
// Approval window ends at 12:10 — active at NOW, lapsed by LATE.
const LATE = "2026-09-07T12:11:00.000Z";

// ---------------------------------------------------------
// In-memory supabase — agent tables + project data tables,
// with per-table RLS blocking to simulate policy rejections.
// ---------------------------------------------------------
type Row = Record<string, unknown>;

const PROJECT_TABLES = [
  "project_shopping_list",
  "project_progress_stages",
  "material_catalog",
  "material_price_history",
];

const db: {
  tables: Record<string, Row[]>;
  writes: Array<{ table: string; op: string }>;
  activity: Array<{ kind: string; state: string }>;
  visible: boolean;
  /** Simulated RLS rejections: a blocked table's UPDATE affects no rows. */
  rlsBlocked: Record<string, boolean>;
  /** Simulated INSERT failures (e.g. history write denied). */
  insertError: Record<string, string | null>;
  /** Update returns a row but the change does not stick. */
  silentUpdate: boolean;
} = {
  tables: {
    project_agent_actions: [],
    project_agent_approvals: [],
    project_shopping_list: [],
    project_progress_stages: [],
    material_catalog: [
      {
        id: "mat1",
        name: "Cement (50kg)",
        category: "cement",
        unit: "bag",
        current_price: 5500,
      },
    ],
    material_price_history: [],
  },
  writes: [],
  activity: [],
  visible: true,
  rlsBlocked: {},
  insertError: {},
  silentUpdate: false,
};

function resetDb() {
  db.tables.project_agent_actions = [];
  db.tables.project_agent_approvals = [];
  db.tables.project_shopping_list = [
    {
      id: "item1",
      name: "Premium Emulsion Paint",
      quantity: 8,
      unit: "litres",
      estimated_price: 12000,
      is_purchased: false,
      actual_price: null,
    },
  ];
  db.tables.project_progress_stages = [
    {
      id: "st1",
      stage_name: "Screeding",
      is_completed: false,
      completed_at: null,
    },
  ];
  db.tables.material_catalog = [
    {
      id: "mat1",
      name: "Cement (50kg)",
      category: "cement",
      unit: "bag",
      current_price: 5500,
    },
  ];
  db.tables.material_price_history = [];
  db.writes = [];
  db.activity = [];
  db.visible = true;
  db.rlsBlocked = {};
  db.insertError = {};
  db.silentUpdate = false;
}

const AGENT_TABLES = ["project_agent_actions", "project_agent_approvals"];

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = () => db.tables[table] ?? [];
    // Real supabase returns freshly-deserialized objects — the
    // harness returns copies so rows read earlier never alias-
    // mutate when an update lands.
    const copy = (r: Row | undefined) => (r ? { ...r } : null);

    const collector = () => {
      const eqs: Array<[string, unknown]> = [];
      const c: Record<string, unknown> = {
        select: () => c,
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return c;
        },
        order: () => ({
          data: rows()
            .filter((r) => eqs.every(([k, v]) => r[k] === v))
            .map((r) => ({ ...r })),
          error: null,
        }),
        maybeSingle: async () => ({
          data: copy(rows().find((r) => eqs.every(([k, v]) => r[k] === v))),
          error: null,
        }),
      };
      return c;
    };

    return {
      ...collector(),
      insert: async (row: Row) => {
        db.writes.push({ table, op: "insert" });
        const forced = db.insertError[table];
        if (forced)
          return {
            error: { message: forced, code: "42501" },
          };
        rows().push({ ...row });
        return { error: null };
      },
      update: (data: Row) => {
        db.writes.push({ table, op: "update" });
        // Like real supabase, the write applies when the eq filter
        // is provided — with or without a trailing select().
        // RLS blocking / silent failures only affect PROJECT data
        // tables, never the agent's own tables.
        let affected: Row | null = null;
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            const projectTable = !AGENT_TABLES.includes(table);
            const rlsBlocked = projectTable && db.rlsBlocked[table];
            // A silent update FABRICATES a successful result (the
            // caller sees the row as-if-written) but the stored
            // row never changes — so verification catches it.
            const silent = projectTable && db.silentUpdate;
            if (!rlsBlocked) {
              rows().forEach((r) => {
                if (r[col] === val) {
                  if (silent) {
                    affected = { ...r, ...data };
                  } else {
                    Object.assign(r, data);
                    affected = { ...r };
                  }
                }
              });
            }
            return c;
          },
          select: () => ({
            maybeSingle: async () => ({
              data: copy(affected ?? undefined),
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
// Module mocks — session (visibility + activity) and snapshot.
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
      entry: { kind: string; state: AgentLifecycleState },
    ) => {
      db.activity.push({ kind: entry.kind, state: entry.state });
      return { ok: true as const, data: null };
    },
  ),
}));

/** Fresh recorded snapshot — controllable per test. */
const snapState: { snap: PredictiveProjectSnapshot | null } = { snap: null };

vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(async () => snapState.snap),
}));

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
        stageKey: "screeding",
        stageName: "Screeding",
        sortOrder: 2,
        isCompleted: false,
        completedAt: null,
      },
    ],
    shoppingItems: [
      {
        id: "item1",
        projectId: "proj-1",
        category: "paint",
        name: "Premium Emulsion Paint",
        quantity: 8,
        unit: "litres",
        estimated_price: 12000,
        actual_price: null,
        is_purchased: false,
        supplier: null,
      },
    ],
  } as unknown as PredictiveProjectSnapshot;
}

// The real validateActionParams (from ./actions) runs against
// the snapshot + the in-memory material_catalog above.
import { executeApprovedAction } from "./execute";

// ---------------------------------------------------------
// Fixtures — approved actions with approved, in-window
// approvals (mirrors Stage 6 records).
// ---------------------------------------------------------
function seedAction(overrides: Partial<Row> = {}): { id: string } {
  const a = {
    id: "act1",
    project_id: "proj-1",
    kind: "record_purchase",
    what: 'Mark "Premium Emulsion Paint" as purchased.',
    state: "approved",
    payload: { shoppingItemId: "item1", actualPrice: 11500 },
    execution_result: null,
    idempotency_key: "k1",
    ...overrides,
  };
  db.tables.project_agent_actions.push(a);
  return { id: a.id as string };
}

function seedApproval(actionId: string, overrides: Partial<Row> = {}): void {
  db.tables.project_agent_approvals.push({
    id: "appr1",
    action_id: actionId,
    state: "approved",
    requested_at: NOW,
    expires_at: "2026-09-07T12:10:00.000Z",
    decided_at: NOW,
    ...overrides,
  });
}

function seededAction(): Row | undefined {
  return db.tables.project_agent_actions.find((a) => a.id === "act1");
}

function projectWrites(): Array<{ table: string; op: string }> {
  return db.writes.filter(
    (w) => PROJECT_TABLES.includes(w.table) && w.op === "update",
  );
}

beforeEach(() => {
  resetDb();
  snapState.snap = baseSnapshot();
});

describe("action execution (§Stage 7)", () => {
  it("executes an approved purchase and VERIFIES it in recorded state", async () => {
    const { id } = seedAction();
    seedApproval(id);

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.duplicate).toBe(false);
    expect(r.data.execution.outcome).toBe("verified");
    expect(r.data.execution.writtenTables).toEqual(["project_shopping_list"]);
    expect(r.data.execution.verifiedAt).toBe(NOW);

    const item = db.tables.project_shopping_list[0];
    expect(item.is_purchased).toBe(true);
    expect(item.actual_price).toBe(11500);

    expect(seededAction()?.state).toBe("verified");
    const audit = seededAction()?.execution_result as Record<string, unknown>;
    expect(audit.outcome).toBe("verified");
    expect(audit.writtenTables).toEqual(["project_shopping_list"]);

    expect(db.activity.filter((e) => e.kind === "execution").length).toBe(1);
    expect(db.activity.filter((e) => e.kind === "verification").length).toBe(1);
  });

  it("is idempotent — an executed action never re-executes", async () => {
    const { id } = seedAction({
      state: "verified",
      execution_result: {
        outcome: "verified",
        attemptedAt: NOW,
        verifiedAt: NOW,
        summary: "done",
        writtenTables: ["project_shopping_list"],
      },
    });
    const before = db.writes.length;

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.duplicate).toBe(true);
    expect(db.writes.length).toBe(before); // no new writes at all
  });

  it("a lapsed approval window expires BOTH records — no write", async () => {
    const { id } = seedAction();
    seedApproval(id); // expires 12:10

    const r = await executeApprovedAction("proj-1", id, LATE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("action_expired");

    expect(seededAction()?.state).toBe("expired");
    expect(db.tables.project_agent_approvals[0].state).toBe("expired");
    expect(projectWrites().length).toBe(0);
  });

  it("state changed since approval → CANCELLED honestly, no write", async () => {
    const { id } = seedAction();
    seedApproval(id);
    // The world moved: the user already recorded the purchase.
    snapState.snap = baseSnapshot();
    (snapState.snap.shoppingItems[0] as unknown as Row).is_purchased = true;

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid_state");
    expect(r.error.message).toContain("already recorded as purchased");

    expect(seededAction()?.state).toBe("cancelled");
    expect(projectWrites().length).toBe(0);
    const audit = seededAction()?.execution_result as Record<string, unknown>;
    expect(audit.writtenTables).toEqual([]);
  });

  it("only APPROVED actions execute — other states are refused", async () => {
    for (const state of [
      "prepared",
      "rejected",
      "cancelled",
      "expired",
      "failed",
    ] as AgentLifecycleState[]) {
      resetDb();
      const { id } = seedAction({ state });
      seedApproval(id);
      const r = await executeApprovedAction("proj-1", id, NOW);
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.error.code).toBe("invalid_state");
    }
    expect(projectWrites().length).toBe(0);
  });

  it("no approved approval backing the action → refusal, no write", async () => {
    const { id } = seedAction();
    seedApproval(id, { state: "pending" }); // never decided

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid_state");
    expect(seededAction()?.state).toBe("approved"); // untouched
    expect(projectWrites().length).toBe(0);
  });

  it("executes and verifies a stage completion", async () => {
    const { id } = seedAction({
      kind: "confirm_stage_completion",
      payload: { stageId: "st1" },
    });
    seedApproval(id);

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(true);
    const stage = db.tables.project_progress_stages[0];
    expect(stage.is_completed).toBe(true);
    expect(stage.completed_at).toBe(NOW);
    expect(seededAction()?.state).toBe("verified");
  });

  it("executes and verifies a material price update (admin path)", async () => {
    const { id } = seedAction({
      kind: "update_material_price",
      payload: {
        materialId: "mat1",
        newPrice: 6200,
        source: "user:market check",
      },
    });
    seedApproval(id);

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.execution.writtenTables).toEqual(["material_catalog"]);

    const mat = db.tables.material_catalog[0];
    expect(mat.current_price).toBe(6200);
    expect(mat.previous_price).toBe(5500);
    expect(mat.price_source).toBe("user:market check");

    const hist = db.tables.material_price_history[0];
    expect(hist.old_price).toBe(5500);
    expect(hist.new_price).toBe(6200);
    expect(seededAction()?.state).toBe("verified");
  });

  it("RLS blocks the material catalog write → FAILED with the honest reason", async () => {
    const { id } = seedAction({
      kind: "update_material_price",
      payload: { materialId: "mat1", newPrice: 6200 },
    });
    seedApproval(id);
    db.rlsBlocked.material_catalog = true; // non-admin, admin-only table

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("persistence_error");
    expect(r.error.message).toContain("admin");

    expect(seededAction()?.state).toBe("failed");
    const audit = seededAction()?.execution_result as Record<string, unknown>;
    expect(audit.outcome).toBe("failed");
    // No history row for a price that never changed.
    expect(db.tables.material_price_history.length).toBe(0);
  });

  it("price history insert fails after the catalog write → still verified, with an honest note", async () => {
    const { id } = seedAction({
      kind: "update_material_price",
      payload: { materialId: "mat1", newPrice: 6200 },
    });
    seedApproval(id);
    db.insertError.material_price_history =
      "violates row-level security policy";

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.execution.outcome).toBe("verified");
    expect(r.data.execution.note).toContain("price-history");
    expect(db.tables.material_catalog[0].current_price).toBe(6200);
    expect(seededAction()?.state).toBe("verified");
  });

  it("a write that reports success but does not stick → verification FAILS the action", async () => {
    const { id } = seedAction();
    seedApproval(id);
    db.silentUpdate = true; // update returns a row, changes nothing

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain("did not persist");

    expect(seededAction()?.state).toBe("failed");
    const audit = seededAction()?.execution_result as Record<string, unknown>;
    expect(audit.outcome).toBe("failed");
    expect(audit.failureReason).toContain("purchase flag");
  });

  it("an unreadable project (RLS) → project_not_found, no writes", async () => {
    const { id } = seedAction();
    seedApproval(id);
    db.visible = false;

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("project_not_found");
    expect(projectWrites().length).toBe(0);
  });

  it("an action belonging to another project is refused", async () => {
    const { id } = seedAction({ project_id: "proj-OTHER" });
    seedApproval(id);

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("not_found");
    expect(projectWrites().length).toBe(0);
  });

  it("an unreadable recorded state cancels the action — never a blind write", async () => {
    const { id } = seedAction();
    seedApproval(id);
    snapState.snap = null;

    const r = await executeApprovedAction("proj-1", id, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid_state");
    expect(seededAction()?.state).toBe("cancelled");
    expect(projectWrites().length).toBe(0);
  });
});
