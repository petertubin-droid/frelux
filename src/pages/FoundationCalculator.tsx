import {} from "@/components/calculators";
import { useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
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
import PageHeader from "@/components/ui/PageHeader";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { monitoredCalc } from "@/lib/calculator-monitor";

export default function FoundationCalculator() {
  useSeo({
    title: "Foundation Design Calculator | FRELUX",
    description:
      "Calculate strip, pad, and raft foundation sizes based on soil bearing capacity. Nigerian soil types with BS 8004 simplified methods.",
    keywords:
      "foundation calculator, strip footing, pad footing, raft foundation, soil bearing capacity Nigeria",
  });

  const [shape, setShape] = useState<FoundationShape>("strip");
  const [soilType, setSoilType] = useState<SoilType>("lateritic");
  const [customBearing, setCustomBearing] = useState(150);
  const [wallLoad, setWallLoad] = useState(40);
  const [columnLoad, setColumnLoad] = useState(200);
  const [depth, setDepth] = useState(0.9);
  const [buildingLength, setBuildingLength] = useState(15);
  const [buildingWidth, setBuildingWidth] = useState(10);
  const [measurementUnit, setMeasurementUnit] = useState<"m" | "ft">("m");
  const [result, setResult] = useState<ReturnType<
    typeof designFoundation
  > | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const mPerFt = 0.3048;
    const input: FoundationDesignInput = {
      shape,
      soil_type: soilType,
      custom_bearing_capacity:
        soilType === "custom" ? customBearing : undefined,
      wall_load: wallLoad,
      column_load: shape === "pad" ? columnLoad : undefined,
      foundation_depth: measurementUnit === "ft" ? depth * mPerFt : depth,
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
    buildingLength,
    buildingWidth,
    measurementUnit,
  ]);

  if (!result) calculate();

  return (
    <SubscriptionGate feature="foundation_calculator">
      <PageHeader
        eyebrow="Engineering Tool"
        title="Foundation Design Calculator"
        subtitle="Strip, pad, and raft foundation sizing based on soil bearing capacity. BS 8004 simplified method."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Calculators", path: "/calculators" },
          { label: "Foundation Designer" },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6">
        {/* Inputs */}
        <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">
              Measurement unit:
            </span>
            <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden dark:border-white/10">
              <button
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
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${measurementUnit === "m" ? "bg-brand-purple text-white" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5"}`}
              >
                m
              </button>
              <button
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
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${measurementUnit === "ft" ? "bg-brand-purple text-white" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5"}`}
              >
                ft
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Foundation type
              </label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as FoundationShape)}
                className="input-field"
              >
                <option value="strip">Strip Footing (walls)</option>
                <option value="pad">Pad Footing (columns)</option>
                <option value="raft">Raft Foundation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Soil type
              </label>
              <select
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
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                  Bearing capacity (kN/m²)
                </label>
                <input
                  type="number"
                  value={customBearing}
                  onChange={(e) =>
                    setCustomBearing(parseFloat(e.target.value) || 0)
                  }
                  className="input-field"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                {shape === "pad" ? "Column load (kN)" : "Wall load (kN/m)"}
              </label>
              <input
                type="number"
                value={shape === "pad" ? columnLoad : wallLoad}
                onChange={(e) =>
                  shape === "pad"
                    ? setColumnLoad(parseFloat(e.target.value) || 0)
                    : setWallLoad(parseFloat(e.target.value) || 0)
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Foundation depth ({measurementUnit})
              </label>
              <input
                type="number"
                value={depth}
                step="0.1"
                onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Building length ({measurementUnit})
              </label>
              <input
                type="number"
                value={buildingLength}
                step="0.5"
                onChange={(e) =>
                  setBuildingLength(parseFloat(e.target.value) || 0)
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Building width ({measurementUnit})
              </label>
              <input
                type="number"
                value={buildingWidth}
                step="0.5"
                onChange={(e) =>
                  setBuildingWidth(parseFloat(e.target.value) || 0)
                }
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

          <button
            onClick={calculate}
            className="mt-5 btn-primary btn-glow inline-flex items-center gap-2 px-6 py-3"
          >
            <Calculator aria-hidden="true" className="w-4 h-4" /> Calculate
            Foundation
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="card-elevated p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-purple" />
              <h2 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                Foundation Design Results
              </h2>
            </div>

            {/* Key results — premium stat cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {result.shape !== "raft" && (
                <div className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-purple/10 p-5 dark:border-brand-purple/30">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-purple/10 blur-2xl" />
                  <p className="relative text-xs font-medium text-neutral-500 mb-1.5">
                    {result.shape === "pad" ? "Pad Size" : "Footing Width"}
                  </p>
                  <p className="relative text-2xl font-bold text-brand-navy dark:text-white">
                    {result.shape === "pad"
                      ? `${result.recommended_width} × ${result.recommended_length}`
                      : `${result.recommended_width}`}
                    <span className="text-sm font-normal text-neutral-400 ml-1">mm</span>
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-neutral-500 mb-1.5">
                  Allowable Bearing
                </p>
                <p className="text-2xl font-bold text-brand-navy dark:text-white">
                  {result.bearing_capacity}
                  <span className="text-sm font-normal text-neutral-400 ml-1">kN/m²</span>
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-neutral-500 mb-1.5">
                  Factor of Safety
                </p>
                <p className="text-2xl font-bold text-brand-navy dark:text-white">
                  {result.factor_of_safety}
                </p>
              </div>
            </div>

            {/* Bearing check */}
            <div className={`flex items-center gap-3 rounded-xl p-4 mb-6 ${result.bearing_check_pass ? "bg-emerald-50 dark:bg-emerald-500/5" : "bg-red-50 dark:bg-red-500/5"}`}>
              {result.bearing_check_pass ? (
                <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Bearing Capacity Check
                </p>
                <p className="text-sm text-neutral-900 dark:text-white">
                  Applied: {result.applied_pressure} kN/m² ≤ Allowable:{" "}
                  {result.bearing_capacity} kN/m²
                </p>
              </div>
            </div>

            {/* Volumes */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Excavation", value: `${result.excavation_volume} m³` },
                { label: "Concrete", value: `${result.concrete_volume} m³` },
                { label: "Blinding", value: `${result.blinding_volume} m³` },
                { label: "Hardcore", value: `${result.hardcore_volume} m³` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/10 dark:bg-brand-navy-mid">
                  <p className="text-xs font-medium text-neutral-400 mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">{item.value}</p>
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
                    <li key={i} className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formula transparency */}
            <div className="mt-2">
              <button
                onClick={() => setShowFormulas(!showFormulas)}
                className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark flex items-center gap-1.5 transition-colors"
              >
                {showFormulas ? (
                  <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                {showFormulas ? "Hide" : "Show"} calculation formulas
              </button>
              {showFormulas && (
                <div className="mt-3 overflow-hidden rounded-xl bg-neutral-900 p-5 dark:bg-black/40">
                  {result.formula_transparency.map((f, i) => (
                    <p key={i} className="text-xs font-mono text-emerald-400 leading-relaxed">
                      {f}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Reset */}
            <div className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-5 dark:border-white/5">
              <button
                onClick={() => setResult(null)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Geotechnical Disclaimer
              </p>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 mt-1.5">
                Soil bearing capacities shown are typical values for Nigerian
                soil types. A geotechnical investigation (soil test) is
                mandatory for actual foundation design. These calculations are
                for preliminary sizing and budgetary purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
      <RelatedTools
        links={[
          CALC_LINKS.structuralCalc,
          CALC_LINKS.buildToRoof,
          CALC_LINKS.constructionSeq,
          CALC_LINKS.imageEstimator,
          CALC_LINKS.buildToRoof,
        ]}
      />
      <RelatedToolsLinks />
    </SubscriptionGate>
  );
}
