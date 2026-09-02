import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import {
  FaqSection,
  RelatedTools,
  CALC_LINKS,
} from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { EstimateDisclaimer } from "@/components/calculators";
import { SITE_URL } from "@/lib/seo";

const PaintCalculator = lazy(() => import("@/pages/PaintCalculator"));
const CostEstimator = lazy(() => import("@/pages/CostEstimator"));
const PaintingEstimator = lazy(() => import("@/pages/PaintingEstimator"));

const TABS = [
  { id: "quantity", label: "Paint Buckets" },
  { id: "cost", label: "Material Cost" },
  { id: "room-estimate", label: "Project Estimate" },
];

const FAQS = [
  // Painting — bucket-specific
  {
    question: "How does FRELUX calculate paint buckets?",
    answer:
      "FRELUX estimates the paint buckets required for your project based on your selected room, project conditions, paint type, and FRELUX calculation rules. The engine calculates paintable wall area, applies product-specific coverage rates, accounts for coats, ceiling, doors, and windows, then rounds up to whole paint buckets.",
  },
  {
    question: "Why are paint results shown in buckets?",
    answer:
      "Paint in Nigeria is sold in buckets (typically 20-litre containers). FRELUX expresses the final paint requirement in buckets so you know exactly what to purchase. Internal litre calculations are used for accuracy but the purchase recommendation is always in whole buckets.",
  },
  {
    question: "Can I calculate a single room?",
    answer:
      "Yes. The Paint Calculator supports a single room, whole house, exterior, or fence/gate project types. Enter your room dimensions and the calculator determines the required paint buckets.",
  },
  {
    question: "How are ceilings handled?",
    answer:
      "Ceilings use a separate configurable coverage rate from walls. When you include a ceiling, FRELUX calculates ceiling paint buckets independently so wall and ceiling paint are not mixed. The ceiling coverage is product-specific and set by the admin.",
  },
  {
    question: "What can affect the number of buckets required?",
    answer:
      "Surface condition (rough, smooth, porous), colour condition (dark over light needs more coats), wall height above the FRELUX standard of 8 ft, number of doors and windows, and the waste margin you select all affect the final bucket count.",
  },
  {
    question:
      "What is the difference between Paint Calculator, Cost Estimator, and Painting Estimator?",
    answer:
      "Paint Calculator answers: how many paint buckets do I need? Cost Estimator answers: how much will my paint materials cost? Painting Estimator gives a complete project overview with paint buckets, material costs, finishes, and assumptions across multiple rooms.",
  },
];

export default function PaintingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "quantity";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "quantity";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo({
    title: "Painting Calculator — Paint Quantity, Cost & Room Estimate",
    description:
      "Free FRELUX painting calculator. Calculate paint buckets required, estimate painting costs, and get room-by-room painting estimates with real Nigerian material prices.",
    canonicalPath: "/paint-calculator",
    ogType: "website",
    keywords:
      "paint calculator, painting estimator, paint cost estimator, paint quantity, how much paint do I need, painting cost Nigeria",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Painting Calculator",
        description:
          "Calculate paint buckets required, estimate painting costs, and get room-by-room painting estimates with real Nigerian material prices.",
        url: `${SITE_URL}/paint-calculator`,
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Painting Calculator",
            item: `${SITE_URL}/paint-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ mode: tabId }, { replace: true });
    track("calculator_tab_change", { calculator: "painting", mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Painting Calculator"
        subtitle="Calculate paint buckets, painting requirements, and estimated costs — all in one place."
        breadcrumbs={[
          { label: "Calculators", path: "/calculators" },
          { label: "Painting Calculator" },
        ]}
      />
      <WorkWeatherBanner workType="painting" />
      <CalculatorTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel="Painting calculator mode"
      />

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="pt-2"
      >
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">
              Loading…
            </div>
          }
        >
          {activeTab === "quantity" && <PaintCalculator embedded />}
          {activeTab === "cost" && <CostEstimator embedded />}
          {activeTab === "room-estimate" && <PaintingEstimator embedded />}
        </Suspense>
      </div>

      {/* SEO Content */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
            About the FRELUX Painting Calculator
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The FRELUX Painting Calculator is a comprehensive tool for anyone
            planning a painting project in Nigeria. It consolidates three
            essential painting calculations into one unified experience:
          </p>
          <ul>
            <li>
              <strong>Paint Quantity</strong> — Calculate exactly how many paint
              buckets you need based on wall area, doors, windows, and coats.
            </li>
            <li>
              <strong>Cost Estimate</strong> — Get a full paint material cost
              breakdown using real product prices for paint buckets, primer, and
              materials.
            </li>
            <li>
              <strong>Room Estimate</strong> — A detailed room-by-room painting
              estimator using the FRELUX Phase 2 engine with production rules,
              surface conditions, and colour conditions.
            </li>
          </ul>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            FRELUX Painting Methodology
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            FRELUX uses a proprietary calculation methodology that accounts for
            wall surface conditions, colour conditions, paint type coverage
            rates, and waste factors specific to Nigerian construction
            environments. The engine applies admin-configured production rules,
            coverage rates, and material packaging sizes to produce results
            expressed in paint buckets — not generic m²-per-litre estimates.
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            Nigerian Construction Context
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            All calculations are tuned for the Nigerian market with local
            product prices, standard room dimensions, and materials commonly
            available from Nigerian building material suppliers.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.screedingCalc,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.aiColor,
          ]}
        />
        <RelatedToolsLinks />
        <AdSlot slotKey="calculator_hub_bottom" className="mt-8" />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
