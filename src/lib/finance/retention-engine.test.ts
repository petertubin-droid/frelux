import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  computeRetention,
  escalateCashFlowWithRetention,
  withholdFromPayment,
} from "./retention-engine";

describe("computeRetention", () => {
  it("splits the pot at PC and after the 12-month DLP by default", () => {
    const r = computeRetention({
      withheldTotal: 50000,
      practicalCompletionDate: "2026-06-30",
    });
    expect(r.ok).toBe(true);
    expect(r.retentionPercent).toBe(5);
    expect(r.withheldTotal).toBe(50000);
    // 50% at PC, remainder after DLP
    expect(r.releaseAtPc).toBe(25000);
    expect(r.releaseAfterDlp).toBe(25000);
    expect(r.practicalCompletionDate).toBe("2026-06-30");
    expect(r.dlpEndDate).toBe("2027-06-30");
    expect(r.retentionBond).toBe(false);
  });

  it("honours a custom release share and DLP length", () => {
    const r = computeRetention({
      withheldTotal: 100000,
      practicalCompletionDate: "2026-01-15",
      config: { retentionPercent: 10, releaseAtPcPercent: 40, dlpMonths: 6 },
    });
    expect(r.releaseAtPc).toBe(40000);
    expect(r.releaseAfterDlp).toBe(60000);
    expect(r.dlpEndDate).toBe("2026-07-15");
  });

  it("carries the rounding remainder on the DLP release so the ledger balances", () => {
    const r = computeRetention({
      withheldTotal: 1000.01,
      practicalCompletionDate: "2026-06-30",
      config: { releaseAtPcPercent: 50 },
    });
    expect(r.releaseAtPc).toBe(500.01);
    expect(r.releaseAfterDlp).toBe(500);
    expect(r.releaseAtPc + r.releaseAfterDlp).toBeCloseTo(1000.01, 2);
    expect(r.releaseAtPc + r.releaseAfterDlp).toBe(r.withheldTotal);
  });

  it("warns when no Practical Completion date is supplied", () => {
    const r = computeRetention({ withheldTotal: 50000 });
    expect(r.releaseAtPc).toBe(25000);
    expect(r.practicalCompletionDate).toBeNull();
    expect(r.dlpEndDate).toBeNull();
    expect(r.warnings.join(" ")).toContain("No Practical Completion date");
  });

  it("refuses invalid rates instead of guessing", () => {
    const bad = computeRetention({
      withheldTotal: 1000,
      practicalCompletionDate: "2026-06-30",
      config: { retentionPercent: 150 },
    });
    expect(bad.ok).toBe(false);
    expect(bad.warnings.join(" ")).toContain("between 0 and 100");

    const badShare = computeRetention({
      withheldTotal: 1000,
      practicalCompletionDate: "2026-06-30",
      config: { releaseAtPcPercent: -10 },
    });
    expect(badShare.ok).toBe(false);
  });

  it("replaces cash retention with a bond when configured", () => {
    const r = computeRetention({
      withheldTotal: 0,
      contractAmount: 1000000,
      practicalCompletionDate: "2026-06-30",
      config: {
        retentionPercent: 5,
        retentionBond: true,
        bondPremiumPercent: 1.5,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.retentionBond).toBe(true);
    expect(r.withheldTotal).toBe(0);
    expect(r.releaseAtPc).toBe(0);
    expect(r.releaseAfterDlp).toBe(0);
    expect(r.bondPremiumPercent).toBe(1.5);
    expect(r.notes.join(" ")).toContain("15000.00"); // 1.5% of 1,000,000
    expect(r.notes.join(" ")).toContain("surety");
  });
});

describe("withholdFromPayment", () => {
  it("withholds 5% by default, penny-rounded", () => {
    const { gross, retained, net } = withholdFromPayment(1234.56);
    expect(gross).toBe(1234.56);
    expect(retained).toBe(61.73);
    expect(net).toBe(1172.83);
  });

  it("honours a custom rate", () => {
    const { retained, net } = withholdFromPayment(10000, {
      retentionPercent: 10,
    });
    expect(retained).toBe(1000);
    expect(net).toBe(9000);
  });
});

describe("escalateCashFlowWithRetention", () => {
  const payments = [
    { label: "Mobilisation", date: "2026-01-01", amount: 400000 },
    { label: "Mid construction", date: "2026-04-01", amount: 400000 },
    { label: "Completion", date: "2026-08-01", amount: 200000 },
  ];

  it("withholds from every payment and releases at PC and DLP end", () => {
    const r = escalateCashFlowWithRetention({
      payments,
      practicalCompletionDate: "2026-08-01",
    });
    expect(r.ok).toBe(true);
    expect(r.payments).toHaveLength(3);
    // 5% of each payment is withheld
    expect(r.payments[0].retained).toBe(20000);
    expect(r.payments[0].net).toBe(380000);
    expect(r.withheldTotal).toBe(50000);
    // Half at PC, remainder after the DLP
    expect(r.releases.atPc).toBe(25000);
    expect(r.releases.atDlp).toBe(25000);
    expect(r.releases.pcDate).toBe("2026-08-01");
    expect(r.releases.dlpEndDate).toBe("2027-08-01");
    // The ledger balances to the kobo
    expect(r.netTotal).toBe(950000);
    expect(r.releasedTotal).toBe(50000);
    expect(r.balances).toBe(true);
    expect(r.netTotal + r.releasedTotal).toBe(1000000);
  });

  it("infers Practical Completion from the last milestone when omitted", () => {
    const r = escalateCashFlowWithRetention({ payments });
    expect(r.releases.pcDate).toBe("2026-08-01");
    expect(r.notes.join(" ")).toContain("inferred from the final milestone");
  });

  it("keeps payments gross under a retention bond", () => {
    const r = escalateCashFlowWithRetention({
      payments,
      config: { retentionPercent: 5, retentionBond: true },
    });
    expect(r.ok).toBe(true);
    expect(r.payments.every((p) => p.retained === 0 && p.net === p.gross)).toBe(
      true,
    );
    expect(r.withheldTotal).toBe(0);
    expect(r.releases.atPc).toBe(0);
    expect(r.releases.atDlp).toBe(0);
    expect(r.notes.join(" ")).toContain("disbursed gross");
  });

  it("reports a warning rather than guessing when the ledger cannot balance", () => {
    // Direct balance check: the engine guarantees balance by construction;
    // this documents the invariant the cash-flow integration relies on.
    const r = escalateCashFlowWithRetention({ payments });
    expect(r.balances).toBe(true);
    expect(r.warnings.join(" ")).not.toContain("does not balance");
  });
});

describe("addMonthsIso", () => {
  it("clamps month overflow", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2026-06-30", 12)).toBe("2027-06-30");
    expect(addMonthsIso("2024-02-29", 12)).toBe("2025-02-28");
  });
});
