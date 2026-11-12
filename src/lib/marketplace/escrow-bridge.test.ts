import { describe, it, expect } from "vitest";
import { summariseOrderPayments } from "./escrow-bridge";

describe("order payment trail", () => {
  it("counts only completed payments in the paid total", () => {
    const summary = summariseOrderPayments([
      {
        id: "p1",
        amount: 250000,
        currency: "NGN",
        status: "completed",
        provider: "paystack",
        provider_ref: "TRX-1",
        created_at: "2026-11-12T09:00:00.000Z",
      },
      {
        id: "p2",
        amount: 100000,
        currency: "NGN",
        status: "pending",
        provider: "paystack",
        provider_ref: null,
        created_at: "2026-11-12T10:00:00.000Z",
      },
      {
        id: "p3",
        amount: 50000,
        currency: "NGN",
        status: "failed",
        created_at: "2026-11-12T11:00:00.000Z",
      },
    ]);

    expect(summary.rows).toHaveLength(3);
    expect(summary.totalPaid).toBe(250000);
    expect(summary.lastPaidAt).toBe("2026-11-12T09:00:00.000Z");
  });

  it("reports nothing paid when no payment completed", () => {
    const summary = summariseOrderPayments([
      { id: "p1", amount: 75000, status: "pending" },
    ]);
    expect(summary.totalPaid).toBe(0);
    expect(summary.lastPaidAt).toBeNull();
  });

  it("handles an order with no payments yet", () => {
    expect(summariseOrderPayments([])).toEqual({
      rows: [],
      totalPaid: 0,
      lastPaidAt: null,
    });
  });
});
