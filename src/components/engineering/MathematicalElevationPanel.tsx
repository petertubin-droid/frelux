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
import type { BuildToRoofInput } from "@/types/build-to-roof";

interface MathematicalElevationPanelProps {
  onApplyDerivedInput?: (patch: Partial<BuildToRoofInput>) => void;
  className?: string;
}

export function MathematicalElevationPanel({
  onApplyDerivedInput,
  className = "",
}: MathematicalElevationPanelProps) {
  // Input parameters state
  const [params, setParams] = useState<PlanElevationInput>(DEFAULT_PLAN_INPUT);
  const [selectedSoilType, setSelectedSoilType] = useState<SoilTypeKey>(DEFAULT_PLAN_INPUT.soil_type);
  const [showAdvancedMath, setShowAdvancedMath] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [currencyCode, setCurrencyCode] = useState("");
  const [unitRates, setUnitRates] = useState<Record<string, number>>({});
  const [planFile, setPlanFile] = useState<File | null>(null);
  const planPreviewUrl = useMemo(() => planFile ? URL.createObjectURL(planFile) : null, [planFile]);
  useEffect(() => () => { if (planPreviewUrl) URL.revokeObjectURL(planPreviewUrl); }, [planPreviewUrl]);

  // Re-calculate deterministically whenever params change
  const elevationResult = useMemo<MathematicalElevationResult>(() => {
    return calculateMathematicalElevation(params);
  }, [params]);

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
    setParams((prev) => ({ ...prev, soil_type: soilKey, soil_bearing_capacity_kpa: capacity }));
  };

  const updateOpening = (id: string, patch: Partial<PlanElevationInput["openings"][number]>) => {
    setParams((prev) => ({
      ...prev,
      openings: prev.openings.map((opening) => opening.id === id ? { ...opening, ...patch } : opening),
    }));
  };

  const addOpening = () => {
    setParams((prev) => ({
      ...prev,
      openings: [...prev.openings, {
        id: `opening-${Date.now()}`,
        type: "window",
        width: 1,
        height: 1,
        count: 1,
        wall_side: "front",
        label: "New opening",
      }],
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
              Builds an indicative elevation from dimensions you enter, using deterministic geometry,
              simplified quantity assumptions, and an illustrative wind screen. It does not read uploaded
              plan images or verify compliance with building regulations.
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

      <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
        <strong>Planning illustration only.</strong> This tool uses manually entered dimensions; it does not read uploaded drawings, verify site conditions, establish code compliance, or produce structural design. Load, wind, soil, material, and duration values are simplified assumptions and must not be used for construction decisions. Obtain site-specific review from appropriately licensed local professionals.
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3" aria-label="Optional plan reference">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Optional plan reference image</h3>
          <p className="text-xs text-muted-foreground">Choose a local image to view beside the manual calculation. It stays in this browser session and is not analyzed or used as a measurement source.</p>
        </div>
        <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose building plan image" onChange={(event) => setPlanFile(event.target.files?.[0] ?? null)} className="max-w-md" />
        {planPreviewUrl && planFile && (
          <figure className="space-y-2">
            <img src={planPreviewUrl} alt={`User-supplied plan reference: ${planFile.name}`} className="max-h-96 w-full rounded-lg border border-border bg-muted object-contain" />
            <figcaption className="text-xs text-muted-foreground">Reference only: enter and verify dimensions in the fields below; no plan reading or automatic calibration is performed.</figcaption>
          </figure>
        )}
      </section>

      {/* ── Main Interactive 3D / 5D Diagram ── */}
      <MathematicalElevationDiagram
        result={elevationResult}
        unitRates={unitRates}
        currencyCode={currencyCode.trim().toUpperCase()}
        onApplyToEstimate={handleApply}
      />

      {/* ── Geometry and assumption screening ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-purple" />
            <h3 className="text-sm font-semibold text-foreground">
              Geometry & assumption screening
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
              No configured screening flags were triggered. This is not a code-compliance determination, structural design, or substitute for site-specific professional review.
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
                    <span className="font-semibold text-foreground">{disc.title}</span>
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
                  <p className="text-muted-foreground text-xs leading-relaxed">{disc.mathematical_proof}</p>
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

      {/* ── Mathematical Parameter Controls ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-brand-purple" />
            <h3 className="text-sm font-semibold text-foreground">
              Enter Building Dimensions & Geometric Parameters
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdvancedMath(!showAdvancedMath)}
            className="text-xs h-7 gap-1 text-muted-foreground"
          >
            {showAdvancedMath ? "Simple View" : "Additional Planning Inputs"}
            {showAdvancedMath ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Primary Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Building Length (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.building_length}
              onChange={(e) => handleNumberChange("building_length", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Building Width (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.building_width}
              onChange={(e) => handleNumberChange("building_width", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Storeys (Floors)</Label>
            <Input
              type="number"
              min="1"
              max="6"
              value={params.storeys}
              onChange={(e) => handleNumberChange("storeys", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Floor Height (m)</Label>
            <Input
              type="number"
              step="0.05"
              value={params.floor_to_floor_height}
              onChange={(e) => handleNumberChange("floor_to_floor_height", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        {/* Secondary Roof & Structural Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Roof Pitch Angle θ (°)</Label>
            <Input
              type="number"
              step="1"
              min="5"
              max="60"
              value={params.roof_pitch_deg}
              onChange={(e) => handleNumberChange("roof_pitch_deg", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Roof Overhang Eaves (m)</Label>
            <Input
              type="number"
              step="0.05"
              value={params.roof_overhang}
              onChange={(e) => handleNumberChange("roof_overhang", Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Roof Pitch Style</Label>
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
                <SelectItem value="gable">Gable Roof (2 Slopes)</SelectItem>
                <SelectItem value="hip">Hip Roof (4 Slopes)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bearing value (assumption)</Label>
            <Select value={selectedSoilType} onValueChange={(value) => handleSoilSelect(value as SoilTypeKey)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laterite">Laterite (assumed 150 kPa)</SelectItem>
                <SelectItem value="sandy_clay">Sandy clay (assumed 120 kPa)</SelectItem>
                <SelectItem value="firm_clay">Firm clay (assumed 100 kPa)</SelectItem>
                <SelectItem value="dense_sand">Dense sand (assumed 250 kPa)</SelectItem>
                <SelectItem value="rock">Rock (assumed 500 kPa)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="space-y-3 border-t border-border/60 pt-4" aria-label="Opening dimensions">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Door and window dimensions</h4>
              <p className="text-xs text-muted-foreground">Enter opening sizes manually. These are area/width indicators, not structural checks.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addOpening} className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />Add opening</Button>
          </div>
          {params.openings.map((opening, index) => (
            <div key={opening.id} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-7">
              <div className="space-y-1"><Label className="text-xs">Type</Label><Select value={opening.type} onValueChange={(value: "window" | "door") => updateOpening(opening.id, { type: value })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="window">Window</SelectItem><SelectItem value="door">Door</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-xs">Width (m)</Label><Input type="number" min="0.1" step="0.05" value={opening.width} onChange={(event) => updateOpening(opening.id, { width: Math.max(0.1, Number(event.target.value) || 0.1) })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Height (m)</Label><Input type="number" min="0.1" step="0.05" value={opening.height} onChange={(event) => updateOpening(opening.id, { height: Math.max(0.1, Number(event.target.value) || 0.1) })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Count</Label><Input type="number" min="1" step="1" value={opening.count} onChange={(event) => updateOpening(opening.id, { count: Math.max(1, Math.round(Number(event.target.value) || 1)) })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Wall</Label><Select value={opening.wall_side} onValueChange={(value: "front" | "back" | "left" | "right") => updateOpening(opening.id, { wall_side: value })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="front">Front</SelectItem><SelectItem value="back">Back</SelectItem><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Label</Label><div className="flex gap-2"><Input value={opening.label ?? ""} onChange={(event) => updateOpening(opening.id, { label: event.target.value })} aria-label={`Opening ${index + 1} label`} className="h-8 text-xs" /><Button type="button" size="icon" variant="ghost" aria-label={`Remove opening ${index + 1}`} onClick={() => setParams((prev) => ({ ...prev, openings: prev.openings.filter((item) => item.id !== opening.id) }))} className="h-8 w-8 shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></Button></div></div>
            </div>
          ))}
        </section>

        {/* Advanced Engineering Controls Accordion */}
        {showAdvancedMath && (
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in-50">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Wall Thickness (m)</Label>
              <Input
                type="number"
                step="0.025"
                value={params.wall_thickness}
                onChange={(e) => handleNumberChange("wall_thickness", Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Internal Walls (m run)</Label>
              <Input
                type="number"
                step="1"
                value={params.internal_wall_length}
                onChange={(e) => handleNumberChange("internal_wall_length", Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Basic Wind Speed (m/s)</Label>
              <Input
                type="number"
                step="1"
                value={params.basic_wind_speed_ms}
                onChange={(e) => handleNumberChange("basic_wind_speed_ms", Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Terrain Wind Exposure</Label>
              <Select
                value={params.wind_exposure === "B" ? "suburban" : params.wind_exposure === "C" ? "open_country" : "coastal"}
                onValueChange={(val: "open_country" | "suburban" | "coastal") =>
                  setParams((prev) => ({ ...prev, wind_exposure: val === "suburban" ? "B" : val === "open_country" ? "C" : "D" }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suburban">Suburban (Category B)</SelectItem>
                  <SelectItem value="open_country">Open Plains (Category C)</SelectItem>
                  <SelectItem value="coastal">Coastal / Ocean (Category D)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Optional manual cost inputs</h3>
          <p className="text-xs text-muted-foreground">Enter current supplier rates yourself. No market prices are assumed or fetched. Soil and wind inputs are planning assumptions, not site data.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Currency code</Label><Input value={currencyCode} maxLength={5} placeholder="e.g. NGN" onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} className="h-8 text-xs font-mono" /></div>
          {elevationResult.five_d_bim.materials.map((material) => (
            <div key={material.item} className="space-y-1"><Label className="text-xs text-muted-foreground">{material.item} · {material.unit}</Label><Input type="number" min="0" step="any" value={unitRates[material.item] ?? ""} placeholder="Unit rate" onChange={(e) => setUnitRates((prev) => ({ ...prev, [material.item]: Math.max(0, Number(e.target.value) || 0) }))} className="h-8 text-xs font-mono" /></div>
          ))}
        </div>
      </div>

      {/* ── 5-Level Structural Mathematical Summary Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* L1 */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">L1: Foundation</span>
            <Badge variant="outline" className="text-[10px]">
              {levels.level_1_foundation.is_bearing_safe ? "Within assumption" : "Exceeds assumption"}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            Bf = {levels.level_1_foundation.footing_width_adopted_m} m
          </p>
          <p className="text-[11px] text-muted-foreground">
            Excavation: {levels.level_1_foundation.excavation_depth_m}m depth ({levels.level_1_foundation.excavation_volume_m3} m³)
          </p>
        </div>

        {/* L2 */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">L2: Ground Slab</span>
            <Badge variant="outline" className="text-[10px]">
              +{levels.level_2_ground_slab.plinth_height_above_ground_m}m
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {levels.level_2_ground_slab.slab_area_m2} m² Slab
          </p>
          <p className="text-[11px] text-muted-foreground">
            Conc: {levels.level_2_ground_slab.slab_concrete_volume_m3} m³ (150mm)
          </p>
        </div>

        {/* L3 */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">L3: Walls</span>
            <Badge variant="outline" className="text-[10px]">
              λ = {levels.level_3_superstructure.slenderness_ratio}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {levels.level_3_superstructure.total_blocks_count.toLocaleString()} Blocks
          </p>
          <p className="text-[11px] text-muted-foreground">
            Wall Area: {levels.level_3_superstructure.net_masonry_area_m2} m²
          </p>
        </div>

        {/* L4 */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">L4: Ring Beam</span>
            <Badge variant="outline" className="text-[10px]">
              4 × Y12
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {levels.level_4_ring_beam.total_beam_length_m} m Perimeter
          </p>
          <p className="text-[11px] text-muted-foreground">
            Rebar: {levels.level_4_ring_beam.total_main_rebar_weight_kg} kg
          </p>
        </div>

        {/* L5 */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-purple font-mono uppercase">L5: Roof Pitch</span>
            <Badge variant="outline" className="text-[10px]">
              {params.roof_pitch_deg}° Pitch
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            Rise: {levels.level_5_roof.ridge_rise_m} m
          </p>
          <p className="text-[11px] text-muted-foreground">
            True Area: {levels.level_5_roof.true_3d_roof_area_m2} m²
          </p>
        </div>
      </div>
    </div>
  );
}
