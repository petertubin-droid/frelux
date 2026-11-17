import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminButton,
  AdminCard,
  AdminHeader,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  summarisePayables,
  type AgeingBuckets,
  type PayableCurrencyBlock,
  type SupplierBill,
} from "@/lib/supplier-ledger";

/**
 * What the business owes its suppliers, across every project and the business
 * itself.
 *
 * One card per currency, because a business that buys in two currencies owes two
 * separate sums. Within a card the ageing row, the supplier balances and the
 * totals all come from the same summariser, so they cannot disagree.
 */

const BUCKET_LABELS: { key: keyof AgeingBuckets; label: string }[] = [
  { key: "current", label: "Not yet due" },
  { key: "d1_30", label: "1-30 days" },
  { key: "d31_60", label: "31-60 days" },
  { key: "d61_90", label: "61-90 days" },
  { key: "over90", label: "Over 90 days" },
  { key: "undated", label: "No due date" },
];

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
}

function PayableCard({ block }: { block: PayableCurrencyBlock }) {
  return (
    <AdminCard>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {block.currency} owed
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {money(block.outstanding, block.currency)}
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {money(block.billed, block.currency)} billed,{" "}
          {money(block.paid, block.currency)} paid, {block.billCount}{" "}
          {block.billCount === 1 ? "bill" : "bills"}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {BUCKET_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-md border border-slate-200 p-2">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-slate-900">
              {money(block.buckets[key], block.currency)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900">By supplier</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-1 font-medium">
                Supplier
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Owed
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Billed
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Paid
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Oldest overdue
              </th>
            </tr>
          </thead>
          <tbody>
            {block.suppliers.map((supplier) => (
              <tr key={supplier.supplier} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-800">{supplier.supplier}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-900">
                  {money(supplier.outstanding, block.currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">
                  {money(supplier.billed, block.currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">
                  {money(supplier.paid, block.currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">
                  {supplier.oldestOverdueDays === null
                    ? "None overdue"
                    : `${supplier.oldestOverdueDays} days`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}

export default function AdminSupplierLedger() {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: readError } = await supabase
      .from("supplier_bills")
      .select(
        "id, supplier_name, currency, amount, paid_amount, issued_at, due_at, status",
      );
    if (readError) {
      setBills([]);
      setError(
        `Supplier bills could not be read, so no balance is shown rather than a partial one. ${readError.message}`,
      );
    } else {
      setBills((data ?? []) as SupplierBill[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blocks = summarisePayables(bills, new Date());

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Supplier ledger"
        subtitle="What the business owes its suppliers, aged by due date, in each currency separately."
        action={
          <AdminButton onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </AdminButton>
        }
      />

      {loading && (
        <StateMessage
          type="loading"
          title="Reading supplier bills"
          message="Collecting recorded supplier bills."
        />
      )}

      {!loading && error && (
        <StateMessage type="error" title="Bills unavailable" message={error} />
      )}

      {!loading && !error && blocks.length === 0 && (
        <StateMessage
          type="empty"
          title="No supplier bills recorded"
          message="Bills entered against a project, or against the business, appear here aged by their due date."
        />
      )}

      {!loading &&
        !error &&
        blocks.map((block) => (
          <PayableCard key={block.currency} block={block} />
        ))}
    </div>
  );
}
