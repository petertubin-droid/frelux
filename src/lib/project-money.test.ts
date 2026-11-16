import { describe, expect, it } from "vitest";
import {
  checkInvoiceFigures,
  checkPaymentLink,
  roundMoney,
} from "@/lib/project-money";
import { invoiceTotals } from "@/lib/project-money";
import { roundSignificant, roundTo } from "@/lib/money/round";

describe("invoice arithmetic", () => {
  it("adds a percentage tax to the subtotal", () => {
    expect(invoiceTotals(450000, 7.5)).toEqual({
      subtotal: 450000,
      taxRate: 7.5,
      taxAmount: 33750,
      total: 483750,
    });
  });

  it("rounds the tax to two places and totals from the rounded tax", () => {
    const totals = invoiceTotals(12345.67, 7.5);
    expect(totals.taxAmount).toBe(925.93);
    expect(totals.total).toBe(13271.6);
    expect(roundMoney(totals.subtotal + totals.taxAmount)).toBe(totals.total);
  });

  it("leaves the total at the subtotal when no rate applies", () => {
    expect(invoiceTotals(90000, 0)).toEqual({
      subtotal: 90000,
      taxRate: 0,
      taxAmount: 0,
      total: 90000,
    });
  });

  it("refuses negative or non finite inputs instead of producing a negative bill", () => {
    expect(invoiceTotals(-500, 7.5).total).toBe(0);
    expect(invoiceTotals(Number.NaN, 7.5).total).toBe(0);
    expect(invoiceTotals(1000, Number.POSITIVE_INFINITY).taxAmount).toBe(0);
  });
});

describe("cent rounding", () => {
  it("rounds a half cent to the cent the reader typed", () => {
    // 8.165 and 10.075 scale to 816.4999 and 1007.4999 in binary, which the old
    // EPSILON repair left short of the half cent.
    expect(roundMoney(8.165)).toBe(8.17);
    expect(roundMoney(10.075)).toBe(10.08);
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it("rounds a half cent away from zero on both sides", () => {
    expect(roundMoney(-8.165)).toBe(-8.17);
    expect(roundMoney(-1.004)).toBe(-1);
  });

  it("leaves amounts that are already cents alone", () => {
    expect(roundMoney(1.004)).toBe(1);
    expect(roundMoney(1234.56)).toBe(1234.56);
    expect(roundMoney(0)).toBe(0);
  });
});

describe("invoice figure consistency", () => {
  it("accepts a total that is subtotal plus tax", () => {
    expect(
      checkInvoiceFigures({ subtotal: 1000, tax_amount: 75, total: 1075 }),
    ).toEqual({ ok: true, message: null });
  });

  it("rejects a total that is not the sum of the other two", () => {
    const result = checkInvoiceFigures({
      subtotal: 1000,
      tax_amount: 75,
      total: 1000,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not subtotal plus tax");
  });

  it("rejects a negative or unreadable figure", () => {
    expect(
      checkInvoiceFigures({ subtotal: -1, tax_amount: 0, total: -1 }).message,
    ).toContain("cannot be negative");
    expect(
      checkInvoiceFigures({ subtotal: NaN, tax_amount: 0, total: 0 }).message,
    ).toContain("must be a number");
  });
});

describe("payment link", () => {
  const link = (over: Partial<Parameters<typeof checkPaymentLink>[0]> = {}) =>
    checkPaymentLink({
      projectId: "p1",
      paymentCurrency: "NGN",
      invoice: { project_id: "p1", currency: "NGN" },
      ...over,
    });

  it("accepts an invoice of the same project and currency", () => {
    expect(link().ok).toBe(true);
  });

  it("refuses an invoice from another project", () => {
    const result = link({ invoice: { project_id: "p2", currency: "NGN" } });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("another project");
  });

  it("refuses a payment in a different currency", () => {
    const result = link({ paymentCurrency: "USD" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("USD");
  });

  it("refuses an invoice that does not exist", () => {
    expect(link({ invoice: null }).ok).toBe(false);
  });
});

describe("shared rounding at any precision", () => {
  it("rounds a lost half up at two decimals", () => {
    expect(roundTo(8.165, 2)).toBe(8.17);
    expect(roundTo(10.075, 2)).toBe(10.08);
    expect(roundTo(8.164, 2)).toBe(8.16);
  });

  it("keeps significant digits on a small rate", () => {
    expect(roundTo(0.0000634, 8)).toBe(0.0000634);
    expect(roundSignificant(0.0000634, 8)).toBe(0.0000634);
    expect(roundSignificant(1.2345678901234, 12)).toBe(1.23456789012);
  });
});
