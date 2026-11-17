import { describe, expect, it } from "vitest";
import {
  EMPTY_BUCKETS,
  daysOverdue,
  outstandingByCurrency,
  summarisePayables,
  type SupplierBill,
} from "@/lib/supplier-ledger";

/**
 * Figures worked by hand at an as-at date of 1 March 2026.
 *
 * Alpha: 100,000 billed, 40,000 paid, due 10 January, so 60,000 is 50 days
 * overdue and sits in 31-60. A second Alpha bill of 20,000 is already paid.
 * Beta: 25,000 due 15 March, not yet due, so current.
 * Gamma: 10,000 with no due date, so undated.
 * Delta: 500 dollars due 1 December 2025, exactly 90 days overdue.
 * A void bill of 5,000 counts for nothing.
 *
 * Naira therefore owes 95,000 on 155,000 billed and 60,000 paid; dollars owe 500
 * and are never added to it.
 */
const bills: SupplierBill[] = [
  {
    id: "1",
    supplier_name: "Alpha Cement",
    currency: "NGN",
    amount: 100000,
    paid_amount: 40000,
    issued_at: "2025-12-20",
    due_at: "2026-01-10",
    status: "open",
  },
  {
    id: "2",
    supplier_name: "Alpha Cement",
    currency: "NGN",
    amount: 20000,
    paid_amount: 20000,
    issued_at: "2026-01-05",
    due_at: "2026-02-05",
    status: "paid",
  },
  {
    id: "3",
    supplier_name: "Beta Haulage",
    currency: "NGN",
    amount: 25000,
    paid_amount: 0,
    issued_at: "2026-02-20",
    due_at: "2026-03-15",
    status: "open",
  },
  {
    id: "4",
    supplier_name: "Gamma Tools",
    currency: "NGN",
    amount: 10000,
    paid_amount: 0,
    issued_at: "2026-02-01",
    due_at: null,
    status: "open",
  },
  {
    id: "5",
    supplier_name: "Delta Fixings",
    currency: "usd",
    amount: 500,
    paid_amount: 0,
    issued_at: "2025-11-01",
    due_at: "2025-12-01",
    status: "open",
  },
  {
    id: "6",
    supplier_name: "Void Vendor",
    currency: "NGN",
    amount: 5000,
    paid_amount: 0,
    issued_at: "2026-01-01",
    due_at: "2026-01-31",
    status: "void",
  },
];

const asAt = new Date("2026-03-01T00:00:00Z");

describe("days overdue", () => {
  it("counts whole days between the due date and the as-at date", () => {
    expect(daysOverdue("2026-01-10", asAt)).toBe(50);
    expect(daysOverdue("2025-12-01", asAt)).toBe(90);
    expect(daysOverdue("2026-03-15", asAt)).toBe(-14);
  });

  it("returns null when there is no usable due date", () => {
    expect(daysOverdue(null, asAt)).toBeNull();
    expect(daysOverdue("", asAt)).toBeNull();
    expect(daysOverdue("not a date", asAt)).toBeNull();
  });
});

describe("supplier payables", () => {
  it("keeps each currency separate and never adds them", () => {
    const blocks = summarisePayables(bills, asAt);
    expect(blocks.map((b) => b.currency)).toEqual(["NGN", "USD"]);
    expect(blocks[0].outstanding).toBe(95000);
    expect(blocks[0].billed).toBe(155000);
    expect(blocks[0].paid).toBe(60000);
    // Four naira bills count: Alpha open, Alpha paid, Beta, Gamma. The void
    // bill is excluded, which is why this is four and not five.
    expect(blocks[0].billCount).toBe(4);
    expect(blocks[1].outstanding).toBe(500);
  });

  it("balances each supplier, largest first, on amount less paid", () => {
    const [naira] = summarisePayables(bills, asAt);
    expect(naira.suppliers.map((s) => [s.supplier, s.outstanding])).toEqual([
      ["Alpha Cement", 60000],
      ["Beta Haulage", 25000],
      ["Gamma Tools", 10000],
    ]);
    const alpha = naira.suppliers[0];
    expect(alpha.billed).toBe(120000);
    expect(alpha.paid).toBe(60000);
    expect(alpha.billCount).toBe(2);
    expect(alpha.oldestOverdueDays).toBe(50);
  });

  it("ages each balance into the right bucket", () => {
    const [naira] = summarisePayables(bills, asAt);
    expect(naira.buckets).toEqual({
      ...EMPTY_BUCKETS,
      current: 25000,
      d31_60: 60000,
      undated: 10000,
    });
    const [dollars] = summarisePayables(bills, asAt).slice(1);
    expect(dollars.buckets).toEqual({ ...EMPTY_BUCKETS, d61_90: 500 });
  });

  it("counts a paid bill as history and a void bill as nothing", () => {
    const [naira] = summarisePayables(bills, asAt);
    expect(naira.billed).toBe(155000);
    const names = naira.suppliers.map((s) => s.supplier);
    expect(names).not.toContain("Void Vendor");
  });

  it("shows an overpaid bill as a negative balance rather than a paid one", () => {
    const [block] = summarisePayables(
      [{ ...bills[0], amount: 10000, paid_amount: 12000 }],
      asAt,
    );
    expect(block.outstanding).toBe(-2000);
    expect(block.suppliers[0].outstanding).toBe(-2000);
  });

  it("puts an overdue bill past ninety days in the oldest bucket", () => {
    const [block] = summarisePayables(
      [{ ...bills[0], due_at: "2025-11-01" }],
      asAt,
    );
    expect(block.buckets.over90).toBe(60000);
    expect(block.buckets.d61_90).toBe(0);
  });

  it("reports outstanding per currency without converting anything", () => {
    const blocks = summarisePayables(bills, asAt);
    expect(outstandingByCurrency(blocks)).toEqual([
      { currency: "NGN", outstanding: 95000 },
      { currency: "USD", outstanding: 500 },
    ]);
  });

  it("returns nothing for an empty book", () => {
    expect(summarisePayables([], asAt)).toEqual([]);
  });
});
