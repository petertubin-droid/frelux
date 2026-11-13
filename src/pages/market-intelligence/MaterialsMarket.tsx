import { useMemo, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { listIndexSeries, listMarketProfiles, listMaterialSamples } from "@/lib/market-intelligence/data";
import PriceChart from "@/components/market-intelligence/PriceChart";
import { Attribution, ProviderNotice, SectionHeading } from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import { FaqSection } from "@/components/seo/SeoSections";
import { MARKET_INTEL_FAQS } from "@/config/market-intelligence-faqs";

const CATEGORY_LABELS: Record<string, string> = {
  cement_concrete: "Cement and concrete",
  steel_reinforcement: "Reinforcement steel",
  structural_steel: "Structural steel",
  timber: "Timber",
  paints: "Paints and finishes",
  plumbing: "Plumbing",
  pumps_generators: "Pumps and generators",
  electrical: "Electrical",
  tiles: "Tiles",
  roofing: "Roofing",
  solar: "Solar equipment",
  doors_windows: "Doors and windows",
};

function label(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export default function MaterialsMarket() {
  useBreadcrumbJsonLd([
    { name: "Market intelligence", path: "/market-intelligence" },
    { name: "Material prices", path: "/market-intelligence/materials" },
  ]);
  useSeo({
    title: "Construction Material Prices by Country and Category | FRELUX",
    description:
      "Official producer price indices and retailer-observed material prices for cement, steel, timber, paints and more, filtered by market, with the publisher, licence and observation date shown for every figure.",
    canonicalPath: "/market-intelligence/materials",
    ogType: "website",
    keywords: "construction material prices, cement price index, steel price index, building materials by country, Nigeria construction material prices",
  });

  const [market, setMarket] = useState("all");
  const [category, setCategory] = useState("all");

  const state = useAsyncData(async () => {
    const [series, samples, profiles] = await Promise.all([
      listIndexSeries({ limit: 600 }),
      listMaterialSamples({ limit: 400 }),
      listMarketProfiles(),
    ]);
    return {
      series: series.ok ? series.data : [],
      samples: samples.ok ? samples.data : [],
      profiles,
    };
  });

  const data = state.status === "ready" ? state.data : null;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.series ?? []) set.add(row.category);
    for (const row of data?.samples ?? []) if (row.material_slug) set.add(row.material_slug.split("-")[0]);
    return [...set].sort();
  }, [data]);

  const seriesRows = (data?.series ?? []).filter(
    (r) => (market === "all" || r.market === market) && (category === "all" || r.category === category),
  );

  // One line per index, so comparing two grade series never mixes them.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof seriesRows>();
    for (const row of seriesRows) {
      const key = `${row.market}|${row.index_code}|${row.index_name}`;
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()]
      .map(([key, rows]) => {
        const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const change = first && last && Number(first.index_value) !== 0
          ? ((Number(last.index_value) - Number(first.index_value)) / Number(first.index_value)) * 100
          : null;
        return { key, rows: sorted, last, change };
      })
      .sort((a, b) => b.rows.length - a.rows.length)
      .slice(0, 4);
  }, [seriesRows]);

  const samples = (data?.samples ?? []).filter((s) => market === "all" || s.market === market);

  return (
    <>
      <PageHeader
        variant="data"
        eyebrow="Market intelligence"
        title="Material prices by market"
        subtitle="Official producer price indices and retailer-observed material prices, filtered by market and category, with the publisher and observation date attached."
        breadcrumbs={[
          { label: "Market intelligence", path: "/market-intelligence" },
          { label: "Material prices" }
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Two kinds of evidence live here: official producer price indices published by statistical agencies, and
          prices observed on retailer listings. Each row shows which one it is, who published it and when it was true.
          Prices stay in the currency they were quoted in; FRELUX does not invent an exchange rate for them.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sm:w-56">
          <span className="sr-only">Market</span>
          <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none">
            <option value="all">All markets</option>
            {(data?.profiles ?? []).map((p) => (
              <option key={p.country_code} value={p.country_code}>{p.country_name} ({p.country_code})</option>
            ))}
          </select>
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{label(c)}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Official price indices"
          description="Index levels, not prices: a rise means the category became more expensive for producers, in the publisher's own index units."
        />
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading series…</p>
        ) : grouped.length === 0 ? (
          <ProviderNotice
            title="No official series match this filter"
            message="Nothing is charted in place of missing data. Try another market, or open Industry Trends for everything FRELUX holds."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {grouped.map(({ key, rows, last, change }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{last.index_name}</p>
                  <span className={`text-xs tabular-nums ${change == null ? "text-muted-foreground" : change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {last.country_name ?? last.market} · {label(last.category)} · {rows.length} periods
                </p>
                <div className="mt-2">
                  <PriceChart
                    label={`${last.index_name} (${last.market})`}
                    series={rows.map((r) => ({ ts: r.period_start, value: Number(r.index_value) }))}
                    height={160}
                    formatValue={(v) => v.toFixed(2)}
                  />
                </div>
                <Attribution source={last.publisher ?? "publisher not recorded"} asOf={last.period_label} licence={last.licence_name} url={last.source_url} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 overflow-x-auto">
        <SectionHeading
          title="Observed retailer prices"
          description="Prices captured from retailer listings during a price scan. A candidate row is an observation pending review, not an agreed supplier quote."
        />
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading observations…</p>
        ) : samples.length === 0 ? (
          <ProviderNotice title="No observations for this market" message="Run a price scan for a market in the admin panel to collect retailer prices for these categories." />
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-2">Product</th>
                <th scope="col" className="py-2 pr-2">Market</th>
                <th scope="col" className="py-2 pr-2">Retailer</th>
                <th scope="col" className="py-2 pr-2 text-right">Price</th>
                <th scope="col" className="py-2 pr-2">Status</th>
                <th scope="col" className="py-2 text-right">Observed</th>
              </tr>
            </thead>
            <tbody>
              {samples.slice(0, 60).map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="max-w-[280px] truncate py-2 pr-2 text-foreground" title={s.product_name}>
                    {s.source_url ? (
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-purple">{s.product_name}</a>
                    ) : s.product_name}
                  </td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{s.market}</td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{s.retailer ?? "—"}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{s.currency} {s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-2 text-xs capitalize text-muted-foreground">{s.status}</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">{new Date(s.observed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Retailer prices are captured under each source's published terms. They are observations for comparison, not
          quotations: confirm the current price with the supplier before ordering.
        </p>
      </section>
    </div>
      <FaqSection faqs={MARKET_INTEL_FAQS.materials} />
    </>
  );
}
