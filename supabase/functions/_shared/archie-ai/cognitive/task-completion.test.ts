// ============================================================
// SUPERVISED TASK COMPLETION ENGINE — TESTS
// Evidence for the task-completion capability: decomposition,
// per-step verification, bounded retry, gate stops, constraint
// handling, budget refusal, and the deterministic verdict.
// ============================================================
import { describe, expect, it } from "vitest";
import {
  STEP_RETRY_LIMIT,
  TaskCompletionEngine,
  type TaskCycleRunner,
  type TaskStepGate,
} from "./task-completion.ts";
import type { CognitiveCycleResult } from "./types.ts";

function cycleResult(
  over: Partial<CognitiveCycleResult> = {},
): CognitiveCycleResult {
  return {
    responseText: "step output",
    epistemic: "VERIFIED",
    confidence: 0.9,
    citedFactIds: [],
    meta: null,
    verification:
      over.verification === undefined
        ? { target: "t", verdict: "PASS", checks: [] }
        : over.verification,
    trace: {
      cycleId: "c",
      task: "t",
      phases: [],
      route: {
        phases: [],
        reasoningModes: ["logical"],
        retrievalScope: { knowledge: true, memory: true, worldModel: true },
        tools: [],
        verificationLevel: "standard",
        authority: "autonomous-safe",
        rationale: "test",
      },
      epistemic: "VERIFIED",
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    },
    toolResults: [],
    proposals: [],
    worldModelUpdates: 0,
    ...over,
  } as CognitiveCycleResult;
}

function mockRunner(
  results: Array<CognitiveCycleResult | Error>,
): TaskCycleRunner & { calls: string[] } {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    async cycle(input: string) {
      calls.push(input);
      const next = results[Math.min(i, results.length - 1)];
      i += 1;
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

describe("TaskCompletionEngine — decomposition", () => {
  it("runs one full cycle per clause of a compound task", async () => {
    const runner = mockRunner([cycleResult(), cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "estimate the paint for my room and check the price of tyrolene",
    );
    expect(report.steps.filter((s) => s.status === "succeeded")).toHaveLength(
      2,
    );
    expect(runner.calls).toHaveLength(2);
    expect(report.verdict).toBe("ACHIEVED");
    expect(report.achievedRatio).toBe(1);
  });

  it("single-clause task is one plain cycle (no step prefix)", async () => {
    const runner = mockRunner([cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "check the price of tyrolene",
    );
    expect(runner.calls).toEqual(["check the price of tyrolene"]);
    expect(report.verdict).toBe("ACHIEVED");
    expect(report.responseText).toContain("Task verdict: ACHIEVED — 1/1");
  });

  it("negated tails are honored constraints — never executed, never answered", async () => {
    const runner = mockRunner([cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "check the price of tyrolene, but don't include delivery",
    );
    const constraint = report.steps.find(
      (s) => s.status === "skipped-constraint",
    );
    expect(constraint).toBeDefined();
    expect(constraint?.summary).toContain("constraint");
    expect(runner.calls).toHaveLength(1);
    expect(report.verdict).toBe("ACHIEVED");
    expect(report.responseText).toContain("1 constraint(s) honored");
  });

  it("an over-budget compound task is refused honestly, never half-executed", async () => {
    const runner = mockRunner([cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "estimate a; check b; compute c; also compare d; list e",
    );
    expect(report.verdict).toBe("NOT_ACHIEVED");
    expect(report.steps).toHaveLength(0);
    expect(runner.calls).toHaveLength(0);
    expect(report.responseText).toContain("won't half-execute");
    expect(report.notes[0]).toContain("over the compound cap");
  });

  it("a task of only constraints achieves nothing and says so", async () => {
    const runner = mockRunner([]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "don't do anything",
    );
    expect(report.verdict).toBe("NOT_ACHIEVED");
    expect(report.notes.join(" ")).toContain("only constraints");
    expect(runner.calls).toHaveLength(0);
  });
});

describe("TaskCompletionEngine — verification and retry", () => {
  it("a FAIL verdict triggers one bounded retry; a PASS on retry succeeds", async () => {
    const fail = cycleResult({
      verification: {
        target: "t",
        verdict: "FAIL",
        checks: [{ check: "correctness", passed: false, detail: "wrong" }],
      },
    });
    const runner = mockRunner([fail, cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "compute 2+2",
    );
    expect(report.steps[0].status).toBe("succeeded");
    expect(report.steps[0].attempts).toBe(2);
    expect(report.steps[0].verificationVerdict).toBe("PASS");
    expect(runner.calls).toHaveLength(2);
  });

  it("a step that keeps failing is reported as failed — the verdict is honest", async () => {
    const fail = cycleResult({
      verification: {
        target: "t",
        verdict: "FAIL",
        checks: [{ check: "correctness", passed: false, detail: "wrong" }],
      },
    });
    const runner = mockRunner([fail, fail, fail]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "compute 2+2",
    );
    expect(report.steps[0].status).toBe("failed");
    expect(report.steps[0].attempts).toBe(1 + STEP_RETRY_LIMIT);
    expect(report.verdict).toBe("NOT_ACHIEVED");
    expect(report.notes.join(" ")).toContain("failed after 2 attempt(s)");
  });

  it("a crashed cycle is an honest failure, never a fabricated result", async () => {
    const runner = mockRunner([new Error("cycle crash"), cycleResult()]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "check the price of tyrolene",
    );
    // The retry succeeded, so the task recovers — attempts recorded.
    expect(report.steps[0].status).toBe("succeeded");
    expect(report.steps[0].attempts).toBe(2);
  });

  it("UNVERIFIED claim-free steps succeed on cycle completion with their true verdict recorded", async () => {
    const unverified = cycleResult({
      verification: null,
      confidence: 0.8,
      responseText: "greeting delivered",
    });
    const runner = mockRunner([unverified]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "greet the owner",
    );
    expect(report.steps[0].status).toBe("succeeded");
    expect(report.steps[0].verificationVerdict).toBeNull();
    expect(report.confidence).toBe(0.8);
  });

  it("a low-confidence UNVERIFIED step is honest failure evidence in the verdict", async () => {
    const weak = cycleResult({ verification: null, confidence: 0.2 });
    const runner = mockRunner([weak, weak, weak]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "greet the owner",
    );
    expect(report.steps[0].status).toBe("failed");
    expect(report.verdict).toBe("NOT_ACHIEVED");
  });
});

describe("TaskCompletionEngine — deterministic verdict arithmetic", () => {
  it("one of two clauses failing is PARTIAL with the failure named", async () => {
    const fail = cycleResult({
      verification: {
        target: "t",
        verdict: "FAIL",
        checks: [{ check: "correctness", passed: false, detail: "wrong" }],
      },
    });
    const runner = mockRunner([cycleResult(), fail, fail, fail]);
    const report = await new TaskCompletionEngine(runner).executeTask(
      "check the price of tyrolene and estimate the paint for the room",
    );
    expect(report.verdict).toBe("PARTIAL");
    expect(report.achievedRatio).toBe(0.5);
    expect(report.confidence).toBe(0.9); // mean over executed steps
    expect(report.notes.join(" ")).toContain("step 2 failed");
  });

  it("confidence is the mean over executed steps (0 when nothing executed)", async () => {
    const gate: TaskStepGate = () => ({
      allowed: false,
      reason: "out of scope",
    });
    const runner = mockRunner([]);
    const report = await new TaskCompletionEngine(runner, gate).executeTask(
      "check the price of tyrolene and estimate the paint",
    );
    expect(report.verdict).toBe("NOT_ACHIEVED");
    expect(report.confidence).toBe(0);
    expect(report.steps.every((s) => s.status === "gated-stop")).toBe(true);
    expect(report.notes.join(" ")).toContain("security gate");
  });

  it("the security gate stops each clause before any cycle runs", async () => {
    const gate: TaskStepGate = (clause) => ({
      allowed: !/delete/i.test(clause),
      reason: "destructive operation",
    });
    const runner = mockRunner([]);
    const report = await new TaskCompletionEngine(runner, gate).executeTask(
      "delete the database",
    );
    expect(runner.calls).toHaveLength(0);
    expect(report.steps[0].summary).toContain("destructive operation");
  });
});
