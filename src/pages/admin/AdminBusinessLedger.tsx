import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminButton,
  AdminCard,
  AdminHeader,
  StateMessage,
} from "@/components/admin/AdminUi";
import { fetchContractorProjects } from "@/lib/contractor";
import {
  summariseLedger,
  type LedgerInvoice,
  type LedgerPayment,
} from "@/lib/project-ledger";
import {
  ageReceivables,
  rollupPortfolio,
  type PortfolioProject,
} from "@/lib/business-admin";

/**
 * The contractor's book of business, across every project.
 *
 * A project screen answers "what does this client owe me". Six live jobs need
 * the other question: what is owed in total, how late, and which jobs have
 * earned. Four reads, one pass, and the same LedgerSummary the project screen
 * shows, so a figure quoted here matches the project it came from.
 *
 * Nothing is added across currencies. When projects span more than one, the page
 * shows one card per currency and says so rather than converting anything.
 */

interface InvoiceRow {
  id: string;
  project_id: string;
  number: string;
  issued_at: string;
  due_at: string | null;
  currency: string;
  total: number;
  status: string;
}

interface PaymentRow {
  id: string;
  project_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  paid_at: string;
}

interface ExpenseRow {
  project_id: string;
  amount: number;
  currency: string;
  receipt_path: string | null;
}

function money(amount: number, currency: string): string {
  const code = currency || "NGN";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${Math.round(amount).toLocaleString("en")}`;
  }
}

export default function AdminBusinessLedger() {
  const [rows, setRows] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projects = await fetchContractorProjects();
      if (projects.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const ids = projects.map((project) => project.id);
      const [invoiceResult, paymentResult, expenseResult] = await Promise.all([
        supabase
          .from("project_invoices")
          .select(
            "id, project_id, number, issued_at, due_at, currency, total, status",
          )
          .in("project_id", ids),
        supabase
          .from("project_payments")
          .select("id, project_id, invoice_id, amount, currency, paid_at")
          .in("project_id", ids),
        supabase
          .from("project_expenses")
          .select("project_id, amount, currency, receipt_path")
          .in("project_id", ids),
      ]);
      const failed =
        invoiceResult.error ?? paymentResult.error ?? expenseResult.error;
      if (failed) throw new Error(failed.message);

      const invoices = (invoiceResult.data ?? []) as InvoiceRow[];
      const payments = (paymentResult.data ?? []) as PaymentRow[];
      const expenses = (expenseResult.data ?? []) as ExpenseRow[];
      const today = new Date().toISOString().slice(0, 10);

      const built: PortfolioProject[] = projects.map((project) => {
        const projectInvoices: LedgerInvoice[] = invoices
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            number: row.number,
            issued_at: row.issued_at,
            due_at: row.due_at,
            currency: row.currency,
            total: Number(row.total) || 0,
            status: row.status,
          }));
        const projectPayments: LedgerPayment[] = payments
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            invoice_id: row.invoice_id,
            amount: Number(row.amount) || 0,
            currency: row.currency,
            paid_at: row.paid_at,
          }));
        const projectExpenses = expenses
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            amount: Number(row.amount) || 0,
            currency: row.currency,
            receipt_path: row.receipt_path,
          }));
        const summary = summariseLedger({
          invoices: projectInvoices,
          payments: projectPayments,
          expenses: projectExpenses,
          currency: project.currency ?? "",
          today,
        });
        return {
          projectId: project.id,
          projectName: project.name,
          clientName: project.client_name ?? null,
          currency: project.currency ?? null,
          summary,
          ageing: ageReceivables(summary.invoices, today),
        };
      });

      setRows(built);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The business ledger could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rollup = rollupPortfolio(rows);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Business ledger"
        subtitle="Every project in one book: billed, collected, outstanding, and how late the rest is."
        action={
          <AdminButton onClick={load} disabled={loading}>
            {loading ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </AdminButton>
        }
      />

      {error ? (
        <StateMessage
          type="error"
          title="The ledger could not be read"
          message={`${error}. Nothing is shown rather than a partial total, because a short total reads as a client who paid.`}
        />
      ) : null}

      {loading && rows.length === 0 ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Reading projects, invoices, payments and spend.
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <StateMessage
          type="empty"
          title="No projects yet"
          message="Raise a project and send it an invoice. The book fills in from there."
        />
      ) : null}

      {rollup.mixedCurrency ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <p>
            These projects are billed in more than one currency. Each one is
            totalled on its own below; nothing has been converted.
          </p>
        </div>
      ) : null}

      {rollup.currencies.map((currency) => (
        <AdminCard key={currency.currency || "unset"}>
          <h2 className="mb-4 font-display text-base font-bold">
            {currency.label} across {currency.projectCount} project
            {currency.projectCount === 1 ? "" : "s"}
          </h2>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Billed", money(currency.invoiced, currency.currency)],
              ["Collected", money(currency.settled, currency.currency)],
              ["Outstanding", money(currency.outstanding, currency.currency)],
              ["Overdue", money(currency.overdue, currency.currency)],
              ["Held on account", money(currency.credit, currency.currency)],
              ["Margin", money(currency.margin, currency.currency)],
              ["Cash position", money(currency.cash, currency.currency)],
              [
                "Collected share",
                currency.collectionRate === null
                  ? "Nothing billed"
                  : `${currency.collectionRate}%`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Ageing</th>
                  <th className="py-2 pr-4 font-medium">Current</th>
                  <th className="py-2 pr-4 font-medium">1 to 30</th>
                  <th className="py-2 pr-4 font-medium">31 to 60</th>
                  <th className="py-2 pr-4 font-medium">61 to 90</th>
                  <th className="py-2 pr-4 font-medium">Over 90</th>
                  <th className="py-2 pr-4 font-medium">No due date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 pr-4 font-medium">
                    {currency.ageing.invoiceCount} open invoice
                    {currency.ageing.invoiceCount === 1 ? "" : "s"}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.current, currency.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.days1To30, currency.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.days31To60, currency.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.days61To90, currency.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.over90, currency.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    {money(currency.ageing.undated, currency.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {currency.ageing.averageDaysOverdue === null
              ? "Nothing is past its due date."
              : `Late money is ${currency.ageing.averageDaysOverdue} days overdue on average, weighted by what is owed.`}
            {currency.ageing.undated > 0
              ? " Invoices with no due date are listed apart, not counted as due today."
              : ""}
          </p>
        </AdminCard>
      ))}

      {rows.length > 0 ? (
        <AdminCard>
          <h2 className="mb-4 font-display text-base font-bold">By project</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Project</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Billed</th>
                  <th className="py-2 pr-4 font-medium">Outstanding</th>
                  <th className="py-2 pr-4 font-medium">Overdue</th>
                  <th className="py-2 pr-4 font-medium">Late by</th>
                  <th className="py-2 pr-4 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rollup.projects.map((project) => (
                  <tr
                    key={project.projectId}
                    className="border-b border-border/60"
                  >
                    <td className="py-2 pr-4 font-medium">
                      {project.projectName}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {project.clientName ?? "Not named"}
                    </td>
                    <td className="py-2 pr-4">
                      {money(
                        project.summary.invoicedTotal,
                        project.currency ?? "",
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {money(
                        project.summary.outstandingTotal,
                        project.currency ?? "",
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {money(
                        project.summary.overdueTotal,
                        project.currency ?? "",
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {project.ageing.averageDaysOverdue === null
                        ? "On time"
                        : `${project.ageing.averageDaysOverdue} d`}
                    </td>
                    <td className="py-2 pr-4">
                      {money(
                        project.summary.projectedMargin,
                        project.currency ?? "",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Margin is billed value less recorded spend. Cash position, which
            counts money held on account, is on the currency cards above.
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
