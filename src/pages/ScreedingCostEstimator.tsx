import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2,
  Info,
  AlertCircle,
  Loader2,
  Calculator,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { calculateScreedingMix } from "@/lib/calc";
import { calculateLabourCost } from "@/lib/labour";
import LabourCostSection, {
  useLabourConfig,
} from "@/components/labour/LabourCostSection";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { logAnalyticsEvent, fetchScreedingMixConfig } from "@/lib/queries";
import type { ScreedingMixConfig, ScreedingMixResult } from "@/types";
import type { DbScreedingMixConfig } from "@/types/database";
import { useSeo } from "@/lib/seo";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";
import { AdvancedCalculator } from "@/components/rewarded/AdvancedCalculator";
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

interface PassedState {
  netScreedingArea?: number;
  method?: string;
}

const ADVANCED_FEATURES = [
  "Advanced material breakdown with line items",
  "Custom mix ratio editor",
  "Labour cost customization",
  "Multiple waste percentage scenarios",
  "Thickness and multiple coat calculations",
  "Profit and markup calculator",
  "Transport and logistics cost estimator",
  "Tax/VAT calculator",
  "Save, duplicate and compare estimates",
  "Export professional PDF quotations",
  "Material shopping list",
  "Cost comparison between brands",
  "AI recommendations for reducing waste",
  "AI assistant for calculation questions",
];

function dbToConfig(db: DbScreedingMixConfig): ScreedingMixConfig {
  return {
    paintCoverageRateM2PerL: Number(db.paint_coverage_rate_m2_per_l),
    paintBucketSizeL: Number(db.paint_bucket_size_l),
    paintPricePerBucket: Number(db.paint_price_per_bucket),
    cementConsumptionRatioKgPerL: Number(db.cement_consumption_ratio_kg_per_l),
    cementBagSizeKg: Number(db.cement_bag_size_kg),
    cementPricePerBag: Number(db.cement_price_per_bag),
    defaultMixRatio: db.default_mix_ratio,
    labourRatePerSqm: Number(db.labour_rate_per_sqm),
    wastePercentage: Number(db.waste_percentage),
    taxVatPercentage: Number(db.tax_vat_percentage),
    currency: db.currency,
    currencySymbol: db.currency_symbol,
  };
}

export default function ScreedingCostEstimator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: calcDefaults } = useCalcDefaults("screeding_cost");
  useSeo(
    !embedded
      ? {
          title:
            "Wall Screeding Cost Estimator — Paint + Cement Mix Calculator",
          description:
            "Estimate wall screeding costs with real-world mix calculations. Screeding Paint (20L buckets) + White Cement (40kg bags), labour, waste, VAT, and a professional quotation.",
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

  const [config, setConfig] = useState<ScreedingMixConfig | null>(null);
  const { config: labourConfig, setConfig: setLabourConfig } =
    useLabourConfig("screeding");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [netArea, setNetArea] = useState(passed.netScreedingArea ?? 0);
  const [result, setResult] = useState<ScreedingMixResult | null>(null);
  // Engine features
  const engine = useEngineFeatures({ calculatorType: "screeding_cost" });

  const mountedRef = useRef(true);
  useEffect(() => {
    track("screeding_estimator_opened", {});
    logAnalyticsEvent("screeding_estimator_opened", {});

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const { data, error } = await fetchScreedingMixConfig();
      if (error) setLoadError(error);
      if (data) setConfig(dbToConfig(data));
      setLoading(false);
    }
    loadConfig();
  }, []);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (!config || netArea <= 0) {
      setResult(null);
      return;
    }
    const rawResult = monitoredCalc("Screeding Cost Estimator", () =>
      calculateScreedingMix(netArea, { ...config, labourRatePerSqm: 0 }),
    );
    const labourCost = calculateLabourCost(labourConfig, netArea);
    const subtotal = rawResult.materialCost + labourCost;
    const taxFraction =
      Math.max(0, Math.min(100, config.taxVatPercentage)) / 100;
    const taxAmount = subtotal * taxFraction;
    const grandTotal = subtotal + taxAmount;
    const r: ScreedingMixResult = {
      ...rawResult,
      labourCost,
      taxAmount,
      grandTotal,
    };
    setResult(r);
    track("screeding_mix_estimate_generated", {
      area: netArea,
      total: r.grandTotal,
    });
    logAnalyticsEvent("screeding_mix_estimate_generated", {
      area: netArea,
      total: r.grandTotal,
    });
  }, [config, netArea, labourConfig]);

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
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-500">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading configuration…
        </div>
      </>
    );
  }

  const currencySymbol = config?.currencySymbol ?? "₦";

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Tool"
          title="Screeding Cost Estimator"
          subtitle="Real world screeding cost: Screeding Paint (20L buckets) + White Cement (40kg bags), labour, waste, and VAT."
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
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-4 text-sm text-neutral-700">
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

        {config && (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Input panel */}
            <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid lg:col-span-3">
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
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                    placeholder="0.00"
                  />
                </Field>
                {passed.method && (
                  <p className="mt-3 text-xs text-neutral-500">
                    From calculator:{" "}
                    {passed.method === "full_room"
                      ? "Full room"
                      : "Individual wall"}{" "}
                    method
                  </p>
                )}
              </Section>

              <Section title="Mix Configuration (Admin Managed)">
                <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-neutral-500">
                        Paint coverage
                      </span>
                      <span className="font-semibold text-brand-navy dark:text-white">
                        {config.paintCoverageRateM2PerL} m²/L
                      </span>
                    </div>
                    <div>
                      <span className="block text-neutral-500">
                        Cement ratio
                      </span>
                      <span className="font-semibold text-brand-navy dark:text-white">
                        {config.cementConsumptionRatioKgPerL} kg/L
                      </span>
                    </div>
                    <div>
                      <span className="block text-neutral-500">
                        Default mix
                      </span>
                      <span className="font-semibold text-brand-navy dark:text-white">
                        {config.defaultMixRatio}
                      </span>
                    </div>
                    <div>
                      <span className="block text-neutral-500">
                        Suggested labour rate
                      </span>
                      <span className="font-semibold text-brand-navy dark:text-white">
                        {formatCurrency(
                          config.labourRatePerSqm,
                          currencySymbol,
                        )}
                        /m²
                      </span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Pricing">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-neutral-200 dark:border-white/5 p-3">
                    <span className="block text-neutral-500">
                      Screeding Paint (20L bucket)
                    </span>
                    <span className="font-semibold text-brand-navy dark:text-white">
                      {formatCurrency(
                        config.paintPricePerBucket,
                        currencySymbol,
                      )}
                    </span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 dark:border-white/5 p-3">
                    <span className="block text-neutral-500">
                      White Cement (40kg bag)
                    </span>
                    <span className="font-semibold text-brand-navy dark:text-white">
                      {formatCurrency(config.cementPricePerBag, currencySymbol)}
                    </span>
                  </div>
                </div>
              </Section>

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
                <div className="relative bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                    Estimated grand total
                  </p>
                  {result ? (
                    <p className="mt-1 text-3xl font-bold sm:text-4xl">
                      {formatCurrency(result.grandTotal, currencySymbol)}
                    </p>
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-white/40 sm:text-4xl">
                      {currencySymbol}0
                    </p>
                  )}
                  <p className="mt-1 text-xs text-white/50">
                    Estimate only, not a final quote.
                  </p>
                </div>
                <div className="space-y-3 p-6">
                  {result ? (
                    <>
                      {/* Screeding Paint */}
                      <div className="rounded-lg border border-neutral-200 dark:border-white/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                          Screeding Paint (20L Buckets)
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <Row
                            label="Quantity required"
                            value={`${formatNumber(result.paintRequiredLiters, 1)} L`}
                          />
                          <Row
                            label="Buckets needed"
                            value={`${result.paintBucketsNeeded} × ${config.paintBucketSizeL}L`}
                          />
                          <Row
                            label="Unit price"
                            value={formatCurrency(
                              result.paintUnitPrice,
                              currencySymbol,
                            )}
                          />
                          <Row
                            label="Total cost"
                            value={formatCurrency(
                              result.paintTotalCost,
                              currencySymbol,
                            )}
                            strong
                          />
                        </div>
                      </div>

                      {/* White Cement */}
                      <div className="rounded-lg border border-neutral-200 dark:border-white/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                          White Cement (40kg Bags)
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <Row
                            label="Quantity required"
                            value={`${formatNumber(result.cementRequiredKg, 1)} kg`}
                          />
                          <Row
                            label="Bags needed"
                            value={`${result.cementBagsNeeded} × ${config.cementBagSizeKg}kg`}
                          />
                          <Row
                            label="Unit price"
                            value={formatCurrency(
                              result.cementUnitPrice,
                              currencySymbol,
                            )}
                          />
                          <Row
                            label="Total cost"
                            value={formatCurrency(
                              result.cementTotalCost,
                              currencySymbol,
                            )}
                            strong
                          />
                        </div>
                      </div>

                      {/* Cost breakdown */}
                      <div className="rounded-lg bg-neutral-50 dark:bg-white/5 p-3">
                        <div className="space-y-1 text-sm">
                          <Row
                            label="Material cost"
                            value={formatCurrency(
                              result.materialCost,
                              currencySymbol,
                            )}
                          />
                          {labourConfig.includeLabour && (
                            <Row
                              label="Labour cost"
                              value={formatCurrency(
                                result.labourCost,
                                currencySymbol,
                              )}
                            />
                          )}
                          <Row
                            label={`Waste (${result.wasteAllowance}%)`}
                            value={formatCurrency(
                              result.wasteAmount,
                              currencySymbol,
                            )}
                          />
                          <Row
                            label="Tax/VAT"
                            value={formatCurrency(
                              result.taxAmount,
                              currencySymbol,
                            )}
                          />
                          <div className="border-t border-neutral-200 pt-1">
                            <Row
                              label="Grand total"
                              value={formatCurrency(
                                result.grandTotal,
                                currencySymbol,
                              )}
                              strong
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg bg-neutral-50 dark:bg-white/5 p-3 text-xs text-neutral-500">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-green" />
                        Based on {formatNumber(netArea)} m² screeding area,{" "}
                        {result.wasteAllowance}% waste, and{" "}
                        {config.taxVatPercentage}% VAT.
                      </div>

                      {/* ── Engine Features (Additive) ── */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <EngineConfidenceBadge
                            result={engine.assessConfidence({
                              ruleValid: true,
                              inputComplete: netArea > 0,
                              materialSpecComplete: true,
                              marketPriceAvailable: result.materialCost > 0,
                              sourceReliability: "trusted",
                              productMatched: result.paintBucketsNeeded > 0,
                            })}
                          />
                        </div>

                        <EngineExplanationPanel
                          result={engine.buildExplanation({
                            subject: "Screeding Cost Estimate",
                            resultSummary: `${formatCurrency(result.grandTotal, currencySymbol)} total for ${formatNumber(netArea)} m²`,
                            steps: [
                              {
                                description: "Screeding area",
                                value: `${formatNumber(netArea)} m²`,
                              },
                              {
                                description: "Paint required",
                                value: `${formatNumber(result.paintRequiredLiters, 1)} L`,
                              },
                              {
                                description: "Paint buckets needed",
                                value: `${result.paintBucketsNeeded} × ${config.paintBucketSizeL}L`,
                              },
                              {
                                description: "Paint cost",
                                value: formatCurrency(
                                  result.paintTotalCost,
                                  currencySymbol,
                                ),
                              },
                              {
                                description: "Cement required",
                                value: `${formatNumber(result.cementRequiredKg, 1)} kg`,
                              },
                              {
                                description: "Cement bags needed",
                                value: `${result.cementBagsNeeded} × ${config.cementBagSizeKg}kg`,
                              },
                              {
                                description: "Cement cost",
                                value: formatCurrency(
                                  result.cementTotalCost,
                                  currencySymbol,
                                ),
                              },
                              {
                                description: "Material cost",
                                value: formatCurrency(
                                  result.materialCost,
                                  currencySymbol,
                                ),
                              },
                              {
                                description: "Waste",
                                value: formatCurrency(
                                  result.wasteAmount,
                                  currencySymbol,
                                ),
                              },
                              {
                                description: "Grand total",
                                value: formatCurrency(
                                  result.grandTotal,
                                  currencySymbol,
                                ),
                              },
                            ],
                            notes: [
                              `Waste: ${result.wasteAllowance}%`,
                              `VAT: ${config.taxVatPercentage}%`,
                            ],
                          })}
                        />

                        <EngineMaterialSummaryCard
                          summary={engine.buildMaterialSummary([
                            {
                              materialId: "screeding-paint",
                              productName: "Screeding Paint",
                              totalQuantity: result.paintBucketsNeeded,
                              quantityUnit: "buckets",
                              spaceIds: ["surface"],
                            },
                            {
                              materialId: "white-cement",
                              productName: "White Cement",
                              totalQuantity: result.cementBagsNeeded,
                              quantityUnit: "bags",
                              spaceIds: ["surface"],
                            },
                          ])}
                        />
                        <div className="mt-3 flex justify-center">
                          <SaveToProjectButton
                            calculatorType="screeding"
                            calculatorSlug="screeding-cost-estimator"
                            calcTitle={`Screeding Cost: ${formatNumber(netArea)} m²`}
                            calcData={{ netArea, ...config, ...result }}
                            resultSummary={{
                              grandTotal: result.grandTotal,
                              materialCost: result.materialCost,
                              paintRequiredLiters: result.paintRequiredLiters,
                              paintBucketsNeeded: result.paintBucketsNeeded,
                              cementRequiredKg: result.cementRequiredKg,
                              cementBagsNeeded: result.cementBagsNeeded,
                            }}
                            materials={[
                              {
                                name: "Screeding Paint",
                                category: "paint",
                                quantity: result.paintBucketsNeeded,
                                unit: "buckets",
                              },
                              {
                                name: "White Cement",
                                category: "cement",
                                quantity: result.cementBagsNeeded,
                                unit: "bags",
                              },
                            ]}
                            compact
                            label="Save to Project Workspace"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Enter the screeding area to see your estimate.
                    </p>
                  )}
                </div>
                {result && (
                  <div className="border-t border-neutral-100 px-6 py-3 dark:border-white/5">
                    <EstimateDisclaimer
                      text={calcDefaults.estimateDisclaimer}
                    />
                    <ReportCalculationIssue
                      calculatorType="screeding_cost"
                      userInput={{
                        netArea,
                        wasteAllowance: result.wasteAllowance,
                      }}
                      actualResult={{
                        materialCost: result.materialCost,
                        grandTotal: result.grandTotal,
                      }}
                    />
                  </div>
                )}
                <div className="border-t border-neutral-100 bg-neutral-50 dark:bg-white/5 px-6 py-3 text-xs text-neutral-500">
                  Screeding Paint is measured in litres (m²/L). White Cement is
                  measured in kg (kg per L of paint).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Calculator — gated by rewarded ad */}
        {config && netArea > 0 && (
          <RewardedFeatureGate
            toolKey="advanced_calculator"
            featureName="Advanced Calculator"
            features={ADVANCED_FEATURES}
          >
            {(access) => (
              <AdvancedCalculator
                toolKey="screeding"
                toolLabel="Screeding Calculator"
                contextSummary={`Screeding Calculator Results:
- Net screeding area: ${netArea} m²
- Mix ratio: ${config.defaultMixRatio || '2:1'}
- Paint coverage: ${config.paintCoverageRateM2PerL} m²/L
- Paint bucket: ${config.paintBucketSizeL}L @ ${config.currencySymbol}${config.paintPricePerBucket}
- Cement: ${config.cementBagSizeKg}kg bags @ ${config.currencySymbol}${config.cementPricePerBag}
- Labour rate: ${config.currencySymbol}${config.labourRatePerSqm}/m²
- Waste: ${config.wastePercentage}%
- Tax/VAT: ${config.taxVatPercentage}%`}
                netArea={netArea}
                config={config}
                clientHash={access.clientHash}
              />
            )}
          </RewardedFeatureGate>
        )}

        {/* Navigation to next step */}
        {netArea > 0 && (
          <div className="mt-8 flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5 dark:border-white/5 dark:bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-navy dark:text-white">
                Next step: Paint Calculator
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
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
    </>
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
    <div className={last ? "" : "mb-6 border-b border-neutral-100 pb-6"}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">
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
            ? "font-bold text-brand-navy dark:text-white"
            : "text-neutral-500 dark:text-neutral-500")
        }
      >
        {label}
      </span>
      <span
        className={
          "text-sm " +
          (strong
            ? "font-bold text-brand-navy dark:text-white"
            : "text-neutral-700 dark:text-neutral-200")
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
      <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>
      )}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
