import { Link } from "react-router-dom";
import { ArrowRight, CloudSun, Globe2 } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLanguage } from "@/lib/i18n";

/**
 * Two capabilities that change how planning feels: the work plotted on a real
 * globe, and the forecast for the site you are planning. Both are live
 * features rather than promises, so the cards link straight into them.
 */
export default function MapWeatherBand() {
  const { t } = useLanguage();

  const cards = [
    {
      icon: Globe2,
      eyebrow: t("Worldwide"),
      title: t("See the work on a 3D globe"),
      body: t(
        "Verified professionals, open projects and material stock plotted where they really are. Search any city, switch layers, and check the distance from your own site.",
      ),
      cta: t("Open the map"),
      href: "/map",
    },
    {
      icon: CloudSun,
      eyebrow: t("Live forecast"),
      title: t("Plan around the weather"),
      body: t(
        "Every estimating tool carries a forecast for the site you are planning, from your own location or your market's city. Rain this week changes what gets painted.",
      ),
      cta: t("Start with a calculator"),
      href: "/paint-calculator",
    },
  ];

  return (
    <section
      aria-label={t("Map and weather")}
      className="relative overflow-hidden bg-background py-16 sm:py-20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-grid-light opacity-[0.35] dark:bg-grid-dark dark:opacity-20"
        aria-hidden="true"
      />
      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">{t("Beyond the numbers")}</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {t("Where it happens, and when to do it")}
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-[0_24px_60px_-45px_rgba(16,12,40,0.55)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_30px_70px_-45px_rgba(16,12,40,0.65)] dark:border-white/10 dark:bg-white/5"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-primary dark:border-white/10 dark:bg-white/5">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {card.eyebrow}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  {card.cta}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
