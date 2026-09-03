import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2,
  Info,
  AlertCircle,
  Loader2,
  Calculator,
  PaintBucket,
  Paintbrush,
  Package,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import {
  calculateScreedingSystem,
  dbToSystemConfig,
} from "@/lib/calc";
import { calculateLabourCost } from "@/lib/labour";
import LabourCostSection, {
  useLabourConfig,
} from "@/components/labour/LabourCostSection";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { logAnalyticsEvent, fetchScreedingSystemConfig } from "@/lib/queries";
import type {
  ScreedingSystemConfig,
  ScreedingSystemResult,
  ScreedingMaterialSystem,
  ScreedingMaterialBreakdown,
} from "@/types";
import type { DbScreedingSystemConfig } from "@/types/database";
import { useSeo } from "@/lib/seo";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
// Engine integration
import { useEngineFeatures } from "@/lib/measurement";
import { monitoredCalc } from "@/lib/calculator-monitor";
import {
  EngineConfidenceBadge,
  EngineExplanationPanel,
  EngineMaterialSummaryCard,
} from "@/components/engine";
import AdSlot from "@/components/ui/AdSlot";
import { Button } from "@/components/ui/shadcn/button";

interface PassedState {
  netScreedingArea?: number;
  method?: string;
}

interface AvailableSystem {
  systemType: ScreedingMaterialSystem;
  displayName: string;
  description: string | null;
  icon: typeof PaintBucket;
}

export default function ScreedingCostEstimator({
  embedded = false,
}: { embedded?: boolean } = () => {}) {
  const { defaults: calcDefaults } = useCalcDefaults("screeding_cost");
  useSeo(
    !embedded
      ? {
          title:
            "Wall Screeding Cost Estimator — Putty, Paint & Cement Calculator",
          description:
            "Estimate wall screeding costs with Putty or White Cement + Screeding Paint. Configurable coverage, coats, waste, labour, and material pricing.",
          canonicalPath: "/screeding-cost-estimator",
          ogType: "website",
          structuredData: {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "FRELUX Wall Screeding Cost Estimator",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
          },
        }
      : null,
  );

  const location = useLocation();
  const passed = (location.state as PassedState | null) ?? {};

  const [puttyConfig, setPuttyConfig] = useState<ScreedingSystemConfig | null>(null);
  const [mixConfig, setMixConfig] = useState<ScreedingSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [netArea, setNetArea] = useState(passed.netScreedingArea ?? 0);
  const [selectedSystem, setSelectedSystem] = useState<ScreedingMaterialSystem | null>(null);
  const [coats, setCoats] = useState(2);
  const [result, setResult] = useState<ScreedingSystemResult | null>(null);
  // Engine features
  const engine = useEngineFeatures({ calculatorType: "screeding_cost" });
  const { config: labourConfig, setConfig: setLabourConfig } = useLabourConfig("screeding");

  const mountedRef = useRef(true);
  useEffect(() => {
    track("screeding_estimator_opened", {});
    logAnalyticsEvent("screeding_estimator_opened", {});

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadConfigs() {
      setLoading(true);
      setLoadError(null);
      try {
        const [puttyRes, mixRes] = await Promise.all([
          fetchScreedingSystemConfig("putty"),
          fetchScreedingSystemConfig("white_cement_paint"),
        ]);
        if (puttyRes.error) setLoadError(puttyRes.error);
        if (mixRes.error && !loadError) setLoadError(mixRes.error);
        if (puttyRes.data) {
          const cfg = dbToSystemConfig(puttyRes.data);
          setPuttyConfig(cfg);
          setSelectedSystem("putty");
          setCoats(cfg.defaultCoats);
        }
        if (mixRes.data) {
          setMixConfig(dbToSystemConfig(mixRes.data));
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
      setLoading(false);
    }
    loadConfigs();
  }, []);

  const activeConfig = selectedSystem === "putty" ? puttyConfig : mixConfig;

  // Auto-calculate when inputs change
  useEffect(() => {
    if (!activeConfig || netArea <= 0 || !selectedSystem) {
      setResult(null);
      return;
    }
    const rawResult = monitoredCalc("Screeding Cost Estimator", () =>
      calculateScreedingSystem(netArea, activeConfig, coats),
    );
    setResult(rawResult);
    track("screeding_system_estimate_generated", {
      area: netArea,
      system: selectedSystem,
      coats,
    });
    logAnalyticsEvent("screeding_system_estimate_generated", {
      area: netArea,
      system: selectedSystem,
      coats,
    });
  }, [activeConfig, netArea, coats, selectedSystem]);

  function handleSystemChange(system: ScreedingMaterialSystem) {
    setSelectedSystem(system);
    const cfg = system === "putty" ? puttyConfig : mixConfig;
    if (cfg) setCoats(cfg.defaultCoats);
    setResult(null);
  }

  const availableSystems: AvailableSystem[] = [];
  if (puttyConfig) {
    availableSystems.push({
      systemType: "putty",
      displayName: puttyConfig.displayName,
      description: puttyConfig.description,
      icon: PaintBucket,
    });
  }
  if (mixConfig) {
    availableSystems.push({
      systemType: "white_cement_paint",
      displayName: mixConfig.displayName,
      description: mixConfig.description,
      icon: Paintbrush,
    });
  }

  if (loading) {
    return (
      <>
        {!embedded && (
          <PageHeader
            eyebrow="Tool"
            title="Screeding Cost Estimator"
            subtitle="Estimate material and labour costs for your wall screeding project."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Calculators", path: "/calculators" },
              { label: "Screeding Cost Estimator" },
            ]}
          />
        )}
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading configuration…
        </div>
      </>
    );
  }

  const currencySymbol = activeConfig?.currencySymbol ?? "₦";

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Tool"
          title="Screeding Cost Estimator"
          subtitle="Calculate screeding material costs — Putty or White Cement + Screeding Paint. Coverage, coats, waste, and pricing are all admin-configured."
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Calculators", path: "/calculators" },
            { label: "Screeding Cost Estimator" },
          ]}
        />
      )}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {loadError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>
              Some data couldn't be loaded: {loadError}. Please try again later.
            </p>
          </div>
        )}

        {netArea <= 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-4 text-sm text-card-foreground">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-yellow"
            />
            <p>
              Tip: Use the{" "}
              <Link
                to="/screeding-calculator"
                className="font-semibold text-brand-purple underline"
              >
                Wall Screeding Calculator
              </Link>{" "}
              first, then continue here. Your screeding area will carry over
              automatically.
            </p>
          </div>
        )}

        {availableSystems.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Input panel */}
            <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card lg:col-span-3 space-y-6">
              {/* Material System Selector */}
              <Section title="Select Screeding Material">
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableSystems.map((sys) => {
                    const Icon = sys.icon;
                    const isActive = selectedSystem === sys.systemType;
                    return (
                      <button
                        key={sys.systemType}
                        type="button"
                        onClick={() => handleSystemChange(sys.systemType)}
                        className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/5 ring-2 ring-ring/20"
                            : "border-border hover:border-primary/40 hover:bg-muted/50 dark:border-white/10 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon aria-hidden="true" className="h-5 w-5 text-brand-purple" />
                          <span className="text-sm font-bold text-foreground dark:text-primary-foreground">
                            {sys.displayName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          {sys.description ?? "Screeding calculation."}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="Screeding Area">
                <Field
                  label="Net screeding area (m²)"
                  hint="From the calculator or enter manually"
                >
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={netArea || ""}
                    onChange={(e) => setNetArea(Number(e.target.value))}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="0.00"
                  />
                </Field>
                {passed.method && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    From calculator:{" "}
                    {passed.method === "full_room"
                      ? "Full room"
                      : "Individual wall"}{" "}
                    method
                  </p>
                )}
              </Section>

              {/* Coats selector */}
              {activeConfig && (
                <Section title="Coats">
                  <Field
                    label="Number of coats"
                    hint={`Default: ${activeConfig.defaultCoats} coats (admin-configured). Additional coats multiply material requirements.`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCoats(Math.max(1, coats - 1))}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted dark:border-white/10 dark:text-primary-foreground dark:hover:bg-white/5"
                        aria-label="Decrease coats"
                      >
                        −
                      </button>
                      <span className="min-w-[3rem] text-center text-lg font-bold text-foreground dark:text-primary-foreground">
                        {coats}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoats(Math.min(10, coats + 1))}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted dark:border-white/10 dark:text-primary-foreground dark:hover:bg-white/5"
                        aria-label="Increase coats"
                      >
                        +
                      </button>
                      {coats !== activeConfig.defaultCoats && (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setCoats(activeConfig.defaultCoats)}
                          className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-primary-foreground"
                        >
                          Reset to default ({activeConfig.defaultCoats})
                        </Button>
                      )}
                    </div>
                  </Field>
                </Section>
              )}

              {/* Configuration summary */}
              {activeConfig && (
                <Section title="Active Configuration (Admin Managed)">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                      <ConfigItem label="Coverage area" value={`${activeConfig.coverageAreaM2} ${activeConfig.coverageUnit}`} />
                      <ConfigItem label="Default coats" value={`${activeConfig.defaultCoats}`} />
                      <ConfigItem label="Waste" value={`${activeConfig.wastePercentage}%`} />
                      {activeConfig.systemType === "putty" && activeConfig.puttyPricePerUnit != null && (
                        <ConfigItem label="Putty price" value={formatCurrency(activeConfig.puttyPricePerUnit, currencySymbol)} />
                      )}
                      {activeConfig.systemType === "white_cement_paint" && (
                        <>
                          {activeConfig.paintPricePerUnit != null && (
                            <ConfigItem label="Paint price" value={formatCurrency(activeConfig.paintPricePerUnit, currencySymbol)} />
                          )}
                          {activeConfig.cementPricePerUnit != null && (
                            <ConfigItem label="Cement price" value={formatCurrency(activeConfig.cementPricePerUnit, currencySymbol)} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              <LabourCostSection
                estimatorKey="screeding"
                config={labourConfig}
                onChange={setLabourConfig}
                currencySymbol={currencySymbol}
                area={netArea}
                last
              />
            </div>

            {/* Results panel */}
            <div className="lg:col-span-2">
              <div className="card sticky top-20 overflow-hidden">
                <div className="relative bg-gradient-to-br from-background to-primary p-6 text-primary-foreground">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                    Estimated material cost
                  </p>
                  {result && result.materialCost != null ? (
                    <p className="mt-1 text-3xl font-bold sm:text-4xl">
                      {formatCurrency(result.materialCost, currencySymbol)}
                    </p>
                  ) : result && result.materialCost == null ? (
                    <p className="mt-1 text-2xl font-bold text-primary-foreground/60 sm:text-3xl">
                      Price not configured
                    </p>
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-primary-foreground/40 sm:text-4xl">
                      {currencySymbol}0
                    </p>
                  )}
                  <p className="mt-1 text-xs text-primary-foreground/50">
                    Estimate only, not a final quote.
                  </p>
                </div>
                <div className="space-y-3 p-6">
                  {result ? (
                    <>
                      {/* Result header */}
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <h3 className="font-display text-sm font-bold text-foreground dark:text-primary-foreground">
                          {result.systemType === "putty" ? "Putty Requirement" : "Screeding Materials Requirement"}
                        </h3>
                      </div>

                      {/* Area and coats summary */}
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs dark:border-white/5 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total screeding area</span>
                          <span className="font-semibold text-foreground dark:text-primary-foreground">{formatNumber(result.netScreedingArea, 2)} m²</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-muted-foreground">Coats</span>
                          <span className="font-semibold text-foreground dark:text-primary-foreground">{result.coats}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-muted-foreground">Coverage rule</span>
                          <span className="font-semibold text-foreground dark:text-primary-foreground">{result.coverageAreaM2} m² per unit group</span>
                        </div>
                      </div>

                      {/* Material breakdowns */}
                      {result.systemType === "putty" && (
                        <MaterialBreakdownCard
                          breakdown={result.putty}
                          currencySymbol={currencySymbol}
                          icon={<PaintBucket aria-hidden="true" className="h-4 w-4 text-brand-purple" />}
                        />
                      )}
                      {result.systemType === "white_cement_paint" && (
                        <>
                          <MaterialBreakdownCard
                            breakdown={result.paint}
                            currencySymbol={currencySymbol}
                            icon={<Paintbrush aria-hidden="true" className="h-4 w-4 text-brand-purple" />}
                          />
                          <MaterialBreakdownCard
                            breakdown={result.cement}
                            currencySymbol={currencySymbol}
                            icon={<Package aria-hidden="true" className="h-4 w-4 text-brand-purple" />}
                          />
                        </>
                      )}

                      {/* Total cost */}
                      {result.materialCost != null && (
                        <div className="flex items-center justify-between border-t border-border pt-3 dark:border-white/10">
                          <span className="text-sm font-bold text-foreground dark:text-primary-foreground">Total estimated material cost</span>
                          <span className="text-sm font-bold text-foreground dark:text-primary-foreground">{formatCurrency(result.materialCost, currencySymbol)}</span>
                        </div>
                      )}
                      {result.materialCost == null && (
                        <div className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-3 text-xs text-muted-foreground">
                          Material cost cannot be calculated until prices are configured in the Admin settings. The quantity calculation above is still valid.
                        </div>
                      )}

                      {/* Explanation panel */}
                      <EngineExplanationPanel
                        result={engine.buildExplanation({
                          subject: result.systemType === "putty" ? "Putty Screeding Estimate" : "White Cement + Screeding Paint Estimate",
                          resultSummary: result.materialCost != null
                            ? `${formatCurrency(result.materialCost, currencySymbol)} for ${formatNumber(result.netScreedingArea, 2)} m² (${result.coats} coats)`
                            : `${formatNumber(result.netScreedingArea, 2)} m² (${result.coats} coats) — price not configured`,
                          steps: buildExplanationSteps(result),
                          notes: [
                            `Coverage: ${result.coverageAreaM2} m² per unit group`,
                            `Coats: ${result.coats}`,
                            result.systemType === "white_cement_paint"
                              ? `Waste: ${result.wastePercentage}%`
                              : `Waste: ${result.putty.wastePercentage}%`,
                          ],
                        })}
                      />

                      {/* Material summary */}
                      <EngineMaterialSummaryCard
                        summary={engine.buildMaterialSummary(
                          result.systemType === "putty"
                            ? [{
                                materialId: "putty",
                                productName: result.putty.name,
                                totalQuantity: result.putty.purchaseQuantity,
                                quantityUnit: result.putty.unit + "s",
                                spaceIds: ["surface"],
                              }]
                            : [
                                {
                                  materialId: "screeding-paint",
                                  productName: result.paint.name,
                                  totalQuantity: result.paint.purchaseQuantity,
                                  quantityUnit: result.paint.unit + "s",
                                  spaceIds: ["surface"],
                                },
                                {
                                  materialId: "white-cement",
                                  productName: result.cement.name,
                                  totalQuantity: result.cement.purchaseQuantity,
                                  quantityUnit: result.cement.unit + "s",
                                  spaceIds: ["surface"],
                                },
                              ]
                        )}
                      />

                      <div className="mt-3 flex justify-center">
                        <SaveToProjectButton
                          calculatorType="screeding"
                          calculatorSlug="screeding-cost-estimator"
                          calcTitle={`Screeding Cost (${result.systemType === "putty" ? "Putty" : "Cement+Paint"}): ${formatNumber(result.netScreedingArea, 2)} m²`}
                          calcData={{ netArea, systemType: result.systemType, coats: result.coats, ...result }}
                          resultSummary={{
                            materialCost: result.materialCost ?? 0,
                            systemType: result.systemType,
                          }}
                          materials={
                            result.systemType === "putty"
                              ? [{ name: result.putty.name, category: "putty", quantity: result.putty.purchaseQuantity, unit: result.putty.unit + "s" }]
                              : [
                                  { name: result.paint.name, category: "paint", quantity: result.paint.purchaseQuantity, unit: result.paint.unit + "s" },
                                  { name: result.cement.name, category: "cement", quantity: result.cement.purchaseQuantity, unit: result.cement.unit + "s" },
                                ]
                          }
                          compact
                          label="Save to Project Workspace"
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enter the screeding area to see your estimate.
                    </p>
                  )}
                </div>
                {result && (
                  <div className="border-t border-border/50 px-6 py-3 dark:border-white/5">
                    <EstimateDisclaimer
                      text={calcDefaults.estimateDisclaimer}
                    />
                    <ReportCalculationIssue
                      calculatorType="screeding_cost"
                      userInput={{
                        netArea,
                        systemType: result.systemType,
                        coats: result.coats,
                      }}
                      actualResult={{
                        materialCost: result.materialCost ?? 0,
                      }}
                    />
                  </div>
                )}
                <div className="border-t border-border/50 bg-muted/50 dark:bg-white/5 px-6 py-3 text-xs text-muted-foreground">
                  All screeding calculations use square metres (m²). Material quantities, prices, and coverage rules are admin-configured.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation to next step */}
        {netArea > 0 && (
          <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border dark:border-white/5 bg-muted/50 dark:bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                Next step: Paint Calculator
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Once your walls are screeded, calculate how much paint you'll
                need.
              </p>
            </div>
            <Link
              to="/paint-calculator"
              className="btn-primary"
              onClick={() => {
                track("screeding_navigate_to_paint_calculator", {});
                logAnalyticsEvent("screeding_navigate_to_paint_calculator", {});
              }}
            >
              <Calculator aria-hidden="true" className="h-4 w-4" />
              Go to Paint Calculator
            </Link>
          </div>
        )}
      </div>
      {!embedded && (
        <RelatedTools
          links={[
            CALC_LINKS.screedingCalc,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.imageEstimator,
          ]}
        />
      )}
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </>
  );
}

// =========================================================
// Helper functions
// =========================================================

function buildExplanationSteps(result: ScreedingSystemResult) {
  const steps: { description: string; value: string }[] = [
    { description: "Total screeding area", value: `${formatNumber(result.netScreedingArea, 2)} m²` },
    { description: "Coats", value: `${result.coats}` },
    { description: "Coverage rule", value: `${result.coverageAreaM2} m² per unit group` },
  ];

  if (result.systemType === "putty") {
    steps.push(
      { description: `${result.putty.name} base quantity`, value: `${formatNumber(result.putty.baseQuantity, 2)} ${result.putty.unit}s` },
      { description: `${result.putty.name} waste (${result.putty.wastePercentage}%)`, value: `${formatNumber(result.putty.wasteQuantity, 2)} ${result.putty.unit}s` },
      { description: `${result.putty.name} final quantity`, value: `${formatNumber(result.putty.finalQuantity, 2)} ${result.putty.unit}s` },
      { description: `${result.putty.name} purchase quantity`, value: `${result.putty.purchaseQuantity} ${result.putty.unit}s` },
    );
  } else {
    steps.push(
      { description: `${result.paint.name} base quantity`, value: `${formatNumber(result.paint.baseQuantity, 2)} ${result.paint.unit}s` },
      { description: `${result.paint.name} waste (${result.paint.wastePercentage}%)`, value: `${formatNumber(result.paint.wasteQuantity, 2)} ${result.paint.unit}s` },
      { description: `${result.paint.name} purchase quantity`, value: `${result.paint.purchaseQuantity} ${result.paint.unit}s` },
      { description: `${result.cement.name} base quantity`, value: `${formatNumber(result.cement.baseQuantity, 2)} ${result.cement.unit}s` },
      { description: `${result.cement.name} waste (${result.cement.wastePercentage}%)`, value: `${formatNumber(result.cement.wasteQuantity, 2)} ${result.cement.unit}s` },
      { description: `${result.cement.name} purchase quantity`, value: `${result.cement.purchaseQuantity} ${result.cement.unit}s` },
    );
  }

  if (result.materialCost != null) {
    steps.push({ description: "Total estimated material cost", value: formatCurrency(result.materialCost, result.currencySymbol) });
  }

  return steps;
}

function MaterialBreakdownCard({
  breakdown,
  currencySymbol,
  icon,
}: {
  breakdown: ScreedingMaterialBreakdown;
  currencySymbol: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border dark:border-white/5 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {breakdown.name}
        </p>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <Row label="Base quantity" value={`${formatNumber(breakdown.baseQuantity, 2)} ${breakdown.unit}s`} />
        {breakdown.wastePercentage > 0 && (
          <>
            <Row label={`Waste (${breakdown.wastePercentage}%)`} value={`${formatNumber(breakdown.wasteQuantity, 2)} ${breakdown.unit}s`} />
            <Row label="Final quantity" value={`${formatNumber(breakdown.finalQuantity, 2)} ${breakdown.unit}s`} />
          </>
        )}
        <Row label="Purchase quantity" value={`${breakdown.purchaseQuantity} ${breakdown.unit}s`} strong />
        {breakdown.pricePerUnit != null && breakdown.pricePerUnit > 0 ? (
          <>
            <Row label="Unit price" value={formatCurrency(breakdown.pricePerUnit, currencySymbol)} />
            <Row label="Total cost" value={formatCurrency(breakdown.totalCost ?? 0, currencySymbol)} strong />
          </>
        ) : (
          <p className="text-xs text-accent-yellow">
            Price not configured — cost cannot be calculated.
          </p>
        )}
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground dark:text-primary-foreground">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-border/50 pb-6 dark:border-white/5"}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " +
          (strong
            ? "font-bold text-foreground dark:text-primary-foreground"
            : "text-muted-foreground dark:text-muted-foreground")
        }
      >
        {label}
      </span>
      <span
        className={
          "text-sm " +
          (strong
            ? "font-bold text-foreground dark:text-primary-foreground"
            : "text-card-foreground dark:text-muted-foreground/60")
        }
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}
