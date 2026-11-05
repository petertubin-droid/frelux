import { useMemo, useState } from "react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shadcn/button";
import tracker from "@/config/seo-tracker.json";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

/**
 * Search performance and listing-change tracker.
 *
 * Two rules this page follows:
 *  - Every number is either live Google Search Console data or a figure the
 *    owner supplied, and each one is labelled with which. There are no sample
 *    or "illustrative" metrics in production.
 *  - When Search Console is not reachable it says so, with the exact reason,
 *    instead of drawing an empty chart.
 */

type GscRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
type GscResponse = {
  connected: boolean;
  property?: string;
  reason?: string;
  setup?: string;
  rows?: GscRow[];
  totals?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  startDate?: string;
  endDate?: string;
};

type TrackerEntry = {
  path: string;
  pageType: string;
  oldTitle: string;
  newTitle: string;
  oldDescription: string;
  newDescription: string;
  status: string;
  implementedAt: string;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; gsc: GscResponse | null; failure: string | null };

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function SeoPerformance() {
  const { user, isAdmin, loading } = useAuth();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [filter, setFilter] = useState<
    "all" | "tool" | "market-template" | "colour" | "article"
  >("all");

  useSeo({
    title: "SEO Performance | FRELUX",
    description:
      "Search Console performance and the listing-change tracker for freluxtools.com.",
    canonicalPath: "/admin/seo-performance",
    noIndex: true,
  });

  const entries = tracker.entries as TrackerEntry[];
  const filtered = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.pageType === filter),
    [entries, filter],
  );

  async function load() {
    setState({ kind: "loading" });
    const { data, error } = await supabase.functions.invoke(
      "seo-search-console",
      {
        body: { action: "query", dimensions: ["query"], rowLimit: 50 },
      },
    );
    if (error) {
      setState({ kind: "ready", gsc: null, failure: error.message });
      return;
    }
    setState({ kind: "ready", gsc: data as GscResponse, failure: null });
  }

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <AdminPageHeader
          title={"Administrators only"}
          description={
            <>
              Sign in with an administrator account to view search performance.
            </>
          }
        />
      </div>
    );
  }

  const gsc = state.kind === "ready" ? state.gsc : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader
        eyebrow="Administration"
        title="SEO performance"
        description={
          <>
            Live Search Console data for{" "}
            <span className="font-medium text-foreground">freluxtools.com</span>
            , plus a record of every search listing that changed and when.
            Nothing on this page is estimated.
          </>
        }
      />

      <section className="mt-8 rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-foreground">
            Search Console (last 28 days)
          </h2>
          <Button size="sm" onClick={load} disabled={state.kind === "loading"}>
            {state.kind === "loading"
              ? "Reading Google…"
              : gsc?.connected
                ? "Refresh"
                : "Connect and read"}
          </Button>
        </div>

        {state.kind === "idle" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Not read yet. This calls Google directly; nothing is cached or
            filled in.
          </p>
        )}

        {state.kind === "ready" && (state.failure || !gsc?.connected) && (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-foreground">
              Search Console is not returning data
            </p>
            <p className="mt-1 text-muted-foreground">
              {(gsc?.reason ?? state.failure ?? "unknown") ===
              "property_not_in_account"
                ? "The connected Google account cannot see this property. Add that account as a user on the property, or connect the account that owns it."
                : gsc?.reason === "no_credential"
                  ? "The edge function has no Search Console credential configured."
                  : `Google rejected the request (${gsc?.reason ?? state.failure}).`}
            </p>
            {gsc?.setup && (
              <p className="mt-2 text-xs text-muted-foreground">{gsc.setup}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Baseline supplied by the owner for the previous 28 days: 3,930
              impressions, 16 clicks, 0.40% CTR, average position 26.2. Those
              figures are historical and are not live data.
            </p>
          </div>
        )}

        {state.kind === "ready" && gsc?.connected && gsc.totals && (
          <>
            <p className="mt-3 text-xs text-muted-foreground">
              {gsc.startDate} to {gsc.endDate} · property {gsc.property}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Impressions", gsc.totals.impressions.toLocaleString()],
                ["Clicks", gsc.totals.clicks.toLocaleString()],
                ["CTR", pct(gsc.totals.ctr)],
                ["Avg position", gsc.totals.position.toFixed(1)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border p-3"
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Query</th>
                    <th className="py-2 pr-4">Impr.</th>
                    <th className="py-2 pr-4">Clicks</th>
                    <th className="py-2 pr-4">CTR</th>
                    <th className="py-2">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {(gsc.rows ?? []).map((r) => (
                    <tr key={r.key} className="border-t border-border">
                      <td className="py-2 pr-4 text-foreground">{r.key}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.impressions.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.clicks.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {pct(r.ctr)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {r.position.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!gsc.rows?.length && (
                <p className="py-4 text-sm text-muted-foreground">
                  Google returned no rows for this range.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-foreground">
            Listing changes ({entries.length} pages)
          </h2>
          <div className="flex flex-wrap gap-2">
            {(
              ["all", "tool", "market-template", "colour", "article"] as const
            ).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "All" : key.replace("-", " ")}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{tracker.note}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Page</th>
                <th className="py-2 pr-4">Before</th>
                <th className="py-2 pr-4">After</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.path} className="border-t border-border align-top">
                  <td className="py-3 pr-4">
                    <a
                      href={e.path}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {e.path}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {e.pageType}
                    </div>
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {e.oldTitle || "(no title)"}
                    </div>
                    <div className="mt-1">
                      {e.oldDescription || "(no description)"}
                    </div>
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-xs">
                    <div className="font-medium text-foreground">
                      {e.newTitle}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {e.newDescription}
                    </div>
                  </td>
                  <td className="py-3 text-xs">
                    <div className="text-foreground">{e.status}</div>
                    <div className="text-muted-foreground">
                      {e.implementedAt}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="py-6 text-sm text-muted-foreground">
              No changes recorded for this filter.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
