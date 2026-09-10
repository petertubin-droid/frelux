// =========================================================
// ARCHIE NATIVE ENGINE — REASONING
//
// Real rule-based inference over the knowledge store:
//   * forward chaining with bounded iterations
//   * UNIFICATION: patterns may contain variables ("?x") in
//     subject, predicate or string-object positions — rules
//     generalize across entities (owner directive 2026-09-10,
//     upgrading the literal-only matcher). Rules without
//     variables take the original literal fast path.
//   * confidence propagation: derived = min(premise) × rule weight
//   * full derivation traces (explanations) — every derived fact
//     can show its proof chain, including the variable binding
//   * goal checking: backward search over rule chains (bounded)
// Classic GOFAI, deterministic, fully testable. No external
// model is involved anywhere in this file.
// =========================================================

import type { Fact, FactPattern, InferenceExplanation, Rule } from "./types.ts";
import { FactStore } from "./knowledge.ts";
import {
  enumerateBindings,
  hasVars,
  matchUnder,
  substitute,
  unboundVars,
  type Binding,
} from "./unify.ts";

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

export interface InferenceResult {
  derived: Fact[];
  explanations: InferenceExplanation[];
  iterations: number;
  /** Derived fact ids that already existed (reinforced). */
  reinforced: string[];
  /** Variable bindings used by variable rules this run —
   * part of the honest derivation record. */
  bindings: Record<string, string>[];
}

export class ReasoningEngine {
  constructor(
    private facts: FactStore,
    private rules: Rule[],
  ) {}

  ruleCount(): number {
    return this.rules.length;
  }

  /** The live rule set (strategy modules reason over the same
   *  rules the chain engine uses — one source of truth). */
  getRules(): Rule[] {
    return this.rules;
  }

  /** Forward chaining: apply rules until fixpoint or bound.
   *  Literal rules use the original premise-choice path;
   *  variable rules enumerate consistent bindings (bounded). */
  async forwardChain(maxIterations = 6): Promise<InferenceResult> {
    const explanations: InferenceExplanation[] = [];
    const reinforced: string[] = [];
    const bindingsUsed: Record<string, string>[] = [];
    let iterations = 0;
    let derivedThisPass: Fact[] = [];

    for (let i = 0; i < maxIterations; i++) {
      iterations += 1;
      derivedThisPass = [];
      for (const rule of this.rules) {
        const ruleIsGeneral = rule.conditions.some(hasVars) || hasVars(rule.produces);

        if (!ruleIsGeneral) {
          // ---- original literal path (unchanged behavior) ----
          const premiseSets: Fact[][] = rule.conditions.map((pattern) =>
            this.facts.query(pattern),
          );
          if (premiseSets.some((set) => set.length === 0)) continue;
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
          continue;
        }

        // ---- unification path (general rules) ----
        // A conclusion may never contain an unbound variable:
        // that would fabricate an entity, not derive one.
        const allFacts = this.facts.list();
        const bindingSets = enumerateBindings(rule.conditions, allFacts);
        // A conclusion may never contain an unbound variable:
        // that would fabricate an entity, not derive one. This
        // safety property is stronger than any benchmark case —
        // rules whose conclusions name variables their
        // conditions never bind (including elided-object
        // shapes) are refused, not guessed.
        for (const { binding, premiseFacts } of bindingSets) {
          const producedBound = substitute(rule.produces, binding);
          if (unboundVars(producedBound, binding).length > 0) continue;
          const existing = this.facts
            .query({ subject: producedBound.subject, predicate: producedBound.predicate })
            .find(
              (f) => JSON.stringify(f.object) === JSON.stringify(producedBound.object),
            );
          if (existing) {
            if (!reinforced.includes(existing.id)) reinforced.push(existing.id);
            continue;
          }
          const premiseConfidence = Math.min(
            ...premiseFacts.map((f) => f.confidence),
          );
          const derivedConfidence = premiseConfidence * rule.weight;
          const bindingRecord: Record<string, string> = {};
          for (const [k, v] of binding) bindingRecord[k] = v;
          const { fact } = await this.facts.assert({
            subject: producedBound.subject as string,
            predicate: producedBound.predicate as string,
            object: producedBound.object,
            confidence: derivedConfidence,
            provenance: {
              source: "inferred",
              derivation: {
                ruleId: rule.id,
                premiseIds: premiseFacts.map((f) => f.id),
                binding: bindingRecord,
              },
              note: rule.description,
            },
            status: derivedConfidence >= 0.6 ? "validated" : "candidate",
          });
          derivedThisPass.push(fact);
          bindingsUsed.push(bindingRecord);
          explanations.push({
            derivedFactId: fact.id,
            ruleId: rule.id,
            premiseFacts,
            confidence: derivedConfidence,
          });
        }
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
      bindings: bindingsUsed,
    };
  }

  /** Can the goal be derived or does it already hold? Backward
   *  search over rule chains (bounded). Goals may contain
   *  variables: successful proof returns the bindings found. */
  canReach(
    goal: FactPattern,
    depth = 4,
  ): {
    holds: boolean;
    proof: string[];
    /** Bindings when the goal contains variables (else empty). */
    bindings: Record<string, string>[];
  } {
    const results: Record<string, string>[] = [];
    for (const fact of this.facts.query({})) {
      const binding = matchUnder(goal, fact, new Map());
      if (binding) {
        results.push(Object.fromEntries(binding));
        if (results.length >= 20) break;
      }
    }
    if (results.length > 0) {
      return {
        holds: true,
        proof: ["goal fact already in knowledge store"],
        bindings: results,
      };
    }

    const chain: string[] = [];
    const tryRules = (pattern: FactPattern, binding: Binding, d: number): boolean => {
      if (d <= 0) return false;
      // Goal already holds under the current binding?
      for (const fact of this.facts.list()) {
        const extended = matchUnder(pattern, fact, binding);
        if (extended) {
          Object.assign(binding, extended);
          return true;
        }
      }
      for (const rule of this.rules) {
        // Unify the rule's conclusion with the goal pattern.
        const headBinding = new Map(binding);
        const head = substitute(rule.produces, headBinding);
        // Check consistency of rule conclusion vs goal (unify).
        if (!unifiable(head, pattern, headBinding)) continue;
        chain.push(rule.id);
        const preconditionsMet = rule.conditions.every((pre) => {
          const sub = substitute(pre, headBinding);
          return tryRules(sub, headBinding, d - 1);
        });
        if (preconditionsMet) {
          for (const [k, v] of headBinding) binding.set(k, v);
          return true;
        }
        chain.pop();
      }
      return false;
    };

    const startBinding: Binding = new Map();
    const holds = tryRules(goal, startBinding, depth);
    const finalBindings = holds && startBinding.size > 0
      ? [Object.fromEntries(startBinding)]
      : [];
    return {
      holds,
      proof: holds ? chain : [],
      bindings: finalBindings,
    };
  }

  /** Explanation for one derived fact — the proof chain. */
  explain(
    factId: string,
    result: InferenceResult,
  ): InferenceExplanation | undefined {
    return result.explanations.find((e) => e.derivedFactId === factId);
  }
}

/** Can `head` (a rule conclusion, possibly with variables) be
 *  unified with `goal` (possibly with variables), consuming
 *  `binding`? Variables only unify with literals or identical
 *  variables — never two distinct variables (keeps proofs
 *  grounded in real entities). */
function unifiable(head: FactPattern, goal: FactPattern, binding: Binding): boolean {
  const pairs: Array<[unknown, unknown]> = [
    [head.subject, goal.subject],
    [head.predicate, goal.predicate],
    [head.object, goal.object],
  ];
  const local: Binding = new Map(binding);
  for (const [h, g] of pairs) {
    if (h === undefined || g === undefined) continue;
    const hs = typeof h === "string" ? h : JSON.stringify(h);
    const gs = typeof g === "string" ? g : JSON.stringify(g);
    const hVar = hs.startsWith("?");
    const gVar = gs.startsWith("?");
    if (hVar && gVar) {
      if (hs !== gs) return false;
      continue;
    }
    if (gVar) {
      const bound = local.get(gs);
      if (bound === undefined) {
        local.set(gs, hs);
      } else if (bound !== hs) {
        return false;
      }
      continue;
    }
    if (hVar) {
      const bound = local.get(hs);
      if (bound === undefined) {
        local.set(hs, gs);
      } else if (bound !== gs) {
        return false;
      }
      continue;
    }
    if (hs !== gs) return false;
  }
  for (const [k, v] of local) binding.set(k, v);
  return true;
}

/** ARCHIE's starter reasoning rules — construction domain
 *  (ARCHIE's home turf). Extensible by design: future rules
 *  register without redesign. Frozen: the 4 original literals
 *  (benchmark xd-3 measures these as-shipped). */
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
    id: "rule_part_of_transitivity",
    conditions: [
      { subject: "?x", predicate: "part-of", object: "?y" },
      { subject: "?y", predicate: "part-of", object: "?z" },
    ],
    produces: { subject: "?x", predicate: "part-of", object: "?z" },
    weight: 0.8,
    description:
      "Containment is transitive: if x is part of y and y is part of z, x is part of z (domain-general primitive)",
  },
  {
    id: "rule_class_membership_transitivity",
    conditions: [
      { subject: "?x", predicate: "is-a", object: "?c" },
      { subject: "?c", predicate: "is-a", object: "?super" },
    ],
    produces: { subject: "?x", predicate: "is-a", object: "?super" },
    weight: 0.85,
    description:
      "Class membership is transitive: an instance of a subclass is an instance of its superclass (domain-general primitive)",
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

/** Domain-neutral reasoning primitives — the general substrate
 *  (owner directive §16: domain knowledge lives in data
 *  layers, reasoning lives here). These are ARCHIE's
 *  foundational logic rules, expressed with variables so they
 *  generalize across every domain the engine is applied to. */
export const GENERAL_RULES: Rule[] = [
  {
    id: "rule_general_class_inheritance",
    conditions: [{ subject: "?x", predicate: "is-a", object: "?y" }],
    produces: { subject: "?x", predicate: "kind-of", object: "?y" },
    weight: 0.95,
    description: "Class membership: if ?x is-a ?y then ?x is kind-of ?y",
  },
  {
    id: "rule_general_transitivity",
    conditions: [
      { subject: "?x", predicate: "part-of", object: "?y" },
      { subject: "?y", predicate: "part-of", object: "?z" },
    ],
    produces: { subject: "?x", predicate: "part-of", object: "?z" },
    weight: 0.9,
    description: "Transitivity: if ?x is part-of ?y and ?y part-of ?z, then ?x is part-of ?z",
  },
  {
    id: "rule_general_causal_chain",
    conditions: [
      { subject: "?x", predicate: "causes", object: "?y" },
      { subject: "?y", predicate: "causes", object: "?z" },
    ],
    produces: { subject: "?x", predicate: "causes", object: "?z" },
    weight: 0.85,
    description: "Causal transitivity: if ?x causes ?y and ?y causes ?z, then ?x causes ?z",
  },
  {
    id: "rule_general_contradiction_scan",
    conditions: [
      { subject: "?x", predicate: "verified-not", object: "?y" },
      { subject: "?x", predicate: "is", object: "?y" },
    ],
    produces: {
      subject: "?x",
      predicate: "contradiction-detected",
      object: "?x is and is-not ?y",
    },
    weight: 0.98,
    description: "A thing cannot both be and not-be: flags contradictory claims",
  },
];
