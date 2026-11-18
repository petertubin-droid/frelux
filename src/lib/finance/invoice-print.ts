/**
 * Printable invoice, in the FRELUX receipt house style.
 *
 * Pure HTML generation (no window access) so the figures, escaping and
 * layout are testable. The caller supplies the money formatter and labels, so
 * the invoice keeps the visitor's language and the invoice's own currency
 * rather than a silent NGN default.
 */

import type {
  DerivedInvoiceStatus,
  InvoiceRecord,
} from "@/lib/finance/invoice-engine";
import {
  buildReceiptDocument,
  escapeHtml,
  receiptKeyValues,
  receiptNote,
  receiptTotals,
} from "@/lib/estimation/receipt-document";

export interface InvoicePrintInput {
  invoice: InvoiceRecord;
  paidTotal: number;
  derivedStatusLabel: string;
  derivedStatus?: DerivedInvoiceStatus;
  /** Formats an amount in the invoice's currency. */
  money: (amount: number, currency: string) => string;
  /** UI-language labels; English defaults keep tests and fallbacks readable. */
  labels?: Partial<{
    description: string;
    qty: string;
    unit: string;
    unitCost: string;
    total: string;
  }>;
}

export function buildInvoiceHtml(input: InvoicePrintInput): string {
  const { invoice: inv, money } = input;
  const L = {
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    unitCost: "Unit cost",
    total: "Total",
    ...input.labels,
  };

  const rows = inv.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.description)}</td><td class="n">${escapeHtml(String(it.quantity))}</td><td>${escapeHtml(it.unit)}</td><td class="n">${escapeHtml(money(it.unit_cost, inv.currency))}</td><td class="n">${escapeHtml(money(it.total, inv.currency))}</td></tr>`,
    )
    .join("");

  const totals: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: "Subtotal", value: money(inv.totals.subtotal, inv.currency) },
  ];
  if (inv.totals.vat_amount != null && inv.totals.vat_rate != null) {
    totals.push({
      label: `${inv.tax_label ?? "Tax"} (${inv.totals.vat_rate}%)`,
      value: money(inv.totals.vat_amount, inv.currency),
    });
  }
  totals.push({
    label: "Grand total",
    value: money(inv.totals.grand_total, inv.currency),
    strong: true,
  });
  totals.push({
    label: `Paid to date · ${input.derivedStatusLabel}`,
    value: money(input.paidTotal, inv.currency),
  });

  const meta = receiptKeyValues([
    ["Client", inv.client_name],
    ["Contact", inv.client_contact ?? ""],
    ["Project", inv.title],
    ["Location", inv.project_location ?? ""],
    ["Issued", inv.issue_date],
    ["Due", inv.due_date ?? "—"],
  ]);

  const bodyHtml = `<h2>Invoice</h2>${meta}
    <h2>Items</h2>
    <table>
      <thead><tr><th>${escapeHtml(L.description)}</th><th class="n">${escapeHtml(L.qty)}</th><th>${escapeHtml(L.unit)}</th><th class="n">${escapeHtml(L.unitCost)}</th><th class="n">${escapeHtml(L.total)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Totals</h2>${receiptTotals(totals)}
    ${inv.notes ? receiptNote("Notes", [inv.notes]) : ""}`;

  return buildReceiptDocument({
    title: `Invoice ${inv.invoice_ref}`,
    subtitle: inv.title,
    reference: inv.invoice_ref,
    dateLabel: inv.issue_date,
    bodyHtml,
    footer: "Paid and overdue status come from recorded payments only.",
  });
}
