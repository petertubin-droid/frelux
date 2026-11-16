import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import ToolShell from "@/components/tools/ToolShell";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { track } from "@/lib/analytics";
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
    track("calculator_tab_change", { calculator: "screeding", mode: tabId });
  };

  return (
    // The heading still follows the market name for wall finishing, but the
    // shell reads it from the catalogue entry instead of the page.
    <ToolShell route="/screeding-calculator">
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
        <div className="prose prose-neutral max-w-none break-words prose-p:max-w-[68ch] prose-p:leading-[1.75] prose-li:leading-[1.75] prose-headings:text-balance dark:prose-invert">
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

        {/* Ad slot, placement "calculator_hub_mid" */}
        <AdSlot slotKey="calculator_hub_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_hub_native" */}
        <AdSlot slotKey="calculator_hub_native" className="mt-8" />
      </section>
    </ToolShell>
  );
}
