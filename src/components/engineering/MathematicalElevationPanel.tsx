// =========================================================
// FRELUX DETERMINISTIC MATHEMATICAL PLAN ELEVATION PANEL
// Architectural Mathematics & Hand Calculation Interface
//
// Dual capability:
// 1. Direct mathematical dimension & angle elevation
// 2. Configurable geometry and planning screens (not code verification)
// 3. Indicative 3D geometry and 4D/5D schedule
// =========================================================

import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  Ruler,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
  SOIL_CAPACITIES_KPA,
  type PlanElevationInput,
  type MathematicalElevationResult,
  type SoilTypeKey,
} from "@/lib/engineering/mathematical-elevation-engine";
import { MathematicalElevationDiagram } from "./MathematicalElevationDiagram";
import PlanImportPanel from "./PlanImportPanel";
import {
  ElevationQuickStart,
  type ElevationPreset,
} from "./ElevationQuickStart";
import { ElevationGlance } from "./ElevationGlance";
import type { BuildToRoofInput } from "@/types/build-to-roof";
import { downloadCsv } from "@/lib/export-utils";
import {
  planExits,
  planQuantitiesFromResult,
  storePlanHandoff,
} from "@/lib/plan-vision/elevation-bridge";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  ELEVATION_CSV_COLUMNS,
  ELEVATION_CSV_FILENAME,
  buildElevationCsvRows,
  buildElevationSummaryText,
  formatMeasure,
  formatNumber,
  formatNumber as formatFigure,
  lengthForDisplay,
  lengthFromDisplay,
  lengthStep,
  lengthUnitLabel,
  type ElevationUnitSystem,
} from "@/lib/engineering/elevation-units";

interface MathematicalElevationPanelProps {
  onApplyDerivedInput?: (patch: Partial<BuildToRoofInput>) => void;
  /** Router-driven navigation for the "carry these figures across" row. */
  onOpenTool?: (path: string, state: Record<string, unknown>) => void;
  onApplyDerivedInputState?: never;
  className?: string;
}

export function MathematicalElevationPanel({
  onApplyDerivedInput,
  onOpenTool,
  className = "",
}: MathematicalElevationPanelProps) {
  // Input parameters state
  const [params, setParams] = useState<PlanElevationInput>(DEFAULT_PLAN_INPUT);
  const [selectedSoilType, setSelectedSoilType] = useState<SoilTypeKey>(
    DEFAULT_PLAN_INPUT.soil_type,
  );
  const [showAdvancedMath, setShowAdvancedMath] = useState<boolean>(false);
  // Staged form: the page opens on the building itself and reveals the
  // assumptions only when a reader asks for them.
  const [detailStageOpen, setDetailStageOpen] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [currencyCode, setCurrencyCode] = useState("");
  const [unitRates, setUnitRates] = useState<Record<string, number>>({});
  const [planOrigin, setPlanOrigin] = useState<"plan" | "derived" | null>(null);
  const [unitSystem, setUnitSystem] = useState<ElevationUnitSystem>("metric");
  const [summaryCopied, setSummaryCopied] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string | null>("bungalow-3");

  // Re-calculate deterministically whenever params change
  const elevationResult = useMemo<MathematicalElevationResult>(() => {
    return calculateMathematicalElevation(params);
  }, [params]);

  const quantities = useMemo(
    () => planQuantitiesFromResult(elevationResult),
    [elevationResult],
  );

  /**
   * A plan read lands here. Values replace the matching manual fields; the
   * engine recomputes from them on the next render, so there is a single
   * calculation path whether the numbers were typed or read.
   */
  const handlePlanApply = (
    patch: Partial<PlanElevationInput>,
    origin: "plan" | "derived",
  ) => {
    setParams((prev) => ({ ...prev, ...patch }));
    setActivePreset(null);
    setPlanOrigin(origin);
    setAppliedSuccess(false);
    storePlanHandoff({
      quantities,
      elevationPatch: { ...params, ...patch },
      source: origin === "plan" ? "plan_import" : "plan_import",
      createdAt: new Date().toISOString(),
    });
  };

  const handoffExits = useMemo(
    () => planExits(quantities, params),
    [quantities, params],
  );

  // Display helpers. The engine is always fed metres; only the fields the user
  // sees change with the unit toggle.
  const showLength = (metres: number) =>
    Number(lengthForDisplay(metres, unitSystem).toFixed(2));
  const readLength = (typed: number) => lengthFromDisplay(typed, unitSystem);
  const lengthLabel = lengthUnitLabel(unitSystem);
  const measure = (value: number, unit: string, decimals = 2) =>
    formatMeasure(value, unit, unitSystem, decimals).text;
  const csvRows = useMemo(
    () =>
      buildElevationCsvRows(
        elevationResult,
        unitSystem,
        unitRates,
        currencyCode,
      ),
    [elevationResult, unitSystem, unitRates, currencyCode],
  );

  const handleExportCsv = () => {
    downloadCsv(ELEVATION_CSV_FILENAME, csvRows, ELEVATION_CSV_COLUMNS);
  };

  const handleCopySummary = async () => {
    const text = buildElevationSummaryText(elevationResult, unitSystem);
    try {
      await navigator.clipboard.writeText(text);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 3000);
    } catch {
      // Clipboard access can be refused; the summary stays visible on screen,
      // so the reader is never told a copy happened when it did not.
      setSummaryCopied(false);
    }
  };

  // Handlers for dimension adjustments
  const handleNumberChange = (field: keyof PlanElevationInput, val: number) => {
    setParams((prev) => ({
      ...prev,
      [field]: Math.max(0.1, val),
    }));
    setAppliedSuccess(false);
  };

  const handleSoilSelect = (soilKey: SoilTypeKey) => {
    setSelectedSoilType(soilKey);
    const capacity = SOIL_CAPACITIES_KPA[soilKey];
    setParams((prev) => ({
      ...prev,
      soil_type: soilKey,
      soil_bearing_capacity_kpa: capacity,
    }));
  };

  const updateOpening = (
    id: string,
    patch: Partial<PlanElevationInput["openings"][number]>,
  ) => {
    setParams((prev) => ({
      ...prev,
      openings: prev.openings.map((opening) =>
        opening.id === id ? { ...opening, ...patch } : opening,
      ),
    }));
  };

  const addOpening = () => {
    setParams((prev) => ({
      ...prev,
      openings: [
        ...prev.openings,
        {
          id: `opening-${Date.now()}`,
          type: "window",
          width: 1,
          height: 1,
          count: 1,
          wall_side: "front",
          label: "New opening",
        },
      ],
    }));
  };

  const handleApply = () => {
    if (onApplyDerivedInput) {
      onApplyDerivedInput(elevationResult.derived_patch);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3500);
    }
  };

  const { levels, discrepancies } = elevationResult;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Top Badge / Intro Header ── */}
      <div className="p-4 rounded-2xl bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-purple/20 text-brand-purple flex items-center justify-center shrink-0 mt-0.5">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Mathematical Elevation Engine (Pure Hand Mathematics)
              </h2>
              <Badge className="bg-brand-purple text-white text-xs hover:bg-brand-purple">
                No AI Required
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Builds an elevation from dimensions you type or confirm from a
              plan, using deterministic geometry, simplified quantity
              assumptions and an illustrative wind screen. It does not scale a
              drawing, and it does not verify building-regulations compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            {appliedSuccess ? "Applied to Estimate!" : "Apply to Build-to-Roof"}
          </Button>
        </div>
      </div>

      <div
        role="note"
        className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200"
      >
        <strong>Planning illustration only.</strong> Dimensions come from your
        own fields or from a plan you confirmed; nothing else is inferred. This
        tool does not verify site conditions, establish code compliance, or
        produce structural design. Load, wind, soil, material, and duration
        values are simplified assumptions and must not be used for construction
        decisions. Obtain site-specific review from appropriately licensed local
        professionals.
      </div>

      {/* Plan import: reads the dimensions a drawing states, then hands the
          confirmed values to the same maths engine the manual fields use. */}
      <PlanImportPanel onApply={handlePlanApply} />

      {planOrigin && (
        <p className="px-1 text-[11px] text-muted-foreground">
          {planOrigin === "derived"
            ? "Dimensions derived from the room schedule. Adjust any field; every figure recalculates from the engine's own maths."
            : "Dimensions read from the uploaded drawing. Adjust any field; every figure recalculates from the engine's own maths."}
        </p>
      )}

      {/* ── Main Interactive 3D / 5D Diagram ── */}
      <MathematicalElevationDiagram
        result={elevationResult}
        unitRates={unitRates}
        currencyCode={currencyCode.trim().toUpperCase()}
        onApplyToEstimate={handleApply}
      />
      <section
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
        aria-label="Carry these figures into another estimator"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Carry these figures into another estimator
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            These areas come from the calculation above. Send them across
            instead of retyping: {quantities.floorAreaM2} m² floor,{" "}
            {quantities.paintAreaM2} m² paintable, {quantities.roofAreaM2} m²
            roof over {quantities.storeys}{" "}
            {quantities.storeys === 1 ? "storey" : "storeys"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {handoffExits.map((exit) => (
            <Button
              key={exit.id}
              type="button"
              variant="outline"
              onClick={() => {
                storePlanHandoff({
                  quantities,
                  elevationPatch: params,
                  source: planOrigin ? "plan_import" : "manual_dimensions",
                  createdAt: new Date().toISOString(),
                });
                onOpenTool?.(exit.path, exit.state);
              }}
              className="h-auto flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left text-xs"
            >
              <span className="font-semibold">{exit.label}</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {exit.carries}
              </span>
            </Button>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground px-1">
        The schematic and its dimension callouts are drawn in metres regardless
        of the unit choice. Fields, the schedule cards, the summary and the CSV
        export follow the unit you select, and every figure is computed in SI
        before display.
      </p>

      <nav
        aria-label="Calculation stages"
        className="rounded-2xl border border-border bg-card/80 p-2 backdrop-blur-sm"
      >
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            {
              step: 1,
              label: "The building",
              detail: "Type or plan, plus four measurements",
              open: true,
            },
            {
              step: 2,
              label: "Roof, walls and openings",
              detail: `${params.roof_pitch_deg}° ${params.roof_type} · ${showLength(params.wall_thickness)} ${lengthLabel} walls · ${params.openings.length} opening${params.openings.length === 1 ? "" : "s"}`,
              open: detailStageOpen,
            },
            {
              step: 3,
              label: "Site, soil and wind",
              detail: "Optional assumptions behind the screen",
              open: showAdvancedMath,
            },
          ].map((item) => (
            <li key={item.step}>
              <button
                type="button"
                aria-expanded={item.open}
                aria-current={item.open ? "step" : undefined}
                onClick={() => {
                  if (item.step === 2) {
                    setDetailStageOpen(true);
                    document
                      .getElementById("stage-details")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else if (item.step === 3) {
                    setShowAdvancedMath(true);
                    document
                      .getElementById("stage-details")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    document
                      .getElementById("stage-building")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                  item.open
                    ? "border-brand-purple/40 bg-brand-purple/10"
                    : "border-border bg-background/60 hover:border-brand-purple/30"
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-[11px] font-mono text-brand-purple">
                    {item.step}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {item.label}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {item.detail}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div id="stage-building" className="scroll-mt-24">
        <ElevationQuickStart
          displayLength={showLength(params.building_length)}
          displayWidth={showLength(params.building_width)}
          displayFloorHeight={showLength(params.floor_to_floor_height)}
          storeys={params.storeys}
          pitchDeg={params.roof_pitch_deg}
          unitLabel={lengthLabel}
          lengthStep={lengthStep(unitSystem, 0.1)}
          activePreset={activePreset}
          onPreset={(preset: ElevationPreset) => {
            setActivePreset(preset.id);
            setParams((current) => ({ ...current, ...preset.patch }));
          }}
          onLength={(key, displayed) => {
            setActivePreset(null);
            setParams((current) => ({
              ...current,
              [key]: readLength(displayed),
            }));
          }}
          onStoreys={(storeys) => {
            setActivePreset(null);
            setParams((current) => ({ ...current, storeys }));
          }}
          onPitch={(deg) => {
            setActivePreset(null);
            setParams((current) => ({ ...current, roof_pitch_deg: deg }));
          }}
        />
      </div>

      <div id="elevation-results" className="scroll-mt-24 space-y-6">
        <ElevationGlance result={elevationResult} unitSystem={unitSystem} />

        {/* ── Geometry and assumption screening ── */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-purple" />
              <h3 className="text-sm font-semibold text-foreground">
                Checks we ran for you
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {discrepancies.length === 0
                ? "No configured flags"
                : `${discrepancies.length} screening flag${discrepancies.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {discrepancies.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                No configured screening flags were triggered. This is not a
                code-compliance determination, structural design, or substitute
                for site-specific professional review.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {discrepancies.map((disc) => (
                <div
                  key={disc.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    disc.severity === "critical"
                      ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {disc.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase ${
                          disc.severity === "critical"
                            ? "border-red-500/40 text-red-500"
                            : "border-amber-500/40 text-amber-500"
                        }`}
                      >
                        Planning screen
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {disc.mathematical_proof}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] pt-1 font-mono">
                      <span>
                        Observed: <strong>{disc.detected_value}</strong>
                      </span>
                      <span>
                        Required: <strong>{disc.permissible_threshold}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground font-medium pt-0.5">
                      → Recommendation: {disc.recommended_fix}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mathematical Parameter Controls (stage two of three) ── */}
        <div
          id="stage-details"
          className="rounded-2xl border border-border bg-card p-5 space-y-4 scroll-mt-24"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-brand-purple" />
              <h3 className="text-sm font-semibold text-foreground">
                Fine-tune the dimensions
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div
                role="group"
                aria-label="Dimension unit system"
                className="flex items-center rounded-lg border border-border p-0.5"
              >
                {(["metric", "imperial"] as ElevationUnitSystem[]).map(
                  (system) => (
                    <Button
                      key={system}
                      size="sm"
                      variant={unitSystem === system ? "default" : "ghost"}
                      aria-pressed={unitSystem === system}
                      onClick={() => setUnitSystem(system)}
                      className={`h-6 px-2 text-[11px] ${unitSystem === system ? "bg-brand-purple hover:bg-brand-purple-dark text-white" : "text-muted-foreground"}`}
                    >
                      {system === "metric" ? "Metric" : "Imperial"}
                    </Button>
                  ),
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdvancedMath(!showAdvancedMath)}
                className="text-xs h-7 gap-1 text-muted-foreground"
              >
                {showAdvancedMath
                  ? "Simple View"
                  : "Site, soil and wind (optional)"}
                {showAdvancedMath ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {!detailStageOpen && (
            <button
              type="button"
              onClick={() => setDetailStageOpen(true)}
              className="w-full rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-brand-purple/40 hover:text-foreground"
            >
              Step 2 of 3 · Set the roof pitch, wall thickness, bearing value
              and openings. Skip it if the defaults suit you.
            </button>
          )}

          {detailStageOpen && (
            <>
              {/* Primary Input Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Building Length ({lengthLabel})
                  </Label>
                  <Input
                    type="number"
                    step={lengthStep(unitSystem, 0.1)}
                    value={showLength(params.building_length)}
                    onChange={(e) =>
                      handleNumberChange(
                        "building_length",
                        readLength(Number(e.target.value)),
                      )
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Building Width ({lengthLabel})
                  </Label>
                  <Input
                    type="number"
                    step={lengthStep(unitSystem, 0.1)}
                    value={showLength(params.building_width)}
                    onChange={(e) =>
                      handleNumberChange(
                        "building_width",
                        readLength(Number(e.target.value)),
                      )
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Storeys (Floors)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={params.storeys}
                    onChange={(e) =>
                      handleNumberChange("storeys", Number(e.target.value))
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Floor Height ({lengthLabel})
                  </Label>
                  <Input
                    type="number"
                    step={lengthStep(unitSystem, 0.05)}
                    value={showLength(params.floor_to_floor_height)}
                    onChange={(e) =>
                      handleNumberChange(
                        "floor_to_floor_height",
                        readLength(Number(e.target.value)),
                      )
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Secondary Roof & Structural Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Roof Pitch Angle θ (°)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="5"
                    max="60"
                    value={params.roof_pitch_deg}
                    onChange={(e) =>
                      handleNumberChange(
                        "roof_pitch_deg",
                        Number(e.target.value),
                      )
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Roof Overhang Eaves ({lengthLabel})
                  </Label>
                  <Input
                    type="number"
                    step={lengthStep(unitSystem, 0.05)}
                    value={showLength(params.roof_overhang)}
                    onChange={(e) =>
                      handleNumberChange(
                        "roof_overhang",
                        readLength(Number(e.target.value)),
                      )
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Roof Pitch Style
                  </Label>
                  <Select
                    value={params.roof_type}
                    onValueChange={(val: "gable" | "hip") =>
                      setParams((prev) => ({ ...prev, roof_type: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gable">
                        Gable Roof (2 Slopes)
                      </SelectItem>
                      <SelectItem value="hip">Hip Roof (4 Slopes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Bearing value (assumption)
                  </Label>
                  <Select
                    value={selectedSoilType}
                    onValueChange={(value) =>
                      handleSoilSelect(value as SoilTypeKey)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laterite">
                        Laterite (assumed 150 kPa)
                      </SelectItem>
                      <SelectItem value="sandy_clay">
                        Sandy clay (assumed 120 kPa)
                      </SelectItem>
                      <SelectItem value="firm_clay">
                        Firm clay (assumed 100 kPa)
                      </SelectItem>
                      <SelectItem value="dense_sand">
                        Dense sand (assumed 250 kPa)
                      </SelectItem>
                      <SelectItem value="rock">
                        Rock (assumed 500 kPa)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <section
                className="space-y-3 border-t border-border/60 pt-4"
                aria-label="Opening dimensions"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">
                      Door and window dimensions
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Enter opening sizes manually. These are area/width
                      indicators, not structural checks.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addOpening}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add opening
                  </Button>
                </div>
                {params.openings.map((opening, index) => (
                  <div
                    key={opening.id}
                    className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-7"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={opening.type}
                        onValueChange={(value: "window" | "door") =>
                          updateOpening(opening.id, { type: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="door">Door</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Width ({lengthLabel})</Label>
                      <Input
                        type="number"
                        min="0.1"
                        step={lengthStep(unitSystem, 0.05)}
                        value={showLength(opening.width)}
                        onChange={(event) =>
                          updateOpening(opening.id, {
                            width: Math.max(
                              0.1,
                              lengthFromDisplay(
                                Number(event.target.value) || 0.1,
                                unitSystem,
                              ),
                            ),
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height ({lengthLabel})</Label>
                      <Input
                        type="number"
                        min="0.1"
                        step={lengthStep(unitSystem, 0.05)}
                        value={showLength(opening.height)}
                        onChange={(event) =>
                          updateOpening(opening.id, {
                            height: Math.max(
                              0.1,
                              lengthFromDisplay(
                                Number(event.target.value) || 0.1,
                                unitSystem,
                              ),
                            ),
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Count</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={opening.count}
                        onChange={(event) =>
                          updateOpening(opening.id, {
                            count: Math.max(
                              1,
                              Math.round(Number(event.target.value) || 1),
                            ),
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Wall</Label>
                      <Select
                        value={opening.wall_side}
                        onValueChange={(
                          value: "front" | "back" | "left" | "right",
                        ) => updateOpening(opening.id, { wall_side: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="front">Front</SelectItem>
                          <SelectItem value="back">Back</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Label</Label>
                      <div className="flex gap-2">
                        <Input
                          value={opening.label ?? ""}
                          onChange={(event) =>
                            updateOpening(opening.id, {
                              label: event.target.value,
                            })
                          }
                          aria-label={`Opening ${index + 1} label`}
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove opening ${index + 1}`}
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              openings: prev.openings.filter(
                                (item) => item.id !== opening.id,
                              ),
                            }))
                          }
                          className="h-8 w-8 shrink-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Advanced Engineering Controls Accordion */}
              {showAdvancedMath && (
                <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in-50">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Wall Thickness ({lengthLabel})
                    </Label>
                    <Input
                      type="number"
                      step={lengthStep(unitSystem, 0.025)}
                      value={showLength(params.wall_thickness)}
                      onChange={(e) =>
                        handleNumberChange(
                          "wall_thickness",
                          readLength(Number(e.target.value)),
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Internal Walls ({lengthLabel} run)
                    </Label>
                    <Input
                      type="number"
                      step={lengthStep(unitSystem, 1)}
                      value={showLength(params.internal_wall_length)}
                      onChange={(e) =>
                        handleNumberChange(
                          "internal_wall_length",
                          readLength(Number(e.target.value)),
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Basic Wind Speed (m/s)
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      value={params.basic_wind_speed_ms}
                      onChange={(e) =>
                        handleNumberChange(
                          "basic_wind_speed_ms",
                          Number(e.target.value),
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Terrain Wind Exposure
                    </Label>
                    <Select
                      value={
                        params.wind_exposure === "B"
                          ? "suburban"
                          : params.wind_exposure === "C"
                            ? "open_country"
                            : "coastal"
                      }
                      onValueChange={(
                        val: "open_country" | "suburban" | "coastal",
                      ) =>
                        setParams((prev) => ({
                          ...prev,
                          wind_exposure:
                            val === "suburban"
                              ? "B"
                              : val === "open_country"
                                ? "C"
                                : "D",
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suburban">
                          Suburban (Category B)
                        </SelectItem>
                        <SelectItem value="open_country">
                          Open Plains (Category C)
                        </SelectItem>
                        <SelectItem value="coastal">
                          Coastal / Ocean (Category D)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Optional manual cost inputs
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter current supplier rates yourself. No market prices are
              assumed or fetched. Soil and wind inputs are planning assumptions,
              not site data.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Currency code
              </Label>
              <Input
                value={currencyCode}
                maxLength={5}
                placeholder="e.g. NGN"
                onChange={(e) =>
                  setCurrencyCode(
                    e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                  )
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            {elevationResult.five_d_bim.materials.map((material) => (
              <div key={material.item} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {material.item} · {material.unit}
                </Label>
                <NumericInput
                  value={unitRates[material.item] ?? ""}
                  min={0}
                  step="any"
                  placeholder="Unit rate"
                  onValueChange={(n) =>
                    setUnitRates((prev) => ({
                      ...prev,
                      [material.item]: Math.max(0, n),
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>

        <section
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
          aria-label="Elevation summary and export"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Quantities you can take to site
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unitSystem === "imperial"
                  ? "Imperial display: dimensions and quantities are converted from the SI calculation. Pressure, wind speed and line load stay in SI."
                  : "Metric display of the SI calculation."}{" "}
                The export carries the figures shown here, including the
                screening flags and the assumption boundary.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                className="h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export takeoff CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySummary}
                className="h-8 gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                {summaryCopied ? "Summary copied" : "Copy summary"}
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">Concrete</dt>
              <dd className="font-mono font-semibold text-foreground">
                {measure(
                  elevationResult.five_d_bim.total_concrete_volume_m3,
                  "m3",
                )}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">
                Cement (50 kg bags)
              </dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatNumber(
                  elevationResult.five_d_bim.total_cement_bags_50kg,
                  0,
                )}{" "}
                bags
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">Blocks</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatNumber(elevationResult.five_d_bim.total_blocks_units, 0)}{" "}
                units
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">
                Reinforcement
              </dt>
              <dd className="font-mono font-semibold text-foreground">
                {measure(elevationResult.five_d_bim.total_rebar_kg, "kg")}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">Sand</dt>
              <dd className="font-mono font-semibold text-foreground">
                {measure(elevationResult.five_d_bim.total_sand_m3, "m3")}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <dt className="text-[11px] text-muted-foreground">Programme</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatNumber(elevationResult.five_d_bim.total_project_days, 0)}{" "}
                days
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">
              Assumptions behind these figures
            </p>
            <p className="mt-1">
              Bearing value {formatNumber(params.soil_bearing_capacity_kpa, 0)}{" "}
              kPa from the soil class you selected, basic wind speed{" "}
              {formatNumber(params.basic_wind_speed_ms, 0)} m/s at exposure
              category {params.wind_exposure}, roof span taken as the shorter
              plan dimension plus overhangs, and wall thickness{" "}
              {measure(params.wall_thickness, "m")}. Rates, where entered, are
              yours; nothing is fetched. This is a planning illustration, not a
              design check, a code-compliance determination or a substitute for
              a licensed professional review.
            </p>
          </div>
        </section>

        {/* ── 5-Level Structural Mathematical Summary Breakdown ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* L1 */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">
                L1: Foundation
              </span>
              <Badge variant="outline" className="text-[10px]">
                {levels.level_1_foundation.is_bearing_safe
                  ? "Within assumption"
                  : "Exceeds assumption"}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">
              Bf ={" "}
              {measure(levels.level_1_foundation.footing_width_adopted_m, "m")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Excavation:{" "}
              {measure(levels.level_1_foundation.excavation_depth_m, "m")} depth
              ({measure(levels.level_1_foundation.excavation_volume_m3, "m3")})
            </p>
          </div>

          {/* L2 */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">
                L2: Ground Slab
              </span>
              <Badge variant="outline" className="text-[10px]">
                +
                {measure(
                  levels.level_2_ground_slab.plinth_height_above_ground_m,
                  "m",
                )}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {measure(levels.level_2_ground_slab.slab_area_m2, "m2")} slab
            </p>
            <p className="text-[11px] text-muted-foreground">
              Conc:{" "}
              {measure(
                levels.level_2_ground_slab.slab_concrete_volume_m3,
                "m3",
              )}{" "}
              ({levels.level_2_ground_slab.slab_thickness_m} m thick)
            </p>
          </div>

          {/* L3 */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">
                L3: Walls
              </span>
              <Badge variant="outline" className="text-[10px]">
                λ = {levels.level_3_superstructure.slenderness_ratio}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {levels.level_3_superstructure.total_blocks_count.toLocaleString()}{" "}
              blocks
            </p>
            <p className="text-[11px] text-muted-foreground">
              Net wall area:{" "}
              {measure(levels.level_3_superstructure.net_masonry_area_m2, "m2")}
            </p>
          </div>

          {/* L4 */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">
                L4: Ring Beam
              </span>
              <Badge variant="outline" className="text-[10px]">
                4 × Y12
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {measure(levels.level_4_ring_beam.total_beam_length_m, "m")}{" "}
              perimeter
            </p>
            <p className="text-[11px] text-muted-foreground">
              Rebar:{" "}
              {measure(
                levels.level_4_ring_beam.total_main_rebar_weight_kg,
                "kg",
              )}
            </p>
          </div>

          {/* L5 */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">
                L5: Roof Pitch
              </span>
              <Badge variant="outline" className="text-[10px]">
                {params.roof_pitch_deg}° Pitch
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">
              Rise: {measure(levels.level_5_roof.ridge_rise_m, "m")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              True area:{" "}
              {measure(levels.level_5_roof.true_3d_roof_area_m2, "m2")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
