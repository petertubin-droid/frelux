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

const PopCeilingCalculator = lazy(() => import("@/pages/PopCeilingCalculator"));
const PopCeilingCostEstimator = lazy(
  () => import("@/pages/PopCeilingCostEstimator"),
);

const TABS = [
  { id: "quantity", label: "Material Quantity" },
  { id: "cost", label: "Cost Estimate" },
];

const FAQS = [
  {
    question: "How does the FRELUX POP ceiling calculator work?",
    answer:
      "Enter your room dimensions to calculate ceiling area, then the calculator determines POP cement quantities, fibreglass mesh, and other materials needed. It supports both Nigerian and international POP ceiling workflows.",
  },
  {
    question:
      "What is the difference between Material Quantity and Cost Estimate?",
    answer:
      "Material Quantity calculates POP cement, mesh, and material quantities for your ceiling. Cost Estimate adds admin-configured material prices for a complete cost breakdown including materials and waste.",
  },
  {
    question: "Does the calculator support different POP ceiling types?",
    answer:
      "Yes. The calculator supports multiple POP ceiling workflows including standard Nigerian POP, international workflows, and different design patterns with admin-configured material requirements.",
  },
  {
    question: "Can I save my POP ceiling calculations?",
    answer:
      "Yes. You can save calculations to your projects, export as PDF, and share via WhatsApp using the existing FRELUX functionality.",
  },
  {
    question: "Are material prices in Nigerian Naira?",
    answer:
      "Yes. The FRELUX POP ceiling cost estimator uses admin-configured material prices for POP cement, fibreglass mesh, and other materials.",
  },
];

export default function PopCeilingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "quantity";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "quantity";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo({
    title: "POP Ceiling Calculator — Material Quantity & Cost Estimate",
    description:
      "Free FRELUX POP ceiling calculator. Calculate POP cement, fibreglass mesh, and material quantities. Get a full cost estimate with admin-configured material prices.",
    canonicalPath: "/pop-ceiling-calculator",
    ogType: "website",
    keywords:
      "POP ceiling calculator, plaster of paris, POP cement, POP ceiling material, POP ceiling cost Nigeria",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX POP Ceiling Calculator",
        description:
          "Calculate POP cement, fibreglass mesh, and material quantities. Get a full cost estimate with admin-configured material prices.",
        url: `${SITE_URL}/pop-ceiling-calculator`,
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
            name: "POP Ceiling Calculator",
            item: `${SITE_URL}/pop-ceiling-calculator`,
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
    track("calculator_tab_change", { calculator: "pop_ceiling", mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="POP Ceiling Calculator"
        subtitle="Calculate POP ceiling material quantities, breakdown, and cost — all in one place."
        breadcrumbs={[
          { label: "Calculators", path: "/calculators" },
          { label: "POP Ceiling Calculator" },
        ]}
      />
      <WorkWeatherBanner workType="finishing" />
      <CalculatorTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel="POP ceiling calculator mode"
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
          {activeTab === "quantity" && <PopCeilingCalculator embedded />}
          {activeTab === "cost" && <PopCeilingCostEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
            About the FRELUX POP Ceiling Calculator
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The FRELUX POP Ceiling Calculator is a comprehensive tool for
            planning plaster of paris (POP) ceiling projects. It combines
            material quantity calculation with cost estimation in one unified
            experience, supporting both Nigerian and international POP ceiling
            workflows.
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            Calculation Modes
          </h3>
          <ul>
            <li>
              <strong>Material Quantity</strong> — Calculate POP cement,
              fibreglass mesh, and other material quantities based on your
              ceiling area and chosen workflow.
            </li>
            <li>
              <strong>Cost Estimate</strong> — Get a full cost breakdown using
              admin-configured material prices for all POP ceiling materials including waste
              factors.
            </li>
          </ul>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            FRELUX/Nigerian POP Material Logic
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The calculator uses established Nigerian POP material rules with
            admin-configured workflows, material requirements, and packaging
            sizes. Different ceiling designs and workflows have their own
            material breakdowns that reflect real Nigerian construction
            practices.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
          ]}
        />
        <RelatedToolsLinks />
        {/* Ad slot — placement "calculator_hub_mid" */}
        <AdSlot slotKey="calculator_hub_mid" className="mt-8" />
        {/* Native banner slot — placement "calculator_hub_native" */}
        <AdSlot slotKey="calculator_hub_native" className="mt-8" />
        <AdSlot slotKey="calculator_hub_bottom" className="mt-8" />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
