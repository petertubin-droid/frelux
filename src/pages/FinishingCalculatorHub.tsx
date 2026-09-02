import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import PageHeader from "@/components/ui/PageHeader";
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

const FinishEstimator = lazy(() => import("@/pages/FinishEstimator"));
const TyroleneEstimator = lazy(() => import("@/pages/TyroleneEstimator"));

const TABS = [
  { id: "compare", label: "Compare Finishes" },
  { id: "tyrolene", label: "Tyrolene Estimator" },
];

const FAQS = [
  {
    question:
      "What finishing types does the FRELUX Finishing Calculator support?",
    answer:
      "The Finishing Calculator supports Painting, Tyrolene, and Grafitex finishes. The Compare Finishes mode lets you compare material quantities and costs side by side. The Tyrolene Estimator provides detailed partition-based exterior finishing calculations.",
  },
  {
    question: "What is the FRELUX Tyrolene rule?",
    answer:
      "The established FRELUX Tyrolene rule is: 1 partition = 6 bags sand, 1 partition = 1/4 bag cement, 1 kg water seal, 3 kg acrylic bond, plus anti-fungal material where supported. The Tyrolene Estimator uses this exact methodology.",
  },
  {
    question:
      "What is the difference between Compare Finishes and Tyrolene Estimator?",
    answer:
      "Compare Finishes calculates material quantities and costs for Painting, Tyrolene, and Grafitex side by side. The Tyrolene Estimator is a detailed partition-based exterior finishing tool with production rules, material breakdowns, and saveable estimates.",
  },
  {
    question: "Can I save and export finishing calculations?",
    answer:
      "Yes. Both modes support saving to your projects, exporting as PDF, and sharing via WhatsApp using the existing FRELUX functionality.",
  },
  {
    question: "Are material prices in Nigerian Naira?",
    answer:
      "Yes. The FRELUX finishing calculator uses real Nigerian market prices for all finishing materials including cement, sand, acrylic bond, and additives.",
  },
];

export default function FinishingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "compare";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "compare";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo({
    title: "Finishing Calculator — Tyrolene, Grafitex & Painting Finishes",
    description:
      "Free FRELUX finishing calculator. Compare Painting, Tyrolene, and Grafitex finishes. Detailed Tyrolene estimator with partition-based material calculations.",
    canonicalPath: "/finish-estimator",
    ogType: "website",
    keywords:
      "finishing calculator, tyrolene estimator, grafitex calculator, exterior finishing Nigeria, wall finishing material calculator",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Finishing Calculator",
        description:
          "Compare Painting, Tyrolene, and Grafitex finishes. Detailed Tyrolene estimator with partition-based material calculations.",
        url: `${SITE_URL}/finish-estimator`,
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Finishing Calculator",
            item: `${SITE_URL}/finish-estimator`,
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
    track("calculator_tab_change", { calculator: "finishing", mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Finishing Calculator"
        subtitle="Compare wall finishes and calculate Tyrolene material quantities — all in one place."
        breadcrumbs={[
          { label: "Calculators", path: "/calculators" },
          { label: "Finishing Calculator" },
        ]}
      />
      <CalculatorTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel="Finishing calculator mode"
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
          {activeTab === "compare" && <FinishEstimator embedded />}
          {activeTab === "tyrolene" && <TyroleneEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
            About the FRELUX Finishing Calculator
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The FRELUX Finishing Calculator is a comprehensive tool for wall
            finishing calculations. It combines side-by-side finish comparison
            with a detailed Tyrolene estimator, supporting Painting, Tyrolene,
            and Grafitex finishes.
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            Calculation Modes
          </h3>
          <ul>
            <li>
              <strong>Compare Finishes</strong> — Compare material quantities
              and costs for Painting, Tyrolene, and Grafitex side by side. Enter
              your wall area and see which finish suits your budget.
            </li>
            <li>
              <strong>Tyrolene Estimator</strong> — A detailed partition-based
              exterior finishing estimator using the FRELUX Tyrolene engine with
              production rules, material breakdowns, and saveable estimates.
            </li>
          </ul>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            FRELUX Tyrolene Methodology
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The established FRELUX Tyrolene rule is:
          </p>
          <ul>
            <li>1 partition = 6 bags sand</li>
            <li>1 partition = 1/4 bag cement</li>
            <li>1 kg water seal</li>
            <li>3 kg acrylic bond</li>
            <li>Anti-fungal material where already supported</li>
          </ul>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            This methodology is preserved exactly in the Tyrolene Estimator mode
            and has not been replaced with generic formulas.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
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
