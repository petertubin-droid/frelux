// =========================================================
// PROJECT AGENT, GUIDANCE TESTS (Stage 5)
//
// Acceptance:
//   - All 8 supported questions are answered from recorded state.
//   - Answers CHANGE when project data changes (deterministic
//     projection: same data → same answer, changed data →
//     changed answer).
//   - Nothing invented: no progress, purchases or site
//     conditions are assumed; items cite recorded evidence.
//   - Insufficient recorded data → INSUFFICIENT DATA answer.
//   - Natural-language question classification is deterministic.
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

const NOW = "2026-09-07T12:00:00Z";

// ---------------------------------------------------------
// Fixture state, recorded project state under our control
// ---------------------------------------------------------
const fx = {
  snapshot: null as Record<string, unknown> | null,
  analysis: null as Record<string, unknown> | null,
  gaps: [] as Array<{ area: string; key: string; reason: string }>,
  conflicts: [] as Array<{ key: string; description: string; resolution: string }>,
};

function makeSnapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    projectId: "proj-1",
    now: NOW,
    project: { name: "Ibadan Duplex", status: "in_progress", createdAt: "2026-06-01T00:00:00Z", updatedAt: NOW, progressPercentage: 40 },
    stages: [
      { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-07-01T00:00:00Z", hasPhoto: true, updatedAt: "2026-07-01T00:00:00Z" },
      { id: "st2", stageKey: "block", stageName: "Block work", sortOrder: 2, isCompleted: false, completedAt: null, hasPhoto: false, updatedAt: "2026-09-01T00:00:00Z" },
      { id: "st3", stageKey: "roof", stageName: "Roofing", sortOrder: 3, isCompleted: false, completedAt: null, hasPhoto: false, updatedAt: "2026-09-01T00:00:00Z" },
    ],
    shoppingItems: [
      { id: "s1", category: "Masonry", name: "Cement", quantity: 100, unit: "bags", estimated_price: 5500, actual_price: null, total_price: 550000, supplier: "Dangote depot", notes: null, is_purchased: false, sort_order: 1 },
      { id: "s2", category: "Masonry", name: "Sharp sand", quantity: 20, unit: "trips", estimated_price: 18000, actual_price: null, total_price: 360000, supplier: null, notes: null, is_purchased: false, sort_order: 2 },
    ],
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

function makeAnalysis(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    projectId: "proj-1",
    generatedAt: NOW,
    inputHash: "h",
    dataQuality: { rating: "fair", reason: "", coverage: [] },
    predictions: [],
    risks: [],
    recommendations: [],
    health: { score: 70, band: "fair" },
    scenarios: [],
    limitations: [],
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
      return { ok: false, error: { code: "project_not_found" as const, message: "nope" } };
    }
    return {
      ok: true,
      data: {
        projectId,
        generatedAt: nowIso,
        items: [],
        gaps: fx.gaps,
        conflicts: fx.conflicts,
        region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
        dataQuality: null,
        analysis: fx.analysis,
      },
    };
  }),
}));

import {
  buildGuidance,
  classifyGuidanceQuestion,
  GUIDANCE_QUESTIONS,
} from "./guidance";

beforeEach(() => {
  fx.snapshot = makeSnapshot();
  fx.analysis = makeAnalysis();
  fx.gaps = [];
  fx.conflicts = [];
});

// Real Stage-4 engine runs over the same fixtures, guidance is a
// pure projection, so no extra mocking of buildRecommendations.

// ---------------------------------------------------------
// Question classification
// ---------------------------------------------------------
describe("classifyGuidanceQuestion", () => {
  it("maps all the spec's phrasings deterministically", () => {
    expect(classifyGuidanceQuestion("What should I do next?")).toBe("what_next");
    expect(classifyGuidanceQuestion("What is blocking my project?")).toBe("blockers");
    expect(classifyGuidanceQuestion("What information is missing?")).toBe("missing_info");
    expect(classifyGuidanceQuestion("What should I buy next?")).toBe("what_to_buy");
    expect(classifyGuidanceQuestion("What is putting my budget at risk?")).toBe("budget_risk");
    expect(classifyGuidanceQuestion("Are we behind schedule?")).toBe("schedule");
    expect(classifyGuidanceQuestion("What should I verify?")).toBe("what_to_verify");
    expect(classifyGuidanceQuestion("What should I prepare before the next construction stage?")).toBe("prepare_next_stage");
  });

  it("returns null for unsupported questions, no guess", () => {
    expect(classifyGuidanceQuestion("How many bags of cement do I need?")).toBeNull();
    expect(classifyGuidanceQuestion("")).toBeNull();
  });

  it("covers every supported question in GUIDANCE_QUESTIONS", () => {
    expect(GUIDANCE_QUESTIONS).toHaveLength(8);
    for (const q of GUIDANCE_QUESTIONS) {
      expect(classifyGuidanceQuestion(
        { what_next: "what next", blockers: "what is blocking", missing_info: "what information is missing",
          what_to_buy: "what to buy next", budget_risk: "budget at risk", schedule: "behind schedule?",
          what_to_verify: "what to verify", prepare_next_stage: "prepare for next stage" }[q],
      )).toBe(q);
    }
  });
});

// ---------------------------------------------------------
// All 8 questions answered from recorded state
// ---------------------------------------------------------
describe("realistic project state, all questions", () => {
  it("what_next: answers from the recorded state with traceable items", async () => {
    fx.analysis = makeAnalysis({
      risks: [{
        id: "risk-1", category: "Cost", severity: "high", probability: null,
        title: "Budget at risk",
        evidence: [{ kind: "shopping_item", label: "Recorded spend exceeds pace", recordedAt: "2026-09-01T00:00:00Z", verification: "user_recorded" }],
        affectedArea: "budget", recommendedAction: "Re-estimate remaining purchases",
        confidence: { score: 0.8, band: "high", method: "m" },
        status: "open", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z",
      }],
      recommendations: [{
        riskId: "risk-1", observation: "obs", analysis: "analysis", recommendation: "Re-estimate now",
        confidence: { score: 0.8, band: "high", method: "m" }, basedOnRisk: "budget",
      }],
    });
    const res = await buildGuidance("proj-1", "what_next", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("ok");
    expect(res.data.items[0].action).toBe("Re-estimate now");
    expect(res.data.items[0].source).toContain("risk-register");
    expect(res.data.items[0].evidence[0]).toContain("Recorded spend");
  });

  it("what_to_buy: lists unpurchased recorded lines in order", async () => {
    const res = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items).toHaveLength(2);
    expect(res.data.items[0].action).toContain("100 bags of Cement");
    expect(res.data.items[0].action).toContain("₦550,000");
    expect(res.data.items[1].action).toContain("Sharp sand");
  });

  it("missing_info: reports recorded gaps", async () => {
    fx.gaps = [{ area: "measurements", key: "footprint", reason: "no building model recorded" }];
    const res = await buildGuidance("proj-1", "missing_info", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items[0].action).toContain("no building model recorded");
  });

  it("blockers: high-severity conditions become blockers, honestly", async () => {
    fx.analysis = makeAnalysis({
      risks: [{
        id: "risk-1", category: "Schedule", severity: "high", probability: null,
        title: "Block work behind",
        evidence: [{ kind: "progress_stage", label: "Block work pending since Sep 1", recordedAt: "2026-09-01T00:00:00Z", verification: "user_recorded" }],
        affectedArea: "schedule", recommendedAction: "Mobilise block work crew",
        confidence: { score: 0.7, band: "high", method: "m" },
        status: "open", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z",
      }],
    });
    const res = await buildGuidance("proj-1", "blockers", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].action).toBe("Mobilise block work crew");
  });

  it("schedule: reports recorded stage progress and predictions", async () => {
    fx.analysis = makeAnalysis({
      predictions: [{
        kind: "schedule_risk", status: "ok",
        prediction: "At the recorded pace, block work will finish around Oct 1.",
        result: { days: 24 }, evidence: [], inputs: [], assumptions: [],
        freshness: "current", confidence: { score: 0.7, band: "high", method: "m" },
        limitations: [], missingData: [], generatedAt: NOW,
      }],
    });
    const res = await buildGuidance("proj-1", "schedule", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const text = JSON.stringify(res.data);
    expect(text).toContain("1/3");
    expect(text).toContain("Block work: pending");
    expect(text).toContain("Oct 1");
    expect(res.data.headline).toContain("No schedule risk is recorded");
  });

  it("budget_risk: includes cost predictions verbatim", async () => {
    fx.analysis = makeAnalysis({
      predictions: [{
        kind: "cost_overrun", status: "ok",
        prediction: "Recorded spend pace exceeds the recorded budget by 12%.",
        result: { pct: 12 }, evidence: [], inputs: [], assumptions: [],
        freshness: "current", confidence: { score: 0.8, band: "high", method: "m" },
        limitations: [], missingData: [], generatedAt: NOW,
      }],
    });
    const res = await buildGuidance("proj-1", "budget_risk", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items.some((i) => i.action).valueOf()).toBe(true);
    expect(JSON.stringify(res.data)).toContain("12%");
  });

  it("what_to_verify: undated completions and unverified evidence", async () => {
    fx.snapshot = makeSnapshot({
      stages: [
        { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: null, hasPhoto: false, updatedAt: "2026-07-01T00:00:00Z" },
      ],
    });
    fx.analysis = makeAnalysis({
      risks: [{
        id: "risk-1", category: "Cost", severity: "medium", probability: null,
        title: "Cost drift",
        evidence: [{ kind: "shopping_item", label: "Cement price unconfirmed", recordedAt: null, verification: "unverified" }],
        affectedArea: "budget", recommendedAction: "Confirm prices",
        confidence: { score: 0.5, band: "medium", method: "m" },
        status: "open", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
      }],
    });
    const res = await buildGuidance("proj-1", "what_to_verify", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const text = JSON.stringify(res.data.items);
    expect(text).toContain("no recorded date");
    expect(text).toContain("Cement price unconfirmed");
  });

  it("prepare_next_stage: next stage + outstanding materials + gaps", async () => {
    fx.gaps = [{ area: "documents", key: "plan", reason: "no approved plan uploaded" }];
    const res = await buildGuidance("proj-1", "prepare_next_stage", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.headline).toContain("Block work");
    const text = JSON.stringify(res.data.items);
    expect(text).toContain("2 unpurchased material line(s)");
    expect(text).toContain("not stage-tagged");
    expect(text).toContain("no approved plan uploaded");
  });
});

// ---------------------------------------------------------
// ACCEPTANCE: recommendations change when project data changes
// ---------------------------------------------------------
describe("answers change when project data changes", () => {
  it("what_to_buy changes when a line is purchased", async () => {
    const before = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(before.ok && before.data.items).toHaveLength(2);

    // Record the purchase of one line.
    fx.snapshot = makeSnapshot({
      shoppingItems: [
        { id: "s1", category: "Masonry", name: "Cement", quantity: 100, unit: "bags", estimated_price: 5500, actual_price: 5500, total_price: 550000, supplier: "Dangote depot", notes: null, is_purchased: true, sort_order: 1 },
        { id: "s2", category: "Masonry", name: "Sharp sand", quantity: 20, unit: "trips", estimated_price: 18000, actual_price: null, total_price: 360000, supplier: null, notes: null, is_purchased: false, sort_order: 2 },
      ],
    });
    const after = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(after.ok && after.data.items).toHaveLength(1);
    expect(after.ok && after.data.items[0].action).toContain("Sharp sand");

    // Purchase everything → nothing left to buy.
    fx.snapshot = makeSnapshot({
      shoppingItems: [
        { id: "s1", category: "Masonry", name: "Cement", quantity: 100, unit: "bags", estimated_price: 5500, actual_price: 5500, total_price: 550000, supplier: null, notes: null, is_purchased: true, sort_order: 1 },
        { id: "s2", category: "Masonry", name: "Sharp sand", quantity: 20, unit: "trips", estimated_price: 18000, actual_price: 18000, total_price: 360000, supplier: null, notes: null, is_purchased: true, sort_order: 2 },
      ],
    });
    const done = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(done.ok && done.data.items).toHaveLength(0);
    expect(done.ok && done.data.headline).toContain("nothing is recorded as still to buy");
  });

  it("prepare_next_stage changes when the next stage is completed", async () => {
    const before = await buildGuidance("proj-1", "prepare_next_stage", NOW);
    expect(before.ok && before.data.headline).toContain('"Block work"');

    // Record Block work as completed.
    fx.snapshot = makeSnapshot({
      stages: [
        { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-07-01T00:00:00Z", hasPhoto: true, updatedAt: "2026-07-01T00:00:00Z" },
        { id: "st2", stageKey: "block", stageName: "Block work", sortOrder: 2, isCompleted: true, completedAt: "2026-09-06T00:00:00Z", hasPhoto: true, updatedAt: "2026-09-06T00:00:00Z" },
        { id: "st3", stageKey: "roof", stageName: "Roofing", sortOrder: 3, isCompleted: false, completedAt: null, hasPhoto: false, updatedAt: "2026-09-06T00:00:00Z" },
      ],
    });
    const after = await buildGuidance("proj-1", "prepare_next_stage", NOW);
    expect(after.ok && after.data.headline).toContain('"Roofing"');

    // Complete all stages → no next stage recorded.
    fx.snapshot = makeSnapshot({
      stages: [
        { id: "st1", stageKey: "foundation", stageName: "Foundation", sortOrder: 1, isCompleted: true, completedAt: "2026-07-01T00:00:00Z", hasPhoto: true, updatedAt: "2026-07-01T00:00:00Z" },
        { id: "st2", stageKey: "block", stageName: "Block work", sortOrder: 2, isCompleted: true, completedAt: "2026-09-06T00:00:00Z", hasPhoto: true, updatedAt: "2026-09-06T00:00:00Z" },
        { id: "st3", stageKey: "roof", stageName: "Roofing", sortOrder: 3, isCompleted: true, completedAt: "2026-09-07T00:00:00Z", hasPhoto: true, updatedAt: "2026-09-07T00:00:00Z" },
      ],
    });
    const done = await buildGuidance("proj-1", "prepare_next_stage", NOW);
    expect(done.ok && done.data.headline).toContain("no next stage recorded");
  });

  it("what_next changes when a risk is resolved (removed from the register)", async () => {
    fx.analysis = makeAnalysis({
      risks: [{
        id: "risk-1", category: "Cost", severity: "high", probability: null,
        title: "Budget at risk",
        evidence: [{ kind: "shopping_item", label: "spend pace high", recordedAt: "2026-09-01T00:00:00Z", verification: "user_recorded" }],
        affectedArea: "budget", recommendedAction: "Re-estimate",
        confidence: { score: 0.8, band: "high", method: "m" },
        status: "open", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
      }],
    });
    const before = await buildGuidance("proj-1", "what_next", NOW);
    expect(before.ok && before.data.items[0].action).toBe("Re-estimate");

    // Risk resolved → register empty → next step falls to stage work.
    fx.analysis = makeAnalysis();
    const after = await buildGuidance("proj-1", "what_next", NOW);
    // The Stage-4 engine's incomplete_task recommendation provides
    // the next step, still grounded in the recorded pending stage.
    expect(after.ok && after.data.items[0].action).toContain("Block work");
    expect(after.ok && after.data.items[0].source).toContain("project_progress_stages");
  });

  it("budget_risk changes when recorded prices increase (procurement evidence appears)", async () => {
    const before = await buildGuidance("proj-1", "budget_risk", NOW);
    const beforeText = JSON.stringify(before.ok ? before.data : {});
    expect(beforeText).not.toContain("actual ₦5,700");

    fx.snapshot = makeSnapshot({
      shoppingItems: [
        { id: "s1", category: "Masonry", name: "Cement", quantity: 100, unit: "bags", estimated_price: 5500, actual_price: 5700, total_price: 550000, supplier: null, notes: null, is_purchased: false, sort_order: 1 },
      ],
    });
    const after = await buildGuidance("proj-1", "budget_risk", NOW);
    const afterText = JSON.stringify(after.ok ? after.data : {});
    expect(afterText).toContain("+3.6%");
  });
});

// ---------------------------------------------------------
// Insufficient data, never fabricated
// ---------------------------------------------------------
describe("insufficient data", () => {
  it("no recorded data → INSUFFICIENT DATA for every question", async () => {
    fx.snapshot = null;
    for (const q of GUIDANCE_QUESTIONS) {
      const res = await buildGuidance("proj-1", q, NOW);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.status).toBe("insufficient_data");
      expect(res.data.items).toHaveLength(0);
      expect(res.data.headline).toContain("INSUFFICIENT DATA");
    }
  });

  it("project isolation is enforced first", async () => {
    const res = await buildGuidance("proj-invisible", "what_next", NOW);
    expect(res.ok).toBe(false);
  });

  it("no shopping list → what_to_buy is INSUFFICIENT DATA, not a guess", async () => {
    fx.snapshot = makeSnapshot({ shoppingItems: [] });
    const res = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("insufficient_data");
    expect(res.data.insufficientData[0]).toContain("no recorded shopping list");
  });

  it("no stages → schedule and prepare_next_stage are INSUFFICIENT DATA", async () => {
    fx.snapshot = makeSnapshot({ stages: [] });
    const sched = await buildGuidance("proj-1", "schedule", NOW);
    expect(sched.ok && sched.data.status).toBe("insufficient_data");
    expect(sched.ok && sched.data.insufficientData[0]).toContain("no progress stages recorded");

    const prep = await buildGuidance("proj-1", "prepare_next_stage", NOW);
    expect(prep.ok && prep.data.status).toBe("insufficient_data");
    expect(prep.ok && prep.data.headline).toContain("unknown");
  });
});

// ---------------------------------------------------------
// No invention, items cite recorded facts only
// ---------------------------------------------------------
describe("no invention", () => {
  it("what_to_buy never invents materials, only recorded lines appear", async () => {
    const res = await buildGuidance("proj-1", "what_to_buy", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    for (const item of res.data.items) {
      expect(item.source).toContain("recorded");
    }
    expect(JSON.stringify(res.data.items)).not.toContain("Rebars");
    expect(JSON.stringify(res.data.items)).not.toContain("Blocks");
  });
});
