import { useEffect, useMemo, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import type { MarketProfile } from "@/types/international";
import { useLanguage } from "@/lib/i18n";
import {
  BUNDLED_MARKET_PRESENTATION,
  BUNDLED_BOOK_VERSION,
} from "@/lib/international/bundled-price-books";

const EXTERNAL_METRIC_LABELS: Record<string, string> = {
  construction_output: "Construction output",
  construction_gdp_share: "Construction share of GDP",
  cost_per_m2: "Average build cost per m²",
};

type MarketCoverage = (typeof BUNDLED_MARKET_PRESENTATION)[string] & {
  pricedMaterials: number;
  roleMappings: number;
  popMaterials: number;
  tileMaterials: number;
};

/** Whole-market coverage from the bundled book (generated): every
 * website market is present, pending markets carry zero counts. */
function coverageFor(market: string): MarketCoverage {
  return BUNDLED_MARKET_PRESENTATION[market] as MarketCoverage;
}

function coverageLevel(c: MarketCoverage): number {
  // Same spirit as the DB version: price rows and role mappings earn
  // coverage levels; NG is the only fully role-mapped reference market.
  let level = 0;
  if (c.pricedMaterials > 0 || c.popMaterials + c.tileMaterials > 0) level = 1;
  if (c.pricedMaterials >= 4) level = 2;
  if (c.roleMappings >= 8) level = 3;
  return level;
}

const COVERAGE_LABELS: Record<number, string> = {
  0: "Registered",
  1: "Basic coverage",
  2: "Priced book",
  3: "High coverage",
};

export default function GlobalMarkets() {
  const { t } = useLanguage();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Global Markets", path: "/global-markets" },
  ]);
  useSeo({
    title: "Global Markets: Construction Data & Coverage | FRELUX",
    description: `FRELUX serves ${BUILTIN_MARKET_PROFILES.length} markets with market-aware calculators, local currency and units, and a bundled price book. Every figure shows what it is — verified, indicative or not yet sourced — never invented.`,
  });

  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    track("calculator_started", { page: "global-markets" });
  }, []);

  const sorted = useMemo(() => {
    return [...BUILTIN_MARKET_PROFILES].sort((a, b) => {
      const la = coverageLevel(coverageFor(a.country_code));
      const lb = coverageLevel(coverageFor(b.country_code));
      if (la !== lb) return lb - la;
      return a.sort_order - b.sort_order;
    });
  }, []);

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
            title={t("Global Markets")}
            subtitle={`${BUILTIN_MARKET_PROFILES.length} markets, market-aware calculators, and a bundled offline price book. Coverage counts come from FRELUX's own production catalog — external market-size figures are only published when they can be cited.`}
          />
        </Container>
      </div>

      <Container className="mt-8">
        <AdSlot slotKey="calculator_mid" className="mb-8" />

        {ready && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((m: MarketProfile) => {
              const coverage = coverageFor(m.country_code);
              const level = coverageLevel(coverage);
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
                        {m.region ?? "Global"} · {m.currency_code} (
                        {m.currency_symbol})
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
                        {t("Priced materials (bundled book)")}
                      </dt>
                      <dd className="font-medium">
                        {coverage.pricedMaterials.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("Material roles mapped")}
                      </dt>
                      <dd className="font-medium">{coverage.roleMappings}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("POP / tile material rows")}
                      </dt>
                      <dd className="font-medium">
                        {(
                          coverage.popMaterials + coverage.tileMaterials
                        ).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("Measurement system")}
                      </dt>
                      <dd className="font-medium">
                        {m.default_measurement_system === "mixed"
                          ? "metric + imperial"
                          : m.default_measurement_system}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("Default units")}
                      </dt>
                      <dd className="font-medium">
                        {m.default_length_unit} · {m.default_area_unit}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      {level === 0 ? (
                        <>
                          This market is registered; its price coverage is
                          pending. Calculators stay market-aware (currency,
                          units, terminology) and disclose the Nigerian
                          reference defaults where no local price exists.
                        </>
                      ) : (
                        <>
                          Market-size metrics (
                          {Object.values(EXTERNAL_METRIC_LABELS).join(", ")}
                          ): not yet sourced. We publish figures only when we
                          can cite them.
                        </>
                      )}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Coverage counts are computed from FRELUX's bundled production price
          book ({BUNDLED_BOOK_VERSION}). Prices carry their recorded retailer
          and confidence — rows marked indicative remain adjustable, and nothing
          is presented as verified that is not.
        </p>
      </Container>
    </div>
  );
}
