import { useState, useEffect, useRef } from "react";
import {
  Paintbrush,
  SprayCan,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import ResultCard from "@/components/ui/ResultCard";
import {
  calculateFinish,
  getFinishTypeLabel,
  getFinishTypeDescription,
  getDefaultCoats,
  dbToFinishMaterialConfig,
  type FinishType,
  type FinishCalcResult,
  type FinishMaterialConfig,
} from "@/lib/finish-calc";
import {
  fetchFinishTypes,
  fetchSiteSettings,
  saveUserProject,
  logAnalyticsEvent,
} from "@/lib/queries";
import {
  calculateScreedingArea,
  validateScreedingInput,
  formatCurrency,
  formatNumber,
} from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useSeo } from "@/lib/seo";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  HowCalculatedSection,
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import type {
  ScreedingCalcInput,
  ScreedingCalcResult,
  Unit,
  OpeningDimensions,
} from "@/types";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import type { DbFinishType, DbSiteSettings } from "@/types/database";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { monitoredCalc } from "@/lib/calculator-monitor";

// Default door/window dims now from admin calc rules via useCalcDefaults

const finishTypeMeta: Record<
  FinishType,
  { icon: typeof Paintbrush; color: string }
> = {
  painting: { icon: Paintbrush, color: "text-blue-600" },
  tyrolene: { icon: SprayCan, color: "text-amber-600" },
  grafitex: { icon: Layers, color: "text-emerald-600" },
};

export default function FinishEstimator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: calcDefaults } = useCalcDefaults("finish");
  const defaultDoorDims: OpeningDimensions = {
    width: calcDefaults.doorWidthM,
    height: calcDefaults.doorHeightM,
  };
  const defaultWindowDims: OpeningDimensions = {
    width: calcDefaults.windowWidthM,
    height: calcDefaults.windowHeightM,
  };
  useSeo(
    !embedded
      ? {
          title:
            "Finish Estimator — Painting, Tyrolene & Grafitex Cost Calculator",
          description:
            "Estimate material quantities and costs for wall finishes including Painting, Tyrolene, and Grafitex. Based on real coverage rates and package sizes.",
          canonicalPath: "/finish-estimator",
          ogType: "website",
          structuredData: {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "FRELUX Finish Estimator",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
          },
        }
      : null,
  );

  const [finishTypes, setFinishTypes] = useState<DbFinishType[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFinish, setSelectedFinish] = useState<FinishType>("painting");
  const [result, setResult] = useState<FinishCalcResult | null>(null);
  const [saved, setSaved] = useState(false);

  const currencySymbol = settings?.default_currency_symbol ?? "₦";
  const currency = settings?.default_currency ?? "NGN";

  const [areaInput, setAreaInput] = useState<ScreedingCalcInput>({
    method: "full_room",
    roomLength: 0,
    roomWidth: 0,
    wallWidth: 0,
    wallCount: 1,
    wallHeight: 0,
    doors: 0,
    doorDims: defaultDoorDims,
    windows: 0,
    windowDims: defaultWindowDims,
    unit: "meters",
  });

  const [coats, setCoats] = useState(2);
  const [wasteMargin, setWasteMargin] = useState(10);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mountedRef = useRef(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ftRes, settingsRes] = await Promise.all([
        fetchFinishTypes(),
        fetchSiteSettings(),
      ]);
      if (ftRes.error) setLoadError(ftRes.error);
      else setFinishTypes(ftRes.data);

      if (settingsRes.data) setSettings(settingsRes.data);
      setLoading(false);
    }
    load();
    track("finish_estimator_opened", {});
    logAnalyticsEvent("finish_estimator_opened", {});

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update coats when finish type changes
  useEffect(() => {
    setCoats(getDefaultCoats(selectedFinish));
    setResult(null);
  }, [selectedFinish]);

  function updateArea<K extends keyof ScreedingCalcInput>(
    key: K,
    value: ScreedingCalcInput[K],
  ) {
    setAreaInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setResult(null);
  }

  function compute() {
    const e = validateScreedingInput(areaInput);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const areaResult: ScreedingCalcResult = calculateScreedingArea(areaInput);
    const area = areaResult.netScreedingArea;
    if (area <= 0) {
      setErrors({ area: "Net area must be greater than 0" });
      return;
    }

    // Get materials for the selected finish type from DB, or fall back to defaults
    const dbMaterials = finishTypes.filter((ft) => ft.slug === selectedFinish);
    const materials: FinishMaterialConfig[] =
      dbMaterials.length > 0 ? dbMaterials.map(dbToFinishMaterialConfig) : [];

    const calcResult = monitoredCalc("Finish Calculator", () =>
      calculateFinish({
        finishType: selectedFinish,
        area,
        coats,
        wasteMargin,
        materials: materials.length > 0 ? materials : undefined,
        currency,
        currencySymbol,
      }),
    );

    setResult(calcResult);
    setSaved(false);
    track("finish_estimate_completed", {
      finishType: selectedFinish,
      area,
      coats,
    });
    logAnalyticsEvent("finish_estimate_completed", {
      finishType: selectedFinish,
      area,
      coats,
    });
  }

  async function handleSave() {
    if (!result) return;
    const name = `${getFinishTypeLabel(selectedFinish)} — ${formatNumber(result.area)} m²`;
    const { error } = await saveUserProject(
      name,
      "custom",
      { finishType: selectedFinish, areaInput, coats, wasteMargin, result },
      undefined,
    );
    if (error) {
      setErrors({ save: error });
      return;
    }
    setSaved(true);
  }

  function startOver() {
    setResult(null);
    setSaved(false);
    setErrors({});
  }

  const finishTypesList: FinishType[] = ["painting", "tyrolene", "grafitex"];

  return (
    <>
      {!embedded && (
        <>
          <PageHeader
            eyebrow="Estimate"
            title="Finish Estimator"
            subtitle="Calculate material quantities and costs for Painting, Tyrolene, and Grafitex wall finishes."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Calculators", path: "/calculators" },
              { label: "Finish Estimator" },
            ]}
          />
          <WorkWeatherBanner workType="finishing" />
        </>
      )}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2
              aria-hidden="true"
              className="h-8 w-8 animate-spin text-brand-purple"
            />
            <span className="ml-3 text-sm text-muted-foreground">
              Loading finish types...
            </span>
          </div>
        )}

        {loadError && !loading && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>
              Couldn't load finish type data: {loadError}. Default values will
              be used for calculations.
            </p>
          </div>
        )}

        {!loading && !result && (
          <div className="space-y-8">
            {/* Step 1: Finish Type Selection */}
            <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
              <h2 className="font-display text-lg font-bold text-foreground">
                Choose finish type
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the wall finish you want to estimate.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {finishTypesList.map((ft) => {
                  const meta = finishTypeMeta[ft];
                  const Icon = meta.icon;
                  const selected = selectedFinish === ft;
                  return (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setSelectedFinish(ft)}
                      className={
                        "select-card flex flex-col items-start gap-3 rounded-xl border p-4 text-left " +
                        (selected
                          ? "select-card-active border-brand-purple bg-primary/5 ring-2 ring-brand-purple/20"
                          : "border-border hover:border-border")
                      }
                    >
                      <span
                        className={
                          "inline-flex h-10 w-10 items-center justify-center rounded-lg " +
                          (selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted " + meta.color)
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">
                          {getFinishTypeLabel(ft)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {getFinishTypeDescription(ft)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Area Input */}
            <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
              <h2 className="font-display text-lg font-bold text-foreground">
                Surface area
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your wall dimensions to calculate the paintable area.
              </p>

              <div className="mt-6 space-y-5">
                {/* Method toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateArea("method", "full_room")}
                    className={
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all " +
                      (areaInput.method === "full_room"
                        ? "border-brand-purple bg-primary/5 text-brand-purple"
                        : "border-border text-muted-foreground hover:border-border")
                    }
                  >
                    Full Room
                  </button>
                  <button
                    type="button"
                    onClick={() => updateArea("method", "individual_wall")}
                    className={
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all " +
                      (areaInput.method === "individual_wall"
                        ? "border-brand-purple bg-primary/5 text-brand-purple"
                        : "border-border text-muted-foreground hover:border-border")
                    }
                  >
                    Individual Wall
                  </button>
                </div>

                {/* Unit toggle */}
                <div className="flex gap-2">
                  {(["meters", "feet"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => updateArea("unit", u)}
                      className={
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-all " +
                        (areaInput.unit === u
                          ? "border-brand-purple bg-primary/5 text-brand-purple"
                          : "border-border text-muted-foreground hover:border-border")
                      }
                    >
                      {u === "meters" ? "Meters" : "Feet"}
                    </button>
                  ))}
                </div>

                {/* Dimensions */}
                {areaInput.method === "full_room" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="section-label">Room Length</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.roomLength || ""}
                        onChange={(e) =>
                          updateArea(
                            "roomLength",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                      {errors.roomLength && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.roomLength}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="section-label">Room Width</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.roomWidth || ""}
                        onChange={(e) =>
                          updateArea(
                            "roomWidth",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                      {errors.roomWidth && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.roomWidth}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="section-label">Wall Width</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.wallWidth || ""}
                        onChange={(e) =>
                          updateArea(
                            "wallWidth",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                      {errors.wallWidth && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.wallWidth}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="section-label">Number of Walls</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.wallCount || ""}
                        onChange={(e) =>
                          updateArea("wallCount", parseInt(e.target.value) || 1)
                        }
                        placeholder="1"
                        min="1"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="section-label">Wall Height</label>
                    <input
                      type="number"
                      className="input-field"
                      value={areaInput.wallHeight || ""}
                      onChange={(e) =>
                        updateArea(
                          "wallHeight",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0"
                    />
                    {errors.wallHeight && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.wallHeight}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="section-label">Doors</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.doors || ""}
                        onChange={(e) =>
                          updateArea("doors", parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="section-label">Windows</label>
                      <input
                        type="number"
                        className="input-field"
                        value={areaInput.windows || ""}
                        onChange={(e) =>
                          updateArea("windows", parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coats & Waste */}
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/50 pt-6">
                <div>
                  <label className="section-label">Number of Coats</label>
                  <input
                    type="number"
                    className="input-field"
                    value={coats}
                    onChange={(e) =>
                      setCoats(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="section-label">Waste Margin (%)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={wasteMargin}
                    onChange={(e) =>
                      setWasteMargin(
                        Math.max(
                          0,
                          Math.min(100, parseFloat(e.target.value) || 0),
                        ),
                      )
                    }
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={compute}
                className="btn-primary btn-glow mt-6 w-full"
                disabled={loading}
              >
                Calculate Estimate
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
              {errors.area && (
                <p className="mt-2 text-center text-xs text-red-500">
                  {errors.area}
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-6">
            <ResultCard
              title={`${getFinishTypeLabel(result.finishType)} Estimate`}
              subtitle={`${formatNumber(result.area)} m² — ${result.coats} coat${result.coats > 1 ? "s" : ""} — ${result.wasteMargin}% waste`}
              stats={[
                {
                  label: "Surface Area",
                  value: `${formatNumber(result.area)} m²`,
                  highlight: true,
                },
                {
                  label: "Material Cost",
                  value: formatCurrency(result.materialCost, currencySymbol),
                },
                { label: "Labour", value: result.labourNote },
                {
                  label: "Materials",
                  value: `${result.materials.length} type${result.materials.length > 1 ? "s" : ""}`,
                },
              ]}
              grandTotal={result.totalCost}
              currencySymbol={currencySymbol}
              onSave={handleSave}
              onRecalculate={startOver}
            >
              <div className="mb-4 flex justify-center">
                <SaveToProjectButton
                  calculatorType="finish"
                  calculatorSlug="finish-estimator"
                  calcTitle={`Finish: ${formatNumber(result.area)} m²`}
                  calcData={
                    { ...areaInput, ...result } as Record<string, unknown>
                  }
                  resultSummary={
                    {
                      area: result.area,
                      coats: result.coats,
                      totalCost: result.totalCost,
                      materialCost: result.materialCost,
                    } as Record<string, unknown>
                  }
                  materials={result.materials.map((m) => ({
                    name: m.name,
                    category: "finish",
                    quantity: m.packagesNeeded,
                    unit: "packages",
                  }))}
                  compact
                  label="Save to Project Workspace"
                />
              </div>
              {/* Material Breakdown */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-bold text-foreground">
                  Material Breakdown
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Material</th>
                        <th className="pb-2 text-right font-medium">
                          Qty Needed
                        </th>
                        <th className="pb-2 text-right font-medium">
                          Packages
                        </th>
                        <th className="pb-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.materials.map((mat, i) => (
                        <tr
                          key={i}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-3">
                            <span className="font-medium text-foreground">
                              {mat.name}
                            </span>
                            {mat.isBase && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                Base
                              </span>
                            )}
                            {mat.isFinishing && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                Finishing
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {formatNumber(mat.quantityWithWaste)}{" "}
                            {mat.coverageUnit}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {mat.packagesNeeded} × {mat.packageSize}
                            {mat.packageUnit}
                          </td>
                          <td className="py-3 text-right font-medium text-foreground">
                            {formatCurrency(mat.cost, currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cost Summary */}
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Materials</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(result.materialCost, currencySymbol)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Labour</span>
                    <span className="font-semibold text-foreground">
                      {result.labourNote}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                    <span className="font-bold text-foreground">
                      Grand Total
                    </span>
                    <span className="font-bold text-brand-purple">
                      {formatCurrency(result.totalCost, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </ResultCard>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <p>Estimate saved to your projects. Find it in My Projects.</p>
              </div>
            )}

            {errors.save && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <p>{errors.save}</p>
              </div>
            )}

            <HowCalculatedSection
              methodologyText={(calcDefaults.howCalculatedText as string) || ""}
              assumptions={[
                {
                  label: "Finish type",
                  value: getFinishTypeLabel(result.finishType),
                },
                { label: "Coats", value: `${result.coats}` },
                { label: "Waste margin", value: `${result.wasteMargin}%` },
                {
                  label: "Surface area",
                  value: `${formatNumber(result.area)} m²`,
                },
              ]}
            />
            <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
            <ReportCalculationIssue
              calculatorType="finish"
              userInput={{
                finishType: result.finishType,
                coats: result.coats,
                wasteMargin: result.wasteMargin,
              }}
              actualResult={{
                area: result.area,
                materialCost: result.materialCost,
                totalCost: result.totalCost,
              }}
            />
          </div>
        )}

        {/* Empty state when no finish types from DB */}
        {!loading && !result && finishTypes.length === 0 && !loadError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">Using default finish parameters</p>
            <p className="mt-1 text-xs">
              No finish type data found in the database. Calculations will use
              built-in defaults. An administrator can add finish types in the
              admin panel.
            </p>
          </div>
        )}
      </div>
      {!embedded && (
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.paintCalculator,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.imageEstimator,
          ]}
        />
      )}
    </>
  );
}
