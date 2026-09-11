// =========================================================
// ARCHIE NATIVE ENGINE — PLANNING & DECISION-MAKING
//
// Real means-ends planning: goals are matched against
// operators (each a real ARCHIE capability with preconditions
// and effects), subgoals are decomposed, plans are ranked by
// cost. Missing prerequisites are REPORTED honestly — a plan
// is never presented as executable when it is not.
// =========================================================

import type { Fact, FactPattern, Operator, Plan, PlanAlternative, PlanStep } from "./types.ts";
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
    id: "op_teach_from_owner",
    description: "Owner teaches the missing knowledge directly (retained with provenance)",
    achieves: { subject: "knowledge", predicate: "owner-provided" },
    preconditions: [{ subject: "owner", predicate: "available" }],
    effects: [
      { subject: "knowledge", predicate: "available" } as unknown as Fact,
    ],
    cost: 1,
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
        .filter((op) => matchesAchieves(op, pattern) || effectsMatch(op, pattern))
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
          // Audit fix 2026-09-11 (planner effect chaining):
          // a selected operator's EFFECTS are planned
          // achievements — later preconditions in this same
          // plan may be satisfied by them. This is simulated
          // progress, NEVER a store write: `resolved` is a
          // per-plan set of pattern labels, and a genuinely
          // underivable precondition (no fact, no producing
          // operator) still lands in gapReport and fails the
          // plan honestly.
          for (const e of op.effects) {
            resolved.add(patternLabel(e));
          }
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

    // P1/pl-3 — alternative plans: other REAL operator chains
    // that also achieve the goal. An operator is a viable
    // alternative head when its effects satisfy a
    // precondition of a primary step (chained), or when it
    // achieves the same goal independently. Never fabricated.
    const alternatives: PlanAlternative[] = [];
    const primaryOpIds = new Set(steps.map((s) => s.operatorId));
    const primaryOps = steps
      .map((s) => this.operators.find((o) => o.id === s.operatorId))
      .filter((o): o is Operator => o !== undefined);
    for (const op of this.operators) {
      if (primaryOpIds.has(op.id)) continue;
      const feedsPrimary = primaryOps.some((primary) =>
        primary.preconditions.some(
          (pre) =>
            pre.subject !== undefined &&
            op.effects.some((e) => e.subject === pre.subject && e.predicate === pre.predicate),
        ),
      );
      const achievesDirectly = primaryOps.some((primary) =>
        matchesAchieves(op, primary.achieves),
      );
      if (!feedsPrimary && !achievesDirectly) continue;
      const chainIds = [op.id, ...steps.map((s) => s.operatorId)];
      const chainCost =
        totalCost + op.cost;
      alternatives.push({
        operatorIds: chainIds,
        description: `${op.description}, then the primary plan`,
        totalCost: chainCost,
        tradeoff:
          chainCost > totalCost
            ? `costs ${chainCost - totalCost} more than the primary plan`
            : "same cost as the primary plan",
      });
    }

    // P1/pl-3 — honest risk assessment derived from the
    // operators actually involved in the primary plan.
    const involvesResearch = primaryOpIds.has("op_web_research");
    const risk = {
      level: (involvesResearch ? "medium" : "low") as "low" | "medium" | "high",
      notes: involvesResearch
        ? [
            "web research produces candidate knowledge — it must be validated before being trusted as established fact",
          ]
        : [
            "primary plan uses stored capabilities only — no unvalidated external sources involved",
          ],
    };

    return { goal, steps, executable, totalCost, gapReport, alternatives, risk };
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

/** Does an operator's EFFECT produce this missing pattern?
 *  Means-ends selection: a missing precondition can be met
 *  either by an operator that ACHIEVES it directly or by one
 *  whose declared effect produces it as a side effect. */
function effectsMatch(op: Operator, pattern: FactPattern): boolean {
  return op.effects.some(
    (e) =>
      e.subject !== undefined &&
      (pattern.subject === undefined || pattern.subject === e.subject) &&
      pattern.predicate !== undefined &&
      e.predicate === pattern.predicate,
  );
}
