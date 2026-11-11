import { describe, expect, it } from "vitest";
import {
  ESCROW_FEE_BASIS_POINTS,
  SettlementError,
  createSettlement,
  feeOn,
  openDispute,
  recordPayment,
  refund,
  releaseMilestone,
  resolveDispute,
  summarise,
} from "./settlement";

const order = () =>
  createSettlement({
    id: "ord_1",
    currency: "NGN",
    total: 500_000_00, // 500,000 naira in kobo
    feeBasisPoints: 250, // 2.5 percent
    milestones: [
      { id: "deposit", label: "Deposit", amount: 150_000_00 },
      { id: "delivery", label: "On delivery", amount: 350_000_00 },
    ],
  });

describe("settlement core", () => {
  it("starts unpaid with milestone amounts adding up to the total", () => {
    const s = order();
    expect(s.status).toBe("pending_payment");
    expect(s.held).toBe(0);
    expect(s.milestones.reduce((t, m) => t + m.amount, 0)).toBe(
      s.milestones[0].amount + s.milestones[1].amount,
    );
  });

  it("refuses milestones that do not add up to the order total", () => {
    expect(() =>
      createSettlement({
        id: "ord_2",
        currency: "NGN",
        total: 100_00,
        feeBasisPoints: 250,
        milestones: [{ id: "a", label: "A", amount: 60_00 }],
      }),
    ).toThrow(SettlementError);
  });

  it("rejects fractional money", () => {
    expect(() =>
      createSettlement({
        id: "ord_3",
        currency: "NGN",
        total: 100.5,
        feeBasisPoints: 250,
      }),
    ).toThrow(/whole number/);
  });

  it("calculates the fee as whole minor units, rounding down", () => {
    expect(feeOn(500_000_00, 250)).toBe(1_250_000); // 12,500 naira
    expect(feeOn(333, 250)).toBe(8); // 8.325 rounded down
  });

  it("uses the owner's 7 percent escrow fee", () => {
    expect(ESCROW_FEE_BASIS_POINTS).toBe(700);
    // 1,000,000 naira escrowed, 70,000 naira fee, 930,000 to the seller.
    const fee = feeOn(1_000_000_00, ESCROW_FEE_BASIS_POINTS);
    expect(fee).toBe(70_000_00);
    expect(1_000_000_00 - fee).toBe(930_000_00);
  });

  it("cannot release before the money arrives", () => {
    const s = order();
    expect(() => releaseMilestone(s, "deposit")).toThrow(/not enough funds/);
  });

  it("holds a payment and releases a milestone exactly once", () => {
    const paid = recordPayment(order(), 500_000_00);
    expect(paid.status).toBe("funds_held");
    const released = releaseMilestone(paid, "deposit");
    expect(released.status).toBe("partially_released");
    expect(released.releasedToSeller).toBe(150_000_00);
    expect(released.platformFee).toBe(375_000); // 2.5 percent of 150,000 naira
    expect(() => releaseMilestone(released, "deposit")).toThrow(
      /already released/,
    );
  });

  it("refuses payment beyond the order total", () => {
    const paid = recordPayment(order(), 400_000_00);
    expect(() => recordPayment(paid, 200_000_00)).toThrow(/exceeds/);
  });

  it("releases everything and reports the seller net of fee", () => {
    let s = recordPayment(order(), 500_000_00);
    s = releaseMilestone(s, "deposit");
    s = releaseMilestone(s, "delivery");
    expect(s.status).toBe("released");
    const summary = summarise(s);
    expect(summary.platformFee).toBe(1_250_000);
    expect(summary.sellerNet).toBe(500_000_00 - 1_250_000);
    expect(summary.inEscrow).toBe(0);
    expect(summary.fullySettled).toBe(true);
  });

  it("refunds only money still held, leaving released funds alone", () => {
    let s = recordPayment(order(), 500_000_00);
    s = releaseMilestone(s, "deposit");
    expect(() => refund(s, 400_000_00)).toThrow(/exceeds/);
    s = refund(s, 350_000_00);
    expect(s.status).toBe("refunded");
    expect(summarise(s).inEscrow).toBe(0);
    expect(s.releasedToSeller).toBe(150_000_00);
  });

  it("freezes releases while a dispute is open, then resumes", () => {
    const disputed = openDispute(recordPayment(order(), 500_000_00));
    expect(() => releaseMilestone(disputed, "deposit")).toThrow(/disputed/);
    const resolved = resolveDispute(disputed);
    expect(resolved.status).toBe("funds_held");
    expect(() => releaseMilestone(resolved, "deposit")).not.toThrow();
  });

  it("cannot take payment or release after a full refund", () => {
    const refunded = refund(recordPayment(order(), 500_000_00), 500_000_00);
    expect(() => recordPayment(refunded, 100_00)).toThrow(/refunded/);
    expect(() => releaseMilestone(refunded, "deposit")).toThrow(/refunded/);
  });
});
