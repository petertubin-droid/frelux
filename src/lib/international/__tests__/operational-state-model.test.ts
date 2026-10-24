import { describe, it, expect } from "vitest";
import {
  resolveOperationalState,
  OPERATIONAL_STATES,
  type CapabilityStateRow,
} from "../capability-registry";

function row(
  state: CapabilityStateRow["state"],
  overrides: Partial<CapabilityStateRow> = {},
): CapabilityStateRow {
  return {
    engine_id: "painting",
    market_code: "NG",
    state,
    evidence_owner: "FRELUX Operations",
    blocking_gaps: [],
    last_verification: "2026-10-24T00:00:00Z",
    state_note: null,
    ...overrides,
  };
}

describe("resolveOperationalState (Phase 0 operational state model)", () => {
  it("exposes exactly the five roadmap states", () => {
    expect([...OPERATIONAL_STATES]).toEqual([
      "unavailable",
      "partial",
      "configured",
      "verified_operational",
      "suspended",
    ]);
  });

  it("returns null for an unknown engine", () => {
    expect(
      resolveOperationalState("warp_drive", "NG", row("configured")),
    ).toBeNull();
  });

  it("verified_operational on a verified pair resolves operational", () => {
    const r = resolveOperationalState(
      "painting",
      "NG",
      row("verified_operational"),
    );
    expect(r?.state).toBe("verified_operational");
    expect(r?.operational).toBe(true);
    expect(r?.evidenceOwner).toBe("FRELUX Operations");
    expect(r?.reason).toContain("operationally verified");
  });

  it("fails closed: verified_operational cannot rescue a disabled admin row", () => {
    const r = resolveOperationalState(
      "painting",
      "NG",
      row("verified_operational"),
      { calculator_type: "painting", is_available: false },
    );
    expect(r?.operational).toBe(false);
  });

  it("fails closed: verified_operational cannot rescue an unverified pair", () => {
    // All 32 markets are verified for painting, so use an engine/market
    // combination that is unverified: painting outside the registry.
    const r = resolveOperationalState("painting", "XX", {
      ...row("verified_operational"),
      market_code: "XX",
    });
    // resolveCapability treats XX as unverified -> requires_verification.
    expect(r?.operational).toBe(false);
  });

  it("unavailable and suspended block operation even on verified pairs", () => {
    for (const state of ["unavailable", "suspended"] as const) {
      const r = resolveOperationalState("painting", "NG", row(state));
      expect(r?.state).toBe(state);
      expect(r?.operational).toBe(false);
    }
  });

  it("partial and configured pairs still run market-first with disclosed depth", () => {
    for (const state of ["partial", "configured"] as const) {
      const r = resolveOperationalState("painting", "NG", row(state));
      expect(r?.state).toBe(state);
      expect(r?.operational).toBe(true);
      expect(r?.reason).toContain(
        state === "partial"
          ? "part of its scope"
          : "not yet operationally verified",
      );
    }
  });

  it("surfaces blocking gaps and evidence owner in the reason", () => {
    const r = resolveOperationalState(
      "painting",
      "NG",
      row("configured", {
        blocking_gaps: [
          "Exterior premium lines unpriced",
          "Labour rates pending review",
        ],
        evidence_owner: "Market Ops NG",
      }),
    );
    expect(r?.blockingGaps).toEqual([
      "Exterior premium lines unpriced",
      "Labour rates pending review",
    ]);
    expect(r?.reason).toContain(
      "Open gaps: Exterior premium lines unpriced; Labour rates pending review.",
    );
    expect(r?.evidenceOwner).toBe("Market Ops NG");
  });

  it("a row for a different pair is ignored (never manufactures state)", () => {
    const r = resolveOperationalState("painting", "NG", {
      ...row("verified_operational"),
      engine_id: "tile",
    });
    // The mismatched row must not be trusted; availability alone decides.
    expect(r?.state).toBeNull();
    expect(r?.operational).toBe(true);
  });

  it("no row falls back to availability resolution", () => {
    const r = resolveOperationalState("painting", "NG", null);
    expect(r?.state).toBeNull();
    expect(r?.operational).toBe(true);

    const unverified = resolveOperationalState("painting", "XX", null);
    expect(unverified?.operational).toBe(false);
    expect(unverified?.reason).toContain("not configured");
  });
});
