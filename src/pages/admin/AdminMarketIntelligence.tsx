/**
 * FRELUX Admin — Market Intelligence Dashboard
 *
 * Manages the price intelligence engine: providers, sources, price observations,
 * approved prices, anomalies, and crawl logs.
 *
 * This is purely additive — does not modify any existing admin pages.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Save,
  Globe,
  DollarSign,
  AlertTriangle,
  Activity,
  Check,
  Ban,
  Server,
  TrendingUp,
  Zap,
  Eye,
  Clock,
} from "lucide-react";
import {
  fetchProviders,
  toggleProvider,
  fetchSources,
  upsertSource,
  deleteSource,
  fetchObservations,
  updateObservationStatus,
  fetchApprovedPrices,
  deactivateApprovedPrice,
  fetchAnomalies,
  resolveAnomaly,
  fetchCrawlLogs,
  manuallyEnterPrice,
} from "@/lib/market-intelligence";
import { triggerCrawl } from "@/lib/market-intelligence/crawler/crawler-client";
import type { CrawlJob as CrawlJobType } from "@/types/crawler";
import type {
  MiProvider,
  MiSource,
  MiPriceObservation,
  MiApprovedPrice,
  MiAnomalyFlag,
  MiCrawlLog,
  ValidationStatus,
  MatchConfidence,
} from "@/types/market-intelligence";
import {
  PROVIDER_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  FRESHNESS_LABELS,
  ANOMALY_TYPE_LABELS,
  CONFIDENCE_LABELS,
} from "@/types/market-intelligence";
import { classNames } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

type Tab =
  "providers" | "sources" | "observations" | "approved" | "anomalies" | "logs";

export default function AdminMarketIntelligence() {
  const [tab, setTab] = useState<Tab>("observations");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-brand-purple" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Market Intelligence
        </h1>
        <span className="rounded-md bg-brand-purple/10 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
          PRICE ENGINE
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {(
          [
            ["observations", "Price Observations", DollarSign],
            ["approved", "Approved Prices", Check],
            ["sources", "Sources", Globe],
            ["providers", "Providers", Server],
            ["anomalies", "Anomalies", AlertTriangle],
            ["logs", "Activity Logs", Activity],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-b-2 border-brand-purple text-brand-purple dark:text-brand-purple-lighter"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "observations" && <ObservationsTab />}
      {tab === "approved" && <ApprovedTab />}
      {tab === "sources" && <SourcesTab />}
      {tab === "providers" && <ProvidersTab />}
      {tab === "anomalies" && <AnomaliesTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

// ============================================================
// OBSERVATIONS TAB
// ============================================================
function ObservationsTab() {
  const { user } = useAuth();
  const [observations, setObservations] = useState<MiPriceObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "all">(
    "all",
  );
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setObservations(
        await fetchObservations({
          validationStatus: statusFilter === "all" ? undefined : statusFilter,
          limit: 200,
        }),
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ValidationStatus | "all")
            }
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(VALIDATION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="text-sm text-neutral-500">
            {observations.length} observations
          </span>
        </div>
        <button
          onClick={() => setShowManual(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="h-4 w-4" /> Manual Price Entry
        </button>
      </div>

      {observations.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          No price observations found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-white/10">
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Price</th>
                <th className="pb-2 pr-3 font-medium">Package</th>
                <th className="pb-2 pr-3 font-medium">Market</th>
                <th className="pb-2 pr-3 font-medium">Confidence</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Collected</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs) => (
                <tr
                  key={obs.id}
                  className="border-b border-neutral-100 dark:border-white/5"
                >
                  <td className="py-2 pr-3">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {obs.original_product_name}
                    </div>
                    {obs.normalized_name &&
                      obs.normalized_name !== obs.original_product_name && (
                        <div className="text-xs text-neutral-400">
                          → {obs.normalized_name}
                        </div>
                      )}
                  </td>
                  <td className="py-2 pr-3 font-semibold">
                    {obs.currency_code} {obs.price.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-xs text-neutral-500">
                    {obs.package_size
                      ? `${obs.package_size} ${obs.package_unit ?? ""}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {obs.country_code}
                    {obs.city ? ` / ${obs.city}` : ""}
                  </td>
                  <td className="py-2 pr-3">
                    <ConfidenceBadge confidence={obs.match_confidence} />
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={obs.validation_status} />
                  </td>
                  <td className="py-2 pr-3 text-xs text-neutral-400">
                    {new Date(obs.collected_at).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    {obs.validation_status === "review_required" ||
                    obs.validation_status === "collected" ? (
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            await updateObservationStatus(
                              obs.id,
                              "approved",
                              user?.id,
                              "approved",
                            );
                            load();
                          }}
                          className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            await updateObservationStatus(
                              obs.id,
                              "rejected",
                              user?.id,
                              "rejected",
                            );
                            load();
                          }}
                          className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="Reject"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">
                        {obs.review_action ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showManual && (
        <ManualEntryModal
          onClose={() => setShowManual(false)}
          onSaved={() => {
            setShowManual(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// APPROVED PRICES TAB
// ============================================================
function ApprovedTab() {
  const [prices, setPrices] = useState<MiApprovedPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedPrices()
      .then(setPrices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        {prices.length} approved prices — these are what calculators consume.
      </p>
      {prices.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          No approved prices yet. Approve observations or enter prices manually.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {prices.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {p.product_name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {p.brand} · {p.category}
                  </p>
                </div>
                <span
                  className={classNames(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                    p.freshness === "fresh"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : p.freshness === "recent"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                  )}
                >
                  {FRESHNESS_LABELS[p.freshness]}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-neutral-900 dark:text-white">
                  {p.currency_code} {p.price.toLocaleString()}
                </span>
                <span className="text-xs text-neutral-400">
                  {p.package_size} {p.package_unit}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                <span>{p.market_code}</span>
                <span>
                  {p.source_count} source{p.source_count !== 1 ? "s" : ""}
                </span>
                <ConfidenceBadge confidence={p.confidence as MatchConfidence} />
              </div>
              {p.median_price && p.source_count > 1 && (
                <div className="mt-1 text-xs text-neutral-400">
                  Median: {p.currency_code} {p.median_price.toLocaleString()} ·
                  Range: {p.min_price?.toLocaleString()} –{" "}
                  {p.max_price?.toLocaleString()}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <span className="text-xs text-neutral-400">
                  Updated {new Date(p.last_updated).toLocaleDateString()}
                </span>
                <button
                  onClick={async () => {
                    await deactivateApprovedPrice(p.id);
                    setPrices(prices.filter((x) => x.id !== p.id));
                  }}
                  className="text-xs text-neutral-400 hover:text-red-500"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SOURCES TAB
// ============================================================
function SourcesTab() {
  const [sources, setSources] = useState<MiSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlReport, setCrawlReport] = useState<{
    sourceName: string;
    job: CrawlJobType | null;
    error: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSources(await fetchSources());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCrawl(source: MiSource, mode: "test" | "production") {
    setCrawling(source.id);
    try {
      const { result, job } = await triggerCrawl(source.id, mode);
      setCrawlReport({
        sourceName: source.source_name,
        job,
        error: result.started ? null : result.message,
      });
      load(); // Reload to show updated health
    } catch (e) {
      setCrawlReport({
        sourceName: source.source_name,
        job: null,
        error: e instanceof Error ? e.message : "Crawl failed",
      });
    } finally {
      setCrawling(null);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-neutral-500">
          {sources.length} sources registered
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="h-4 w-4" /> Add Source
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-white/10">
          <Globe className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-500">
            No sources registered yet
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Add an approved source to start crawling construction material
            prices.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {s.source_name}
                      </span>
                      <span className="rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
                        {SOURCE_TYPE_LABELS[s.source_type]}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Tier {s.reliability_tier}
                      </span>
                      {s.is_verified && (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {s.country_code}
                      {s.region ? ` · ${s.region}` : ""}
                      {s.city ? ` · ${s.city}` : ""}
                      {s.domain ? ` · ${s.domain}` : ""}
                      {s.crawl_frequency ? ` · ${s.crawl_frequency}` : ""}
                    </div>
                    {s.last_checked_at && (
                      <div className="text-xs text-neutral-400">
                        Last checked:{" "}
                        {new Date(s.last_checked_at).toLocaleString()}
                        {s.last_error ? ` · ⚠ ${s.last_error}` : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={classNames(
                      "text-xs",
                      s.is_active ? "text-emerald-600" : "text-neutral-400",
                    )}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              {s.is_active && s.source_url && (
                <div className="mt-2 flex items-center gap-2 border-t border-neutral-100 pt-2 dark:border-white/5">
                  {crawling === s.id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-brand-purple">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                      Crawling...
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCrawl(s, "test")}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"
                        title="Fetch and extract without publishing prices"
                      >
                        <Eye className="h-3 w-3" /> Test Crawl
                      </button>
                      <button
                        onClick={() => handleCrawl(s, "production")}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-purple px-2 py-1 text-xs font-semibold text-white hover:bg-brand-purple-dark"
                        title="Full crawl with price observation creation"
                      >
                        <Zap className="h-3 w-3" /> Crawl Now
                      </button>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      await deleteSource(s.id);
                      load();
                    }}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    title="Delete source"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <SourceEditModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
      {crawlReport && (
        <CrawlReportModal
          report={crawlReport}
          onClose={() => setCrawlReport(null)}
        />
      )}
    </div>
  );
}

function CrawlReportModal({
  report,
  onClose,
}: {
  report: {
    sourceName: string;
    job: CrawlJobType | null;
    error: string | null;
  };
  onClose: () => void;
}) {
  const job = report.job;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-brand-navy-mid"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            Crawl Report
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-3 text-sm text-neutral-500">
          Source:{" "}
          <span className="font-semibold text-neutral-900 dark:text-white">
            {report.sourceName}
          </span>
        </div>
        {report.error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10">
            <AlertTriangle className="mb-1 inline h-4 w-4" /> {report.error}
          </div>
        ) : job ? (
          <div className="space-y-3">
            <div
              className={classNames(
                "rounded-lg p-3 text-sm font-medium",
                job.status === "completed"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                  : job.status === "failed"
                    ? "bg-red-50 text-red-600 dark:bg-red-500/10"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
              )}
            >
              Status: {job.status} · {job.message}
            </div>
            {job.durationMs !== null && (
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3.5 w-3.5" /> Duration:{" "}
                {(job.durationMs / 1000).toFixed(1)}s
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Pages Fetched" value={job.pagesFetched} />
              <StatTile label="Products Found" value={job.productsDiscovered} />
              <StatTile label="Prices Found" value={job.pricesDiscovered} />
              <StatTile label="Approved" value={job.pricesAccepted} />
              <StatTile
                label="Review Required"
                value={job.pricesReviewRequired}
              />
              <StatTile label="Rejected" value={job.pricesRejected} />
              <StatTile label="Anomalies" value={job.anomaliesDetected} />
              <StatTile label="Errors" value={job.errors.length} />
            </div>
            {job.errors.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-neutral-400">
                  Errors
                </h3>
                <div className="space-y-1">
                  {job.errors.map((e, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-500/10"
                    >
                      <span className="font-semibold">{e.type}</span>:{" "}
                      {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {job.warnings.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-neutral-400">
                  Warnings
                </h3>
                <div className="space-y-1">
                  {job.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-neutral-500">
                      · {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-neutral-400">
            No crawl data returned.
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-white/10 dark:text-neutral-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-100 p-2 dark:border-white/5">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-lg font-bold text-neutral-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function SourceEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    source_name: "",
    domain: "",
    source_url: "",
    country_code: "NG",
    region: "",
    city: "",
    source_type: "supplier" as MiSource["source_type"],
    reliability_tier: 3,
    crawl_frequency: "manual" as MiSource["crawl_frequency"],
    is_active: false,
    is_verified: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await upsertSource({
        ...form,
        reliability_tier: form.reliability_tier as 1 | 2 | 3 | 4,
      } as Partial<MiSource>);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-brand-navy-mid"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
          New Source
        </h2>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-500/10">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Source Name"
            value={form.source_name}
            onChange={(v) => setForm({ ...form, source_name: v })}
          />
          <Input
            label="Domain"
            value={form.domain}
            onChange={(v) => setForm({ ...form, domain: v })}
            placeholder="jumia.com.ng"
          />
          <div className="col-span-2">
            <Input
              label="Source URL"
              value={form.source_url}
              onChange={(v) => setForm({ ...form, source_url: v })}
              placeholder="https://example.com/products"
            />
          </div>
          <Input
            label="Country Code"
            value={form.country_code}
            onChange={(v) =>
              setForm({ ...form, country_code: v.toUpperCase() })
            }
          />
          <SelectInput
            label="Source Type"
            value={form.source_type}
            onChange={(v) =>
              setForm({ ...form, source_type: v as MiSource["source_type"] })
            }
            options={Object.entries(SOURCE_TYPE_LABELS).map(([v, l]) => ({
              value: v,
              label: l,
            }))}
          />
          <Input
            label="Region"
            value={form.region}
            onChange={(v) => setForm({ ...form, region: v })}
            placeholder="Lagos"
          />
          <Input
            label="City"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <SelectInput
            label="Reliability Tier"
            value={String(form.reliability_tier)}
            onChange={(v) =>
              setForm({ ...form, reliability_tier: parseInt(v) })
            }
            options={[
              { value: "1", label: "Tier 1 (Manufacturer/Supplier)" },
              { value: "2", label: "Tier 2 (Retailer/Distributor)" },
              { value: "3", label: "Tier 3 (Marketplace)" },
              { value: "4", label: "Tier 4 (Unknown)" },
            ]}
          />
          <SelectInput
            label="Crawl Frequency"
            value={form.crawl_frequency}
            onChange={(v) =>
              setForm({
                ...form,
                crawl_frequency: v as MiSource["crawl_frequency"],
              })
            }
            options={[
              { value: "manual", label: "Manual" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-neutral-300 text-brand-purple"
          />
          Active source
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-white/10 dark:text-neutral-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROVIDERS TAB
// ============================================================
function ProvidersTab() {
  const [providers, setProviders] = useState<MiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        {providers.length} providers configured. Provider API keys are stored in
        Supabase secrets, never in the database.
      </p>
      <div className="space-y-2">
        {providers.map((p) => (
          <div
            key={p.id}
            className="card flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {p.provider_name}
                  </span>
                  <span className="rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
                    {PROVIDER_TYPE_LABELS[p.provider_type]}
                  </span>
                  {p.is_free && (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      FREE
                    </span>
                  )}
                  {p.is_fallback && (
                    <span className="text-[10px] text-neutral-400">
                      fallback
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">{p.description}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                  <span>Priority: {p.priority}</span>
                  {p.has_api_key && (
                    <span className="text-amber-500">⚠ API key configured</span>
                  )}
                  {p.monthly_request_limit && (
                    <span>Limit: {p.monthly_request_limit}/mo</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                await toggleProvider(p.id, !p.is_enabled);
                setProviders(
                  providers.map((x) =>
                    x.id === p.id ? { ...x, is_enabled: !x.is_enabled } : x,
                  ),
                );
              }}
              className={classNames(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                p.is_enabled
                  ? "bg-brand-purple"
                  : "bg-neutral-300 dark:bg-white/10",
              )}
            >
              <span
                className={classNames(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  p.is_enabled ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ANOMALIES TAB
// ============================================================
function AnomaliesTab() {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState<MiAnomalyFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnomalies(await fetchAnomalies());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        {anomalies.length} anomaly flags
      </p>
      {anomalies.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          No anomalies detected.
        </p>
      ) : (
        <div className="space-y-2">
          {anomalies.map((a) => (
            <div key={a.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {ANOMALY_TYPE_LABELS[a.anomaly_type]}
                  </span>
                  {a.deviation_percent && (
                    <span className="text-xs text-amber-600">
                      {a.deviation_percent}% deviation
                    </span>
                  )}
                </div>
                <span
                  className={classNames(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    a.resolution === "open"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10"
                      : a.resolution === "resolved"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                        : "bg-neutral-100 text-neutral-500 dark:bg-white/5",
                  )}
                >
                  {a.resolution}
                </span>
              </div>
              {a.description && (
                <p className="mt-1 text-xs text-neutral-500">{a.description}</p>
              )}
              {a.resolution === "open" && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={async () => {
                      await resolveAnomaly(a.id, "resolved", user?.id ?? "");
                      load();
                    }}
                    className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={async () => {
                      await resolveAnomaly(a.id, "dismissed", user?.id ?? "");
                      load();
                    }}
                    className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-500 dark:bg-white/5"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGS TAB
// ============================================================
function LogsTab() {
  const [logs, setLogs] = useState<MiCrawlLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrawlLogs(200)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        Recent system activity ({logs.length} events)
      </p>
      <div className="space-y-1">
        {logs.slice(0, 50).map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 border-b border-neutral-100 py-2 dark:border-white/5"
          >
            <div
              className="text-xs text-neutral-400"
              style={{ minWidth: "120px" }}
            >
              {new Date(log.created_at).toLocaleString()}
            </div>
            <span className="rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
              {log.event_type}
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MANUAL PRICE ENTRY MODAL
// ============================================================
function ManualEntryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    market_code: "NG",
    country_code: "NG",
    source_name: "Manual Admin Entry",
    original_name: "",
    normalized_name: "",
    brand: "",
    category: "",
    package_size: "",
    package_unit: "kg",
    price: "",
    currency: "NGN",
    region: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      // Find or create a manual source
      const sources = await fetchSources(form.market_code);
      let manualSource = sources.find(
        (s) =>
          s.source_type === "manual" && s.source_name === "Manual Admin Entry",
      );
      if (!manualSource) {
        manualSource = await upsertSource({
          source_name: "Manual Admin Entry",
          country_code: form.country_code,
          source_type: "manual",
          reliability_tier: 1,
          crawl_frequency: "manual",
          is_active: true,
          is_verified: true,
        } as Partial<MiSource>);
      }

      await manuallyEnterPrice(
        form.market_code,
        form.country_code,
        manualSource.id,
        {
          originalName: form.original_name || form.normalized_name,
          normalizedName: form.normalized_name,
          normalizedBrand: form.brand || undefined,
          normalizedCategory: form.category || undefined,
          packageSize: form.package_size
            ? parseFloat(form.package_size)
            : undefined,
          packageUnit: form.package_unit || undefined,
        },
        {
          price: parseFloat(form.price),
          currency: form.currency,
          region: form.region || undefined,
          city: form.city || undefined,
        },
        user?.id ?? "",
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-brand-navy-mid"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
          Manual Price Entry
        </h2>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-500/10">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Market Code"
            value={form.market_code}
            onChange={(v) =>
              setForm({
                ...form,
                market_code: v.toUpperCase(),
                country_code: v.toUpperCase(),
              })
            }
          />
          <Input
            label="Currency"
            value={form.currency}
            onChange={(v) => setForm({ ...form, currency: v.toUpperCase() })}
          />
          <Input
            label="Product Name (raw)"
            value={form.original_name}
            onChange={(v) => setForm({ ...form, original_name: v })}
            placeholder="Portland Cement 50kg"
          />
          <Input
            label="Normalized Name"
            value={form.normalized_name}
            onChange={(v) => setForm({ ...form, normalized_name: v })}
            placeholder="Portland Cement"
          />
          <Input
            label="Brand"
            value={form.brand}
            onChange={(v) => setForm({ ...form, brand: v })}
            placeholder="Dangote"
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            placeholder="cement"
          />
          <Input
            label="Package Size"
            value={form.package_size}
            onChange={(v) => setForm({ ...form, package_size: v })}
            placeholder="50"
          />
          <Input
            label="Package Unit"
            value={form.package_unit}
            onChange={(v) => setForm({ ...form, package_unit: v })}
            placeholder="kg"
          />
          <Input
            label="Price"
            value={form.price}
            onChange={(v) => setForm({ ...form, price: v })}
            placeholder="9800"
          />
          <Input
            label="Region"
            value={form.region}
            onChange={(v) => setForm({ ...form, region: v })}
            placeholder="Lagos"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-white/10 dark:text-neutral-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.normalized_name || !form.price}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Save Price
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function ConfidenceBadge({ confidence }: { confidence: MatchConfidence }) {
  const colors: Record<MatchConfidence, string> = {
    high: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    medium: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    low: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    review_required:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };
  return (
    <span
      className={classNames(
        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        colors[confidence],
      )}
    >
      {CONFIDENCE_LABELS[confidence]}
    </span>
  );
}

function StatusBadge({ status }: { status: ValidationStatus }) {
  const colors: Record<ValidationStatus, string> = {
    collected:
      "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400",
    validating:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    review_required:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    approved:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    rejected: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    anomaly:
      "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  };
  return (
    <span
      className={classNames(
        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        colors[status],
      )}
    >
      {VALIDATION_STATUS_LABELS[status]}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-200">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 dark:border-white/10 dark:bg-brand-navy dark:text-white"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-200">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 dark:border-white/10 dark:bg-brand-navy dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
