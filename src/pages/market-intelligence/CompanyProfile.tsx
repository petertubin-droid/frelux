import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import {
  fetchCandles,
  fetchQuotes,
  listCompanies,
} from "@/lib/market-intelligence/data";
import {
  formatCompactNumber,
  formatPercent,
  type ChartRange,
} from "@/lib/market-intelligence/chart";
import CandleChart from "@/components/market-intelligence/CandleChart";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import {
  Attribution,
  ProviderNotice,
  RangeTabs,
  SectionHeading,
  StatTile,
} from "@/components/market-intelligence/ui";

export default function CompanyProfile() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const upper = symbol.toUpperCase();
  const [range, setRange] = useState<ChartRange>("1M");

  const state = useAsyncData(async () => {
    const companiesRes = await listCompanies();
    const company = companiesRes.ok
      ? (companiesRes.data.find((c) => c.symbol === upper) ?? null)
      : null;
    const bySymbol = new Map(
      (companiesRes.ok ? companiesRes.data : []).map((c) => [c.symbol, c]),
    );
    const quotesRes = company ? await fetchQuotes([upper]) : null;
    const candlesRes = company ? await fetchCandles(upper, range) : null;
    return {
      company,
      bySymbol,
      quote:
        quotesRes && quotesRes.ok ? (quotesRes.data.quotes[0] ?? null) : null,
      candles: candlesRes && candlesRes.ok ? candlesRes.data.candles : [],
      candleNote: candlesRes && candlesRes.ok ? candlesRes.data.message : null,
    };
  }, [upper, range]);

  const company = state.status === "ready" ? state.data.company : null;

  useSeo({
    title: company
      ? `${company.name} (${company.symbol}): Company Profile | FRELUX`
      : "Company Profile | FRELUX",
    description: company
      ? `${company.name} (${company.symbol}) is listed on ${company.exchange} in ${company.country_code}, classified as ${company.sector}. Listing facts, reported scale where a provider supplies it, and construction market context.`
      : "Construction company profile: listing facts, sector classification and market context.",
    canonicalPath: `/market-intelligence/companies/${symbol.toLowerCase()}`,
    ogType: "profile",
  });

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">
        Loading company…
      </div>
    );
  }
  if (state.status === "error" || !company) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-xl font-semibold text-foreground">
          Company not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {upper || "That symbol"} is not in the FRELUX company registry.{" "}
          <Link
            to="/market-intelligence/companies"
            className="underline hover:text-foreground"
          >
            Browse all companies
          </Link>
          .
        </p>
      </div>
    );
  }

  const { quote, candles, candleNote } = state.data;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Market Intelligence", path: "/market-intelligence" },
          { label: "Companies", path: "/market-intelligence/companies" },
          { label: company.symbol },
        ]}
        eyebrow={company.industry ?? company.sector}
        title={company.name}
        subtitle={`${company.symbol} · ${company.exchange} · ${company.country_code} · ${company.sector}`}
        actions={
          <>
            <Link
              to={`/market-intelligence/stocks/${company.symbol.toLowerCase()}`}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Quotes and charts
            </Link>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Investor site{" "}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
          </>
        }
      />

      <Container className="max-w-7xl pb-12 pt-8">
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Last price"
            value={quote ? `${quote.price} ${quote.currency}` : "Unavailable"}
            hint={
              quote?.as_of
                ? `As of ${new Date(quote.as_of).toLocaleString()}`
                : "No provider configured"
            }
          />
          <StatTile
            label="Day change"
            value={formatPercent(quote?.change_pct ?? null)}
            tone={(quote?.change_pct ?? 0) >= 0 ? "up" : "down"}
            hint="Previous close comparison"
          />
          <StatTile
            label="Market cap"
            value={formatCompactNumber(quote?.market_cap ?? null)}
            hint="Provider-reported"
          />
          <StatTile
            label="Volume"
            value={formatCompactNumber(quote?.volume ?? null)}
            hint="Latest session"
          />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              title="Price history"
              description="Daily candles. Weekends and non-trading days are absent rather than filled."
            />
            <RangeTabs value={range} onChange={setRange} disabled={["1D"]} />
          </div>
          {candles.length > 0 ? (
            <CandleChart
              candles={candles}
              label={`${company.symbol} daily`}
              currency={quote?.currency}
            />
          ) : (
            <ProviderNotice
              title="Price history is unavailable"
              message={
                candleNote ??
                "No candle data has been recorded for this symbol. It appears once a data provider is configured and answers for this listing."
              }
            />
          )}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Listing facts
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ticker</dt>
                <dd className="text-foreground">{company.symbol}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Exchange</dt>
                <dd className="text-foreground">{company.exchange}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Country</dt>
                <dd className="text-foreground">{company.country_code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reporting currency</dt>
                <dd className="text-foreground">{company.currency}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Sector</dt>
                <dd className="capitalize text-foreground">{company.sector}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              What FRELUX uses it for
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {company.name} is tracked because its products or services appear
              in real construction takeoffs. Material quantities from a FRELUX
              estimate can be mapped to what this company supplies, which is why
              its pricing context matters to a project even when nobody is
              buying the shares.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Nothing on this page is investment advice. Reference data is
              maintained by FRELUX; price fields appear only when a market data
              provider answers, and they carry the provider and timestamp shown
              above.
            </p>
          </div>
        </section>

        <Attribution
          source="FRELUX company registry; price fields from the configured market data provider"
          asOf={quote?.as_of ?? null}
          note="Reference data is maintained by FRELUX. Prices are provider-sourced and may be delayed."
        />
      </Container>
    </>
  );
}
