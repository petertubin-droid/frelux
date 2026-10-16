/**
 * Invoice engine (Wave 1.3 — Click-to-Invoice)
 *
 * Pure, deterministic invoice logic. The law of this module:
 *  - an invoice is a SNAPSHOT: items/totals are copied verbatim from
 *    the quotation at creation and never re-derived;
 *  - "paid" and "overdue" are DERIVED from recorded payments and the
 *    due date — never stored, never assumed. No payment records means
 *    not paid, full stop;
 *  - currency travels with the invoice (XXX when unknown), never a
 *    silent NGN default;
 *  - the tax line uses the market's own naming (VAT/MwSt/GST/IVA/…),
 *    presentation only — rates come from the quote snapshot.
 */

export interface InvoiceSnapshotItem {
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total: number;
}

export interface InvoiceSnapshotTotals {
  subtotal: number;
  contingency_rate?: number;
  contingency_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  grand_total: number;
}

export interface InvoiceRecord {
  id: string;
  invoice_ref: string;
  source_quote_id: string | null;
  project_id: string | null;
  title: string;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_address: string | null;
  project_location: string | null;
  currency: string;
  /** Stored status: owner actions only. */
  status: "draft" | "issued" | "cancelled" | string;
  items: InvoiceSnapshotItem[];
  totals: InvoiceSnapshotTotals;
  tax_label: string | null;
  issue_date: string;
  due_date: string | null;
  payment_terms_days: number;
  notes: string | null;
  created_at: string;
}

export interface InvoicePaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  method: "cash" | "transfer" | "card" | "cheque" | "other" | string;
  paid_at: string;
  reference: string | null;
}

/** Derived status: the honest full picture, computed at read time. */
export type DerivedInvoiceStatus =
  | "draft"
  | "issued"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export const PAYMENT_METHODS = [
  "cash",
  "transfer",
  "card",
  "cheque",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Deterministic sequential reference: INV-YYYY-0001.
 * Zero-padded to at least 4 digits; longer sequences grow naturally.
 */
export function nextInvoiceRef(lastNumber: number, year: number): string {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) {
    throw new Error(`Invalid invoice sequence: ${lastNumber}`);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error(`Invalid invoice year: ${year}`);
  }
  const next = lastNumber + 1;
  return `INV-${year}-${String(next).padStart(4, "0")}`;
}

/** Due date = issue date + terms (ISO date string, no time games). */
export function computeDueDate(
  issueDate: string,
  termsDays: number,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    throw new Error(`Invalid issue date: ${issueDate}`);
  }
  if (!Number.isInteger(termsDays) || termsDays < 0) {
    throw new Error(`Invalid payment terms: ${termsDays}`);
  }
  const d = new Date(`${issueDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + termsDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Derive the display status. Only recorded evidence counts:
 *  - cancelled/draft are owner states and pass through;
 *  - paid requires payments to cover the grand total;
 *  - partially_paid means some (but not all) money is recorded;
 *  - overdue is past due and not fully paid (even if partially paid).
 */
export function deriveInvoiceStatus(
  invoice: Pick<InvoiceRecord, "status" | "due_date">,
  paidTotal: number,
  now: Date = new Date(),
): DerivedInvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled";
  if (invoice.status === "draft") return "draft";

  const grandTotal = Number(paidTotal);
  if (!Number.isFinite(grandTotal) || paidTotal < 0) {
    throw new Error(`Invalid paid total: ${paidTotal}`);
  }

  // issued path
  const isPastDue =
    invoice.due_date !== null &&
    invoice.due_date !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(invoice.due_date) &&
    new Date(`${invoice.due_date}T00:00:00Z`).getTime() <
      new Date(
        `${now.toISOString().slice(0, 10)}T00:00:00Z`,
      ).getTime();

  if (isPastDue) {
    return paidTotal > 0 ? "partially_paid" : "overdue";
  }
  return paidTotal > 0 ? "partially_paid" : "issued";
}

/** Paid only when recorded payments cover the grand total. */
export function isInvoicePaid(
  totals: Pick<InvoiceSnapshotTotals, "grand_total">,
  paidTotal: number,
): boolean {
  return paidTotal >= totals.grand_total - 1e-9;
}

/** Sum payments; refuses negative/NaN amounts defensively. */
export function sumPayments(
  payments: Pick<InvoicePaymentRecord, "amount">[],
): number {
  let total = 0;
  for (const p of payments) {
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    total += amount;
  }
  return Math.round(total * 100) / 100;
}

export interface QuoteToInvoiceSource {
  quote_ref: string;
  title: string;
  client_name: string;
  client_contact?: string | null;
  project_location?: string | null;
  currency: string;
  items: InvoiceSnapshotItem[];
  totals: InvoiceSnapshotTotals;
}

export interface InvoiceDraft {
  invoice_ref: string;
  title: string;
  client_name: string;
  client_contact: string | null;
  project_location: string | null;
  currency: string;
  items: InvoiceSnapshotItem[];
  totals: InvoiceSnapshotTotals;
  tax_label: string | null;
  issue_date: string;
  due_date: string;
  payment_terms_days: number;
  notes: string | null;
}

/**
 * Snapshot a quotation into a draft invoice. Items/totals are copied
 * verbatim (structural clone so later quote edits can never leak in).
 * The tax label is presentation only and passed in by the caller
 * from the market's boq-tax-label resolution.
 */
export function invoiceFromQuote(
  source: QuoteToInvoiceSource,
  opts: {
    /** The reserved sequential reference, e.g. from nextInvoiceRef. */
    invoiceRef: string;
    taxLabel: string | null;
    issueDate?: string;
    termsDays?: number;
    notes?: string | null;
  },
): InvoiceDraft {
  if (!source.items || source.items.length === 0) {
    throw new Error("Refusing to invoice a quotation with no line items");
  }
  if (!source.totals || typeof source.totals.grand_total !== "number") {
    throw new Error("Refusing to invoice without a grand total");
  }
  const termsDays = opts.termsDays ?? DEFAULT_PAYMENT_TERMS_DAYS;
  const issueDate = opts.issueDate ?? new Date().toISOString().slice(0, 10);
  const currency = source.currency || "XXX";
  return {
    invoice_ref: opts.invoiceRef,
    title: `Invoice for ${source.title}`,
    client_name: source.client_name,
    client_contact: source.client_contact ?? null,
    project_location: source.project_location ?? null,
    currency,
    items: structuredClone(source.items),
    totals: structuredClone(source.totals),
    tax_label: opts.taxLabel ?? null,
    issue_date: issueDate,
    due_date: computeDueDate(issueDate, termsDays),
    payment_terms_days: termsDays,
    notes: opts.notes ?? `Source quotation: ${source.quote_ref}`,
  };
}

export const DERIVED_STATUS_LABELS: Record<DerivedInvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  overdue: "Overdue",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
};
