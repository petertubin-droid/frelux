/**
 * The expense book, read across every project.
 *
 * A project screen answers "what has this job cost". A business needs the other
 * question: what has been spent in total, on what, and in which months. This
 * module answers only that, from the rows already recorded against projects.
 *
 * Two rules are deliberate:
 *
 *   - Currencies are never added together. Each currency gets its own block, so
 *     a naira total and a dollar total cannot be read as one figure.
 *   - An expense with no usable date is not dropped. It lands in an undated
 *     bucket that is sorted last and labelled, because money that was spent
 *     without a date is still money that was spent.
 */

export interface ExpenseRow {
  id: string;
  project_id: string | null;
  category: string;
  name: string;
  amount: number;
  currency: string;
  spent_at: string | null;
}

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface ExpenseMonthTotal {
  /** Month key as YYYY-MM, or null for rows without a usable date. */
  month: string | null;
  label: string;
  total: number;
  count: number;
}

export interface ExpenseLargest {
  name: string;
  amount: number;
  spent_at: string | null;
}

export interface ExpenseCurrencyBlock {
  currency: string;
  total: number;
  count: number;
  /** Rows whose amount was not a finite number, so they could not be counted. */
  ignored: number;
  byCategory: ExpenseCategoryTotal[];
  byMonth: ExpenseMonthTotal[];
  largest: ExpenseLargest | null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const UNDATED_LABEL = "Undated";

function currencyKey(currency: string | null | undefined): string {
  const code = (currency ?? "").trim().toUpperCase();
  return code === "" ? "Unknown currency" : code;
}

/**
 * Month key for a spent date, as YYYY-MM. Returns null when the value cannot be
 * read as a date, so the caller labels it rather than inventing a month.
 */
export function monthKey(spentAt: string | null | undefined): string | null {
  if (!spentAt) return null;
  const parsed = new Date(spentAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
  return `${parsed.getUTCFullYear()}-${month}`;
}

/** "2026-02" reads as "February 2026"; anything else keeps its own key. */
export function monthLabel(month: string | null): string {
  if (month === null) return UNDATED_LABEL;
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const index = Number(match[2]) - 1;
  if (index < 0 || index > 11) return month;
  return `${MONTH_NAMES[index]} ${match[1]}`;
}

/**
 * Summarises expense rows into one block per currency, each with category and
 * month totals and the largest single expense.
 */
export function summariseExpenses(rows: ExpenseRow[]): ExpenseCurrencyBlock[] {
  const blocks = new Map<
    string,
    {
      currency: string;
      total: number;
      count: number;
      ignored: number;
      categories: Map<string, ExpenseCategoryTotal>;
      months: Map<string | null, ExpenseMonthTotal>;
      largest: ExpenseLargest | null;
    }
  >();

  for (const row of rows) {
    const currency = currencyKey(row.currency);
    const block = blocks.get(currency) ?? {
      currency,
      total: 0,
      count: 0,
      ignored: 0,
      categories: new Map<string, ExpenseCategoryTotal>(),
      months: new Map<string | null, ExpenseMonthTotal>(),
      largest: null,
    };
    blocks.set(currency, block);

    if (!Number.isFinite(row.amount)) {
      block.ignored += 1;
      continue;
    }

    const amount = row.amount;
    block.total += amount;
    block.count += 1;

    const category = (row.category ?? "").trim() || "Uncategorised";
    const cat = block.categories.get(category) ?? {
      category,
      total: 0,
      count: 0,
    };
    cat.total += amount;
    cat.count += 1;
    block.categories.set(category, cat);

    const month = monthKey(row.spent_at);
    const bucket = block.months.get(month) ?? {
      month,
      label: monthLabel(month),
      total: 0,
      count: 0,
    };
    bucket.total += amount;
    bucket.count += 1;
    block.months.set(month, bucket);

    if (block.largest === null || amount > block.largest.amount) {
      block.largest = {
        name: row.name?.trim() || "Unnamed expense",
        amount,
        spent_at: row.spent_at ?? null,
      };
    }
  }

  return [...blocks.values()]
    .map((block) => ({
      currency: block.currency,
      total: block.total,
      count: block.count,
      ignored: block.ignored,
      byCategory: [...block.categories.values()].sort(
        (a, b) => b.total - a.total || a.category.localeCompare(b.category),
      ),
      byMonth: [...block.months.values()].sort((a, b) => {
        if (a.month === null && b.month === null) return 0;
        if (a.month === null) return 1;
        if (b.month === null) return -1;
        return a.month.localeCompare(b.month);
      }),
      largest: block.largest,
    }))
    .sort((a, b) => b.total - a.total || a.currency.localeCompare(b.currency));
}
