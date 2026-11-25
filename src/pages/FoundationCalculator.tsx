import CalculatorGuideBlock from "@/components/calculators/CalculatorGuideBlock";
import { foundationCalculatorGuide } from "@/content/calculator-guides/foundation-calculator";
import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import CopyResultsButton from "@/components/calculators/CopyResultsButton";
import { useState, useCallback } from "react";
import { useBuildingSize } from "@/lib/measurement/building-size-context";
import { singleRoomFootprint } from "@/lib/measurement/building-schedule";
import {} from "@/lib/seo";
import EngineerReviewBadge from "@/components/EngineerReviewBadge";
import {
  CalculatorSchematic,
  foundationExtentLabel,
} from "@/components/engineering/CalculatorSchematic";
import { useMarket } from "@/lib/international/market-context";
import {
  KPA_PER_PSF,
  KN_PER_KIP,
  KN_PER_M_PER_LB_PER_FT,
  LINE_LOAD_UNIT,
  POINT_LOAD_UNIT,
  PRESSURE_UNIT,
  type LoadUnitSystem,
  formatPressure,
  kpaToPsf,
  lineLoadToKnPerM,
  pointLoadToKn,
  pressureToKpa,
} from "@/lib/measurement/load-units";
import {
  designFoundation,
  SOIL_BEARING_CAPACITY,
  SOIL_DESCRIPTIONS,
  type FoundationDesignInput,
  type SoilType,
  type FoundationShape,
} from "@/lib/engineering/foundation-calculator";
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ChevronRight,
  ChevronDown,
  Building2,
  RotateCcw,
} from "lucide-react";
import MeasurementTip from "@/components/ui/MeasurementTip";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";
import { useCalculatorFeedback } from "@/hooks/useCalculatorFeedback";
import { missingField } from "@/lib/forms/missing-fields";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import {} from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import { NearbySuppliersLink } from "@/components/map/NearbySuppliersLink";
import AdSlot from "@/components/ui/AdSlot";
import { NumericInput } from "@/components/ui/NumericInput";

import { Link } from "react-router-dom";
import ToolShell from "@/components/tools/ToolShell";

function formatFoundationDimension(mm: number, unit: "m" | "ft"): string {
  if (unit === "m") return `${Math.round(mm)} mm`;
  const totalInches = mm / 25.4;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches - feet * 12) * 16) / 16;
  return `${feet}′ ${inches}″`;
}

function formatFoundationVolume(m3: number, unit: "m" | "ft"): string {
  return unit === "ft"
    ? `${(m3 * 35.3146667).toFixed(2)} ft³ (${(m3 * 1.30795062).toFixed(2)} yd³)`
    : `${m3} m³`;
}

export default function FoundationCalculator() {
  const resetInputs = () => {
    setShape("strip");
    setSoilType("lateritic");
    setCustomBearing(150);
    setWallLoad(40);
    setColumnLoad(200);
    setDepth(0.9);
    setWaterTableDepth(null);
    setBuildingLength(15);
    setBuildingWidth(10);
    setShowFormulas(false);
    setResult(null);
  };
  const {
    fieldsRef,
    resultsRef,
    missing,
    handleCalculate: calculateWithScroll,
    reportMissing,
  } = useCalculatorFeedback<HTMLDivElement>();
  const { t } = useLanguage();
  const { preferredLengthUnit, marketCode } = useMarket();

  const [shape, setShape] = useState<FoundationShape>("strip");
  const [soilType, setSoilType] = useState<SoilType>(() =>
    marketCode === "NG" || marketCode === "GH" ? "lateritic" : "firm_clay",
  );
  const [customBearing, setCustomBearing] = useState(150);
  const [wallLoad, setWallLoad] = useState(40);
  const [columnLoad, setColumnLoad] = useState(200);
  // Loads decide the footing, and a US or UK engineer works in plf and ksf.
  // The engine stays in kN and kPa; the conversion happens exactly here.
  const [loadSystem, setLoadSystem] = useState<LoadUnitSystem>(
    preferredLengthUnit === "feet" ? "imperial" : "metric",
  );
  const [depth, setDepth] = useState(0.9);
  const [waterTableDepth, setWaterTableDepth] = useState<number | null>(null);
  const { building } = useBuildingSize();
  const [footprintNote, setFootprintNote] = useState<string | null>(null);
  const [buildingLength, setBuildingLength] = useState(15);
  const [buildingWidth, setBuildingWidth] = useState(10);
  const [measurementUnit, setMeasurementUnit] = useState<"m" | "ft">(() =>
    preferredLengthUnit === "feet" ? "ft" : "m",
  );
  const [result, setResult] = useState<ReturnType<
    typeof designFoundation
  > | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const mPerFt = 0.3048;
    const waterDepthM =
      waterTableDepth !== null && waterTableDepth > 0
        ? measurementUnit === "ft"
          ? waterTableDepth * mPerFt
          : waterTableDepth
        : undefined;

    const input: FoundationDesignInput = {
      shape,
      soil_type: soilType,
      custom_bearing_capacity:
        soilType === "custom"
          ? pressureToKpa(customBearing, loadSystem)
          : undefined,
      wall_load: lineLoadToKnPerM(wallLoad, loadSystem),
      column_load:
        shape === "pad" ? pointLoadToKn(columnLoad, loadSystem) : undefined,
      foundation_depth: measurementUnit === "ft" ? depth * mPerFt : depth,
      bearing_method: waterDepthM !== undefined ? "terzaghi" : undefined,
      ground_water_depth_m: waterDepthM,
      concrete_grade: "C25",
      building_length:
        measurementUnit === "ft" ? buildingLength * mPerFt : buildingLength,
      building_width:
        measurementUnit === "ft" ? buildingWidth * mPerFt : buildingWidth,
    };
    setResult(
      monitoredCalc("Foundation Calculator", () => designFoundation(input)),
    );
  }, [
    shape,
    soilType,
    customBearing,
    wallLoad,
    columnLoad,
    depth,
    waterTableDepth,
    buildingLength,
    buildingWidth,
    measurementUnit,
    loadSystem,
  ]);

  if (!result) calculate();

  // The dimensions live in state and render as 0, so an untouched form looks
  // filled to the markup. Name what is missing before the engine divides by it.
  function runChecked() {
    const gaps = [
      buildingLength <= 0 && missingField("fnd-length", "Building length"),
      buildingWidth <= 0 && missingField("fnd-width", "Building width"),
      depth <= 0 && missingField("fnd-depth", "Foundation depth"),
      shape === "pad"
        ? columnLoad <= 0 && missingField("fnd-load", "Column load")
        : wallLoad <= 0 && missingField("fnd-load", "Wall load per metre"),
    ].filter((field): field is ReturnType<typeof missingField> =>
      Boolean(field),
    );
    if (gaps.length > 0) {
      reportMissing(gaps);
      return;
    }
    calculateWithScroll(calculate);
  }

  return (
    <ToolShell
      route="/foundation-calculator"
      hideDisclaimer
      methodologyLink={Boolean(result)}
    >
      <SubscriptionGate feature="foundation_calculator">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Building2 className="w-3.5 h-3.5" />
                Looking for Complete Material Takeoff & Bill of Quantities?
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For live localized material quantities (cement, sand, granite,
                blocks, formwork, hardcore) and market pricing across all 20
                international markets, use the canonical{" "}
                <strong>{t("Foundation Estimator")}</strong>.
              </p>
            </div>
            <Link
              to="/foundation"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              {t("Open Foundation Estimator")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Inputs */}
          <div
            ref={fieldsRef}
            className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card"
          >
            <div className="mb-5">
              <MeasurementTip what="measurement unit and foundation dimensions" />
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Measurement unit:
              </span>
              <div className="inline-flex rounded-lg border border-border overflow-hidden dark:border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (measurementUnit === "ft") {
                      setMeasurementUnit("m");
                      setDepth(parseFloat((depth * 0.3048).toFixed(2)));
                      setBuildingLength(
                        parseFloat((buildingLength * 0.3048).toFixed(2)),
                      );
                      setBuildingWidth(
                        parseFloat((buildingWidth * 0.3048).toFixed(2)),
                      );
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${measurementUnit === "m" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5"}`}
                >
                  m
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (measurementUnit === "m") {
                      setMeasurementUnit("ft");
                      setDepth(parseFloat((depth / 0.3048).toFixed(2)));
                      setBuildingLength(
                        parseFloat((buildingLength / 0.3048).toFixed(2)),
                      );
                      setBuildingWidth(
                        parseFloat((buildingWidth / 0.3048).toFixed(2)),
                      );
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${measurementUnit === "ft" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5"}`}
                >
                  ft
                </Button>
              </div>
              <span className="sm:ml-3 text-xs font-medium text-muted-foreground">
                Loads:
              </span>
              <div className="inline-flex rounded-lg border border-border overflow-hidden dark:border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (loadSystem === "imperial") {
                      setLoadSystem("metric");
                      setWallLoad(
                        parseFloat(
                          (wallLoad * KN_PER_M_PER_LB_PER_FT).toFixed(2),
                        ),
                      );
                      setColumnLoad(
                        parseFloat((columnLoad * KN_PER_KIP).toFixed(1)),
                      );
                      setCustomBearing(
                        parseFloat((customBearing * KPA_PER_PSF).toFixed(1)),
                      );
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${loadSystem === "metric" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5"}`}
                >
                  kN
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (loadSystem === "metric") {
                      setLoadSystem("imperial");
                      setWallLoad(
                        parseFloat(
                          (wallLoad / KN_PER_M_PER_LB_PER_FT).toFixed(0),
                        ),
                      );
                      setColumnLoad(
                        parseFloat((columnLoad / KN_PER_KIP).toFixed(1)),
                      );
                      setCustomBearing(
                        parseFloat((customBearing / KPA_PER_PSF).toFixed(0)),
                      );
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${loadSystem === "imperial" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5"}`}
                >
                  plf / kip
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="fnd-shape"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  {t("Foundation type")}
                </label>
                <select
                  id="fnd-shape"
                  value={shape}
                  onChange={(e) => setShape(e.target.value as FoundationShape)}
                  className="input-field"
                >
                  <option value="strip">{t("Strip Footing (walls)")}</option>
                  <option value="pad">{t("Pad Footing (columns)")}</option>
                  <option value="raft">{t("Raft Foundation")}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="fnd-soil"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  {t("Soil type")}
                </label>
                <select
                  id="fnd-soil"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value as SoilType)}
                  className="input-field"
                >
                  {(Object.keys(SOIL_BEARING_CAPACITY) as SoilType[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {soilType === "custom" && (
                <div>
                  <label
                    htmlFor="fnd-bearing"
                    className="text-xs font-medium text-muted-foreground mb-1.5 block"
                  >
                    Bearing capacity ({PRESSURE_UNIT[loadSystem]})
                  </label>
                  <NumericInput
                    id="fnd-bearing"
                    value={customBearing}
                    onValueChange={setCustomBearing}
                    className="input-field"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="fnd-load"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  {shape === "pad"
                    ? `Column load (${POINT_LOAD_UNIT[loadSystem]})`
                    : `Wall load (${LINE_LOAD_UNIT[loadSystem]})`}
                </label>
                <NumericInput
                  id="fnd-load"
                  value={shape === "pad" ? columnLoad : wallLoad}
                  onValueChange={(n) =>
                    shape === "pad" ? setColumnLoad(n) : setWallLoad(n)
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="fnd-depth"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Foundation depth ({measurementUnit})
                </label>
                <NumericInput
                  id="fnd-depth"
                  value={depth}
                  step={0.1}
                  onValueChange={setDepth}
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="fnd-water-depth"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Water table depth ({measurementUnit}, optional)
                </label>
                <NumericInput
                  id="fnd-water-depth"
                  value={waterTableDepth ?? 0}
                  step={0.1}
                  onValueChange={(val) =>
                    setWaterTableDepth(val > 0 ? val : null)
                  }
                  className="input-field"
                />
              </div>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      const footprint = singleRoomFootprint(building);
                      if ("reason" in footprint) {
                        setFootprintNote(footprint.reason);
                        return;
                      }
                      const perUnit = measurementUnit === "ft" ? 1 / 0.3048 : 1;
                      setBuildingLength(
                        parseFloat((footprint.lengthM * perUnit).toFixed(2)),
                      );
                      setBuildingWidth(
                        parseFloat((footprint.widthM * perUnit).toFixed(2)),
                      );
                      setFootprintNote(
                        `Length and width read from the measured building: ${footprint.lengthM.toFixed(2)} m x ${footprint.widthM.toFixed(2)} m.`,
                      );
                    }}
                  >
                    Use measured building
                  </Button>
                  {footprintNote && (
                    <span
                      role="status"
                      className="text-xs leading-snug text-muted-foreground"
                    >
                      {footprintNote}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="fnd-length"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Building length ({measurementUnit})
                </label>
                <NumericInput
                  id="fnd-length"
                  value={buildingLength}
                  step={0.5}
                  onValueChange={setBuildingLength}
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="fnd-width"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Building width ({measurementUnit})
                </label>
                <NumericInput
                  id="fnd-width"
                  value={buildingWidth}
                  step={0.5}
                  onValueChange={setBuildingWidth}
                  className="input-field"
                />
              </div>
            </div>

            {/* Soil description */}
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-start gap-3 dark:border-blue-500/20 dark:bg-blue-500/5">
              <Building2
                aria-hidden="true"
                className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
              />
              <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                {SOIL_DESCRIPTIONS[soilType]}
              </p>
            </div>

            <MissingFieldsNotice fields={missing} />
            <Button
              variant="default"
              onClick={runChecked}
              className="mt-5 btn-glow inline-flex items-center gap-2 px-6 py-3"
            >
              <Calculator aria-hidden="true" className="w-4 h-4" /> Calculate
              Foundation
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div ref={resultsRef} className="card-elevated p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand-purple" />
                  <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                    {t("Foundation Design Results")}
                  </h2>
                </div>
                <EngineerReviewBadge discipline="foundation" />
              </div>

              <div className="mb-6">
                <CalculatorResetButton onReset={resetInputs} className="mb-4" />
                <HowCalculatedSection
                  methodologyText={methodologyText("foundation")}
                  geometryBreakdown={{
                    volumeM3: result.concrete_volume,
                    dimensionsSummary: `${result.shape} footing`,
                  }}
                  physicalFactors={{
                    dryVolumeBulkingFactor: 1.54,
                  }}
                  packagingDetails={{
                    theoreticalAmount: result.concrete_volume,
                    practicalPurchaseAmount: result.concrete_volume,
                    unitLabel: "m³",
                    packSizeLabel: "Ready-mix / in-situ batch m³",
                  }}
                  assumptions={[
                    { label: "Design footing shape", value: result.shape },
                    {
                      label: "Concrete volume",
                      value: formatFoundationVolume(
                        Number(result.concrete_volume.toFixed(2)),
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Excavation volume",
                      value: formatFoundationVolume(
                        Number(result.excavation_volume.toFixed(2)),
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Blinding volume",
                      value: formatFoundationVolume(
                        Number(result.blinding_volume.toFixed(2)),
                        measurementUnit,
                      ),
                    },
                  ]}
                />
                <ShareEstimateButton
                  showPdf
                  estimate={{
                    kind: "Foundation Design",
                    title: `${result.shape} footing at ${formatPressure(result.bearing_capacity, loadSystem)}`,
                    summaryLines: [
                      {
                        label: "Footing shape",
                        value: result.shape,
                      },
                      {
                        label: "Recommended width",
                        value: formatFoundationDimension(
                          result.recommended_width,
                          measurementUnit,
                        ),
                      },
                      ...(result.recommended_length
                        ? [
                            {
                              label: "Recommended length",
                              value: formatFoundationDimension(
                                result.recommended_length ??
                                  result.recommended_width,
                                measurementUnit,
                              ),
                            },
                          ]
                        : []),
                      {
                        label: "Pad thickness",
                        value: formatFoundationDimension(
                          result.pad_thickness_mm ?? 0,
                          measurementUnit,
                        ),
                      },
                      {
                        label: "Bearing capacity",
                        value: formatPressure(
                          result.bearing_capacity,
                          loadSystem,
                        ),
                      },
                      {
                        label: "Applied pressure",
                        value: formatPressure(
                          result.applied_pressure,
                          loadSystem,
                        ),
                      },
                      {
                        label: "Bearing check",
                        value: result.bearing_check_pass
                          ? "Passes"
                          : "Needs review",
                      },
                    ],
                    lineItems: [
                      {
                        description: "Concrete volume",
                        quantity: formatFoundationVolume(
                          result.concrete_volume,
                          measurementUnit,
                        ),
                      },
                      {
                        description: "Blinding volume",
                        quantity: formatFoundationVolume(
                          result.blinding_volume,
                          measurementUnit,
                        ),
                      },
                      {
                        description: "Hardcore volume",
                        quantity: formatFoundationVolume(
                          result.hardcore_volume,
                          measurementUnit,
                        ),
                      },
                      {
                        description: "Excavation volume",
                        quantity: formatFoundationVolume(
                          result.excavation_volume,
                          measurementUnit,
                        ),
                      },
                    ],
                    totals: [
                      {
                        label: "Factor of safety",
                        value: String(result.factor_of_safety),
                        emphasized: true,
                      },
                    ],
                    notes: result.warnings,
                    link: "/foundation-calculator",
                  }}
                  compact
                />
              </div>
              <div className="mb-6">
                <CalculatorSchematic
                  kind="foundation"
                  shape={result.shape}
                  width={formatFoundationDimension(
                    result.recommended_width,
                    measurementUnit,
                  )}
                  length={foundationExtentLabel({
                    shape: result.shape,
                    unit: measurementUnit,
                    length: buildingLength,
                    width: buildingWidth,
                    padWidthMm: result.recommended_width,
                    padLengthMm: result.recommended_length ?? undefined,
                  })}
                  depth={`${depth} ${measurementUnit}`}
                  bearing={`${loadSystem === "imperial" ? Math.round(kpaToPsf(result.bearing_capacity)) : result.bearing_capacity}`}
                  pressure={`${loadSystem === "imperial" ? Math.round(kpaToPsf(result.applied_pressure)) : result.applied_pressure}`}
                  pressureUnit={PRESSURE_UNIT[loadSystem]}
                />
              </div>

              {/* Key results, premium stat cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {result.shape !== "raft" && (
                  <div className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 dark:border-brand-purple/30">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <p className="relative text-xs font-medium text-muted-foreground mb-1.5">
                      {result.shape === "pad" ? "Pad Size" : "Footing Width"}
                    </p>
                    <p className="relative text-2xl font-bold text-foreground dark:text-primary-foreground">
                      {result.shape === "pad"
                        ? `${formatFoundationDimension(result.recommended_width, measurementUnit)} × ${formatFoundationDimension(result.recommended_length ?? result.recommended_width, measurementUnit)}`
                        : `${formatFoundationDimension(result.recommended_width, measurementUnit)}`}
                    </p>
                  </div>
                )}
                <div className="rounded-2xl border border-border/80 bg-muted/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {t("Allowable Bearing")}
                  </p>
                  <p className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                    {result.bearing_capacity}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      kN/m²
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {t("Factor of Safety")}
                  </p>
                  <p className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                    {result.factor_of_safety}
                  </p>
                </div>
              </div>

              {/* Bearing check */}
              <div
                className={`flex items-center gap-3 rounded-xl p-4 mb-6 ${result.bearing_check_pass ? "bg-emerald-50 dark:bg-emerald-500/5" : "bg-red-50 dark:bg-red-500/5"}`}
              >
                {result.bearing_check_pass ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-5 h-5 text-emerald-500 shrink-0"
                  />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("Bearing Capacity Check")}
                  </p>
                  <p className="text-sm text-foreground dark:text-primary-foreground">
                    Applied:{" "}
                    {formatPressure(result.applied_pressure, loadSystem)} ≤
                    Allowable:{" "}
                    {formatPressure(result.bearing_capacity, loadSystem)}
                  </p>
                </div>
              </div>

              {/* Volumes */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  {
                    label: "Excavation",
                    value: formatFoundationVolume(
                      result.excavation_volume,
                      measurementUnit,
                    ),
                  },
                  {
                    label: "Concrete",
                    value: formatFoundationVolume(
                      result.concrete_volume,
                      measurementUnit,
                    ),
                  },
                  {
                    label: "Blinding",
                    value: formatFoundationVolume(
                      result.blinding_volume,
                      measurementUnit,
                    ),
                  },
                  {
                    label: "Hardcore",
                    value: formatFoundationVolume(
                      result.hardcore_volume,
                      measurementUnit,
                    ),
                  },
                  ...(result.pad_thickness_mm
                    ? [
                        {
                          label: "Pad depth",
                          value: `${result.pad_thickness_mm} mm (sized to punching shear)`,
                        },
                      ]
                    : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/80 bg-card p-4 dark:border-white/10 dark:bg-card"
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    ⚠️ Warnings
                  </p>
                  <ul className="space-y-1.5">
                    {result.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-amber-600 dark:text-amber-400"
                      >
                        • {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Geotechnical & COREN Audit Sheet */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-6 dark:border-white/10 dark:bg-card">
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      {t("Geotechnical & COREN Engineering Audit")}
                    </h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    BS 8004 / Eurocode 7 / NBC Part 7
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                    <span className="text-xs text-muted-foreground block mb-1">
                      {t("Recommended Foundation System")}
                    </span>
                    <span className="text-sm font-bold uppercase text-foreground">
                      {result.recommended_foundation_type || result.shape}{" "}
                      Footing
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                    <span className="text-xs text-muted-foreground block mb-1">
                      {t("Recommended Concrete Grade")}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {result.recommended_concrete_grade || "C25/30"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                    <span className="text-xs text-muted-foreground block mb-1">
                      {t("Water Table Risk")}
                    </span>
                    <span className="text-sm font-bold capitalize text-foreground">
                      {result.water_table_classification?.replace(/_/g, " ") ||
                        "Standard"}
                    </span>
                  </div>
                </div>

                {result.geotechnical_advisory && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 mb-4 text-xs leading-relaxed text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {t("Geotechnical Advisory Notice")}:
                    </p>
                    {result.geotechnical_advisory}
                  </div>
                )}

                {result.coren_audit_sheet && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
                    <p className="font-semibold text-foreground mb-2">
                      {t("Code Verification & Sign-Off Record")}:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-muted-foreground">
                      <div>
                        <strong className="text-foreground">
                          {t("Governing Code")}:
                        </strong>{" "}
                        {result.coren_audit_sheet.governing_code}
                      </div>
                      <div>
                        <strong className="text-foreground">
                          {t("Geotechnical Summary")}:
                        </strong>{" "}
                        {result.coren_audit_sheet.geotechnical_summary}
                      </div>
                      <div>
                        <strong className="text-foreground">
                          {t("Applied vs. Allowable")}:
                        </strong>{" "}
                        {result.coren_audit_sheet.applied_pressure_kpa} kPa ≤{" "}
                        {
                          result.coren_audit_sheet
                            .bearing_capacity_allowable_kpa
                        }{" "}
                        kPa
                      </div>
                      <div>
                        <strong className="text-foreground">
                          {t("Safety Factor")}:
                        </strong>{" "}
                        {result.coren_audit_sheet.factor_of_safety} (
                        {result.bearing_check_pass ? "PASS" : "FAIL"})
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                      {result.coren_audit_sheet.coren_endorsement_placeholder}
                    </p>
                  </div>
                )}
              </div>

              {/* Formula transparency */}
              <div className="mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark flex items-center gap-1.5 transition-colors"
                >
                  {showFormulas ? (
                    <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {showFormulas ? "Hide" : "Show"} calculation formulas
                </Button>
                {showFormulas && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-background p-5 dark:bg-black/40">
                    {result.formula_transparency.map((f, i) => (
                      <p
                        key={i}
                        className="text-xs font-mono text-emerald-400 leading-relaxed"
                      >
                        {f}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset */}
              <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5 dark:border-white/5">
                <Button
                  variant="ghost"
                  onClick={() => setResult(null)}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  {t("Reset")}
                </Button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  {t("Geotechnical Disclaimer")}
                </p>
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 mt-1.5">
                  Soil capacities shown are generic assumptions, not site test
                  results. These simplified calculations do not implement or
                  certify compliance with BS 8004 or any jurisdiction-specific
                  foundation code. They are for preliminary screening and
                  budgeting only. A geotechnical investigation and independent
                  design by a locally licensed geotechnical/structural
                  professional are required before foundation selection,
                  approval, or construction.
                </p>
              </div>
            </div>
          </div>
          {result && (
            <div className="mt-6 flex flex-wrap items-start justify-center gap-3">
              <CopyResultsButton
                block={{
                  title: "Foundation estimate",
                  lines: [
                    { label: "Footing shape", value: result.shape },
                    {
                      label: "Recommended width",
                      value: formatFoundationDimension(
                        result.recommended_width,
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Bearing capacity used",
                      value: formatPressure(
                        result.bearing_capacity,
                        loadSystem,
                      ),
                    },
                    {
                      label: "Excavation",
                      value: formatFoundationVolume(
                        result.excavation_volume,
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Blinding",
                      value: formatFoundationVolume(
                        result.blinding_volume,
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Concrete",
                      value: formatFoundationVolume(
                        result.concrete_volume,
                        measurementUnit,
                      ),
                    },
                    {
                      label: "Hardcore",
                      value: formatFoundationVolume(
                        result.hardcore_volume,
                        measurementUnit,
                      ),
                    },
                  ],
                  note: "Preliminary sizing only. Soil capacity is a generic assumption, not a site test result.",
                  sourceUrl:
                    typeof window === "undefined"
                      ? undefined
                      : window.location.href,
                }}
              />
              <SaveToProjectButton
                calculatorType="foundation"
                calculatorSlug="foundation-calculator"
                calcTitle={`Foundation: ${result.shape} (${formatFoundationDimension(result.recommended_width, measurementUnit)})`}
                calcData={result}
                resultSummary={{
                  shape: result.shape,
                  recommended_width: result.recommended_width,
                  bearing_capacity: result.bearing_capacity,
                  factor_of_safety: result.factor_of_safety,
                  concrete_volume: result.concrete_volume,
                  excavation_volume: result.excavation_volume,
                  blinding_volume: result.blinding_volume,
                  hardcore_volume: result.hardcore_volume,
                  bearing_check_pass: result.bearing_check_pass,
                }}
                compact
                label="Save to Project Workspace"
              />
              <NearbySuppliersLink material="foundation concrete" />
            </div>
          )}
        </div>
        {/* Ad slot, placement "calculator_mid" */}
        <RecommendedProducts category="cement" />

        <CalculatorGuideBlock guide={foundationCalculatorGuide} />

        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </SubscriptionGate>
    </ToolShell>
  );
}
