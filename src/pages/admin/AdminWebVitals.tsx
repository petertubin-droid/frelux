import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AdminCard,
  AdminButton,
  StateMessage,
} from "@/components/admin/AdminUi";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

/**
 * Field performance.
 *
 * A Lighthouse score describes a fast machine with a clean cache. This screen
 * describes the visitors: Core Web Vitals as their phones reported them, p75
 * per metric and per route, so a slow template is named rather than suspected.
 * Nothing appears until real visits arrive, and the screen says so instead of
 * showing an empty table.
 */

const METRICS = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
type Metric = (typeof METRICS)[number];

interface Sample {
  metric: Metric;
  value: number;
  rating: string;
  path: string;
  device: string | null;
  connection: string | null;
  created_at: string;
}

const LABELS: Record<Metric, string> = {
  LCP: "Largest contentful paint",
  INP: "Interaction to next paint",
  CLS: "Cumulative layout shift",
  TTFB: "Time to first byte",
  FCP: "First contentful paint",
};

const TARGETS: Record<Metric, string> = {
  LCP: "2.5 s",
  INP: "200 ms",
  CLS: "0.1",
  TTFB: "0.8 s",
  FCP: "1.8 s",
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[index];
}

function display(metric: Metric, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}

export default function AdminWebVitals() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    // Ordered newest first and capped: this screen reads a sample of traffic,
    // and p75 from the last few thousand measurements is the same number as p75
    // from the last hundred thousand.
    const { data, error: queryError } = await supabase
      .from("web_vitals")
      .select("metric, value, rating, path, device, connection, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (queryError) {
      setError(
        queryError.code === "42P01"
          ? "Measurements start once the vitals migration is applied and the site is deployed."
          : queryError.message,
      );
      setSamples([]);
    } else {
      setSamples((data ?? []) as Sample[]);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    return METRICS.map((metric) => {
      const rows = samples.filter((s) => s.metric === metric);
      const values = rows.map((s) => s.value);
      return {
        metric,
        count: rows.length,
        p50: percentile(values, 50),
        p75: percentile(values, 75),
        poor: rows.filter((r) => r.rating === "poor").length,
      };
    });
  }, [samples]);

  const worstRoutes = useMemo(() => {
    const byPath = new Map<string, number[]>();
    for (const sample of samples) {
      if (sample.metric !== "LCP") continue;
      const list = byPath.get(sample.path) ?? [];
      list.push(sample.value);
      byPath.set(sample.path, list);
    }
    return [...byPath.entries()]
      .map(([path, values]) => ({
        path,
        p75: percentile(values, 75),
        count: values.length,
      }))
      .sort((a, b) => b.p75 - a.p75)
      .slice(0, 10);
  }, [samples]);

  const deviceSplit = useMemo(() => {
    const total = samples.length || 1;
    return ["phone", "tablet", "desktop"].map((device) => {
      const rows = samples.filter((s) => s.device === device);
      const poor = rows.filter((r) => r.rating === "poor").length;
      return {
        device,
        share: Math.round((rows.length / total) * 100),
        poorShare: rows.length ? Math.round((poor / rows.length) * 100) : 0,
      };
    });
  }, [samples]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Field performance"
        description="Core Web Vitals as real visitors reported them, sampled one session in four."
      />

      <div className="flex items-center gap-2">
        {[7, 30, 90].map((option) => (
          <AdminButton
            key={option}
            variant={days === option ? "primary" : "secondary"}
            onClick={() => setDays(option)}
          >
            {option} days
          </AdminButton>
        ))}
        <AdminButton variant="secondary" onClick={() => void load()}>
          Refresh
        </AdminButton>
      </div>

      {loading && samples.length === 0 ? (
        <StateMessage
          type="loading"
          title="Loading measurements"
          message="Reading the last measurements from the database."
        />
      ) : error ? (
        <StateMessage
          type="error"
          title="No measurements yet"
          message={error}
        />
      ) : samples.length === 0 ? (
        <StateMessage
          type="empty"
          title="No measurements in this window"
          message="Visits report on page hide, so numbers appear after the next deploy reaches real traffic."
        />
      ) : (
        <>
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">
              Percentiles against the target
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Metric</th>
                    <th className="py-2 pr-3 font-medium">Target</th>
                    <th className="py-2 pr-3 font-medium">p50</th>
                    <th className="py-2 pr-3 font-medium">p75</th>
                    <th className="py-2 pr-3 font-medium">Poor</th>
                    <th className="py-2 font-medium">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.metric} className="border-b border-border/60">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{row.metric}</span>
                        <span className="block text-xs text-muted-foreground">
                          {LABELS[row.metric]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                        {TARGETS[row.metric]}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.count ? display(row.metric, row.p50) : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.count ? display(row.metric, row.p75) : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.count
                          ? `${row.poor} (${Math.round((row.poor / row.count) * 100)}%)`
                          : "—"}
                      </td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminCard>
              <h3 className="mb-3 text-sm font-semibold">
                Slowest routes by LCP p75
              </h3>
              {worstRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No LCP measurements in this window.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {worstRoutes.map((route) => (
                    <li
                      key={route.path}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="truncate font-mono text-xs">
                        {route.path}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {display("LCP", route.p75)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {route.count}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard>
              <h3 className="mb-3 text-sm font-semibold">By device</h3>
              <ul className="space-y-2 text-sm">
                {deviceSplit.map((row) => (
                  <li
                    key={row.device}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="capitalize">{row.device}</span>
                    <span className="tabular-nums">
                      {row.share}% of samples
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.poorShare}% poor
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          </div>
        </>
      )}
    </div>
  );
}
