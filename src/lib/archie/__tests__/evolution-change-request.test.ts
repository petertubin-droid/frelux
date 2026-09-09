// =========================================================
// ARCHIE EVOLUTION — CHANGE REQUEST LIFECYCLE TESTS (§2, §3, §6, §7)
//
// Full acceptance matrix:
//   propose → owner decision → staging authorization → staging
//   → testing → pass/fail → production authorization → execute
//   → rollback, with every illegal transition and every
//   authority violation refused.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  buildApprovalView,
  createChangeRequest,
  formatCrNumber,
  prepareRollback,
  transitionChangeRequest,
  type CreateChangeRequestInput,
  type TransitionEvidence,
} from "../evolution/change-request";
import type { EvolutionChangeRequest } from "../evolution/types";

const NOW = "2026-09-09T10:00:00Z";

function input(
  overrides: Partial<CreateChangeRequestInput> = {},
): CreateChangeRequestInput {
  return {
    title: "Fix labour cost overlap markup",
    description: "Moves the overlap markup after the base area is rounded.",
    reason: "Users reported inflated labour costs on L-shaped rooms.",
    affectedFiles: ["src/components/labour/LabourCostSection.tsx"],
    affectedComponents: ["LabourCostSection"],
    proposedDiff:
      "--- a/LabourCostSection.tsx\n+++ b/LabourCostSection.tsx\n@@ -12,3 +12,4 @@",
    dependencies: ["calc.ts (no change)"],
    securityImpact: "None — presentation only.",
    dataImpact: "None — no database writes.",
    regressionRisk: "low",
    testPlan: "Run LabourCostSection tests; add a case for L-shaped overlap.",
    rollbackPlan: "git revert the commit; no schema impact.",
    requestedLevel: "staging",
    archieVersion: "archie-1.9.0",
    now: NOW,
    ...overrides,
  };
}

function create(
  overrides: Partial<CreateChangeRequestInput> = {},
): EvolutionChangeRequest {
  const result = createChangeRequest(
    input(overrides),
    "cr-id-1",
    formatCrNumber(2026, 1),
  );
  if (!result.ok) throw new Error(result.error);
  return result.request;
}

const ownerApproval: TransitionEvidence = {
  now: NOW,
  actor: "OWNER",
  approval: {
    actor: "OWNER",
    authorizationRecordId: "auth-rec-staging",
    serverVerified: true,
  },
};

const productionApproval: TransitionEvidence = {
  now: NOW,
  actor: "OWNER",
  approval: {
    actor: "OWNER",
    authorizationRecordId: "auth-rec-production",
    serverVerified: true,
  },
};

describe("creation", () => {
  it("refuses half-proposals — every owner decision field must exist", () => {
    expect(
      createChangeRequest(input({ rollbackPlan: "" }), "id", "CR-2026-0001").ok,
    ).toBe(false);
    expect(
      createChangeRequest(input({ testPlan: " " }), "id", "CR-2026-0001").ok,
    ).toBe(false);
    expect(
      createChangeRequest(input({ securityImpact: "" }), "id", "CR-2026-0001")
        .ok,
    ).toBe(false);
    expect(
      createChangeRequest(input({ affectedFiles: [] }), "id", "CR-2026-0001")
        .ok,
    ).toBe(false);
    expect(
      createChangeRequest(input({ proposedDiff: "" }), "id", "CR-2026-0001").ok,
    ).toBe(false);
  });

  it("issues a CR starting in PROPOSED with an audit entry", () => {
    const result = createChangeRequest(input(), "id-1", "CR-2026-0007");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.state).toBe("PROPOSED");
      expect(result.request.crNumber).toBe("CR-2026-0007");
      expect(result.audit.toState).toBe("PROPOSED");
      expect(result.audit.actor).toBe("ARCHIE");
    }
  });

  it("flags protected-surface changes as OWNER_INTERVENTION_REQUIRED", () => {
    const request = create({
      affectedFiles: [
        "src/lib/archie/evolution/authority.ts",
        "src/pages/Contact.tsx",
      ],
    });
    expect(request.requiresOwnerIntervention).toBe(true);
    expect(request.flags).toContain("OWNER_INTERVENTION_REQUIRED");
  });

  it("formats CR numbers with zero padding", () => {
    expect(formatCrNumber(2026, 1)).toBe("CR-2026-0001");
    expect(formatCrNumber(2026, 12345)).toBe("CR-2026-12345");
  });
});

describe("the controlled lifecycle", () => {
  it("walks the full happy path with proper authority at every gate", () => {
    let cr = create();

    // Submit for owner decision.
    let r = transitionChangeRequest(cr, "AWAITING_OWNER", {
      now: NOW,
      actor: "ARCHIE",
      proposalComplete: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) cr = r.request;

    // ARCHIE cannot authorize staging.
    r = transitionChangeRequest(cr, "AUTHORIZED", {
      now: NOW,
      actor: "ARCHIE",
      approval: {
        actor: "ARCHIE",
        authorizationRecordId: "x",
        serverVerified: true,
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("ARCHIE cannot approve");

    // Owner authorizes staging with a server-verified record.
    r = transitionChangeRequest(cr, "AUTHORIZED", ownerApproval);
    expect(r.ok).toBe(true);
    if (r.ok) {
      cr = r.request;
      expect(cr.ownerAuthorizationStatus).toBe("staging_authorized");
      expect(cr.stagingAuthorizationRecordId).toBe("auth-rec-staging");
    }

    // Staging.
    r = transitionChangeRequest(cr, "STAGING", {
      now: NOW,
      actor: "ARCHIE",
      stagingEnvironment: "staging",
    });
    expect(r.ok).toBe(true);
    if (r.ok) cr = r.request;

    // Testing passes.
    const tests = {
      checks: [
        { name: "tsc", status: "passed" as const, detail: "0 errors" },
        { name: "vitest", status: "passed" as const, detail: "17 passed" },
      ],
      ranAt: NOW,
      environment: "staging" as const,
      summary: "all_passed" as const,
    };
    r = transitionChangeRequest(cr, "TESTING", { now: NOW, actor: "ARCHIE" });
    expect(r.ok).toBe(true);
    if (r.ok) cr = r.request;
    r = transitionChangeRequest(cr, "PASSED", {
      now: NOW,
      actor: "ARCHIE",
      testResults: tests,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      cr = r.request;
      expect(cr.testResults?.summary).toBe("all_passed");
    }

    // Production execution requires a SEPARATE owner authorization.
    r = transitionChangeRequest(cr, "EXECUTED", {
      ...ownerApproval, // reusing the STAGING record must fail
      resultingCommit: "abc123",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("SEPARATE");

    r = transitionChangeRequest(cr, "EXECUTED", {
      ...productionApproval,
      resultingCommit: "abc123",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      cr = r.request;
      expect(cr.state).toBe("EXECUTED");
      expect(cr.resultingCommit).toBe("abc123");
      expect(cr.ownerAuthorizationStatus).toBe("production_authorized");
    }

    // Rollback is owner-gated with its own record.
    r = transitionChangeRequest(cr, "ROLLED_BACK", {
      now: NOW,
      actor: "ARCHIE",
      rollbackInformation: "reverted",
    });
    expect(r.ok).toBe(false);
    r = transitionChangeRequest(cr, "ROLLED_BACK", {
      now: NOW,
      actor: "OWNER",
      approval: {
        actor: "OWNER",
        authorizationRecordId: "auth-rec-rollback",
        serverVerified: true,
      },
      rollbackInformation: "git revert abc123",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.request.state).toBe("ROLLED_BACK");
  });

  it("rejects invalid transitions and skips", () => {
    const cr = create();
    const r = transitionChangeRequest(cr, "PASSED", {
      now: NOW,
      actor: "ARCHIE",
    });
    expect(r.ok).toBe(false);
    const r2 = transitionChangeRequest(cr, "EXECUTED", productionApproval);
    expect(r2.ok).toBe(false);
  });

  it("terminal states never move again — a new CR is required", () => {
    const cr = create({ ...input(), requestedLevel: "staging" });
    const rejected = transitionChangeRequest(cr, "REJECTED", {
      now: NOW,
      actor: "ARCHIE",
    });
    expect(rejected.ok).toBe(true); // ARCHIE may withdraw its own PROPOSED item
    if (rejected.ok) {
      const again = transitionChangeRequest(
        rejected.request,
        "AWAITING_OWNER",
        {
          now: NOW,
          actor: "ARCHIE",
          proposalComplete: true,
        },
      );
      expect(again.ok).toBe(false);
    }
  });

  it("ARCHIE cannot reject after submitting — only the owner decides", () => {
    const base = create();
    const submitted = transitionChangeRequest(base, "AWAITING_OWNER", {
      now: NOW,
      actor: "ARCHIE",
      proposalComplete: true,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const r = transitionChangeRequest(submitted.request, "REJECTED", {
      now: NOW,
      actor: "ARCHIE",
    });
    expect(r.ok).toBe(false);
  });

  it("test results must be internally consistent — failures cannot pass", () => {
    const cr = create();
    const submitted = transitionChangeRequest(cr, "AWAITING_OWNER", {
      now: NOW,
      actor: "ARCHIE",
      proposalComplete: true,
    });
    expect(submitted.ok).toBe(true);
    const authorized = transitionChangeRequest(
      (submitted as { ok: true; request: EvolutionChangeRequest }).request,
      "AUTHORIZED",
      ownerApproval,
    );
    expect(authorized.ok).toBe(true);
    const staged = transitionChangeRequest(
      (authorized as { ok: true; request: EvolutionChangeRequest }).request,
      "STAGING",
      { now: NOW, actor: "ARCHIE", stagingEnvironment: "staging" },
    );
    expect(staged.ok).toBe(true);
    const testing = transitionChangeRequest(
      (staged as { ok: true; request: EvolutionChangeRequest }).request,
      "TESTING",
      { now: NOW, actor: "ARCHIE" },
    );
    expect(testing.ok).toBe(true);

    const failing = {
      checks: [
        { name: "vitest", status: "failed" as const, detail: "1 failed" },
      ],
      ranAt: NOW,
      environment: "staging" as const,
      summary: "failures" as const,
    };
    const lying = transitionChangeRequest(
      (testing as { ok: true; request: EvolutionChangeRequest }).request,
      "PASSED",
      {
        now: NOW,
        actor: "ARCHIE",
        testResults: failing,
      },
    );
    expect(lying.ok).toBe(false); // failures cannot be marked PASSED
    const honest = transitionChangeRequest(
      (testing as { ok: true; request: EvolutionChangeRequest }).request,
      "FAILED",
      {
        now: NOW,
        actor: "ARCHIE",
        testResults: failing,
      },
    );
    expect(honest.ok).toBe(true);
    // FAILED is terminal.
    const revived = transitionChangeRequest(
      (honest as { ok: true; request: EvolutionChangeRequest }).request,
      "TESTING",
      { now: NOW, actor: "ARCHIE" },
    );
    expect(revived.ok).toBe(false);
  });

  it("the owner can request changes, sending the CR back to PROPOSED", () => {
    const cr = create();
    const submitted = transitionChangeRequest(cr, "AWAITING_OWNER", {
      now: NOW,
      actor: "ARCHIE",
      proposalComplete: true,
    });
    expect(submitted.ok).toBe(true);
    const req = (submitted as { ok: true; request: EvolutionChangeRequest })
      .request;
    const archieTries = transitionChangeRequest(req, "PROPOSED", {
      now: NOW,
      actor: "ARCHIE",
    });
    expect(archieTries.ok).toBe(false);
    const ownerDoes = transitionChangeRequest(req, "PROPOSED", {
      now: NOW,
      actor: "OWNER",
    });
    expect(ownerDoes.ok).toBe(true);
  });

  it("EXECUTED requires a resulting commit — no fake deploy success (§22)", () => {
    let cr = create();
    const walk = (
      to: Parameters<typeof transitionChangeRequest>[1],
      ev: Partial<TransitionEvidence>,
    ) => {
      const r = transitionChangeRequest(cr, to, {
        now: NOW,
        actor: "ARCHIE",
        ...ev,
      } as TransitionEvidence);
      expect(r.ok).toBe(true);
      if (r.ok) cr = r.request;
    };
    walk("AWAITING_OWNER", { proposalComplete: true });
    const authorized = transitionChangeRequest(cr, "AUTHORIZED", ownerApproval);
    expect(authorized.ok).toBe(true);
    if (authorized.ok) cr = authorized.request;
    walk("STAGING", { stagingEnvironment: "staging" });
    walk("TESTING", {});
    walk("PASSED", {
      testResults: {
        checks: [{ name: "build", status: "passed" as const, detail: "ok" }],
        ranAt: NOW,
        environment: "staging",
        summary: "all_passed",
      },
    });
    const noCommit = transitionChangeRequest(cr, "EXECUTED", {
      ...productionApproval,
    });
    expect(noCommit.ok).toBe(false);
    if (!noCommit.ok) expect(noCommit.error).toContain("resulting commit");
  });
});

describe("approval view & rollback preparation", () => {
  it("shows the owner everything (§4) — nothing hidden", () => {
    const cr = create();
    const view = buildApprovalView(cr);
    expect(view.crNumber).toBe("CR-2026-0001");
    expect(view.whatWillChange).toContain("overlap markup");
    expect(view.why).toContain("labour costs");
    expect(view.diff).toContain("@@");
    expect(view.risk).toBe("low");
    expect(view.rollbackPlan).toBeTruthy();
    expect(view.securityImpact).toBeTruthy();
    expect(view.dataImpact).toBeTruthy();
  });

  it("prepares rollback information before execution (§7)", () => {
    const cr = create();
    const prep = prepareRollback(cr, "v1.9.0", "none", "none");
    expect("recoveryInformation" in prep).toBe(true);
    if ("recoveryInformation" in prep) {
      expect(prep.recoveryInformation).toContain("v1.9.0");
      expect(prep.affectedFiles).toContain(
        "src/components/labour/LabourCostSection.tsx",
      );
    }
    const noVersion = prepareRollback(cr, " ", "none", "none");
    expect("error" in noVersion).toBe(true);
    const noPlan = prepareRollback(
      { ...cr, rollbackPlan: "" },
      "v1.9.0",
      "none",
      "none",
    );
    expect("error" in noPlan).toBe(true);
  });
});
