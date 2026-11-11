import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Calculator,
  BarChart3,
  ClipboardCheck,
  Database,
  FileStack,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useMarket } from "@/lib/international/market-context";
import { useBreadcrumbJsonLd, useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";

type RoadmapStatus = "up-next" | "awaiting-evidence" | "exploring";
type RoadmapCategory =
  "calculators" | "project-workflow" | "market-data" | "experience";
type Filter = "all" | RoadmapCategory;

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  icon: LucideIcon;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "calculators", label: "Calculators" },
  { id: "project-workflow", label: "Project workflow" },
  { id: "market-data", label: "Market data" },
  { id: "experience", label: "UX" },
];

const STATUS_SECTIONS: {
  id: RoadmapStatus;
  title: string;
  description: string;
  items: RoadmapItem[];
}[] = [
  {
    id: "up-next",
    title: "Up next",
    description:
      "Planned priorities. Order and scope may change as we validate them.",
    items: [
      {
        id: "reusable-schedules",
        title: "Reusable building schedules",
        description:
          "Enter room and opening measurements once, then reuse compatible quantities across relevant calculators while keeping each tool’s assumptions visible.",
        category: "project-workflow",
        icon: Blocks,
      },
      {
        id: "explainable-estimates",
        title: "More explainable estimates",
        description:
          "Make quantities, formulas, units, waste and rounding rules, assumptions, and exclusions easier to inspect beside the result.",
        category: "calculators",
        icon: Calculator,
      },
      {
        id: "market-data-freshness",
        title: "Clearer market-data freshness",
        description:
          "Make source, date, geographic coverage, and verification status easier to see for material prices and specifications.",
        category: "market-data",
        icon: Database,
      },
    ],
  },
  {
    id: "awaiting-evidence",
    title: "Awaiting evidence",
    description:
      "Items that need local sources or accountable review before they can be called verified.",
    items: [
      {
        id: "market-validation",
        title: "Market data validation",
        description:
          "Market-specific rules and data need accountable local review before FRELUX can label them validated. A listed review need does not imply a reviewer is currently assigned or that validation is underway.",
        category: "market-data",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: "exploring",
    title: "Exploring",
    description: "Ideas under consideration, not delivery commitments.",
    items: [
      {
        id: "estimate-comparison",
        title: "Compare estimate versions",
        description:
          "Explore a side-by-side view of quantity changes and material options without blending physical quantities with changing prices or currencies.",
        category: "project-workflow",
        icon: BarChart3,
      },
      {
        id: "project-work-packs",
        title: "Project handoff packs",
        description:
          "Explore sharing a compact, reviewable work pack with measurements, units, market context, assumptions, and warnings together.",
        category: "experience",
        icon: FileStack,
      },
      {
        id: "guided-takeoffs",
        title: "More guided takeoffs",
        description:
          "Explore clearer, step-by-step measurement flows and diagrams for additional calculator types, with input-linked visuals where they help.",
        category: "experience",
        icon: FlaskConical,
      },
    ],
  },
];

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  calculators: "Calculators",
  "project-workflow": "Project workflow",
  "market-data": "Market data",
  experience: "UX",
};

const STATUS_STYLES: Record<RoadmapStatus, string> = {
  "up-next":
    "bg-amber-100 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200",
  "awaiting-evidence":
    "bg-orange-100 text-orange-900 dark:bg-orange-300/15 dark:text-orange-200",
  exploring:
    "bg-slate-200 text-slate-700 dark:bg-slate-300/10 dark:text-slate-300",
};

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  "up-next": "Up next",
  "awaiting-evidence": "Awaiting evidence",
  exploring: "Exploring",
};

function RoadmapCard({
  item,
  status,
}: {
  item: RoadmapItem;
  status: RoadmapStatus;
}) {
  const Icon = item.icon;
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-premium-lg dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-foreground dark:text-primary-foreground">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>
      <div className="mt-5 border-t border-border/60 pt-3 dark:border-white/10">
        <span className="text-xs font-semibold text-muted-foreground">
          {CATEGORY_LABELS[item.category]}
        </span>
      </div>
    </article>
  );
}

export default function Roadmap() {
  const { t } = useLanguage();
  const { market } = useMarket();
  const [filter, setFilter] = useState<Filter>("all");

  useSeo({
    title: "Product Roadmap: What’s Next | FRELUX",
    description:
      "See FRELUX product priorities for calculators, project workflows, market data, and user experience, with clear distinctions between planned, pending-evidence, and exploratory work.",
    canonicalPath: "/roadmap",
    ogType: "website",
  });
  useBreadcrumbJsonLd([
    { name: "Learn", path: "/learn" },
    { name: "Roadmap", path: "/roadmap" },
  ]);

  const visibleSections = useMemo(
    () =>
      STATUS_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => filter === "all" || item.category === filter,
        ),
      })).filter((section) => section.items.length > 0),
    [filter],
  );

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="relative overflow-hidden bg-background">
        <Container>
          <PageHeader
            eyebrow={t("Product roadmap")}
            title={t("What’s next for FRELUX?")}
            subtitle={t(
              "A clear view of planned priorities, pending evidence, and ideas under consideration.",
            )}
            variant="data"
            breadcrumbs={[
              { label: t("Learn"), path: "/learn" },
              { label: t("Roadmap") },
            ]}
          />
        </Container>
      </div>

      <Container className="mt-7 sm:mt-9">
        <div
          className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-5 text-sm text-muted-foreground dark:border-white/10"
          aria-label={t("Roadmap status legend")}
        >
          {STATUS_SECTIONS.map((section) => (
            <span key={section.id} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-3 w-3 rounded-full ${
                  section.id === "up-next"
                    ? "bg-amber-300"
                    : section.id === "awaiting-evidence"
                      ? "bg-orange-500"
                      : "bg-slate-400"
                }`}
              />
              {t(section.title)}
            </span>
          ))}
        </div>

        <div
          className="mb-7 flex flex-wrap gap-2"
          role="group"
          aria-label={t("Filter roadmap by category")}
        >
          {FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.id)}
                className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  active
                    ? "border-primary/30 bg-primary/10 text-foreground dark:bg-primary/20"
                    : "border-border bg-card text-muted-foreground hover:bg-muted dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {visibleSections.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`roadmap-${section.id}`}
              className={`rounded-2xl border p-4 sm:p-5 ${
                section.id === "up-next"
                  ? "border-amber-200/80 bg-amber-50/60 dark:border-amber-300/10 dark:bg-amber-300/[0.035]"
                  : section.id === "awaiting-evidence"
                    ? "border-orange-200/70 bg-orange-50/40 dark:border-orange-300/10 dark:bg-orange-300/[0.025]"
                    : "border-border/60 bg-muted/30 dark:border-white/10 dark:bg-white/[0.015]"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 rounded-full ${
                        section.id === "up-next"
                          ? "bg-amber-300"
                          : section.id === "awaiting-evidence"
                            ? "bg-orange-500"
                            : "bg-slate-400"
                      }`}
                    />
                    <h2
                      id={`roadmap-${section.id}`}
                      className="text-base font-extrabold uppercase tracking-wide text-foreground"
                    >
                      {t(section.title)}
                    </h2>
                  </div>
                  <p className="ml-6 mt-1 text-sm text-muted-foreground">
                    {t(section.description)}
                  </p>
                </div>
                {section.id === "up-next" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("Priorities, not promised release dates")}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <RoadmapCard key={item.id} item={item} status={section.id} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 p-4 text-sm leading-relaxed text-muted-foreground sm:p-5 dark:border-white/10">
          <p>
            {t(
              `Roadmap priorities are global. Terminology follows your selected market: ${market.countryName}. Items may change as we validate user needs, evidence, and feasibility. Engineering and cost outputs remain subject to the limitations shown in each tool.`,
            )}
          </p>
        </div>

        <div className="mt-7 flex flex-col justify-between gap-4 border-t border-border/60 pt-5 sm:flex-row sm:items-center dark:border-white/10">
          <p className="text-sm font-medium text-foreground">
            {t("Have an idea for FRELUX?")}
          </p>
          <Link
            to="/feedback"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("Share feedback")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </main>
  );
}
