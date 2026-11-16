import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";

import { track } from "@/lib/analytics";

import { useLanguage } from "@/lib/i18n";
import ToolShell from "@/components/tools/ToolShell";

const PopCeilingCalculator = lazy(() => import("@/pages/PopCeilingCalculator"));
const PopCeilingCostEstimator = lazy(
  () => import("@/pages/PopCeilingCostEstimator"),
);

const TABS = [
  { id: "quantity", label: "Material Quantity" },
  { id: "cost", label: "Cost Estimate" },
];

export default function PopCeilingCalculatorHub() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "quantity";
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get("mode") || "quantity";
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ mode: tabId }, { replace: true });
    track("calculator_tab_change", { calculator: "pop_ceiling", mode: tabId });
  };

  return (
    <ToolShell route="/pop-ceiling-calculator">
      <>

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
          <div className="prose prose-neutral max-w-none break-words prose-p:max-w-[68ch] prose-p:leading-[1.75] prose-li:leading-[1.75] prose-headings:text-balance dark:prose-invert">
            <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
              {t("About the FRELUX POP Ceiling Calculator")}
            </h2>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              The FRELUX POP Ceiling Calculator is a comprehensive tool for
              planning plaster of paris (POP) ceiling projects. It combines
              material quantity calculation with cost estimation in one unified
              experience, supporting both Nigerian and international POP ceiling
              workflows.
            </p>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("Calculation Modes")}
            </h3>
            <ul>
              <li>
                <strong>{t("Material Quantity")}</strong>, Calculate POP cement,
                fibreglass mesh, and other material quantities based on your
                ceiling area and chosen workflow.
              </li>
              <li>
                <strong>{t("Cost Estimate")}</strong>, Get a full cost breakdown
                using admin-configured material prices for all POP ceiling
                materials including waste factors.
              </li>
            </ul>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("FRELUX POP Material Logic")}
            </h3>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              The calculator uses established POP material rules with
              admin-configured workflows, material requirements, and packaging
              sizes. Different ceiling designs and workflows have their own
              material breakdowns that reflect real construction practices.
            </p>
          </div>

          {/* Ad slot, placement "calculator_hub_mid" */}
          <AdSlot slotKey="calculator_hub_mid" className="mt-8" />
          {/* Native banner slot, placement "calculator_hub_native" */}
          <AdSlot slotKey="calculator_hub_native" className="mt-8" />
        </section>
      </>
    </ToolShell>
  );
}
