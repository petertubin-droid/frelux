// =========================================================
// EVIDENCE ENGINE — LIVE-TURN PIPELINE TESTS
//
// Spec §29 tests 10 & 11 through the full live pipeline
// (engine.ts → service → repository against the harness
// mock), plus the chat-path contracts:
//   * block labels (FACT/INFERENCE/USER-PROVIDED/CONFLICTED/
//     UNKNOWN) with anti-hallucination directives
//   * repeated turns deduplicate (deterministic keys)
//   * ambiguous premises never become verified facts
//   * degradation never blocks the chat path
//   * empty turns stay empty (zero recorded claims —
//     greetings do not touch the evidence tables)
// =========================================================
import { describe, it, expect, beforeEach } from "vitest";
import { makeMockClient, givenRows } from "../testing/harness.ts";
import { createEvidenceTruthService } from "./service.ts";
import { evidenceGroundTruth } from "./engine.ts";

const NOW = "2026-09-20T10:00:00.000Z";

function freshService() {
  return createEvidenceTruthService(makeMockClient(), { now: () => NOW });
}

beforeEach(() => {
  givenRows("archie_claims", []);
  givenRows("archie_evidence_records", []);
  givenRows("archie_claim_evidence", []);
  givenRows("archie_claim_relations", []);
  givenRows("archie_evidence_conflicts", []);
});

const FACT_PREMISE = {
  id: "p1",
  kind: "FACT",
  statement: "cement is used in construction",
  source: "SEMANTIC_GRAPH",
  conceptKey: "14828345-n",
  provenance: "sourced OEWN relationship",
};

const USER_PREMISE = {
  id: "u1",
  kind: "FACT",
  statement: "my site is in Owerri",
  source: "USER_PROVIDED",
};

describe("evidenceGroundTruth — live pipeline", () => {
  it("Test 10: a graph-sourced premise becomes a VERIFIED fact claim", async () => {
    givenRows("semantic_graph_edges", [{ id: "edge-1" }]);
    const svc = freshService();
    const gt = await evidenceGroundTruth(svc, {
      message: "tell me about cement",
      premises: [FACT_PREMISE],
      userPremises: [],
      inferences: [],
      toolResults: [],
      domain: "construction",
    });
    expect(gt.claimsRecorded).toBe(1);
    expect(gt.states[0].state).toBe("VERIFIED");
    expect(gt.block).toContain("FACT (verified)");
    expect(gt.block).toContain("Preserve these evidence labels");
  });

  it("Test 11: an AMBIGUOUS premise (no resolved concept) is not presented as verified fact", async () => {
    const svc = freshService();
    const gt = await evidenceGroundTruth(svc, {
      message: "is the bank open",
      premises: [
        {
          id: "p1",
          kind: "UNCERTAINTY",
          statement: "bank (ambiguous: financial institution / river bank)",
          source: "SEMANTIC_GRAPH",
          // NO conceptKey — sense not resolved
        },
      ],
      userPremises: [],
      inferences: [],
      toolResults: [],
    });
    // the claim is recorded honestly but never marked verified
    expect(gt.claimsRecorded).toBe(1);
    expect(gt.states[0].state).not.toBe("VERIFIED");
    expect(gt.block).not.toContain("FACT (verified)");
  });

  it("records user premises as USER-PROVIDED, never verified", async () => {
    const svc = freshService();
    const gt = await evidenceGroundTruth(svc, {
      message: "my site is in Owerri, plan the pour",
      premises: [],
      userPremises: [USER_PREMISE],
      inferences: [],
      toolResults: [],
    });
    expect(gt.states[0].state).toBe("USER_PROVIDED");
    expect(gt.block).toContain("USER-PROVIDED");
    expect(gt.block).toContain("not independently verified");
  });

  it("records inferences as INFERENCE with rule provenance", async () => {
    const svc = freshService();
    givenRows("semantic_graph_edges", [{ id: "edge-1" }]);
    const gt = await evidenceGroundTruth(svc, {
      message: "does screed need leveling",
      premises: [FACT_PREMISE],
      userPremises: [],
      inferences: [
        {
          id: "i1",
          ruleId: "INHERITS_REQUIREMENT",
          statement: "screed requires leveling",
          explanation: "A IS_A B ∧ B REQUIRES X ⇒ A requires X",
          premiseIds: ["p1"],
          dependsOnUserPremise: false,
        },
      ],
      toolResults: [],
    });
    expect(gt.inferencesRecorded).toBe(1);
    expect(gt.block).toContain("INFERENCE (rule INHERITS_REQUIREMENT)");
    // the derived claim stays INFERRED, never VERIFIED
    expect(gt.states.some((s) => s.state === "INFERRED")).toBe(true);
  });

  it("records tool results as observed application data", async () => {
    const svc = freshService();
    const gt = await evidenceGroundTruth(svc, {
      message: "system status?",
      premises: [],
      userPremises: [],
      inferences: [],
      toolResults: [
        {
          tool: "system_status",
          ok: true,
          summary: "Live FRELUX state retrieved.",
          data: { estimates: 12, materials: 340 },
        },
      ],
    });
    expect(gt.claimsRecorded).toBe(1);
    expect(gt.evidenceAttached).toBe(1);
    expect(gt.block).toBe(""); // tool facts do not need label lines
  });

  it("a repeated identical turn DEDUPLICATES instead of duplicating claims (spec §22)", async () => {
    givenRows("semantic_graph_edges", [{ id: "edge-1" }]);
    const svc = freshService();
    const input = {
      message: "tell me about cement",
      premises: [FACT_PREMISE],
      userPremises: [],
      inferences: [],
      toolResults: [],
    };
    await evidenceGroundTruth(svc, input);
    const gt2 = await evidenceGroundTruth(svc, input);
    // second turn: same claim record returned (dedup), still 1 claim
    const claims = (await import("../testing/harness.ts")).tableFixtures.get(
      "archie_claims",
    )!;
    const distinct = new Set(claims.map((c: any) => c.claim_key));
    expect(distinct.size).toBe(1);
    expect(gt2.states[0].state).toBe("VERIFIED");
  });

  it("degrades honestly when the repository errors — never blocks the chat path", async () => {
    // a client whose insert always fails
    const badClient: any = {
      from: () => {
        const fail: any = {
          select: () => fail,
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: "db down" },
              }),
            }),
          }),
          eq: () => fail,
          ilike: () => fail,
          is: () => fail,
          limit: () => fail,
          single: async () => ({ data: null, error: { message: "db down" } }),
          update: () => fail,
          upsert: () => fail,
        };
        return fail;
      },
    };
    const svc = createEvidenceTruthService(badClient, { now: () => NOW });
    const gt = await evidenceGroundTruth(svc, {
      message: "tell me about cement",
      premises: [FACT_PREMISE],
      userPremises: [],
      inferences: [],
      toolResults: [],
    });
    // the turn STILL produced a block that demands honesty
    expect(gt.degraded.length).toBeGreaterThan(0);
    expect(gt.block).toContain("could not be evaluated");
    expect(gt.block).toContain("treat any related statement as UNVERIFIED");
  });

  it("an empty turn (greeting) produces NOTHING — zero recorded claims", async () => {
    const svc = freshService();
    const gt = await evidenceGroundTruth(svc, {
      message: "hello",
      premises: [],
      userPremises: [],
      inferences: [],
      toolResults: [],
    });
    expect(gt.block).toBe("");
    expect(gt.claimsExamined).toBe(0);
    expect(gt.claimsRecorded).toBe(0);
    const claims = (await import("../testing/harness.ts")).tableFixtures.get(
      "archie_claims",
    )!;
    expect(claims.length).toBe(0);
  });

  it("bounds the work per turn (spec §30)", async () => {
    const svc = freshService();
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      kind: "FACT",
      statement: `fact number ${i}`,
      source: "SEMANTIC_GRAPH",
      conceptKey: `key-${i}`,
    }));
    const gt = await evidenceGroundTruth(svc, {
      message: "lots of facts",
      premises: many,
      userPremises: [],
      inferences: [],
      toolResults: [],
    });
    expect(gt.claimsExamined).toBe(6); // maxClaims bound
  });
});
