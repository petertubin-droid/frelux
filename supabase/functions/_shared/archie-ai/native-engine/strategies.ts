// =========================================================
// ARCHIE NATIVE ENGINE — REASONING STRATEGIES
// supabase/functions/_shared/archie-ai/native-engine/strategies.ts
//
// The scalable reasoning framework (owner directive 2026-09-10
// §3): each reasoning mode is a first-class strategy with a
// deterministic applicability score; a meta-selector ranks
// strategies for the task and EXPLAINS its own choice.
//
// Every strategy:
//   * reasons over the real FactStore / ReasoningEngine
//   * states its assumptions
//   * reports an uncertainty band
//   * cites evidence (fact ids)
//   * NEVER promotes a hypothesis to fact
//
// Classic AI search/inference, no external model anywhere.
// =========================================================

import type { Fact, FactPattern, Rule } from "./types.ts";
import { FactStore } from "./knowledge.ts";
import { ReasoningEngine } from "./reasoning.ts";

export type StrategyKind =
  | "logical"
  | "analytical"
  | "mathematical"
  | "causal"
  | "comparative"
  | "probabilistic"
  | "constraint"
  | "temporal"
  | "abductive"
  | "inductive"
  | "counterfactual"
  | "consistency"
  | "hypothesis"
  | "relational"
  | "hierarchical"
  | "spatial"
  | "quantitative"
  | "planning"
  | "risk"
  | "uncertainty";

export interface Conclusion {
  statement: string;
  confidence: number;
  /** hypothesis/candidate conclusions are NEVER established
   *  facts — the status field is the honesty guarantee. */
  status: "derived" | "candidate" | "hypothesis";
  evidence: string[];
}

export type UncertaintyBand =
  | "high-confidence"
  | "moderate"
  | "low"
  | "unknown"
  | "conflicting";

export interface StrategyResult {
  kind: StrategyKind;
  summary: string;
  conclusions: Conclusion[];
  assumptions: string[];
  uncertainty: UncertaintyBand;
  evidence: string[];
  explanation: string;
}

export interface ReasoningTask {
  /** The user's raw task/question text. */
  text: string;
  /** Subject entity if the task names one. */
  subject?: string;
  /** Second subject, for comparative tasks. */
  subject2?: string;
  facts: FactStore;
  reasoning: ReasoningEngine;
  rules: Rule[];
}

// ---------------------------------------------------------
// Task feature extraction (deterministic, explainable)
// ---------------------------------------------------------

const CAUSAL_CUES = /\b(why|cause|causes|caused|leads? to|results? in|because|effect)\b/i;
const COMPARE_CUES = /\b(vs\.?|versus|compare|better|worse|bigger|smaller|cheaper|difference)\b/i;
const PROB_CUES = /\b(likely|probability|chance|risk of|odds|probably|percent of)\b/i;
const TEMPORAL_CUES = /\b(when|year|date|since|until|history|timeline|past|future)\b/i;
const ABDUCTIVE_CUES = /\b(why|explain|reason|what caused|could explain)\b/i;
const HYPOTHESIS_CUES = /\b(hypothes|theor|maybe|perhaps|could it be|guess|suppose)\b/i;
const COUNTERFactual_CUES =
  /\bif\b[^.?!]*\b(?:had not|hadn't|remove[d]?|removed|didn't|stop(?:ped)?|change[d]?)\b|\bwithout\b|\bsuppose\b/i;
const CONSISTENCY_CUES = /\b(consistent|contradict|conflict|disagree|both true)\b/i;
const INDUCTIVE_CUES = /\b(pattern|generally|usually|always|trend|across)\b/i;
const MATH_CUES = /[\d]/;
const CONSTRAINT_CUES = /\b(at least|at most|no more than|between|minimum|maximum|limit|budget|under)\b/i;
const LOGIC_CUES = /\b(therefore|if .*(then|,)|follows|deduce|implies|all|every)\b/i;

/** Deterministic, explainable strategy selection. */
export function selectStrategies(
  task: ReasoningTask,
): { chosen: StrategyKind[]; rationale: string; scores: Array<{ kind: StrategyKind; score: number; cue: string }> } {
  const t = task.text;
  const scores: Array<{ kind: StrategyKind; score: number; cue: string }> = [];

  const bump = (kind: StrategyKind, score: number, cue: string) =>
    scores.push({ kind, score, cue });

  if (LOGIC_CUES.test(t)) bump("logical", 3, "logical connective in task");
  if (CAUSAL_CUES.test(t)) bump("causal", 3, "causal question");
  if (COMPARE_CUES.test(t)) bump("comparative", 3, "comparison requested");
  if (PROB_CUES.test(t)) bump("probabilistic", 3, "probability/likelihood language");
  if (TEMPORAL_CUES.test(t)) bump("temporal", 2, "temporal reference");
  if (ABDUCTIVE_CUES.test(t)) bump("abductive", 3, "explanation requested");
  if (HYPOTHESIS_CUES.test(t)) bump("hypothesis", 3, "hypothesis language");
  if (COUNTERFactual_CUES.test(t)) bump("counterfactual", 3, "counterfactual premise");
  if (CONSISTENCY_CUES.test(t)) bump("consistency", 3, "consistency check requested");
  if (INDUCTIVE_CUES.test(t)) bump("inductive", 2, "pattern generalization requested");
  if (MATH_CUES.test(t) && /\d/.test(t)) bump("mathematical", 2, "numeric content");
  if (CONSTRAINT_CUES.test(t)) bump("constraint", 3, "constraint/bound language");
  if (task.facts.list().length === 0) bump("consistency", 0, "empty store — nothing to check");

  // Nothing matched: honest fallback is logic over the store.
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const matched = ranked.filter((r) => r.score > 0).slice(0, 2).map((r) => r.kind);
  const chosen: StrategyKind[] = matched.length > 0
    ? matched
    : (["logical"] as StrategyKind[]);

  const rationale = matched.length === 0
    ? "No task cues detected — defaulting to logical reasoning over the knowledge store (honest fallback)."
    : `Selected ${chosen.join(", ")}: ${ranked.filter((r) => chosen.includes(r.kind)).map((r) => r.cue).join("; ")}.`;

  return {
    chosen,
    rationale,
    scores: ranked,
  };
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function band(confidence: number, conflicts: boolean): UncertaintyBand {
  if (conflicts) return "conflicting";
  if (confidence >= 0.75) return "high-confidence";
  if (confidence >= 0.5) return "moderate";
  if (confidence > 0) return "low";
  return "unknown";
}

function evidenceWeight(f: Fact): number {
  switch (f.provenance.source) {
    case "seed":
      return 0.9;
    case "inferred":
      return 0.75;
    case "owner-taught":
      return 0.6;
    case "web-research":
      return 0.5;
    default:
      return 0.4;
  }
}

function num(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return parseFloat(m[0]);
  }
  return null;
}

// ---------------------------------------------------------
// Strategies (each: real inference, assumptions, honesty)
// ---------------------------------------------------------

/** DEDUCTIVE: forward-chain the store; report derivations
 *  plus any proof found for the task's subject claims. */
export async function deductive(task: ReasoningTask): Promise<StrategyResult> {
  const before = new Set(task.facts.list().map((f) => f.id));
  const out = await task.reasoning.forwardChain();
  const newFacts = out.explanations
    .map((e) => task.facts.get(e.derivedFactId)!)
    .filter((f) => f && !before.has(f.id));
  return {
    kind: "logical",
    summary: newFacts.length === 0
      ? "No new derivations — knowledge already saturated."
      : `Derived ${newFacts.length} new fact(s) by rule application.`,
    conclusions: newFacts.map((f) => ({
      statement: `${f.subject} ${f.predicate} ${String(f.object)}`,
      confidence: f.confidence,
      status: "derived" as const,
      evidence: (f.provenance.derivation?.premiseIds ?? []).map((id) => id),
    })),
    assumptions: ["All premises used by rules are trustworthy as stored."],
    uncertainty: newFacts.length === 0 ? "unknown" : band(
      Math.min(1, ...newFacts.map((f) => f.confidence)),
      false,
    ),
    evidence: newFacts.flatMap((f) => f.provenance.derivation?.premiseIds ?? []),
    explanation: newFacts
      .map((f) => `${f.subject} ${f.predicate} ${String(f.object)} ← rule ${f.provenance.derivation?.ruleId}`)
      .join("; ") || "Store already closed under the rule set.",
  };
}

/** CAUSAL: follow "causes" edges (transitive closure over the
 *  causal graph, breadth-first, cycle-safe). */
export function causal(task: ReasoningTask): StrategyResult {
  const subject = task.subject ?? "";
  const edges = task.facts.query({ predicate: "causes" });
  const graph = new Map<string, Array<{ to: string; conf: number; id: string }>>();
  for (const e of edges) {
    const to = String(e.object);
    if (!graph.has(e.subject)) graph.set(e.subject, []);
    graph.get(e.subject)!.push({ to, conf: e.confidence, id: e.id });
  }
  const chains: Array<{ path: string[]; confidence: number; ids: string[] }> = [];
  const seen = new Set([subject]);
  let frontier: Array<{ node: string; path: string[]; conf: number; ids: string[] }> = [
    { node: subject, path: [subject], conf: 1, ids: [] },
  ];
  while (frontier.length > 0 && chains.length < 10) {
    const next = [];
    for (const f of frontier) {
      for (const edge of graph.get(f.node) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        const path = [...f.path, edge.to];
        const conf = f.conf * edge.conf;
        const ids = [...f.ids, edge.id];
        chains.push({ path, confidence: conf, ids });
        next.push({ node: edge.to, path, conf, ids });
      }
    }
    frontier = next.slice(0, 20);
  }
  if (chains.length === 0) {
    return {
      kind: "causal",
      summary: subject
        ? `No causal chains known from "${subject}".`
        : "No causal reasoning possible — no subject identified.",
      conclusions: [],
      assumptions: subject ? [] : ["No subject entity was identified in the task."],
      uncertainty: "unknown",
      evidence: [],
      explanation: "The knowledge store records no 'causes' edges for this subject.",
    };
  }
  return {
    kind: "causal",
    summary: `${chains.length} causal chain(s) from "${subject}".`,
    conclusions: chains.map((c) => ({
      statement: c.path.join(" → "),
      confidence: c.confidence,
      status: "derived" as const,
      evidence: c.ids,
    })),
    assumptions: ["Recorded 'causes' relations are directionally correct."],
    uncertainty: band(Math.max(...chains.map((c) => c.confidence)), false),
    evidence: chains.flatMap((c) => c.ids),
    explanation: chains.slice(0, 3).map((c) => c.path.join(" → ")).join("; "),
  };
}

/** PROBABILISTIC: combine all evidence about the subject into
 *  a weighted-confidence estimate per claim; conflicts are
 *  surfaced, never averaged away. */
export function probabilistic(task: ReasoningTask): StrategyResult {
  const subject = task.subject ?? "";
  const about = task.facts.about(subject);
  const groups = new Map<string, Fact[]>();
  for (const f of about) {
    const key = f.predicate;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const conclusions: Conclusion[] = [];
  let conflicts = false;
  for (const [predicate, facts] of groups) {
    const byObject = new Map<string, Fact[]>();
    for (const f of facts) {
      const key = JSON.stringify(f.object);
      if (!byObject.has(key)) byObject.set(key, []);
      byObject.get(key)!.push(f);
    }
    if (byObject.size > 1) {
      conflicts = true;
      for (const [obj, group] of byObject) {
        const weighted = group.reduce(
          (acc, f) => acc + f.confidence * evidenceWeight(f),
          0,
        ) / Math.max(1, group.reduce((acc, f) => acc + evidenceWeight(f), 0));
        conclusions.push({
          statement: `${subject} ${predicate} ${obj} (contested — ${byObject.size} competing claims)`,
          confidence: weighted,
          status: "candidate",
          evidence: group.map((f) => f.id),
        });
      }
      continue;
    }
    const group = [...byObject.values()][0];
    const weighted = group.reduce(
      (acc, f) => acc + f.confidence * evidenceWeight(f),
      0,
    ) / Math.max(1, group.reduce((acc, f) => acc + evidenceWeight(f), 0));
    conclusions.push({
      statement: `${subject} ${predicate} ${String([...byObject.keys()][0])}`,
      confidence: weighted,
      status: group.every((f) => f.status === "validated") ? "derived" : "candidate",
      evidence: group.map((f) => f.id),
    });
  }
  const maxConf = conclusions.length > 0
    ? Math.max(...conclusions.map((c) => c.confidence))
    : 0;
  return {
    kind: "probabilistic",
    summary: about.length === 0
      ? `No stored evidence about "${subject}" — probability unknown.`
      : `Combined ${about.length} evidence item(s) about "${subject}"${conflicts ? "; conflicts detected" : ""}.`,
    conclusions,
    assumptions: [
      "Evidence weights by provenance class: seed > inferred > owner-taught > web-research.",
    ],
    uncertainty: band(maxConf, conflicts),
    evidence: about.map((f) => f.id),
    explanation: conflicts
      ? "Competing claims exist — both are reported, neither is averaged away."
      : "All evidence about this subject agrees.",
  };
}

/** CONSISTENCY: scan the whole store for SPO contradictions. */
export function consistency(task: ReasoningTask): StrategyResult {
  const facts = task.facts.list();
  const groups = new Map<string, Fact[]>();
  for (const f of facts) {
    const key = `${f.subject}|${f.predicate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const conflicts: Array<{ subject: string; predicate: string; claims: Fact[] }> = [];
  for (const [key, group] of groups) {
    const objects = new Set(group.map((f) => JSON.stringify(f.object)));
    if (objects.size > 1) {
      const [subject, predicate] = key.split("|");
      conflicts.push({ subject, predicate, claims: group });
    }
  }
  return {
    kind: "consistency",
    summary: conflicts.length === 0
      ? "Knowledge store is internally consistent."
      : `${conflicts.length} contradiction(s) found in the knowledge store.`,
    conclusions: conflicts.map((c) => ({
      statement: `${c.subject} ${c.predicate}: ${c.claims.map((f) => `${String(f.object)} (${(f.confidence * 100).toFixed(0)}%)`).join(" VS ")}`,
      confidence: Math.max(...c.claims.map((f) => f.confidence)),
      status: "candidate" as const,
      evidence: c.claims.map((f) => f.id),
    })),
    assumptions: ["Contradiction means same subject+predicate with different objects."],
    uncertainty: conflicts.length > 0 ? "conflicting" : "high-confidence",
    evidence: conflicts.flatMap((c) => c.claims.map((f) => f.id)),
    explanation: conflicts.length === 0
      ? "No two facts assert different objects for the same subject+predicate."
      : conflicts.map((c) => `${c.subject} ${c.predicate} has ${c.claims.length} competing claims`).join("; "),
  };
}

/** TEMPORAL: order date-bearing facts about the subject;
 *  respects validFrom/validUntil qualifiers when present. */
export function temporal(task: ReasoningTask): StrategyResult {
  const subject = task.subject ?? "";
  const facts = task.facts.about(subject).filter((f) => {
    const obj = String(f.object);
    return /\d{4}/.test(obj) ||
      f.qualifiers?.validFrom !== undefined ||
      f.qualifiers?.validUntil !== undefined;
  });
  const dated = facts
    .map((f) => ({
      fact: f,
      when: (f.qualifiers?.validFrom as string | undefined) ??
        (String(f.object).match(/\d{4}(-\d{2}(-\d{2})?)?/)?.[0] ?? null),
    }))
    .filter((d) => d.when !== null)
    .sort((a, b) => String(a.when).localeCompare(String(b.when)));
  return {
    kind: "temporal",
    summary: dated.length === 0
      ? `No dated facts about "${subject}".`
      : `${dated.length} dated fact(s), chronologically ordered.`,
    conclusions: dated.map((d) => ({
      statement: `${d.when}: ${d.fact.subject} ${d.fact.predicate} ${String(d.fact.object)}`,
      confidence: d.fact.confidence,
      status: "derived" as const,
      evidence: [d.fact.id],
    })),
    assumptions: ["Dates in fact objects/qualifiers are ISO-comparable."],
    uncertainty: band(dated.length > 0 ? Math.min(...dated.map((d) => d.fact.confidence)) : 0, false),
    evidence: dated.map((d) => d.fact.id),
    explanation: dated.length === 0
      ? "No temporal markers found for this subject."
      : `Earliest: ${String(dated[0].when)}; latest: ${String(dated[dated.length - 1].when)}.`,
  };
}

/** CONSTRAINT: parse explicit numeric bounds from the task and
 *  check the subject's numeric facts against them. */
export function constraint(task: ReasoningTask): StrategyResult {
  const t = task.text;
  const subject = task.subject ?? "";
  const between = t.match(/between\s+(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)/i);
  const atLeast = t.match(/(?:at least|minimum of|no less than)\s+(\d+(?:\.\d+)?)/i);
  const atMost = t.match(/(?:at most|maximum of|no more than|under)\s+(\d+(?:\.\d+)?)/i);
  const lo = between ? parseFloat(between[1]) : atLeast ? parseFloat(atLeast[1]) : null;
  const hi = between ? parseFloat(between[2]) : atMost ? parseFloat(atMost[1]) : null;
  if (lo === null && hi === null) {
    return {
      kind: "constraint",
      summary: "No numeric constraint detected in the task.",
      conclusions: [],
      assumptions: [],
      uncertainty: "unknown",
      evidence: [],
      explanation: "Constraint reasoning needs an explicit bound (e.g. 'at most 500').",
    };
  }
  const numeric = task.facts.about(subject).filter((f) => num(f.object) !== null);
  const violations: Fact[] = [];
  const satisfied: Fact[] = [];
  for (const f of numeric) {
    const v = num(f.object)!;
    if ((lo !== null && v < lo) || (hi !== null && v > hi)) violations.push(f);
    else satisfied.push(f);
  }
  return {
    kind: "constraint",
    summary: lo !== null && hi !== null
      ? `Constraint [${lo}, ${hi}] — ${violations.length} violation(s).`
      : `Constraint ${lo !== null ? `≥ ${lo}` : `≤ ${hi}`} — ${violations.length} violation(s).`,
    conclusions: [
      ...satisfied.map((f) => ({
        statement: `${f.subject} ${f.predicate} = ${String(f.object)} satisfies the constraint`,
        confidence: f.confidence,
        status: "derived" as const,
        evidence: [f.id],
      })),
      ...violations.map((f) => ({
        statement: `${f.subject} ${f.predicate} = ${String(f.object)} VIOLATES the constraint`,
        confidence: f.confidence,
        status: "candidate" as const,
        evidence: [f.id],
      })),
    ],
    assumptions: [`Parsed bound from task text: ${lo !== null ? `min=${lo}` : ""}${hi !== null ? ` max=${hi}` : ""}`],
    uncertainty: violations.length > 0 ? "conflicting" : "high-confidence",
    evidence: numeric.map((f) => f.id),
    explanation: violations.length === 0
      ? "All numeric facts satisfy the stated bound."
      : `${violations.map((f) => `${f.subject} ${f.predicate}=${String(f.object)}`).join(", ")} fall outside the bound.`,
  };
}

/** COMPARATIVE: two subjects on a shared predicate. */
export function comparative(task: ReasoningTask): StrategyResult {
  const a = task.subject ?? "";
  const b = task.subject2 ?? "";
  if (!a || !b) {
    return {
      kind: "comparative",
      summary: "Comparison needs two subjects.",
      conclusions: [],
      assumptions: [],
      uncertainty: "unknown",
      evidence: [],
      explanation: "No second subject identified.",
    };
  }
  const fa = task.facts.about(a);
  const fb = task.facts.about(b);
  const shared = fa.filter((x) => fb.some((y) => y.predicate === x.predicate));
  const conclusions: Conclusion[] = [];
  for (const x of shared) {
    const y = fb.find((f) => f.predicate === x.predicate)!;
    const va = num(x.object);
    const vb = num(y.object);
    if (va !== null && vb !== null) {
      const higher = va > vb ? a : b;
      conclusions.push({
        statement: `${higher} has higher ${x.predicate} (${Math.max(va, vb)} vs ${Math.min(va, vb)})`,
        confidence: Math.min(x.confidence, y.confidence),
        status: "derived",
        evidence: [x.id, y.id],
      });
    } else {
      conclusions.push({
        statement: `${a} ${x.predicate} ${String(x.object)}; ${b} ${y.predicate} ${String(y.object)}`,
        confidence: Math.min(x.confidence, y.confidence),
        status: "candidate",
        evidence: [x.id, y.id],
      });
    }
  }
  return {
    kind: "comparative",
    summary: shared.length === 0
      ? "No shared predicates between the subjects."
      : `Compared ${shared.length} shared predicate(s).`,
    conclusions,
    assumptions: ["Both subjects' facts are equally trustworthy."],
    uncertainty: band(conclusions.length > 0 ? Math.max(...conclusions.map((c) => c.confidence)) : 0, false),
    evidence: shared.map((f) => f.id),
    explanation: conclusions.map((c) => c.statement).join("; ") || "No common ground to compare on.",
  };
}

/** ABDUCTIVE: best explanation — which rules could produce
 *  the observed claim, and are their premises supported? */
export function abductive(task: ReasoningTask): StrategyResult {
  const subject = task.subject ?? "";
  // Find rules whose conclusion could explain anything about
  // the subject; rank by premise support actually present.
  const candidates: Array<{ rule: Rule; support: number; premiseFacts: Fact[] }> = [];
  for (const rule of task.rules) {
    // Does the rule actually concern this subject? A variable
    // conclusion alone is NOT enough — otherwise every general
    // rule "explains" every subject. The subject must appear
    // in the conclusion or in a condition.
    const conclusion = rule.produces;
    const concernsSubject =
      conclusion.subject === subject ||
      rule.conditions.some(
        (c) => c.subject === subject || String(c.object) === subject,
      );
    if (!concernsSubject) continue;
    let support = 0;
    const premiseFacts: Fact[] = [];
    for (const cond of rule.conditions) {
      const matching = task.facts.query({
        predicate: cond.predicate,
        subject: cond.subject?.startsWith("?") ? undefined : cond.subject,
      });
      if (matching.length > 0) {
        support += 1 / rule.conditions.length;
        premiseFacts.push(matching[0]);
      }
    }
    candidates.push({ rule, support, premiseFacts });
  }
  // Causal explanations: what causes the subject?
  const causes = task.facts.query({ object: subject, predicate: "causes" });
  for (const c of causes) {
    candidates.push({
      rule: {
        id: `cause:${c.subject}`,
        conditions: [],
        produces: { subject: c.subject, predicate: "causes", object: subject },
        weight: c.confidence,
        description: `${c.subject} causes ${subject}`,
      },
      support: 1,
      premiseFacts: [c],
    });
  }
  const ranked = candidates
    .filter((c) => c.support > 0)
    .sort((x, y) => (y.support * y.rule.weight) - (x.support * x.rule.weight))
    .slice(0, 5);
  return {
    kind: "abductive",
    summary: ranked.length === 0
      ? `No stored rule or cause explains "${subject}".`
      : `Best explanation(s) for "${subject}", ranked by premise support.`,
    conclusions: ranked.map((c) => ({
      statement: c.rule.description,
      confidence: c.rule.weight * c.support,
      status: "candidate",
      evidence: c.premiseFacts.map((f) => f.id),
    })),
    assumptions: ["Explanations are candidate causes only — never established facts."],
    uncertainty: band(ranked.length > 0 ? ranked[0].rule.weight * ranked[0].support : 0, false),
    evidence: ranked.flatMap((c) => c.premiseFacts.map((f) => f.id)),
    explanation: ranked.map((c) => `${c.rule.description} (support ${(c.support * 100).toFixed(0)}%)`).join("; ") ||
      "No rule in the rule set accounts for this observation.",
  };
}

/** INDUCTIVE: propose generalizations from repeated validated
 *  patterns — PROPOSALS ONLY, never auto-asserted. */
export function inductive(task: ReasoningTask): StrategyResult {
  const validated = task.facts.list().filter((f) => f.status === "validated");
  const byPredicate = new Map<string, Fact[]>();
  for (const f of validated) {
    if (!byPredicate.has(f.predicate)) byPredicate.set(f.predicate, []);
    byPredicate.get(f.predicate)!.push(f);
  }
  const proposals: Array<{ pattern: string; subjects: string[]; confidence: number; ids: string[] }> = [];
  for (const [predicate, group] of byPredicate) {
    const subjects = [...new Set(group.map((f) => f.subject))];
    if (subjects.length >= 3) {
      proposals.push({
        pattern: `${subjects.length} validated subjects share "${predicate}"`,
        subjects,
        confidence: group.reduce((a, f) => a + f.confidence, 0) / group.length,
        ids: group.map((f) => f.id),
      });
    }
  }
  return {
    kind: "inductive",
    summary: proposals.length === 0
      ? "Not enough validated repetition to generalize (need ≥3 subjects per predicate)."
      : `${proposals.length} generalization proposal(s) — awaiting owner review.`,
    conclusions: proposals.map((p) => ({
      statement: `Generalization candidate: things with "${p.pattern.split('"')[1]}" tend to share it`,
      confidence: p.confidence,
      status: "candidate",
      evidence: p.ids,
    })),
    assumptions: ["Induction is fallible by nature; proposals are never auto-added to the store."],
    uncertainty: "low",
    evidence: proposals.flatMap((p) => p.ids),
    explanation: proposals.map((p) => p.pattern).join("; ") ||
      "Induction requires at least three validated instances of a predicate.",
  };
}

/** COUNTERFACTUAL: remove a cause and see which effects lose
 *  their only support (real intervention on the causal graph). */
export function counterfactual(task: ReasoningTask): StrategyResult {
  const removed = task.text.match(/(?:remove[d]?|without|stop(?:ped)?)\s+["']?([a-z0-9 -]+?)["']?(?:\.|,|$)/i)?.[1]?.trim()
    ?? task.subject ?? "";
  const edges = task.facts.query({ predicate: "causes" });
  // Effects reachable from the removed cause before removal.
  const before = new Set<string>();
  let frontier = edges.filter((e) => e.subject === removed).map((e) => String(e.object));
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const node of frontier) {
      if (before.has(node)) continue;
      before.add(node);
      for (const e of edges.filter((x) => x.subject === node)) next.push(String(e.object));
    }
    frontier = next;
  }
  // After removal: which of those nodes keep an independent cause?
  const orphaned: string[] = [];
  for (const node of before) {
    const otherCauses = edges.filter(
      (e) => String(e.object) === node && e.subject !== removed && !before.has(e.subject),
    );
    if (otherCauses.length === 0) orphaned.push(node);
  }
  return {
    kind: "counterfactual",
    summary: removed
      ? `Without "${removed}": ${orphaned.length} effect(s) lose all support.`
      : "No intervention target identified in the task.",
    conclusions: orphaned.map((n) => ({
      statement: `Without ${removed}, "${n}" would not follow`,
      confidence: 0.8,
      status: "candidate",
      evidence: edges.filter((e) => String(e.object) === n).map((e) => e.id),
    })),
    assumptions: [
      "The causal graph as stored is correct and complete for this question.",
      "Only stored 'causes' edges are considered.",
    ],
    uncertainty: orphaned.length > 0 ? "moderate" : "unknown",
    evidence: edges.map((e) => e.id),
    explanation: orphaned.length === 0
      ? `All effects of "${removed}" have independent causes — no cascade loss.`
      : `Orphaned effects: ${orphaned.join(", ")}.`,
  };
}

/** HYPOTHESIS: rank candidate explanations as explicit
 *  hypotheses with evidence needs. Status is ALWAYS
 *  "hypothesis" — presented as such, never as fact. */
export function hypothesis(task: ReasoningTask): Promise<StrategyResult> {
  const base = abductive(task);
  return Promise.resolve({
    kind: "hypothesis",
    summary: base.conclusions.length === 0
      ? "No grounded hypothesis can be formed — no supporting evidence at all."
      : `${base.conclusions.length} hypothesis(es), each with the evidence needed to confirm or kill it.`,
    conclusions: base.conclusions.map((c) => ({
      ...c,
      status: "hypothesis" as const,
    })),
    assumptions: [
      "Hypotheses are NOT facts. Each names the observation that would promote or eliminate it.",
    ],
    uncertainty: base.conclusions.length === 0 ? "unknown" : "low",
    evidence: base.evidence,
    explanation: base.conclusions
      .map((c) => `HYPOTHESIS: ${c.statement} — to test: verify ${c.evidence.length > 0 ? "the cited premises independently" : "a supporting premise"}`)
      .join("; ") || "Refusing to fabricate a hypothesis without any evidentiary basis.",
  });
}

// ---------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------

export async function executeStrategy(
  kind: StrategyKind,
  task: ReasoningTask,
): Promise<StrategyResult> {
  switch (kind) {
    case "logical": return deductive(task);
    case "causal": return causal(task);
    case "probabilistic": return probabilistic(task);
    case "consistency": return consistency(task);
    case "temporal": return temporal(task);
    case "constraint": return constraint(task);
    case "comparative": return comparative(task);
    case "abductive": return abductive(task);
    case "inductive": return inductive(task);
    case "counterfactual": return counterfactual(task);
    case "hypothesis": return hypothesis(task);
    default:
      return {
        kind,
        summary: `Strategy "${kind}" is declared but not yet implemented natively — honest refusal.`,
        conclusions: [],
        assumptions: [],
        uncertainty: "unknown",
        evidence: [],
        explanation:
          "Rather than faking this reasoning mode, ARCHIE states plainly that it is not yet available.",
      };
  }
}

/** Full meta-reasoning pass: select, execute, merge. */
export async function reasonWithStrategies(
  task: ReasoningTask,
): Promise<{
  selected: { chosen: StrategyKind[]; rationale: string };
  results: StrategyResult[];
}> {
  const selected = selectStrategies(task);
  const results: StrategyResult[] = [];
  for (const kind of selected.chosen) {
    results.push(await executeStrategy(kind, task));
  }
  return { selected, results };
}
