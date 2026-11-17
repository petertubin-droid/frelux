import { useCallback, useEffect, useMemo, useState } from "react";
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
  buildClientStatement,
  clientsFromProjects,
  type StatementInvoiceRow,
  type StatementPaymentRow,
  type StatementProject,
} from "@/lib/client-statement";

/**
 * One client, every project, one running balance.
 *
 * "Send me everything I owe you" is the request clients actually make, and it
 * used to mean copying totals out of each project in turn. The lines are the
 * invoices and payments themselves, in date order, so the closing figure can be
 * checked by adding the column.
 */

function money(amount: number, currency: string): string {
  const code = currency || "NGN";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en")}`;
  }
}

export default function AdminClientStatement() {
  const [projects, setProjects] = useState<StatementProject[]>([]);
  const [projectClients, setProjectClients] = useState<
    { projectId: string; clientName: string }[]
  >([]);
  const [clients, setClients] = useState<
    { name: string; currencies: string[] }[]
  >([]);
  const [invoices, setInvoices] = useState<StatementInvoiceRow[]>([]);
  const [payments, setPayments] = useState<StatementPaymentRow[]>([]);
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchContractorProjects();
      const mapped: StatementProject[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      setProjects(mapped);
      setProjectClients(
        rows.map((row) => ({
          projectId: row.id,
          clientName: row.client_name ?? "",
        })),
      );
      const discovered = clientsFromProjects(
        rows.map((row) => ({
          client_name: row.client_name,
          currency: row.currency,
        })),
      );
      setClients(discovered);
      setClientName((current) => current || (discovered[0]?.name ?? ""));
      setCurrency((current) => current || (discovered[0]?.currencies[0] ?? ""));

      if (rows.length === 0) {
        setInvoices([]);
        setPayments([]);
        return;
      }
      const ids = rows.map((row) => row.id);
      const [invoiceResult, paymentResult] = await Promise.all([
        supabase
          .from("project_invoices")
          .select("id, number, project_id, issued_at, currency, total, status")
          .in("project_id", ids),
        supabase
          .from("project_payments")
          .select("id, project_id, invoice_id, amount, currency, paid_at")
          .in("project_id", ids),
      ]);
      const failed = invoiceResult.error ?? paymentResult.error;
      if (failed) throw new Error(failed.message);
      setInvoices((invoiceResult.data ?? []) as StatementInvoiceRow[]);
      setPayments((paymentResult.data ?? []) as StatementPaymentRow[]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The statement could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const client = clients.find((row) => row.name === clientName) ?? null;
  const availableCurrencies = client?.currencies ?? [];

  const statement = useMemo(() => {
    if (!clientName) return null;
    // A client is only the person named on a project, so the statement covers
    // that client's projects and nothing else. Without this filter a payment on
    // another client's job would be credited to this one.
    const mine = new Set(
      projectClients
        .filter((row) => row.clientName === clientName)
        .map((row) => row.projectId),
    );
    return buildClientStatement({
      clientName,
      currency,
      projects: projects.filter((project) => mine.has(project.id)),
      invoices: invoices.filter((row) => mine.has(row.project_id)),
      payments: payments.filter((row) => mine.has(row.project_id)),
    });
  }, [clientName, currency, projects, invoices, payments, projectClients]);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Client statement"
        subtitle="Everything one client owes across every project, in date order, with a running balance."
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
          title="The statement could not be read"
          message={`${error}. No partial statement is shown, because a short balance reads as a client who paid.`}
        />
      ) : null}

      {!loading && !error && clients.length === 0 ? (
        <StateMessage
          type="empty"
          title="No named clients yet"
          message="Add a client name to a project and the statement can be built from its invoices and payments."
        />
      ) : null}

      {clients.length > 0 ? (
        <AdminCard>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Client
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={clientName}
                onChange={(event) => {
                  const next = event.target.value;
                  setClientName(next);
                  const found = clients.find((row) => row.name === next);
                  setCurrency(found?.currencies[0] ?? "");
                }}
              >
                {clients.map((row) => (
                  <option key={row.name} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Currency
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {availableCurrencies.map((code) => (
                  <option key={code || "unset"} value={code}>
                    {code || "Currency not set"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {statement ? (
            <div className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Project</th>
                      <th className="py-2 pr-4 font-medium">Reference</th>
                      <th className="py-2 pr-4 text-right font-medium">
                        Billed
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">
                        Received
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.lines.length === 0 ? (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={6}>
                          Nothing billed and nothing received in this currency.
                        </td>
                      </tr>
                    ) : (
                      statement.lines.map((line, index) => (
                        <tr
                          key={`${line.date}-${line.reference}-${index}`}
                          className="border-b border-border/60"
                        >
                          <td className="py-2 pr-4">{line.date}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {line.projectName}
                          </td>
                          <td className="py-2 pr-4">{line.reference}</td>
                          <td className="py-2 pr-4 text-right">
                            {line.debit ? money(line.debit, currency) : ""}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {line.credit ? money(line.credit, currency) : ""}
                          </td>
                          <td className="py-2 pr-4 text-right font-medium">
                            {money(line.balance, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  ["Billed", money(statement.invoiced, currency)],
                  ["Received", money(statement.paid, currency)],
                  [
                    "Closing balance",
                    money(statement.closingBalance, currency),
                  ],
                  ["Held on account", money(statement.heldOnAccount, currency)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              {statement.ignoredRows > 0 ? (
                <p className="mt-4 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {statement.ignoredRows} row
                  {statement.ignoredRows === 1 ? "" : "s"} in another currency
                  are not included in these figures.
                </p>
              ) : null}

              {statement.closingBalance < 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  The client is in credit by{" "}
                  {money(Math.abs(statement.closingBalance), currency)}.
                </p>
              ) : null}
            </div>
          ) : null}
        </AdminCard>
      ) : null}
    </div>
  );
}
