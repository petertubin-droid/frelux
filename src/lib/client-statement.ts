/**
 * A client's statement of account across every project they have with the
 * contractor.
 *
 * An invoice is a demand for one job; a statement is the answer to "send me
 * everything I owe you", which is the request a client actually makes. The
 * figures come from the same rows the project ledger uses, in the same currency,
 * with the same rule that a draft or void invoice is not billable and that two
 * currencies are never added.
 *
 * Money received is money received even when it named a draft invoice, so the
 * statement credits it and reports how much of the credit is held on account
 * rather than against a bill. A client in credit reads as a negative closing
 * balance; that is the truth and it is not clamped to zero.
 */
import { roundMoney } from "./project-money";

export interface StatementInvoiceRow {
  id: string;
  number: string;
  project_id: string;
  issued_at: string;
  currency: string;
  total: number;
  status: string;
}

export interface StatementPaymentRow {
  id: string;
  project_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  paid_at: string;
}

export interface StatementProject {
  id: string;
  name: string;
}

export interface StatementLine {
  date: string;
  kind: "invoice" | "payment";
  reference: string;
  projectName: string;
  /** Money billed, zero on a payment line. */
  debit: number;
  /** Money received, zero on an invoice line. */
  credit: number;
  /** Balance after this line, where positive means the client owes it. */
  balance: number;
}

export interface ClientStatement {
  clientName: string;
  currency: string;
  lines: StatementLine[];
  invoiced: number;
  paid: number;
  /** Invoiced less received. Negative means the client is in credit. */
  closingBalance: number;
  /** Received against invoices that are not billable: draft or void. */
  heldOnAccount: number;
  /** Rows in another currency, counted and excluded rather than converted. */
  ignoredRows: number;
}

export interface ClientStatementInput {
  clientName: string;
  /** Statement currency, upper-case. Rows in another currency are excluded. */
  currency: string;
  projects: StatementProject[];
  invoices: StatementInvoiceRow[];
  payments: StatementPaymentRow[];
}

const round2 = roundMoney;

function isBillable(status: string): boolean {
  return status !== "draft" && status !== "void";
}

/**
 * Build the statement. Lines are ordered by date, with an invoice ahead of a
 * payment on the same day, so a payment never appears to settle a bill raised
 * later that morning.
 */
export function buildClientStatement(
  input: ClientStatementInput,
): ClientStatement {
  const currency = (input.currency || "").toUpperCase();
  let ignoredRows = 0;

  const inCurrency = (code: string) => {
    const normalised = (code || "").toUpperCase();
    if (!currency) return true;
    if (normalised && normalised !== currency) {
      ignoredRows += 1;
      return false;
    }
    return true;
  };

  const projectNames = new Map(
    input.projects.map((project) => [project.id, project.name]),
  );
  const billableIds = new Set(
    input.invoices
      .filter((invoice) => isBillable(invoice.status))
      .map((invoice) => invoice.id),
  );

  const pending: {
    date: string;
    kind: "invoice" | "payment";
    reference: string;
    projectName: string;
    amount: number;
  }[] = [];

  let invoiced = 0;
  for (const invoice of input.invoices) {
    if (!inCurrency(invoice.currency)) continue;
    if (!isBillable(invoice.status)) continue;
    const amount = round2(Number(invoice.total) || 0);
    invoiced = round2(invoiced + amount);
    pending.push({
      date: invoice.issued_at.slice(0, 10),
      kind: "invoice",
      reference: invoice.number,
      projectName: projectNames.get(invoice.project_id) ?? "Project",
      amount,
    });
  }

  let paid = 0;
  let heldOnAccount = 0;
  for (const payment of input.payments) {
    if (!inCurrency(payment.currency)) continue;
    const amount = round2(Number(payment.amount) || 0);
    paid = round2(paid + amount);
    if (payment.invoice_id && !billableIds.has(payment.invoice_id)) {
      heldOnAccount = round2(heldOnAccount + amount);
    }
    pending.push({
      date: payment.paid_at.slice(0, 10),
      kind: "payment",
      reference: payment.invoice_id ? "Payment" : "Payment on account",
      projectName: projectNames.get(payment.project_id) ?? "Project",
      amount,
    });
  }

  pending.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "invoice" ? -1 : 1;
    return a.reference.localeCompare(b.reference);
  });

  let balance = 0;
  const lines: StatementLine[] = pending.map((row) => {
    const debit = row.kind === "invoice" ? row.amount : 0;
    const credit = row.kind === "payment" ? row.amount : 0;
    balance = round2(balance + debit - credit);
    return {
      date: row.date,
      kind: row.kind,
      reference: row.reference,
      projectName: row.projectName,
      debit,
      credit,
      balance,
    };
  });

  return {
    clientName: input.clientName,
    currency,
    lines,
    invoiced,
    paid,
    closingBalance: round2(invoiced - paid),
    heldOnAccount,
    ignoredRows,
  };
}

/** Every client named on the given projects, with the currencies they are billed in. */
export function clientsFromProjects(
  projects: { client_name: string | null; currency: string | null }[],
): { name: string; currencies: string[] }[] {
  const byName = new Map<string, Set<string>>();
  for (const project of projects) {
    const name = (project.client_name ?? "").trim();
    if (!name) continue;
    const code = (project.currency ?? "").toUpperCase();
    const set = byName.get(name);
    if (set) set.add(code);
    else byName.set(name, new Set([code]));
  }
  return Array.from(byName.entries())
    .map(([name, currencies]) => ({
      name,
      currencies: Array.from(currencies).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
