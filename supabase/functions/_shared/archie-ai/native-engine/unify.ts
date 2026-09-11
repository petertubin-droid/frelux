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
 * A pattern pre-resolved to var/literal positions. Perf pass
 * 2026-09-11: matchUnder ran a VAR_TOKEN_RE regex on every
 * position of every candidate fact in the hot loop (~24k
 * regex execs per forward chain at 200 facts — the chain
 * profiled at 6.3ms while deriving NOTHING). Rule patterns
 * are fixed per rule, so each pattern is compiled once and
 * cached; the hot loop is then Map lookups + string equality.
 */
interface CompiledPattern {
  subjectVar: string | null;
  subjectLit: string | undefined;
  predicateVar: string | null;
  predicateLit: string | undefined;
  objectVar: string | null;
  objectLit: unknown;
}

const compileCache = new WeakMap<FactPattern, CompiledPattern>();

function compile(pattern: FactPattern): CompiledPattern {
  const hit = compileCache.get(pattern);
  if (hit) return hit;
  const c: CompiledPattern = {
    subjectVar: isVar(pattern.subject) ? pattern.subject : null,
    subjectLit: isVar(pattern.subject) ? undefined : pattern.subject,
    predicateVar: isVar(pattern.predicate) ? pattern.predicate : null,
    predicateLit: isVar(pattern.predicate) ? undefined : pattern.predicate,
    objectVar: isVar(pattern.object) ? pattern.object : null,
    objectLit: isVar(pattern.object) ? undefined : pattern.object,
  };
  compileCache.set(pattern, c);
  return c;
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
  const c = compile(pattern);

  // Perf pass 2026-09-11: verify every position against the
  // binding BEFORE allocating the extended Map — the chain loop
  // previously allocated a fresh binding per candidate fact
  // and discarded it on the first mismatch.
  // subject
  if (c.subjectVar !== null) {
    const v = binding.get(c.subjectVar);
    if (v !== undefined && v !== fact.subject) return null;
  } else if (c.subjectLit !== undefined && c.subjectLit !== fact.subject) {
    return null;
  }

  // predicate
  if (c.predicateVar !== null) {
    const v = binding.get(c.predicateVar);
    if (v !== undefined && v !== fact.predicate) return null;
  } else if (
    c.predicateLit !== undefined &&
    c.predicateLit !== fact.predicate
  ) {
    return null;
  }

  // object (variables only bind on string objects)
  if (c.objectVar !== null) {
    if (typeof fact.object !== "string") return null;
    const v = binding.get(c.objectVar);
    if (v !== undefined && v !== fact.object) return null;
  } else if (c.objectLit !== undefined) {
    if (JSON.stringify(c.objectLit) !== JSON.stringify(fact.object)) {
      return null;
    }
  }

  const extended: Binding = new Map(binding);
  if (c.subjectVar !== null) extended.set(c.subjectVar, fact.subject);
  if (c.predicateVar !== null) extended.set(c.predicateVar, fact.predicate);
  if (c.objectVar !== null) extended.set(c.objectVar, fact.object as string);
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
  /** Perf pass 2026-09-11: optional per-condition candidate
   *  narrowing. A condition with a literal subject/predicate
   *  only needs the facts that carry it — the frontier join
   *  previously scanned EVERY fact for EVERY binding, so a
   *  two-condition rule over 200 facts cost up to 40,000
   *  candidate matches even when the second condition's
   *  literal predicate matched nothing. When no narrowing
   *  provider is given the behavior is identical to before. */
  narrow?: (condition: FactPattern) => Fact[],
): Array<{ binding: Binding; premiseFacts: Fact[] }> {
  let frontier: Array<{ binding: Binding; premiseFacts: Fact[] }> = [
    { binding: new Map(), premiseFacts: [] },
  ];
  for (const condition of conditions) {
    const pool = narrow ? narrow(condition) : facts;
    const next: Array<{ binding: Binding; premiseFacts: Fact[] }> = [];
    for (const { binding, premiseFacts } of frontier) {
      for (const fact of pool) {
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
