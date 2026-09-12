// =========================================================
// ARCHIE KNOWLEDGE AUTONOMY — QUALITY GATES
//
// Owner directive 2026-09-12: "Knowledge accumulation should
// be free. ARCHIE should be able to learn, filter and promote
// knowledge without my review — but restricted from modifying
// its code and decisions without my approval and authority."
//
// These gates pin BOTH halves of that directive:
//   1. Free knowledge DOES promote autonomously.
//   2. Owner-gated surfaces (code / decisions / certified
//      math / quarantined material) NEVER auto-promote.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  evaluateAutonomy,
  AUTONOMY_THRESHOLDS,
  CERTIFIED_MATH_CAPABILITIES,
} from "@studio-shared/archie-ai/knowledge/autonomous.ts";

const base = {
  capability: "market_observation",
  topic: "cement price trend Lagos",
  recommendation: "Nigerian cement prices rose 8% Q3 2026.",
  conclusion: "Factor into estimates with regional scope.",
  proposed_scope: "REGIONAL",
  confidence: 0.85,
};

describe("knowledge autonomy — free accumulation", () => {
  it("promotes ordinary high-confidence regional knowledge", () => {
    expect(evaluateAutonomy(base).decision).toBe("PROMOTE");
  });

  it("promotes GLOBAL knowledge at the same quality bar as any other scope", () => {
    expect(
      evaluateAutonomy({ ...base, proposed_scope: "GLOBAL", confidence: 0.9 })
        .decision,
    ).toBe("PROMOTE");
    // Confidence is the gate now, not the review wall: material
    // below the quality bar holds regardless of scope.
    expect(
      evaluateAutonomy({ ...base, proposed_scope: "GLOBAL", confidence: 0.4 })
        .decision,
    ).toBe("HOLD");
  });

  it("holds low-confidence material for the owner instead of promoting it", () => {
    const r = evaluateAutonomy({ ...base, confidence: 0.4 });
    expect(r.decision).toBe("HOLD");
    expect(r.reason).toContain("below autonomous threshold");
  });

  it("self-assesses confidence when none was recorded (processing on its own)", () => {
    // Complete, provenance-backed material with no recorded
    // confidence: ARCHIE assesses it itself (0.4 + 0.4 = 0.8).
    const r = evaluateAutonomy({
      ...base,
      confidence: null,
      evidence: ["observed Q3 2026 market reports"],
      provenance: { owner_supplied: true },
    });
    expect(r.decision).toBe("PROMOTE");
    expect(r.reason).toContain("self-assessed");

    // Thin material (topic + recommendation only): self-assessed
    // 0.5 — below the autonomous threshold, holds for the owner.
    const thin = evaluateAutonomy({
      ...base,
      confidence: 0,
      conclusion: null,
      evidence: [],
      provenance: undefined,
    });
    expect(thin.decision).toBe("HOLD");
    expect(thin.reason).toContain("self-assessed");
  });

  it("rejects material with nothing to anchor or learn from", () => {
    expect(evaluateAutonomy({ ...base, topic: "  " }).decision).toBe("REJECT");
    expect(
      evaluateAutonomy({
        ...base,
        recommendation: "",
        conclusion: null,
      }).decision,
    ).toBe("REJECT");
  });
});

describe("knowledge autonomy — owner boundary (code & decisions)", () => {
  it("HOLDS code-modification material — never auto-promotes", () => {
    const r = evaluateAutonomy({
      ...base,
      capability: "code_modification",
      confidence: 0.99,
    });
    expect(r.decision).toBe("HOLD");
    expect(r.reason).toContain("owner-gated");
  });

  it("HOLDS self-modification, governance, execution and decision material", () => {
    for (const capability of [
      "self_modification",
      "governance_rules",
      "execution_policy",
      "business_decision",
      "owner_authority_delegation",
      "constitution_amendment",
    ]) {
      const r = evaluateAutonomy({ ...base, capability, confidence: 0.99 });
      expect(r.decision, capability).toBe("HOLD");
    }
  });

  it("HOLDS certified-math (calculator rule) material — decisions, not free knowledge", () => {
    for (const capability of CERTIFIED_MATH_CAPABILITIES) {
      const r = evaluateAutonomy({ ...base, capability, confidence: 0.99 });
      expect(r.decision, capability).toBe("HOLD");
      expect(r.reason, capability).toContain("owner-gated");
    }
  });

  it("HOLDS material quarantined by ingestion sanitization (injection flags)", () => {
    const r = evaluateAutonomy(base, ["prompt_injection_pattern"]);
    expect(r.decision).toBe("HOLD");
    expect(r.reason).toContain("quarantined");
  });

  it("the owner boundary cannot be crossed by high confidence", () => {
    // Even 1.0 confidence must not unlock code/decision material.
    const r = evaluateAutonomy({
      ...base,
      capability: "code",
      confidence: 1.0,
      proposed_scope: "PROJECT",
    });
    expect(r.decision).toBe("HOLD");
  });
});

describe("knowledge autonomy — drift contract", () => {
  it("thresholds stay pinned (changing them is an owner decision)", () => {
    expect(AUTONOMY_THRESHOLDS.MIN_CONFIDENCE).toBe(0.6);
    expect(AUTONOMY_THRESHOLDS.GLOBAL_CONFIDENCE).toBe(0.6);
    expect(CERTIFIED_MATH_CAPABILITIES.size).toBeGreaterThanOrEqual(12);
  });
});
