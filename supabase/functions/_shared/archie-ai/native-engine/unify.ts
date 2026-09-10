// =========================================================
// ARCHIE NATIVE ENGINE — UNIFICATION (VARIABLE BINDING)
// supabase/functions/_shared/archie-ai/native-engine/unify.ts
//
// First-class unification over SPO fact patterns. Patterns may
// contain variables written as "?name" in subject, predicate or
// (string) object positions. Matching a pattern against a fact
// either consumes or extends a binding. This is the single
// change that lets rules GENERALIZE: "if ?x is-a building then
// ?x needs-a foundation" becomes expressible.
//
// Classic logic-programming unification, deterministic, fully
// testable, no external model anywhere.
// =========================================================

import type { Fact, FactPattern } from "./types.ts";

export type Binding = Map<string, string>;

export const VAR_PREFIX = "?";

const VAR_TOKEN_RE = /^\?[a-zA-Z][a-zA-Z0-9_-]*$/;
export function isVar(value: unknown): value is string {
  return typeof value === "string" && VAR_TOKEN_RE.test(value);
}

/** Extract the variables referenced by a pattern. */
export function patternVars(pattern: FactPattern): string[] {
  const vars: string[] = [];
  if (isVar(pattern.subject)) vars.push(pattern.subject);
  if (isVar(pattern.predicate)) vars.push(pattern.predicate);
  if (isVar(pattern.object)) vars.push(pattern.object);
  return vars;
}

/** Does this pattern contain any variable? */
export function hasVars(pattern: FactPattern): boolean {
  return patternVars(pattern).length > 0;
}

/**
 * Match one pattern against one fact under an existing binding.
 * - literal positions must be equal (subject/predicate: exact;
 *   object: JSON equality — the store's own semantics)
 * - variable positions bind if free, or must agree if already bound
 * Returns the extended binding, or null when the match fails.
 */
export function matchUnder(
  pattern: FactPattern,
  fact: Fact,
  binding: Binding,
): Binding | null {
  const extended: Binding = new Map(binding);

  // subject
  if (isVar(pattern.subject)) {
    if (!bindVar(extended, pattern.subject, fact.subject)) return null;
  } else if (pattern.subject !== undefined && pattern.subject !== fact.subject) {
    return null;
  }

  // predicate
  if (isVar(pattern.predicate)) {
    if (!bindVar(extended, pattern.predicate, fact.predicate)) return null;
  } else if (
    pattern.predicate !== undefined &&
    pattern.predicate !== fact.predicate
  ) {
    return null;
  }

  // object (variables only bind on string objects)
  if (isVar(pattern.object)) {
    if (typeof fact.object !== "string") return null;
    if (!bindVar(extended, pattern.object, fact.object)) return null;
  } else if (pattern.object !== undefined) {
    if (JSON.stringify(pattern.object) !== JSON.stringify(fact.object)) {
      return null;
    }
  }

  return extended;
}

/** Bind a variable if free; require agreement if already bound. */
function bindVar(binding: Binding, name: string, value: string): boolean {
  const existing = binding.get(name);
  if (existing === undefined) {
    binding.set(name, value);
    return true;
  }
  return existing === value;
}

/** Substitute bound variables into a pattern. Unbound variables
 *  remain verbatim (callers must decide whether that is legal,
 *  e.g. a conclusion may not contain unbound variables). */
export function substitute<T extends FactPattern>(pattern: T, binding: Binding): T {
  const out: FactPattern = { ...pattern };
  if (isVar(out.subject) && binding.has(out.subject)) {
    out.subject = binding.get(out.subject);
  }
  if (isVar(out.predicate) && binding.has(out.predicate)) {
    out.predicate = binding.get(out.predicate);
  }
  if (isVar(out.object) && binding.has(out.object)) {
    out.object = binding.get(out.object);
  }
  return out as T;
}

/** All variables in a substituted pattern that are still unbound. */
export function unboundVars(pattern: FactPattern, binding: Binding): string[] {
  return patternVars(pattern).filter((v) => !binding.has(v));
}

/**
 * Enumerate consistent bindings for a list of premise patterns
 * against a fact store's facts. Deterministic order, bounded so
 * a pathological rule cannot explode the inference budget.
 * Returns the substituted premise facts per binding (for
 * provenance) alongside each binding.
 */
export function enumerateBindings(
  conditions: FactPattern[],
  facts: Fact[],
  cap = 200,
): Array<{ binding: Binding; premiseFacts: Fact[] }> {
  let frontier: Array<{ binding: Binding; premiseFacts: Fact[] }> = [
    { binding: new Map(), premiseFacts: [] },
  ];
  for (const condition of conditions) {
    const next: Array<{ binding: Binding; premiseFacts: Fact[] }> = [];
    for (const { binding, premiseFacts } of frontier) {
      for (const fact of facts) {
        const extended = matchUnder(condition, fact, binding);
        if (extended) {
          next.push({ binding: extended, premiseFacts: [...premiseFacts, fact] });
          if (next.length >= cap) break;
        }
      }
      if (next.length >= cap) break;
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return frontier;
}
