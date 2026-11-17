/**
 * The business view across projects: what is owed, how late it is, and what each
 * project has earned.
 *
 * A single project's ledger answers "what does this client owe me". A contractor
 * running six jobs needs the other question, and it was only answerable by
 * opening each project in turn and adding the totals up by hand. Everything here
 * works on the same LedgerSummary the project screen already shows, so the
 * portfolio figure and the project figure cannot drift apart.
 *
 * Two rules are absolute. Currencies are never added together: each currency is
 * rolled up on its own, and the caller is told when more than one exists. And an
 * invoice with no due date is not assumed to be due today: it is reported as
 * undated, because a due date the contractor never entered is not evidence.
 */
import { roundMoney } from "./project-money";
import {
  daysBetween,
  type InvoiceBalance,
  type LedgerSummary,
} from "./project-ledger";

export interface AgeingBuckets {
  /** Outstanding and not yet past its due date. */
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  /** Outstanding on invoices that carry no due date at all. */
  undated: number;
  /** Every outstanding balance, which is the sum of the six figures above. */
  total: number;
  invoiceCount: number;
  /** Balance-weighted mean days overdue across overdue invoices only. */
  averageDaysOverdue: number | null;
  /** Sum of balance x days overdue, kept so merged buckets stay exact. */
  weightedOverdueDays: number;
  /** Outstanding that is past its due date, the base of averageDaysOverdue. */
  overdueBalance: number;
}

export const EMPTY_AGEING: AgeingBuckets = {
  current: 0,
  days1To30: 0,
  days31To60: 0,
  days61To90: 0,
  over90: 0,
  undated: 0,
  total: 0,
  invoiceCount: 0,
  averageDaysOverdue: null,
  weightedOverdueDays: 0,
  overdueBalance: 0,
};

const round2 = roundMoney;

/**
 * Age one balance. The bucket is chosen by how many days past its due date the
 * invoice sits, so an invoice due today is current and one due yesterday is in
 * the first bucket.
 */
export function ageReceivables(
  balances: InvoiceBalance[],
  asOf: string,
): AgeingBuckets {
  const buckets: AgeingBuckets = { ...EMPTY_AGEING };

  for (const invoice of balances) {
    const balance = round2(invoice.balance);
    if (!(balance > 0)) continue;

    buckets.total = round2(buckets.total + balance);
    buckets.invoiceCount += 1;

    if (!invoice.dueAt) {
      buckets.undated = round2(buckets.undated + balance);
      continue;
    }

    const daysOverdue = daysBetween(invoice.dueAt, asOf);
    if (daysOverdue <= 0) {
      buckets.current = round2(buckets.current + balance);
      continue;
    }

    if (daysOverdue <= 30) {
      buckets.days1To30 = round2(buckets.days1To30 + balance);
    } else if (daysOverdue <= 60) {
      buckets.days31To60 = round2(buckets.days31To60 + balance);
    } else if (daysOverdue <= 90) {
      buckets.days61To90 = round2(buckets.days61To90 + balance);
    } else {
      buckets.over90 = round2(buckets.over90 + balance);
    }
    buckets.overdueBalance = round2(buckets.overdueBalance + balance);
    buckets.weightedOverdueDays += balance * daysOverdue;
  }

  buckets.averageDaysOverdue =
    buckets.overdueBalance > 0
      ? Math.round(
          (buckets.weightedOverdueDays / buckets.overdueBalance) * 10,
        ) / 10
      : null;
  return buckets;
}

/** Add buckets together without recomputing the mean from rounded parts. */
export function mergeAgeing(list: AgeingBuckets[]): AgeingBuckets {
  const merged: AgeingBuckets = { ...EMPTY_AGEING };
  for (const bucket of list) {
    merged.current = round2(merged.current + bucket.current);
    merged.days1To30 = round2(merged.days1To30 + bucket.days1To30);
    merged.days31To60 = round2(merged.days31To60 + bucket.days31To60);
    merged.days61To90 = round2(merged.days61To90 + bucket.days61To90);
    merged.over90 = round2(merged.over90 + bucket.over90);
    merged.undated = round2(merged.undated + bucket.undated);
    merged.total = round2(merged.total + bucket.total);
    merged.overdueBalance = round2(
      merged.overdueBalance + bucket.overdueBalance,
    );
    merged.invoiceCount += bucket.invoiceCount;
    merged.weightedOverdueDays += bucket.weightedOverdueDays;
  }
  merged.averageDaysOverdue =
    merged.overdueBalance > 0
      ? Math.round((merged.weightedOverdueDays / merged.overdueBalance) * 10) /
        10
      : null;
  return merged;
}

export interface PortfolioProject {
  projectId: string;
  projectName: string;
  clientName: string | null;
  currency: string | null;
  summary: LedgerSummary;
  ageing: AgeingBuckets;
}

export interface CurrencyRollup {
  /** Upper-case code, or an empty string when the projects carry none. */
  currency: string;
  label: string;
  projectCount: number;
  invoiced: number;
  /** Cash applied to invoices, which is not the same as cash received. */
  settled: number;
  outstanding: number;
  overdue: number;
  /** Money received against no invoice, held on account. */
  credit: number;
  /** Billed value less recorded spend. */
  margin: number;
  /** Cash received less recorded spend. */
  cash: number;
  collectionRate: number | null;
  ageing: AgeingBuckets;
}

export interface PortfolioRollup {
  currencies: CurrencyRollup[];
  projectCount: number;
  /** True when the projects span more than one currency. */
  mixedCurrency: boolean;
  /** Projects with outstanding money, largest first. */
  projects: PortfolioProject[];
}

/**
 * Roll projects up by currency. Nothing is added across currencies, and a
 * project with no currency is kept in its own group rather than assumed to be
 * in whichever currency happens to be first.
 */
export function rollupPortfolio(projects: PortfolioProject[]): PortfolioRollup {
  const groups = new Map<string, PortfolioProject[]>();
  for (const project of projects) {
    const code = (project.currency ?? "").toUpperCase();
    const bucket = groups.get(code);
    if (bucket) bucket.push(project);
    else groups.set(code, [project]);
  }

  const currencies: CurrencyRollup[] = [];
  for (const [code, rows] of groups) {
    let invoiced = 0;
    let settled = 0;
    let outstanding = 0;
    let overdue = 0;
    let credit = 0;
    let margin = 0;
    let cash = 0;
    for (const row of rows) {
      invoiced = round2(invoiced + row.summary.invoicedTotal);
      settled = round2(
        settled + (row.summary.invoicedTotal - row.summary.outstandingTotal),
      );
      outstanding = round2(outstanding + row.summary.outstandingTotal);
      overdue = round2(overdue + row.summary.overdueTotal);
      credit = round2(credit + row.summary.credit);
      margin = round2(margin + row.summary.projectedMargin);
      cash = round2(cash + row.summary.cashPosition);
    }
    currencies.push({
      currency: code,
      label: code || "Currency not set",
      projectCount: rows.length,
      invoiced,
      settled,
      outstanding,
      overdue,
      credit,
      margin,
      cash,
      collectionRate:
        invoiced > 0 ? Math.round((settled / invoiced) * 100) : null,
      ageing: mergeAgeing(rows.map((row) => row.ageing)),
    });
  }

  currencies.sort((a, b) => b.outstanding - a.outstanding);
  const sorted = [...projects].sort(
    (a, b) =>
      b.summary.outstandingTotal - a.summary.outstandingTotal ||
      a.projectName.localeCompare(b.projectName),
  );

  return {
    currencies,
    projectCount: projects.length,
    mixedCurrency: currencies.length > 1,
    projects: sorted,
  };
}
