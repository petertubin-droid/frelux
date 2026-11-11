import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Blocks,
  BookOpen,
  Calculator,
  ClipboardCheck,
  CloudOff,
  Database,
  FileStack,
  FlaskConical,
  Gauge,
  Layers,
  Ruler,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useMarket } from "@/lib/international/market-context";
import { useBreadcrumbJsonLd, useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";

type RoadmapStatus =
  "live" | "building" | "up-next" | "awaiting-evidence" | "exploring";
type RoadmapCategory =
  "calculators" | "project-workflow" | "market-data" | "experience";
type Filter = "all" | RoadmapCategory;

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  icon: LucideIcon;
  /** Month the item went live. Only stated where it is known, never predicted. */
  shipped?: string;
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
    id: "live",
    title: "Live now",
    description:
      "Shipped and running on FreluxTools. Dates are the month a feature went live, never a target.",
    items: [
      {
        id: "blueprint-takeoff",
        title: "Vector PDF, DXF and scale-checked takeoff",
        description:
          "Read drawings you upload, calibrate the measured scale from the sheet's annotation or a known dimension, and refuse to measure a sheet that cannot be scaled instead of guessing.",
        category: "project-workflow",
        icon: Layers,
      },
      {
        id: "structural-suite",
        title: "Structural engine suite",
        description:
          "Beams, slabs, columns, retaining walls and foundations, sized against the governing codes with the market's standards inherited by each page.",
        category: "calculators",
        icon: ShieldCheck,
      },
      {
        id: "nigerian-codes",
        title: "Nigerian building code and NIS 444-1 reference",
        description:
          "Material grades, mix classes and code references available beside the estimators that depend on them, so a mix is traceable rather than assumed.",
        category: "market-data",
        icon: BookOpen,
      },
      {
        id: "planning-guide",
        title: "Planning approval and setback guide",
        description:
          "Issuing authority, governing instrument and approval route for 37 Nigerian jurisdictions and 31 international markets. A setback figure is only stated where a published source exists.",
        category: "market-data",
        icon: Ruler,
        shipped: "November 2026",
      },
      {
        id: "share-and-export",
        title: "WhatsApp share and branded PDF export",
        description:
          "Every calculator shares a readable summary on WhatsApp and exports a PDF carrying the FRELUX mark, with the assumptions and warnings included rather than trimmed away.",
        category: "experience",
        icon: FileStack,
        shipped: "November 2026",
      },
    ],
  },
  {
    id: "building",
    title: "Building",
    description:
      "Actively in progress. Shipped in part, not yet complete across every market.",
    items: [
      {
        id: "price-verification",
        title: "Local retailer price verification",
        description:
          "Reading market prices from retailer catalogues in the market's own currency. A market is only labelled verified once enough local rows are captured; some retailer sites still refuse automated reading, and those markets say so.",
        category: "market-data",
        icon: Gauge,
      },
      {
        id: "marketplace-settlement",
        title: "Marketplace order settlement",
        description:
          "Listings, orders and order status pages are live, but taking payment, holding it and releasing it on delivery is not connected to a payment provider yet. The settlement rules now exist as a tested money model, so the remaining work is the provider checkout, its webhook and the payout step, not the arithmetic.",
        category: "project-workflow",
        icon: Truck,
      },
      {
        id: "escrow-settlement",
        title: "Diaspora escrow settlement",
        description:
          "The money path is wired to Paystack and runs in test mode: a contract can be funded through checkout, the signed webhook records the payment exactly once, and releasing a stage pays the seller that amount minus the 7 percent FRELUX fee. A failed payout leaves the ledger untouched. Real money waits for the production key to be switched on, so the page still labels its example as an example.",
        category: "project-workflow",
        icon: Banknote,
      },
      {
        id: "engine-verification",
        title: "Engine verification by market",
        description:
          "Every engine records an operational state per market (unavailable, partial, configured, verified operational or suspended) with an evidence owner and open gaps. Today most engine and market pairs are configured rather than operationally verified, and an estimate built on an unverified pair says so instead of pretending to local certainty.",
        category: "market-data",
        icon: ShieldCheck,
      },
      {
        id: "catalogue-coverage",
        title: "Retailer catalogue coverage in every market",
        description:
          "Six retailer catalogues are registered and read in their own currency, but a catalogue that carries no matching local line prices nothing. Coverage is being widened market by market, and a shop that blocks automated reading stays on the open list rather than being quietly dropped.",
        category: "market-data",
        icon: Database,
      },
      {
        id: "market-intelligence",
        title: "Market intelligence and price index",
        description:
          "Price history, index and provenance pages exist and label where each figure came from. Verified coverage is still thin outside the markets captured so far, so an unverified lane stays labelled unverified instead of being filled with survey estimates.",
        category: "market-data",
        icon: BarChart3,
      },
      {
        id: "finish-coverage",
        title: "Wider finish and material coverage",
        description:
          "Stucco and mineral stone estimation is live. Coverage is being extended with maker figures for more products, and a product with no public price returns quantity with an explicit cost-unavailable warning.",
        category: "calculators",
        icon: Calculator,
      },
    ],
  },
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
        id: "accounting-exports",
        title: "QuickBooks and Xero accounting export",
        description:
          "Export a BOQ in the formats accounting software imports. This does not exist yet: FRELUX today exports PDF and spreadsheets, and the accounting formats have to be built before they are offered.",
        category: "project-workflow",
        icon: Database,
      },
      {
        id: "raster-measuring",
        title: "Point-and-click measuring on raster plans",
        description:
          "Measure a scanned or photographed plan by clicking it. Vector PDF and DXF takeoff is live; a raster sheet still needs a known dimension entered by hand.",
        category: "project-workflow",
        icon: Calculator,
      },
      {
        id: "supplier-stock-alerts",
        title: "Supplier stock alerts",
        description:
          "Tell you when a priced material is listed as available near the project, once retailer catalogues carry reliable stock signals in your market.",
        category: "market-data",
        icon: Truck,
      },
      {
        id: "setback-figures",
        title: "Local setback and permit figures",
        description:
          "Extend the planning guide from published national figures and scheme-based guidance to reviewed local figures, state by state and authority by authority.",
        category: "market-data",
        icon: Ruler,
      },
      {
        id: "offline-field-mode",
        title: "Offline field mode",
        description:
          "Keep measuring and estimating on site with no signal, then sync the saved project when the device reconnects.",
        category: "experience",
        icon: CloudOff,
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
  live: "bg-emerald-100 text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-200",
  building: "bg-sky-100 text-sky-900 dark:bg-sky-300/15 dark:text-sky-200",
  "up-next":
    "bg-amber-100 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200",
  "awaiting-evidence":
    "bg-orange-100 text-orange-900 dark:bg-orange-300/15 dark:text-orange-200",
  exploring:
    "bg-slate-200 text-slate-700 dark:bg-slate-300/10 dark:text-slate-300",
};

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  live: "Live",
  building: "Building",
  "up-next": "Planned",
  "awaiting-evidence": "Awaiting evidence",
  exploring: "Exploring",
};

const STATUS_DOTS: Record<RoadmapStatus, string> = {
  live: "bg-emerald-500",
  building: "bg-sky-500",
  "up-next": "bg-amber-300",
  "awaiting-evidence": "bg-orange-500",
  exploring: "bg-slate-400",
};

const SECTION_SKINS: Record<RoadmapStatus, string> = {
  live: "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-300/10 dark:bg-emerald-300/[0.035]",
  building:
    "border-sky-200/80 bg-sky-50/60 dark:border-sky-300/10 dark:bg-sky-300/[0.035]",
  "up-next":
    "border-amber-200/80 bg-amber-50/60 dark:border-amber-300/10 dark:bg-amber-300/[0.035]",
  "awaiting-evidence":
    "border-orange-200/70 bg-orange-50/40 dark:border-orange-300/10 dark:bg-orange-300/[0.025]",
  exploring:
    "border-border/60 bg-muted/30 dark:border-white/10 dark:bg-white/[0.015]",
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
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3 dark:border-white/10">
        <span className="text-xs font-semibold text-muted-foreground">
          {CATEGORY_LABELS[item.category]}
        </span>
        {item.shipped && (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Shipped {item.shipped}
          </span>
        )}
      </div>
    </article>
  );
}

export default function Roadmap() {
  const { t } = useLanguage();
  const { market } = useMarket();
  const [filter, setFilter] = useState<Filter>("all");

  useSeo({
    title: "Live Feature and Release Tracker | FRELUX Roadmap",
    description:
      "What FRELUX has shipped, what is being built now, and what is planned next for construction calculators, blueprint takeoff, structural engines, market data and project workflow. Shipped items carry the month they went live; planned items carry no promised date.",
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
            eyebrow={t("Live feature and release tracker")}
            title={t("What’s next for FRELUX?")}
            subtitle={t(
              "What is live now, what is being built, and what is planned. Shipped work carries the month it went live; nothing below carries a promised release date.",
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
                className={`h-3 w-3 rounded-full ${STATUS_DOTS[section.id]}`}
              />
              {t(STATUS_LABELS[section.id])}
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
              className={`rounded-2xl border p-4 sm:p-5 ${SECTION_SKINS[section.id]}`}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 rounded-full ${STATUS_DOTS[section.id]}`}
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
