import { Link } from "react-router-dom";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { fetchProviderStatus, fetchQuotes, listCompanies, listNews } from "@/lib/market-intelligence/data";
import { formatCompactNumber, formatPercent } from "@/lib/market-intelligence/chart";
import { ProviderNotice, SectionHeading } from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import { FaqSection } from "@/components/seo/SeoSections";
import { MARKET_INTEL_FAQS } from "@/config/market-intelligence-faqs";

export default function InvestmentInsights() {
  useBreadcrumbJsonLd([
    { name: "Market intelligence", path: "/market-intelligence" },
    { name: "Investment insights", path: "/market-intelligence/investment" },
  ]);
  useSeo({
    title: "Construction Investment Insights and Sector Context | FRELUX",
    description:
      "Sector composition of listed construction, materials and engineering companies, their reported scale where a provider supplies it, and attributed industry coverage. Information only, never investment advice.",
    canonicalPath: "/market-intelligence/investment",
    ogType: "website",
    keywords: "construction investment insights, construction sector performance, infrastructure investment, construction companies market cap",
  });

  const state = useAsyncData(async () => {
    const [companiesRes, provider, newsRes] = await Promise.all([listCompanies(), fetchProviderStatus(), listNews({ limit: 8 })]);
    const companies = companiesRes.ok ? companiesRes.data : [];
    const configured = Boolean(provider.ok && provider.data.configured);
    const quotesRes = configured ? await fetchQuotes(companies.map((c) => c.symbol)) : null;
    return {
      companies,
      quotes: new Map((quotesRes && quotesRes.ok ? quotesRes.data.quotes : []).map((q) => [q.symbol, q])),
      configured,
      news: newsRes.ok ? newsRes.data : [],
    };
  });

  if (state.status === "loading") {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Loading investment context…</div>;
  }
  if (state.status === "error") {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Unavailable: {state.message}</div>;
  }

  const { companies, quotes, configured, news } = state.data;

  const bySector = companies.reduce<Record<string, number>>((acc, c) => {
    acc[c.sector] = (acc[c.sector] ?? 0) + 1;
    return acc;
  }, {});

  const byCountry = companies.reduce<Record<string, number>>((acc, c) => {
    acc[c.country_code] = (acc[c.country_code] ?? 0) + 1;
    return acc;
  }, {});

  const ranked = [...companies].sort((a, b) => {
    const capA = quotes.get(a.symbol)?.market_cap ?? -1;
    const capB = quotes.get(b.symbol)?.market_cap ?? -1;
    return capB - capA;
  });

  return (
    <>
      <PageHeader
        variant="data"
        eyebrow="Market intelligence"
        title="Investment insights"
        subtitle="How the listed construction universe is composed, what the companies report, and the sector coverage behind it. Information only, never advice."
        breadcrumbs={[
          { label: "Market intelligence", path: "/market-intelligence" },
          { label: "Investment insights" }
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Who is listed in the construction value chain, how the sector splits by country, and what the companies
          actually report. FRELUX does not publish target prices, does not claim a return and does not hold itself out
          as an adviser. Anything a provider has not supplied is shown as unavailable.
        </p>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(bySector).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([sector, count]) => (
          <div key={sector} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{sector}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">listed companies tracked</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <SectionHeading title="Companies by country" description="Where the issuers we track are listed or domiciled." />
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCountry).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
            <span key={code} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              {code}: <strong className="text-foreground">{count}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 overflow-x-auto">
        <SectionHeading title={configured ? "Largest by reported market capitalisation" : "Companies tracked"} description={configured ? "Market capitalisation as reported by the configured provider." : "No provider is configured, so scale figures are unavailable. The list is alphabetical by our sort order instead."} />
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-2">Company</th>
              <th scope="col" className="py-2 pr-2">Country</th>
              <th scope="col" className="py-2 pr-2">Sector</th>
              <th scope="col" className="py-2 pr-2 text-right">Market cap</th>
              <th scope="col" className="py-2 text-right">Day</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c) => {
              const q = quotes.get(c.symbol);
              return (
                <tr key={c.symbol} className="border-b border-border/60">
                  <td className="py-2 pr-2">
                    <Link to={`/market-intelligence/companies/${c.symbol.toLowerCase()}`} className="font-medium text-foreground hover:text-brand-purple">{c.name}</Link>
                    <span className="ml-2 text-xs text-muted-foreground">{c.symbol}</span>
                  </td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{c.country_code}</td>
                  <td className="py-2 pr-2 text-xs capitalize text-muted-foreground">{c.sector}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatCompactNumber(q?.market_cap ?? null)}</td>
                  <td className={`py-2 text-right tabular-nums ${q?.change_pct == null ? "text-muted-foreground" : q.change_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatPercent(q?.change_pct ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <SectionHeading title="Recent attributed coverage" description="Every item names the publication that reported it." />
        {news.length === 0 ? (
          <ProviderNotice title="No market news published yet" message="Coverage is curated by FRELUX administrators and must carry a source and publication date. Empty is the honest state until the first item is added." />
        ) : (
          <ul className="space-y-3">
            {news.map((n) => (
              <li key={n.id} className="rounded-xl border border-border bg-card p-4">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-brand-purple">{n.headline}</a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.source_name} · {new Date(n.published_at).toLocaleDateString()} · {n.category}
                </p>
                {n.summary ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.summary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Important:</strong> this page is information, not investment advice,
        research or a recommendation. Prices may be delayed, company reference data is maintained by FRELUX, and past
        movements do not indicate future performance. Take regulated advice before investing.
      </p>
    </div>
      <FaqSection faqs={MARKET_INTEL_FAQS.investment} />
    </>
  );
}
