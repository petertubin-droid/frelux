/**
 * Supplier payables: money the business owes its vendors.
 *
 * The receivables side ages invoices a client owes. This is the mirror, and it
 * differs in two ways that matter: a bill may belong to the business rather than
 * to one project, and a bill can be part paid. So the balance is amount less
 * paid_amount, and only open bills carry one. A paid bill counts as paid history,
 * a void bill counts as nothing.
 *
 * Currencies are never added together, and a bill without a due date is aged
 * into its own bucket rather than ignored, because owing money with no agreed
 * date is still owing money.
 */

export type SupplierBillStatus = "open" | "paid" | "void";

export interface SupplierBill {
  id: string;
  supplier_name: string;
  currency: string;
  amount: number;
  paid_amount: number | null;
  issued_at: string | null;
  due_at: string | null;
  status: SupplierBillStatus | string;
}

export interface AgeingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  over90: number;
  undated: number;
}

export interface SupplierBalance {
  supplier: string;
  /** Amount less paid, for open bills only. Negative when overpaid. */
  outstanding: number;
  billed: number;
  paid: number;
  billCount: number;
  /** Days overdue on the oldest unpaid bill, null when nothing is dated. */
  oldestOverdueDays: number | null;
  buckets: AgeingBuckets;
}

export interface PayableCurrencyBlock {
  currency: string;
  outstanding: number;
  billed: number;
  paid: number;
  billCount: number;
  buckets: AgeingBuckets;
  suppliers: SupplierBalance[];
}

export const EMPTY_BUCKETS: AgeingBuckets = {
  current: 0,
  d1_30: 0,
  d31_60: 0,
  d61_90: 0,
  over90: 0,
  undated: 0,
};

/** Whole days between a due date and the as-at date, using dates only. */
export function daysOverdue(
  dueAt: string | null | undefined,
  asAt: Date,
): number | null {
  if (!dueAt) return null;
  const due = Date.parse(`${dueAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(due)) return null;
  const asAtDay = Date.UTC(
    asAt.getUTCFullYear(),
    asAt.getUTCMonth(),
    asAt.getUTCDate(),
  );
  return Math.floor((asAtDay - due) / 86_400_000);
}

function bucketFor(days: number | null): keyof AgeingBuckets {
  if (days === null) return "undated";
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "over90";
}

function currencyKey(currency: string | null | undefined): string {
  const code = (currency ?? "").trim().toUpperCase();
  return code === "" ? "Unknown currency" : code;
}

export function summarisePayables(
  bills: SupplierBill[],
  asAt: Date,
): PayableCurrencyBlock[] {
  const blocks = new Map<
    string,
    {
      currency: string;
      outstanding: number;
      billed: number;
      paid: number;
      billCount: number;
      buckets: AgeingBuckets;
      suppliers: Map<string, SupplierBalance>;
    }
  >();

  for (const bill of bills) {
    const status = (bill.status ?? "open").toLowerCase();
    if (status === "void") continue;

    const currency = currencyKey(bill.currency);
    const block = blocks.get(currency) ?? {
      currency,
      outstanding: 0,
      billed: 0,
      paid: 0,
      billCount: 0,
      buckets: { ...EMPTY_BUCKETS },
      suppliers: new Map<string, SupplierBalance>(),
    };
    blocks.set(currency, block);

    const supplierName =
      (bill.supplier_name ?? "").trim() || "Unnamed supplier";
    const supplier = block.suppliers.get(supplierName) ?? {
      supplier: supplierName,
      outstanding: 0,
      billed: 0,
      paid: 0,
      billCount: 0,
      oldestOverdueDays: null,
      buckets: { ...EMPTY_BUCKETS },
    };
    block.suppliers.set(supplierName, supplier);

    const amount = Number.isFinite(bill.amount) ? bill.amount : 0;
    const paid = Number.isFinite(bill.paid_amount ?? 0)
      ? (bill.paid_amount ?? 0)
      : 0;

    block.billCount += 1;
    block.billed += amount;
    block.paid += paid;
    supplier.billCount += 1;
    supplier.billed += amount;
    supplier.paid += paid;

    if (status === "paid") continue;

    const outstanding = amount - paid;
    const days = daysOverdue(bill.due_at, asAt);
    const bucket = bucketFor(days);

    block.outstanding += outstanding;
    block.buckets[bucket] += outstanding;
    supplier.outstanding += outstanding;
    supplier.buckets[bucket] += outstanding;
    if (days !== null && days > 0) {
      supplier.oldestOverdueDays =
        supplier.oldestOverdueDays === null
          ? days
          : Math.max(supplier.oldestOverdueDays, days);
    }
  }

  return [...blocks.values()]
    .map((block) => ({
      currency: block.currency,
      outstanding: block.outstanding,
      billed: block.billed,
      paid: block.paid,
      billCount: block.billCount,
      buckets: block.buckets,
      suppliers: [...block.suppliers.values()].sort(
        (a, b) =>
          b.outstanding - a.outstanding || a.supplier.localeCompare(b.supplier),
      ),
    }))
    .sort(
      (a, b) =>
        b.outstanding - a.outstanding || a.currency.localeCompare(b.currency),
    );
}

/** Total owing across every currency block, in the same order as the blocks. */
export function outstandingByCurrency(
  blocks: PayableCurrencyBlock[],
): { currency: string; outstanding: number }[] {
  return blocks.map((block) => ({
    currency: block.currency,
    outstanding: block.outstanding,
  }));
}
