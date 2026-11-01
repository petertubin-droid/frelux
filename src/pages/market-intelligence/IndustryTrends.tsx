import { useMemo, useState } from "react";
import { useSeo } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { listIndexSeries, listMarketRankings } from "@/lib/market-intelligence/data";
import PriceChart from "@/components/market-intelligence/PriceChart";
import { Attribution, ProviderNotice, SectionHeading } from "@/components/market-intelligence/ui";

export default function IndustryTrends() {
  useSeo({
    title: "Construction Industry Trends and Market Movement | FRELUX",
    description:
      "Published construction index movements by category and market, with the direction, size and period of each change, plus market rankings carrying their source and confidence.",
    canonicalPath: "/market-intelligence/trends",
    ogType: "website",
    keywords: "construction industry trends, material inflation, construction market analysis, infrastructure spending trends",
  });

  const [category, setCategory] = useState("all");

  const state = useAsyncData(async () => {
    const [series, rankings] = await Promise.all([listIndexSeries({ limit: 800 }), listMarketRankings()]);
    return { series: series.ok ? series.data : [], rankings: rankings.ok ? rankings.data : [] };
  });

  const movements = useMemo(() => {
    if (state.status !== "ready") return [];
    const map = new Map<string, typeof state.data.series>();
    for (const row of state.data.series) {
      const key = `${row.market}|${row.index_code}`;
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.values()]
      .map((rows) => {
        const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const change = first && last && Number(first.index_value) !== 0
          ? ((Number(last.index_value) - Number(first.index_value)) / Number(first.index_value)) * 100
          : null;
        return { rows: sorted, first, last, change };
      })
      .filter((m) => category === "all" || m.last.category === category)
      .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0));
  }, [state, category]);

  const categories = useMemo(() => {
    if (state.status !== "ready") return [];
    return [...new Set(state.data.series.map((s) => s.category))].sort();
  }, [state]);

  const featured = movements[0];
  const rankings = state.status === "ready" ? state.data.rankings : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">Industry Trends</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
          What the published numbers actually moved
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          These are measured changes in official series already stored by FRELUX, ordered by size. A movement describes
          what happened between the first and last published period we hold. It is not a forecast, and it does not
          account for local supplier pricing.
        </p>
      </header>

      <div className="mt-6 sm:w-64">
        <label>
          <span className="sr-only">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
      </div>

      {state.status === "loading" ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading series…</p>
      ) : movements.length === 0 ? (
        <div className="mt-8">
          <ProviderNotice title="No published series stored for this filter" message="FRELUX only charts series it has collected from a named publisher." />
        </div>
      ) : (
        <>
          {featured ? (
            <section className="mt-8">
              <SectionHeading title="Largest movement in the stored window" description={`${featured.last.index_name} · ${featured.last.country_name ?? featured.last.market}`} />
              <PriceChart
                label={`${featured.last.index_name} (${featured.last.market})`}
                series={featured.rows.map((r) => ({ ts: r.period_start, value: Number(r.index_value) }))}
                formatValue={(v) => v.toFixed(2)}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Change:{" "}
                <span className={featured.change != null && featured.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {featured.change == null ? "—" : `${featured.change >= 0 ? "+" : ""}${featured.change.toFixed(2)}%`}
                </span>{" "}
                between {featured.first.period_label ?? featured.first.period_start} and {featured.last.period_label ?? featured.last.period_start}.
              </p>
              <Attribution source={featured.last.publisher ?? "publisher not recorded"} asOf={featured.last.period_label} licence={featured.last.licence_name} url={featured.last.source_url} />
            </section>
          ) : null}

          <section className="mt-10 overflow-x-auto">
            <SectionHeading title="Every series we hold" description="Ordered by the size of the change, largest first." />
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-2">Series</th>
                  <th scope="col" className="py-2 pr-2">Market</th>
                  <th scope="col" className="py-2 pr-2">Category</th>
                  <th scope="col" className="py-2 pr-2 text-right">Periods</th>
                  <th scope="col" className="py-2 pr-2 text-right">Change</th>
                  <th scope="col" className="py-2 pr-2">Publisher</th>
                  <th scope="col" className="py-2 text-right">Latest</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(({ last, rows, change }) => (
                  <tr key={`${last.market}-${last.index_code}`} className="border-b border-border/60">
                    <td className="py-2 pr-2 text-foreground">{last.index_name}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{last.country_name ?? last.market}</td>
                    <td className="py-2 pr-2 text-xs capitalize text-muted-foreground">{last.category.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{rows.length}</td>
                    <td className={`py-2 pr-2 text-right tabular-nums ${change == null ? "text-muted-foreground" : change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{last.publisher ?? "—"}</td>
                    <td className="py-2 text-right text-xs text-muted-foreground">{last.period_label ?? last.period_start}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {rankings.length > 0 ? (
            <section className="mt-10 overflow-x-auto">
              <SectionHeading title="Market rankings" description="Country-level metrics with the source and confidence recorded against each value." />
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-2 pr-2">Market</th>
                    <th scope="col" className="py-2 pr-2">Metric</th>
                    <th scope="col" className="py-2 pr-2 text-right">Value</th>
                    <th scope="col" className="py-2 pr-2">Source</th>
                    <th scope="col" className="py-2 text-right">As of</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.slice(0, 40).map((r, i) => (
                    <tr key={`${r.market_code}-${r.metric}-${i}`} className="border-b border-border/60">
                      <td className="py-2 pr-2 text-foreground">{r.market_code}</td>
                      <td className="py-2 pr-2 text-xs capitalize text-muted-foreground">{r.metric.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.value.toLocaleString()} {r.unit ?? ""}</td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline">{r.source_name ?? "source"}</a> : r.source_name ?? "—"}
                        {r.confidence ? <span className="ml-1 rounded bg-muted px-1 text-[10px]">{r.confidence}</span> : null}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">{r.as_of ? new Date(r.as_of).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
