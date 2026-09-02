import { useState, useEffect } from "react";
import { CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { SaveToProjectButton } from "@/components/calculators";
import { formatNumber } from "@/lib/utils";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { logAnalyticsEvent } from "@/lib/queries";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  HowCalculatedSection,
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import CalculatorNearMe from "@/components/calculators/CalculatorNearMe";
import { useSeo } from "@/lib/seo";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { SITE_URL } from "@/lib/seo";

// Unified measurement system
import {
  MeasurementInput,
  CalculationBreakdown,
} from "@/components/measurement/MeasurementInput";
import {
  useMeasurementProject,
  useEngineFeatures,
  type ProjectMode,
} from "@/lib/measurement";

// Engine UI components
import {
  EngineExplanationPanel,
  EngineConfidenceBadge,
  EngineConfidenceDetail,
  EngineWasteSelector,
} from "@/components/engine";
import { Button } from "@/components/ui/shadcn/button";

export default function ScreedingCalculator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  useCalcDefaults("screeding");
  useSeo(
    !embedded
      ? {
          title: "Wall Screeding Calculator — How Much Screeding Do I Need?",
          description:
            "Free wall screeding calculator. Enter your room or wall dimensions, doors, and windows to calculate the exact wall area that needs screeding.",
          canonicalPath: "/screeding-calculator",
          ogType: "website",
          structuredDataArray: [
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "FRELUX Wall Screeding Calculator",
              applicationCategory: "BusinessApplication",
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
          ],
        }
      : null,
  );

  const {
    project,
    validation,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    resetWithMode,
    calculate,
  } = useMeasurementProject({
    calculatorContext: "screeding",
    preferredUnit: "meters",
    projectMode: "single_room",
  });

  // Engine features
  const engine = useEngineFeatures({ calculatorType: "screeding" });

  const [screedingResult, setScreedingResult] = useState<{
    totalAreaM2: number;
    steps: { label: string; formula: string; value: string }[];
  } | null>(null);

  useEffect(() => {
    track("screeding_calculator_opened", {});
    logAnalyticsEvent("screeding_calculator_opened", {});
  }, []);

  function handleCalculate() {
    if (!validation.valid) return;
    const projectResult = calculate();
    setScreedingResult({
      totalAreaM2: projectResult.totalAreaM2,
      steps: projectResult.steps,
    });
    track("screeding_calculation_completed", {
      totalArea: projectResult.totalAreaM2,
      mode: project.projectMode,
    });
    logAnalyticsEvent("screeding_calculation_completed", {
      totalArea: projectResult.totalAreaM2,
      mode: project.projectMode,
    });
  }

  function startOver() {
    resetWithMode(project.projectMode);
    setScreedingResult(null);
  }

  function handleModeChange(mode: ProjectMode) {
    resetWithMode(mode);
    setScreedingResult(null);
  }

  // Build engine explanation from result
  const engineExplanation = screedingResult
    ? engine.buildExplanation({
        subject: "Screeding Area Calculation",
        resultSummary: `${screedingResult.totalAreaM2.toFixed(2)} m² total screeding area`,
        steps: screedingResult.steps.map((s) => ({
          description: `${s.label}: ${s.formula}`,
          value: s.value,
        })),
        notes: [
          "All measurements are normalized to metres internally.",
          "Area is always expressed in square metres (m²).",
        ],
      })
    : null;

  // Assess confidence
  const confidence = screedingResult
    ? engine.assessConfidence({
        ruleValid: true,
        inputComplete: validation.valid,
        materialSpecComplete: false, // Screeding calc is area-only, no material spec yet
        marketPriceAvailable: false,
        sourceReliability: "verified",
        productMatched: false,
      })
    : null;

  return (
    <>
      {!embedded && (
        <>
          <PageHeader
            eyebrow="Tool"
            title="Wall Screeding Calculator"
            subtitle="Calculate the exact wall surface area that needs screeding. Enter room dimensions in feet or metres — we handle the conversion."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Calculators", path: "/calculators" },
              { label: "Screeding Calculator" },
            ]}
          />
          <WorkWeatherBanner workType="screeding" />
        </>
      )}

      <div
        role="region"
        aria-label="Screeding calculator"
        className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
      >
        {!screedingResult && (
          <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card space-y-6">
            <MeasurementInput
              project={project}
              context="screeding"
              validation={validation}
              onProjectModeChange={handleModeChange}
              onAddMeasurement={addMeasurement}
              onUpdateMeasurement={updateMeasurement}
              onRemoveMeasurement={removeMeasurement}
            >
              {project.projectMode === "fence" && (
                <div className="rounded-xl border border-border/80 bg-muted/50 p-4 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground">
                  <p className="font-medium text-foreground dark:text-primary-foreground mb-1.5">
                    Fence Screeding
                  </p>
                  Each fence dimension has its own partition count. The area is
                  calculated as: partition length × height × number of
                  partitions. All results are in m².
                </div>
              )}
              {project.projectMode === "house_building" && (
                <div className="rounded-xl border border-border/80 bg-muted/50 p-4 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground">
                  <p className="font-medium text-foreground dark:text-primary-foreground mb-1.5">
                    House / Building
                  </p>
                  Add each space type separately. Use quantity for identical
                  rooms (e.g., 12×12 ft bedroom × 2). Different dimensions stay
                  as separate measurements.
                </div>
              )}
            </MeasurementInput>

            <Button variant="default"
              type="button"
              onClick={handleCalculate}
              disabled={!validation.valid}
              className="w-full btn-glow py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate Screeding Area
            </Button>
          </div>
        )}

        {screedingResult && (
          <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card space-y-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                Screeding Area Result
              </h2>
              {confidence && (
                <div className="ml-auto">
                  <EngineConfidenceBadge result={confidence} />
                </div>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center dark:border-brand-purple/30">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
              <p className="relative text-sm font-medium text-muted-foreground">
                Total Screeding Area
              </p>
              <p className="relative mt-3 text-4xl font-bold text-foreground dark:text-primary-foreground">
                {formatNumber(screedingResult.totalAreaM2, 2)}{" "}
                <span className="text-2xl text-muted-foreground">m²</span>
              </p>
              <p className="relative mt-1 text-xs text-muted-foreground">
                Surface area in square metres
              </p>
            </div>

            <CalculationBreakdown steps={screedingResult.steps} />

            {/* Engine-powered explanation panel */}
            {engineExplanation && (
              <EngineExplanationPanel result={engineExplanation} />
            )}

            {/* Engine-powered confidence detail */}
            {confidence && <EngineConfidenceDetail result={confidence} />}

            {/* Waste selector (for future material calculation) */}
            <EngineWasteSelector
              resolution={engine.wasteResolution}
              userWaste={engine.userWaste}
              onUserWasteChange={engine.setUserWaste}
            />

            <div className="rounded-xl border border-border/80 bg-muted/50 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground">
              <p className="font-medium text-foreground dark:text-primary-foreground mb-1.5">
                Next Step
              </p>
              This area feeds into the FRELUX screeding material calculation
              rules, which determine material quantity based on coverage rate
              and package configuration. The waste allowance above will apply
              when material quantity is calculated.
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary"
                type="button"
                onClick={startOver}
                className="inline-flex items-center gap-2"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Start Over
              </Button>
              <Link
                to="/screeding-calculator?mode=cost"
                state={{ netScreedingArea: screedingResult.totalAreaM2 }}
                className="btn-primary btn-glow inline-flex items-center gap-2"
              >
                Continue to Cost Estimate
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div className="pt-2 flex justify-center">
              <SaveToProjectButton
                calculatorType="screeding"
                calculatorSlug="screeding-calculator"
                calcTitle={`Screeding: ${formatNumber(screedingResult.totalAreaM2, 2)} m²`}
                calcData={{
                  totalAreaM2: screedingResult.totalAreaM2,
                  steps: screedingResult.steps,
                }}
                resultSummary={{
                  totalAreaM2: screedingResult.totalAreaM2,
                  stepCount: screedingResult.steps.length,
                }}
                materials={[]}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <HowCalculatedSection methodologyText="Screeding area is calculated by measuring the room length, width, and wall height, normalising to metres using exact conversion factors (1 ft = 0.3048 m), computing wall area as perimeter × height (where perimeter = 2 × (length + width)), and subtracting door and window openings. The final result is in m²." />
        <EstimateDisclaimer />
        <ReportCalculationIssue calculatorType="screeding-calculator" />
        {!embedded && (
          <>
            <CalculatorNearMe tradeSlug="screeding" />

            <div className="mt-8">
              <RelatedTools links={Object.values(CALC_LINKS)} />
            </div>
            <div className="mt-6">
              <RelatedToolsLinks />
            </div>
          </>
        )}
      </div>
    </>
  );
}
