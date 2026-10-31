import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useAuth } from "@/lib/auth";
import { fetchMyClientEstimates } from "@/lib/project-intelligence";
import {
  daysSince,
  daysUntilExpiry,
  filterQuotes,
  needsFollowUp,
  STAGE_LABELS,
  STAGE_ORDER,
  summariseQuotes,
  type QuoteStage,
  type StageFilter,
} from "@/lib/estimates/pipeline";
import { isEditable } from "@/lib/estimates/totals";
import { getSafeError } from "@/lib/safeError";
import type { DbClientEstimate } from "@/types/database";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";

/**
 * Where a contractor's quotes stand. The editor builds a quote and the client
 * view answers it; this is the page that says what is still open, what came
 * back, and which ones have gone quiet long enough to warrant a call.
 */

function money(value: number, currency: string): string {
  const code = (currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString("en")}`;
  }
}

const STAGE_TONE: Record<QuoteStage, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  viewed:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  approved:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  changes_requested:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  expired: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  icon: typeof FileText;
}

function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function QuoteRow({ quote }: { quote: DbClientEstimate }) {
  const age = daysSince(quote.created_at);
  const remaining = daysUntilExpiry(quote);
  const quiet = needsFollowUp(quote);

  const timing =
    remaining !== null && remaining <= 0
      ? "Validity has passed"
      : remaining !== null && remaining <= 7
        ? `${remaining} day${remaining === 1 ? "" : "s"} of validity left`
        : age !== null
          ? `Raised ${age} day${age === 1 ? "" : "s"} ago`
          : null;

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {quote.estimate_number}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_TONE[quote.status]}`}
            >
              {STAGE_LABELS[quote.status]}
            </span>
            {quiet ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Worth a call
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {quote.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quote.client_name ? `${quote.client_name}` : "No client named"}
            {timing ? ` · ${timing}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {money(quote.grand_total, quote.currency)}
          </span>
          <div className="flex items-center gap-2">
            {quote.share_token ? (
              <Link
                to={`/estimate/${quote.share_token}`}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open quote
              </Link>
            ) : null}
            {isEditable(quote.status) ? (
              <Link
                to={`/project-workspace/${quote.project_id}/client-estimate/${quote.id}/edit`}
                aria-label={`Edit quote ${quote.estimate_number}`}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Edit
              </Link>
            ) : null}
            <Link
              to={`/project-workspace/${quote.project_id}`}
              aria-label={`Open the project for quote ${quote.estimate_number}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function QuotePipeline() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<DbClientEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StageFilter>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyClientEstimates();
      setQuotes(rows);
    } catch (err) {
      setError(getSafeError(err, "Your quotes could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  const summary = useMemo(() => summariseQuotes(quotes), [quotes]);
  const visible = useMemo(
    () => filterQuotes(quotes, { stage, search }),
    [quotes, stage, search],
  );

  const filteredOpen = summary.byStage.sent + summary.byStage.viewed;
  const filters: Array<{ key: StageFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: summary.totalQuotes },
    { key: "open", label: "Open", count: filteredOpen },
    ...STAGE_ORDER.map((s) => ({
      key: s as StageFilter,
      label: STAGE_LABELS[s],
      count: summary.byStage[s],
    })),
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Quotes"
        subtitle="What you have sent, what came back, and what needs chasing."
      />

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your quotes
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : summary.totalQuotes === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileText
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            No quotes yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Build an estimate in a project and send it to the client. Once it is
            out, this page tracks whether they opened it, approved it, or asked
            for changes.
          </p>
          <Link
            to="/project-workspace"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open your projects
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Send}
              label="Open"
              value={currenciesLine(summary.currencies, "open")}
              detail={`${summary.openCount} quote${summary.openCount === 1 ? "" : "s"} with a client`}
            />
            <StatCard
              icon={CheckCircle2}
              label="Accepted"
              value={currenciesLine(summary.currencies, "approved")}
              detail={`${summary.acceptedCount} approved`}
            />
            <StatCard
              icon={Clock}
              label="Acceptance rate"
              value={
                summary.acceptanceRate === null
                  ? "Not decided yet"
                  : `${Math.round(summary.acceptanceRate * 100)}%`
              }
              detail={
                summary.decidedCount > 0
                  ? `${summary.acceptedCount} of ${summary.decidedCount} answered`
                  : "Clients have not answered yet"
              }
            />
            <StatCard
              icon={AlertTriangle}
              label="Needs chasing"
              value={String(summary.followUp.length)}
              detail={`Quiet for ${3}+ days`}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter quotes by status"
            >
              {filters.map((f) => {
                const active = stage === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStage(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search number, title or client"
                aria-label="Search quotes"
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No quotes match this filter.
            </p>
          ) : (
            <ul className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              {visible.map((quote) => (
                <QuoteRow key={quote.id} quote={quote} />
              ))}
            </ul>
          )}

          {summary.followUp.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {summary.followUp.length} quote
              {summary.followUp.length === 1 ? "" : "s"} marked worth a call
              have been open at least three days without the client touching
              them.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * One line per currency, never a single blended figure: a quote in naira and a
 * quote in dollars cannot be added without inventing a rate.
 */
function currenciesLine(
  totals: Array<{
    currency: string;
    open: number;
    approved: number;
    draft: number;
  }>,
  key: "open" | "approved",
): string {
  const rows = totals.filter((row) => row[key] > 0);
  if (rows.length === 0) return "None";
  return rows.map((row) => money(row[key], row.currency)).join(" · ");
}
