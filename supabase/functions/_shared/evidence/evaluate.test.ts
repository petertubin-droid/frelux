// =========================================================
// EVIDENCE ENGINE — PURE-LAYER TESTS
//
// Spec §29 tests 1, 2, 4, 5, 6, 10 (pure classification),
// plus the dedup-key and provenance contracts (§22, §7).
// =========================================================
import { describe, it, expect } from "vitest";
import { claimKey, evidenceKey } from "./keys.ts";
import {
  appendTransformation,
  chainForInference,
  chainFromSource,
  rootSourceOf,
} from "./provenance.ts";
import { reliabilityOf, strongerTierNotes } from "./sources.ts";
import { evaluateTemporalValidity } from "./temporal.ts";
import { corroboration } from "./corroborate.ts";
import { classifyEvidence, isValueConflict } from "./evaluate.ts";
import type { ClaimRecord, EvidenceRecord, ProvenanceStep } from "./types.ts";

const NOW = "2026-09-20T10:00:00.000Z";

function claim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    id: "c1",
    claim_key: "claim:test",
    subject: "cement",
    predicate: "HAS_COMPRESSIVE_STRENGTH",
    object_value: "42.5 MPa",
    claim_type: "QUANTITY",
    statement: "Portland cement has a compressive strength of 42.5 MPa",
    domain: "construction",
    geo_scope: null,
    subject_concept_key: "14828345-n",
    object_concept_key: null,
    user_provided: false,
    inferred: false,
    directly_observed: false,
    question: false,
    verification_state: "UNVERIFIED",
    conflict_state: "NONE",
    source_availability: "SOURCE_UNAVAILABLE",
    applicable_from: null,
    applicable_until: null,
    published_at: null,
    retrieved_at: NOW,
    version: 1,
    history: [],
    supersedes_claim_id: null,
    created_by: null,
    created_date: NOW,
    updated_date: NOW,
    ...overrides,
  };
}

function evidence(
  id: string,
  overrides: Partial<EvidenceRecord> = {},
): EvidenceRecord {
  return {
    id,
    evidence_key: `evidence:${id}`,
    evidence_type: "GRAPH_RELATIONSHIP",
    source_type: "SEMANTIC_GRAPH",
    source_identity: "semantic_graph_edges",
    source_ref: { concept_key: "14828345-n" },
    origin_subsystem: "ARCHIE Context & Inference Engine",
    observed_by_system: true,
    content_label: "graph relationship",
    content_digest: null,
    transformation: null,
    provenance_chain: [
      {
        stage: "SOURCE",
        detail: "semantic graph row",
        subsystem: "SEMANTIC_GRAPH",
        at: NOW,
      },
    ],
    reliability: {
      tier: "STRUCTURED_VERIFIED",
      basis: "sourced graph row",
    },
    domain: "construction",
    version: null,
    retrieved_at: NOW,
    published_at: null,
    created_date: NOW,
    updated_date: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------
// Deterministic keys (spec §22)
// ---------------------------------------------------------
describe("keys", () => {
  const draft = {
    subject: "Cement",
    predicate: "has_strength",
    objectValue: "42.5",
    statement: "cement strength",
    domain: "Construction",
  };

  it("is deterministic and case/whitespace-insensitive", () => {
    const a = claimKey(draft);
    const b = claimKey({
      ...draft,
      subject: "  cement ",
      domain: "construction",
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^claim:[0-9a-f]{64}$/);
  });

  it("separates claims that differ in content", () => {
    expect(claimKey(draft)).not.toBe(
      claimKey({ ...draft, objectValue: "52.5" }),
    );
  });

  it("separates evidence by source identity and content", () => {
    const base = {
      evidenceType: "DIRECT_SOURCE" as const,
      sourceType: "EXTERNAL_DOCUMENT" as const,
      sourceIdentity: "doc-a",
      originSubsystem: "test",
      contentLabel: "x",
      contentDigest: "d1",
    };
    const same = evidenceKey(base);
    expect(evidenceKey({ ...base, contentDigest: "d1" })).toBe(same);
    expect(evidenceKey({ ...base, contentDigest: "d2" })).not.toBe(same);
    expect(evidenceKey({ ...base, sourceIdentity: "doc-b" })).not.toBe(same);
  });
});

// ---------------------------------------------------------
// Provenance (spec §7, §8)
// ---------------------------------------------------------
describe("provenance", () => {
  const t = "2026-09-20T10:00:00.000Z";

  it("starts at SOURCE and never loses it through transformations", () => {
    let chain = chainFromSource({
      detail: "OEWN lexicon row 14828345-n",
      subsystem: "LEXICON",
      now: t,
    });
    chain = appendTransformation(chain, {
      stage: "EXTRACTED_FACT",
      detail: "cement is a building material",
      subsystem: "Context & Inference Engine",
      transformation: "sense normalization",
      now: t,
    });
    chain = appendTransformation(chain, {
      stage: "GRAPH_RELATIONSHIP",
      detail: "cement USED_IN_DOMAIN construction",
      subsystem: "Semantic Graph",
      transformation: "relation mapping",
      now: t,
    });
    const root = rootSourceOf(chain);
    expect(root?.stage).toBe("SOURCE");
    expect(root?.detail).toContain("14828345-n");
    expect(chain.map((s) => s.stage)).toEqual([
      "SOURCE",
      "EXTRACTED_FACT",
      "GRAPH_RELATIONSHIP",
    ]);
    // the original chain is not mutated
    expect(chain[0].transformation).toBeUndefined();
  });

  it("embeds premise chains into inference chains (Test 14)", () => {
    const premiseA = chainFromSource({
      detail: "graph row A",
      subsystem: "SEMANTIC_GRAPH",
      now: t,
    });
    const premiseB = chainFromSource({
      detail: "graph row B",
      subsystem: "SEMANTIC_GRAPH",
      now: t,
    });
    const merged = chainForInference([premiseA, premiseB], {
      ruleId: "TAXONOMIC_TRANSITIVE_2HOP",
      explanation: "A IS_A B and B IS_A C",
      subsystem: "Context & Inference Engine",
      now: t,
    });
    expect(merged.some((s) => s.detail === "graph row A")).toBe(true);
    expect(merged.some((s) => s.detail === "graph row B")).toBe(true);
    const inf = merged[merged.length - 1];
    expect(inf.stage).toBe("INFERENCE");
    expect(inf.transformation).toBe("inference:TAXONOMIC_TRANSITIVE_2HOP");
  });
});

// ---------------------------------------------------------
// Source reliability (spec §9, §17)
// ---------------------------------------------------------
describe("source reliability", () => {
  const base = {
    originSubsystem: "test",
    contentLabel: "x",
  };

  it("tiers a deterministic calculator above everything", () => {
    const r = reliabilityOf({
      ...base,
      evidenceType: "DETERMINISTIC_CALCULATOR",
      sourceType: "FRELUX_CALCULATOR",
      sourceIdentity: "frelux-calculator:paint",
    });
    expect(r.tier).toBe("DETERMINISTIC");
    expect(r.basis).toContain("deterministic");
  });

  it("tiers user statements as context, not verification", () => {
    const r = reliabilityOf({
      ...base,
      evidenceType: "USER_PROVIDED_EVIDENCE",
      sourceType: "USER_STATEMENT",
      sourceIdentity: "owner-conversation",
    });
    expect(r.tier).toBe("USER_STATEMENT");
  });

  it("tiers ARCHIE inferences as derived (never fact-equal)", () => {
    const r = reliabilityOf({
      ...base,
      evidenceType: "INFERENCE",
      sourceType: "ARCHIE_INFERENCE",
      sourceIdentity: "archie-inference:R",
    });
    expect(r.tier).toBe("DERIVED");
  });

  it("returns UNRATED with an honest basis when there is no documented ground", () => {
    const r = reliabilityOf({
      ...base,
      evidenceType: "DOMAIN_SPECIFIC",
      sourceType: "EXTERNAL_DOCUMENT",
      sourceIdentity: "unknown-thing",
    });
    expect(r.tier).toBe("DOCUMENTED");
  });

  it("asymmetry notes never auto-resolve a conflict", () => {
    const note = strongerTierNotes(
      { tier: "DETERMINISTIC", basis: "b" },
      { tier: "USER_STATEMENT", basis: "b" },
    );
    expect(note).toContain("never auto-resolved");
  });
});

// ---------------------------------------------------------
// Temporal truth (spec §12)
// ---------------------------------------------------------
describe("temporal validity", () => {
  it("marks expired windows EXPIRED", () => {
    const state = evaluateTemporalValidity(
      claim({ applicable_until: "2026-01-01T00:00:00.000Z" }),
      NOW,
    );
    expect(state).toBe("EXPIRED");
  });

  it("marks future applicability FUTURE_DATED", () => {
    expect(
      evaluateTemporalValidity(
        claim({ applicable_from: "2027-01-01T00:00:00.000Z" }),
        NOW,
      ),
    ).toBe("FUTURE_DATED");
  });

  it("marks superseded claims SUPERSEDED", () => {
    expect(
      evaluateTemporalValidity(
        claim({ supersedes_claim_id: "older" } as Partial<ClaimRecord>),
        NOW,
      ),
    ).toBe("SUPERSEDED");
  });

  it("admits UNDETERMINED when no temporal metadata exists", () => {
    expect(evaluateTemporalValidity(claim(), NOW)).toBe("UNDETERMINED");
  });

  it("marks past-start, unexpired windows HISTORICAL", () => {
    expect(
      evaluateTemporalValidity(
        claim({ applicable_from: "2020-01-01T00:00:00.000Z" }),
        NOW,
      ),
    ).toBe("HISTORICAL");
  });
});

// ---------------------------------------------------------
// Corroboration (spec §10) — Tests 7 & 8
// ---------------------------------------------------------
describe("corroboration", () => {
  it("counts independent sources as corroboration (Test 7)", () => {
    const a = evidence("a", { source_identity: "graph-edges" });
    const b = evidence("b", {
      source_identity: "standards-doc",
      source_type: "EXTERNAL_DOCUMENT",
      evidence_type: "OFFICIAL_DOCUMENTATION",
      provenance_chain: [
        {
          stage: "SOURCE",
          detail: "standards-doc",
          subsystem: "EXTERNAL_DOCUMENT",
          at: NOW,
        },
      ],
    });
    const result = corroboration([a, b]);
    expect(result.independentCount).toBe(2);
    expect(result.duplicateCopies).toBe(0);
  });

  it("does NOT count copies of the same source as independent (Test 8)", () => {
    const a = evidence("a", { source_identity: "graph-edges" });
    const b = evidence("b", { source_identity: "graph-edges-copy" });
    // same provenance root → same underlying source
    b.provenance_chain = a.provenance_chain;
    const result = corroboration([a, b]);
    expect(result.independentCount).toBe(1);
    expect(result.duplicateCopies).toBe(1);
  });

  it("treats identical source identities as the same source", () => {
    const a = evidence("a");
    const b = evidence("b"); // same source_identity "semantic_graph_edges"
    const result = corroboration([a, b]);
    expect(result.independentCount).toBe(1);
    expect(result.duplicateCopies).toBe(1);
  });
});

// ---------------------------------------------------------
// Classification (spec §§5, 15, 16) — Tests 1, 2, 4, 5, 6, 10
// ---------------------------------------------------------
describe("classifyEvidence", () => {
  it("Test 1: known strong evidence → VERIFIED", () => {
    const result = classifyEvidence(claim(), [evidence("e1")], [], NOW);
    expect(result.state).toBe("VERIFIED");
    expect(result.independentCorroboration).toBe(1);
  });

  it("Test 2: user-provided with no independent evidence → USER_PROVIDED", () => {
    const c = claim({
      user_provided: true,
      verification_state: "USER_PROVIDED",
    });
    const userEv = evidence("u1", {
      evidence_type: "USER_PROVIDED_EVIDENCE",
      source_type: "USER_STATEMENT",
      source_identity: "owner-conversation",
      reliability: {
        tier: "USER_STATEMENT",
        basis: "user statement",
      },
    });
    const result = classifyEvidence(c, [userEv], [], NOW);
    expect(result.state).toBe("USER_PROVIDED");
  });

  it("Test 4a: no evidence, assertion → UNVERIFIED", () => {
    expect(classifyEvidence(claim(), [], [], NOW).state).toBe("UNVERIFIED");
  });

  it("Test 4b: no evidence, open question → UNKNOWN", () => {
    const result = classifyEvidence(
      claim({ question: true, verification_state: "UNKNOWN" }),
      [],
      [],
      NOW,
    );
    expect(result.state).toBe("UNKNOWN");
  });

  it("Test 5: contradictory evidence → CONFLICTED, never silently resolved", () => {
    const contra = evidence("x1", {
      reliability: {
        tier: "STRUCTURED_VERIFIED",
        basis: "sourced graph row",
      },
      provenance_chain: [
        {
          stage: "SOURCE",
          detail: "contradicting graph row",
          subsystem: "SEMANTIC_GRAPH",
          at: NOW,
        },
      ],
    });
    const result = classifyEvidence(claim(), [evidence("e1")], [contra], NOW);
    expect(result.state).toBe("CONFLICTED");
    expect(result.conflictState).toBe("CONFLICTED");
    expect(result.notes).toContain("not resolved");
  });

  it("Test 6: expired-but-supported evidence → OUTDATED", () => {
    const c = claim({
      applicable_until: "2026-01-01T00:00:00.000Z",
    });
    const result = classifyEvidence(c, [evidence("e1")], [], NOW);
    expect(result.state).toBe("OUTDATED");
    expect(result.temporalState).toBe("EXPIRED");
  });

  it("Test 10: graph relationship evidence keeps its verification state", () => {
    const result = classifyEvidence(
      claim(),
      [evidence("g1", { evidence_type: "GRAPH_RELATIONSHIP" })],
      [],
      NOW,
    );
    expect(result.state).toBe("VERIFIED"); // STRUCTURED_VERIFIED tier
  });

  it("inferred claims stay INFERRED without independent evidence (Test 3 base)", () => {
    const infEv = evidence("i1", {
      evidence_type: "INFERENCE",
      source_type: "ARCHIE_INFERENCE",
      source_identity: "archie-inference:R1",
      reliability: { tier: "DERIVED", basis: "derived" },
      provenance_chain: [
        {
          stage: "SOURCE",
          detail: "archie-inference:R1",
          subsystem: "ARCHIE_INFERENCE",
          at: NOW,
        },
      ],
    });
    const c = claim({
      inferred: true,
      verification_state: "INFERRED",
    });
    const result = classifyEvidence(c, [infEv], [], NOW);
    expect(result.state).toBe("INFERRED");
  });

  it("user-provided claims with independent evidence lift only to SUPPORTED", () => {
    const c = claim({
      user_provided: true,
      verification_state: "USER_PROVIDED",
    });
    // independent structured (non-user) evidence:
    const result = classifyEvidence(c, [evidence("e1")], [], NOW);
    expect(result.state).toBe("SUPPORTED");
  });

  it("mixed weaker evidence → SUPPORTED, not VERIFIED", () => {
    const doc = evidence("d1", {
      evidence_type: "OFFICIAL_DOCUMENTATION",
      source_type: "EXTERNAL_DOCUMENT",
      source_identity: "standards-doc",
      reliability: {
        tier: "DOCUMENTED",
        basis: "referenced document",
      },
      provenance_chain: [
        {
          stage: "SOURCE",
          detail: "standards-doc",
          subsystem: "EXTERNAL_DOCUMENT",
          at: NOW,
        },
      ],
    });
    const result = classifyEvidence(claim(), [doc], [], NOW);
    expect(result.state).toBe("SUPPORTED");
  });
});

// ---------------------------------------------------------
// Value-conflict detection (spec §11)
// ---------------------------------------------------------
describe("isValueConflict", () => {
  it("flags same subject+predicate with different values", () => {
    const a = claim({ object_value: "10" });
    const b = claim({ object_value: "15", id: "c2" });
    expect(isValueConflict(a, b)).toBe(true);
  });

  it("ignores same-value claims (dedup handles those)", () => {
    const a = claim();
    const b = claim({ id: "c2" });
    expect(isValueConflict(a, b)).toBe(false);
  });

  it("ignores different domains/regions (different assertions)", () => {
    const a = claim({ object_value: "10" });
    const b = claim({
      id: "c2",
      object_value: "15",
      domain: "finance",
    });
    expect(isValueConflict(a, b)).toBe(false);
  });
});
