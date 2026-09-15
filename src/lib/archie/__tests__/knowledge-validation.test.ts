// =========================================================
// KNOWLEDGE-VALIDATION TESTS (batch 23, fix 85)
// ARCHIE can never verify its own knowledge; INFERRED needs
// a basis; OWNER_PROVIDED must come from the Owner;
// confidence decays on a half-life so stale facts resurface.
// =========================================================

import { describe, expect, it } from "vitest";
import {
  canTransition,
  decayedConfidence,
  isFact,
  labelStatement,
  needsRevalidation,
  rankForRetrieval,
  registerKnowledge,
  type ValidatedKnowledge,
} from "@/lib/archie/knowledge-validation";

function k(over: Partial<ValidatedKnowledge> = {}): ValidatedKnowledge {
  return {
    key: "paint.coverage",
    domain: "architecture",
    statement: "1L covers 10m2",
    validation_state: "OWNER_PROVIDED",
    source: "OWNER",
    learned_at: "2026-09-15T00:00:00Z",
    confidence: 0.9,
    version: 1,
    ...over,
  };
}

describe("state transitions — human verification is the only path to VERIFIED", () => {
  it("allows UNVERIFIED → VERIFIED only via the human step", () => {
    expect(canTransition("UNVERIFIED", "VERIFIED")).toBe(true);
    expect(canTransition("UNVERIFIED", "INFERRED")).toBe(true);
    expect(canTransition("INFERRED", "VERIFIED")).toBe(true);
  });

  it("makes OWNER_PROVIDED and CONFIGURED terminal", () => {
    expect(canTransition("OWNER_PROVIDED", "VERIFIED")).toBe(false);
    expect(canTransition("CONFIGURED", "UNVERIFIED")).toBe(false);
  });

  it("allows re-opening VERIFIED only on contradicting evidence", () => {
    expect(canTransition("VERIFIED", "UNVERIFIED")).toBe(true);
    expect(canTransition("VERIFIED", "INFERRED")).toBe(false);
  });

  it("counts VERIFIED/OWNER_PROVIDED/CONFIGURED as fact", () => {
    expect(isFact("VERIFIED")).toBe(true);
    expect(isFact("OWNER_PROVIDED")).toBe(true);
    expect(isFact("CONFIGURED")).toBe(true);
    expect(isFact("INFERRED")).toBe(false);
    expect(isFact("UNVERIFIED")).toBe(false);
  });
});

describe("registerKnowledge — the §11 provenance contract", () => {
  it("refuses VERIFIED without human verification — ARCHIE cannot self-verify", () => {
    const r = registerKnowledge({
      ...k({ validation_state: "VERIFIED" }),
      verification_evidence: "evidence doc",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cannot verify its own knowledge/i);
  });

  it("requires verification evidence on the human path", () => {
    const r = registerKnowledge({
      ...k({ validation_state: "VERIFIED" }),
      humanVerified: true,
      verification_evidence: "  ",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/requires verification evidence/i);
  });

  it("accepts human-verified knowledge with evidence", () => {
    const r = registerKnowledge({
      ...k({ validation_state: "VERIFIED" }),
      humanVerified: true,
      verification_evidence: "Test report #42",
    });
    expect(r.ok).toBe(true);
  });

  it("requires the inference basis for INFERRED knowledge", () => {
    const r = registerKnowledge(
      k({ validation_state: "INFERRED", source: "AI" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/inference basis/i);
  });

  it("requires OWNER as source for OWNER_PROVIDED", () => {
    const r = registerKnowledge(k({ source: "AI" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/must name the Owner as source/i);
  });

  it("rejects confidence outside 0..1 and versions monotonically", () => {
    const bad = registerKnowledge(k({ confidence: 1.2 }));
    expect(bad.ok).toBe(false);
    const r = registerKnowledge({ ...k(), previousVersion: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.knowledge.version).toBe(4);
  });
});

describe("confidence decay and revalidation", () => {
  it("halves confidence over the 365-day half-life", () => {
    const fresh = decayedConfidence(
      k({ confidence: 0.8 }),
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(fresh).toBeCloseTo(0.8, 5);
    const aged = decayedConfidence(
      k({ confidence: 0.8, learned_at: "2025-09-15T00:00:00Z" }),
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(aged).toBeCloseTo(0.4, 5);
  });

  it("flags stale records for revalidation against the state bar", () => {
    const stale = k({
      confidence: 0.6,
      learned_at: "2023-09-15T00:00:00Z", // 3 half-lives → 0.075 < 0.4
    });
    expect(needsRevalidation(stale, new Date("2026-09-15T00:00:00Z"))).toBe(
      true,
    );
  });
});

describe("retrieval ranking and labeling", () => {
  it("ranks by decayed confidence", () => {
    const ranked = rankForRetrieval(
      [
        k({ key: "old", confidence: 0.9, learned_at: "2024-01-01T00:00:00Z" }),
        k({
          key: "fresh",
          confidence: 0.5,
          learned_at: "2026-09-01T00:00:00Z",
        }),
      ],
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(ranked[0].key).toBe("fresh");
  });

  it("always labels UNVERIFIED/INFERRED statements so they are never presented as fact", () => {
    expect(
      labelStatement(k({ validation_state: "UNVERIFIED", source: "AI" })),
    ).toMatch(/^\[UNVERIFIED · confidence 0\.90\]/);
    expect(
      labelStatement(
        k({ validation_state: "INFERRED", source: "AI", inference_basis: "b" }),
      ),
    ).toMatch(/^\[INFERRED/);
    expect(labelStatement(k())).toBe("1L covers 10m2"); // fact, fresh
  });
});
