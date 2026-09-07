// =========================================================
// PROJECT AGENT — STATE MACHINE TESTS (Phase 6, Stage 1)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  canTransition,
  isTerminal,
  applyTransition,
  isApprovalActive,
  isExecutable,
  APPROVAL_TTL_MS,
  LIFECYCLE_SEQUENCE,
} from "./states";

describe("lifecycle sequence (Stage 1 explicit states)", () => {
  it("is Observed → Analyzed → Recommended → Prepared → Approved → Executed → Verified", () => {
    expect(LIFECYCLE_SEQUENCE).toEqual([
      "observed",
      "analyzed",
      "recommended",
      "prepared",
      "approved",
      "executed",
      "verified",
    ]);
  });

  it("allows the full forward walk", () => {
    for (let i = 0; i < LIFECYCLE_SEQUENCE.length - 1; i++) {
      const check = canTransition(
        LIFECYCLE_SEQUENCE[i],
        LIFECYCLE_SEQUENCE[i + 1],
      );
      expect(
        check.allowed,
        `${LIFECYCLE_SEQUENCE[i]} → ${LIFECYCLE_SEQUENCE[i + 1]}`,
      ).toBe(true);
    }
  });

  it("rejects skipping stages — no Observed → Approved", () => {
    expect(canTransition("observed", "approved").allowed).toBe(false);
    expect(canTransition("observed", "executed").allowed).toBe(false);
    expect(canTransition("prepared", "executed").allowed).toBe(false); // must be approved first
    expect(canTransition("recommended", "approved").allowed).toBe(false);
  });

  it("rejects backward transitions", () => {
    expect(canTransition("executed", "prepared").allowed).toBe(false);
    expect(canTransition("verified", "approved").allowed).toBe(false);
  });

  it("rejects self-transitions", () => {
    const check = canTransition("analyzed", "analyzed");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("no self-transitions");
  });

  it("allows the honest exits at each pre-execution stage", () => {
    for (const from of [
      "observed",
      "analyzed",
      "recommended",
      "prepared",
    ] as const) {
      expect(canTransition(from, "rejected").allowed).toBe(true);
      expect(canTransition(from, "cancelled").allowed).toBe(true);
    }
    expect(canTransition("recommended", "expired").allowed).toBe(true);
    expect(canTransition("prepared", "expired").allowed).toBe(true);
    expect(canTransition("approved", "cancelled").allowed).toBe(true);
    expect(canTransition("approved", "expired").allowed).toBe(true);
  });

  it("execution ends in verified or failed — nothing else", () => {
    expect(canTransition("executed", "verified").allowed).toBe(true);
    expect(canTransition("executed", "failed").allowed).toBe(true);
    expect(canTransition("executed", "rejected").allowed).toBe(false);
    expect(canTransition("executed", "cancelled").allowed).toBe(false);
  });
});

describe("terminal states", () => {
  it("verified, rejected, cancelled, failed, expired are terminal", () => {
    for (const t of [
      "verified",
      "rejected",
      "cancelled",
      "failed",
      "expired",
    ] as const) {
      expect(isTerminal(t)).toBe(true);
      // nothing leaves a terminal state
      for (const to of LIFECYCLE_SEQUENCE) {
        expect(canTransition(t, to).allowed).toBe(false);
      }
    }
  });
});

describe("applyTransition", () => {
  it("returns a new record — never mutates", () => {
    const record = { id: "a", state: "observed" as const };
    const result = applyTransition(record, "analyzed", NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.state).toBe("analyzed");
    }
    expect(record.state).toBe("observed");
  });

  it("refuses invalid transitions with the reason", () => {
    const record = { id: "a", state: "observed" as const };
    const result = applyTransition(record, "executed", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toContain("Invalid transition observed → executed");
  });
});

const NOW = "2026-09-07T14:00:00Z";

describe("approval validity (expired-approval guard)", () => {
  it("pending approval inside TTL is active", () => {
    expect(
      isApprovalActive(
        { state: "pending", expiresAt: "2026-09-07T14:05:00Z" },
        NOW,
      ),
    ).toBe(true);
  });

  it("approval past its TTL is NOT active — must be re-requested", () => {
    expect(
      isApprovalActive(
        { state: "pending", expiresAt: "2026-09-07T13:59:59Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("decided approvals are inactive regardless of time", () => {
    expect(
      isApprovalActive(
        { state: "rejected", expiresAt: "2099-01-01T00:00:00Z" },
        NOW,
      ),
    ).toBe(false);
    expect(
      isApprovalActive(
        { state: "cancelled", expiresAt: "2099-01-01T00:00:00Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("default TTL is 15 minutes", () => {
    expect(APPROVAL_TTL_MS).toBe(15 * 60 * 1000);
  });
});

describe("execution guard (double-execution guard)", () => {
  it("only approved actions with an approved approval are executable", () => {
    expect(
      isExecutable({ state: "approved", approval: { state: "approved" } }),
    ).toBe(true);
    expect(
      isExecutable({ state: "approved", approval: { state: "pending" } }),
    ).toBe(false);
    expect(
      isExecutable({ state: "approved", approval: { state: "rejected" } }),
    ).toBe(false);
    expect(isExecutable({ state: "approved" })).toBe(false); // no approval record
    expect(
      isExecutable({ state: "prepared", approval: { state: "approved" } }),
    ).toBe(false);
    expect(
      isExecutable({ state: "executed", approval: { state: "approved" } }),
    ).toBe(false); // already executed
    expect(
      isExecutable({ state: "verified", approval: { state: "approved" } }),
    ).toBe(false);
  });
});
