// =========================================================
// ARCHIE NATIVE ENGINE — PLANNING & DECISION-MAKING
//
// Real means-ends planning: goals are matched against
// operators (each a real ARCHIE capability with preconditions
// and effects), subgoals are decomposed, plans are ranked by
// cost. Missing prerequisites are REPORTED honestly — a plan
// is never presented as executable when it is not.
// =========================================================

import type { Fact, FactPattern, Operator, Plan, PlanStep } from "./types.ts";
import { FactStore } from "./knowledge.ts";

function holds(store: FactStore, pattern: FactPattern): boolean {
  return store.query(pattern).length > 0;
}

function patternLabel(pattern: FactPattern): string {
  return `${pattern.subject ?? "?"} ${pattern.predicate ?? "?"}`;
}

/** ARCHIE's operator library — real capabilities. Each maps
 *  to an executable ARCHIE subsystem. */
export const DEFAULT_OPERATORS: Operator[] = [
  {
    id: "op_answer_from_knowledge",
    description: "Answer a knowledge question from validated stored knowledge",
    achieves: { subject: "question", predicate: "answered" },
    preconditions: [{ subject: "knowledge", predicate: "available" }],
    effects: [],
    cost: 1,
  },
  {
    id: "op_reason_over_facts",
    description: "Run rule-based inference to derive new knowledge",
    achieves: { subject: "goal", predicate: "derived" },
    preconditions: [{ subject: "rules", predicate: "loaded" }],
    effects: [],
    cost: 2,
  },
  {
    id: "op_web_research",
    description: "Research the open web for missing knowledge (cross-checked)",
    achieves: { subject: "knowledge", predicate: "researched" },
    preconditions: [{ subject: "network", predicate: "authorized" }],
    effects: [
      { subject: "knowledge", predicate: "available" } as unknown as Fact,
    ],
    cost: 5,
  },
  {
    id: "op_analyze_code",
    description: "Run static code analysis on a source file",
    achieves: { subject: "code", predicate: "analyzed" },
    preconditions: [{ subject: "code", predicate: "source-available" }],
    effects: [],
    cost: 2,
  },
  {
    id: "op_plan_project_phases",
    description: "Decompose a construction project into phased tasks",
    achieves: { subject: "project", predicate: "planned" },
    preconditions: [{ subject: "project", predicate: "scope-defined" }],
    effects: [],
    cost: 3,
  },
  {
    id: "op_propose_owner_action",
    description:
      "Compose a proposal for owner authorization (never auto-executes)",
    achieves: { subject: "action", predicate: "proposed" },
    preconditions: [{ subject: "action", predicate: "justified" }],
    effects: [],
    cost: 1,
  },
];

export class Planner {
  constructor(
    private facts: FactStore,
    private operators: Operator[],
  ) {}

  operatorCount(): number {
    return this.operators.length;
  }

  /** Means-ends analysis: achieve the goal by selecting an
   *  operator, recursively resolving missing preconditions. */
  plan(goal: string, depth = 4): Plan {
    const steps: PlanStep[] = [];
    const gapReport: string[] = [];
    const resolved = new Set<string>();

    const goalPattern: FactPattern = { predicate: goal };

    const resolve = (pattern: FactPattern, d: number): boolean => {
      if (holds(this.facts, pattern) || resolved.has(patternLabel(pattern))) {
        return true;
      }
      if (d <= 0) {
        gapReport.push(
          `missing: ${patternLabel(pattern)} (planning depth exhausted)`,
        );
        return false;
      }
      const candidates = this.operators
        .filter((op) => matchesAchieves(op, pattern))
        .sort((a, b) => a.cost - b.cost);
      if (candidates.length === 0) {
        gapReport.push(
          `missing: ${patternLabel(pattern)} — no registered operator achieves this yet`,
        );
        return false;
      }
      for (const op of candidates) {
        const preconditionsMet = op.preconditions.every((pre) =>
          resolve(pre, d - 1),
        );
        if (preconditionsMet) {
          steps.push({
            operatorId: op.id,
            achieves: op.description,
            satisfies: patternLabel(pattern),
            missingPreconditions: [],
          });
          resolved.add(patternLabel(pattern));
          return true;
        }
      }
      return false;
    };

    const executable = resolve(goalPattern, depth);
    const totalCost = steps.reduce(
      (sum, step) =>
        sum + (this.operators.find((o) => o.id === step.operatorId)?.cost ?? 0),
      0,
    );
    return { goal, steps, executable, totalCost, gapReport };
  }
}

function matchesAchieves(op: Operator, pattern: FactPattern): boolean {
  if (
    pattern.predicate !== undefined &&
    op.achieves.predicate !== pattern.predicate
  ) {
    return false;
  }
  return true;
}
