import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Minus,
  TrendingUp,
  TrendingDown,
  Search,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";

type Status = "loading" | "ready" | "error";

interface PriceRow {
  name: string;
  category: string | null;
  pack_size: string | null;
  price: number;
  currency: string;
  effective_date: string | null;
  price_source: string | null;
}

interface Movement {
  material_name: string;
  old_price: number | null;
  new_price: number | null;
  created_at: string;
}

/** CURRENCY FORMATTING: symbol + locale grouping, trailing ".00" trimmed. */
const SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
};

function money(v: number, currency: string): string {
  const sym = SYMBOLS[currency] ?? currency + " ";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(v);
  return `${sym}${formatted}`;
}

function prettyCategory(slug: string | null): string {
  if (!slug) return "Other";
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function MaterialPrices() {
  useSeo({
    title: "Material Prices: Live Construction & Paint Price Book",
    description:
      "Browse the FRELUX material price book: current prices for cement, paint, aggregates, plumbing, electrical and more, with sources, effective dates, and weekly movement.",
    canonicalPath: "/prices",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "FRELUX Material Price Book",
      description:
        "Live price reference for construction and finishing materials, updated from retailer scans and admin-verified sources.",
      url: `${SITE_URL}/prices`,
    },
  });

  const [rows, setRows] = useState<PriceRow[]>([]);
  const [movements, setMovements] = useState<Record<string, Movement>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prices and materials are separate anon-readable tables; the
        // join is done client-side because the price book is small
        // (dozens of rows) and avoids fragile embedded-resource names.
        const [pricesRes, materialsRes, historyRes] = await Promise.all([
          supabase
            .from("estimation_prices")
            .select(
              "ref_id, price, currency, effective_date, price_source, is_active",
            )
            .eq("price_type", "material")
            .eq("is_active", true),
          supabase
            .from("estimation_materials")
            .select("id, name, category, pack_size"),
          supabase
            .from("material_price_history")
            .select("material_name, old_price, new_price, created_at")
            .order("created_at", { ascending: false })
            .limit(200),
        ]);
        if (cancelled) return;
        if (pricesRes.error) throw pricesRes.error;
        const materialsById = new Map(
          (
            materialsRes.data as {
              id: string;
              name: string;
              category: string | null;
              pack_size: string | null;
            }[]
          ).map((m) => [m.id, m]),
        );
        const built: PriceRow[] = (pricesRes.data ?? [])
          .filter((p) => materialsById.has(p.ref_id))
          .map((p) => {
            const m = materialsById.get(p.ref_id)!;
            return {
              name: m.name,
              category: m.category ?? null,
              pack_size: m.pack_size ?? null,
              price: Number(p.price),
              currency: p.currency ?? "NGN",
              effective_date: p.effective_date ?? null,
              price_source: p.price_source ?? null,
            };
          })
          .filter((r) => Number.isFinite(r.price) && r.price > 0)
          .sort((a, b) => a.name.localeCompare(b.name));

        // Latest recorded movement per material (if any exist yet).
        const byName: Record<string, Movement> = {};
        for (const h of (historyRes.data ?? []) as Movement[]) {
          if (!byName[h.material_name]) byName[h.material_name] = h;
        }

        setRows(built);
        setMovements(byName);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(getSafeError(e, "Failed to load"));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currencies = useMemo(
    () => Array.from(new Set(rows.map((r) => r.currency))).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (currencyFilter === "all" || r.currency === currencyFilter) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q)),
    );
  }, [rows, currencyFilter, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PriceRow[]>();
    for (const r of visible) {
      const key = r.category ?? "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [visible]);

  const hasHistory = Object.keys(movements).length > 0;

  if (status === "loading")
    return (
      <>
        <PageHeader
          eyebrow="Market Intelligence"
          title="Material Prices"
          subtitle="The live FRELUX price book: what materials cost right now, where the numbers come from, and how they moved."
          breadcrumbs={[{ label: "Material Prices" }]}
        />
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading…
        </div>
      </>
    );

  if (status === "error")
    return (
      <>
        <PageHeader
          eyebrow="Market Intelligence"
          title="Material Prices"
          subtitle="The live FRELUX price book: what materials cost right now, where the numbers come from, and how they moved."
          breadcrumbs={[{ label: "Material Prices" }]}
        />
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-red-400"
          />
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        eyebrow="Market Intelligence"
        title="Material Prices"
        subtitle="The live FRELUX price book: what materials cost right now, where the numbers come from, and how they moved."
        breadcrumbs={[{ label: "Material Prices" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {["all", ...currencies].map((c) => (
              <button
                key={c}
                onClick={() => setCurrencyFilter(c)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  currencyFilter === c
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:border-brand-purple/40 hover:text-foreground dark:border-white/10 dark:bg-card dark:text-muted-foreground"
                }`}
              >
                {c === "all" ? "All currencies" : c}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials…"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-card dark:text-primary-foreground"
            />
          </div>
        </div>

        {/* Honesty note */}
        <p className="mb-8 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
          Every price below was captured from a named retailer scan or
          admin-verified source, with the date it took effect. Prices vary by
          region and supplier: treat this as a planning reference, then confirm
          with your own supplier before buying.
        </p>

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-16 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-muted-foreground">
              No tracked prices yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {prettyCategory(category)}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm dark:border-white/5 dark:bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground dark:border-white/5">
                        <th className="px-5 py-3 font-semibold">Material</th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Price
                        </th>
                        <th className="hidden px-5 py-3 font-semibold sm:table-cell">
                          Source
                        </th>
                        <th className="hidden px-5 py-3 font-semibold md:table-cell">
                          Effective
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => {
                        const mv = movements[r.name];
                        const pct =
                          mv && mv.old_price && mv.new_price && mv.old_price > 0
                            ? ((mv.new_price - mv.old_price) / mv.old_price) *
                              100
                            : null;
                        return (
                          <tr
                            key={`${r.category}-${r.name}`}
                            className="border-b border-border/40 last:border-0 dark:border-white/5"
                          >
                            <td className="px-5 py-3.5">
                              <span className="font-medium text-foreground dark:text-primary-foreground">
                                {r.name}
                              </span>
                              {r.pack_size && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({r.pack_size})
                                </span>
                              )}
                              {mv && pct !== null && (
                                <span
                                  className={`ml-2 inline-flex items-center gap-1 text-xs font-semibold ${
                                    pct > 0
                                      ? "text-red-500 dark:text-red-400"
                                      : pct < 0
                                        ? "text-accent-green dark:text-accent-green-light"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {pct > 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : pct < 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : (
                                    <Minus className="h-3 w-3" />
                                  )}
                                  {Math.abs(pct).toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-foreground dark:text-primary-foreground">
                              {money(r.price, r.currency)}
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                {r.currency}
                              </span>
                            </td>
                            <td className="hidden px-5 py-3.5 text-xs text-muted-foreground sm:table-cell">
                              {r.price_source ?? "Admin verified"}
                            </td>
                            <td className="hidden px-5 py-3.5 text-xs text-muted-foreground md:table-cell">
                              {r.effective_date ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        {!hasHistory && rows.length > 0 && (
          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
            <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" />
            This book records every change as it happens. Movement arrows will
            appear here as prices are updated week over week.
          </p>
        )}

        {/* Weekly digest signup */}
        <div className="mt-14 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-primary/[0.03] to-primary/[0.06] p-8 text-center dark:border-white/10 dark:from-card dark:via-card/50 dark:to-background">
          <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
            Prices move. Get the weekly digest.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground dark:text-muted-foreground">
            One email every Monday with the tracked prices and how they moved
            since last week. No noise, unsubscribe anytime.
          </p>
          <div className="mx-auto mt-5 max-w-md">
            <NewsletterSignup source="price_book" />
          </div>
        </div>

        <div className="mt-10">
          <AdSlot slotKey="home_bottom" />
        </div>
      </div>
    </>
  );
}
