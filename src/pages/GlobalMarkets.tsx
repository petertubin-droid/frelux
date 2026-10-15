/**
 * FRELUX Global Markets — Phase 6 (global market rankings).
 *
 * Public page for the 20 supported markets. Two families of
 * numbers, treated differently on purpose:
 *
 * - EXTERNAL metrics (construction output, GDP share, cost/m2):
 *   rendered ONLY when a sourced row exists in market_rankings,
 *   with the source name, a link, the as-of date and the
 *   confidence. "Not yet sourced" is rendered explicitly — a
 *   metric without a source is NEVER invented or converted
 *   across currencies.
 * - FRELUX coverage metrics: computed from the platform's own
 *   price books and role mappings (traceable, not an opinion).
 *
 * The market list itself comes from market_profiles (public
 * read), so a registered-but-unverified market (e.g. CN) shows
 * up honestly as "pending data verification" instead of being
 * hidden or faked.
 */

import { useEffect, useMemo, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { supabase } from "@/lib/supabase";

interface MarketProfileRow {
  country_code: string;
  country_name: string;
  region: string;
  currency_code: string;
  currency_symbol: string;
  default_language: string;
  status: string;
  is_visible: boolean;
  sort_order: number;
  admin_notes: string | null;
}

interface MarketRankingRow {
  market_code: string;
  metric: string;
  value: number;
  unit: string;
  source_name: string;
  source_url: string | null;
  as_of: string;
  confidence: string;
  notes: string | null;
}

const COVERAGE_LABELS: Record<number, string> = {
  0: "Pending verification",
  1: "Low coverage",
  2: "Medium coverage",
  3: "High coverage",
};

const EXTERNAL_METRIC_LABELS: Record<string, string> = {
  construction_output: "Construction output",
  construction_gdp_share: "Construction share of GDP",
  cost_per_m2: "Average build cost per m²",
};

export default function GlobalMarkets() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Global Markets", path: "/global-markets" },
  ]);
  useSeo({
    title: "Global Markets: Construction Data & Coverage | FRELUX",
    description:
      "FRELUX supports 20 markets with locally verified material prices. Every ranking metric shows its source — no source, no number.",
  });

  const [profiles, setProfiles] = useState<MarketProfileRow[]>([]);
  const [rankings, setRankings] = useState<MarketRankingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [
          { data: profileRows, error: profileError },
          { data: rankingRows, error: rankingError },
        ] = await Promise.all([
          supabase
            .from("market_profiles")
            .select(
              "country_code, country_name, region, currency_code, currency_symbol, default_language, status, is_visible, sort_order, admin_notes",
            )
            .eq("is_visible", true)
            .order("sort_order"),
          supabase
            .from("market_rankings")
            .select(
              "market_code, metric, value, unit, source_name, source_url, as_of, confidence, notes",
            )
            .eq("is_active", true),
        ]);
        if (profileError) throw profileError;
        if (rankingError) throw rankingError;
        if (!alive) return;
        setProfiles((profileRows ?? []) as MarketProfileRow[]);
        setRankings((rankingRows ?? []) as MarketRankingRow[]);
      } catch (err) {
        if (!alive) return;
        setLoadError(getSafeError(err, "Could not load market data"));
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) track("calculator_started", { page: "global-markets" });
  }, [ready]);

  const byMarket = useMemo(() => {
    const map = new Map<string, MarketRankingRow[]>();
    for (const row of rankings) {
      const list = map.get(row.market_code) ?? [];
      list.push(row);
      map.set(row.market_code, list);
    }
    return map;
  }, [rankings]);

  const sorted = useMemo(() => {
    const level = (code: string) =>
      Number(
        byMarket.get(code)?.find((r) => r.metric === "frelux_coverage_level")
          ?.value ?? 0,
      );
    return [...profiles].sort((a, b) => {
      const d = level(b.country_code) - level(a.country_code);
      return d !== 0 ? d : a.sort_order - b.sort_order;
    });
  }, [profiles, byMarket]);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="relative overflow-hidden bg-background">
        <img
          src="/lovable-uploads/hero_background.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
        <Container className="relative">
          <PageHeader
            variant="data"
            title="Global Markets"
            subtitle="20 markets, locally verified prices, honest coverage. Every external figure cites its source — a metric without a verified source is shown as “not yet sourced”, never invented."
          />
        </Container>
      </div>

      <Container className="mt-8">
        <AdSlot slotKey="calculator_mid" className="mb-8" />

        {loadError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </p>
        )}

        {!ready && !loadError && (
          <p className="text-sm text-muted-foreground">Loading markets…</p>
        )}

        {ready && sorted.length === 0 && !loadError && (
          <p className="text-sm text-muted-foreground">
            No markets are visible yet.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((m) => {
            const rows = byMarket.get(m.country_code) ?? [];
            const level = Number(
              rows.find((r) => r.metric === "frelux_coverage_level")?.value ??
                0,
            );
            const book = rows.find(
              (r) => r.metric === "frelux_price_book_rows",
            );
            const roles = rows.find((r) => r.metric === "frelux_role_mappings");
            const scans = rows.find((r) => r.metric === "frelux_scan_sources");
            const external = rows.filter((r) =>
              Object.keys(EXTERNAL_METRIC_LABELS).includes(r.metric),
            );
            return (
              <article
                key={m.country_code}
                className="rounded-lg border bg-card p-5"
                data-testid={`market-card-${m.country_code}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {m.country_name}{" "}
                      <span className="text-sm text-muted-foreground">
                        ({m.country_code})
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {m.region} · {m.currency_code} ({m.currency_symbol})
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-xs font-medium " +
                      (level >= 3
                        ? "bg-primary text-primary-foreground"
                        : level === 2
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {COVERAGE_LABELS[level] ?? COVERAGE_LABELS[0]}
                  </span>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Verified price rows
                    </dt>
                    <dd className="font-medium">
                      {book ? book.value.toLocaleString() : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Material roles mapped
                    </dt>
                    <dd className="font-medium">{roles ? roles.value : "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Monitored retailer sources
                    </dt>
                    <dd className="font-medium">{scans ? scans.value : "—"}</dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3 border-t pt-3">
                  {external.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Market-size metrics: not yet sourced.{" "}
                      {level === 0
                        ? "This market is registered; its product data is pending verification."
                        : "We publish figures only when we can cite them."}
                    </p>
                  ) : (
                    external.map((r) => (
                      <div key={r.metric} className="text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-muted-foreground">
                            {EXTERNAL_METRIC_LABELS[r.metric] ?? r.metric}
                          </span>
                          <span className="font-semibold">
                            {Number(r.value).toLocaleString()}{" "}
                            <span className="font-normal text-muted-foreground">
                              {r.unit}
                            </span>
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {r.source_url ? (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-foreground"
                            >
                              {r.source_name}
                            </a>
                          ) : (
                            r.source_name
                          )}{" "}
                          · as of {r.as_of} · confidence {r.confidence}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Coverage levels are computed from FRELUX's own price books and role
          mappings (recomputed 2026-10-13). External figures are only published
          with a named source and date; anything else stays absent until it can
          be cited.
        </p>
      </Container>
    </div>
  );
}
