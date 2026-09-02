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

const ScreedingCalculator = lazy(() => import("@/pages/ScreedingCalculator"));
const ScreedingCostEstimator = lazy(
  () => import("@/pages/ScreedingCostEstimator"),
);

const TABS = [
  { id: "quantity", label: "Screeding Quantity" },
  { id: "cost", label: "Cost Estimate" },
];

const FAQS = [
  {
    question: "How does the FRELUX screeding calculator work?",
    answer:
      "Enter your room or wall dimensions, including doors and windows. The calculator determines the exact wall surface area that needs screeding in m², then calculates material requirements (cement, sand, bonding agents) based on the FRELUX mix configuration.",
  },
  {
    question: "Can I calculate screeding for fences?",
    answer:
      "Yes. You can enter fence dimensions in either feet or metres. The calculator converts the surface area to m² for accurate material calculation.",
  },
  {
    question:
      "What is the difference between Screeding Quantity and Cost Estimate?",
    answer:
      "Screeding Quantity calculates the wall surface area and material requirements. Cost Estimate adds real market prices for cement, sand, and bonding agents to give you a full cost breakdown.",
  },
  {
    question: "Does the calculator account for doors and windows?",
    answer:
      "Yes. Doors and windows are automatically deducted from the total wall surface area to give you the net screeding area.",
  },
  {
    question: "Are material prices in Nigerian Naira?",
    answer:
      "Yes. The FRELUX screeding cost estimator uses real Nigerian market prices for cement, sand, and other screeding materials.",
  },
];

export default function ScreedingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "quantity";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "quantity";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo({
    title: "Screeding Calculator — Wall Screeding Quantity & Cost",
    description:
      "Free FRELUX screeding calculator. Calculate wall screeding surface area in m², material requirements, and cost estimates with real Nigerian market prices.",
    canonicalPath: "/screeding-calculator",
    ogType: "website",
    keywords:
      "screeding calculator, wall screeding, screeding cost estimator, screeding quantity, screeding material calculator Nigeria",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Screeding Calculator",
        description:
          "Calculate wall screeding surface area in m², material requirements, and cost estimates with real Nigerian market prices.",
        url: `${SITE_URL}/screeding-calculator`,
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
            name: "Screeding Calculator",
            item: `${SITE_URL}/screeding-calculator`,
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
    track("calculator_tab_change", { calculator: "screeding", mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Screeding Calculator"
        subtitle="Calculate wall screeding quantity, material requirements, and cost — all in one place."
        breadcrumbs={[
          { label: "Calculators", path: "/calculators" },
          { label: "Screeding Calculator" },
        ]}
      />
      <WorkWeatherBanner workType="screeding" />
      <CalculatorTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel="Screeding calculator mode"
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
          {activeTab === "quantity" && <ScreedingCalculator embedded />}
          {activeTab === "cost" && <ScreedingCostEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
            About the FRELUX Screeding Calculator
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The FRELUX Screeding Calculator combines screeding surface area
            calculation with material cost estimation in a single unified tool.
            Whether you're screeding interior walls or exterior fences, it
            handles both metric and imperial measurements and converts
            everything to m² for accurate material calculation.
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            Calculation Modes
          </h3>
          <ul>
            <li>
              <strong>Screeding Quantity</strong> — Enter room or wall
              dimensions to calculate the net screeding surface area in m², with
              doors and windows deducted.
            </li>
            <li>
              <strong>Cost Estimate</strong> — Get a full material cost
              breakdown including cement, sand, and bonding agents at real
              Nigerian market prices.
            </li>
          </ul>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            FRELUX Screeding Methodology
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            Screeding quantities are calculated in m² according to established
            FRELUX rules. The calculator uses admin-configured mix ratios and
            material packaging sizes to produce accurate material quantities —
            not generic m²-per-bag estimates. For fences, the calculator accepts
            dimensions in feet or metres and converts the resulting surface area
            to m² before applying material calculations.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
          ]}
        />
        <RelatedToolsLinks />
        <AdSlot slotKey="calculator_hub_bottom" className="mt-8" />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
