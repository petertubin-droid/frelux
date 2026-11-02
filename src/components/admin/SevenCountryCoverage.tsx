import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";

// The seven country connections, stated as they are.
//
// An official statistics feed is a connection, not coverage. A country only
// counts as covered when actual supplier or market prices exist across the
// material categories Frelux prices. Everything short of that says so here.

type CoverageRow = {
  market: string;
  country_name: string;
  currency: string;
  official_sources: number;
  official_sources_live: number;
  product_sources: number;
  index_points: number;
  latest_index_period: string | null;
  last_index_at: string | null;
  product_observations: number;
  suppliers: number;
  last_product_at: string | null;
  awaiting_approval: number;
  open_alerts: number;
  categories_priced: number;
  categories_required: number;
  priced_materials: number;
  coverage_status: string;
};

type SourceRow = {
  market: string;
  publisher: string;
  source_class: string;
  access_status: string | null;
  licence_name: string | null;
};

const STATUS_STYLE: Record<string, { label: string; tone: string }> = {
  covered: {
    label: "Covered",
    tone: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  },
  partial_supplier_prices: {
    label: "Partial",
    tone: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  },
  index_only: {
    label: "Index only",
    tone: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  },
  no_data: {
    label: "No data",
    tone: "text-muted-foreground border-white/15 bg-white/5",
  },
};

const ACCESS_LABEL: Record<string, string> = {
  open_api: "open API",
  html_only: "page only",
  needs_credentials: "needs a key",
  blocked: "blocked",
  search_page_only: "search page",
};

function when(value: string | null): string {
  if (!value) return "never";
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SevenCountryCoverage() {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [coverage, official] = await Promise.all([
        supabase.from("country_coverage_seven").select("*"),
        supabase
          .from("price_scan_sources")
          .select(
            "market, publisher, source_class, access_status, licence_name",
          )
          .like("source_class", "official%"),
      ]);
      if (!live) return;
      setRows(
        ((coverage.data ?? []) as CoverageRow[])
          .slice()
          .sort((a, b) => a.country_name.localeCompare(b.country_name)),
      );
      setSources((official.data ?? []) as SourceRow[]);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const liveApis = rows.filter((r) => r.official_sources_live > 0).length;
  const priced = rows.filter(
    (r) =>
      r.coverage_status !== "no_data" && r.coverage_status !== "index_only",
  ).length;

  return (
    <section className="admin-surface mt-6 rounded-2xl border border-white/10 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Seven country connections
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Official statistics are recorded as index series, never as product
            prices. A country counts as covered only once actual supplier or
            market prices exist across the sixteen material categories.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-muted-foreground">
            {liveApis} open interfaces
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-muted-foreground">
            {priced} with supplier prices
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-3 font-medium">Country</th>
              <th className="pb-3 font-medium">Currency</th>
              <th className="pb-3 font-medium">Official feed</th>
              <th className="pb-3 font-medium">Index points</th>
              <th className="pb-3 font-medium">Supplier prices</th>
              <th className="pb-3 font-medium">Categories</th>
              <th className="pb-3 font-medium">Last update</th>
              <th className="pb-3 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-6 text-sm text-muted-foreground">
                  Reading connections
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const status =
                  STATUS_STYLE[row.coverage_status] ?? STATUS_STYLE.no_data;
                const feeds = sources.filter((s) => s.market === row.market);
                const feedLabel =
                  feeds.length === 0
                    ? "none"
                    : feeds
                        .map(
                          (f) =>
                            ACCESS_LABEL[f.access_status ?? ""] ??
                            f.access_status ??
                            "unknown",
                        )
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(", ");
                return (
                  <tr
                    key={row.market}
                    className="border-t border-white/5 align-top"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">
                        {row.country_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.market}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.currency}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-foreground">
                        {row.official_sources}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({feedLabel})
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-foreground">
                        {row.index_points.toLocaleString()}
                      </span>
                      {row.latest_index_period && (
                        <div className="text-xs text-muted-foreground">
                          to {when(row.latest_index_period)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-foreground">
                        {row.product_observations.toLocaleString()}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {row.suppliers} suppliers
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-foreground">
                        {row.categories_priced}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / {row.categories_required}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {row.last_product_at
                        ? `price ${when(row.last_product_at)}`
                        : row.last_index_at
                          ? `index ${when(row.last_index_at)}`
                          : "never"}
                    </td>
                    <td className="py-3">
                      <span
                        className={classNames(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs",
                          status.tone,
                        )}
                      >
                        {status.label}
                      </span>
                      {row.awaiting_approval > 0 && (
                        <div className="mt-1 text-xs text-amber-500">
                          {row.awaiting_approval} awaiting approval
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {sources.map((s) => (
          <div
            key={`${s.market}-${s.publisher}`}
            className="admin-inset rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-foreground">
                {s.publisher}
              </div>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground">
                {ACCESS_LABEL[s.access_status ?? ""] ??
                  s.access_status ??
                  "unknown"}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {s.market} · {s.source_class.split("_").join(" ")} ·{" "}
              {s.licence_name ?? "licence not recorded"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
