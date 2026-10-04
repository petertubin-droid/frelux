import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ArrowRight, Clock, X, type LucideIcon } from "lucide-react";
import AdSlot from "@/components/ui/AdSlot";
import Container from "@/components/ui/Container";
import { useSeo } from "@/lib/seo";
import {
  getStoredUnitSystem,
  setStoredUnitSystem,
  type UnitSystem,
} from "@/lib/international/units-display";
import { track } from "@/lib/analytics";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
  type Tool,
  type ToolCategoryId,
} from "@/config/construction-tools";
import { SITE_URL } from "@/lib/seo";
import { EstimateDisclaimer } from "@/components/calculators";

/**
 * Construction Tools — the single FRELUX tool library.
 *
 * Replaces the old "Calculators" page. Users never need to know whether a
 * tool was internally a "calculator" or an "estimator": every entry is one
 * authoritative tool backed by a deterministic engine.
 */

const RECENT_KEY = "frelux_recent_tools";
const MAX_RECENT = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr)
      ? arr.filter((x) => typeof x === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function rememberTool(slug: string) {
  try {
    const next = [slug, ...loadRecent().filter((s) => s !== slug)].slice(
      0,
      MAX_RECENT,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.to}
      onClick={() => {
        rememberTool(tool.slug);
        track("construction_tool_opened", {
          tool: tool.slug,
          category: tool.category,
        });
      }}
      className="card group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-premium-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-brand-purple">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {tool.featured && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
            Popular
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground dark:text-primary-foreground">
        {tool.title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
        {tool.does}
      </p>
      <dl className="mt-4 space-y-2 border-t border-border/60 pt-3 dark:border-white/10">
        <div className="flex gap-2 text-xs">
          <dt className="shrink-0 font-bold uppercase tracking-wide text-muted-foreground/90">
            You enter:
          </dt>
          <dd className="text-muted-foreground">{tool.enters}</dd>
        </div>
        <div className="flex gap-2 text-xs">
          <dt className="shrink-0 font-bold uppercase tracking-wide text-muted-foreground/90">
            You get:
          </dt>
          <dd className="text-muted-foreground">{tool.gets}</dd>
        </div>
      </dl>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
        Open tool
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default function ConstructionTools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [recent, setRecent] = useState<string[]>([]);

  useSeo({
    title: "Construction Tools — Calculators & Estimators | FRELUX",
    description:
      "Every FRELUX construction tool in one place: paint, tiling, screeding, POP, concrete, solar, plumbing, BOQ and more. Search, compare and calculate with verified market prices, starting with Nigeria.",
    canonicalPath: "/construction-tools",
  });

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const activeCategory = (searchParams.get("category") ?? "all") as
    ToolCategoryId | "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONSTRUCTION_TOOLS.filter((t) => {
      const inCategory =
        activeCategory === "all" || t.category === activeCategory;
      if (!inCategory) return false;
      if (!q) return true;
      const haystack =
        `${t.title} ${t.does} ${t.gets} ${t.benefit ?? ""} ${t.category}`.toLowerCase();
      return q.split(/\s+/).every((w) => haystack.includes(w));
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all" || query.trim()) return null;
    return TOOL_CATEGORIES.map((cat) => ({
      cat,
      tools: CONSTRUCTION_TOOLS.filter((t) => t.category === cat.id),
    })).filter((g) => g.tools.length > 0);
  }, [activeCategory, query]);

  const recentTools = useMemo(
    () =>
      recent
        .map((slug) => CONSTRUCTION_TOOLS.find((t) => t.slug === slug))
        .filter(Boolean) as Tool[],
    [recent],
  );

  const totalTools = CONSTRUCTION_TOOLS.length;

  // Unit display preference (display layer only — data stays metric)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() =>
    getStoredUnitSystem(),
  );
  const switchUnitSystem = (u: UnitSystem) => {
    setStoredUnitSystem(u);
    setUnitSystem(u);
  };

  return (
    <>
      {/* Hero / search */}
      <section className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent py-10 dark:border-white/5 dark:from-primary/10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground dark:text-primary-foreground sm:text-4xl">
              Construction Tools
            </h1>
            <p className="mt-3 text-muted-foreground dark:text-muted-foreground">
              {totalTools} tools with verified market prices. Enter what you
              know, get exact quantities and costs — no guesswork.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-xs dark:border-white/10">
              <span className="pl-2 pr-1 text-muted-foreground">Units:</span>
              <button
                type="button"
                onClick={() => switchUnitSystem("metric")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  unitSystem === "metric"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Metric (m²)
              </button>
              <button
                type="button"
                onClick={() => switchUnitSystem("imperial")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  unitSystem === "imperial"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Imperial (ft²)
              </button>
            </div>
            <div className="relative mt-6">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length >= 3) {
                    track("construction_tools_searched", {
                      query: e.target.value,
                    });
                  }
                  const next = new URLSearchParams(searchParams);
                  if (e.target.value) next.set("q", e.target.value);
                  else next.delete("q");
                  setSearchParams(next, { replace: true });
                }}
                placeholder="Search tools — paint, tiles, solar, BOQ, labour…"
                aria-label="Search construction tools"
                className="h-14 w-full rounded-2xl border border-border/60 bg-card pl-12 pr-12 text-base text-foreground shadow-premium-lg outline-none ring-brand-purple/40 transition-all placeholder:text-muted-foreground/70 focus:ring-2 dark:border-white/10 dark:bg-card dark:text-primary-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        {/* Category chips */}
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Tool categories"
        >
          <button
            role="tab"
            aria-selected={activeCategory === "all"}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("category");
              setSearchParams(next, { replace: true });
            }}
            className={
              activeCategory === "all"
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:border-white/10"
            }
          >
            All tools ({totalTools})
          </button>
          {TOOL_CATEGORIES.map((cat) => {
            const count = CONSTRUCTION_TOOLS.filter(
              (t) => t.category === cat.id,
            ).length;
            if (count === 0) return null;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("category", cat.id);
                  if (query) next.set("q", query);
                  setSearchParams(next, { replace: true });
                }}
                className={
                  active
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:border-white/10"
                }
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Recently used */}
        {!query && recentTools.length > 0 && (
          <section className="mt-8" aria-labelledby="recent-heading">
            <h2
              id="recent-heading"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground"
            >
              <Clock className="h-4 w-4" aria-hidden="true" /> Recently used
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentTools.map((t) => {
                const Icon: LucideIcon = t.icon;
                return (
                  <Link
                    key={t.slug}
                    to={t.to}
                    onClick={() => rememberTool(t.slug)}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand-purple/40 hover:text-brand-purple dark:border-white/10 dark:text-primary-foreground"
                  >
                    <Icon
                      className="h-4 w-4 text-brand-purple"
                      aria-hidden="true"
                    />
                    {t.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Results */}
        {grouped ? (
          grouped.map(({ cat, tools }) => (
            <section
              key={cat.id}
              className="mt-10"
              aria-labelledby={`cat-${cat.id}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id={`cat-${cat.id}`}
                  className="text-xl font-bold text-foreground dark:text-primary-foreground"
                >
                  {cat.label}
                </h2>
                <p className="text-sm text-muted-foreground">{cat.blurb}</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="mt-8" aria-live="polite">
            {filtered.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-lg font-semibold text-foreground dark:text-primary-foreground">
                  No tools match “{query}”
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a material (paint, tile, block), a trade (plumbing,
                  electrical) or a goal (budget, timeline).
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "tool" : "tools"}{" "}
                  found
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <AdSlot slotKey="tools-page" className="mt-10" />
        <div className="mt-10">
          <EstimateDisclaimer />
        </div>
      </Container>
    </>
  );
}
