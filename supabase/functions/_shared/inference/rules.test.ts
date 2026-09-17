// =========================================================
// ARCHIE CONTEXT & INFERENCE ENGINE — INFERENCE RULE TESTS
//
// Spec §22 (inference tests): valid inference, invalid
// inference, multi-hop inference, inheritance, contradiction,
// insufficient evidence — plus hallucination tests: the
// rules must REFUSE to promote unsupported conclusions.
//
// The rule layer is PURE: tests construct edge sets directly.
// Integration with real fixture data is covered in
// engine.test.ts.
// =========================================================

import { describe, it, expect } from "vitest";
import { applyInferenceRules } from "./rules.ts";
import { detectContradictions } from "./contradiction.ts";
import type { Premise, RetrievedEdge } from "./types.ts";

let edgeSeq = 0;
function edge(overrides: Partial<RetrievedEdge> = {}): RetrievedEdge {
  const n = edgeSeq++;
  return {
    sourceKey: `s${n}`,
    sourceName: `source${n}`,
    relationType: "IS_A",
    targetKey: `t${n}`,
    targetName: `target${n}`,
    knowledgeStatus: "VERIFIED",
    provenance: "test provenance",
    version: 1,
    ...overrides,
  };
}

function factFor(e: RetrievedEdge): Premise {
  return {
    id: `fact-${e.sourceKey}|${e.relationType}|${e.targetKey}`,
    kind: "FACT",
    statement: `${e.sourceName} ${e.relationType} ${e.targetName}`,
    knowledgeStatus: e.knowledgeStatus,
    source: "SEMANTIC_GRAPH",
    conceptKey: e.sourceKey,
    provenance: e.provenance,
  };
}

function userPremise(statement: string, conceptKey?: string): Premise {
  return {
    id: `up-${statement.slice(0, 12)}`,
    kind: "ASSUMPTION",
    statement,
    knowledgeStatus: "USER_PROVIDED",
    source: "USER_PROVIDED",
    conceptKey,
  };
}

describe("inference rules — taxonomic 2-hop (spec §7, §10)", () => {
  it("derives A IS_A C from A IS_A B and B IS_A C (VALID inference)", () => {
    const e1 = edge({
      sourceKey: "A",
      sourceName: "dog",
      targetKey: "B",
      targetName: "canine",
    });
    const e2 = edge({
      sourceKey: "B",
      sourceName: "canine",
      targetKey: "C",
      targetName: "animal",
    });
    const { inferences, rejected } = applyInferenceRules([e1, e2], factFor, []);
    const inf = inferences.find(
      (i) => i.ruleId === "TAXONOMIC_TRANSITIVE_2HOP",
    );
    expect(inf).toBeDefined();
    expect(inf!.conclusion.hops).toBe(2);
    expect(inf!.confidence).toBe("SUPPORTED");
    expect(inf!.conclusion.statement).toBe("dog is a kind of animal");
    expect(inf!.conclusion.subjectKey).toBe("A");
    expect(inf!.conclusion.objectKey).toBe("C");
    expect(inf!.explanation).toContain(
      "inference rather than a directly stored fact",
    );
    expect(rejected).toHaveLength(0);
  });

  it("REFUSES the inference when a premise edge is not VERIFIED (INVALID inference)", () => {
    const e1 = edge({
      sourceKey: "A",
      targetKey: "B",
      knowledgeStatus: "UNVERIFIED",
    });
    const e2 = edge({ sourceKey: "B", targetKey: "C" });
    const { inferences, rejected } = applyInferenceRules([e1, e2], factFor, []);
    expect(inferences).toHaveLength(0);
    expect(rejected.some((r) => r.reason.includes("not all VERIFIED"))).toBe(
      true,
    );
  });

  it("DEMOTES the conclusion to fact when A IS_A C is already stored (multi-hop ≠ direct fact)", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const e2 = edge({ sourceKey: "B", targetKey: "C" });
    const e3 = edge({ sourceKey: "A", targetKey: "C" }); // already stored directly
    const { inferences, rejected } = applyInferenceRules(
      [e1, e2, e3],
      factFor,
      [],
    );
    expect(inferences).toHaveLength(0);
    expect(
      rejected.some((r) => r.reason.includes("already stored directly")),
    ).toBe(true);
  });

  it("never produces self-cyclic conclusions", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const e2 = edge({ sourceKey: "B", targetKey: "A" });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const cyclic = inferences.find(
      (i) => i.conclusion.subjectKey === i.conclusion.objectKey,
    );
    expect(cyclic).toBeUndefined();
  });
});

describe("inference rules — compositional + causal chains", () => {
  it("derives PART_OF transitivity as SUPPORTED", () => {
    const e1 = edge({
      sourceKey: "A",
      sourceName: "piston",
      relationType: "PART_OF",
      targetKey: "B",
      targetName: "engine",
    });
    const e2 = edge({
      sourceKey: "B",
      sourceName: "engine",
      relationType: "PART_OF",
      targetKey: "C",
      targetName: "vehicle",
    });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const inf = inferences.find(
      (i) => i.ruleId === "COMPOSITIONAL_TRANSITIVE_2HOP",
    );
    expect(inf).toBeDefined();
    expect(inf!.conclusion.statement).toBe("piston is part of vehicle");
    expect(inf!.confidence).toBe("SUPPORTED");
  });

  it("derives CAUSES transitivity as PLAUSIBLE and marks it indirect", () => {
    const e1 = edge({
      sourceKey: "A",
      sourceName: "smoking",
      relationType: "CAUSES",
      targetKey: "B",
      targetName: "inflammation",
    });
    const e2 = edge({
      sourceKey: "B",
      sourceName: "inflammation",
      relationType: "CAUSES",
      targetKey: "C",
      targetName: "disease",
    });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const inf = inferences.find((i) => i.ruleId === "CAUSAL_TRANSITIVE_2HOP");
    expect(inf).toBeDefined();
    expect(inf!.category).toBe("CAUSAL");
    expect(inf!.confidence).toBe("PLAUSIBLE");
    expect(inf!.conclusion.statement).toContain("indirectly causes");
  });

  it("does NOT treat correlation-shaped RELATED_TO edges as causal (spec §15)", () => {
    const e1 = edge({
      sourceKey: "A",
      relationType: "RELATED_TO",
      targetKey: "B",
    });
    const e2 = edge({
      sourceKey: "B",
      relationType: "RELATED_TO",
      targetKey: "C",
    });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const causal = inferences.filter((i) => i.category === "CAUSAL");
    expect(causal).toHaveLength(0);
  });
});

describe("inference rules — inheritance (spec §7)", () => {
  it("derives inherited requirement: A IS_A B, B REQUIRES X ⇒ A requires X", () => {
    const e1 = edge({
      sourceKey: "A",
      sourceName: "car",
      targetKey: "B",
      targetName: "vehicle",
    });
    const e2 = edge({
      sourceKey: "B",
      sourceName: "vehicle",
      relationType: "REQUIRES",
      targetKey: "X",
      targetName: "fuel",
    });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const inf = inferences.find((i) => i.ruleId === "INHERITS_REQUIREMENT");
    expect(inf).toBeDefined();
    expect(inf!.category).toBe("PROPERTY");
    expect(inf!.confidence).toBe("PLAUSIBLE");
    expect(inf!.conclusion.statement).toContain("inherited");
    expect(inf!.conclusion.dependsOnUserPremise).toBe(false);
  });

  it("REFUSES inheritance when the requirement premise is unverified", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const e2 = edge({
      sourceKey: "B",
      relationType: "REQUIRES",
      targetKey: "X",
      knowledgeStatus: "UNVERIFIED",
    });
    const { inferences, rejected } = applyInferenceRules([e1, e2], factFor, []);
    expect(inferences).toHaveLength(0);
    expect(rejected.some((r) => r.ruleId === "INHERITS_REQUIREMENT")).toBe(
      true,
    );
  });
});

describe("inference rules — user-premise functional inference (spec §7, §14)", () => {
  it("derives 'A cannot be completed using B' from A REQUIRES B + user premise about B", () => {
    const e = edge({
      sourceKey: "A",
      sourceName: "login",
      relationType: "REQUIRES",
      targetKey: "B",
      targetName: "password",
    });
    const up = userPremise('the user states that something "unavailable"', "B");
    const { inferences } = applyInferenceRules([e], factFor, [up]);
    const inf = inferences.find((i) => i.ruleId === "REQUIRES_UNAVAILABLE");
    expect(inf).toBeDefined();
    expect(inf!.conclusion.dependsOnUserPremise).toBe(true);
    expect(inf!.explanation).toContain("depends on user-provided information");
  });

  it("REFUSES the premise-based inference when the user premise is about a DIFFERENT concept", () => {
    const e = edge({
      sourceKey: "A",
      sourceName: "login",
      relationType: "REQUIRES",
      targetKey: "B",
      targetName: "password",
    });
    const up = userPremise('the user states that something "unavailable"', "Z");
    const { inferences } = applyInferenceRules([e], factFor, [up]);
    expect(
      inferences.filter((i) => i.ruleId === "REQUIRES_UNAVAILABLE"),
    ).toHaveLength(0);
  });

  it("REFUSES when there is no user premise at all (no invented premises)", () => {
    const e = edge({
      sourceKey: "A",
      relationType: "REQUIRES",
      targetKey: "B",
    });
    const { inferences } = applyInferenceRules([e], factFor, []);
    expect(
      inferences.filter((i) => i.ruleId === "REQUIRES_UNAVAILABLE"),
    ).toHaveLength(0);
  });
});

describe("contradiction detection (spec §11)", () => {
  it("flags an inference whose conclusion conflicts with a stored CONTRASTS_WITH fact", () => {
    const e1 = edge({
      sourceKey: "A",
      sourceName: "hot",
      targetKey: "B",
      targetName: "temperature",
    });
    const e2 = edge({
      sourceKey: "B",
      sourceName: "temperature",
      targetKey: "C",
      targetName: "state",
    });
    const contrast = edge({
      sourceKey: "A",
      sourceName: "hot",
      relationType: "CONTRASTS_WITH",
      targetKey: "C",
      targetName: "state",
    });
    const edges = [e1, e2, contrast];
    const { inferences } = applyInferenceRules(edges, factFor, []);
    // the transitive rule skips A→C because it's "stored"
    // directly only as CONTRASTS_WITH, not IS_A — the chain
    // still derives unless the IS_A triple exists
    const contradictions = detectContradictions(
      edges,
      edges.map(factFor),
      inferences,
      [],
    );
    const conflict = contradictions.find((c) =>
      c.statement.includes("conflicts with a stored contrasting relationship"),
    );
    if (
      inferences.some(
        (i) =>
          i.conclusion.subjectKey === "A" && i.conclusion.objectKey === "C",
      )
    ) {
      expect(conflict).toBeDefined();
      expect(conflict!.disposition).toBe("FLAGGED_NOT_RESOLVED");
    } else {
      expect(
        contradictions.some((c) => c.disposition === "FLAGGED_NOT_RESOLVED"),
      ).toBe(true);
    }
  });

  it("flags a user message carrying conflicting availability statements", () => {
    const contradictions = detectContradictions(
      [],
      [],
      [],
      [
        userPremise('the user states that something "is available"'),
        userPremise('the user states that something "unavailable"'),
      ],
    );
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].sideA.status).toBe("USER_PROVIDED");
    expect(contradictions[0].explanation).toContain("ask for clarification");
  });

  it("NEVER fabricates a conflict when none exists", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const e2 = edge({ sourceKey: "B", targetKey: "C" });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    expect(
      detectContradictions([e1, e2], [e1, e2].map(factFor), inferences, []),
    ).toHaveLength(0);
  });
});

describe("hallucination tests — unsupported conclusions are rejected (spec §15, §22)", () => {
  it("produces NO inference from an incomplete chain (INSUFFICIENT EVIDENCE)", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const { inferences } = applyInferenceRules([e1], factFor, []);
    expect(inferences).toHaveLength(0);
  });

  it("produces NO inference from mismatched relation types", () => {
    const e1 = edge({ sourceKey: "A", relationType: "IS_A", targetKey: "B" });
    const e2 = edge({
      sourceKey: "B",
      relationType: "RELATED_TO",
      targetKey: "C",
    });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    expect(inferences).toHaveLength(0);
  });

  it("never emits a conclusion whose confidence is invented beyond the state set (spec §9)", () => {
    const e1 = edge({ sourceKey: "A", targetKey: "B" });
    const e2 = edge({ sourceKey: "B", targetKey: "C" });
    const { inferences } = applyInferenceRules([e1, e2], factFor, []);
    const allowed = ["SUPPORTED", "PLAUSIBLE", "UNCERTAIN"];
    for (const inf of inferences) {
      expect(allowed).toContain(inf.confidence);
      expect(inf.conclusion.hops).toBeGreaterThanOrEqual(2);
    }
  });
});
