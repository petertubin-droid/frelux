// =========================================================
// PROJECT AGENT — MEMORY & AUDIT TRAIL TESTS (Stage 10)
//
// Stage 10 acceptance: a user can understand —
//   What FRELUX observed → what it recommended → what the user
//   approved → what actually happened.
//
// Verified here:
//   - the full chain assembles end to end for a completed action
//   - every MISSING link is reported honestly as missing
//   - the timeline is chronological and attributed (project, user)
//   - secrets are redacted on write AND on read (legacy rows too)
//   - memory writes become part of the trail
//   - the story never invents links
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentFact } from "./types";
import {
  sanitizeAuditValue,
  getProjectStory,
  describeThread,
  recordAuditedFact,
} from "./audit";
import { recordActivity, recordFact } from "./session";

const T1 = "2026-09-07T10:00:00.000Z";
const T2 = "2026-09-07T11:00:00.000Z";
const T3 = "2026-09-07T12:00:00.000Z";
const T4 = "2026-09-07T13:00:00.000Z";

// ---------------------------------------------------------
// In-memory supabase.
// ---------------------------------------------------------
type Row = Record<string, unknown>;

const db: {
  projects: Row[];
  activity: Row[];
  actions: Row[];
  approvals: Row[];
  alerts: Row[];
  memory: Row[];
} = {
  projects: [{ id: "proj-1" }],
  activity: [],
  actions: [],
  approvals: [],
  alerts: [],
  memory: [],
};

function resetDb() {
  db.projects = [{ id: "proj-1" }];
  db.activity = [];
  db.actions = [];
  db.approvals = [];
  db.alerts = [];
  db.memory = [];
}

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = (): Row[] =>
      table === "contractor_projects"
        ? db.projects
        : table === "project_agent_activity"
          ? db.activity
          : table === "project_agent_actions"
            ? db.actions
            : table === "project_agent_approvals"
              ? db.approvals
              : table === "project_agent_alerts"
                ? db.alerts
                : table === "project_agent_memory"
                  ? db.memory
                  : [];
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      order: () => c,
      limit: () => c,
      maybeSingle: async () => ({
        data: rows()[0] ?? null,
        error: null,
      }),
      then: async (resolve: (v: unknown) => void) =>
        resolve({ data: rows(), error: null }),
    };
    return {
      ...c,
      insert: async (row: Row) => {
        rows().push({
          id: `row-${rows().length + 1}`,
          created_by: "user-1",
          ...row,
        });
        return { error: null };
      },
      upsert: async (row: Row) => {
        rows().length = 0;
        rows().push(row);
        return { error: null };
      },
    };
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

// NOTE: './session' is NOT mocked — the REAL recordActivity /
// recordFact / assertProjectVisible run, so write-layer
// sanitization and the visibility boundary are tested through
// the actual code paths against the mock tables above.

// recordActivity/recordFact keep their REAL implementations (the
// './session' mock above only replaces assertProjectVisible), so
// their writes flow into the mock db tables above — write-layer
// sanitization is tested through the real code paths.

beforeEach(() => {
  resetDb();
});

// ---------------------------------------------------------
// Secret hygiene (write AND read).
// ---------------------------------------------------------
describe("sanitizeAuditValue — secret hygiene (§Stage 10)", () => {
  it("redacts secret-looking keys recursively, keeps everything else", () => {
    const input = {
      api_key: "sk-123",
      nested: { password: "hunter2", fine: "ok", AUTHORIZATION: "Bearer x" },
      items: [{ token: "abc" }, { name: "Cement", price: 500 }],
      summary: "normal text",
    };
    const out = sanitizeAuditValue(input);
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.nested.password).toBe("[REDACTED]");
    expect(out.nested.fine).toBe("ok");
    expect(out.nested.AUTHORIZATION).toBe("[REDACTED]");
    expect(out.items[0].token).toBe("[REDACTED]");
    expect(out.items[1].name).toBe("Cement");
    expect(out.items[1].price).toBe(500);
    expect(out.summary).toBe("normal text");
  });

  it("leaves primitives and null untouched", () => {
    expect(sanitizeAuditValue("hello")).toBe("hello");
    expect(sanitizeAuditValue(42)).toBe(42);
    expect(sanitizeAuditValue(null)).toBe(null);
  });

  it("recordActivity never persists secret payloads (write-layer hygiene)", async () => {
    await recordActivity(
      "proj-1",
      {
        kind: "execution",
        state: "executed",
        summary: "Executed approved action.",
        payload: {
          writtenTable: "project_shopping_list",
          api_key: "sk-live-123",
          nested: { user_token: "t1" },
        },
      },
      T1,
    );
    const row = db.activity[0];
    const payload = row.payload as Record<string, unknown>;
    expect(payload.api_key).toBe("[REDACTED]");
    expect((payload.nested as Row).user_token).toBe("[REDACTED]");
    expect(payload.writtenTable).toBe("project_shopping_list");
    const stored = JSON.stringify(row);
    expect(stored).not.toContain("sk-live-123");
    expect(stored).not.toContain("t1");
  });

  it("recordFact sanitizes fact values before persisting", async () => {
    const fact: AgentFact = {
      id: "f1",
      key: "supplier_contact",
      value: { password: "p123", name: "Alhaji Musa" },
      dataClass: "user_provided",
      source: "user",
      observedAt: T1,
    };
    const r = await recordFact("proj-1", fact, T1);
    expect(r.ok).toBe(true);
    const memoryRow = db.memory[0];
    const facts = memoryRow.facts as AgentFact[];
    expect((facts[0].value as Row).password).toBe("[REDACTED]");
    expect((facts[0].value as Row).name).toBe("Alhaji Musa");
    expect(JSON.stringify(memoryRow)).not.toContain("p123");
  });
});

// ---------------------------------------------------------
// The story — observed → recommended → approved → happened.
// ---------------------------------------------------------
describe("getProjectStory — the unified trail (§Stage 10)", () => {
  function seedFullChain() {
    db.activity.push(
      {
        id: "a1",
        project_id: "proj-1",
        kind: "recommendation",
        state: "recommended",
        summary:
          'Recommended recording the purchase of "Cement" at the new price.',
        payload: { api_key: "legacy-leak" },
        created_at: T1,
        created_by: "user-1",
      },
      {
        id: "a2",
        project_id: "proj-1",
        kind: "approval_decision",
        state: "approved",
        summary: "The user approved the prepared action.",
        payload: null,
        created_at: T2,
        created_by: "user-1",
      },
      {
        id: "a3",
        project_id: "proj-1",
        kind: "execution",
        state: "executed",
        summary: "Executed approved action: purchase recorded.",
        payload: null,
        created_at: T3,
        created_by: "user-1",
      },
      {
        id: "a4",
        project_id: "proj-1",
        kind: "verification",
        state: "verified",
        summary: "Verified in recorded state: purchase recorded.",
        payload: null,
        created_at: T4,
        created_by: "user-1",
      },
    );
    db.actions.push({
      id: "act-1",
      kind: "record_purchase",
      what: 'Record "Cement" as purchased at ₦625',
      why: "The recorded estimated price increased; the purchase evidence was provided.",
      recommendation_summary:
        'Record the purchase of "Cement" at the updated price.',
      state: "executed",
      executed_at: T3,
      verified_at: T4,
      execution_result: {
        outcome: "succeeded",
        summary: "purchase recorded",
        writtenTables: ["project_shopping_list"],
      },
      created_at: T1,
    });
    db.approvals.push({
      id: "appr-1",
      action_id: "act-1",
      state: "approved",
      requested_at: T1,
      decided_at: T2,
      decided_by: "user-1",
    });
    db.alerts.push({
      alert_key: "budget:overrun",
      severity: "high",
      condition_text: "Projected ₦12,500 vs estimate ₦10,000.",
      status: "open",
    });
  }

  it("assembles the full chain end to end — observed → recommended → approved → happened", async () => {
    seedFullChain();
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const thread = r.data.threads[0];
    expect(thread.actionId).toBe("act-1");
    expect(thread.observed).toContain("recorded project data");
    expect(thread.recommended).toContain("Record the purchase");
    expect(thread.approved).toContain("approved");
    expect(thread.happened).toContain("Executed");
    expect(thread.happened).toContain("verified in recorded state");
    expect(thread.gap).toBeNull();

    // The acceptance sentence, human-readable.
    const text = describeThread(thread);
    const order = [
      text.indexOf("Observed:"),
      text.indexOf("Recommended:"),
      text.indexOf("Decision:"),
      text.indexOf("Result:"),
    ];
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));

    // Timeline: chronological, attributed, includes all four steps.
    expect(r.data.timeline.length).toBe(4);
    expect(r.data.timeline.map((e) => e.kind)).toEqual([
      "recommendation",
      "approval_decision",
      "execution",
      "verification",
    ]);
    for (const e of r.data.timeline) {
      expect(e.projectId).toBe("proj-1");
      expect(e.user).toBe("user-1");
      expect(e.at).toBeTruthy();
    }
    expect(r.data.openAlerts.length).toBe(1);
    expect(r.data.openAlerts[0].alertKey).toBe("budget:overrun");
  });

  it("sanitizes legacy rows on READ — secrets cannot leak through the story", async () => {
    seedFullChain();
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stored = JSON.stringify(r.data.timeline);
    expect(stored).not.toContain("legacy-leak");
    expect(stored).toContain("[REDACTED]");
  });

  it("reports missing links honestly — prepared but never decided", async () => {
    db.actions.push({
      id: "act-2",
      kind: "confirm_stage_completion",
      what: 'Mark "Foundation" complete',
      why: "Evidence provided by the user.",
      recommendation_summary: 'Confirm completion of the "Foundation" stage.',
      state: "prepared",
      executed_at: null,
      verified_at: null,
      execution_result: null,
      created_at: T1,
    });
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const thread = r.data.threads[0];
    expect(thread.approved).toBeNull();
    expect(thread.happened).toBeNull();
    expect(thread.gap).toBe(
      "No approval decision is recorded for this action.",
    );
    const text = describeThread(thread);
    expect(text).toContain("Decision: not recorded");
    expect(text).toContain("Result: not recorded");
  });

  it("reports approved-but-never-executed and executed-but-unverified gaps", async () => {
    db.actions.push(
      {
        id: "act-3",
        kind: "record_purchase",
        what: 'Record "Paint" purchase',
        why: "Purchase evidence provided.",
        recommendation_summary: null,
        state: "approved",
        executed_at: null,
        verified_at: null,
        execution_result: null,
        created_at: T1,
      },
      {
        id: "act-4",
        kind: "record_purchase",
        what: 'Record "Nails" purchase',
        why: "Purchase evidence provided.",
        recommendation_summary: "Record the purchase.",
        state: "executed",
        executed_at: T3,
        verified_at: null,
        execution_result: {
          outcome: "succeeded",
          summary: "purchase recorded",
        },
        created_at: T1,
      },
    );
    db.approvals.push(
      {
        id: "appr-3",
        action_id: "act-3",
        state: "approved",
        requested_at: T1,
        decided_at: T2,
        decided_by: "user-1",
      },
      {
        id: "appr-4",
        action_id: "act-4",
        state: "approved",
        requested_at: T1,
        decided_at: T2,
        decided_by: "user-1",
      },
    );
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [t3, t4] = r.data.threads;
    expect(t3.gap).toBe(
      "The action was approved but no execution is recorded.",
    );
    expect(t4.happened).toContain("verification not recorded");
    expect(t4.gap).toBe(
      "Execution succeeded but was not verified in recorded state.",
    );
  });

  it("reports failed executions with the honest reason", async () => {
    db.actions.push({
      id: "act-5",
      kind: "record_purchase",
      what: 'Record "Steel" purchase',
      why: "Purchase evidence provided.",
      recommendation_summary: "Record the purchase.",
      state: "failed",
      executed_at: T3,
      verified_at: null,
      execution_result: {
        outcome: "failed",
        failureReason: "The material line was already purchased (recorded).",
      },
      created_at: T1,
    });
    db.approvals.push({
      id: "appr-5",
      action_id: "act-5",
      state: "approved",
      requested_at: T1,
      decided_at: T2,
      decided_by: "user-1",
    });
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.data.threads[0];
    expect(t.happened).toContain("Execution failed");
    expect(t.happened).toContain("already purchased");
  });

  it("empty project → an empty, honest story (no invented entries)", async () => {
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.timeline).toEqual([]);
    expect(r.data.threads).toEqual([]);
    expect(r.data.openAlerts).toEqual([]);
    expect(r.data.summary).toContain("0 recorded activity");
  });

  it("unreadable project (RLS) → project_not_found", async () => {
    db.projects = []; // not visible — indistinguishable from non-existent
    const r = await getProjectStory("proj-1", T4);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("project_not_found");
  });
});

// ---------------------------------------------------------
// Audited memory — fact writes enter the trail.
// ---------------------------------------------------------
describe("recordAuditedFact — memory changes are never invisible (§Stage 10)", () => {
  it("persists the fact AND records an activity entry for it", async () => {
    const fact: AgentFact = {
      id: "f1",
      key: "site_access_notes",
      value: "Gate code available from caretaker",
      dataClass: "user_provided",
      source: "user",
      observedAt: T1,
    };
    const r = await recordAuditedFact("proj-1", fact, T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.factKey).toBe("site_access_notes");

    // The memory row was written.
    expect(db.memory.length).toBe(1);
    // The trail entry was written, with the fact key in its payload.
    expect(db.activity.length).toBe(1);
    const entry = db.activity[0];
    expect(entry.kind).toBe("observation");
    expect((entry.payload as Row).factKey).toBe("site_access_notes");
    expect(entry.summary).toContain("site_access_notes");
  });

  it("refuses (and does not audit) a fact the trust boundary rejects", async () => {
    // First record a verified fact.
    await recordFact(
      "proj-1",
      {
        id: "f1",
        key: "total_budget",
        value: 1_000_000,
        dataClass: "verified",
        source: "calculation engine",
        observedAt: T1,
      },
      T1,
    );
    // Now try to overwrite it with an assumption via the audited path.
    const r = await recordAuditedFact(
      "proj-1",
      {
        id: "f2",
        key: "total_budget",
        value: 500_000,
        dataClass: "assumption",
        source: "user",
        observedAt: T2,
      },
      T2,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid_state");
    // The refusal produced NO new activity entry — refusals of
    // writes are not themselves memory observations.
    expect(db.activity.length).toBe(0);
  });
});
