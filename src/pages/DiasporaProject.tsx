/**
 * Diaspora tracker: one project's workspace.
 *
 * Everyone sees the same facts; the actions offered differ by the viewer's role
 * on this project, and the database enforces the same split. A contractor can
 * submit an expense but cannot approve it, and the interface says so instead of
 * hiding the ledger.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageCheck,
  Receipt,
  ShieldAlert,
  Upload,
  Users,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import {
  decideExpense,
  decideMilestone,
  fetchActivity,
  fetchAttachments,
  fetchDailyReports,
  fetchDeliveries,
  fetchExpenses,
  fetchProjectMeta,
  inviteParticipant,
  recordDelivery,
  removeAttachment,
  signedEvidenceUrl,
  submitDailyReport,
  submitExpense,
  uploadEvidence,
} from "@/lib/diaspora/queries";
import {
  can,
  deliveryDiscrepancy,
  DENIAL_REASONS,
  formatMoney,
  ROLE_LABELS,
  summariseBudget,
  type ExpenseRecord,
  type Permission,
  type ProjectRole,
} from "@/lib/diaspora/permissions";

type Tab = "overview" | "reports" | "expenses" | "materials" | "milestones" | "team";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "reports", label: "Site reports" },
  { key: "expenses", label: "Expenses" },
  { key: "materials", label: "Materials" },
  { key: "milestones", label: "Milestones" },
  { key: "team", label: "Team" },
];

function Denied({ permission }: { permission: Permission }) {
  const reason = DENIAL_REASONS[permission];
  if (!reason) return null;
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
      {reason}
    </p>
  );
}

export default function DiasporaProject() {
  const { projectId = "" } = useParams();

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [stages, setStages] = useState<Record<string, unknown>[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, unknown>[]>([]);
  const [attachments, setAttachments] = useState<Record<string, unknown>[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [reportForm, setReportForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weather: "Clear",
    workers: "0",
    work: "",
    delays: "",
    next: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    name: "",
    amount: "",
    recipient: "",
    method: "Bank transfer",
    date: new Date().toISOString().slice(0, 10),
    receiptPath: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    description: "",
    ordered: "",
    delivered: "",
    accepted: "",
    supplier: "",
    date: new Date().toISOString().slice(0, 10),
    unitPrice: "",
  });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "site_manager" as ProjectRole });
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const meta = await fetchProjectMeta(projectId);
    const [r, e, d, a, act] = await Promise.all([
      fetchDailyReports(projectId),
      fetchExpenses(projectId),
      fetchDeliveries(projectId),
      fetchAttachments(projectId),
      fetchActivity(projectId),
    ]);
    setProject(meta.project ?? null);
    setStages(meta.stages);
    setMembers(meta.members);
    setReports(r);
    setExpenses(e as ExpenseRecord[]);
    setDeliveries(d);
    setAttachments(a);
    setActivity(act);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
    // The viewer's own role is derived from the same helper the database uses.
    import("@/lib/supabase").then(async ({ supabase }) => {
      const { data } = await supabase.rpc("project_role", { p_project: projectId });
      setMyRole((data as ProjectRole) ?? null);
    });
  }, [load, projectId]);

  useSeo({
    title: "Project workspace | FRELUX Diaspora Site Tracker",
    description:
      "Daily site reports, expenditure approvals, material deliveries, milestone decisions and private evidence for one construction project.",
    canonicalPath: `/diaspora-tracker/${projectId}`,
    noIndex: true,
  });

  const projectData = (project?.project_data ?? {}) as Record<string, unknown>;
  const budget = typeof projectData.budget === "number" ? projectData.budget : null;
  const currency = typeof projectData.currency === "string" ? projectData.currency : "NGN";
  const summary = useMemo(
    () => summariseBudget(budget, expenses, currency),
    [budget, expenses, currency],
  );

  const outstanding = useMemo(
    () => expenses.filter((e) => e.status === "submitted").length,
    [expenses],
  );
  const disputed = useMemo(
    () => stages.filter((s) => (s as { status?: string }).status === "submitted").length,
    [stages],
  );

  async function act(fn: () => Promise<{ error?: string }>, success: string) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(success);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading project…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm">
        <p>
          This project is not available to you. If you were invited, ask the owner to check the
          invitation email used, or to issue a new invitation.
        </p>
        <Link to="/diaspora-tracker" className="mt-4 inline-block underline">
          Back to your projects
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow={myRole ? ROLE_LABELS[myRole] : "Viewer"}
        title={String(project.name ?? "Project")}
        subtitle={`${String(project.project_type ?? "Project")} · ${currency} tracking${outstanding ? ` · ${outstanding} expense${outstanding === 1 ? "" : "s"} awaiting approval` : ""}`}
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Diaspora Site Tracker", path: "/diaspora-tracker" },
          { label: String(project.name ?? "Project") },
        ]}
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "default" : "outline"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Budget", value: formatMoney(summary.budget, currency) },
                { label: "Approved spend", value: formatMoney(summary.approved, currency) },
                { label: "Pending approval", value: formatMoney(summary.pending, currency) },
                {
                  label: summary.variance != null && summary.variance < 0 ? "Over budget" : "Remaining",
                  value: formatMoney(
                    summary.variance != null && summary.variance < 0
                      ? Math.abs(summary.variance)
                      : summary.remaining,
                    currency,
                  ),
                },
              ].map((tile) => (
                <div key={tile.label} className="rounded-xl border border-border/70 bg-card p-4">
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="mt-1 text-lg font-semibold">{tile.value}</p>
                </div>
              ))}
            </div>

            {summary.excluded_currencies.length > 0 && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                Expenses in {summary.excluded_currencies.join(", ")} are listed but not added to
                this total: FRELUX does not invent an exchange rate.
              </p>
            )}

            {summary.budget != null && (
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Approved spend against budget</span>
                  <span>{summary.committed_percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${summary.committed_percent}%` }}
                  />
                </div>
              </div>
            )}

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Camera aria-hidden="true" className="h-4 w-4" /> Recent evidence
              </h3>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photographs or documents yet.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {attachments.slice(0, 8).map((a) => (
                    <li key={String(a.id)} className="rounded-lg border border-border/70 bg-card p-2">
                      <button
                        className="w-full truncate text-left text-xs underline"
                        onClick={async () => {
                          const url = await signedEvidenceUrl(String(a.storage_path));
                          if (url) window.open(url, "_blank", "noopener,noreferrer");
                          else setError("That file could not be opened.");
                        }}
                      >
                        {String(a.file_name)}
                      </button>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {String(a.kind)}
                        {a.gps_lat != null ? " · GPS captured" : " · no GPS"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList aria-hidden="true" className="h-4 w-4" /> Latest site reports
              </h3>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No daily reports yet.</p>
              ) : (
                <ul className="space-y-2">
                  {reports.slice(0, 3).map((r) => (
                    <li key={String(r.id)} className="rounded-lg border border-border/70 bg-card p-3 text-sm">
                      <p className="font-medium">{String(r.log_date)} · {String(r.weather_condition ?? "weather not stated")}</p>
                      <p className="mt-1 text-muted-foreground">{String(r.work_performed ?? "")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(r.workers_count ?? 0)} workers · reported {new Date(String(r.created_at)).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Receipt aria-hidden="true" className="h-4 w-4" /> Activity
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {activity.length === 0 && <li>No activity recorded yet.</li>}
                {activity.slice(0, 12).map((a) => (
                  <li key={String(a.id)}>
                    {new Date(String(a.created_at)).toLocaleString()} · {String(a.action).replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-6">
            {can(myRole, "submit_daily_report") ? (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="text-muted-foreground">Report date</span>
                  <input
                    type="date"
                    value={reportForm.date}
                    onChange={(e) => setReportForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Weather</span>
                  <input
                    value={reportForm.weather}
                    onChange={(e) => setReportForm((f) => ({ ...f, weather: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Workers present</span>
                  <input
                    value={reportForm.workers}
                    onChange={(e) => setReportForm((f) => ({ ...f, workers: e.target.value }))}
                    inputMode="numeric"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Next day activities</span>
                  <input
                    value={reportForm.next}
                    onChange={(e) => setReportForm((f) => ({ ...f, next: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs sm:col-span-2">
                  <span className="text-muted-foreground">Work completed</span>
                  <textarea
                    value={reportForm.work}
                    onChange={(e) => setReportForm((f) => ({ ...f, work: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border/70 bg-background p-2 text-sm"
                  />
                </label>
                <label className="text-xs sm:col-span-2">
                  <span className="text-muted-foreground">Delays and issues</span>
                  <input
                    value={reportForm.delays}
                    onChange={(e) => setReportForm((f) => ({ ...f, delays: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <div className="sm:col-span-2">
                  <Button
                    disabled={busy || reportForm.work.trim().length < 3}
                    onClick={() =>
                      act(
                        () =>
                          submitDailyReport({
                            projectId,
                            logDate: reportForm.date,
                            weather: reportForm.weather,
                            workers: Number(reportForm.workers) || 0,
                            workPerformed: reportForm.work,
                            delays: reportForm.delays,
                            nextDay: reportForm.next,
                          }),
                        "Report submitted.",
                      )
                    }
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit daily report"}
                  </Button>
                </div>
              </div>
            ) : (
              <Denied permission="submit_daily_report" />
            )}

            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={String(r.id)} className="rounded-lg border border-border/70 bg-card p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{String(r.log_date)}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {String(r.status ?? "submitted")}
                    </span>
                  </div>
                  <p className="mt-1">{String(r.work_performed ?? "")}</p>
                  {r.next_day_activities ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Next: {String(r.next_day_activities)}
                    </p>
                  ) : null}
                  {r.delays_issues ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Issues: {String(r.delays_issues)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "expenses" && (
          <div className="space-y-6">
            {can(myRole, "submit_expense") && (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-3">
                <label className="text-xs">
                  <span className="text-muted-foreground">Category</span>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  >
                    {[
                      "Materials",
                      "Labour",
                      "Transportation",
                      "Equipment rental",
                      "Professional fees",
                      "Contractor payments",
                      "Miscellaneous",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Description</span>
                  <input
                    value={expenseForm.name}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Amount ({currency})</span>
                  <input
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Recipient</span>
                  <input
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, recipient: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Payment date</span>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    disabled={busy || !expenseForm.name.trim() || !(Number(expenseForm.amount) > 0)}
                    onClick={() =>
                      act(
                        () =>
                          submitExpense({
                            projectId,
                            category: expenseForm.category,
                            name: expenseForm.name,
                            amount: Number(expenseForm.amount),
                            currency,
                            spentAt: expenseForm.date,
                            recipient: expenseForm.recipient,
                            paymentMethod: expenseForm.method,
                          }),
                        "Expense submitted for approval.",
                      )
                    }
                  >
                    Submit expense
                  </Button>
                </div>
              </div>
            )}
            {!can(myRole, "approve_expense") && <Denied permission="approve_expense" />}

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        No expenditure recorded yet.
                      </td>
                    </tr>
                  )}
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-xs">{e.spent_at}</td>
                      <td className="px-3 py-2">
                        {e.name}
                        {e.receipt_path ? (
                          <span className="ml-2 text-[11px] text-muted-foreground">receipt attached</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs">{e.category}</td>
                      <td className="px-3 py-2">{formatMoney(Number(e.amount), e.currency)}</td>
                      <td className="px-3 py-2 text-xs">{e.status}</td>
                      <td className="px-3 py-2">
                        {e.status === "submitted" && can(myRole, "approve_expense") ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () => decideExpense({ id: e.id, projectId, decision: "approved" }),
                                  "Expense approved.",
                                )
                              }
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () => decideExpense({ id: e.id, projectId, decision: "rejected" }),
                                  "Expense rejected.",
                                )
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {e.decision_note ?? "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "materials" && (
          <div className="space-y-6">
            {can(myRole, "record_materials") && (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-4">
                <label className="text-xs sm:col-span-2">
                  <span className="text-muted-foreground">Material</span>
                  <input
                    value={deliveryForm.description}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, description: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Ordered</span>
                  <input
                    value={deliveryForm.ordered}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, ordered: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Delivered</span>
                  <input
                    value={deliveryForm.delivered}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, delivered: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Accepted</span>
                  <input
                    value={deliveryForm.accepted}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, accepted: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Supplier</span>
                  <input
                    value={deliveryForm.supplier}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, supplier: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Unit price (optional)</span>
                  <input
                    value={deliveryForm.unitPrice}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, unitPrice: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    disabled={busy || !deliveryForm.description.trim()}
                    onClick={() =>
                      act(
                        () =>
                          recordDelivery({
                            projectId,
                            description: deliveryForm.description,
                            quantityOrdered: Number(deliveryForm.ordered) || 0,
                            quantityDelivered: Number(deliveryForm.delivered) || 0,
                            quantityAccepted: Number(deliveryForm.accepted) || 0,
                            supplier: deliveryForm.supplier,
                            deliveryDate: deliveryForm.date,
                            unitPrice: deliveryForm.unitPrice ? Number(deliveryForm.unitPrice) : null,
                          }),
                        "Delivery recorded.",
                      )
                    }
                  >
                    <PackageCheck className="mr-1 h-4 w-4" /> Record delivery
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Delivery</th>
                    <th className="px-3 py-2 font-medium">Ordered</th>
                    <th className="px-3 py-2 font-medium">Delivered</th>
                    <th className="px-3 py-2 font-medium">Accepted</th>
                    <th className="px-3 py-2 font-medium">Discrepancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No deliveries recorded yet.
                      </td>
                    </tr>
                  )}
                  {deliveries.map((d) => {
                    const check = deliveryDiscrepancy({
                      quantity_ordered: Number(d.quantity_ordered),
                      quantity_delivered: Number(d.quantity_delivered),
                      quantity_accepted: Number(d.quantity_accepted),
                    });
                    return (
                      <tr key={String(d.id)}>
                        <td className="px-3 py-2">
                          {String(d.description)}
                          <span className="block text-[11px] text-muted-foreground">
                            {String(d.delivery_date)} · {String(d.supplier ?? "supplier not stated")}
                          </span>
                        </td>
                        <td className="px-3 py-2">{String(d.quantity_ordered)}</td>
                        <td className="px-3 py-2">{String(d.quantity_delivered)}</td>
                        <td className="px-3 py-2">{String(d.quantity_accepted)}</td>
                        <td className="px-3 py-2 text-xs">
                          {check.has_issue ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {check.shortfall > 0 ? `${check.shortfall} short` : ""}
                              {check.shortfall > 0 && check.rejected > 0 ? ", " : ""}
                              {check.rejected > 0 ? `${check.rejected} rejected` : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "milestones" && (
          <ul className="space-y-2">
            {stages.length === 0 && (
              <li className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                This project has no milestones defined yet.
              </li>
            )}
            {stages.map((s) => {
              const status = String((s as { status?: string }).status ?? "pending");
              return (
                <li key={String(s.id)} className="rounded-lg border border-border/70 bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{String(s.stage_name)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {status === "pending" ? "Not submitted" : status}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {can(myRole, "update_milestone") && status !== "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            act(
                              () =>
                                decideMilestone({
                                  id: String(s.id),
                                  projectId,
                                  decision: "submitted",
                                }),
                              "Milestone submitted for a decision.",
                            )
                          }
                        >
                          Mark submitted
                        </Button>
                      )}
                      {can(myRole, "decide_milestone") && status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  decideMilestone({
                                    id: String(s.id),
                                    projectId,
                                    decision: "approved",
                                  }),
                                "Milestone approved.",
                              )
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  decideMilestone({
                                    id: String(s.id),
                                    projectId,
                                    decision: "disputed",
                                  }),
                                "Milestone disputed.",
                              )
                            }
                          >
                            Dispute
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {disputed > 0 && (
              <li className="text-xs text-muted-foreground">
                {disputed} milestone{disputed === 1 ? "" : "s"} awaiting your decision.
              </li>
            )}
          </ul>
        )}

        {tab === "team" && (
          <div className="space-y-6">
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
              {members.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">No participants recorded yet.</li>
              )}
              {members.map((m) => (
                <li key={String(m.user_id)} className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate text-xs text-muted-foreground">{String(m.user_id)}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                    {ROLE_LABELS[String(m.role) as ProjectRole] ?? String(m.role)}
                  </span>
                </li>
              ))}
            </ul>

            {can(myRole, "invite_participants") ? (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-3">
                <label className="text-xs sm:col-span-2">
                  <span className="text-muted-foreground">Email of the person you are inviting</span>
                  <input
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted-foreground">Role on this project</span>
                  <select
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm((f) => ({ ...f, role: e.target.value as ProjectRole }))
                    }
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  >
                    <option value="site_manager">Site manager</option>
                    <option value="contractor">Contractor</option>
                    <option value="inspector">Inspector</option>
                    <option value="owner">Co-owner</option>
                  </select>
                </label>
                <div className="sm:col-span-3">
                  <Button
                    disabled={busy || !inviteForm.email.includes("@")}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const { link, error: inviteError } = await inviteParticipant({
                        projectId,
                        email: inviteForm.email,
                        role: inviteForm.role,
                      });
                      setBusy(false);
                      if (inviteError || !link) {
                        setError(inviteError ?? "The invitation could not be created.");
                        return;
                      }
                      setInviteLink(link);
                      setNotice("Invitation created. It expires in 72 hours.");
                    }}
                  >
                    <Users className="mr-1 h-4 w-4" /> Create invitation
                  </Button>
                </div>
                {inviteLink && (
                  <div className="sm:col-span-3">
                    <p className="text-xs text-muted-foreground">
                      Share this link privately. It can be used once, by the invited email
                      address, and expires in 72 hours.
                    </p>
                    <code className="mt-1 block overflow-x-auto rounded bg-muted p-2 text-[11px]">
                      {inviteLink}
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <Denied permission="invite_participants" />
            )}
          </div>
        )}

        {attachments.length > 0 && tab === "overview" && (
          <p className="text-xs text-muted-foreground">
            <Upload aria-hidden="true" className="mr-1 inline h-3 w-3" />
            Evidence is private. Opening a file generates a link valid for five minutes.
          </p>
        )}
      </div>
    </>
  );
}
