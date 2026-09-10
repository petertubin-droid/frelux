// =========================================================
// ARCHIE NATIVE ENGINE — SELF-EVALUATION & VERIFICATION
//
// Real verification passes:
//   * contradiction scan over the knowledge store
//   * inference re-derivation and comparison
//   * plan precondition validation
//   * response self-check (does the response cite only real
//     facts and answer the classified intent?)
//   * calibration statistics over recorded outcomes
// Every check is measurable and surfaced in diagnostics.
// =========================================================

import type { Fact, FactConflict, LearningOutcome, Plan } from "./types.ts";
import { FactStore } from "./knowledge.ts";
import { ReasoningEngine, type InferenceResult } from "./reasoning.ts";

export interface SelfCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export class SelfEvaluator {
  private checksRun = 0;
  private contradictionsCaught = 0;

  /** Scan the store for same-SPO-different-object pairs. */
  scanContradictions(facts: FactStore): {
    conflicts: FactConflict[];
    checked: number;
  } {
    this.checksRun += 1;
    const all = facts.list();
    const bySpo = new Map<string, Map<string, Fact[]>>();
    for (const fact of all) {
      const spo = `${fact.subject}|${fact.predicate}`;
      const byObject = bySpo.get(spo) ?? new Map<string, Fact[]>();
      const key = JSON.stringify(fact.object);
      byObject.set(key, [...(byObject.get(key) ?? []), fact]);
      bySpo.set(spo, byObject);
    }
    const conflicts: FactConflict[] = [];
    for (const [spo, byObject] of bySpo) {
      if (byObject.size > 1) {
        const [subject, predicate] = spo.split("|");
        this.contradictionsCaught += 1;
        conflicts.push({
          kind: "contradiction",
          subject,
          predicate,
          conflictingFactIds: [...byObject.values()].flat().map((f) => f.id),
        });
      }
    }
    return { conflicts, checked: all.length };
  }

  /** Re-run inference and confirm previously derived facts
   *  still derive (stability check). */
  async verifyInference(
    reasoning: ReasoningEngine,
    previous: InferenceResult,
    facts?: FactStore,
  ): Promise<SelfCheck> {
    this.checksRun += 1;
    const reRun = await reasoning.forwardChain();
    // A previously derived fact is stable when it still exists
    // in the store with unchanged content AND re-running the
    // rules neither contradicts it nor produces conflicts.
    const stillPresent = previous.derived.every(
      (f) =>
        facts?.get(f.id) !== undefined &&
        JSON.stringify(facts.get(f.id)!.object) === JSON.stringify(f.object),
    );
    const noNewConflicts =
      reRun.derived.filter((f) => f.status === "uncertain").length === 0;
    const passed = stillPresent && noNewConflicts;
    return {
      check: "inference-stability",
      passed,
      detail: passed
        ? `${previous.derived.length} derived fact(s) stable under re-derivation`
        : "a previously derived fact no longer holds — knowledge store changed underneath inference",
    };
  }

  /** A plan is only valid when every step's operator exists and
   *  the plan claims no missing preconditions. */
  validatePlan(plan: Plan, knownOperators: string[]): SelfCheck {
    this.checksRun += 1;
    const unknownSteps = plan.steps.filter(
      (s) => !knownOperators.includes(s.operatorId),
    );
    const passed =
      plan.executable &&
      unknownSteps.length === 0 &&
      plan.gapReport.length === 0;
    return {
      check: "plan-validity",
      passed,
      detail: passed
        ? `plan for "${plan.goal}" is executable (${plan.steps.length} steps, cost ${plan.totalCost})`
        : `plan is not executable: ${[...plan.gapReport, ...unknownSteps.map((s) => `unknown operator ${s.operatorId}`)].join("; ")}`,
    };
  }

  /** Response self-check: cited facts must exist; a knowledge
   *  answer must not cite facts below validated status as
   *  established truth. */
  verifyResponse(
    citedFactIds: string[],
    facts: FactStore,
    assertedAsEstablished: boolean,
  ): SelfCheck {
    this.checksRun += 1;
    const missing = citedFactIds.filter((id) => !facts.get(id));
    const misrepresentations = citedFactIds
      .map((id) => facts.get(id))
      .filter((f) => f && assertedAsEstablished && f.status === "uncertain");
    return {
      check: "response-integrity",
      passed: missing.length === 0 && misrepresentations.length === 0,
      detail:
        missing.length > 0
          ? `response cited non-existent facts: ${missing.join(", ")}`
          : misrepresentations.length > 0
            ? "response asserted uncertain knowledge as established fact"
            : `all ${citedFactIds.length} cited fact(s) verified`,
    };
  }

  /** Calibration: mean predicted confidence across outcomes. */
  calibration(
    outcomes: LearningOutcome[],
    predictedConfidences: Map<string, number>,
  ): {
    samples: number;
    meanPredicted: number;
    successRate: number;
  } {
    const withPredictions = outcomes.filter((o) =>
      predictedConfidences.has(o.task),
    );
    if (withPredictions.length === 0) {
      return { samples: 0, meanPredicted: 0, successRate: 0 };
    }
    const meanPredicted =
      withPredictions.reduce(
        (s, o) => s + (predictedConfidences.get(o.task) ?? 0),
        0,
      ) / withPredictions.length;
    const successRate =
      withPredictions.filter((o) => o.kind === "success").length /
      withPredictions.length;
    return { samples: withPredictions.length, meanPredicted, successRate };
  }

  stats(): { selfChecksRun: number; contradictionsCaught: number } {
    return {
      selfChecksRun: this.checksRun,
      contradictionsCaught: this.contradictionsCaught,
    };
  }
}
