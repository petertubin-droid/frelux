import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { useSeo } from "@/lib/seo";
import { useSeoOfferCurrency } from "@/lib/international/market-context";
import { track } from "@/lib/analytics";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { EstimateDisclaimer } from "@/components/calculators";
import { SITE_URL } from "@/lib/seo";
import { useMarket } from "@/lib/international/market-context";
import { getConstructionTerm } from "@/lib/globalization/construction-terminology";
import { useLanguage } from "@/lib/i18n";

const ScreedingCalculator = lazy(() => import("@/pages/ScreedingCalculator"));
const ScreedingCostEstimator = lazy(
  () => import("@/pages/ScreedingCostEstimator"),
);

const TABS = [
  { id: "quantity", label: "Quantity" },
  { id: "cost", label: "Cost Estimate" },
];

function buildFaqs(finishTerm: string) {
  const term = finishTerm.toLowerCase();
  return [
    {
      question: `How does the FRELUX ${term} calculator work?`,
      answer: `Enter room or wall dimensions, including doors and windows. The calculator determines the net wall surface area for ${term}. Material quantities and costs are calculated only when the relevant market configuration is available.`,
    },
    {
      question: `Can I calculate ${term} for fences?`,
      answer:
        "Yes. Enter fence dimensions in feet or metres. The calculator converts the resulting surface area to square metres for the area calculation.",
    },
    {
      question: `What is the difference between ${term} quantity and cost estimate?`,
      answer:
        "Quantity calculates wall surface area. The cost estimate can add configured material quantities, prices, and labour costs when those market details are available.",
    },
    {
      question: "Does the calculator account for doors and windows?",
      answer:
        "Yes. Entered door and window openings are deducted from the wall surface area to calculate the net area.",
    },
    {
      question: "Are prices localized to my selected market?",
      answer:
        "Prices use the selected market and currency where market data is configured. Missing prices are disclosed rather than guessed.",
    },
  ];
}

export default function ScreedingCalculatorHub() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketCode } = useMarket();
  const finishTerm = getConstructionTerm(
    "wall_finishing",
    marketCode,
    "Wall Finishing",
  );
  const finishTitle = `${finishTerm} Calculator`;
  const faqs = buildFaqs(finishTerm);
  const initialMode = searchParams.get("mode") || "quantity";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "quantity";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const seoOfferCurrency = useSeoOfferCurrency();
  useSeo({
    title: "Screeding Calculator, Wall Screeding Quantity & Cost",
    description:
      "Free FRELUX screeding calculator. Calculate wall screeding surface area in m², material requirements, and cost estimates with verified material prices.",
    canonicalPath: "/screeding-calculator",
    ogType: "website",
    keywords:
      "screeding calculator, wall screeding, screeding cost estimator, screeding quantity, screeding material calculator",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Screeding Calculator",
        description:
          "Calculate wall screeding surface area in m², material requirements, and cost estimates with verified material prices.",
        url: `${SITE_URL}/screeding-calculator`,
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: seoOfferCurrency,
        },
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
        mainEntity: faqs.map((f) => ({
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
        variant="tool"
        eyebrow="Calculator"
        title={finishTitle}
        subtitle={`Calculate ${finishTerm.toLowerCase()} quantities, material requirements, and cost, all in one place.`}
        breadcrumbs={[
          { label: "Calculators", path: "/calculators" },
          { label: finishTitle },
        ]}
      />
      <WorkWeatherBanner workType="screeding" />
      <CalculatorTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel={`${finishTitle} mode`}
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
            About the FRELUX {finishTitle}
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            The FRELUX {finishTitle} calculates wall surface area for{" "}
            {finishTerm.toLowerCase()} and can estimate materials and costs
            where market configuration is available. Enter metric or imperial
            dimensions; area results are normalized to square metres.
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            {t("Calculation Modes")}
          </h3>
          <ul>
            <li>
              <strong>{finishTerm} Quantity</strong>, Enter room or wall
              dimensions to calculate the net wall surface area in m², with
              doors and windows deducted.
            </li>
            <li>
              <strong>{t("Cost Estimate")}</strong>, Get a full material cost
              breakdown including cement, sand, and bonding agents at real
              market prices.
            </li>
          </ul>
          <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
            FRELUX {finishTerm} Methodology
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground/80">
            Wall areas are calculated in m² using entered dimensions and
            openings. Material quantities depend on the configured market mix
            ratios and packaging; unavailable configurations are disclosed
            rather than replaced with assumed values. Fence measurements may be
            entered in feet or metres and are normalized to m².
          </p>
        </div>

        <FaqItemsWithSchema faqs={faqs} />
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
        {/* Ad slot, placement "calculator_hub_mid" */}
        <AdSlot slotKey="calculator_hub_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_hub_native" */}
        <AdSlot slotKey="calculator_hub_native" className="mt-8" />

        <EstimateDisclaimer />
      </section>
    </>
  );
}
