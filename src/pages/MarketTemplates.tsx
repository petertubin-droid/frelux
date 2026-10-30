import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calculator, ChevronRight, Layers, Loader2 } from "lucide-react";
import { useSeo, SITE_URL } from "@/lib/seo";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { calculatorLabel, getPublicTemplates } from "@/lib/templates";
import type { DbCalculatorTemplate } from "@/types/database";
import { getSafeError } from "@/lib/safeError";
import {
  buildMarketTemplatesHubSeo,
  getTemplateMarketProfile,
  listTemplateMarkets,
  marketTemplatePath,
  marketTemplatesPath,
  resolveTemplateMarketContext,
} from "@/lib/templates-market";
import { describeTemplateForMarket } from "@/lib/templates-global";
import { useLanguage } from "@/lib/i18n";

/**
 * Market template hub: /market/:code/templates
 * Lists every public template adapted for one market, with crawlable links to
 * each market-scoped template page. Part of the 32-market globalization of the
 * template library (the sitemap and prerender pipeline both include every page).
 */
export default function MarketTemplates() {
  const { t: tr } = useLanguage();
  const { code } = useParams<{ code: string }>();
  const profile = useMemo(() => getTemplateMarketProfile(code), [code]);
  const marketContext = useMemo(
    () => (profile ? resolveTemplateMarketContext(profile) : null),
    [profile],
  );
  const [templates, setTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getPublicTemplates();
        if (alive) setTemplates(list);
      } catch (e) {
        if (alive) setError(getSafeError(e, "Failed to load templates"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const seoMeta = useMemo(() => {
    if (!profile) {
      return {
        title: "Market Not Covered Yet | FRELUX",
        description:
          "This market is not part of the FRELUX coverage yet. Browse the supported markets.",
        canonicalPath: "/templates",
        noIndex: true,
      };
    }
    const hub = buildMarketTemplatesHubSeo(profile);
    return {
      ...hub,
      structuredDataArray: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: hub.title,
          description: hub.description,
          url: `${SITE_URL}${hub.canonicalPath}`,
          isPartOf: { "@type": "WebSite", name: "FRELUX", url: SITE_URL },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Markets",
              item: `${SITE_URL}/global-markets`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: profile.country_name,
              item: `${SITE_URL}${hub.canonicalPath}`,
            },
          ],
        },
      ],
    };
  }, [profile]);

  useSeo(seoMeta);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
          {tr("Market Not Covered Yet")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          FRELUX publishes templates for 32 markets. Browse the global template
          library or the supported markets list.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <Link
            to="/templates/"
            className="text-sm font-medium text-brand-purple dark:text-brand-purple-lighter"
          >
            {tr("All templates")}
          </Link>
          <Link
            to="/global-markets"
            className="text-sm font-medium text-brand-purple dark:text-brand-purple-lighter"
          >
            {tr("Supported markets")}
          </Link>
        </div>
      </div>
    );
  }

  const grouped = new Map<string, DbCalculatorTemplate[]>();
  for (const t of templates) {
    const key = t.calculator_type;
    grouped.set(key, [...(grouped.get(key) ?? []), t]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Markets", path: "/global-markets" },
          { label: profile.country_name },
          { label: "Templates" },
        ]}
      />

      <header className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter">
          <Layers aria-hidden="true" className="h-3 w-3" />
          {profile.country_name} · {profile.currency_code}
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground dark:text-primary-foreground sm:text-3xl">
          Construction estimate templates for {profile.country_name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground dark:text-muted-foreground">
          Every FRELUX template opens the calculator pre-filled with the same
          physical project, shown in{" "}
          {profile.default_measurement_system === "imperial"
            ? "feet and inches"
            : "metres"}{" "}
          and costed in {profile.currency_code} using live{" "}
          {profile.country_name} material prices.
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2
            aria-hidden="true"
            className="h-6 w-6 animate-spin text-brand-purple"
          />
        </div>
      )}

      {!loading && error && (
        <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-8 space-y-10">
          {[...grouped.entries()].map(([type, list]) => (
            <section key={type} aria-labelledby={`group-${type}`}>
              <h2
                id={`group-${type}`}
                className="flex items-center gap-2 font-display text-lg font-bold text-foreground dark:text-primary-foreground"
              >
                <Calculator
                  aria-hidden="true"
                  className="h-4 w-4 text-brand-purple"
                />
                {calculatorLabel(
                  type as DbCalculatorTemplate["calculator_type"],
                )}{" "}
                templates
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={marketTemplatePath(
                        profile.country_code,
                        t.slug as string,
                      )}
                      className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-purple/35 dark:border-white/10 dark:bg-card"
                    >
                      <span className="text-sm font-semibold text-foreground group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
                        {t.name}
                      </span>
                      <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground/80">
                        {marketContext
                          ? describeTemplateForMarket(t, marketContext)
                          : t.description}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
                        {tr("Open template")}
                        <ChevronRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <nav
        aria-label={tr("Template hubs in other markets")}
        className="mt-12 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-card"
      >
        <h2 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
          {tr("Templates in other markets")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
          {listTemplateMarkets().map((p) => (
            <li key={p.country_code}>
              <Link
                to={marketTemplatesPath(p.country_code)}
                className={
                  p.country_code === profile.country_code
                    ? "text-xs font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-xs text-muted-foreground hover:text-brand-purple dark:text-muted-foreground/80"
                }
              >
                {p.country_name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
