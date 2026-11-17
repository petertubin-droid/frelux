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
  summariseExpenses,
  type ExpenseCurrencyBlock,
  type ExpenseRow,
} from "@/lib/expense-ledger";

/**
 * The expense book across every project.
 *
 * Each currency is its own card, because a business that spends in two
 * currencies has two answers, and adding them would produce a figure that
 * belongs to neither. Within a card the categories and months come from the
 * same summariser the totals use, so a category row and the card total agree by
 * construction rather than by two separate sums.
 */

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

function dateLabel(value: string | null): string {
  if (!value) return "No date recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date recorded";
  return parsed.toISOString().slice(0, 10);
}

function CurrencyCard({ block }: { block: ExpenseCurrencyBlock }) {
  return (
    <AdminCard>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {block.currency}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {money(block.total, block.currency)}
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {block.count} {block.count === 1 ? "expense" : "expenses"}
          {block.ignored > 0
            ? `, ${block.ignored} with an unreadable amount left out`
            : ""}
        </p>
      </div>

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">By category</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-1 font-medium">
                  Category
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Rows
                </th>
              </tr>
            </thead>
            <tbody>
              {block.byCategory.map((category) => (
                <tr
                  key={category.category}
                  className="border-t border-slate-100"
                >
                  <td className="py-1.5 capitalize text-slate-800">
                    {category.category.replace(/[-_]/g, " ")}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-900">
                    {money(category.total, block.currency)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                    {category.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">By month</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-1 font-medium">
                  Month
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Rows
                </th>
              </tr>
            </thead>
            <tbody>
              {block.byMonth.map((month) => (
                <tr
                  key={month.month ?? "undated"}
                  className="border-t border-slate-100"
                >
                  <td className="py-1.5 text-slate-800">{month.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-900">
                    {money(month.total, block.currency)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                    {month.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {block.largest && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Largest single expense:{" "}
          <span className="font-medium text-slate-900">
            {block.largest.name}
          </span>{" "}
          at {money(block.largest.amount, block.currency)} on{" "}
          {dateLabel(block.largest.spent_at)}.
        </p>
      )}
    </AdminCard>
  );
}

export default function AdminExpenseLedger() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: readError } = await supabase
      .from("project_expenses")
      .select("id, project_id, category, name, amount, currency, spent_at");
    if (readError) {
      setRows([]);
      setError(
        `Expenses could not be read, so no total is shown rather than a partial one. ${readError.message}`,
      );
    } else {
      setRows((data ?? []) as ExpenseRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blocks = summariseExpenses(rows);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Expense ledger"
        subtitle="What the business has spent, across every project, in each currency separately."
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
          title="Reading expenses"
          message="Collecting recorded expenses from every project."
        />
      )}

      {!loading && error && (
        <StateMessage
          type="error"
          title="Expenses unavailable"
          message={error}
        />
      )}

      {!loading && !error && blocks.length === 0 && (
        <StateMessage
          type="empty"
          title="No expenses recorded"
          message="Expenses entered on a project appear here, grouped by currency, category and month."
        />
      )}

      {!loading &&
        !error &&
        blocks.map((block) => (
          <CurrencyCard key={block.currency} block={block} />
        ))}
    </div>
  );
}
