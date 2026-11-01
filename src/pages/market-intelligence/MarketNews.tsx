import { useState } from "react";
import { useSeo } from "@/lib/seo";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { listNews } from "@/lib/market-intelligence/data";
import { ProviderNotice } from "@/components/market-intelligence/ui";

const CATEGORIES = ["all", "industry", "materials", "infrastructure", "companies", "policy"];

export default function MarketNews() {
  useSeo({
    title: "Construction and Infrastructure Market News | FRELUX",
    description:
      "Attributed construction market news: material pricing, infrastructure programmes, company announcements and policy, each item naming its publication and date.",
    canonicalPath: "/market-intelligence/news",
    ogType: "website",
    keywords: "construction news, infrastructure news, building materials market news, construction industry updates",
  });

  const [category, setCategory] = useState("all");
  const state = useAsyncData(async () => {
    const res = await listNews({ limit: 40, category });
    if (!res.ok) throw new Error(res.message);
    return res.data;
  }, [category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">Market News</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
          Construction market coverage, attributed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Each item links to the publication that reported it and shows its date. FRELUX does not rewrite third-party
          reporting or publish unattributed market claims.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
              category === c ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading coverage…</p>
        ) : state.status === "error" ? (
          <ProviderNotice title="News is unavailable" message={state.message} />
        ) : state.data.length === 0 ? (
          <ProviderNotice
            title="Nothing published in this category yet"
            message="Coverage is curated and requires a named source plus a publication date. Until an item clears that bar the list stays empty rather than being filled with filler."
          />
        ) : (
          <ul className="space-y-3">
            {state.data.map((n) => (
              <li key={n.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 capitalize">{n.category}</span>
                  {n.symbol ? <span className="rounded bg-muted px-1.5 py-0.5">{n.symbol}</span> : null}
                  {n.market_code ? <span className="rounded bg-muted px-1.5 py-0.5">{n.market_code}</span> : null}
                  <time dateTime={n.published_at}>{new Date(n.published_at).toLocaleDateString()}</time>
                </div>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold text-foreground hover:text-brand-purple">
                  {n.headline}
                </a>
                {n.summary ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.summary}</p> : null}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Source:{" "}
                  {n.source_url ? (
                    <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{n.source_name}</a>
                  ) : n.source_name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
