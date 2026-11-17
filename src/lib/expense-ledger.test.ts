import { describe, expect, it } from "vitest";
import {
  monthKey,
  monthLabel,
  summariseExpenses,
  type ExpenseRow,
} from "@/lib/expense-ledger";

/**
 * Figures below are worked by hand so the arithmetic is checkable on the page.
 *
 * Naira: 50,000 materials in January, 30,000 materials and 20,000 labour and a
 * 5,000 refund in February, 10,000 transport with no date. That is 105,000 over
 * five rows, February netting to 45,000 once the refund is included.
 * Dollars: one 1,200 materials row, which must never join the naira total.
 */
const rows: ExpenseRow[] = [
  {
    id: "1",
    project_id: "p1",
    category: "materials",
    name: "Cement",
    amount: 50000,
    currency: "NGN",
    spent_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "2",
    project_id: "p1",
    category: "materials",
    name: "Sand",
    amount: 30000,
    currency: "NGN",
    spent_at: "2026-02-03T09:00:00Z",
  },
  {
    id: "3",
    project_id: "p2",
    category: "labour",
    name: "Crew day",
    amount: 20000,
    currency: "NGN",
    spent_at: "2026-02-10T09:00:00Z",
  },
  {
    id: "4",
    project_id: "p2",
    category: "materials",
    name: "Fixings",
    amount: 1200,
    currency: "usd",
    spent_at: "2026-02-11T09:00:00Z",
  },
  {
    id: "5",
    project_id: "p1",
    category: "other",
    name: "Refund",
    amount: -5000,
    currency: "NGN",
    spent_at: "2026-02-20T09:00:00Z",
  },
  {
    id: "6",
    project_id: "p3",
    category: "transport",
    name: "Haulage",
    amount: 10000,
    currency: "NGN",
    spent_at: null,
  },
];

describe("month keys", () => {
  it("reads the month from the date, not the display string", () => {
    expect(monthKey("2026-01-15T09:00:00Z")).toBe("2026-01");
    expect(monthKey("2026-12-31T23:30:00Z")).toBe("2026-12");
  });

  it("returns null for a blank or unreadable date", () => {
    expect(monthKey(null)).toBeNull();
    expect(monthKey("")).toBeNull();
    expect(monthKey("not a date")).toBeNull();
  });

  it("labels months deterministically and names the undated bucket", () => {
    expect(monthLabel("2026-02")).toBe("February 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
    expect(monthLabel(null)).toBe("Undated");
  });
});

describe("expense book", () => {
  it("keeps each currency in its own block and never adds them", () => {
    const blocks = summariseExpenses(rows);
    expect(blocks.map((b) => b.currency)).toEqual(["NGN", "USD"]);
    expect(blocks[0].total).toBe(105000);
    expect(blocks[0].count).toBe(5);
    expect(blocks[1].total).toBe(1200);
    expect(blocks[1].count).toBe(1);
  });

  it("totals by category, refunds included and the largest first", () => {
    const [naira] = summariseExpenses(rows);
    expect(naira.byCategory).toEqual([
      { category: "materials", total: 80000, count: 2 },
      { category: "labour", total: 20000, count: 1 },
      { category: "transport", total: 10000, count: 1 },
      { category: "other", total: -5000, count: 1 },
    ]);
  });

  it("groups by month in order, with undated money last", () => {
    const [naira] = summariseExpenses(rows);
    expect(naira.byMonth).toEqual([
      { month: "2026-01", label: "January 2026", total: 50000, count: 1 },
      { month: "2026-02", label: "February 2026", total: 45000, count: 3 },
      { month: null, label: "Undated", total: 10000, count: 1 },
    ]);
    const summed = naira.byMonth.reduce((n, m) => n + m.total, 0);
    expect(summed).toBe(naira.total);
  });

  it("names the largest single expense", () => {
    const [naira, dollars] = summariseExpenses(rows);
    expect(naira.largest).toEqual({
      name: "Cement",
      amount: 50000,
      spent_at: "2026-01-15T09:00:00Z",
    });
    expect(dollars.largest?.name).toBe("Fixings");
  });

  it("counts an unusable amount instead of dropping the row silently", () => {
    const [block] = summariseExpenses([
      { ...rows[0], amount: Number.NaN },
      rows[1],
    ]);
    expect(block.ignored).toBe(1);
    expect(block.count).toBe(1);
    expect(block.total).toBe(30000);
  });

  it("labels a missing currency rather than merging it into a real one", () => {
    const blocks = summariseExpenses([{ ...rows[0], currency: "  " }]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].currency).toBe("Unknown currency");
  });

  it("returns nothing for an empty book", () => {
    expect(summariseExpenses([])).toEqual([]);
  });
});
