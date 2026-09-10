// =========================================================
// ARCHIE NATIVE ENGINE — REASONING
//
// Real rule-based inference over the knowledge store:
//   * forward chaining with bounded iterations
//   * confidence propagation: derived = min(premise) × rule weight
//   * full derivation traces (explanations) — every derived
//     fact can show its proof chain
//   * goal checking: can a fact be derived or already holds?
// Classic GOFAI, deterministic, fully testable. No external
// model is involved anywhere in this file.
// =========================================================

import type { Fact, FactPattern, InferenceExplanation, Rule } from "./types.ts";
import { FactStore } from "./knowledge.ts";

function matches(fact: Fact, pattern: FactPattern): boolean {
  if (pattern.subject !== undefined && pattern.subject !== fact.subject) {
    return false;
  }
  if (pattern.predicate !== undefined && pattern.predicate !== fact.predicate) {
    return false;
  }
  if (pattern.object !== undefined) {
    if (JSON.stringify(pattern.object) !== JSON.stringify(fact.object)) {
      return false;
    }
  }
  return true;
}

const derivedCounter = 0;

export interface InferenceResult {
  derived: Fact[];
  explanations: InferenceExplanation[];
  iterations: number;
  /** Derived fact ids that already existed (reinforced). */
  reinforced: string[];
}

export class ReasoningEngine {
  constructor(
    private facts: FactStore,
    private rules: Rule[],
  ) {}

  ruleCount(): number {
    return this.rules.length;
  }

  /** Forward chaining: apply rules until fixpoint or bound. */
  async forwardChain(maxIterations = 6): Promise<InferenceResult> {
    const explanations: InferenceExplanation[] = [];
    const reinforced: string[] = [];
    let iterations = 0;
    let derivedThisPass: Fact[] = [];

    for (let i = 0; i < maxIterations; i++) {
      iterations += 1;
      derivedThisPass = [];
      for (const rule of this.rules) {
        const premiseSets: Fact[][] = rule.conditions.map((pattern) =>
          this.facts.query(pattern),
        );
        if (premiseSets.some((set) => set.length === 0)) continue;
        // Deterministic choice: strongest-confidence premises.
        const chosen = premiseSets.map(
          (set) => [...set].sort((a, b) => b.confidence - a.confidence)[0],
        );
        const premiseConfidence = Math.min(...chosen.map((f) => f.confidence));
        const derivedConfidence = premiseConfidence * rule.weight;
        const produced = rule.produces;
        const existing = this.facts
          .query({ subject: produced.subject, predicate: produced.predicate })
          .find(
            (f) => JSON.stringify(f.object) === JSON.stringify(produced.object),
          );
        if (existing) {
          if (!reinforced.includes(existing.id)) reinforced.push(existing.id);
          continue;
        }
        const { fact } = await this.facts.assert({
          subject: produced.subject,
          predicate: produced.predicate,
          object: produced.object,
          confidence: derivedConfidence,
          provenance: {
            source: "inferred",
            derivation: {
              ruleId: rule.id,
              premiseIds: chosen.map((f) => f.id),
            },
            note: rule.description,
          },
          status: derivedConfidence >= 0.6 ? "validated" : "candidate",
        });
        derivedThisPass.push(fact);
        explanations.push({
          derivedFactId: fact.id,
          ruleId: rule.id,
          premiseFacts: chosen,
          confidence: derivedConfidence,
        });
      }
      if (derivedThisPass.length === 0) break;
    }
    return {
      derived: explanations
        .map((e) => this.facts.get(e.derivedFactId)!)
        .filter(Boolean),
      explanations,
      iterations,
      reinforced,
    };
  }

  /** Can the goal be derived or does it already hold? Backward
   *  search over rule chains (bounded). */
  canReach(
    goal: FactPattern,
    depth = 4,
  ): {
    holds: boolean;
    proof: string[];
  } {
    if (this.facts.query(goal).length > 0) {
      return { holds: true, proof: ["goal fact already in knowledge store"] };
    }
    const chain: string[] = [];
    const tryRules = (pattern: FactPattern, d: number): boolean => {
      if (d <= 0) return false;
      for (const rule of this.rules) {
        if (
          !matches(
            {
              subject: rule.produces.subject,
              predicate: rule.produces.predicate,
              object: rule.produces.object,
            } as Fact,
            pattern,
          )
        ) {
          continue;
        }
        chain.push(rule.id);
        const allPreconditionsMet = rule.conditions.every(
          (pre) => this.facts.query(pre).length > 0 || tryRules(pre, d - 1),
        );
        if (allPreconditionsMet) return true;
        chain.pop();
      }
      return false;
    };
    const holds = tryRules(goal, depth);
    return { holds, proof: holds ? chain : [] };
  }

  /** Explanation for one derived fact — the proof chain. */
  explain(
    factId: string,
    result: InferenceResult,
  ): InferenceExplanation | undefined {
    return result.explanations.find((e) => e.derivedFactId === factId);
  }
}

/** ARCHIE's starter reasoning rules — construction domain
 *  (ARCHIE's home turf). Extensible by design: future rules
 *  register without redesign. */
export const DEFAULT_RULES: Rule[] = [
  {
    id: "rule_concrete_mix_ratio",
    conditions: [
      { subject: "concrete", predicate: "grade" },
      { subject: "concrete", predicate: "mix-ratio" },
    ],
    produces: {
      subject: "concrete",
      predicate: "characteristic-strength",
      object: "determined by its mix ratio",
    },
    weight: 0.85,
    description: "Concrete grade strength follows from its mix ratio",
  },
  {
    id: "rule_screeding_thickness_area",
    conditions: [
      { subject: "screed", predicate: "thickness" },
      { subject: "floor", predicate: "area" },
    ],
    produces: {
      subject: "screed",
      predicate: "volume",
      object: "thickness × floor area",
    },
    weight: 0.9,
    description: "Screed volume = thickness × area (geometry)",
  },
  {
    id: "rule_cement_bag_standard",
    conditions: [{ subject: "cement", predicate: "bag-mass" }],
    produces: {
      subject: "cement",
      predicate: "bag-volume",
      object: "0.035 m³ (50 kg standard bag)",
    },
    weight: 0.95,
    description: "A 50 kg cement bag has a standard volume of 0.035 m³",
  },
  {
    id: "rule_project_owner_authorization",
    conditions: [{ subject: "production", predicate: "change-kind" }],
    produces: {
      subject: "production",
      predicate: "authorization-required",
      object: "Owner Authority Layer approval",
    },
    weight: 0.99,
    description:
      "Production changes require owner authorization (permanent §8 rule)",
  },
];
