import { describe, it, expect } from "vitest";
import { FactStore } from "@studio-shared/archie-ai/native-engine/knowledge.ts";
import {
  ReasoningEngine,
  GENERAL_RULES,
} from "@studio-shared/archie-ai/native-engine/reasoning.ts";
import {
  selectStrategies,
  executeStrategy,
  reasonWithStrategies,
  type ReasoningTask,
} from "@studio-shared/archie-ai/native-engine/strategies.ts";

// =========================================================
// ARCHIE NATIVE ENGINE — REASONING STRATEGIES
// src/lib/archie/__tests__/strategies.test.ts
//
// Every strategy reasons over REAL store data, states its
// assumptions, reports an uncertainty band, cites evidence,
// and never promotes a hypothesis to a fact.
// =========================================================

function seed0(s: string, p: string, o: string, confidence = 0.9) {
  return {
    subject: s,
    predicate: p,
    object: o,
    confidence,
    provenance: { source: "seed" as const },
    status: "validated" as const,
  };
}

async function task(
  text: string,
  opts?: { subject?: string; subject2?: string; seed?: Parameters<FactStore["assert"]>[0][] },
): Promise<ReasoningTask> {
  const fs = new FactStore();
  for (const s of opts?.seed ?? []) await fs.assert(s);
  return {
    text,
    subject: opts?.subject,
    subject2: opts?.subject2,
    facts: fs,
    reasoning: new ReasoningEngine(fs, GENERAL_RULES),
    rules: GENERAL_RULES,
  };
}

describe("Strategy selection (meta-reasoning)", () => {
  it("selects causal for 'why' questions", async () => {
    const t = await task("why does the roof leak?", { subject: "roof-leak" });
    const sel = selectStrategies(t);
    expect(sel.chosen).toContain("causal");
    expect(sel.rationale).toMatch(/causal question/);
  });

  it("selects probabilistic for likelihood language", async () => {
    const t = await task("what is the probability of rain?");
    expect(selectStrategies(t).chosen).toContain("probabilistic");
  });

  it("selects hypothesis for speculative language", async () => {
    const t = await task("maybe the crack is structural — any theory?");
    expect(selectStrategies(t).chosen).toContain("hypothesis");
  });

  it("falls back honestly to logical when nothing matches", async () => {
    const t = await task("tell me something");
    const sel = selectStrategies(t);
    expect(sel.chosen).toEqual(["logical"]);
    expect(sel.rationale).toMatch(/honest fallback/i);
  });

  it("limits selection to two strategies", async () => {
    const t = await task("why is it cheaper? compare probability and risk, what caused it, maybe a pattern, at least 3 and at most 5");
    expect(selectStrategies(t).chosen.length).toBeLessThanOrEqual(2);
  });
});

describe("Causal strategy", () => {
  it("follows transitive causal chains with confidence products", async () => {
    const t = await task("why does the site flood?", { subject: "heavy-rain" , seed: [
      seed0("heavy-rain", "causes", "soil-saturation"),
      seed0("soil-saturation", "causes", "runoff"),
      seed0("runoff", "causes", "site-flooding"),
    ]});
    const r = await executeStrategy("causal", t);
    expect(r.kind).toBe("causal");
    const full = r.conclusions.find((c) => c.statement.includes("site-flooding"));
    expect(full).toBeDefined();
    expect(full!.confidence).toBeCloseTo(0.9 * 0.9 * 0.9, 5);
  });

  it("honestly reports no chains when none exist", async () => {
    const t = await task("why?", { subject: "nothing" });
    const r = await executeStrategy("causal", t);
    expect(r.conclusions).toEqual([]);
    expect(r.uncertainty).toBe("unknown");
  });
});

describe("Probabilistic strategy", () => {
  it("combines weighted evidence and reports a band", async () => {
    const t = await task("how likely is beam failure?", { subject: "beam", seed: [
      seed0("beam", "load-capacity", "450 kN", 0.8),
      seed0("beam", "load-capacity", "450 kN", 0.7),
    ]});
    const r = await executeStrategy("probabilistic", t);
    expect(r.conclusions.length).toBe(1);
    expect(r.uncertainty).toBe("high-confidence");
  });

  it("surfaces conflicts — never averages away competing claims", async () => {
    const t = await task("what is the slab thickness?", { subject: "slab", seed: [
      seed0("slab", "thickness", "150mm", 0.9),
      seed0("slab", "thickness", "200mm", 0.4),
    ]});
    const r = await executeStrategy("probabilistic", t);
    expect(r.uncertainty).toBe("conflicting");
    expect(r.conclusions.length).toBe(2);
    expect(r.conclusions.every((c) => c.statement.includes("contested"))).toBe(true);
  });
});

describe("Consistency strategy", () => {
  it("detects SPO contradictions across the store", async () => {
    const t = await task("are my records consistent?", { seed: [
      seed0("roof-pitch", "angle", "30 degrees"),
      seed0("roof-pitch", "angle", "45 degrees"),
      seed0("wall", "material", "brick"),
    ]});
    const r = await executeStrategy("consistency", t);
    expect(r.uncertainty).toBe("conflicting");
    expect(r.conclusions.length).toBe(1);
    expect(r.conclusions[0].statement).toContain("VS");
  });

  it("certifies a clean store", async () => {
    const t = await task("consistency check", { seed: [seed0("roof", "material", "tiles")] });
    const r = await executeStrategy("consistency", t);
    expect(r.summary).toMatch(/internally consistent/);
  });
});

describe("Temporal strategy", () => {
  it("orders dated facts chronologically", async () => {
    const t = await task("history of the project", { subject: "project", seed: [
      seed0("project", "phase", "2026-09-01 foundation"),
      seed0("project", "phase", "2025-11-01 design"),
    ]});
    const r = await executeStrategy("temporal", t);
    expect(r.conclusions.length).toBe(2);
    expect(r.conclusions[0].statement).toContain("2025-11-01");
    expect(r.conclusions[1].statement).toContain("2026-09-01");
  });
});

describe("Constraint strategy", () => {
  it("checks numeric facts against parsed bounds", async () => {
    const t = await task("is the budget between 100 and 500?", { subject: "budget", seed: [
      seed0("budget", "total", "420 naira"),
      seed0("budget", "overrun", "640 naira"),
    ]});
    const r = await executeStrategy("constraint", t);
    const violations = r.conclusions.filter((c) => c.statement.includes("VIOLATES"));
    expect(violations.length).toBe(1);
    expect(violations[0].statement).toContain("640");
  });

  it("honestly reports when no bound is parseable", async () => {
    const t = await task("is it enough?", { subject: "budget" });
    const r = await executeStrategy("constraint", t);
    expect(r.summary).toMatch(/No numeric constraint/);
  });
});

describe("Comparative strategy", () => {
  it("compares two subjects on a shared predicate", async () => {
    const t = await task("compare beam A vs beam B", { subject: "beam-a", subject2: "beam-b", seed: [
      seed0("beam-a", "load-capacity", "300 kN"),
      seed0("beam-b", "load-capacity", "500 kN"),
    ]});
    const r = await executeStrategy("comparative", t);
    expect(r.conclusions[0].statement).toContain("beam-b has higher load-capacity");
  });
});

describe("Abductive & hypothesis strategies", () => {
  it("proposes causal explanations ranked by support", async () => {
    const t = await task("why is the wall damp?", { subject: "damp-wall", seed: [
      seed0("plumbing-leak", "causes", "damp-wall"),
      seed0("plumbing-leak", "detected", "yes", 0.4),
    ]});
    const r = await executeStrategy("abductive", t);
    expect(r.conclusions.length).toBeGreaterThan(0);
    expect(r.conclusions[0].status).toBe("candidate");
  });

  it("presents hypotheses with status 'hypothesis' — never fact", async () => {
    const t = await task("maybe the damp wall has a theory?", { subject: "damp-wall", seed: [
      seed0("plumbing-leak", "causes", "damp-wall"),
    ]});
    const r = await executeStrategy("hypothesis", t);
    expect(r.conclusions.every((c) => c.status === "hypothesis")).toBe(true);
    expect(r.conclusions[0].statement).not.toMatch(/^(the )?fact/i);
  });

  it("refuses to fabricate hypotheses with zero evidence", async () => {
    const t = await task("any hypothesis?", { subject: "nothing-known" });
    const r = await executeStrategy("hypothesis", t);
    expect(r.conclusions).toEqual([]);
    expect(r.explanation).toMatch(/Refusing to fabricate/);
  });
});

describe("Inductive strategy", () => {
  it("proposes generalizations from ≥3 validated subjects (never auto-asserts)", async () => {
    const t = await task("do you see a pattern?", { seed: [
      seed0("m20", "is-a", "concrete"),
      seed0("m25", "is-a", "concrete"),
      seed0("m30", "is-a", "concrete"),
    ]});
    const r = await executeStrategy("inductive", t);
    expect(r.conclusions.length).toBe(1);
    expect(r.conclusions[0].status).toBe("candidate");
    // Nothing was added to the store by induction.
    expect(t.facts.list().length).toBe(3);
  });

  it("requires three validated subjects — honest threshold", async () => {
    const t = await task("pattern?", { seed: [
      seed0("m20", "is-a", "concrete"),
      seed0("m25", "is-a", "concrete"),
    ]});
    const r = await executeStrategy("inductive", t);
    expect(r.conclusions).toEqual([]);
  });
});

describe("Counterfactual strategy", () => {
  it("identifies effects orphaned by removing a cause", async () => {
    const t = await task("what happens if we remove heavy rain?", { subject: "heavy-rain", seed: [
      seed0("heavy-rain", "causes", "runoff"),
      seed0("runoff", "causes", "erosion"),
      seed0("erosion", "causes", "foundation-risk"),
      seed0("bad-drainage", "causes", "erosion"),
    ]});
    const r = await executeStrategy("counterfactual", t);
    // erosion keeps an independent cause (bad-drainage), so only
    // runoff is truly orphaned.
    const orphaned = r.conclusions.map((c) => c.statement);
    expect(orphaned.some((s) => s.includes("runoff"))).toBe(true);
    expect(orphaned.some((s) => s.includes("erosion"))).toBe(false);
  });
});

describe("Deductive strategy", () => {
  it("runs the unified forward chain and reports derivations", async () => {
    const t = await task("therefore, what follows?", { seed: [
      seed0("my-shop", "is-a", "building"),
    ]});
    const r = await executeStrategy("logical", t);
    expect(r.kind).toBe("logical");
    const kindOf = t.facts.query({ subject: "my-shop", predicate: "kind-of" });
    expect(kindOf.length).toBe(1);
    expect(r.conclusions.some((c) => c.status === "derived")).toBe(true);
  });
});

describe("Full meta-reasoning pass", () => {
  it("selects, executes, and merges with rationale", async () => {
    const t = await task("why does the site flood? is that consistent?", { subject: "heavy-rain", seed: [
      seed0("heavy-rain", "causes", "site-flooding"),
    ]});
    const out = await reasonWithStrategies(t);
    expect(out.selected.chosen.length).toBeGreaterThan(0);
    expect(out.results.length).toBe(out.selected.chosen.length);
    for (const r of out.results) {
      expect(r.assumptions.length).toBeGreaterThan(0);
      expect(r.explanation.length).toBeGreaterThan(0);
    }
  });

  it("unimplemented kinds refuse honestly instead of faking", async () => {
    const t = await task("spatial reasoning please");
    const r = await executeStrategy("spatial", t);
    expect(r.summary).toMatch(/not yet implemented.*honest refusal/i);
    expect(r.conclusions).toEqual([]);
  });
});
