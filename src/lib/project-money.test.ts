import { describe, expect, it } from "vitest";
import { invoiceTotals, roundMoney } from "@/lib/project-money";

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
