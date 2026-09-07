// =========================================================
// PROJECT AGENT — CHANGE DETECTION TESTS (Stage 8)
//
// Stage 8 acceptance: controlled before/after project scenarios
// where every reported difference is independently verified.
// Each test builds the two recorded states from scratch and
// asserts the EXACT before/after values, deltas, severities and
// honest causes — never by calling the code under test.
//
// Honesty checks:
//   - "why" cites the recorded cause (completion date, purchase,
//     price history) or states the unknown explicitly.
//   - "effect" is quantified only from recorded data.
//   - Regressions (completed → incomplete, purchased → not)
//     are flagged MAJOR.
//   - Measurement/waste are reported as limitations, not
//     fabricated deltas.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import { diffSnapshots, detectProjectChanges } from "./changes";

const T1 = "2026-09-07T12:00:00.000Z";
const T2 = "2026-09-07T14:00:00.000Z";

// ---------------------------------------------------------
// In-memory supabase — the baseline table only.
// ---------------------------------------------------------
type Row = Record<string, unknown>;

const db: {
  tables: Record<string, Row[]>;
  activity: Array<{ kind: string; summary: string }>;
  visible: boolean;
} = {
  tables: { project_agent_state_baselines: [] },
  activity: [],
  visible: true,
};

function resetDb() {
  db.tables.project_agent_state_baselines = [];
  db.activity = [];
  db.visible = true;
}

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = (): Row[] => db.tables[table] ?? [];
    const collector = () => {
      const eqs: Array<[string, unknown]> = [];
      const c: Record<string, unknown> = {
        select: () => c,
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return c;
        },
        maybeSingle: async () => ({
          data:
            rows().find((r: Row) => eqs.every(([k, v]) => r[k] === v)) ?? null,
          error: null,
        }),
      };
      return c;
    };
    return {
      ...collector(),
      insert: async (row: Row) => {
        rows().push({ ...row });
        return { error: null };
      },
      delete: () => ({
        eq: (col: string, val: unknown) => {
          const keep = rows().filter((r: Row) => r[col] !== val);
          rows().length = 0;
          rows().push(...keep);
          return {};
        },
      }),
    };
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

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
    async (_projectId: string, entry: { kind: string; summary: string }) => {
      db.activity.push({ kind: entry.kind, summary: entry.summary });
      return { ok: true as const, data: null };
    },
  ),
}));

const snapState: { snap: PredictiveProjectSnapshot | null } = { snap: null };
vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: vi.fn(async () => snapState.snap),
}));

// ---------------------------------------------------------
// Controlled scenario builders — the recorded states.
// ---------------------------------------------------------
function snap(overrides: {
  projectStatus?: PredictiveProjectSnapshot["project"]["status"];
  stages?: Array<{
    id: string;
    name: string;
    order: number;
    completed: boolean;
    completedAt?: string;
  }>;
  items?: Array<{
    id: string;
    name: string;
    qty: number;
    unit?: string;
    est: number;
    actual?: number | null;
    purchased?: boolean;
    category?: string;
  }>;
  calculations?: Array<{
    id: string;
    title: string;
    total: number | null;
  }>;
  priceHistory?: Array<{
    materialName: string;
    oldPrice: number | null;
    newPrice: number;
    changedAt: string;
    source?: string;
  }>;
  region?: {
    marketCode: string | null;
    countryCode: string | null;
    city: string | null;
  };
  now: string;
}): PredictiveProjectSnapshot {
  return {
    projectId: "proj-1",
    now: overrides.now,
    project: {
      name: "Duplex A",
      status: overrides.projectStatus ?? "in_progress",
      createdAt: T1,
      updatedAt: overrides.now,
      progressPercentage: 40,
    },
    stages:
      overrides.stages?.map((s) => ({
        id: s.id,
        stageKey: s.id,
        stageName: s.name,
        sortOrder: s.order,
        isCompleted: s.completed,
        completedAt: s.completedAt ?? null,
        hasPhoto: false,
        updatedAt: overrides.now,
      })) ?? [],
    shoppingItems:
      overrides.items?.map((i) => ({
        id: i.id,
        project_id: "proj-1",
        category: i.category ?? "cement",
        name: i.name,
        quantity: i.qty,
        unit: i.unit ?? "bags",
        estimated_price: i.est,
        actual_price: i.actual ?? null,
        total_price: i.qty * i.est,
        supplier: null,
        notes: null,
        is_purchased: i.purchased ?? false,
        sort_order: 1,
        updated_at: overrides.now,
      })) ?? [],
    calculations:
      overrides.calculations?.map((c) => ({
        id: c.id,
        calculatorType: "screeding",
        title: c.title,
        createdAt: overrides.now,
        estimatedTotal: c.total,
      })) ?? [],
    priceHistory:
      overrides.priceHistory?.map((h) => ({
        materialName: h.materialName,
        oldPrice: h.oldPrice,
        newPrice: h.newPrice,
        changedAt: h.changedAt,
        priceSource: h.source ?? null,
      })) ?? [],
    marketPrices: [],
    visualObservations: [],
    region: overrides.region ?? {
      marketCode: "NG",
      countryCode: "NG",
      city: "Lagos",
    },
  } as unknown as PredictiveProjectSnapshot;
}

beforeEach(() => {
  resetDb();
  snapState.snap = null;
});

// ---------------------------------------------------------
// Pure diff — controlled before/after scenarios.
// ---------------------------------------------------------
describe("diffSnapshots — controlled scenarios (§Stage 8)", () => {
  it("identical recorded states → no changes", () => {
    const a = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    const b = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    expect(diffSnapshots(a, b, T2)).toEqual([]);
  });

  it("stage completion → schedule change with recorded date, progress effect, honest why", () => {
    const before = snap({
      now: T1,
      stages: [
        {
          id: "st1",
          name: "Foundation",
          order: 1,
          completed: true,
          completedAt: T1,
        },
        { id: "st2", name: "Screeding", order: 2, completed: false },
      ],
    });
    const after = snap({
      now: T2,
      stages: [
        {
          id: "st1",
          name: "Foundation",
          order: 1,
          completed: true,
          completedAt: T1,
        },
        {
          id: "st2",
          name: "Screeding",
          order: 2,
          completed: true,
          completedAt: T2,
        },
      ],
    });
    const changes = diffSnapshots(before, after, T2);
    const c = changes.find((x) => x.id === "stage:st2:completed");
    expect(c).toBeDefined();
    if (!c) return;
    expect(c.category).toBe("schedule");
    expect(c.severity).toBe("minor");
    expect(c.whatChanged).toContain("Screeding");
    // Why: the recorded completion date, cited.
    expect(c.whyItChanged).toContain(T2.split("T")[0]);
    // Effect: 1/2 → 2/2 progress, independently computed.
    expect(c.effect).toContain("1/2 to 2/2");
    expect(c.effect).toContain("(100%)");
    expect(c.before.value).toBe("incomplete");
    expect(c.after.value).toBe(`completed ${T2.split("T")[0]}`);
  });

  it("stage regression → MAJOR with an explicit backwards effect", () => {
    const before = snap({
      now: T1,
      stages: [
        {
          id: "st1",
          name: "Foundation",
          order: 1,
          completed: true,
          completedAt: T1,
        },
      ],
    });
    const after = snap({
      now: T2,
      stages: [{ id: "st1", name: "Foundation", order: 1, completed: false }],
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "stage:st1:regressed",
    );
    expect(c?.severity).toBe("major");
    expect(c?.whatChanged).toContain("back to incomplete");
    expect(c?.effect).toContain("REGRESSION");
  });

  it("stage added/removed → scope changes", () => {
    const before = snap({
      now: T1,
      stages: [{ id: "st1", name: "Foundation", order: 1, completed: false }],
    });
    const after = snap({
      now: T2,
      stages: [
        { id: "st1", name: "Foundation", order: 1, completed: false },
        { id: "st2", name: "Roofing", order: 2, completed: false },
      ],
    });
    const added = diffSnapshots(before, after, T2).find(
      (x) => x.id === "stage:st2:added",
    );
    expect(added?.category).toBe("scope");
    expect(added?.whatChanged).toContain("Roofing");

    const removed = diffSnapshots(after, before, T2).find(
      (x) => x.id === "stage:st2:removed",
    );
    expect(removed?.category).toBe("scope");
    // Removing an INCOMPLETE stage is minor; the effect recomputes progress.
    expect(removed?.severity).toBe("minor");
    expect(removed?.effect).toContain("0/1");
  });

  it("quantity change → quantified line + roll-up effect, independently verified", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    const after = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement", qty: 12, est: 500 }],
    });
    const changes = diffSnapshots(before, after, T2);

    const q = changes.find((x) => x.id === "item:i1:quantity");
    expect(q?.category).toBe("quantity");
    // 12 vs 10 = +20% → major (≥10% threshold), independently checked.
    expect(q?.severity).toBe("major");
    expect(q?.whatChanged).toContain("from 10 bags to 12 bags");
    // Effect: +2 × ₦500 = +₦1,000; line total ₦5,000 → ₦6,000.
    expect(q?.effect).toContain("+₦1,000");
    expect(q?.effect).toContain("₦5,000 → ₦6,000");
    expect(q?.effect).toContain("not yet purchased");

    // Budget roll-up: estimated total and remaining both +₦1,000 (20%, major).
    const est = changes.find((x) => x.id === "budget:estimated_total");
    expect(est?.whatChanged).toContain(
      "from ₦5,000 to ₦6,000 (+₦1,000, 20.0%)",
    );
    expect(est?.severity).toBe("major");
    expect(changes.find((x) => x.id === "budget:remaining")?.severity).toBe(
      "major",
    );
    // Nothing was purchased — recorded spend must NOT be reported as changed.
    expect(
      changes.find((x) => x.id === "budget:recorded_spend"),
    ).toBeUndefined();
  });

  it("estimated price change with a recorded price-history cause → why cites it", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement (50kg)", qty: 10, est: 5500 }],
    });
    const after = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement (50kg)", qty: 10, est: 6200 }],
      priceHistory: [
        {
          materialName: "Cement (50kg)",
          oldPrice: 5500,
          newPrice: 6200,
          changedAt: "2026-09-07T13:00:00.000Z",
          source: "admin market update",
        },
      ],
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "item:i1:estimated_price",
    );
    expect(c?.category).toBe("price");
    expect(c?.whyItChanged).toContain("material price update was recorded");
    expect(c?.whyItChanged).toContain("2026-09-07");
    expect(c?.whyItChanged).toContain("admin market update");
    // Effect: +₦700 × 10 = +₦7,000; ₦55,000 → ₦62,000.
    expect(c?.effect).toContain("+₦7,000");
    expect(c?.effect).toContain("₦55,000 → ₦62,000");
    // +12.7% ≥ 10% → major.
    expect(c?.severity).toBe("major");
  });

  it("estimated price change with NO recorded cause → why states the unknown honestly", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 5000 }],
    });
    const after = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 5100 }],
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "item:i1:estimated_price",
    );
    // +2% → minor.
    expect(c?.severity).toBe("minor");
    expect(c?.whyItChanged).toContain("not captured in the recorded state");
    expect(c?.whatChanged).toContain("from ₦5,000 to ₦5,100");
  });

  it("purchase recorded with actual price → price + requirement + spend roll-up, verified", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Paint", qty: 8, est: 1500, unit: "litres" }],
    });
    const after = snap({
      now: T2,
      items: [
        {
          id: "i1",
          name: "Paint",
          qty: 8,
          est: 1500,
          unit: "litres",
          actual: 1400,
          purchased: true,
        },
      ],
    });
    const changes = diffSnapshots(before, after, T2);

    const p = changes.find((x) => x.id === "item:i1:actual_price");
    expect(p?.whatChanged).toContain("actual unit price");
    expect(p?.effect).toContain("-₦800");
    expect(p?.effect).toContain("(-6.7% per unit)");
    expect(p?.whyItChanged).toContain("recorded against a purchase");

    const bought = changes.find((x) => x.id === "item:i1:purchased");
    expect(bought?.category).toBe("material_requirement");
    // Spend: 8 × ₦1,400 = ₦11,200 at actual.
    expect(bought?.effect).toContain("₦11,200");
    expect(bought?.effect).toContain("recorded actual");

    // Roll-ups, independently computed:
    // recorded spend ₦0 → ₦11,200 (no baseline ratio → minor);
    // remaining ₦12,000 → ₦0 (−100% → major).
    const spend = changes.find((x) => x.id === "budget:recorded_spend");
    expect(spend?.whatChanged).toContain("from ₦0 to ₦11,200");
    expect(spend?.severity).toBe("minor");
    const remaining = changes.find((x) => x.id === "budget:remaining");
    expect(remaining?.whatChanged).toContain("from ₦12,000 to ₦0");
    expect(remaining?.severity).toBe("major");
  });

  it("purchase regression → MAJOR", () => {
    const before = snap({
      now: T1,
      items: [
        {
          id: "i1",
          name: "Paint",
          qty: 8,
          est: 1500,
          purchased: true,
          actual: 1400,
        },
      ],
    });
    const after = snap({
      now: T2,
      items: [{ id: "i1", name: "Paint", qty: 8, est: 1500 }],
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "item:i1:unpurchased",
    );
    expect(c?.severity).toBe("major");
    expect(c?.effect).toContain("REGRESSION");
    expect(c?.effect).toContain("₦12,000");
  });

  it("item added/removed → material requirement with honest budget effect", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    const after = snap({
      now: T2,
      items: [
        { id: "i1", name: "Cement", qty: 10, est: 500 },
        { id: "i2", name: "Sharp sand", qty: 20, est: 250 },
      ],
    });
    const added = diffSnapshots(before, after, T2).find(
      (x) => x.id === "item:i2:added",
    );
    expect(added?.category).toBe("material_requirement");
    expect(added?.whatChanged).toContain("Sharp sand");
    // 20 × ₦250 = ₦5,000 added to the budget.
    expect(added?.effect).toContain("₦5,000");

    // Removing a PURCHASED line is major.
    const purchasedBefore = snap({
      now: T1,
      items: [
        { id: "i1", name: "Cement", qty: 10, est: 500 },
        { id: "i2", name: "Sharp sand", qty: 20, est: 250, purchased: true },
      ],
    });
    const removed = diffSnapshots(purchasedBefore, before, T2).find(
      (x) => x.id === "item:i2:removed",
    );
    expect(removed?.severity).toBe("major");
    expect(removed?.effect).toContain("PURCHASED line was removed");
  });

  it("project status change → scope change", () => {
    const before = snap({ now: T1, projectStatus: "in_progress" });
    const after = snap({ now: T2, projectStatus: "on_hold" });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "project:status",
    );
    expect(c?.category).toBe("scope");
    expect(c?.whatChanged).toContain('"in_progress" to "on_hold"');
    expect(c?.effect).toContain("on hold");
  });

  it("region change → regional context change with a market-scope effect", () => {
    const before = snap({ now: T1 });
    const after = snap({
      now: T2,
      region: { marketCode: "GH", countryCode: "GH", city: "Accra" },
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "region:change",
    );
    expect(c?.category).toBe("regional_context");
    expect(c?.whatChanged).toContain("NG");
    expect(c?.whatChanged).toContain("GH");
    expect(c?.effect).toContain("future calculations");
  });

  it("saved calculation added → measurement change with honest why and limitation", () => {
    const before = snap({ now: T1, calculations: [] });
    const after = snap({
      now: T2,
      calculations: [
        { id: "c1", title: "Screeding — ground floor", total: 240000 },
      ],
    });
    const c = diffSnapshots(before, after, T2).find(
      (x) => x.id === "calc:c1:added",
    );
    expect(c?.category).toBe("measurement");
    expect(c?.severity).toBe("info");
    expect(c?.whyItChanged).toContain("re-run");
    expect(c?.effect).toContain("₦240,000");
    expect(c?.effect).toContain(
      "Measurement inputs themselves are not captured",
    );
  });

  it("is deterministic — identical inputs, identical output (order included)", () => {
    const before = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    const after = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement", qty: 12, est: 620 }],
      stages: [
        {
          id: "st1",
          name: "Foundation",
          order: 1,
          completed: true,
          completedAt: T2,
        },
      ],
    });
    const r1 = diffSnapshots(before, after, T2);
    const r2 = diffSnapshots(before, after, T2);
    expect(r1).toEqual(r2);
    expect(r1.map((c) => c.id)).toEqual(
      [...r1.map((c) => c.id)].sort((a, b) => a.localeCompare(b)),
    );
  });
});

// ---------------------------------------------------------
// Orchestrator — baseline lifecycle.
// ---------------------------------------------------------
describe("detectProjectChanges — baseline lifecycle (§Stage 8)", () => {
  it("first run → first_capture, baseline stored, no comparison", async () => {
    snapState.snap = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    const r = await detectProjectChanges("proj-1", T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.status).toBe("first_capture");
    expect(r.data.changes).toEqual([]);
    expect(r.data.summary).toContain("first comparison point");
    expect(db.tables.project_agent_state_baselines.length).toBe(1);
    expect(db.tables.project_agent_state_baselines[0].captured_at).toBe(T1);
  });

  it("second run after a change → ok with changes; baseline advances", async () => {
    snapState.snap = snap({
      now: T1,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 500 }],
    });
    await detectProjectChanges("proj-1", T1);

    // The world moves between runs.
    snapState.snap = snap({
      now: T2,
      items: [{ id: "i1", name: "Cement", qty: 10, est: 620 }],
    });
    const r = await detectProjectChanges("proj-1", T2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.status).toBe("ok");
    expect(r.data.baselineCapturedAt).toBe(T1);
    expect(r.data.changes.map((c) => c.id)).toContain(
      "item:i1:estimated_price",
    );
    // Baseline advanced to the current state.
    expect(db.tables.project_agent_state_baselines.length).toBe(1);
    expect(db.tables.project_agent_state_baselines[0].captured_at).toBe(T2);

    // Third run, nothing further changed → zero changes (baseline moved).
    const r3 = await detectProjectChanges("proj-1", T2);
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.data.changes).toEqual([]);
    expect(r3.data.summary).toContain("No changes detected");
  });

  it("records an activity entry per detection run", async () => {
    snapState.snap = snap({ now: T1 });
    await detectProjectChanges("proj-1", T1);
    snapState.snap = snap({
      now: T2,
      stages: [
        {
          id: "st1",
          name: "Foundation",
          order: 1,
          completed: true,
          completedAt: T2,
        },
      ],
    });
    await detectProjectChanges("proj-1", T2);
    expect(db.activity.length).toBe(2);
    expect(db.activity[0].summary).toContain("first baseline");
    expect(db.activity[1].summary).toContain("1 change(s) detected");
  });

  it("unreadable project (RLS) → project_not_found, no baseline write", async () => {
    db.visible = false;
    snapState.snap = snap({ now: T1 });
    const r = await detectProjectChanges("proj-1", T1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("project_not_found");
    expect(db.tables.project_agent_state_baselines.length).toBe(0);
  });

  it("every result discloses its limitations (measurements, waste)", async () => {
    snapState.snap = snap({ now: T1 });
    const r = await detectProjectChanges("proj-1", T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.limitations.length).toBe(2);
    expect(r.data.limitations[0]).toContain("Measurement inputs");
    expect(r.data.limitations[1]).toContain("Waste factors");
  });
});
