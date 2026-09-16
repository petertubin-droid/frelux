// supabase/functions/_shared/escrow/escrow-lifecycle.test.ts
//
// ESCROW §23 LIFECYCLE TESTS — the deterministic core must
// be impossible to abuse:
//   * the money path is provider-only
//   * ARCHIE appears in no transition that moves funds
//   * acceptance requires the client or a real window lapse
//   * delivery requires evidence
//   * completion requires every milestone released
//   * milestone amounts can never exceed the funded total

import { describe, expect, it } from "vitest";
import {
  acceptanceWindowLapsed,
  canArchieExecuteFundsAction,
  clientRefundableRemainder,
  DEFAULT_ESCROW_TERMS,
  ESCROW_MILESTONE_STATUSES,
  ESCROW_TRANSACTION_STATUSES,
  releaseReadiness,
  validateMilestoneAmounts,
  validateMilestoneTransition,
  validateTransactionTransition,
  type EscrowActor,
  type EscrowMilestone,
  type EscrowMilestoneStatus,
  type EscrowTransactionStatus,
} from "./escrow-lifecycle.ts";

function milestone(
  status: EscrowMilestoneStatus,
  amount_kobo = 100_000,
): EscrowMilestone {
  return {
    sequence: 1,
    title: "Foundation",
    deliverables: ["Setting out", "Blinding"],
    amount_kobo,
    status,
  };
}

const released: EscrowMilestone = { ...milestone("RELEASED") };

describe("escrow §23 — funds authority boundary", () => {
  it("ARCHIE can never execute a funds action, for any action name", () => {
    for (const action of [
      "release",
      "refund",
      "seize",
      "transfer",
      undefined,
    ]) {
      const g = canArchieExecuteFundsAction(action);
      expect(g.allowed).toBe(false);
      expect(g.error).toContain("never");
    }
  });

  it("no transaction money state is reachable by ARCHIE", () => {
    const moneyStates: EscrowTransactionStatus[] = [
      "FUNDED",
      "REFUNDED",
      "COMPLETED",
    ];
    for (const from of ESCROW_TRANSACTION_STATUSES) {
      for (const to of moneyStates) {
        const r = validateTransactionTransition({
          from,
          to,
          actor: "ARCHIE" as EscrowActor,
        });
        expect(r.ok).toBe(false);
      }
    }
  });

  it("no milestone money state is reachable by ARCHIE or the contractor's release", () => {
    const moneyStates: EscrowMilestoneStatus[] = [
      "RELEASE_PENDING",
      "RELEASED",
    ];
    for (const from of ESCROW_MILESTONE_STATUSES) {
      for (const to of moneyStates) {
        for (const actor of [
          "ARCHIE",
          "CONTRACTOR",
          "CLIENT",
        ] as EscrowActor[]) {
          const r = validateMilestoneTransition({
            from,
            to,
            actor,
            evidence_provided: true,
            context: { acceptance_window_lapsed: true },
          });
          expect(r.ok).toBe(false);
        }
      }
    }
  });
});

describe("escrow §23 — transaction transitions", () => {
  it("funding is verified by the provider alone", () => {
    expect(
      validateTransactionTransition({
        from: "AWAITING_FUNDS",
        to: "FUNDED",
        actor: "PROVIDER",
      }),
    ).toEqual({ ok: true });
    expect(
      validateTransactionTransition({
        from: "AWAITING_FUNDS",
        to: "FUNDED",
        actor: "CLIENT",
      }).ok,
    ).toBe(false);
  });

  it("a client may initiate funding from DRAFT and cancel", () => {
    expect(
      validateTransactionTransition({
        from: "DRAFT",
        to: "AWAITING_FUNDS",
        actor: "CLIENT",
      }),
    ).toEqual({ ok: true });
    expect(
      validateTransactionTransition({
        from: "DRAFT",
        to: "CANCELLED",
        actor: "CLIENT",
      }),
    ).toEqual({ ok: true });
  });

  it("completion requires every milestone RELEASED", () => {
    const all: EscrowMilestone[] = [
      { ...released, sequence: 1 },
      { ...milestone("RELEASE_PENDING"), sequence: 2 },
    ];
    expect(
      validateTransactionTransition({
        from: "ACTIVE",
        to: "COMPLETED",
        actor: "PROVIDER",
        context: { milestones: all },
      }).ok,
    ).toBe(false);
    const done: EscrowMilestone[] = [
      { ...released, sequence: 1 },
      { ...released, sequence: 2 },
    ];
    expect(
      validateTransactionTransition({
        from: "ACTIVE",
        to: "COMPLETED",
        actor: "PROVIDER",
        context: { milestones: done },
      }),
    ).toEqual({ ok: true });
  });

  it("terminal states are terminal", () => {
    for (const from of [
      "COMPLETED",
      "CANCELLED",
      "EXPIRED",
      "REFUNDED",
    ] as EscrowTransactionStatus[]) {
      for (const to of ESCROW_TRANSACTION_STATUSES) {
        expect(
          validateTransactionTransition({ from, to, actor: "PROVIDER" }).ok,
        ).toBe(false);
      }
    }
  });
});

describe("escrow §23 — milestone transitions", () => {
  it("delivery requires evidence, never a bare claim", () => {
    expect(
      validateMilestoneTransition({
        from: "IN_PROGRESS",
        to: "DELIVERED",
        actor: "CONTRACTOR",
        evidence_provided: false,
      }).ok,
    ).toBe(false);
    expect(
      validateMilestoneTransition({
        from: "IN_PROGRESS",
        to: "DELIVERED",
        actor: "CONTRACTOR",
        evidence_provided: true,
      }),
    ).toEqual({ ok: true });
  });

  it("only the client accepts delivered work", () => {
    expect(
      validateMilestoneTransition({
        from: "DELIVERED",
        to: "ACCEPTED",
        actor: "CLIENT",
      }),
    ).toEqual({ ok: true });
    for (const actor of ["CONTRACTOR", "ARCHIE", "PROVIDER"] as EscrowActor[]) {
      expect(
        validateMilestoneTransition({
          from: "DELIVERED",
          to: "ACCEPTED",
          actor,
        }).ok,
      ).toBe(false);
    }
  });

  it("acceptance by window lapse requires the window to have actually lapsed", () => {
    const base = {
      from: "DELIVERED" as EscrowMilestoneStatus,
      to: "ACCEPTED" as EscrowMilestoneStatus,
      actor: "OWNER" as EscrowActor,
    };
    expect(validateMilestoneTransition(base).ok).toBe(false);
    expect(
      validateMilestoneTransition({
        ...base,
        context: { acceptance_window_lapsed: true },
      }),
    ).toEqual({ ok: true });
  });

  it("RELEASED is produced by the provider alone, after RELEASE_PENDING", () => {
    expect(
      validateMilestoneTransition({
        from: "RELEASE_PENDING",
        to: "RELEASED",
        actor: "PROVIDER",
      }),
    ).toEqual({ ok: true });
    expect(
      validateMilestoneTransition({
        from: "ACCEPTED",
        to: "RELEASED",
        actor: "PROVIDER",
      }).ok,
    ).toBe(false);
  });

  it("a rejected milestone returns to work or dispute, never straight to release", () => {
    expect(
      validateMilestoneTransition({
        from: "REJECTED",
        to: "IN_PROGRESS",
        actor: "CONTRACTOR",
      }),
    ).toEqual({ ok: true });
    expect(
      validateMilestoneTransition({
        from: "REJECTED",
        to: "RELEASED",
        actor: "PROVIDER",
      }).ok,
    ).toBe(false);
  });
});

describe("escrow §23 — acceptance window math", () => {
  const delivered_at = "2026-09-16T10:00:00Z";

  it("lapses only after the agreed window on a DELIVERED milestone", () => {
    expect(
      acceptanceWindowLapsed(
        milestone("DELIVERED"),
        delivered_at,
        { ...DEFAULT_ESCROW_TERMS, acceptance_window_days: 7 },
        "2026-09-18T10:00:00Z",
      ),
    ).toBe(false);
    expect(
      acceptanceWindowLapsed(
        milestone("DELIVERED"),
        delivered_at,
        { ...DEFAULT_ESCROW_TERMS, acceptance_window_days: 7 },
        "2026-09-23T10:00:01Z",
      ),
    ).toBe(true);
  });

  it("never lapses for a milestone that is not DELIVERED, or with a zero window", () => {
    expect(
      acceptanceWindowLapsed(
        milestone("IN_PROGRESS"),
        delivered_at,
        DEFAULT_ESCROW_TERMS,
        "2027-01-01T00:00:00Z",
      ),
    ).toBe(false);
    expect(
      acceptanceWindowLapsed(
        milestone("DELIVERED"),
        delivered_at,
        { ...DEFAULT_ESCROW_TERMS, acceptance_window_days: 0 },
        "2027-01-01T00:00:00Z",
      ),
    ).toBe(false);
  });

  it("rejects a clock before the delivery time", () => {
    expect(
      acceptanceWindowLapsed(
        milestone("DELIVERED"),
        delivered_at,
        DEFAULT_ESCROW_TERMS,
        "2026-09-10T10:00:00Z",
      ),
    ).toBe(false);
  });
});

describe("escrow §23 — amounts and remainder", () => {
  it("milestone amounts must be positive integers not exceeding the total", () => {
    expect(
      validateMilestoneAmounts(
        [{ amount_kobo: 50_000 }, { amount_kobo: 50_000 }],
        100_000,
      ),
    ).toEqual({ ok: true });
    expect(
      validateMilestoneAmounts(
        [{ amount_kobo: 60_000 }, { amount_kobo: 50_000 }],
        100_000,
      ).ok,
    ).toBe(false);
    expect(
      validateMilestoneAmounts([{ amount_kobo: 10_000.5 }], 100_000).ok,
    ).toBe(false);
    expect(validateMilestoneAmounts([], 100_000).ok).toBe(false);
  });

  it("the unreleased remainder returns to the client, never the contractor", () => {
    const ms = [
      { ...milestone("RELEASED", 40_000) },
      { ...milestone("RELEASED", 40_000) },
      { ...milestone("DISPUTED", 15_000) },
    ];
    expect(clientRefundableRemainder(ms, 100_000)).toBe(20_000);
  });
});

describe("escrow §23 — release readiness", () => {
  it("a release requires verified funds, ACTIVE status and RELEASE_PENDING", () => {
    expect(
      releaseReadiness({
        milestone: milestone("RELEASE_PENDING"),
        transaction_status: "ACTIVE",
        transaction_funded: true,
      }).ready,
    ).toBe(true);
    expect(
      releaseReadiness({
        milestone: milestone("ACCEPTED"),
        transaction_status: "ACTIVE",
        transaction_funded: true,
      }).ready,
    ).toBe(false);
    expect(
      releaseReadiness({
        milestone: milestone("RELEASE_PENDING"),
        transaction_status: "AWAITING_FUNDS",
        transaction_funded: false,
      }).ready,
    ).toBe(false);
  });
});
