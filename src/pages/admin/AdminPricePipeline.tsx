/**
 * Admin Price Pipeline (Phase 5+6+7 of the global expansion)
 *
 * One admin surface for the RECURRING price-intelligence batch
 * (price_scan_runs / price_scan_candidates) and the sourced
 * market rankings book (market_rankings):
 *
 * 1. PIPELINE — recent price_scan_runs with per-run statistics
 *    (sources walked, candidates filed, failures), plus an
 *    admin-triggered full-registry scan ("Run scheduled scan
 *    now") that invokes the price-intel-scan edge function for
 *    one market or all markets. The batch only ever FILES
 *    candidates for review — it never writes estimation_prices,
 *    so manual admin prices and overrides survive automation by
 *    construction. Candidate review/approval stays in
 *    AdminPriceScan; the mi_* crawler system keeps its own
 *    dashboard (AdminMarketIntelligence).
 * 2. RANKINGS — the market_rankings book: every external metric
 *    with its source, as-of date and confidence. An admin can
 *    add a sourced metric or retire a stale one; a metric
 *    without a source is NEVER invented (the form refuses a
 *    blank source name).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import { getSafeError } from "@/lib/safeError";
import { Globe2, RefreshCw, PlayCircle, Plus } from "lucide-react";

interface ScanRun {
  id: string;
  trigger: string;
  markets: string[];
  status: string;
  sources_total: number;
  sources_scanned: number;
  candidates_created: number;
  candidates_failed: number;
  notes: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface FailedCandidate {
  id: string;
  market: string;
  material_slug: string;
  retailer: string;
  scrape_error: string | null;
  created_at: string;
}

interface RankingRow {
  id: string;
  market_code: string;
  metric: string;
  value: number;
  unit: string;
  source_name: string;
  source_url: string | null;
  as_of: string;
  confidence: string;
  notes: string | null;
  is_active: boolean;
}

interface MarketProfileLite {
  country_code: string;
  country_name: string;
}

interface NewMetric {
  market_code: string;
  metric: string;
  value: string;
  unit: string;
  source_name: string;
  source_url: string;
  as_of: string;
  confidence: string;
  notes: string;
}

const EMPTY_NEW: NewMetric = {
  market_code: "NG",
  metric: "construction_output",
  value: "",
  unit: "",
  source_name: "",
  source_url: "",
  as_of: new Date().toISOString().slice(0, 10),
  confidence: "medium",
  notes: "",
};

const STATUS_STYLES: Record<string, string> = {
  running: "bg-secondary text-secondary-foreground",
  completed: "bg-primary text-primary-foreground",
  failed: "bg-destructive text-destructive-foreground",
};

export default function AdminPricePipeline() {
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [failed, setFailed] = useState<FailedCandidate[]>([]);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [markets, setMarkets] = useState<MarketProfileLite[]>([]);
  const [marketFilter, setMarketFilter] = useState("");
  const [scanRunning, setScanRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMetric, setNewMetric] = useState<NewMetric>(EMPTY_NEW);
  const [savingMetric, setSavingMetric] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [runsRes, failedRes, rankingsRes, marketsRes] = await Promise.all([
        supabase
          .from("price_scan_runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(15),
        supabase
          .from("price_scan_candidates")
          .select(
            "id, market, material_slug, retailer, scrape_error, created_at",
          )
          .eq("status", "failed")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("market_rankings")
          .select("*")
          .order("market_code")
          .order("metric"),
        supabase
          .from("market_profiles")
          .select("country_code, country_name")
          .order("sort_order"),
      ]);
      if (runsRes.error) throw runsRes.error;
      if (rankingsRes.error) throw rankingsRes.error;
      if (marketsRes.error) throw marketsRes.error;
      setRuns((runsRes.data ?? []) as ScanRun[]);
      setFailed((failedRes.data ?? []) as FailedCandidate[]);
      setRankings((rankingsRes.data ?? []) as RankingRow[]);
      setMarkets((marketsRes.data ?? []) as MarketProfileLite[]);
    } catch (e) {
      setError(getSafeError(e, "Could not load market intelligence data"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runScheduledScan = useCallback(async () => {
    setScanRunning(true);
    setNotice(null);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        run_id?: string;
        sources?: number;
        candidates_created?: number;
        candidates_failed?: number;
      }>("price-intel-scan", {
        body: {
          trigger: "admin",
          ...(marketFilter ? { market: marketFilter } : {}),
        },
      });
      if (fnError) throw fnError;
      setNotice(
        `Scan run ${data?.run_id?.slice(0, 8) ?? ""}: ${data?.sources ?? 0} sources walked, ${data?.candidates_created ?? 0} candidates filed for review, ${data?.candidates_failed ?? 0} failed. Nothing was auto-applied — approve candidates in Price Scan.`,
      );
      await load();
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setScanRunning(false);
    }
  }, [load, marketFilter]);

  const addMetric = useCallback(async () => {
    setError(null);
    setNotice(null);
    try {
      if (!newMetric.market_code || !newMetric.metric) {
        throw new Error("Market and metric are required");
      }
      const value = Number(newMetric.value);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Value must be a positive number");
      }
      if (!newMetric.source_name.trim()) {
        // A metric without a source is never published — the whole
        // point of the rankings book.
        throw new Error(
          "Source name is required: unsourced metrics are never stored",
        );
      }
      if (!newMetric.unit.trim()) throw new Error("Unit is required");
      setSavingMetric(true);
      const { error: upsertError } = await supabase
        .from("market_rankings")
        .upsert(
          {
            market_code: newMetric.market_code,
            metric: newMetric.metric,
            value,
            unit: newMetric.unit.trim(),
            source_name: newMetric.source_name.trim(),
            source_url: newMetric.source_url.trim() || null,
            as_of: newMetric.as_of,
            confidence: newMetric.confidence,
            notes: newMetric.notes.trim() || null,
            is_active: true,
          },
          { onConflict: "market_code,metric" },
        );
      if (upsertError) throw upsertError;
      setShowAdd(false);
      setNewMetric({ ...EMPTY_NEW, market_code: newMetric.market_code });
      setNotice(
        `Saved ${newMetric.metric} for ${newMetric.market_code} with source "${newMetric.source_name.trim()}".`,
      );
      await load();
    } catch (e) {
      setError(getSafeError(e, "Could not save the metric"));
    } finally {
      setSavingMetric(false);
    }
  }, [load, newMetric]);

  const retireMetric = useCallback(
    async (row: RankingRow) => {
      setError(null);
      try {
        const { error: updError } = await supabase
          .from("market_rankings")
          .update({ is_active: false })
          .eq("id", row.id);
        if (updError) throw updError;
        setNotice(
          `Retired ${row.metric} for ${row.market_code} (row kept for audit).`,
        );
        await load();
      } catch (e) {
        setError(getSafeError(e, "Could not retire the metric"));
      }
    },
    [load],
  );

  const externalRows = useMemo(
    () => rankings.filter((r) => !r.metric.startsWith("frelux_")),
    [rankings],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Globe2 className="h-6 w-6" /> Price Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring price-intelligence runs, sourced market rankings, and scan
            failures. Scans only file candidates for review — prices never
            change without an explicit admin approval.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      {/* Pipeline: manual trigger + runs */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Price pipeline</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The cron walks the whole scan-source registry every Monday 06:40 UTC.
          Each result lands as a pending candidate in Price Scan with its
          deviation vs the current book price and a confidence grade.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            aria-label="Market filter for the scan"
          >
            <option value="">All markets</option>
            {markets.map((m) => (
              <option key={m.country_code} value={m.country_code}>
                {m.country_name} ({m.country_code})
              </option>
            ))}
          </select>
          <button
            onClick={runScheduledScan}
            disabled={scanRunning}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" />
            {scanRunning
              ? "Scanning…"
              : marketFilter
                ? `Scan ${marketFilter} sources now`
                : "Run scheduled scan now"}
          </button>
        </div>

        {runs.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Run</th>
                  <th className="py-2 pr-3">Trigger</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Sources</th>
                  <th className="py-2 pr-3">Candidates</th>
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">
                      {r.id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-3">{r.trigger}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs " +
                          (STATUS_STYLES[r.status] ??
                            "bg-muted text-muted-foreground")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.sources_scanned}/{r.sources_total}
                    </td>
                    <td className="py-2 pr-3">
                      +{r.candidates_created} filed, {r.candidates_failed}{" "}
                      failed
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {new Date(r.started_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {r.error ?? r.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Recent scan failures</h3>
            <ul className="mt-2 space-y-1 text-xs">
              {failed.map((f) => (
                <li key={f.id} className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {f.market}/{f.material_slug}
                  </span>{" "}
                  ({f.retailer}): {f.scrape_error ?? "unknown error"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Rankings book */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Market rankings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              External metrics are only stored with a named source. FRELUX
              coverage rows are recomputed from the platform's own data.
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Add sourced metric
          </button>
        </div>

        {showAdd && (
          <div className="mt-4 grid gap-3 rounded-md border bg-muted/40 p-4 md:grid-cols-3">
            <label className="text-sm">
              Market
              <select
                value={newMetric.market_code}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, market_code: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
              >
                {markets.map((m) => (
                  <option key={m.country_code} value={m.country_code}>
                    {m.country_name} ({m.country_code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Metric
              <input
                list="metric-suggestions"
                value={newMetric.metric}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, metric: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
                placeholder="construction_output"
              />
              <datalist id="metric-suggestions">
                <option value="construction_output" />
                <option value="construction_gdp_share" />
                <option value="cost_per_m2" />
                <option value="construction_output_growth" />
              </datalist>
            </label>
            <label className="text-sm">
              Value
              <input
                value={newMetric.value}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, value: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
                inputMode="decimal"
              />
            </label>
            <label className="text-sm">
              Unit (with currency/period, e.g. "billion USD (2024)")
              <input
                value={newMetric.unit}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, unit: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
              />
            </label>
            <label className="text-sm md:col-span-2">
              Source name (required — unsourced metrics are never stored)
              <input
                value={newMetric.source_name}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, source_name: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
                placeholder="e.g. ONS construction output bulletin"
              />
            </label>
            <label className="text-sm">
              Source URL
              <input
                value={newMetric.source_url}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, source_url: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
                placeholder="https://…"
              />
            </label>
            <label className="text-sm">
              As of (date)
              <input
                type="date"
                value={newMetric.as_of}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, as_of: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
              />
            </label>
            <label className="text-sm">
              Confidence
              <select
                value={newMetric.confidence}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, confidence: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="text-sm">
              Notes
              <input
                value={newMetric.notes}
                onChange={(e) =>
                  setNewMetric((v) => ({ ...v, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5"
              />
            </label>
            <div className="md:col-span-3">
              <button
                onClick={addMetric}
                disabled={savingMetric}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingMetric ? "Saving…" : "Save metric"}
              </button>
            </div>
          </div>
        )}

        {externalRows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Market</th>
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">As of</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {externalRows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.market_code}</td>
                    <td className="py-2 pr-3">{r.metric}</td>
                    <td className="py-2 pr-3">
                      {Number(r.value).toLocaleString()}{" "}
                      <span className="text-xs text-muted-foreground">
                        {r.unit}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {r.source_url ? (
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {r.source_name}
                        </a>
                      ) : (
                        r.source_name
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs">{r.as_of}</td>
                    <td className="py-2 pr-3 text-xs">{r.confidence}</td>
                    <td className="py-2 pr-3 text-xs">
                      {r.is_active ? "yes" : "retired"}
                    </td>
                    <td className="py-2 text-right">
                      {r.is_active && (
                        <button
                          onClick={() => retireMetric(r)}
                          className="text-xs text-muted-foreground underline hover:text-destructive"
                        >
                          retire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
