/**
 * Client-facing money documents.
 *
 * Three things a contractor hands over or sends: a numbered receipt for money
 * received, a records pack that shows a job's whole money trail, and a one-line
 * statement a client can read on a phone. All three are built here as strings
 * so they can be tested, and every value that comes from a record is escaped
 * before it reaches the markup.
 */

import type { LedgerSummary } from "@/lib/project-ledger";
import type { CsvColumn } from "@/lib/export-utils";
import { buildReceiptDocument } from "@/lib/estimation/receipt-document";

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (amount: number, currency: string): string => {
  const formatted = new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
  return `${currency} ${formatted}`;
};

const dateLabel = (iso: string): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return escapeHtml(iso);
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export interface ReceiptInput {
  projectName: string;
  clientName?: string | null;
  receiptNo: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  paidAt: string;
  invoiceNumber?: string | null;
  balanceAfter?: number | null;
  businessName?: string | null;
}

/** Layout niceties only: colours, type and the header come from the shell. */
const RECEIPT_EXTRA_CSS = `
  .invoice{max-width:420px;padding:28px 26px}
  .pay-amount{font-size:30px;font-weight:800;margin:0 0 10px;color:#0f172a}
  dl.pay{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:13px}
  dl.pay dt{color:#64748b}
  dl.pay dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
`;

export function buildReceiptHtml(input: ReceiptInput): string {
  const rows: [string, string][] = [
    ["Project", escapeHtml(input.projectName)],
    ["Client", escapeHtml(input.clientName || "Not recorded")],
    ["Received", dateLabel(input.paidAt)],
    ["Method", escapeHtml(input.method)],
    ["Reference", escapeHtml(input.reference || "Not recorded")],
    ["Invoice", escapeHtml(input.invoiceNumber || "Against account")],
  ];

  if (typeof input.balanceAfter === "number") {
    rows.push([
      "Balance after this payment",
      money(input.balanceAfter, input.currency),
    ]);
  }

  const bodyHtml = `<h2>Payment received</h2>
  <p class="pay-amount">${money(input.amount, input.currency)}</p>
  <dl class="pay">
    ${rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("\n    ")}
  </dl>`;

  return buildReceiptDocument({
    title: `Receipt ${input.receiptNo}`,
    subtitle: `Issued from the project record on ${new Date().toLocaleDateString("en-GB")}`,
    reference: input.receiptNo,
    bodyHtml,
    extraCss: RECEIPT_EXTRA_CSS,
    footer:
      "Figures reflect the payments recorded against this project. Keep this receipt for your records.",
    branding: input.businessName
      ? { brandName: input.businessName }
      : undefined,
  });
}

export interface RecordsPackInput {
  projectName: string;
  clientName?: string | null;
  currency: string;
  summary: LedgerSummary;
  invoices: {
    number: string;
    issued_at: string;
    due_at?: string | null;
    total: number;
    status: string;
  }[];
  payments: {
    receipt_no: string;
    paid_at: string;
    amount: number;
    method: string;
    reference?: string | null;
  }[];
  expenses: {
    spent_at: string;
    category: string;
    name: string;
    amount: number;
    receipt_name?: string | null;
  }[];
}

const PACK_EXTRA_CSS = `
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 8px}
  .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#fff}
  .card span{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b}
  .card strong{font-size:16px;font-variant-numeric:tabular-nums;color:#0f172a}
  @media (max-width:560px){.cards{grid-template-columns:repeat(2,1fr)}}
`;

export function buildRecordsPackHtml(input: RecordsPackInput): string {
  const s = input.summary;
  const cards: [string, string][] = [
    ["Billed", money(s.invoicedTotal, input.currency)],
    ["Received", money(s.paidTotal, input.currency)],
    ["Outstanding", money(s.outstandingTotal, input.currency)],
    ["Spent", money(s.expenseTotal, input.currency)],
  ];

  const invoiceRows = input.invoices
    .map(
      (
        invoice,
      ) => `<tr><td>${escapeHtml(invoice.number)}</td><td>${dateLabel(invoice.issued_at)}</td>
        <td>${invoice.due_at ? dateLabel(invoice.due_at) : "None"}</td>
        <td class="n">${money(invoice.total, input.currency)}</td><td>${escapeHtml(invoice.status)}</td></tr>`,
    )
    .join("\n");

  const paymentRows = input.payments
    .map(
      (
        payment,
      ) => `<tr><td>${escapeHtml(payment.receipt_no)}</td><td>${dateLabel(payment.paid_at)}</td>
        <td>${escapeHtml(payment.method)}</td><td>${escapeHtml(payment.reference || "None")}</td>
        <td class="n">${money(payment.amount, input.currency)}</td></tr>`,
    )
    .join("\n");

  const expenseRows = input.expenses
    .map(
      (
        expense,
      ) => `<tr><td>${dateLabel(expense.spent_at)}</td><td>${escapeHtml(expense.category)}</td>
        <td>${escapeHtml(expense.name)}</td><td>${escapeHtml(expense.receipt_name || "No proof")}</td>
        <td class="n">${money(expense.amount, input.currency)}</td></tr>`,
    )
    .join("\n");

  const empty = (label: string) =>
    `<tr><td colspan="5">No ${label} recorded.</td></tr>`;

  const bodyHtml = `<div class="cards">
    ${cards.map(([label, value]) => `<div class="card"><span>${label}</span><strong>${value}</strong></div>`).join("")}
  </div>
  <h2>Invoices</h2>
  <table><thead><tr><th>Number</th><th>Issued</th><th>Due</th><th class="n">Total</th><th>Status</th></tr></thead>
  <tbody>${invoiceRows || empty("invoices")}</tbody></table>
  <h2>Payments received</h2>
  <table><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Reference</th><th class="n">Amount</th></tr></thead>
  <tbody>${paymentRows || empty("payments")}</tbody></table>
  <h2>Spend and proof</h2>
  <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Proof</th><th class="n">Amount</th></tr></thead>
  <tbody>${expenseRows || empty("expenses")}</tbody></table>
  <div class="notes-box"><h3>Reading this pack</h3>
    Billed less spend: ${money(s.projectedMargin, input.currency)}. Cash received less spend: ${money(s.cashPosition, input.currency)}.
    ${s.expensesMissingReceipt > 0 ? `${s.expensesMissingReceipt} expense(s) have no proof attached.` : "Every expense has proof attached."}
  </div>`;

  return buildReceiptDocument({
    title: `${input.projectName} records`,
    subtitle: `Client: ${input.clientName || "Not recorded"} · Currency: ${input.currency} · Prepared ${new Date().toLocaleDateString("en-GB")}`,
    bodyHtml,
    extraCss: PACK_EXTRA_CSS,
    footer:
      "Generated from recorded invoices, payments and expenses; no figure is estimated.",
  });
}

/** One row per money event, in date order, for spreadsheet review. */
export function ledgerCsvRows(input: {
  currency: string;
  invoices: { number: string; issued_at: string; total: number }[];
  payments: {
    receipt_no: string;
    paid_at: string;
    amount: number;
    method: string;
    reference?: string | null;
  }[];
  expenses: {
    spent_at: string;
    category: string;
    name: string;
    amount: number;
  }[];
}): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const invoice of input.invoices) {
    rows.push({
      date: invoice.issued_at,
      type: "Invoice",
      reference: invoice.number,
      description: "Client invoice issued",
      debit: invoice.total,
      credit: 0,
      currency: input.currency,
    });
  }
  for (const payment of input.payments) {
    rows.push({
      date: payment.paid_at,
      type: "Payment",
      reference: payment.receipt_no,
      description: `${payment.method}${payment.reference ? ` ${payment.reference}` : ""}`,
      debit: 0,
      credit: payment.amount,
      currency: input.currency,
    });
  }
  for (const expense of input.expenses) {
    rows.push({
      date: expense.spent_at,
      type: "Expense",
      reference: expense.category,
      description: expense.name,
      debit: 0,
      credit: 0,
      currency: input.currency,
      spend: expense.amount,
    });
  }

  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export const LEDGER_CSV_COLUMNS: CsvColumn[] = [
  { header: "Date", key: "date" },
  { header: "Type", key: "type" },
  { header: "Reference", key: "reference" },
  { header: "Description", key: "description" },
  { header: "Billed", key: "debit" },
  { header: "Received", key: "credit" },
  { header: "Spent", key: "spend" },
  { header: "Currency", key: "currency" },
];

/** Short statement a client can read in a chat message. */
export function buildStatementText(input: {
  projectName: string;
  clientName?: string | null;
  summary: LedgerSummary;
  nextDueAt?: string | null;
}): string {
  const s = input.summary;
  const currency = s.currency || "";
  const lines = [
    `${input.projectName}: account statement`,
    `Billed: ${money(s.invoicedTotal, currency)}`,
    `Received: ${money(s.paidTotal, currency)}`,
    `Outstanding: ${money(s.outstandingTotal, currency)}`,
  ];
  if (s.overdueTotal > 0)
    lines.push(`Of which overdue: ${money(s.overdueTotal, currency)}`);
  if (s.credit > 0)
    lines.push(`Credit on account: ${money(s.credit, currency)}`);
  if (input.nextDueAt) lines.push(`Next due: ${dateLabel(input.nextDueAt)}`);
  lines.push("Prepared from recorded invoices and payments.");
  return lines.join("\n");
}
