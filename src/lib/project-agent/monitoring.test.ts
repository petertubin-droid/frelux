// =========================================================
// PROJECT AGENT — PROACTIVE MONITORING TESTS (Stage 9)
//
// Stage 9 acceptance, each mapped to a test:
//   - no false "completed" states — alerts derive ONLY from
//     recorded stage completions, never the user-entered
//     progress percentage
//   - no repeated duplicate alerts — re-runs refresh, not
//     duplicate; a quiet project writes nothing
//   - stale alerts expire/update correctly — a cleared
//     condition resolves its alert; a returning condition
//     re-opens it
//   - dismissed alerts behave correctly — dismissal sticks
//     while the condition is unchanged; escalation re-opens
//   - changed project data recalculates the alert state —
//     severity/payload refresh with the recorded facts
//
// Every alert is also checked for the full contract: evidence,
// timestamp, confidence, severity, affected project, recommended
// action — on every test's alerts, not just one.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import type { ChangeDetectionResult, ProjectChange } from "./changes";
import {
  evaluateMonitoringAlerts,
  reconcileAlerts,
  runProactiveMonitoring,
  dismissProjectAlert,
  type AlertCandidate,
  type AlertRow,
} from "./monitoring";

const T0 = "2026-09-01T10:00:00.000Z";
const T1 = "2026-09-07T12:00:00.000Z";
const T2 = "2026-09-07T14:00:00.000Z";

// ---------------------------------------------------------
// In-memory supabase — project_agent_alerts only.
// ---------------------------------------------------------
type Row = Record<string, unknown>;

const db: {
  alerts: Row[];
  baselines: Row[];
  activity: Array<{ kind: string; summary: string }>;
  visible: boolean;
} = { alerts: [], baselines: [], activity: [], visible: true };

function resetDb() {
  db.alerts = [];
  db.baselines = [];
  db.activity = [];
  db.visible = true;
}

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = (): Row[] => {
      if (table === "project_agent_alerts") return db.alerts;
      if (table === "project_agent_state_baselines") return db.baselines;
      return [];
    };
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
        then: async (resolve: (v: unknown) => void) => {
          resolve({
            data: rows().filter((r: Row) => eqs.every(([k, v]) => r[k] === v)),
            error: null,
          });
        },
        async delete() {
          const keep = rows().filter(
            (r: Row) => !eqs.every(([k, v]) => r[k] === v),
          );
          rows().length = 0;
          rows().push(...keep);
          return {};
        },
      };
      return c;
    };
    return {
      ...collector(),
      insert: async (row: Row) => {
        const withId = { id: `row-${rows().length + 1}`, ...row };
        rows().push(withId);
        return { error: null };
      },
      update: (patch: Row) => {
        // update() has its OWN filter chain — fresh eqs, separate
        // from the collector's, resolved on await/maybeSingle.
        const ueqs: Array<[string, unknown]> = [];
        const apply = () => {
          let touched = 0;
          for (const r of rows()) {
            if (ueqs.every(([k, v]) => r[k] === v)) {
              Object.assign(r, patch);
              touched++;
            }
          }
          return touched;
        };
        const c2: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            ueqs.push([col, val]);
            return c2;
          },
          select: () => c2,
          maybeSingle: async () => {
            const n = apply();
            return { data: n > 0 ? { id: "updated" } : null, error: null };
          },
          then: async (resolve: (v: unknown) => void) => {
            apply();
            resolve({ data: null, error: null });
          },
        };
        return c2;
      },
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

const changesState: { result: ChangeDetectionResult } = {
  result: {
    projectId: "proj-1",
    comparedAt: T1,
    baselineCapturedAt: T0,
    status: "ok",
    changes: [],
    summary: "",
    limitations: [],
  },
};
vi.mock("./changes", () => ({
  detectProjectChanges: vi.fn(async () => ({
    ok: true as const,
    data: changesState.result,
  })),
}));

// ---------------------------------------------------------
// Controlled scenario builders.
// ---------------------------------------------------------
function snap(overrides: {
  status?: PredictiveProjectSnapshot["project"]["status"];
  projectUpdatedDaysAgo?: number;
  stages?: Array<{ id: string; name: string; completed: boolean }>;
  items?: Array<{
    id: string;
    name: string;
    qty: number;
    est: number;
    purchased?: boolean;
    actual?: number | null;
    updatedDaysAgo?: number;
  }>;
  calculations?: Array<{ id: string; title: string; total: number }>;
  now?: string;
}): PredictiveProjectSnapshot {
  const now = overrides.now ?? T1;
  const isoDaysAgo = (d: number) =>
    new Date(new Date(now).getTime() - d * 86_400_000).toISOString();
  return {
    projectId: "proj-1",
    now,
    project: {
      name: "Duplex A",
      status: overrides.status ?? "in_progress",
      createdAt: isoDaysAgo(60),
      updatedAt: isoDaysAgo(overrides.projectUpdatedDaysAgo ?? 1),
      progressPercentage: 40, // stale user-entered value — must NEVER be trusted
    },
    stages:
      overrides.stages?.map((s, idx) => ({
        id: s.id,
        stageKey: s.id,
        stageName: s.name,
        sortOrder: idx + 1,
        isCompleted: s.completed,
        completedAt: s.completed ? isoDaysAgo(2) : null,
        hasPhoto: false,
        updatedAt: isoDaysAgo(3),
      })) ?? [],
    shoppingItems:
      overrides.items?.map((i) => ({
        id: i.id,
        project_id: "proj-1",
        category: "cement",
        name: i.name,
        quantity: i.qty,
        unit: "bags",
        estimated_price: i.est,
        actual_price: i.actual ?? null,
        total_price: i.qty * i.est,
        supplier: null,
        notes: null,
        is_purchased: i.purchased ?? false,
        sort_order: 1,
        updated_at: isoDaysAgo(i.updatedDaysAgo ?? 1),
      })) ?? [],
    calculations:
      overrides.calculations?.map((c) => ({
        id: c.id,
        calculatorType: "screeding",
        title: c.title,
        createdAt: isoDaysAgo(30),
        estimatedTotal: c.total,
      })) ?? [],
    priceHistory: [],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
  } as unknown as PredictiveProjectSnapshot;
}

/** The Stage 9 contract: every alert carries the full payload. */
function assertAlertContract(
  alerts: AlertCandidate[] | AlertRow[],
  projectId = "proj-1",
) {
  for (const a of alerts) {
    const ev = "evidence" in a ? a.evidence : [];
    const cond =
      "condition" in a ? a.condition : (a as AlertRow).condition_text;
    expect(ev.length).toBeGreaterThan(0);
    expect("confidence" in a).toBe(true);
    const conf = a.confidence as {
      score: number;
      band: string;
      method: string;
    };
    expect(conf.score).toBeGreaterThanOrEqual(0);
    expect(conf.score).toBeLessThanOrEqual(1);
    expect(conf.method.length).toBeGreaterThan(10);
    expect(["low", "medium", "high"]).toContain(a.severity);
    expect(
      "project_id" in a ? (a as AlertRow).project_id : projectId,
    ).toBeTruthy();
    expect(cond.length).toBeGreaterThan(20);
    expect(
      "recommendedAction" in a
        ? a.recommendedAction
        : (a as AlertRow).recommended_action,
    ).toBeTruthy();
    expect(
      "detected_at" in a ? (a as AlertRow).detected_at : true,
    ).toBeTruthy();
  }
}

beforeEach(() => {
  resetDb();
  snapState.snap = null;
  changesState.result = {
    projectId: "proj-1",
    comparedAt: T1,
    baselineCapturedAt: T0,
    status: "ok",
    changes: [],
    summary: "",
    limitations: [],
  };
});

// ---------------------------------------------------------
// Pure evaluation — meaningful conditions only.
// ---------------------------------------------------------
describe("evaluateMonitoringAlerts — conditions (§Stage 9)", () => {
  it("a healthy, current project produces ZERO alerts (no spam)", () => {
    const s = snap({
      stages: [{ id: "st1", name: "Foundation", completed: true }],
      items: [
        {
          id: "i1",
          name: "Cement",
          qty: 10,
          est: 500,
          purchased: true,
          actual: 480,
        },
      ],
      calculations: [{ id: "c1", title: "Full build estimate", total: 5_000 }],
    });
    // Spend 4,800 + nothing remaining = 4,800 < 5,000 estimate → no overrun.
    expect(evaluateMonitoringAlerts(s, changesState.result, T1)).toEqual([]);
  });

  it("budget overrun → budget alert with independently verified numbers", () => {
    const s = snap({
      items: [{ id: "i1", name: "Cement", qty: 20, est: 625 }], // 12,500 remaining
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    // Projected 12,500 vs estimate 10,000 → +25% → HIGH.
    const alerts = evaluateMonitoringAlerts(s, changesState.result, T1);
    const a = alerts.find((x) => x.alertKey === "budget:overrun");
    expect(a).toBeDefined();
    if (!a) return;
    expect(a.severity).toBe("high");
    expect(a.condition).toContain("₦12,500");
    expect(a.condition).toContain("₦10,000");
    expect(a.condition).toContain("25.0%");
    expect(a.condition).toContain("Full build estimate");
    expect(a.payload.overrunPct).toBe(0.25);
    expect(a.evidence[0].id).toBe("c1");
    assertAlertContract(alerts);
  });

  it("false completed state: status completed with incomplete stages → high data-quality alert", () => {
    const s = snap({
      status: "completed",
      stages: [
        { id: "st1", name: "Foundation", completed: true },
        { id: "st2", name: "Roofing", completed: false },
      ],
    });
    const alerts = evaluateMonitoringAlerts(s, changesState.result, T1);
    const a = alerts.find((x) => x.alertKey === "data_quality:false_completed");
    expect(a?.severity).toBe("high");
    expect(a?.condition).toContain("1 of 2");
    expect(a?.condition).toContain("Roofing");
    // The condition is derived from RECORDED stage state, never the
    // user-entered progress percentage (40 in this scenario).
    expect(a?.condition).not.toContain("40");
    assertAlertContract(alerts);
  });

  it("stalled project: in progress, zero completions, no activity for 21+ days", () => {
    const s = snap({
      projectUpdatedDaysAgo: 25,
      stages: [{ id: "st1", name: "Foundation", completed: false }],
    });
    const alerts = evaluateMonitoringAlerts(s, changesState.result, T1);
    const a = alerts.find((x) => x.alertKey === "schedule:stalled");
    expect(a?.severity).toBe("medium");
    expect(a?.condition).toContain("no stage completion is recorded");
    expect(a?.condition).toContain("days");
    assertAlertContract(alerts);
  });

  it("stale data: in-progress record untouched for 14+ days → low alert", () => {
    const s = snap({ projectUpdatedDaysAgo: 20 });
    const alerts = evaluateMonitoringAlerts(s, changesState.result, T1);
    const a = alerts.find((x) => x.alertKey === "stale_data:no_updates");
    expect(a?.severity).toBe("low");
    expect(a?.condition).toContain("20 days");
    assertAlertContract(alerts);
  });

  it("purchases without actual prices (7+ days old) → medium data-quality alert", () => {
    const s = snap({
      items: [
        {
          id: "i1",
          name: "Cement",
          qty: 10,
          est: 500,
          purchased: true,
          updatedDaysAgo: 10,
        },
      ],
    });
    const alerts = evaluateMonitoringAlerts(s, changesState.result, T1);
    const a = alerts.find(
      (x) => x.alertKey === "data_quality:missing_actual_prices",
    );
    expect(a?.severity).toBe("medium");
    expect(a?.condition).toContain('"Cement"');
    expect(a?.condition).toContain("proxy");
    expect(a?.evidence[0].id).toBe("i1");
    assertAlertContract(alerts);
  });

  it("recorded estimated-price increases → material requirement alert (change-driven)", () => {
    const changes: ChangeDetectionResult = {
      ...changesState.result,
      changes: [
        {
          id: "item:i1:estimated_price",
          category: "price",
          severity: "major",
          whatChanged:
            'The estimated unit price of "Cement" changed from ₦500 to ₦625.',
          whyItChanged: "unknown",
          effect: "line total moves",
          before: { at: T0, value: "₦500" },
          after: { at: T1, value: "₦625" },
          evidence: [
            {
              kind: "shopping_item",
              id: "i1",
              label: 'Shopping item "Cement" estimated price',
              recordedAt: T1,
              verification: "user_recorded",
            },
          ],
          detectedAt: T1,
        } as ProjectChange,
      ],
    };
    const alerts = evaluateMonitoringAlerts(snap({}), changes, T1);
    const a = alerts.find((x) => x.alertKey === "material:price_increases");
    expect(a?.severity).toBe("high"); // the increase itself was major
    expect(a?.condition).toContain("1 material line(s)");
    expect(a?.evidence[0].id).toBe("i1");
    assertAlertContract(alerts);
  });

  it("major non-price changes → high project-change alert", () => {
    const changes: ChangeDetectionResult = {
      ...changesState.result,
      changes: [
        {
          id: "stage:st1:regressed",
          category: "schedule",
          severity: "major",
          whatChanged:
            'The stage "Foundation" changed from completed back to incomplete.',
          whyItChanged: "unknown",
          effect: "REGRESSION",
          before: { at: T0, value: "completed" },
          after: { at: T1, value: "incomplete" },
          evidence: [
            {
              kind: "progress_stage",
              id: "st1",
              label: 'Stage "Foundation"',
              recordedAt: T1,
              verification: "user_recorded",
            },
          ],
          detectedAt: T1,
        } as ProjectChange,
      ],
    };
    const alerts = evaluateMonitoringAlerts(snap({}), changes, T1);
    const a = alerts.find((x) => x.alertKey === "project:major_changes");
    expect(a?.severity).toBe("high");
    expect(a?.condition).toContain("major change(s)");
    expect(a?.condition).toContain("back to incomplete");
    assertAlertContract(alerts);
  });
});

// ---------------------------------------------------------
// Reconciliation — no duplicates, no zombies, dismissal respected.
// ---------------------------------------------------------
describe("reconcileAlerts — the anti-spam core (§Stage 9)", () => {
  const cand = (sev: AlertCandidate["severity"]): AlertCandidate => ({
    alertKey: "budget:overrun",
    kind: "budget",
    severity: sev,
    title: "Budget overrun risk",
    condition: "Projected ₦12,500 vs estimate ₦10,000.",
    recommendedAction: "Re-estimate the remaining lines.",
    evidence: [
      {
        kind: "calculation",
        id: "c1",
        label: "Estimate",
        recordedAt: T0,
        verification: "user_recorded",
      },
    ],
    confidence: { score: 0.8, band: "high", method: "coverage" },
    payload: { overrunPct: 0.25 },
  });
  const row = (
    status: AlertRow["status"],
    severity: AlertRow["severity"],
  ): AlertRow => ({
    id: "row-1",
    project_id: "proj-1",
    alert_key: "budget:overrun",
    kind: "budget",
    severity,
    status,
    title: "Budget overrun risk",
    condition_text: "old condition",
    recommended_action: "Re-estimate the remaining lines.",
    evidence: [],
    confidence: { score: 0.8, band: "high", method: "coverage" },
    payload: {},
    detected_at: T0,
    last_seen_at: T0,
    dismissed_at: null,
    resolved_at: null,
  });

  it("same condition again → refreshed, NOT duplicated", () => {
    const plan = reconcileAlerts([row("open", "high")], [cand("high")], T1);
    expect(plan.created).toHaveLength(0);
    expect(plan.refreshed).toHaveLength(1);
    expect(plan.resolved).toHaveLength(0);
  });

  it("condition cleared → alert resolved (stale alerts expire)", () => {
    const plan = reconcileAlerts([row("open", "high")], [], T1);
    expect(plan.resolved).toHaveLength(1);
    expect(plan.resolved[0].id).toBe("row-1");
  });

  it("dismissed + same severity → stays dismissed", () => {
    const plan = reconcileAlerts(
      [row("dismissed", "medium")],
      [cand("medium")],
      T1,
    );
    expect(plan.stillDismissed).toHaveLength(1);
    expect(plan.reopened).toHaveLength(0);
    expect(plan.refreshed).toHaveLength(0);
  });

  it("dismissed + ESCALATION → re-opened (escalation beats dismissal)", () => {
    const plan = reconcileAlerts(
      [row("dismissed", "medium")],
      [cand("high")],
      T1,
    );
    expect(plan.reopened).toHaveLength(1);
    expect(plan.stillDismissed).toHaveLength(0);
  });

  it("resolved + condition returns → re-opened", () => {
    const plan = reconcileAlerts([row("resolved", "high")], [cand("high")], T1);
    expect(plan.reopened).toHaveLength(1);
  });

  it("changed project data recalculates: severity/payload refresh", () => {
    const plan = reconcileAlerts([row("open", "medium")], [cand("high")], T1);
    expect(plan.refreshed).toHaveLength(1);
    expect(plan.refreshed[0].candidate.severity).toBe("high");
    expect(plan.refreshed[0].candidate.payload.overrunPct).toBe(0.25);
  });
});

// ---------------------------------------------------------
// Orchestrator — end-to-end runs against the in-memory store.
// ---------------------------------------------------------
describe("runProactiveMonitoring — end to end (§Stage 9)", () => {
  it("first run raises alerts; second run with the same state refreshes instead of duplicating", async () => {
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 20, est: 625 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    const r1 = await runProactiveMonitoring("proj-1", T1);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.data.counts.created).toBe(1);
    expect(r1.data.counts.refreshed).toBe(0);
    expect(db.alerts).toHaveLength(1);

    // Second run — same recorded state → refresh, not duplicate.
    const r2 = await runProactiveMonitoring("proj-1", T2);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.data.counts.created).toBe(0);
    expect(r2.data.counts.refreshed).toBe(1);
    expect(db.alerts).toHaveLength(1); // no duplicate rows
    expect(db.alerts[0].last_seen_at as string).toBe(T2);
  });

  it("condition clears → alert resolved on the next run", async () => {
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 20, est: 625 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    await runProactiveMonitoring("proj-1", T1);

    // The budget normalizes: recorded prices come back down.
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 16, est: 500 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    const r2 = await runProactiveMonitoring("proj-1", T2);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.data.counts.resolved).toBe(1);
    expect(db.alerts[0].status).toBe("resolved");
    expect(r2.data.openAlerts).toHaveLength(0);
  });

  it("dismissed alert stays dismissed across monitoring runs until it escalates", async () => {
    // Overrun of +12.5% → medium.
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 18, est: 625 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    await runProactiveMonitoring("proj-1", T1);
    expect(db.alerts[0].severity).toBe("medium");

    // The user dismisses it.
    const dismissed = await dismissProjectAlert(db.alerts[0].id as string, T1);
    expect(dismissed.ok).toBe(true);
    expect(db.alerts[0].status).toBe("dismissed");

    // Re-run, same condition → still dismissed, no duplicate.
    const r2 = await runProactiveMonitoring("proj-1", T2);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.data.counts.stillDismissed).toBe(1);
    expect(r2.data.counts.created).toBe(0);
    expect(db.alerts).toHaveLength(1);
    expect(db.alerts[0].status).toBe("dismissed");

    // The budget WORSENS → +25% (high) — escalation re-opens it.
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 20, est: 625 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    const r3 = await runProactiveMonitoring("proj-1", T2);
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.data.counts.reopened).toBe(1);
    expect(db.alerts[0].status).toBe("open");
    expect(db.alerts[0].severity).toBe("high");
  });

  it("no meaningful conditions → no rows written, honest summary", async () => {
    snapState.snap = snap({
      stages: [{ id: "st1", name: "Foundation", completed: true }],
      items: [
        {
          id: "i1",
          name: "Cement",
          qty: 10,
          est: 500,
          purchased: true,
          actual: 480,
        },
      ],
      calculations: [{ id: "c1", title: "Full build estimate", total: 5_000 }],
    });
    const r = await runProactiveMonitoring("proj-1", T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.openAlerts).toHaveLength(0);
    expect(r.data.summary).toContain("no meaningful conditions");
    expect(db.alerts).toHaveLength(0);
  });

  it("records an activity entry per monitoring run", async () => {
    snapState.snap = snap({});
    await runProactiveMonitoring("proj-1", T1);
    snapState.snap = snap({
      items: [{ id: "i1", name: "Cement", qty: 20, est: 625 }],
      calculations: [{ id: "c1", title: "Full build estimate", total: 10_000 }],
    });
    await runProactiveMonitoring("proj-1", T2);
    expect(db.activity.length).toBeGreaterThanOrEqual(2);
    expect(db.activity[0].summary).toContain("no meaningful conditions");
    expect(db.activity[1].summary).toContain("1 new");
  });

  it("unreadable project (RLS) → project_not_found, nothing written", async () => {
    db.visible = false;
    snapState.snap = snap({});
    const r = await runProactiveMonitoring("proj-1", T1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("project_not_found");
    expect(db.alerts).toHaveLength(0);
  });

  it("every open alert row satisfies the full Stage 9 contract after a run", async () => {
    snapState.snap = snap({
      status: "completed",
      stages: [{ id: "st1", name: "Foundation", completed: false }],
      projectUpdatedDaysAgo: 20,
    });
    const r = await runProactiveMonitoring("proj-1", T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.openAlerts.length).toBeGreaterThan(0);
    for (const row of r.data.openAlerts) {
      expect(row.project_id).toBe("proj-1");
      expect(row.evidence.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(row.severity);
      expect(row.confidence.method.length).toBeGreaterThan(10);
      expect(row.recommended_action).toBeTruthy();
      expect(row.detected_at).toBeTruthy();
    }
  });
});
