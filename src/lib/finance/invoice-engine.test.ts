/**
 * Invoice engine tests (Wave 1.3 — Click-to-Invoice)
 *
 * Pins the honesty laws:
 *  - paid/overdue are DERIVED from recorded payments + due date, never
 *    stored or assumed; no payments = not paid;
 *  - the quotation snapshot is copied verbatim (later quote edits
 *    cannot leak into an issued invoice);
 *  - sequential refs are deterministic and validated;
 *  - currency is never silently defaulted to NGN.
 */

import { describe, it, expect } from "vitest";
import {
  computeDueDate,
  deriveInvoiceStatus,
  invoiceFromQuote,
  isInvoicePaid,
  nextInvoiceRef,
  sumPayments,
  type QuoteToInvoiceSource,
} from "./invoice-engine";

const quote: QuoteToInvoiceSource = {
  quote_ref: "BOQ-AB12CD",
  title: "3-bedroom bungalow finishing",
  client_name: "Mrs Adebayo",
  client_contact: "+2348000000000",
  project_location: "Lekki, Lagos",
  currency: "NGN",
  items: [
    { description: "Cement (50kg)", quantity: 120, unit: "bags", unit_cost: 9500, total: 1140000 },
    { description: "Plastering sand", quantity: 10, unit: "trips", unit_cost: 45000, total: 450000 },
  ],
  totals: { subtotal: 1590000, vat_rate: 7.5, vat_amount: 119250, grand_total: 1709250 },
};

describe("nextInvoiceRef", () => {
  it("formats sequential refs deterministically", () => {
    expect(nextInvoiceRef(0, 2026)).toBe("INV-2026-0001");
    expect(nextInvoiceRef(41, 2026)).toBe("INV-2026-0042");
    expect(nextInvoiceRef(9999, 2026)).toBe("INV-2026-10000");
  });

  it("refuses invalid sequence or year", () => {
    expect(() => nextInvoiceRef(-1, 2026)).toThrow();
    expect(() => nextInvoiceRef(1.5, 2026)).toThrow();
    expect(() => nextInvoiceRef(1, 1999)).toThrow();
  });
});

describe("computeDueDate", () => {
  it("adds terms in whole days across month ends", () => {
    expect(computeDueDate("2026-01-31", 30)).toBe("2026-03-02");
    expect(computeDueDate("2026-02-28", 1)).toBe("2026-03-01");
    expect(computeDueDate("2026-10-16", 0)).toBe("2026-10-16");
  });

  it("refuses malformed dates", () => {
    expect(() => computeDueDate("16/10/2026", 30)).toThrow();
    expect(() => computeDueDate("2026-10-16", -5)).toThrow();
  });
});

describe("deriveInvoiceStatus", () => {
  const now = new Date("2026-11-15T10:00:00Z");
  const futureDue = { status: "issued" as const, due_date: "2026-12-01" };
  const pastDue = { status: "issued" as const, due_date: "2026-11-01" };

  it("draft and cancelled pass through regardless of payments", () => {
    expect(deriveInvoiceStatus({ status: "draft", due_date: null }, 0, now)).toBe("draft");
    expect(deriveInvoiceStatus({ status: "cancelled", due_date: "2026-11-01" }, 999999, now)).toBe("cancelled");
  });

  it("issued with no payments is issued, then overdue after the due date", () => {
    expect(deriveInvoiceStatus(futureDue, 0, now)).toBe("issued");
    expect(deriveInvoiceStatus(pastDue, 0, now)).toBe("overdue");
  });

  it("partial payments never claim paid", () => {
    expect(deriveInvoiceStatus(futureDue, 100, now)).toBe("partially_paid");
    expect(deriveInvoiceStatus(pastDue, 100, now)).toBe("partially_paid");
  });

  it("due-date comparison is date-based, not time-of-day", () => {
    const dueToday = { status: "issued" as const, due_date: "2026-11-15" };
    expect(deriveInvoiceStatus(dueToday, 0, now)).toBe("issued");
  });

  it("refuses invalid paid totals", () => {
    expect(() => deriveInvoiceStatus(futureDue, -5, now)).toThrow();
    expect(() => deriveInvoiceStatus(futureDue, Number.NaN, now)).toThrow();
  });
});

describe("isInvoicePaid + sumPayments", () => {
  it("paid only when payments cover the grand total", () => {
    expect(isInvoicePaid({ grand_total: 1709250 }, 1709250)).toBe(true);
    expect(isInvoicePaid({ grand_total: 1709250 }, 1709249)).toBe(false);
  });

  it("sums only positive finite amounts, rounding to cents", () => {
    expect(sumPayments([{ amount: 10.005 }, { amount: 20.004 }])).toBe(30.01);
    expect(sumPayments([{ amount: -5 }, { amount: Number.NaN }, { amount: 100 }])).toBe(100);
  });
});

describe("invoiceFromQuote", () => {
  it("snapshots the quote verbatim with client and tax blocks", () => {
    const draft = invoiceFromQuote(quote, {
      invoiceRef: "INV-2026-0001",
      taxLabel: "VAT",
      issueDate: "2026-10-16",
      termsDays: 30,
    });
    expect(draft.invoice_ref).toBe("INV-2026-0001");
    expect(draft.title).toBe("Invoice for 3-bedroom bungalow finishing");
    expect(draft.client_name).toBe("Mrs Adebayo");
    expect(draft.currency).toBe("NGN");
    expect(draft.tax_label).toBe("VAT");
    expect(draft.issue_date).toBe("2026-10-16");
    expect(draft.due_date).toBe("2026-11-15");
    expect(draft.items).toEqual(quote.items);
    expect(draft.totals).toEqual(quote.totals);
    expect(draft.notes).toContain("BOQ-AB12CD");
  });

  it("deep-copies the snapshot so later quote edits cannot leak in", () => {
    const draft = invoiceFromQuote(quote, {
      invoiceRef: "INV-2026-0002",
      taxLabel: "VAT",
    });
    draft.items[0].description = "tampered";
    draft.totals.grand_total = 1;
    expect(quote.items[0].description).toBe("Cement (50kg)");
    expect(quote.totals.grand_total).toBe(1709250);
  });

  it("defaults unknown currency to XXX, never NGN", () => {
    const draft = invoiceFromQuote({ ...quote, currency: "" }, {
      invoiceRef: "INV-2026-0003",
      taxLabel: null,
    });
    expect(draft.currency).toBe("XXX");
    expect(draft.tax_label).toBeNull();
  });

  it("refuses to invoice empty or total-less quotes", () => {
    expect(() =>
      invoiceFromQuote({ ...quote, items: [] }, { invoiceRef: "X", taxLabel: null }),
    ).toThrow(/no line items/i);
    expect(() =>
      invoiceFromQuote({ ...quote, totals: undefined as never }, { invoiceRef: "X", taxLabel: null }),
    ).toThrow(/grand total/i);
  });
});
