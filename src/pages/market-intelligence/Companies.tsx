import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { fetchProviderStatus, fetchQuotes, listCompanies } from "@/lib/market-intelligence/data";
import { SectionHeading } from "@/components/market-intelligence/ui";

export default function Companies() {
  useSeo({
    title: "Listed Construction, Materials and Engineering Companies | FRELUX",
    description:
      "Profiles of publicly listed construction, building materials, aggregates, steel and engineering companies, with exchange, country, sector and reported scale where a data provider supplies it.",
    canonicalPath: "/market-intelligence/companies",
    ogType: "website",
    keywords: "construction company profiles, listed construction companies, building materials companies, infrastructure engineering companies",
  });

  const [sector, setSector] = useState("all");
  const state = useAsyncData(async () => {
    const [companiesRes, provider] = await Promise.all([listCompanies(), fetchProviderStatus()]);
    const companies = companiesRes.ok ? companiesRes.data : [];
    const configured = Boolean(provider.ok && provider.data.configured);
    const quotesRes = configured ? await fetchQuotes(companies.map((c) => c.symbol)) : null;
    return {
      companies,
      quotes: new Map((quotesRes && quotesRes.ok ? quotesRes.data.quotes : []).map((q) => [q.symbol, q])),
    };
  });

  const sectors = useMemo(() => {
    if (state.status !== "ready") return ["all"];
    return ["all", ...Array.from(new Set(state.data.companies.map((c) => c.sector))).sort()];
  }, [state]);

  const visible = useMemo(() => {
    if (state.status !== "ready") return [];
    return sector === "all" ? state.data.companies : state.data.companies.filter((c) => c.sector === sector);
  }, [state, sector]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">Company Profiles</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
          Who builds, supplies and engineers
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The listed companies behind equipment, aggregates, cement, steel, engineering and building products. Profiles
          carry listing facts only; anything sourced from a market data provider is labelled with its timestamp.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {sectors.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSector(s)}
            aria-pressed={sector === s}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
              sector === s ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {state.status === "loading" ? <p className="mt-8 text-sm text-muted-foreground">Loading companies…</p> : null}
      {state.status === "error" ? <p className="mt-8 text-sm text-muted-foreground">Unavailable: {state.message}</p> : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => {
          const quote = state.status === "ready" ? state.data.quotes.get(c.symbol) : undefined;
          return (
            <Link
              key={c.symbol}
              to={`/market-intelligence/companies/${c.symbol.toLowerCase()}`}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-purple/60"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground group-hover:text-brand-purple">{c.name}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">{c.symbol}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.exchange} · {c.country_code} · <span className="capitalize">{c.sector}</span>
              </p>
              {quote ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last {quote.price} {quote.currency}{quote.as_of ? `, ${quote.as_of.slice(0, 10)}` : ""}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Price unavailable without a configured provider</p>
              )}
            </Link>
          );
        })}
      </section>

      <section className="mt-12">
        <SectionHeading title="Why these companies" description="They are the listed end of the construction chain: the equipment, aggregates, cement, steel and engineering that a project actually buys." />
        <p className="text-sm leading-relaxed text-muted-foreground">
          FRELUX tracks a company because its products or services appear in real construction takeoffs, not because of
          its share price. See the{" "}
          <Link to="/market-intelligence/stocks" className="underline hover:text-foreground">stock market module</Link>{" "}
          for quotes and charts, or{" "}
          <Link to="/market-intelligence/materials" className="underline hover:text-foreground">material prices</Link>{" "}
          for what those products cost in each market.
        </p>
      </section>
    </div>
  );
}
