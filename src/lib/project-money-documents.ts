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

const RECEIPT_STYLES = `
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:24px;color:#14121a;background:#fff}
  .sheet{max-width:420px;margin:0 auto}
  .brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #6d28d9;padding-bottom:10px}
  .brand h1{font-size:15px;margin:0;letter-spacing:.08em;text-transform:uppercase}
  .brand span{font-size:11px;color:#6b6478}
  h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b6478;margin:22px 0 10px}
  .amount{font-size:30px;font-weight:700;margin:0 0 4px}
  dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:13px}
  dt{color:#6b6478}
  dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
  .foot{margin-top:22px;border-top:1px solid #e4e0ea;padding-top:10px;font-size:11px;color:#6b6478;line-height:1.5}
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

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>Receipt ${escapeHtml(input.receiptNo)}</title>
<style>${RECEIPT_STYLES}</style></head>
<body><div class="sheet">
  <div class="brand">
    <h1>${escapeHtml(input.businessName || "FRELUX")}</h1>
    <span>Receipt ${escapeHtml(input.receiptNo)}</span>
  </div>
  <h2>Payment received</h2>
  <p class="amount">${money(input.amount, input.currency)}</p>
  <dl>
    ${rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("\n    ")}
  </dl>
  <div class="foot">
    Issued from the project record on ${escapeHtml(new Date().toLocaleDateString("en-GB"))}.
    Figures reflect the payments recorded against this project. Keep this receipt for your records.
  </div>
</div></body></html>`;
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

const PACK_STYLES = `
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:32px;color:#14121a;background:#fff}
  h1{font-size:20px;margin:0 0 2px}
  .meta{font-size:12px;color:#6b6478;margin-bottom:22px}
  h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6b6478;margin:26px 0 8px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 8px}
  .card{border:1px solid #e4e0ea;border-radius:10px;padding:10px 12px}
  .card span{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b6478}
  .card strong{font-size:16px;font-variant-numeric:tabular-nums}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;color:#6b6478;font-weight:600;border-bottom:1px solid #e4e0ea;padding:6px 4px}
  td{border-bottom:1px solid #f1eef5;padding:6px 4px;font-variant-numeric:tabular-nums}
  td.n{text-align:right}
  .foot{margin-top:24px;font-size:11px;color:#6b6478;line-height:1.5;border-top:1px solid #e4e0ea;padding-top:10px}
  @media print{body{padding:16px}}
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

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(input.projectName)} records</title>
<style>${PACK_STYLES}</style></head>
<body>
  <h1>${escapeHtml(input.projectName)}</h1>
  <div class="meta">Client: ${escapeHtml(input.clientName || "Not recorded")} &middot; Currency: ${escapeHtml(input.currency)} &middot; Prepared ${escapeHtml(new Date().toLocaleDateString("en-GB"))}</div>
  <div class="cards">
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
  <div class="foot">
    Billed less spend: ${money(s.projectedMargin, input.currency)}. Cash received less spend: ${money(s.cashPosition, input.currency)}.
    ${s.expensesMissingReceipt > 0 ? `${s.expensesMissingReceipt} expense(s) have no proof attached.` : "Every expense has proof attached."}
    Generated from recorded invoices, payments and expenses; no figure is estimated.
  </div>
</body></html>`;
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
