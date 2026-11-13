import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import {
  fetchCandles,
  fetchProviderStatus,
  fetchQuotes,
  getCompany,
  listCachedCandles,
  listCompanies,
} from "@/lib/market-intelligence/data";
import {
  formatCompactNumber,
  formatPercent,
  percentChange,
  type ChartRange,
} from "@/lib/market-intelligence/chart";
import CandleChart from "@/components/market-intelligence/CandleChart";
import {
  Attribution,
  ProviderNotice,
  RangeTabs,
  StatTile,
} from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";

const RANGE_DAYS: Record<string, number> = {
  "1D": 5,
  "1W": 8,
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 366,
  "5Y": 1830,
  MAX: 7300,
};

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const upper = symbol.toUpperCase();
  const [range, setRange] = useState<ChartRange>("3M");

  const state = useAsyncData(async () => {
    const [companyRes, provider] = await Promise.all([
      getCompany(upper),
      fetchProviderStatus(),
    ]);
    const configured = Boolean(provider.ok && provider.data.configured);
    const quotesRes = configured ? await fetchQuotes([upper]) : null;
    const quote =
      quotesRes && quotesRes.ok ? (quotesRes.data.quotes[0] ?? null) : null;
    const candlesRes = configured ? await fetchCandles(upper, range) : null;
    const candles =
      candlesRes && candlesRes.ok && candlesRes.data.candles.length > 0
        ? candlesRes.data.candles
        : await listCachedCandles(upper, RANGE_DAYS[range] ?? 31);
    const others = await listCompanies();
    return {
      company: companyRes.ok ? companyRes.data : null,
      quote,
      candles,
      configured,
      providerMessage: provider.ok ? provider.data.message : undefined,
      providerName:
        candlesRes && candlesRes.ok ? (candlesRes.data.provider ?? null) : null,
      others: others.ok
        ? others.data.filter((c) => c.symbol !== upper).slice(0, 6)
        : [],
    };
  }, [upper, range]);

  useSeo({
    title: `${upper} Construction Company Profile, Price and History | FRELUX`,
    description: `Reference data, price history and key statistics for ${upper}: exchange, country, sector and the latest quote available from a configured market data provider.`,
    canonicalPath: `/market-intelligence/stocks/${upper}`,
    ogType: "website",
  });

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">
        Loading {upper}…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">
        Unavailable: {state.message}
      </div>
    );
  }

  const {
    company,
    quote,
    candles,
    configured,
    providerMessage,
    providerName,
    others,
  } = state.data;

  if (!company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-xl font-bold text-foreground">
          No company tracked under {upper}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          FRELUX tracks a fixed list of listed construction issuers.{" "}
          <Link
            to="/market-intelligence/stocks"
            className="text-brand-purple underline"
          >
            See the companies we cover
          </Link>
          .
        </p>
      </div>
    );
  }

  const change =
    quote?.change_pct ??
    percentChange(quote?.previous_close ?? null, quote?.price ?? null);

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Market Intelligence", path: "/market-intelligence" },
          { label: "Stock Market", path: "/market-intelligence/stocks" },
          { label: company.symbol },
        ]}
        eyebrow={company.industry ?? company.sector}
        title={`${company.name} (${company.symbol})`}
        subtitle={`${company.exchange} · ${company.country_code} · ${company.currency}`}
        actions={<RangeTabs value={range} onChange={setRange} />}
      />

      <Container className="max-w-7xl pb-12 pt-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Last price"
            value={quote?.price != null ? quote.price.toFixed(2) : "—"}
            hint={
              quote
                ? `${quote.currency ?? company.currency} · ${quote.is_delayed ? "delayed" : "live"}`
                : "No provider quote"
            }
          />
          <StatTile
            label="Day change"
            value={formatPercent(change)}
            tone={change == null ? "neutral" : change >= 0 ? "up" : "down"}
            hint={quote?.as_of ? new Date(quote.as_of).toLocaleString() : "—"}
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
        </div>

        <section className="mt-8">
          {candles.length > 1 ? (
            <>
              <CandleChart
                candles={candles}
                label={`${company.symbol} daily`}
                currency={quote?.currency ?? company.currency}
              />
              <Attribution
                source={providerName ?? "cached provider data"}
                asOf={candles[candles.length - 1].ts}
                note={`Daily candles · ${candles.length} sessions · ${range} window`}
              />
            </>
          ) : (
            <ProviderNotice
              tone="warning"
              title={
                configured
                  ? "No price history for this range"
                  : "Price history is not connected"
              }
              message={
                configured
                  ? "The provider returned no candles for this symbol and window. Nothing is drawn in their place."
                  : (providerMessage ??
                    "Set a market data provider key to load daily candles for this company.")
              }
            />
          )}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
              About the company
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {company.description ??
                "No description recorded for this issuer yet."}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Exchange</dt>
                <dd className="text-foreground">{company.exchange}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Country</dt>
                <dd className="text-foreground">{company.country_code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sector</dt>
                <dd className="capitalize text-foreground">{company.sector}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Reporting currency
                </dt>
                <dd className="text-foreground">{company.currency}</dd>
              </div>
            </dl>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm text-brand-purple underline"
              >
                Company website
              </a>
            ) : null}
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Company reference data is maintained by FRELUX. Quotes are
              provider data, may be delayed, and are shown for information only.
              Nothing here is investment advice or an offer to trade.
            </p>
          </section>

          <aside>
            <h2 className="text-sm font-bold text-foreground">Other issuers</h2>
            <ul className="mt-3 space-y-2">
              {others.map((c) => (
                <li key={c.symbol}>
                  <Link
                    to={`/market-intelligence/stocks/${c.symbol}`}
                    className="flex justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-brand-purple/40"
                  >
                    <span className="font-medium text-foreground">
                      {c.symbol}
                    </span>
                    <span className="text-muted-foreground">{c.exchange}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </>
  );
}
