import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Building2, Globe2, LineChart as LineIcon } from "lucide-react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import {
  fetchProviderStatus,
  listCompanies,
  listIndexSeries,
  listMarketProfiles,
} from "@/lib/market-intelligence/data";
import PriceChart from "@/components/market-intelligence/PriceChart";
import { Attribution, ProviderNotice, SectionHeading, StatTile } from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import { FaqSection } from "@/components/seo/SeoSections";
import { MARKET_INTEL_FAQS } from "@/config/market-intelligence-faqs";

export default function MarketOverview() {
  useBreadcrumbJsonLd([
    { name: "Market intelligence", path: "/market-intelligence" },
  ]);
  useSeo({
    title: "Construction Market Intelligence | FRELUX",
    description:
      "Track listed construction companies, official material price indices, retailer-observed material prices and industry trends across FRELUX's 32 markets, with every figure attributed to its source.",
    canonicalPath: "/market-intelligence",
    ogType: "website",
    keywords:
      "construction market intelligence, construction material prices, construction stocks, construction industry trends, building material index",
  });

  const state = useAsyncData(async () => {
    const [companies, series, profiles, provider] = await Promise.all([
      listCompanies(),
      listIndexSeries({ limit: 500 }),
      listMarketProfiles(),
      fetchProviderStatus(),
    ]);
    return {
      companies: companies.ok ? companies.data : [],
      series: series.ok ? series.data : [],
      profiles,
      provider: provider.ok ? provider.data : null,
    };
  });

  if (state.status === "loading") {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Loading market intelligence…</div>;
  }
  if (state.status === "error") {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Market intelligence is unavailable: {state.message}</div>;
  }

  const { companies, series, profiles, provider } = state.data;

  // Chart the longest official series we hold, so the page shows real published
  // numbers rather than a demonstration curve.
  const byIndex = new Map<string, typeof series>();
  for (const row of series) {
    const key = `${row.market}:${row.index_code}`;
    byIndex.set(key, [...(byIndex.get(key) ?? []), row]);
  }
  const longest = [...byIndex.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const chartRows = longest;
  const latest = chartRows[chartRows.length - 1];
  const first = chartRows[0];
  const changePct =
    latest && first && Number(first.index_value) !== 0
      ? ((Number(latest.index_value) - Number(first.index_value)) / Number(first.index_value)) * 100
      : null;

  const cards = [
    { to: "/market-intelligence/stocks", title: "Stock Market", body: "Listed construction, materials and engineering issuers with charting, comparison and watchlists.", icon: LineIcon },
    { to: "/market-intelligence/materials", title: "Construction Materials Market", body: "Official producer indices and retailer-observed prices by market and category.", icon: Building2 },
    { to: "/market-intelligence/trends", title: "Industry Trends", body: "Published index movements and market rankings, with publisher and period on every point.", icon: BarChart3 },
    { to: "/market-intelligence/investment", title: "Investment Insights", body: "Sector composition and listed-company context. Not advice, and never a promised return.", icon: Globe2 },
    { to: "/market-intelligence/news", title: "Market News", body: "Curated construction and infrastructure coverage, attributed to the publishing source.", icon: BarChart3 },
    { to: "/market-intelligence/companies", title: "Company Profiles", body: "Exchange, country, sector and business description for every issuer we track.", icon: Building2 },
  ];

  return (
    <>
      <PageHeader
        variant="data"
        eyebrow="Market intelligence"
        title="Market intelligence"
        subtitle="Listed construction companies, official material price indices and industry trends across the markets FRELUX covers, with the source and date shown beside every figure."
        breadcrumbs={[
          { label: "Market intelligence" }
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Listed construction companies, official material price indices and retailer-observed prices in one place.
          Every figure shows where it came from and when it was true, and anything we cannot source is shown as
          unavailable rather than estimated.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Markets covered" value={profiles.length} hint="Country profiles with currency and units" />
        <StatTile label="Companies tracked" value={companies.length} hint="Listed issuers across exchanges" />
        <StatTile label="Index observations" value={series.length} hint="Published official index points stored" />
        <StatTile
          label="Live price provider"
          value={provider?.configured ? "Configured" : "Not configured"}
          hint={provider?.configured ? "Quotes and candles available" : "Add a provider key to enable quotes"}
        />
      </div>

      <section className="mt-10">
        <SectionHeading
          title={latest ? `${latest.index_name} (${latest.market})` : "Published index series"}
          description="Official series stored by FRELUX. The percentage is the change across the stored window, not a forecast."
        />
        {chartRows.length > 1 ? (
          <>
            <PriceChart
              label={`${latest?.index_name ?? "Index"} · ${latest?.base_period ?? "index"}`}
              series={chartRows.map((r) => ({ ts: r.period_start, value: Number(r.index_value) }))}
              formatValue={(v) => v.toFixed(2)}
            />
            {changePct != null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Change over the stored window:{" "}
                <span className={changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(2)}%
                </span>
              </p>
            ) : null}
            <Attribution
              source={latest?.publisher ?? "unknown publisher"}
              asOf={latest?.period_label ?? latest?.period_start}
              licence={latest?.licence_name}
              url={latest?.source_url}
              note={latest?.attribution_text ?? undefined}
            />
          </>
        ) : (
          <ProviderNotice
            title="No published index series stored yet"
            message="FRELUX stores official index points as they are collected. Nothing is substituted when a series is empty."
          />
        )}
      </section>

      <section className="mt-10">
        <SectionHeading title="Explore the platform" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ to, title, body, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-purple/40"
            >
              <Icon aria-hidden="true" className="h-4 w-4 text-brand-purple" />
              <p className="mt-2 font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-purple">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {!provider?.configured ? (
        <div className="mt-10">
          <ProviderNotice
            tone="warning"
            title="Listed-company prices need a data provider"
            message="FRELUX does not publish invented prices. Set FINNHUB_API_KEY, FMP_API_KEY, TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY as an edge function secret and quotes, candles and percent changes appear on the stock pages. Until then those pages show company reference data and say plainly that prices are unavailable."
          />
        </div>
      ) : null}
    </div>
      <FaqSection faqs={MARKET_INTEL_FAQS.overview} />
    </>
  );
}
