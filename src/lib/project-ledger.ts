/**
 * Project money ledger.
 *
 * Buildam's back office answers three questions a contractor asks on site:
 * what have I billed, what have I been paid, and what is still owed. This
 * module answers them from records rather than from typed totals, so every
 * figure on screen traces back to an invoice row or a payment row.
 *
 * Rules the engine enforces:
 * - A draft or void invoice is not a bill: it never enters the invoiced total
 *   and never receives payment allocation.
 * - A payment tied to an invoice settles that invoice. Money beyond its total
 *   is credit on the account, never moved onto a bill the client did not pay.
 * - A payment with no invoice reference is allocated oldest first, which is
 *   how part payments actually arrive in practice.
 * - Nothing is summed across currencies. A mismatch is reported, never
 *   silently added, because 500 USD plus 500 GBP is not 1000 of anything.
 */

export type InvoiceStatus = "unpaid" | "part_paid" | "paid" | "overdue";

export interface LedgerInvoice {
  id: string;
  number: string;
  issued_at: string;
  due_at?: string | null;
  currency: string;
  total: number;
  status: string;
}

export interface LedgerPayment {
  id: string;
  invoice_id?: string | null;
  amount: number;
  currency: string;
  paid_at: string;
}

export interface InvoiceBalance {
  id: string;
  number: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  dueAt: string | null;
  daysOverdue: number;
}

export interface LedgerSummary {
  currency: string | null;
  invoicedTotal: number;
  paidTotal: number;
  outstandingTotal: number;
  overdueTotal: number;
  credit: number;
  invoices: InvoiceBalance[];
  expenseTotal: number;
  expensesWithReceipts: number;
  expensesMissingReceipt: number;
  /** Billed value less recorded spend. */
  projectedMargin: number;
  /** Cash received less recorded spend. */
  cashPosition: number;
  /** Cash received as a share of billed value, 0 to 100, null when nothing is billed. */
  collectionRate: number | null;
  /** Set when rows carry another currency and totals could not include them. */
  currencyMismatch: { currencies: string[]; ignoredRows: number } | null;
}

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const EPSILON = 0.004;
const dayMs = 24 * 60 * 60 * 1000;

/** Days between two ISO dates, counting calendar days only. */
export function daysBetween(isoFrom: string, isoTo: string): number {
  const from = Date.parse(isoTo.slice(0, 10));
  const to = Date.parse(isoFrom.slice(0, 10));
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((from - to) / dayMs);
}

function billableInvoices(invoices: LedgerInvoice[]): LedgerInvoice[] {
  return invoices
    .filter(
      (invoice) => invoice.status !== "draft" && invoice.status !== "void",
    )
    .slice()
    .sort((a, b) => {
      const byDate =
        Date.parse(a.issued_at.slice(0, 10)) -
        Date.parse(b.issued_at.slice(0, 10));
      return byDate !== 0 ? byDate : a.number.localeCompare(b.number);
    });
}

interface Allocation {
  invoices: InvoiceBalance[];
  credit: number;
}

/**
 * Distributes payments across invoices and returns per-invoice balances plus
 * any money held on account. The invoice rows read their status from here so
 * the list and the summary can never disagree.
 */
export function allocateWithCredit(
  invoices: LedgerInvoice[],
  payments: LedgerPayment[],
  today: string,
): Allocation {
  const billable = billableInvoices(invoices);
  const paidByInvoice = new Map<string, number>();
  const unallocated: number[] = [];
  let leftover = 0;

  for (const payment of payments) {
    const named = payment.invoice_id
      ? billable.find((invoice) => invoice.id === payment.invoice_id)
      : undefined;

    // Money paid against a draft or void invoice is held on account. It must
    // never be re-pointed at another invoice, which would rewrite history.
    if (payment.invoice_id && !named) {
      leftover = round2(leftover + payment.amount);
      continue;
    }

    if (named) {
      const alreadyPaid = paidByInvoice.get(named.id) ?? 0;
      const open = Math.max(0, round2(named.total - alreadyPaid));
      const applied = Math.min(open, payment.amount);
      paidByInvoice.set(named.id, round2(alreadyPaid + applied));
      leftover = round2(leftover + (payment.amount - applied));
    } else {
      unallocated.push(payment.amount);
    }
  }

  // Oldest invoice first, which is what a client paying off arrears expects.
  for (const amount of unallocated) {
    let remaining = amount;
    for (const invoice of billable) {
      if (remaining <= EPSILON) break;
      const alreadyPaid = paidByInvoice.get(invoice.id) ?? 0;
      const open = round2(invoice.total - alreadyPaid);
      if (open <= EPSILON) continue;
      const applied = Math.min(open, remaining);
      paidByInvoice.set(invoice.id, round2(alreadyPaid + applied));
      remaining = round2(remaining - applied);
    }
    leftover = round2(leftover + remaining);
  }

  const balances = billable.map((invoice) => {
    const paid = round2(paidByInvoice.get(invoice.id) ?? 0);
    const balance = round2(invoice.total - paid);
    const daysOverdue =
      balance > EPSILON && invoice.due_at
        ? Math.max(0, daysBetween(invoice.due_at, today))
        : 0;

    let status: InvoiceStatus;
    if (balance <= EPSILON) status = "paid";
    else if (daysOverdue > 0) status = "overdue";
    else if (paid > EPSILON) status = "part_paid";
    else status = "unpaid";

    return {
      id: invoice.id,
      number: invoice.number,
      total: round2(invoice.total),
      paid,
      balance: balance < 0 ? 0 : balance,
      status,
      dueAt: invoice.due_at ?? null,
      daysOverdue,
    };
  });

  return { invoices: balances, credit: leftover };
}

/** Per-invoice balances only, for callers that do not need the credit line. */
export function allocatePayments(
  invoices: LedgerInvoice[],
  payments: LedgerPayment[],
  today: string,
): InvoiceBalance[] {
  return allocateWithCredit(invoices, payments, today).invoices;
}

export interface LedgerInput {
  invoices: LedgerInvoice[];
  payments: LedgerPayment[];
  expenses: {
    amount: number;
    currency: string;
    receipt_path?: string | null;
    receipt_url?: string | null;
  }[];
  /** The project currency. Rows in another currency are reported, not added. */
  currency: string;
  /** ISO date used for overdue maths. Defaults to the real clock. */
  today?: string;
}

export function summariseLedger(input: LedgerInput): LedgerSummary {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const projectCurrency = (input.currency || "").toUpperCase();

  const currencies = new Set<string>();
  let ignoredRows = 0;

  const inProjectCurrency = (code: string) => {
    const normalised = (code || "").toUpperCase();
    if (normalised && normalised !== projectCurrency) {
      currencies.add(normalised);
      ignoredRows += 1;
      return false;
    }
    return true;
  };

  const invoices = input.invoices.filter((row) =>
    inProjectCurrency(row.currency),
  );
  const payments = input.payments.filter((row) =>
    inProjectCurrency(row.currency),
  );
  const expenses = input.expenses.filter((row) =>
    inProjectCurrency(row.currency),
  );

  const allocation = allocateWithCredit(invoices, payments, today);
  const balances = allocation.invoices;

  const invoicedTotal = round2(
    balances.reduce((sum, invoice) => sum + invoice.total, 0),
  );
  const paidTotal = round2(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const outstandingTotal = round2(
    balances.reduce((sum, invoice) => sum + invoice.balance, 0),
  );
  const overdueTotal = round2(
    balances
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.balance, 0),
  );

  const expenseTotal = round2(
    expenses.reduce((sum, expense) => sum + expense.amount, 0),
  );
  const expensesWithReceipts = expenses.filter(
    (expense) => Boolean(expense.receipt_path) || Boolean(expense.receipt_url),
  ).length;

  const mismatchCurrencies = Array.from(currencies);
  if (projectCurrency) mismatchCurrencies.unshift(projectCurrency);

  return {
    currency: projectCurrency || null,
    invoicedTotal,
    paidTotal,
    outstandingTotal,
    overdueTotal,
    credit: allocation.credit,
    invoices: balances,
    expenseTotal,
    expensesWithReceipts,
    expensesMissingReceipt: expenses.length - expensesWithReceipts,
    projectedMargin: round2(invoicedTotal - expenseTotal),
    cashPosition: round2(paidTotal - expenseTotal),
    collectionRate:
      invoicedTotal > 0 ? Math.round((paidTotal / invoicedTotal) * 100) : null,
    currencyMismatch:
      currencies.size > 0
        ? { currencies: mismatchCurrencies, ignoredRows }
        : null,
  };
}
