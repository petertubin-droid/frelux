import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star } from "lucide-react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import {
  fetchProviderStatus,
  fetchQuotes,
  listCompanies,
  type Quote,
} from "@/lib/market-intelligence/data";
import {
  formatCompactNumber,
  formatPercent,
  percentChange,
} from "@/lib/market-intelligence/chart";
import {
  ProviderNotice,
  SectionHeading,
} from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import { FaqSection } from "@/components/seo/SeoSections";
import { MARKET_INTEL_FAQS } from "@/config/market-intelligence-faqs";

const WATCHLIST_KEY = "frelux.mi.watchlist";

function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function StockMarket() {
  useBreadcrumbJsonLd([
    { name: "Market intelligence", path: "/market-intelligence" },
    { name: "Listed companies", path: "/market-intelligence/stocks" },
  ]);
  useSeo({
    title:
      "Construction Stock Market: Listed Builders & Materials Companies | FRELUX",
    description:
      "Follow listed construction, materials and engineering companies: prices, daily change, market capitalisation and volume where a data provider is configured, with company profiles, sector filters, comparison and watchlists.",
    canonicalPath: "/market-intelligence/stocks",
    ogType: "website",
    keywords:
      "construction stocks, building materials stocks, infrastructure companies, cement shares, steel shares, construction sector index",
  });

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [watchlist, setWatchlist] = useState<string[]>(() => readWatchlist());
  const [compare, setCompare] = useState<string[]>([]);

  const state = useAsyncData(async () => {
    const [companiesRes, provider] = await Promise.all([
      listCompanies(),
      fetchProviderStatus(),
    ]);
    const companies = companiesRes.ok ? companiesRes.data : [];
    const configured = Boolean(provider.ok && provider.data.configured);
    const quotesRes = configured
      ? await fetchQuotes(companies.map((c) => c.symbol))
      : null;
    const quotes = quotesRes && quotesRes.ok ? quotesRes.data.quotes : [];
    return {
      companies,
      quotes: new Map<string, Quote>(quotes.map((q) => [q.symbol, q])),
      configured,
      providerMessage: provider.ok ? provider.data.message : undefined,
    };
  });

  const sectors = useMemo(() => {
    if (state.status !== "ready") return [];
    return [...new Set(state.data.companies.map((c) => c.sector))].sort();
  }, [state]);

  function toggleWatch(symbol: string) {
    setWatchlist((current) => {
      const next = current.includes(symbol)
        ? current.filter((s) => s !== symbol)
        : [...current, symbol];
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // storage can be unavailable in private mode; the list still works this session
      }
      return next;
    });
  }

  function toggleCompare(symbol: string) {
    setCompare((current) => {
      if (current.includes(symbol)) return current.filter((s) => s !== symbol);
      if (current.length >= 3) return [...current.slice(1), symbol];
      return [...current, symbol];
    });
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">
        Loading the stock market view…
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

  const { companies, quotes, configured, providerMessage } = state.data;
  const rows = companies.filter((c) => {
    const matchesQuery =
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.symbol.toLowerCase().includes(query.toLowerCase());
    const matchesSector = sector === "all" || c.sector === sector;
    return matchesQuery && matchesSector;
  });

  const watched = rows.filter((r) => watchlist.includes(r.symbol));
  const compared = compare
    .map((symbol) => ({
      company: companies.find((c) => c.symbol === symbol),
      quote: quotes.get(symbol),
    }))
    .filter((r) => r.company);

  return (
    <>
      <PageHeader
        variant="data"
        eyebrow="Market intelligence"
        title="Listed construction companies"
        subtitle="Prices, daily change and market capitalisation for builders, materials producers and engineering firms, filtered by sector and market."
        breadcrumbs={[
          { label: "Market intelligence", path: "/market-intelligence" },
          { label: "Listed companies" },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cement, aggregates, steel, paint, plant hire and engineering
            issuers. Prices and market capitalisation come from a market data
            provider; company reference data is maintained by FRELUX.
          </p>
        </div>

        {!configured ? (
          <div className="mt-6">
            <ProviderNotice
              tone="warning"
              title="Prices are not connected"
              message={
                providerMessage ??
                "No market data provider key is configured, so this table lists companies without prices. FRELUX will not show a placeholder price in its place."
              }
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search companies</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ticker"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:outline-none"
            />
          </label>
          <label className="sm:w-56">
            <span className="sr-only">Sector</span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none"
            >
              <option value="all">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {compared.length > 0 ? (
          <section className="mt-8">
            <SectionHeading
              title="Comparison"
              description="Up to three companies side by side."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {compared.map(({ company, quote }) => (
                <div
                  key={company!.symbol}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {company!.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {company!.name}
                  </p>
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="tabular-nums">
                        {quote?.price != null ? quote.price.toFixed(2) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Day change</dt>
                      <dd className="tabular-nums">
                        {formatPercent(quote?.change_pct ?? null)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Market cap</dt>
                      <dd className="tabular-nums">
                        {formatCompactNumber(quote?.market_cap ?? null)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Exchange</dt>
                      <dd>{company!.exchange}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {watched.length > 0 ? (
          <section className="mt-8">
            <SectionHeading
              title="Watchlist"
              description="Saved in this browser only."
            />
            <div className="flex flex-wrap gap-2">
              {watched.map((c) => {
                const q = quotes.get(c.symbol);
                return (
                  <Link
                    key={c.symbol}
                    to={`/market-intelligence/stocks/${c.symbol}`}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-brand-purple/40"
                  >
                    <span className="font-semibold text-foreground">
                      {c.symbol}
                    </span>{" "}
                    <span className="tabular-nums text-muted-foreground">
                      {q?.price != null ? q.price.toFixed(2) : "—"}
                    </span>{" "}
                    <span
                      className={
                        q?.change_pct != null && q.change_pct >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }
                    >
                      {formatPercent(q?.change_pct ?? null)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Listed construction companies with the latest available quote
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-2">
                  Company
                </th>
                <th scope="col" className="py-2 pr-2">
                  Sector
                </th>
                <th scope="col" className="py-2 pr-2 text-right">
                  Price
                </th>
                <th scope="col" className="py-2 pr-2 text-right">
                  Day
                </th>
                <th scope="col" className="py-2 pr-2 text-right">
                  Market cap
                </th>
                <th scope="col" className="py-2 pr-2 text-right">
                  Volume
                </th>
                <th scope="col" className="py-2 text-right">
                  Track
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const q = quotes.get(c.symbol);
                const change =
                  q?.change_pct ??
                  percentChange(q?.previous_close ?? null, q?.price ?? null);
                return (
                  <tr key={c.symbol} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      <Link
                        to={`/market-intelligence/stocks/${c.symbol}`}
                        className="font-medium text-foreground hover:text-brand-purple"
                      >
                        {c.symbol}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.name}
                      </span>
                      <span className="ml-2 rounded bg-muted px-1 text-[11px] uppercase text-muted-foreground">
                        {c.exchange}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-xs capitalize text-muted-foreground">
                      {c.sector}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {q?.price != null ? q.price.toFixed(2) : "—"}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right tabular-nums ${change == null ? "text-muted-foreground" : change >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {formatPercent(change)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatCompactNumber(q?.market_cap ?? null)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatCompactNumber(q?.volume ?? null)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => toggleCompare(c.symbol)}
                        className={`mr-2 rounded border px-1.5 py-0.5 text-[11px] ${compare.includes(c.symbol) ? "border-brand-purple text-brand-purple" : "border-border text-muted-foreground"}`}
                        aria-label={`Compare ${c.symbol}`}
                      >
                        vs
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWatch(c.symbol)}
                        aria-label={`${watchlist.includes(c.symbol) ? "Remove" : "Add"} ${c.symbol} ${watchlist.includes(c.symbol) ? "from" : "to"} watchlist`}
                        aria-pressed={watchlist.includes(c.symbol)}
                      >
                        <Star
                          className={`h-4 w-4 ${watchlist.includes(c.symbol) ? "fill-brand-purple text-brand-purple" : "text-muted-foreground"}`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No company matches that search.
            </p>
          ) : null}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            A dash means no figure is available from a configured provider.
            Company reference data is maintained by FRELUX and is not a
            recommendation to buy or sell any security.
          </p>
        </section>
      </div>
      <FaqSection faqs={MARKET_INTEL_FAQS.stocks} />
    </>
  );
}
