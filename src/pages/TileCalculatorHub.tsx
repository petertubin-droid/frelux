import { useState, useEffect, lazy, Suspense } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";

import { track } from "@/lib/analytics";

import { useLanguage } from "@/lib/i18n";
import ToolShell from "@/components/tools/ToolShell";

const TileCalculator = lazy(() => import("@/pages/TileCalculator"));
const TileCostEstimator = lazy(() => import("@/pages/TileCostEstimator"));

const TABS = [
  { id: "quantity", label: "Tile Quantity" },
  { id: "cost", label: "Cost Estimate" },
];

export default function TileCalculatorHub() {
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
    track("calculator_tab_change", { calculator: "tile", mode: tabId });
  };

  return (
    <ToolShell route="/tile-calculator">
      <>

        <WorkWeatherBanner workType="tiling" />
        <CalculatorTabs
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          ariaLabel="Tile calculator mode"
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
            {activeTab === "quantity" && <TileCalculator embedded />}
            {activeTab === "cost" && <TileCostEstimator embedded />}
          </Suspense>
        </div>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="prose prose-neutral max-w-none break-words prose-p:max-w-[68ch] prose-p:leading-[1.75] prose-li:leading-[1.75] prose-headings:text-balance dark:prose-invert">
            <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
              {t("About the FRELUX Tile Calculator")}
            </h2>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              The FRELUX Tile Calculator is a complete tiling project tool that
              combines tile quantity calculation with cost estimation. Whether
              you're tiling a floor, wall, bathroom, or kitchen, it handles all
              the calculations you need in one place.
            </p>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("Calculation Modes")}
            </h3>
            <ul>
              <li>
                <strong>{t("Tile Quantity")}</strong>, Enter your dimensions and
                tile size to get exact tile counts, box recommendations, waste
                calculations, and adhesive/grout requirements.
              </li>
              <li>
                <strong>{t("Cost Estimate")}</strong>, Get a full cost analysis
                with admin-configured material prices for tiles, adhesive, grout,
                and accessories, including labour cost options.
              </li>
            </ul>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("FRELUX Tiling Methodology")}
            </h3>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              The calculator uses the established FRELUX tile calculation engine
              with admin-configured tile sizes, material requirements, and
              packaging sizes. It accounts for waste, breakage, pattern matching,
              and provides adhesive and grout quantities based on the surface area
              and tile type.
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
