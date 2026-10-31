/**
 * Construction intelligence dashboard.
 *
 * One workspace over seven existing systems. The page renders what
 * `loadIntelligence` derived and nothing more: every figure has a source, every
 * action links to the tool that owns it, and a source that fails to load is
 * named on screen instead of quietly showing zero.
 *
 * Which sections you see is decided by the lenses your data supports
 * (homeowner, contractor, site manager, quantity surveyor, engineer, supplier,
 * enterprise administrator), not by a menu everyone shares.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Switch } from "@/components/ui/shadcn/switch";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import {
  PERSONA_LABELS,
  type IntelligenceSnapshot,
  type NotificationPreferences,
  type Persona,
} from "@/lib/intelligence/types";
import {
  sectionsFor,
  upcomingMilestones,
  recentBoqDocs,
  milestoneProgress,
} from "@/lib/intelligence/derive";
import {
  loadIntelligence,
  savePreferences,
  saveEstimateRevision,
  logReportRun,
} from "@/lib/intelligence/queries";
import {
  buildReport,
  downloadReportPdf,
  downloadReportXlsx,
  REPORT_LABELS,
  type ReportType,
} from "@/lib/intelligence/reports";

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  prices: "Price intelligence",
  costs: "Cost intelligence",
  progress: "Progress",
  boq: "BOQ",
  suppliers: "Suppliers",
  alerts: "Alerts",
};

function money(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return "—";
  return formatByCode(amount, currency || "XXX", { decimals: 0 });
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warn"
            ? "text-amber-600"
            : tone === "good"
              ? "text-emerald-600"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

export default function IntelligenceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState<Persona | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  useSeo({
    title: "Construction intelligence dashboard",
    description:
      "Material prices, estimate revisions, expenditure, site progress, BOQ documents and supplier activity in one workspace.",
    canonicalPath: "/intelligence",
    noIndex: true,
  });

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const { snapshot: next, error: loadError } = await loadIntelligence({
      force,
    });
    setSnapshot(next);
    setPrefs(next?.preferences ?? null);
    setLens((current) => current ?? next?.primaryPersona ?? null);
    setError(loadError);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
    if (!authLoading && !user) {
      setLoading(false);
      setError("Sign in to open the intelligence dashboard.");
    }
  }, [authLoading, user, load]);

  const persona = lens ?? snapshot?.primaryPersona ?? "homeowner";
  const sections = useMemo(() => sectionsFor(persona), [persona]);
  const milestones = useMemo(
    () => upcomingMilestones(snapshot?.milestones ?? []),
    [snapshot],
  );
  const boqDocs = useMemo(() => recentBoqDocs(snapshot?.boq ?? []), [snapshot]);
  const currency = snapshot?.currency ?? "NGN";

  const exportReport = async (type: ReportType, format: "pdf" | "xlsx") => {
    if (!snapshot) return;
    setBusy(`${type}-${format}`);
    const table = buildReport(type, snapshot);
    try {
      if (format === "pdf")
        await downloadReportPdf(table, persona.replace(/_/g, "-"));
      else downloadReportXlsx(table, persona.replace(/_/g, "-"));
      await logReportRun({
        userId: snapshot.userId,
        reportType: type,
        format,
        rowCount: table.rowCount,
      });
      setNotice(
        `${table.title} exported as ${format.toUpperCase()} (${table.rowCount} rows).`,
      );
    } catch (exportError) {
      setNotice(
        exportError instanceof Error
          ? exportError.message
          : "The report could not be built.",
      );
    } finally {
      setBusy(null);
    }
  };

  const updatePreference = async (patch: Partial<NotificationPreferences>) => {
    if (!snapshot || !prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error: saveError } = await savePreferences(snapshot.userId, next);
    setNotice(
      saveError
        ? `Alert settings not saved: ${saveError}`
        : "Alert settings saved.",
    );
    if (!saveError) void load(true);
  };

  const appendRevision = async (projectId: string) => {
    if (!snapshot) return;
    const project = snapshot.projects.find((p) => p.id === projectId);
    if (!project) return;
    setBusy(`revision-${projectId}`);
    const { error: saveError } = await saveEstimateRevision({
      projectId,
      userId: snapshot.userId,
      label: `Revision ${snapshot.revisions.filter((r) => r.projectId === projectId).length + 1}`,
      source: "manual",
      materials: 0,
      labour: 0,
      transport: 0,
      misc: 0,
      markup: 0,
      currency: project.currency,
      note: revisionNote || "Recorded from the intelligence dashboard.",
    });
    setBusy(null);
    setRevisionFor(null);
    setRevisionNote("");
    setNotice(
      saveError
        ? `Revision not recorded: ${saveError}`
        : "Revision recorded. The previous estimate is unchanged in the ledger.",
    );
    if (!saveError) void load(true);
  };

  if (authLoading || (loading && !snapshot)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Construction intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "The dashboard could not be opened."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const totals = snapshot.totals;
  const displayedBudget = totals.estimatedTotal;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Construction intelligence
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {PERSONA_LABELS[persona]} workspace
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Prices, costs, progress, BOQ and suppliers in one place. Figures
            come from the systems that own them; nothing here is typed twice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.personas.length > 1 ? (
            <div className="flex flex-wrap gap-1 rounded-lg border p-1">
              {snapshot.personas.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLens(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    persona === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {PERSONA_LABELS[option]}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}

      {snapshot.degraded.length ? (
        <div className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-medium">Some sources could not be read:</span>{" "}
          {snapshot.degraded.join("; ")}. Figures below cover what loaded.
        </div>
      ) : null}

      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-lg border p-1">
        {sections.map((section) => (
          <a
            key={section}
            href={`#${section}`}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {SECTION_LABELS[section]}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-10">
        {/* ── Overview ─────────────────────────────────────── */}
        <section id="overview" className="scroll-mt-24">
          <h2 className="text-base font-semibold">Portfolio</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Active projects"
              value={String(totals.activeProjects)}
              hint={`${snapshot.projects.length} including completed`}
            />
            <Stat
              label="Estimated cost"
              value={money(displayedBudget, currency)}
              hint="Materials, labour, transport, misc, markup"
            />
            <Stat
              label="Approved spend"
              value={money(totals.approvedSpend, currency)}
              hint={`${money(totals.pendingSpend, currency)} pending approval`}
            />
            <Stat
              label="Remaining budget"
              value={money(totals.remainingBudget, currency)}
              tone={totals.remainingBudget < 0 ? "warn" : "good"}
              hint={
                totals.overrunTotal > 0
                  ? `${money(totals.overrunTotal, currency)} over budget`
                  : "Within budget"
              }
            />
          </div>
          {totals.mixedCurrency ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Projects span several currencies, so the figures above are{" "}
              {currency} only. Open a project for its own currency.
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Price movements</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {snapshot.prices.materialCount} materials tracked ·{" "}
                {snapshot.prices.pendingSubmissions} submission(s) awaiting
                review
              </p>
              <ul className="mt-3 space-y-2">
                {snapshot.prices.moves.slice(0, 4).map((move) => (
                  <li
                    key={`${move.materialSlug}-${move.city}-top`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{move.materialName}</span>
                    <span
                      className={`flex items-center gap-0.5 tabular-nums ${
                        move.changePct > 0
                          ? "text-amber-600"
                          : move.changePct < 0
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {move.changePct > 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : move.changePct < 0 ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : null}
                      {move.changePct.toFixed(1)}%
                    </span>
                  </li>
                ))}
                {!snapshot.prices.moves.length ? (
                  <li className="text-xs text-muted-foreground">
                    No price observations in your market yet.
                  </li>
                ) : null}
              </ul>
              <Link
                to="/price-index"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open the price index
              </Link>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pending approvals</h3>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {snapshot.approvals.length} item(s) waiting on a decision.
              </p>
              <ul className="mt-3 space-y-2">
                {snapshot.approvals.slice(0, 4).map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="text-sm">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {item.projectName}
                    </span>
                    {item.amount ? (
                      <span className="ml-1 tabular-nums text-muted-foreground">
                        {money(item.amount, item.currency)}
                      </span>
                    ) : null}
                  </li>
                ))}
                {!snapshot.approvals.length ? (
                  <li className="text-xs text-muted-foreground">
                    Nothing outstanding.
                  </li>
                ) : null}
              </ul>
              <Link
                to="/site-tracker"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                Review in the site tracker
              </Link>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Upcoming milestones</h3>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {milestoneProgress(snapshot.milestones)}% of recorded milestones
                are approved.
              </p>
              <ul className="mt-3 space-y-2">
                {milestones.slice(0, 4).map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {milestone.stageName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {milestone.projectName}
                      </span>
                    </span>
                    {milestone.delayed ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        past end date
                      </span>
                    ) : null}
                  </li>
                ))}
                {!milestones.length ? (
                  <li className="text-xs text-muted-foreground">
                    No open milestones.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Recent site reports</h3>
              <ul className="mt-3 space-y-2">
                {snapshot.reports.slice(0, 4).map((report) => (
                  <li key={report.id} className="text-sm">
                    <span className="font-medium">{report.projectName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {report.logDate ?? report.createdAt.slice(0, 10)}
                    </span>
                    <p className="truncate text-xs text-muted-foreground">
                      {report.workPerformed ?? "No description recorded."}
                    </p>
                  </li>
                ))}
                {!snapshot.reports.length ? (
                  <li className="text-xs text-muted-foreground">
                    No site reports yet.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Recent BOQ documents</h3>
              <ul className="mt-3 space-y-2">
                {boqDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {doc.title}
                      <span className="text-muted-foreground">
                        {" "}
                        · R{doc.revision}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {money(doc.total, doc.currency)}
                    </span>
                  </li>
                ))}
                {!boqDocs.length ? (
                  <li className="text-xs text-muted-foreground">
                    No BOQ documents yet.
                  </li>
                ) : null}
              </ul>
              <Link
                to="/boq-studio"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open the BOQ studio
              </Link>
            </div>
          </div>
        </section>

        {/* ── Prices ───────────────────────────────────────── */}
        {sections.includes("prices") ? (
          <section id="prices" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  Material price intelligence
                </h2>
                <p className="max-w-2xl text-xs text-muted-foreground">
                  {snapshot.prices.note}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("material_price", "pdf")}
                  disabled={busy !== null}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("material_price", "xlsx")}
                  disabled={busy !== null}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
                </Button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2 text-right">Current</th>
                    <th className="px-3 py-2 text-right">Change</th>
                    <th className="px-3 py-2">Observed</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.prices.moves.map((move) => (
                    <tr
                      key={`${move.materialSlug}-${move.city}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{move.materialName}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {move.city ?? "National"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(move.currentPrice, move.currency)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          move.changePct > 0
                            ? "text-amber-600"
                            : move.changePct < 0
                              ? "text-emerald-600"
                              : ""
                        }`}
                      >
                        {move.changePct === 0
                          ? "—"
                          : `${move.changePct > 0 ? "+" : ""}${move.changePct.toFixed(1)}%`}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {move.observedAt ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {move.source}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {move.verification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!snapshot.prices.moves.length ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No price observations for your market yet. Prices appear once
                  a submission is approved in the price index.
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.prices.cities.map((city) => (
                <div key={city.city} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                    {city.city}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Median {money(city.medianPrice, city.currency)} across{" "}
                    {city.materialCount} materials ·{" "}
                    {city.changePct === 0
                      ? "flat"
                      : `${city.changePct > 0 ? "+" : ""}${city.changePct.toFixed(1)}%`}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Sourcing and
                verification
              </p>
              <p className="mt-1">
                Every row names the source and how far the price has been
                verified. A registered supplier is not automatically a verified
                one; compare verification levels before trusting a number.
              </p>
              <Link
                to="/suppliers"
                className="mt-2 inline-block font-medium text-primary hover:underline"
              >
                Check supplier verification levels
              </Link>
            </div>
          </section>
        ) : null}

        {/* ── Costs ────────────────────────────────────────── */}
        {sections.includes("costs") ? (
          <section id="costs" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  Project cost intelligence
                </h2>
                <p className="text-xs text-muted-foreground">
                  Original estimate, latest revision and money actually spent.
                  Revisions are appended, never overwritten.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("project_cost", "pdf")}
                  disabled={busy !== null}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Cost PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("project_cost", "xlsx")}
                  disabled={busy !== null}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Cost Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("expenditure", "xlsx")}
                  disabled={busy !== null}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Expenditure
                </Button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2 text-right">Original</th>
                    <th className="px-3 py-2 text-right">Latest</th>
                    <th className="px-3 py-2 text-right">Drift</th>
                    <th className="px-3 py-2 text-right">Spent</th>
                    <th className="px-3 py-2 text-right">Unspent</th>
                    <th className="px-3 py-2 text-right">Revisions</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {snapshot.comparisons.map((row) => (
                    <tr key={row.projectId} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          to={`/site-tracker/${row.projectId}`}
                          className="font-medium hover:underline"
                        >
                          {row.projectName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.originalTotal, row.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.latestTotal, row.currency)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          row.estimateDrift > 0 ? "text-amber-600" : ""
                        }`}
                      >
                        {row.estimateDrift === 0
                          ? "—"
                          : money(row.estimateDrift, row.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.actualSpend, row.currency)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          row.unspentAgainstLatest < 0 ? "text-amber-600" : ""
                        }`}
                      >
                        {money(row.unspentAgainstLatest, row.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {row.revisionCount}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRevisionFor(
                              revisionFor === row.projectId
                                ? null
                                : row.projectId,
                            )
                          }
                        >
                          Record revision
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!snapshot.comparisons.length ? (
                <Empty
                  title="No projects yet"
                  body="Create a project in the site tracker and its estimate, spend and revisions appear here."
                />
              ) : null}
            </div>

            {revisionFor ? (
              <div className="mt-3 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Appending a revision keeps every earlier total in the ledger.
                  Adjust the project costs in the site tracker first if the
                  numbers changed.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={revisionNote}
                    onChange={(event) => setRevisionNote(event.target.value)}
                    placeholder="Why did this estimate change?"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => void appendRevision(revisionFor)}
                    disabled={busy !== null}
                  >
                    {busy ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Append revision
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border">
              <p className="border-b px-3 py-2 text-sm font-medium">
                Revision ledger
              </p>
              <ul className="divide-y">
                {snapshot.revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">
                        {revision.projectName}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · R{revision.revisionNo} {revision.label} ·{" "}
                        {revision.source}
                      </span>
                      {revision.note ? (
                        <span className="block text-xs text-muted-foreground">
                          {revision.note}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {money(revision.total, revision.currency)}
                    </span>
                  </li>
                ))}
                {!snapshot.revisions.length ? (
                  <li className="px-3 py-4 text-xs text-muted-foreground">
                    No revisions recorded. The project's original estimate
                    stands as revision zero.
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ── Progress ─────────────────────────────────────── */}
        {sections.includes("progress") ? (
          <section id="progress" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  Construction progress
                </h2>
                <p className="text-xs text-muted-foreground">
                  From the diaspora site tracker: milestones, site reports and
                  material deliveries.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportReport("progress", "pdf")}
                disabled={busy !== null}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Progress PDF
              </Button>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  Milestones
                </p>
                <ul className="divide-y">
                  {snapshot.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {milestone.stageName}
                        <span className="text-muted-foreground">
                          {" "}
                          · {milestone.projectName}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          ["approved", "completed"].includes(
                            milestone.status.toLowerCase(),
                          )
                            ? "bg-emerald-100 text-emerald-800"
                            : milestone.delayed
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {milestone.status}
                      </span>
                    </li>
                  ))}
                  {!snapshot.milestones.length ? (
                    <li className="px-3 py-4 text-xs text-muted-foreground">
                      No milestones recorded yet.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  Material deliveries
                </p>
                <ul className="divide-y">
                  {snapshot.deliveries.map((delivery) => (
                    <li key={delivery.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {delivery.description}
                          <span className="text-muted-foreground">
                            {" "}
                            · {delivery.projectName}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {delivery.quantityAccepted}/{delivery.quantityOrdered}{" "}
                          {delivery.unit}
                        </span>
                      </div>
                      {delivery.discrepancy !== 0 ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />{" "}
                          {delivery.discrepancy} {delivery.unit} not accepted
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {!snapshot.deliveries.length ? (
                    <li className="px-3 py-4 text-xs text-muted-foreground">
                      No deliveries recorded yet.
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="mt-3 rounded-lg border">
              <p className="border-b px-3 py-2 text-sm font-medium">
                Latest site reports
              </p>
              <ul className="divide-y">
                {snapshot.reports.map((report) => (
                  <li key={report.id} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{report.projectName}</span>
                      <span className="text-xs text-muted-foreground">
                        {report.logDate ?? report.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {report.workPerformed ?? "No work description recorded."}
                      {report.workersCount !== null
                        ? ` · ${report.workersCount} workers`
                        : ""}
                    </p>
                  </li>
                ))}
                {!snapshot.reports.length ? (
                  <li className="px-3 py-4 text-xs text-muted-foreground">
                    No daily reports yet. The site team submits them in the
                    tracker.
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ── BOQ ──────────────────────────────────────────── */}
        {sections.includes("boq") ? (
          <section id="boq" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Bills of quantities</h2>
                <p className="text-xs text-muted-foreground">
                  Documents from the BOQ studio, with revision and total. Open
                  one to edit or compare revisions.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport("boq_summary", "xlsx")}
                  disabled={busy !== null}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> BOQ summary
                </Button>
                <Button asChild size="sm">
                  <Link to="/boq-studio">
                    <Package className="mr-1.5 h-3.5 w-3.5" /> New BOQ
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Rev</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.boq.map((doc) => (
                    <tr key={doc.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          to={`/boq-studio/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {doc.quoteRef}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {doc.status}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {doc.revision}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(doc.total, doc.currency)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {doc.updatedAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!snapshot.boq.length ? (
                <Empty
                  title="No BOQ documents yet"
                  body="Build one in the BOQ studio; it appears here with its revision and total, ready to export."
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── Suppliers ────────────────────────────────────── */}
        {sections.includes("suppliers") ? (
          <section id="suppliers" className="scroll-mt-24">
            <h2 className="text-base font-semibold">Supplier activity</h2>
            <p className="text-xs text-muted-foreground">
              From the supplier marketplace and procurement workflow: saved
              suppliers, quotations and orders.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Saved suppliers"
                value={String(snapshot.suppliers.savedSuppliers)}
              />
              <Stat
                label="Open requests"
                value={String(snapshot.suppliers.openRequests)}
                hint={`${snapshot.suppliers.awaitingQuotes} awaiting quotes`}
              />
              <Stat
                label="Quotations"
                value={String(snapshot.suppliers.quotesReceived)}
              />
              <Stat
                label="Active orders"
                value={String(snapshot.suppliers.activeOrders)}
                hint={`${snapshot.suppliers.deliveredOrders} delivered`}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  Recent quotations
                </p>
                <ul className="divide-y">
                  {snapshot.suppliers.recentQuotes.map((quote) => (
                    <li
                      key={quote.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {quote.supplierName}
                        <span className="text-muted-foreground">
                          {" "}
                          · {quote.requestTitle}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {money(quote.total, quote.currency)}
                        {quote.leadTimeDays !== null
                          ? ` · ${quote.leadTimeDays}d`
                          : ""}
                      </span>
                    </li>
                  ))}
                  {!snapshot.suppliers.recentQuotes.length ? (
                    <li className="px-3 py-4 text-xs text-muted-foreground">
                      No quotations received yet.
                    </li>
                  ) : null}
                </ul>
                <div className="border-t px-3 py-2">
                  <Link
                    to="/procurement"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open procurement
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  Delivery tracking
                </p>
                <ul className="divide-y">
                  {snapshot.suppliers.orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {order.reference}
                        <span className="text-muted-foreground">
                          {" "}
                          · {order.supplierName ?? "Supplier"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {order.status}
                      </span>
                    </li>
                  ))}
                  {!snapshot.suppliers.orders.length ? (
                    <li className="px-3 py-4 text-xs text-muted-foreground">
                      No orders yet.
                    </li>
                  ) : null}
                </ul>
                <div className="border-t px-3 py-2">
                  <Link
                    to="/suppliers"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Compare suppliers
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Alerts ───────────────────────────────────────── */}
        {sections.includes("alerts") ? (
          <section id="alerts" className="scroll-mt-24">
            <h2 className="text-base font-semibold">
              Alerts and notifications
            </h2>
            <p className="text-xs text-muted-foreground">
              Alerts come from live records, so they clear themselves when the
              underlying figure changes.
            </p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  Open alerts
                </p>
                <ul className="divide-y">
                  {snapshot.alerts.map((alert) => (
                    <li key={alert.key} className="px-3 py-2 text-sm">
                      <div className="flex items-start gap-2">
                        {alert.severity === "critical" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        ) : alert.severity === "warning" ? (
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.detail}
                          </p>
                          {alert.href ? (
                            <Link
                              to={alert.href}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Open
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                  {!snapshot.alerts.length ? (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Nothing needs your attention right now.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-sm font-medium">
                  What you are told about
                </p>
                <div className="space-y-3 px-3 py-3">
                  {(
                    [
                      ["price_alerts", "Material price changes"],
                      ["budget_alerts", "Budget overruns"],
                      ["approval_alerts", "Pending approvals"],
                      ["milestone_alerts", "Delayed milestones"],
                      ["report_alerts", "New site reports"],
                      ["procurement_alerts", "Procurement updates"],
                    ] as [keyof NotificationPreferences, string][]
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span>{label}</span>
                      <Switch
                        checked={Boolean(prefs?.[key])}
                        onCheckedChange={(checked) =>
                          void updatePreference({
                            [key]: checked,
                          } as Partial<NotificationPreferences>)
                        }
                      />
                    </label>
                  ))}
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>Price alert threshold</span>
                    <select
                      value={prefs?.price_move_threshold ?? 5}
                      onChange={(event) =>
                        void updatePreference({
                          price_move_threshold: Number(event.target.value),
                        })
                      }
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                    >
                      {[2, 5, 10, 15, 25].map((value) => (
                        <option key={value} value={value}>
                          {value}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>Delivery of alerts</span>
                    <select
                      value={prefs?.digest_frequency ?? "instant"}
                      onChange={(event) =>
                        void updatePreference({
                          digest_frequency: event.target
                            .value as NotificationPreferences["digest_frequency"],
                        })
                      }
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                    >
                      <option value="instant">As it happens</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                      <option value="off">Turn off</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Reports ──────────────────────────────────────── */}
        <section id="reports" className="scroll-mt-24">
          <h2 className="text-base font-semibold">Reports</h2>
          <p className="text-xs text-muted-foreground">
            Any report can be a PDF or a workbook. An export records only that
            it ran, never its contents.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(REPORT_LABELS) as ReportType[]).map((type) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <span className="text-sm">{REPORT_LABELS[type]}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void exportReport(type, "pdf")}
                    disabled={busy !== null}
                  >
                    {busy === `${type}-pdf` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "PDF"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void exportReport(type, "xlsx")}
                    disabled={busy !== null}
                  >
                    {busy === `${type}-xlsx` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Excel"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {snapshot.isAdmin ? (
          <section id="platform" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-base font-semibold">Platform analytics</h2>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/intelligence">Full admin analytics</Link>
              </Button>
            </div>
            {snapshot.admin ? (
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  label="Registered users"
                  value={String(snapshot.admin.users.total)}
                  hint={`${snapshot.admin.users.newThisMonth} new this month`}
                />
                <Stat
                  label="Active projects"
                  value={String(snapshot.admin.projects.active)}
                  hint={`${snapshot.admin.projects.total} total`}
                />
                <Stat
                  label="Suppliers"
                  value={String(snapshot.admin.suppliers.total)}
                  hint={`${snapshot.admin.suppliers.verified} verified`}
                />
                <Stat
                  label="Marketplace orders"
                  value={String(snapshot.admin.marketplace.orders)}
                  hint={`${snapshot.admin.marketplace.quotes} quotations`}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          <p>
            Figures are read live from the FRELUX systems that own them. Prices
            are observations, not quotations. Approved expenditure excludes
            pending submissions until an authorised person approves them.
          </p>
          <p className="mt-1">
            Generated {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </footer>
      </div>
    </div>
  );
}
