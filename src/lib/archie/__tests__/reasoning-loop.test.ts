import { describe, expect, it } from "vitest";
// =========================================================
// Multi-step reasoning loop (plan P5, audit M1): the kernel
// drives a genuine reason → act → observe → continue loop
// with a bounded budget and an honest stop report.
// =========================================================

import {
  MAX_LOOP_STEPS,
  MAX_TOOL_HOPS,
  runReasoningLoop,
} from "@studio-shared/archie-ai/native-engine/reasoning-loop.ts";
import { ArchieNativeEngine } from "@studio-shared/archie-ai/native-engine/engine.ts";
import { CognitiveKernel } from "@studio-shared/archie-ai/cognitive/kernel.ts";

describe("reasoning loop controller (P5)", () => {
  it("single plain request: one full pass, one step recorded", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "what is screeding",
    );
    expect(result.responseText).toMatch(/level|smooth/i);
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0].kind).toBe("reason");
    expect(report.usedSteps).toBe(1);
    expect(report.budgetExhausted).toBe(false);
    expect(report.trace).toContain("single pass");
  });

  it("compound request: a real step per clause, composed answer, cited union", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "what is screeding and what is mortar",
    );
    expect(result.responseText).toMatch(/1\./);
    expect(result.responseText).toMatch(/2\./);
    expect(result.citedFactIds.length).toBeGreaterThanOrEqual(2);
    const reasonSteps = report.steps.filter((s) => s.kind === "reason");
    expect(reasonSteps).toHaveLength(2);
    expect(report.usedSteps).toBe(2);
    expect(report.budgetExhausted).toBe(false);
    // every step carries its real clause and cited facts
    expect(reasonSteps[0].citedFactIds.length).toBeGreaterThan(0);
    expect(reasonSteps[1].citedFactIds.length).toBeGreaterThan(0);
  });

  it("exclusions are respected constraints with their own step kind", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "tell me about screeding but don't mention prices",
    );
    expect(report.steps.some((s) => s.kind === "exclusion")).toBe(true);
    expect(result.responseText).toContain("You also asked me NOT to");
    expect(result.responseText).not.toMatch(/naira|NGN|₦/);
  });

  it("tool budget stops honestly: 3 arithmetic clauses, 2 tool hops allowed", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "what is 2+2 and what is 3+3 and what is 4+4",
    );
    expect(report.usedSteps).toBe(2);
    expect(report.usedToolHops).toBe(2);
    expect(report.budgetExhausted).toBe(true);
    expect(report.steps.some((s) => s.kind === "budget-stop")).toBe(true);
    // the honest report is IN the answer, not just the trace
    expect(result.responseText).toContain("stopped at my reasoning budget");
    // answered parts really answered
    expect(result.responseText).toContain("4");
    expect(result.responseText).toContain("6");
  });

  it("step budget stops honestly (maxSteps)", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "what is cement; what is mortar",
      undefined,
      { maxSteps: 1 },
    );
    expect(report.budgetExhausted).toBe(true);
    expect(report.usedSteps).toBe(1);
    expect(result.responseText).toContain("stopped at my reasoning budget");
  });

  it("over-cap compound requests are refused honestly by the substrate", async () => {
    const engine = new ArchieNativeEngine();
    const { result, report } = await runReasoningLoop(
      engine,
      "what is cement; what is mortar; what is screeding; what is concrete; what is portland-cement",
    );
    expect(result.responseText).toMatch(/requests in one message/i);
    expect(report.budgetExhausted).toBe(true);
    expect(report.steps[0].kind).toBe("budget-stop");
  });

  it("defaults match the plan budget: 6 steps, 2 tool hops", () => {
    expect(MAX_LOOP_STEPS).toBe(6);
    expect(MAX_TOOL_HOPS).toBe(2);
  });
});

describe("kernel drives the real loop (P5 Batch B)", () => {
  it("REASON phase records real loop steps and durations, not annotations", async () => {
    const kernel = new CognitiveKernel();
    const result = await kernel.cycle(
      "what is screeding and what is mortar",
    );
    const reason = result.trace.phases.find((p) => p.phase === "REASON");
    expect(reason?.status).toBe("executed");
    expect(reason?.summary).toMatch(/reasoning loop: 2\/6 step pass\(es\)/);
    expect(reason?.summary).not.toContain("substrate produced response");
    expect((reason?.durationMs ?? 0)).toBeGreaterThanOrEqual(0);
    // the answer is still the composed compound result
    expect(result.responseText).toMatch(/screeding/i);
    expect(result.responseText).toMatch(/mortar/i);
  });

  it("EVALUATE phase reports the loop budget state honestly", async () => {
    const kernel = new CognitiveKernel();
    const result = await kernel.cycle(
      "what is 2+2 and what is 3+3 and what is 4+4",
    );
    const evaluate = result.trace.phases.find((p) => p.phase === "EVALUATE");
    expect(evaluate?.summary).toMatch(/budget exhausted — reported/);
    expect(result.responseText).toContain("stopped at my reasoning budget");
  });

  it("single requests keep their exact behavior through the kernel (regression)", async () => {
    const kernel = new CognitiveKernel();
    const result = await kernel.cycle("what is screeding");
    expect(result.responseText).toMatch(/level|smooth/i);
    const reason = result.trace.phases.find((p) => p.phase === "REASON");
    expect(reason?.summary).toMatch(/reasoning loop: 1\/6 step pass/);
  });
});
