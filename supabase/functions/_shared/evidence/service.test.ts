// =========================================================
// EVIDENCE ENGINE — SERVICE INTEGRATION TESTS
//
// Spec §29 tests 2, 3, 9, 12, 13, 14 through the REAL
// service against the in-memory supabase mock (harness):
//   Test 9  — FRELUX calculator output retains provenance
//   Test 12 — nonexistent source refused (no fake evidence)
//   Test 13 — unsupported claim CANNOT become VERIFIED
//   Test 3  — premises → INFERRED (via recordInference)
//   Test 14 — provenance traceable after transformations
// plus: dedup on re-record, conflict flow, audit, health,
// USER_PROVIDED never silently verified.
// =========================================================
import { describe, it, expect, beforeEach } from "vitest";
import { makeMockClient, givenRows, givenRpc } from "../testing/harness.ts";
import { createEvidenceTruthService } from "./service.ts";

const NOW = "2026-09-20T10:00:00.000Z";

let svc: ReturnType<typeof createService>;

function createService() {
  return createEvidenceTruthService(makeMockClient(), {
    now: () => NOW,
  });
}

beforeEach(() => {
  givenRows("archie_claims", []);
  givenRows("archie_evidence_records", []);
  givenRows("archie_claim_evidence", []);
  givenRows("archie_claim_relations", []);
  givenRows("archie_evidence_conflicts", []);
  svc = createService();
});

const BASE_CLAIM = {
  subject: "cement",
  predicate: "HAS_COMPRESSIVE_STRENGTH",
  objectValue: "42.5 MPa",
  claimType: "QUANTITY" as const,
  statement: "Portland cement has a compressive strength of 42.5 MPa",
  domain: "construction",
};

const GRAPH_EVIDENCE = {
  evidenceType: "GRAPH_RELATIONSHIP" as const,
  sourceType: "SEMANTIC_GRAPH" as const,
  sourceIdentity: "semantic_graph_edges",
  originSubsystem: "ARCHIE Context & Inference Engine",
  observedBySystem: true,
  contentLabel: "sourced graph relationship",
  retrievedAt: NOW,
  domain: "construction",
};

// ---------------------------------------------------------
// Claims + deduplication (spec §22)
// ---------------------------------------------------------
describe("recordClaim", () => {
  it("records a claim and deduplicates identical re-records", async () => {
    const a = await svc.recordClaim(BASE_CLAIM);
    const b = await svc.recordClaim(BASE_CLAIM);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    // same deterministic claim key — the second record deduped
    expect(a.data!.claim_key).toBe(b.data!.claim_key);
    expect(a.data!.id).toBe(b.data!.id);
  });

  it("versions a claim when content changes — history is never overwritten (spec §23)", async () => {
    const first = await svc.recordClaim(BASE_CLAIM);
    const second = await svc.recordClaim({
      ...BASE_CLAIM,
      statement:
        "Portland cement has a compressive strength of 42.5 MPa (per current spec sheets)",
    });
    expect(second.ok).toBe(true);
    // same claim identity (subject+predicate+object+domain), new version
    expect(second.data!.claim_key).toBe(first.data!.claim_key);
    expect(second.data!.version).toBe(2);
    expect(second.data!.history.length).toBe(1);
    expect(second.data!.history[0]).toMatchObject({
      statement: "Portland cement has a compressive strength of 42.5 MPa",
    });
  });
});

// ---------------------------------------------------------
// Evidence attachment + hallucinated-source protection
// ---------------------------------------------------------
describe("attachEvidence", () => {
  it("Test 12: REFUSES evidence that references a nonexistent source row", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    // source_ref points at a graph row that does not exist
    givenRows("semantic_graph_edges", [] as any[]);
    const res = await svc.attachEvidence(claim.data!.claim_key, {
      ...GRAPH_EVIDENCE,
      sourceType: "SEMANTIC_GRAPH",
      sourceRef: { table: "semantic_graph_edges", row_id: "does-not-exist" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("refused");
    expect(res.error).toContain("does not exist");
    // nothing was recorded — the system did not fabricate evidence
    const ev = await svc.getEvidence(claim.data!.claim_key);
    expect(ev.data!.length).toBe(0);
  });

  it("accepts evidence whose referenced source row EXISTS", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    givenRows("semantic_graph_edges", [
      { id: "edge-1", relation_type: "USED_IN_DOMAIN" },
    ]);
    const res = await svc.attachEvidence(claim.data!.claim_key, {
      ...GRAPH_EVIDENCE,
      sourceRef: { table: "semantic_graph_edges", row_id: "edge-1" },
    });
    expect(res.ok).toBe(true);
    expect(res.data!.reliability).toMatchObject({
      tier: "STRUCTURED_VERIFIED",
    });
  });

  it("deduplicates identical evidence on re-attach (spec §22)", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    givenRows("semantic_graph_edges", [
      { id: "edge-1", relation_type: "USED_IN_DOMAIN" },
    ]);
    const draft = {
      ...GRAPH_EVIDENCE,
      sourceRef: { table: "semantic_graph_edges", row_id: "edge-1" },
      contentDigest: "same",
    };
    const first = await svc.attachEvidence(claim.data!.claim_key, draft);
    const second = await svc.attachEvidence(claim.data!.claim_key, draft);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.data!.evidence_key).toBe(second.data!.evidence_key);
    const all = await svc.getEvidence(claim.data!.claim_key);
    expect(all.data!.length).toBe(1);
  });
});

// ---------------------------------------------------------
// Classification + verification protections
// ---------------------------------------------------------
describe("classifyClaim + verifyClaim", () => {
  it("Test 13: an unsupported claim CANNOT become VERIFIED", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    const verdict = await svc.verifyClaim(claim.data!.claim_key);
    expect(verdict.ok).toBe(false);
    expect(verdict.error).toContain("verification refused");
    expect(verdict.data!.state).toBe("UNVERIFIED");
    // stored state stays honest
    const stored = await svc.getClaim(claim.data!.claim_key);
    expect(stored!.verification_state).toBe("UNVERIFIED");
  });

  it("Test 1: strong evidence → VERIFIED via the strict verifier", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    givenRows("semantic_graph_edges", [{ id: "edge-1" }]);
    await svc.attachEvidence(claim.data!.claim_key, {
      ...GRAPH_EVIDENCE,
      sourceRef: { table: "semantic_graph_edges", row_id: "edge-1" },
    });
    const verdict = await svc.verifyClaim(claim.data!.claim_key);
    expect(verdict.ok).toBe(true);
    const stored = await svc.getClaim(claim.data!.claim_key);
    expect(stored!.verification_state).toBe("VERIFIED");
  });

  it("Test 2: user-provided stays USER_PROVIDED — never silently verified", async () => {
    const claim = await svc.recordClaim({
      ...BASE_CLAIM,
      userProvided: true,
      statement: "The project is located in Owerri (user said so)",
    });
    await svc.attachEvidence(claim.data!.claim_key, {
      evidenceType: "USER_PROVIDED_EVIDENCE",
      sourceType: "USER_STATEMENT",
      sourceIdentity: "owner-conversation",
      originSubsystem: "chat",
      contentLabel: "user statement",
      retrievedAt: NOW,
    });
    await svc.classifyClaim(claim.data!.claim_key);
    const stored = await svc.getClaim(claim.data!.claim_key);
    expect(stored!.verification_state).toBe("USER_PROVIDED");
    expect(stored!.user_provided).toBe(true);
  });
});

// ---------------------------------------------------------
// Inference recording (Test 3 + provenance preservation §8)
// ---------------------------------------------------------
describe("recordInference", () => {
  it("Test 3: premises → INFERRED, never VERIFIED without independent evidence", async () => {
    const p1 = await svc.recordClaim({
      subject: "screed",
      predicate: "IS_A",
      objectValue: "floor finishing material",
      statement: "screed IS_A floor finishing material",
      domain: "construction",
    });
    const p2 = await svc.recordClaim({
      subject: "floor finishing material",
      predicate: "REQUIRES",
      objectValue: "leveling",
      statement: "floor finishing material REQUIRES leveling",
      domain: "construction",
    });
    const inf = await svc.recordInference({
      conclusion: {
        subject: "screed",
        predicate: "REQUIRES",
        objectValue: "leveling",
        statement: "screed requires leveling",
        domain: "construction",
      },
      premiseClaimKeys: [p1.data!.claim_key, p2.data!.claim_key],
      ruleId: "INHERITS_REQUIREMENT",
      explanation: "A IS_A B ∧ B REQUIRES X ⇒ A requires X",
    });
    expect(inf.ok).toBe(true);
    expect(inf.data!.inferred).toBe(true);
    expect(inf.data!.verification_state).toBe("INFERRED");

    // premises are linked (PREMISE_OF) and traceable
    const prov = await svc.getProvenance(inf.data!.claim_key);
    expect(prov.ok).toBe(true);
    expect(prov.data!.premises.length).toBe(2);
  });

  it("Test 14: provenance remains traceable from conclusion to sources", async () => {
    const p1 = await svc.recordClaim({
      subject: "a",
      predicate: "IS_A",
      objectValue: "b",
      statement: "a IS_A b",
      domain: "construction",
    });
    const inf = await svc.recordInference({
      conclusion: {
        subject: "a",
        predicate: "DERIVED",
        statement: "a is a kind of c",
        domain: "construction",
      },
      premiseClaimKeys: [p1.data!.claim_key],
      ruleId: "TAXONOMIC_TRANSITIVE_2HOP",
      explanation: "chain",
    });
    const prov = await svc.getProvenance(inf.data!.claim_key);
    const chains = prov.data!.evidence.map((e) => e.chain);
    // the inference evidence carries a chain ending in INFERENCE
    const infChain = chains.find((c) => c.some((s) => s.stage === "INFERENCE"));
    expect(infChain).toBeDefined();
  });
});

// ---------------------------------------------------------
// Conflicts (spec §11)
// ---------------------------------------------------------
describe("detectConflict", () => {
  it("records conflicts and marks both claims CONFLICTED without resolving", async () => {
    const a = await svc.recordClaim({
      ...BASE_CLAIM,
      objectValue: "10",
      statement: "X = 10",
    });
    const b = await svc.recordClaim({
      ...BASE_CLAIM,
      objectValue: "15",
      statement: "X = 15",
    });
    const res = await svc.detectConflict({
      claimAKey: a.data!.claim_key,
      claimBKey: b.data!.claim_key,
      kind: "VALUE_CONFLICT",
    });
    expect(res.ok).toBe(true);
    expect(res.data!.explanation_status).toBe("UNEXPLAINED");
    expect(res.data!.resolved_at).toBeNull();
    const storedA = await svc.getClaim(a.data!.claim_key);
    const storedB = await svc.getClaim(b.data!.claim_key);
    expect(storedA!.verification_state).toBe("CONFLICTED");
    expect(storedB!.conflict_state).toBe("CONFLICTED");
  });

  it("is idempotent — re-detection does not duplicate the conflict", async () => {
    const a = await svc.recordClaim({ ...BASE_CLAIM, objectValue: "10" });
    const b = await svc.recordClaim({ ...BASE_CLAIM, objectValue: "15" });
    await svc.detectConflict({
      claimAKey: a.data!.claim_key,
      claimBKey: b.data!.claim_key,
      kind: "VALUE_CONFLICT",
    });
    const second = await svc.detectConflict({
      claimAKey: a.data!.claim_key,
      claimBKey: b.data!.claim_key,
      kind: "VALUE_CONFLICT",
    });
    expect(second.ok).toBe(true);
    expect(second.data!.id).toBeDefined();
  });
});

// ---------------------------------------------------------
// FRELUX deterministic calculator (spec §14, Test 9)
// ---------------------------------------------------------
describe("recordCalculatorClaim", () => {
  it("Test 9: deterministic calculator result retains calculation provenance", async () => {
    const res = await svc.recordCalculatorClaim({
      claim: {
        subject: "living-room paint",
        predicate: "REQUIRES",
        objectValue: "3.5 litres",
        claimType: "QUANTITY",
        statement: "The living room requires 3.5 litres of paint for 2 coats",
        domain: "construction",
      },
      calculator: "frelux-paint-v3",
      calculatorVersion: "3.2.1",
      parameters: { area_m2: 28, coats: 2, spread_rate: 16 },
      result: "3.5 litres",
    });
    expect(res.ok).toBe(true);
    expect(res.data!.verification_state).toBe("VERIFIED");
    // the evidence retains the calculation provenance
    const ev = await svc.getEvidence(res.data!.claim_key);
    const calc = ev.data!.find(
      (e) => e.evidence_type === "DETERMINISTIC_CALCULATOR",
    );
    expect(calc).toBeDefined();
    expect(calc!.source_type).toBe("FRELUX_CALCULATOR");
    expect(calc!.source_ref).toMatchObject({
      function: "frelux-paint-v3",
    });
    expect(calc!.reliability).toMatchObject({ tier: "DETERMINISTIC" });
  });
});

// ---------------------------------------------------------
// Self-audit (spec §24)
// ---------------------------------------------------------
describe("auditClaim", () => {
  it("answers the audit checklist from real state", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    const audit = await svc.auditClaim(claim.data!.claim_key);
    expect(audit.ok).toBe(true);
    expect(audit.data!.state).toBe("UNVERIFIED");
    expect(audit.data!.flags.evidenceMissing).toBe(true);
    expect(audit.data!.flags.inferencePresentedAsFact).toBe(false);
  });

  it("flags an inference presented as fact (health check basis)", async () => {
    const p1 = await svc.recordClaim({
      subject: "a",
      predicate: "IS_A",
      objectValue: "b",
      statement: "a IS_A b",
    });
    const inf = await svc.recordInference({
      conclusion: {
        subject: "a",
        predicate: "DERIVED",
        statement: "derived",
      },
      premiseClaimKeys: [p1.data!.claim_key],
      ruleId: "TAXONOMIC_TRANSITIVE_2HOP",
      explanation: "chain",
    });
    const audit = await svc.auditClaim(inf.data!.claim_key);
    expect(audit.data!.flags.isInferred).toBe(true);
    // honest: the engine has NOT marked it a fact
    expect(audit.data!.flags.inferencePresentedAsFact).toBe(false);
  });
});

// ---------------------------------------------------------
// Health (spec §28) — real numbers through the RPC
// ---------------------------------------------------------
describe("health", () => {
  it("returns the measured dashboard state from the RPC", async () => {
    givenRpc("archie_evidence_health", () => ({
      data: {
        total_claims: 7,
        verified_claims: 2,
        claims_without_evidence: 1,
      },
      error: null,
    }));
    const health = await svc.health();
    expect(health).toMatchObject({
      total_claims: 7,
      verified_claims: 2,
    });
  });

  it("degrades honestly (null) when the RPC is unavailable (spec §39)", async () => {
    givenRpc("archie_evidence_health", () => ({
      data: null,
      error: { message: "boom" },
    }));
    const health = await svc.health();
    expect(health).toBeNull();
  });
});

// ---------------------------------------------------------
// Search (spec §21)
// ---------------------------------------------------------
describe("searchEvidence", () => {
  it("searches by content label (bounded)", async () => {
    const claim = await svc.recordClaim(BASE_CLAIM);
    givenRows("semantic_graph_edges", [{ id: "edge-1" }]);
    await svc.attachEvidence(claim.data!.claim_key, {
      ...GRAPH_EVIDENCE,
      sourceRef: { table: "semantic_graph_edges", row_id: "edge-1" },
      contentLabel: "paint coverage standard 16 m2/litre",
    });
    const hits = await svc.searchEvidence("coverage");
    expect(hits.length).toBe(1);
    expect(hits[0].content_label).toContain("coverage");
  });
});
