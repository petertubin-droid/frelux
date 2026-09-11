import { describe, expect, it } from "vitest";
// =========================================================
// FORENSIC PASS §11 — PLANNING & DECISION-MAKING DEPTH
// The Planner class (native-engine/planning.ts) had ZERO
// direct tests before this file. The engine uses it in the
// research route (plan("researched")) and the project route
// (plan("planned")) — so honest planning is user-visible.
// Attacked here:
//   * goal already satisfied → zero-step executable plan
//   * recursive precondition resolution (means-ends)
//   * honest gap reporting when prerequisites are missing
//     and when NO operator can achieve a goal
//   * cost-ranked operator selection (cheapest first)
//   * depth exhaustion reported honestly
//   * alternatives are REAL operator chains, never fabricated
//   * risk assessment reflects the operators actually chosen
//   * effects are NOT simulated during planning — a step's
//     effects never make a later precondition "magically" hold
// =========================================================

import { Planner, DEFAULT_OPERATORS } from "@studio-shared/archie-ai/native-engine/planning.ts";
import { FactStore } from "@studio-shared/archie-ai/native-engine/knowledge.ts";

async function storeWith(...facts: Array<[string, string, string]>) {
  const store = new FactStore();
  for (const [subject, predicate, object] of facts) {
    await store.assert({
      subject,
      predicate,
      object,
      confidence: 0.9,
      provenance: { source: "owner-taught" },
      status: "validated",
    });
  }
  return store;
}

describe("means-ends planning", () => {
  it("an already-satisfied goal yields an executable zero-step plan", async () => {
    const store = await storeWith(["knowledge", "available", "yes"]);
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("available");
    expect(plan.executable).toBe(true);
    expect(plan.steps).toEqual([]);
    expect(plan.totalCost).toBe(0);
    expect(plan.gapReport).toEqual([]);
  });

  it("recursive precondition resolution: web research needs network authorization first", async () => {
    const store = await storeWith(["network", "authorized", "yes"]);
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("researched");
    expect(plan.executable).toBe(true);
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0]?.operatorId).toBe("op_web_research");
    expect(plan.totalCost).toBe(5);
  });

  it("missing network authorization is REPORTED, not papered over", async () => {
    const store = new FactStore();
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("researched");
    // op_web_research is the only operator achieving "researched"
    // — its precondition cannot be satisfied → not executable
    expect(plan.executable).toBe(false);
    expect(plan.gapReport.join(" ")).toMatch(/network authorized|owner available/);
  });

  it("a goal NO operator achieves is reported honestly as unachievable", async () => {
    const store = new FactStore();
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("teleported");
    expect(plan.executable).toBe(false);
    expect(plan.gapReport.join(" ")).toContain("no registered operator");
  });

  it("depth exhaustion is reported, never silently treated as success", async () => {
    const store = new FactStore();
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("researched", 0);
    expect(plan.executable).toBe(false);
    expect(plan.gapReport.join(" ")).toMatch(/depth exhausted/);
  });

  it("cheaper operators are tried first (cost-ranked selection)", async () => {
    const store = new FactStore();
    const expensive = [
      {
        id: "op_expensive",
        description: "expensive path",
        achieves: { subject: "goal", predicate: "solved" },
        preconditions: [],
        effects: [],
        cost: 10,
      },
      {
        id: "op_cheap",
        description: "cheap path",
        achieves: { subject: "goal", predicate: "solved" },
        preconditions: [],
        effects: [],
        cost: 1,
      },
    ];
    const planner = new Planner(store, expensive);
    const plan = planner.plan("solved");
    expect(plan.executable).toBe(true);
    expect(plan.steps[0]?.operatorId).toBe("op_cheap");
    expect(plan.totalCost).toBe(1);
  });
});

describe("plan alternatives and risk", () => {
  it("alternatives are real operator chains — same goal or feeding a primary precondition", async () => {
    const store = await storeWith(["network", "authorized", "yes"]);
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("researched");
    // op_teach_from_owner also achieves "knowledge available"
    // (a precondition-adjacent alternative)... web research has
    // no preconditions satisfied by teaching, so alternatives
    // must at minimum be empty-or-real, never fabricated ids
    for (const alt of plan.alternatives) {
      const ids = alt.operatorIds;
      expect(ids.every((id) => DEFAULT_OPERATORS.some((op) => op.id === id))).toBe(true);
    }
  });

  it("a research plan is flagged medium-risk with a validation note", async () => {
    const store = await storeWith(["network", "authorized", "yes"]);
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("researched");
    expect(plan.risk.level).toBe("medium");
    expect(plan.risk.notes.join(" ")).toMatch(/validated before being trusted/i);
  });

  it("a stored-capability-only plan is low-risk", async () => {
    const store = await storeWith(["project", "scope-defined", "yes"]);
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("planned");
    expect(plan.executable).toBe(true);
    expect(plan.risk.level).toBe("low");
  });
});

describe("planning honesty invariants", () => {
  it("step effects are NOT simulated — a later precondition still needs real facts", async () => {
    // op_teach_from_owner EFFECT "knowledge available" — but
    // planning must not apply effects to the store. Asking for
    // the "answered" goal with NOTHING in the store must not
    // become executable just because an operator in the chain
    // has the right effect.
    const store = new FactStore();
    const planner = new Planner(store, DEFAULT_OPERATORS);
    const plan = planner.plan("answered");
    // knowledge available is not in the store; resolve() tries
    // op_teach (needs owner available — also absent) then fails.
    // NOTE: if effects WERE simulated, this plan would falsely
    // become executable. Honest planner: gap reported.
    expect(plan.gapReport.join(" ")).toMatch(/owner available|missing/);
  });

  it("operatorCount reflects the registered library", () => {
    const planner = new Planner(new FactStore(), DEFAULT_OPERATORS);
    expect(planner.operatorCount()).toBe(DEFAULT_OPERATORS.length);
    expect(planner.operatorCount()).toBeGreaterThan(5);
  });
});
