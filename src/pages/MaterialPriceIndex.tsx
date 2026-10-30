import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, MapPin, Search, Send } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import {
  CATEGORY_ORDER,
  LAUNCH_CITIES,
  categoryLabel,
  fetchCities,
  fetchListings,
  fetchMaterialHistory,
} from "@/lib/price-index/queries";
import {
  computeCityVariation,
  computeIndexLevel,
  computeMovement,
  computeStats,
  formatPercent,
  withinDays,
  type Sample,
} from "@/lib/price-index/stats";
import { groupByMaterial, toSamples } from "@/lib/price-index/resolver";
import { PRICE_KIND_LABELS, VERIFICATION_LABELS } from "@/lib/price-index/types";
import type { IndexListing, MarketCity, PriceKind } from "@/lib/price-index/types";

const NATIONAL = "__national__";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; listings: IndexListing[]; cities: MarketCity[] }
  | { kind: "error"; message: string };

export default function MaterialPriceIndex() {
  useSeo({
    title: "Live Nigerian Material Price Index",
    description:
      "Verified and reported construction material prices across Nigerian cities: cement, reinforcement bars, aggregates, blocks, roofing, tiles, paint and more, with sample sizes and last verification dates shown.",
    canonicalPath: "/material-price-index",
  });

  const { toast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [city, setCity] = useState<string>(NATIONAL);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [history, setHistory] = useState<{ observed_at: string; price: number }[]>([]);
  const [historyNote, setHistoryNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const [listingResult, cityResult] = await Promise.all([
      fetchListings({ limit: 800 }),
      fetchCities(),
    ]);
    if (listingResult.error) {
      setState({ kind: "error", message: listingResult.error });
      return;
    }
    setState({
      kind: "ready",
      listings: listingResult.listings,
      cities: cityResult.cities.length ? cityResult.cities : (LAUNCH_CITIES as MarketCity[]),
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const listings = useMemo(
    () => (state.kind === "ready" ? state.listings : []),
    [state],
  );
  const cities = useMemo(
    () => (state.kind === "ready" ? state.cities : []),
    [state],
  );
  const grouped = useMemo(() => groupByMaterial(listings), [listings]);

  /** Rows for the table: one per material, priced for the chosen market. */
  const rows = useMemo(() => {
    const out: {
      materialId: string;
      name: string;
      category: string;
      saleUnit: string | null;
      stats: ReturnType<typeof computeStats>;
      basis: "city" | "national";
      kind: PriceKind | null;
      source: string | null;
      lastObserved: string | null;
      verification: string | null;
      supporting: number;
    }[] = [];

    for (const [materialId, materialListings] of grouped) {
      const sample = materialListings[0];
      if (category !== "all" && sample.category !== category) continue;
      if (search && !sample.name.toLowerCase().includes(search.toLowerCase())) continue;

      const cityScoped =
        city === NATIONAL
          ? materialListings
          : materialListings.filter((listing) => listing.city_slug === city);
      const useCity = city !== NATIONAL && computeStats(toSamples(cityScoped)).status === "ok";
      const pool = useCity ? cityScoped : materialListings;

      const stats = computeStats(toSamples(pool));
      if (stats.status !== "ok") continue;

      const latest = [...pool]
        .filter((listing) => listing.effective_date)
        .sort((a, b) => (a.effective_date! < b.effective_date! ? 1 : -1))[0];

      out.push({
        materialId,
        name: sample.name,
        category: sample.category,
        saleUnit: latest?.sale_unit ?? sample.sale_unit,
        stats,
        basis: useCity ? "city" : "national",
        kind: latest?.price_kind ?? null,
        source: latest?.supplier_name ?? latest?.price_source ?? null,
        lastObserved: latest?.effective_date ?? null,
        verification: latest?.verification_status ?? null,
        supporting: latest?.supporting_submissions ?? 0,
      });
    }

    return out.sort((a, b) => {
      const byCategory =
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
    });
  }, [grouped, category, search, city]);

  const pricedCategories = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.category))),
    [listings],
  );

  const cityIndexLevel = useMemo(() => {
    const pool =
      city === NATIONAL
        ? listings
        : listings.filter((listing) => listing.city_slug === city);
    if (pool.length === 0) {
      return computeIndexLevel([
        { slug: "none", samples: [] as Sample[] },
      ]);
    }
    const byMaterial = groupByMaterial(pool);
    return computeIndexLevel(
      Array.from(byMaterial.entries()).map(([slug, group]) => ({
        slug,
        samples: toSamples(group),
      })),
    );
  }, [listings, city]);

  const coverage = useMemo(() => {
    const byMaterial = groupByMaterial(listings);
    let priced = 0;
    for (const group of byMaterial.values()) {
      if (computeStats(toSamples(group)).status === "ok") priced += 1;
    }
    const cityCount = new Set(
      listings.map((listing) => listing.city_slug).filter(Boolean),
    ).size;
    const dates = listings
      .map((listing) => listing.effective_date)
      .filter((date): date is string => Boolean(date))
      .sort();
    return {
      materials: priced,
      cities: cityCount,
      latest: dates[dates.length - 1] ?? null,
    };
  }, [listings]);

  /** Week-on-week movers, only where both ends clear the gate. */
  const movers = useMemo(() => {
    const out: { materialId: string; name: string; change: number; to: number }[] = [];
    for (const [materialId, group] of grouped) {
      const pool = city === NATIONAL ? group : group.filter((l) => l.city_slug === city);
      const samples = toSamples(pool.length >= 3 ? pool : group);
      const recent = computeMovement(withinDays(samples, 7), samples);
      if (recent.status === "ok") {
        out.push({ materialId, name: group[0].name, change: recent.change, to: recent.to });
      }
    }
    return out.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 4);
  }, [grouped, city]);

  const comparison = useMemo(() => {
    if (!selectedMaterial) return null;
    const group = grouped.get(selectedMaterial) ?? [];
    const byCity = cities.map((entry) => ({
      city_slug: entry.slug,
      city_name: entry.name,
      samples: toSamples(group.filter((listing) => listing.city_slug === entry.slug)),
    }));
    return computeCityVariation(byCity);
  }, [selectedMaterial, grouped, cities]);

  useEffect(() => {
    if (!selectedMaterial) {
      setHistory([]);
      setHistoryNote(null);
      return;
    }
    let cancelled = false;
    fetchMaterialHistory(selectedMaterial).then((result) => {
      if (cancelled) return;
      setHistory(result.points);
      setHistoryNote(
        result.error
          ? result.error
          : result.points.length < 2
            ? "No recorded price changes yet for this material, so there is no history line to draw."
            : null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMaterial]);

  const selectedName = selectedMaterial
    ? (grouped.get(selectedMaterial)?.[0]?.name ?? "Selected material")
    : "";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Live Material Price Index"
        subtitle="Construction material prices across Nigeria, with the evidence behind every number: sample size, source, price basis and last verification date."
      />

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mt-6 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            A market figure is published only when at least three independent prices
            agree on it. Below that, the material is listed as unpriced rather than
            estimated. Prices marked reported have a stated source but have not been
            independently verified.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="text-primary hover:underline" to="/material-prices">
              Submit or review a price
            </Link>
            <Link className="text-primary hover:underline" to="/construction-tools">
              Tools that use these prices
            </Link>
          </div>
        </div>

        {state.kind === "error" ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              The price index could not be loaded
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
            <button
              onClick={load}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="mt-8 animate-pulse space-y-3">
            <div className="h-10 rounded-lg bg-muted" />
            <div className="h-40 rounded-lg bg-muted" />
          </div>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Index level"
                value={
                  cityIndexLevel.status === "ok"
                    ? formatCurrency(cityIndexLevel.level, "NGN")
                    : "Not published"
                }
                note={
                  cityIndexLevel.status === "ok"
                    ? `Median of ${cityIndexLevel.materials} materials clearing the sample gate`
                    : cityIndexLevel.reason
                }
              />
              <Stat
                label="Materials with a figure"
                value={String(coverage.materials)}
                note={`${listings.length} individual price record${listings.length === 1 ? "" : "s"} collected`}
              />
              <Stat
                label="Latest observation"
                value={coverage.latest ?? "None yet"}
                note={
                  coverage.cities > 0
                    ? `City-level pricing in ${coverage.cities} cit${coverage.cities === 1 ? "y" : "ies"}`
                    : "National figures only, no city-level pricing yet"
                }
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Market city
                </span>
                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
                >
                  <option value={NATIONAL}>All Nigeria (national)</option>
                  {cities.map((entry) => (
                    <option key={entry.slug} value={entry.slug}>
                      {entry.name}
                      {entry.state ? `, ${entry.state}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
                >
                  <option value="all">All categories</option>
                  {CATEGORY_ORDER.filter((entry) => pricedCategories.includes(entry)).map(
                    (entry) => (
                      <option key={entry} value={entry}>
                        {categoryLabel(entry)}
                      </option>
                    ),
                  )}
                  {pricedCategories
                    .filter((entry) => !CATEGORY_ORDER.includes(entry))
                    .map((entry) => (
                      <option key={entry} value={entry}>
                        {categoryLabel(entry)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Search material
                </span>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cement, 12 mm bar, sharp sand…"
                    className="h-11 w-full rounded-lg border border-border/70 bg-card pl-9 pr-3 text-sm"
                  />
                </div>
              </label>
            </div>

            {rows.length === 0 ? (
              <div className="mt-8 rounded-xl border border-border/70 bg-card p-6 text-center">
                <MapPin aria-hidden="true" className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-medium text-foreground">
                  No qualifying price for this selection
                </p>
                <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                  {city !== NATIONAL
                    ? "No city-level price clears the sample gate here yet, and the national sample is also too thin to publish. Nothing is estimated in its place."
                    : "No material in this selection has reached three independent prices yet. Nothing is estimated in its place."}
                </p>
                <Link
                  to="/material-prices"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  Add the first price
                </Link>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="hidden grid-cols-[2.2fr_1fr_1fr_1.2fr_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Material</span>
                  <span>Median</span>
                  <span>Range</span>
                  <span>Basis</span>
                  <span>Source</span>
                  <span>Evidence</span>
                </div>
                <ul className="divide-y">
                  {rows.map((row) => (
                    <li key={row.materialId}>
                      <button
                        onClick={() => setSelectedMaterial(row.materialId)}
                        className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left hover:bg-muted/40 sm:grid-cols-[2.2fr_1fr_1fr_1.2fr_1fr_1fr] sm:items-center sm:gap-3"
                      >
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {row.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {categoryLabel(row.category)}
                            {row.saleUnit ? ` · per ${row.saleUnit}` : ""}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(row.stats.status === "ok" ? row.stats.median : 0, "NGN")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.stats.status === "ok"
                            ? `${formatCurrency(row.stats.min, "NGN")} – ${formatCurrency(row.stats.max, "NGN")}`
                            : "—"}
                        </span>
                        <span className="text-xs">
                          <span
                            className={
                              row.basis === "city"
                                ? "rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                                : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                            }
                          >
                            {row.basis === "city"
                              ? cities.find((entry) => entry.slug === city)?.name ?? "City"
                              : "National median"}
                          </span>
                          {row.kind ? (
                            <span className="ml-1 text-muted-foreground">
                              {PRICE_KIND_LABELS[row.kind]}
                            </span>
                          ) : null}
                        </span>
                        <span className="truncate text-xs text-muted-foreground" title={row.source ?? ""}>
                          {row.source ?? "Source not recorded"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.stats.status === "ok"
                            ? `${row.stats.counted} price${row.stats.counted === 1 ? "" : "s"}${row.stats.excluded_outliers ? ` · ${row.stats.excluded_outliers} outlier` : ""}`
                            : "—"}
                          <span className="mt-0.5 block">
                            {row.verification
                              ? VERIFICATION_LABELS[
                                  row.verification as keyof typeof VERIFICATION_LABELS
                                ]
                              : "Unverified"}
                            {row.lastObserved ? ` · ${row.lastObserved}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground">
                  Price history{selectedName ? `: ${selectedName}` : ""}
                </h2>
                {!selectedMaterial ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select a material above to see its recorded price history.
                  </p>
                ) : historyNote ? (
                  <p className="mt-2 text-sm text-muted-foreground">{historyNote}</p>
                ) : (
                  <PriceHistoryChart points={history} />
                )}
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground">City comparison</h2>
                {!selectedMaterial ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select a material to compare its price across cities.
                  </p>
                ) : comparison && comparison.priced.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>
                      No city yet has three independent prices for this material, so
                      there is nothing to compare. Cities tracked:{" "}
                      {comparison.unpriced.slice(0, 6).join(", ")}
                      {comparison.unpriced.length > 6 ? " and others" : ""}.
                    </p>
                  </div>
                ) : comparison ? (
                  <CityComparison rows={comparison.priced} unpriced={comparison.unpriced} />
                ) : null}
              </section>
            </div>

            <section className="mt-6 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground">Market insights</h2>
              {movers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No seven-day movement can be published yet: that needs at least three
                  prices at both ends of the week. Nothing is inferred from a single
                  observation.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {movers.map((mover) => (
                    <li
                      key={mover.materialId}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{mover.name}</span>
                      <span
                        className={
                          mover.change >= 0
                            ? "flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400"
                            : "flex items-center gap-1 text-sm text-destructive"
                        }
                      >
                        {mover.change >= 0 ? (
                          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {formatPercent(mover.change)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground">Send in a price</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A receipt, invoice, distributor list or live supplier listing is what
                turns a quote into evidence. Every submission is reviewed by an
                administrator before it can change a calculator price.
              </p>
              <SubmissionForm
                cities={cities}
                onSubmitted={() => {
                  toast({
                    title: "Price submitted",
                    message: "An administrator will review it before it is used.",
                  });
                  load();
                }}
              />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function PriceHistoryChart({ points }: { points: { observed_at: string; price: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        One recorded price is a point, not a trend. A line appears once there are two
        or more observations.
      </p>
    );
  }
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 300;
  const height = 110;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.price - min) / span) * (height - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full"
        role="img"
        aria-label={`Price history from ${formatCurrency(min, "NGN")} to ${formatCurrency(max, "NGN")}`}
      >
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{points[0].observed_at.slice(0, 10)}</span>
        <span>
          {formatCurrency(min, "NGN")} – {formatCurrency(max, "NGN")}
        </span>
        <span>{points[points.length - 1].observed_at.slice(0, 10)}</span>
      </div>
    </div>
  );
}

function CityComparison({
  rows,
  unpriced,
}: {
  rows: { city_slug: string; city_name: string; median: number; count: number; versus_national: number | null }[];
  unpriced: string[];
}) {
  const max = Math.max(...rows.map((row) => row.median));
  return (
    <div className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.city_slug}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground">{row.city_name}</span>
            <span className="text-muted-foreground">
              {formatCurrency(row.median, "NGN")}
              {row.versus_national !== null
                ? ` · ${formatPercent(row.versus_national)} vs national`
                : ""}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.max(6, (row.median / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      {unpriced.length > 0 ? (
        <p className="pt-1 text-xs text-muted-foreground">
          Not yet priced for this material (below the three-price gate):{" "}
          {unpriced.slice(0, 8).join(", ")}
          {unpriced.length > 8 ? ` and ${unpriced.length - 8} more` : ""}.
        </p>
      ) : null}
    </div>
  );
}

function SubmissionForm({
  cities,
  onSubmitted,
}: {
  cities: MarketCity[];
  onSubmitted: () => void;
}) {
  const [city, setCity] = useState(cities[0]?.slug ?? "lagos");
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [kind, setKind] = useState<PriceKind>("retail");
  const [vendor, setVendor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const numeric = Number(price);
    if (!item.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      setMessage("Enter the material and a price above zero.");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("price-index-submit", {
      body: {
        market: "NG",
        city_slug: city,
        item_name: item.trim(),
        price: numeric,
        unit: unit.trim() || null,
        price_kind: kind,
        vendor: vendor.trim() || null,
        source_url: sourceUrl.trim() || null,
      },
    });
    setSending(false);

    if (error || (data as { ok?: boolean } | null)?.ok === false) {
      setMessage(
        (data as { error?: string } | null)?.error ??
          "The submission could not be saved. Please try again.",
      );
      return;
    }

    setItem("");
    setPrice("");
    setUnit("");
    setVendor("");
    setSourceUrl("");
    setMessage("Submitted. An administrator will review it before it changes any price.");
    onSubmitted();
  };

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">City</span>
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        >
          {cities.map((entry) => (
            <option key={entry.slug} value={entry.slug}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Material</span>
        <input
          value={item}
          onChange={(event) => setItem(event.target.value)}
          placeholder="Dangote 3X cement, 50 kg bag"
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Price (NGN)</span>
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder="52000"
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Sale unit</span>
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="50 kg bag, tonne, m³, piece"
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Price basis</span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as PriceKind)}
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        >
          {Object.entries(PRICE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Supplier or depot</span>
        <input
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs text-muted-foreground">
          Source link (listing, price list or receipt)
        </span>
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://"
          className="h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          onClick={submit}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {sending ? "Sending…" : "Submit price"}
        </button>
        {message ? (
          <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
