import { describe, it, expect } from "vitest";
import { generateSequencePlan } from "./sequence-planner";

describe("generateSequencePlan", () => {
  it("returns a plan with multiple steps", () => {
    const plan = generateSequencePlan();
    expect(plan.total_steps).toBeGreaterThan(5);
    expect(plan.steps.length).toBe(plan.total_steps);
  });

  it("assigns sequential step numbers starting at 1", () => {
    const plan = generateSequencePlan();
    plan.steps.forEach((step, i) => {
      expect(step.step_number).toBe(i + 1);
    });
  });

  it("includes multiple construction stages", () => {
    const plan = generateSequencePlan();
    expect(plan.stages.length).toBeGreaterThan(3);
  });

  it("each step has required fields populated", () => {
    const plan = generateSequencePlan();
    plan.steps.forEach((step) => {
      expect(step.title).toBeTruthy();
      expect(step.stage).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.activities.length).toBeGreaterThan(0);
      expect(step.quality_checks.length).toBeGreaterThan(0);
    });
  });

  it("has quality gates after critical steps", () => {
    const plan = generateSequencePlan();
    expect(plan.quality_gates.length).toBeGreaterThan(0);
    plan.quality_gates.forEach((gate) => {
      expect(gate.after_step).toBeGreaterThan(0);
      expect(gate.gate_name).toBeTruthy();
      expect(gate.checks.length).toBeGreaterThan(0);
    });
  });

  it("first step has no prerequisites", () => {
    const plan = generateSequencePlan();
    expect(plan.steps[0].prerequisites).toEqual([]);
  });

  it("marks some steps as critical path", () => {
    const plan = generateSequencePlan();
    const criticalSteps = plan.steps.filter((s) => s.is_critical);
    expect(criticalSteps.length).toBeGreaterThan(0);
  });

  it("includes parallel activities", () => {
    const plan = generateSequencePlan();
    expect(plan.parallel_activities.length).toBeGreaterThan(0);
  });

  it("works with building type argument", () => {
    const plan = generateSequencePlan("residential");
    expect(plan.total_steps).toBeGreaterThan(0);
  });
});
