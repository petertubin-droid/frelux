import AdSlot from "@/components/ui/AdSlot";
import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import CalculatorTabs from "@/components/ui/CalculatorTabs";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { useMarket } from "@/lib/international/market-context";
import {
  resolvePaintPacks,
  hasVerifiedPaintShelf,
} from "@/lib/estimation/paint-packaging";
import { track } from "@/lib/analytics";
import { useLanguage } from "@/lib/i18n";
import ToolShell from "@/components/tools/ToolShell";

const PaintCalculator = lazy(() => import("@/pages/PaintCalculator"));
const CostEstimator = lazy(() => import("@/pages/CostEstimator"));
const PaintingEstimator = lazy(() => import("@/pages/PaintingEstimator"));

const TABS = [
  { id: "quantity", label: "Paint Buckets" },
  { id: "cost", label: "Material Cost" },
  { id: "room-estimate", label: "Project Estimate" },
];

/**
 * Market-aware FAQ copy: non-NG markets see their curated pack term
 * (e.g. "1 gal / 5 gal pail") instead of the Nigerian "bucket" phrasing.
 * The FAQPage structured data is built from these localised strings in
 * FaqItemsWithSchema, because Google requires the markup to match the text a
 * visitor sees. The canonical NG wording stays in src/config/tool-faqs.ts for
 * the /faq index and for pages that do not localise.
 */

export default function PaintingCalculatorHub() {
  const { t } = useLanguage();
  // The shelf the market actually sells, so the copy does not promise a 20 L
  // bucket to a visitor whose shops stock 5 L tins, or a bucket at all to a
  // market that sells by the gallon.
  const { marketCode } = useMarket();
  const packs = resolvePaintPacks(marketCode);
  const shelf = packs.map((pack) => pack.label).join(", ");
  const containerNoun = packs[0].noun === "tin" ? "tins" : "containers";
  const shelfVerified = hasVerifiedPaintShelf(marketCode);
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
    track("calculator_tab_change", { calculator: "painting", mode: tabId });
  };

  return (
    <ToolShell
      route="/paint-calculator"
      image="https://images.pexels.com/photos/34264478/pexels-photo-34264478.jpeg?auto=compress&cs=tinysrgb&w=1600"
    >
      <>
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
          <div className="prose prose-neutral max-w-none break-words prose-p:max-w-[68ch] prose-p:leading-[1.75] prose-li:leading-[1.75] prose-headings:text-balance dark:prose-invert">
            <h2 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
              {t("About the FRELUX Painting Calculator")}
            </h2>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              The FRELUX Painting Calculator is a comprehensive tool for anyone
              planning a painting project. It consolidates three essential
              painting calculations into one unified experience:
            </p>
            <ul>
              <li>
                <strong>{t("Paint Quantity")}</strong>, Calculate exactly how
                many {containerNoun} you need based on wall area, doors,
                windows, and coats, in the pack sizes this market sells:
                {shelf}.
              </li>
              <li>
                <strong>{t("Cost Estimate")}</strong>, Get a full paint material
                cost breakdown using admin-configured material prices for paint
                buckets, primer, and materials.
              </li>
              <li>
                <strong>{t("Room Estimate")}</strong>, A detailed room-by-room
                painting estimator using the FRELUX Phase 2 engine with
                production rules, surface conditions, and colour conditions.
              </li>
            </ul>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("FRELUX Painting Methodology")}
            </h3>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              FRELUX uses a proprietary calculation methodology that accounts
              for wall surface conditions, colour conditions, paint type
              coverage rates, and waste factors specific to real construction
              environments. The engine applies admin-configured production
              rules, coverage rates, and material packaging sizes to produce
              results expressed in containers this market sells ({shelf}), not
              generic m²-per-litre estimates.
              {shelfVerified
                ? ""
                : " No retail listing has been checked for this market, so the pack sizes above are the metric shelf and may not match what your suppliers stock."}
            </p>
            <h3 className="font-display text-xl font-semibold text-foreground dark:text-primary-foreground">
              {t("Construction Context")}
            </h3>
            <p className="text-muted-foreground dark:text-muted-foreground/80">
              Calculations run against the price book configured for your market
              where one exists, with standard room dimensions and the materials
              building suppliers stock. Where no market price book is
              configured, the engine defaults are used and the result says so,
              so a figure is never presented as a local quote when it is not.
            </p>
          </div>

          {/* Ad slot, placement "calculator_hub_mid" */}
          <AdSlot slotKey="calculator_hub_mid" className="mt-8" />
          {/* Native banner slot, placement "calculator_hub_native" */}
          <AdSlot slotKey="calculator_hub_native" className="mt-8" />
        </section>
      </>{" "}
    </ToolShell>
  );
}
