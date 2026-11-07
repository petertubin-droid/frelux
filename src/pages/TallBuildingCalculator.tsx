// =========================================================
// FRELUX TALL BUILDING STRUCTURE & FOUNDATION CALCULATOR
// Deterministic high-rise screening page
// =========================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
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
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Gauge,
  Layers,
  Ruler,
  ShieldCheck,
  Wind,
} from "lucide-react";
import {
  calculateTallBuilding,
  DEFAULT_TALL_INPUT,
  TALL_SOILS,
  TALL_SYSTEM_LABELS,
  TALL_SYSTEM_RANGES,
  type TallBuildingInput,
  type TallExposureKey,
  type TallSoilKey,
  type TallStructuralSystemKey,
} from "@/lib/engineering/tall-building-engine";
import type { TallOccupancy } from "@/lib/engineering/architectural-planning";

const metresToFeet = (value: number) => value * 3.28084;

function formatNumber(value: number, places = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

const TALL_FAQS = [
  {
    question: "What height does this calculator cover?",
    answer:
      "It is built for towers between about 8 and 140 storeys. It selects a rigid frame below 15 storeys, a shear core to about 35, core and outriggers to 70, a tube in tube to 90, and a mega frame above that. Those ranges are tall building practice rather than code limits, and the page says when the entered height sits outside the range for the chosen system.",
  },
  {
    question: "How is wind load calculated for a tall building?",
    answer:
      "Velocity pressure uses the ASCE 7-22 exposure coefficient Kz at each storey, applied to the loaded face with a force coefficient, then summed from the base to the top. That storey by storey integration produces the base shear and the overturning moment. A single top pressure would understate both.",
  },
  {
    question: "Which drift limit is applied?",
    answer:
      "Top drift is compared with H/500 and H/400, the serviceability limits commonly specified for occupied towers. The estimate uses virtual work on the core section with Ec equal to 4700 times the square root of fck and the ACI 318-19 cracked stiffness of 0.70. Occupant comfort and acceleration need a dynamic check, which this page does not perform.",
  },
  {
    question: "How is the foundation chosen between a raft and piles?",
    answer:
      "The raft is checked as a rigid plate for axial load plus moment. If the contact pressure exceeds the entered allowable bearing, or the building is taller than 15 storeys, the scheme becomes a piled raft. Piles then carry the excess, and the count is set so the largest pile load, including the moment couple, fits the allowable capacity at a factor of safety of 2.5.",
  },
  {
    question: "How is pile capacity worked out?",
    answer:
      "Shaft friction uses the alpha method in clay, where friction is a fraction of undrained strength, and the beta method in sand, where friction is a fraction of effective overburden. End bearing in sand uses the Meyerhof SPT relationship qp equal to 40 N times length over diameter, capped at 400 N, with a 30 percent reduction for bored piles because of base cleanliness.",
  },
  {
    question: "Can I use the output for construction or permits?",
    answer:
      "No. The page is a preliminary screen built on single cantilever stiffness, elastic pile group distribution and soil and hazard inputs you supply. It does not perform a structural analysis, a geotechnical investigation or a wind tunnel study. Use it to size the scheme, then have a licensed structural engineer confirm every figure against site data and the local code.",
  },
];

/**
 * Typical towers. A visitor who does not know a floor plate from a plan ratio
 * still needs a sane starting point, so the page opens on a real building
 * rather than on a wall of empty engineering fields.
 */
const TALL_PRESETS: {
  id: string;
  name: string;
  blurb: string;
  patch: Partial<TallBuildingInput>;
}[] = [
  {
    id: "office-6",
    name: "6-storey office",
    blurb: "30 × 22 m floor plate",
    patch: {
      floors: 6,
      floor_height: 3.6,
      ground_floor_height: 4.2,
      plan_length: 30,
      plan_width: 22,
      occupancy: "office",
    },
  },
  {
    id: "apartments-12",
    name: "12-storey apartments",
    blurb: "26 × 20 m floor plate",
    patch: {
      floors: 12,
      floor_height: 3.0,
      ground_floor_height: 3.6,
      plan_length: 26,
      plan_width: 20,
      occupancy: "residential",
    },
  },
  {
    id: "mixed-20",
    name: "20-storey mixed use",
    blurb: "34 × 26 m floor plate",
    patch: {
      floors: 20,
      floor_height: 3.3,
      ground_floor_height: 4.5,
      plan_length: 34,
      plan_width: 26,
      occupancy: "office",
    },
  },
  {
    id: "tower-40",
    name: "40-storey tower",
    blurb: "42 × 32 m floor plate",
    patch: {
      floors: 40,
      floor_height: 3.6,
      ground_floor_height: 5.0,
      plan_length: 42,
      plan_width: 32,
      occupancy: "office",
    },
  },
];

export default function TallBuildingCalculator() {
  const [params, setParams] = useState<TallBuildingInput>(DEFAULT_TALL_INPUT);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useSeo({
    title: "Skyscraper Structure and Foundation Calculator | FRELUX",
    description:
      "Screen a high rise from entered geometry: lateral system by height, ASCE 7 wind base shear and drift, seismic base shear, raft and pile foundation sizing, quantities and a build programme. Deterministic engineering arithmetic, not a structural design.",
    canonicalPath: "/tall-building-structure",
    keywords:
      "skyscraper structure calculator, high rise foundation design, tall building wind drift, pile capacity calculator, core wall sizing, seismic base shear",
  });

  const result = useMemo(() => calculateTallBuilding(params), [params]);
  const {
    geometry,
    gravity,
    wind,
    seismic,
    foundation,
    quantities,
    schedule,
    checks,
    system,
    architecture,
  } = result;

  const setNumber =
    (field: keyof TallBuildingInput) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setParams((prev) => ({
        ...prev,
        [field]: Number.isFinite(value) ? value : 0,
      }));
    };

  const downloadCsv = () => {
    const rows: string[][] = [
      ["FRELUX tall building screen", params.project_name],
      [],
      ["Geometry", ""],
      ["Storeys", String(params.floors)],
      ["Height above ground (m)", String(geometry.total_height_m)],
      ["Floor plate (m2)", String(geometry.floor_plate_m2)],
      ["Gross floor area (m2)", String(geometry.gross_floor_area_m2)],
      ["Slenderness H/B", String(geometry.slenderness_ratio)],
      ["Core plan (m2)", String(geometry.core_plan_area_m2)],
      ["Core wall thickness (m)", String(geometry.core_wall_thickness_m)],
      [],
      ["Lateral and gravity", ""],
      ["Selected system", system.selected_label],
      ["Total gravity load (MN)", String(gravity.total_gravity_load_mn)],
      ["Base axial per column (MN)", String(gravity.base_axial_per_column_mn)],
      ["Column size (mm)", String(gravity.column_size_mm)],
      [],
      ["Wind", ""],
      ["Kz at top", String(wind.kz_top)],
      [
        "Velocity pressure at top (kPa)",
        String(wind.velocity_pressure_top_kpa),
      ],
      ["Base shear (MN)", String(wind.base_shear_mn)],
      ["Overturning moment (MNm)", String(wind.overturning_moment_mnm)],
      ["Top drift (mm)", String(wind.drift_top_mm)],
      ["Drift ratio 1 in", String(wind.drift_ratio)],
      [],
      ["Seismic", ""],
      ["Approximate period (s)", String(seismic.approximate_period_s)],
      ["Cs", String(seismic.spectral_response_acceleration)],
      ["Base shear (MN)", String(seismic.base_shear_mn)],
      ["Overturning moment (MNm)", String(seismic.overturning_moment_mnm)],
      [],
      ["Foundation", ""],
      ["Scheme", foundation.foundation_label],
      ["Raft thickness (m)", String(foundation.raft_thickness_m)],
      ["Service load (MN)", String(foundation.service_load_mn)],
      [
        "Raft contact pressure (kPa)",
        String(foundation.bearing_pressure_max_kpa),
      ],
      ["Piles required", String(foundation.piles_required)],
      [
        "Pile allowable capacity (kN)",
        String(foundation.pile_capacity_allowable_kn),
      ],
      ["Maximum pile load (kN)", String(foundation.pile_max_load_kn)],
      ["Estimated settlement (mm)", String(foundation.estimated_settlement_mm)],
      [],
      ["Quantities", ""],
      ["Core concrete (m3)", String(quantities.core_concrete_m3)],
      ["Column concrete (m3)", String(quantities.column_concrete_m3)],
      ["Slab concrete (m3)", String(quantities.slab_concrete_m3)],
      ["Raft concrete (m3)", String(quantities.raft_concrete_m3)],
      ["Pile concrete (m3)", String(quantities.pile_concrete_m3)],
      ["Total concrete (m3)", String(quantities.total_concrete_m3)],
      ["Reinforcement (t)", String(quantities.total_rebar_tonnes)],
      ["Formwork (m2)", String(quantities.formwork_m2)],
      [],
      ["Architectural planning", ""],
      ["Occupancy", params.occupancy],
      ["Lettable efficiency (%)", String(architecture.efficiencyPct)],
      ["Net lettable area (m2)", String(architecture.netLettableAreaM2)],
      ["Facade to floor ratio", String(architecture.facadeToFloorRatio)],
      ["Daylit area (%)", String(architecture.daylitPct)],
      ["Clear height (m)", String(architecture.clearHeightM)],
      ["Occupants", String(architecture.totalOccupants)],
      ["Lift cars required", String(architecture.lifts.carsRequired)],
      ["Lift interval (s)", String(architecture.lifts.intervalS)],
      ["Lift round trip (s)", String(architecture.lifts.roundTripTimeS)],
      [
        "Egress width required (mm)",
        String(architecture.egressWidthRequiredMm),
      ],
      [],
      ["Programme", ""],
      ["Substructure (days)", String(schedule.substructure_days)],
      ["Structure (days)", String(schedule.structure_days)],
      ["Total (days)", String(schedule.total_days)],
      ["Total (months)", String(schedule.total_months)],
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frelux-tall-building-screen.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tiles = [
    {
      label: "Height above ground",
      value: `${formatNumber(geometry.total_height_m, 1)} m`,
      sub: `${formatNumber(metresToFeet(geometry.total_height_m), 0)} ft`,
    },
    {
      label: "Gross floor area",
      value: `${formatNumber(geometry.gross_floor_area_m2)} m²`,
      sub: `${formatNumber(geometry.floor_plate_m2)} m² per floor`,
    },
    {
      label: "Lateral system",
      value: TALL_SYSTEM_LABELS[system.selected],
      sub: `${geometry.slenderness_ratio} H/B slenderness`,
    },
    {
      label: "Wind base shear",
      value: `${formatNumber(wind.base_shear_mn, 1)} MN`,
      sub: `${formatNumber(wind.overturning_moment_mnm)} MNm overturning`,
    },
    {
      label: "Top drift",
      value: `${formatNumber(wind.drift_top_mm)} mm`,
      sub: `1 in ${formatNumber(wind.drift_ratio)} of height`,
    },
    {
      label: "Foundation",
      value:
        foundation.piles_required > 0
          ? `${foundation.piles_required} piles`
          : "Raft only",
      sub: `${foundation.raft_thickness_m} m raft, ${formatNumber(foundation.service_load_mn)} MN`,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to="/construction-tools" className="hover:text-foreground">
          Construction tools
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Tall building structure</span>
      </nav>

      <PageHeader
        title="Skyscraper Structure and Foundation Calculator"
        subtitle="Size the lateral system, foundation and programme of a high rise from the geometry you enter. Wind and seismic demand are computed with published relationships, then checked against drift, stability and pile capacity limits. This is a screening calculation, not a structural design."
        eyebrow="Deterministic engineering · codes cited · no AI estimates"
      />

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={downloadCsv}
          variant="outline"
          className="h-9 gap-2 text-xs"
        >
          <Download className="h-4 w-4" /> Export this screen as CSV
        </Button>
        <Button
          variant="ghost"
          className="h-9 gap-2 text-xs text-muted-foreground"
          onClick={() => setParams({ ...DEFAULT_TALL_INPUT })}
        >
          Reset to the worked example
        </Button>
      </div>

      {/* Start here */}
      <section
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
        aria-label="Start here"
      >
        <div className="space-y-1">
          <p className="section-label">Start here</p>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Pick the tower closest to yours
          </h2>
          <p className="text-sm text-muted-foreground">
            Each option fills the height, floor plate and loading with a typical
            building of that size. Change anything below and every figure
            follows.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TALL_PRESETS.map((preset) => {
            const active =
              params.floors === preset.patch.floors &&
              params.plan_length === preset.patch.plan_length &&
              params.plan_width === preset.patch.plan_width;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setParams((current) => ({ ...current, ...preset.patch }))
                }
                aria-pressed={active}
                className={
                  active
                    ? "rounded-xl border border-brand-purple/60 bg-brand-purple/10 p-3 text-left"
                    : "rounded-xl border border-border bg-muted/20 p-3 text-left transition-colors hover:border-brand-purple/40 hover:bg-muted/40"
                }
              >
                <span className="block text-sm font-semibold text-foreground">
                  {preset.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {preset.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Inputs */}
      <section
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
        aria-label="Building inputs"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-brand-purple" />
            <h2 className="text-sm font-semibold text-foreground">
              Building geometry and loading
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            {showAdvanced ? "Hide site inputs" : "Site and seismic inputs"}
            {showAdvanced ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Floors above ground
            </Label>
            <Input
              type="number"
              min={3}
              max={140}
              value={params.floors}
              onChange={setNumber("floors")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Typical floor height (m)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={params.floor_height}
              onChange={setNumber("floor_height")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Ground floor height (m)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={params.ground_floor_height}
              onChange={setNumber("ground_floor_height")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Concrete fck (MPa)
            </Label>
            <Input
              type="number"
              step="5"
              value={params.concrete_grade_mpa}
              onChange={setNumber("concrete_grade_mpa")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Plan length (m)
            </Label>
            <Input
              type="number"
              step="0.5"
              value={params.plan_length}
              onChange={setNumber("plan_length")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Plan width (m)
            </Label>
            <Input
              type="number"
              step="0.5"
              value={params.plan_width}
              onChange={setNumber("plan_width")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Dead load (kPa)
            </Label>
            <Input
              type="number"
              step="0.5"
              value={params.dead_load_kpa}
              onChange={setNumber("dead_load_kpa")}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Live load (kPa)
            </Label>
            <Input
              type="number"
              step="0.5"
              value={params.live_load_kpa}
              onChange={setNumber("live_load_kpa")}
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Lateral system
            </Label>
            <Select
              value={params.system}
              onValueChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  system: value as TallStructuralSystemKey | "auto",
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Select by height (recommended)
                </SelectItem>
                {(
                  Object.keys(TALL_SYSTEM_LABELS) as TallStructuralSystemKey[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TALL_SYSTEM_LABELS[key]} ({TALL_SYSTEM_RANGES[key].min} to{" "}
                    {TALL_SYSTEM_RANGES[key].max})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Terrain exposure
            </Label>
            <Select
              value={params.terrain_exposure}
              onValueChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  terrain_exposure: value as TallExposureKey,
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B">Urban and suburban (B)</SelectItem>
                <SelectItem value="C">Open country (C)</SelectItem>
                <SelectItem value="D">Coastal water (D)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Soil</Label>
            <Select
              value={params.soil_type}
              onValueChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  soil_type: value as TallSoilKey,
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TALL_SOILS) as TallSoilKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TALL_SOILS[key].label} (
                    {TALL_SOILS[key].allowable_bearing_kpa} kPa)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Basic wind speed (m/s)
              </Label>
              <Input
                type="number"
                step="1"
                value={params.basic_wind_speed_ms}
                onChange={setNumber("basic_wind_speed_ms")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Force coefficient Cf
              </Label>
              <Input
                type="number"
                step="0.05"
                value={params.force_coefficient_cf}
                onChange={setNumber("force_coefficient_cf")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">SDS (g)</Label>
              <Input
                type="number"
                step="0.05"
                value={params.seismic_sds}
                onChange={setNumber("seismic_sds")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">SD1 (g)</Label>
              <Input
                type="number"
                step="0.05"
                value={params.seismic_sd1}
                onChange={setNumber("seismic_sd1")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Response factor R
              </Label>
              <Input
                type="number"
                step="0.5"
                value={params.seismic_r}
                onChange={setNumber("seismic_r")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                SPT N at pile level
              </Label>
              <Input
                type="number"
                step="1"
                value={params.spt_n}
                onChange={setNumber("spt_n")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Pile diameter (m)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={params.pile_diameter_m}
                onChange={setNumber("pile_diameter_m")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Pile length (m)
              </Label>
              <Input
                type="number"
                step="1"
                value={params.pile_length_m}
                onChange={setNumber("pile_length_m")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Water table (m)
              </Label>
              <Input
                type="number"
                step="1"
                value={params.water_table_m}
                onChange={setNumber("water_table_m")}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Occupancy</Label>
              <Select
                value={params.occupancy}
                onValueChange={(value) =>
                  setParams((prev) => ({
                    ...prev,
                    occupancy: value as TallOccupancy,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Cycle per floor (days)
              </Label>
              <Input
                type="number"
                step="1"
                value={params.cycle_days_per_floor}
                onChange={setNumber("cycle_days_per_floor")}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
        )}
      </section>

      {/* Summary tiles */}
      <section
        aria-label="Key results"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {tile.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{tile.sub}</p>
          </div>
        ))}
      </section>

      {/* Checks */}
      <section
        className="space-y-3 rounded-2xl border border-border bg-card p-5"
        aria-label="Screening checks"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-purple" />
            <h2 className="text-sm font-semibold text-foreground">
              What we checked, and what it means
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {checks.length === 0
              ? "No flags"
              : `${checks.length} flag${checks.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {checks.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              No screening flag was triggered by the entered values. This is not
              a design check or a compliance statement.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                  check.severity === "critical"
                    ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    : check.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {check.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {check.severity}
                    </Badge>
                  </div>
                  <p className="font-mono text-[11px]">
                    Observed {check.observed} · Threshold {check.threshold}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {check.basis}
                  </p>
                  <p className="text-[11px] font-medium text-foreground">
                    Action: {check.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AdSlot slotKey="calculator_mid" className="my-6" />

      {/* Results */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="Wind and seismic demand"
      >
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-brand-purple" />
            <h2 className="text-sm font-semibold text-foreground">
              Wind demand (ASCE 7-22)
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Kz at top", formatNumber(wind.kz_top, 3)],
              [
                "qz at top",
                `${formatNumber(wind.velocity_pressure_top_kpa, 3)} kPa`,
              ],
              ["Base shear", `${formatNumber(wind.base_shear_mn, 2)} MN`],
              [
                "Overturning",
                `${formatNumber(wind.overturning_moment_mnm, 0)} MNm`,
              ],
              ["Top drift", `${formatNumber(wind.drift_top_mm)} mm`],
              [
                "Drift limit H/500",
                `${formatNumber(wind.drift_limit_h_over_500_mm)} mm`,
              ],
              ["Stability theta", formatNumber(wind.stability_coefficient, 3)],
              ["Governing face", wind.governing_face],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {wind.proof.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand-purple" />
            <h2 className="text-sm font-semibold text-foreground">
              Seismic demand (ASCE 7-22 12.8)
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              [
                "Approximate period",
                `${formatNumber(seismic.approximate_period_s, 2)} s`,
              ],
              ["Cs", formatNumber(seismic.spectral_response_acceleration, 3)],
              [
                "Seismic weight",
                `${formatNumber(seismic.seismic_weight_mn)} MN`,
              ],
              ["Base shear", `${formatNumber(seismic.base_shear_mn, 1)} MN`],
              [
                "Overturning",
                `${formatNumber(seismic.overturning_moment_mnm, 0)} MNm`,
              ],
              [
                "Governs laterally",
                seismic.governs_over_wind ? "Seismic" : "Wind",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {seismic.proof.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="space-y-3 rounded-2xl border border-border bg-card p-5"
        aria-label="Foundation"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-purple" />
          <h2 className="text-sm font-semibold text-foreground">
            Foundation sizing
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {foundation.foundation_label}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {[
            ["Raft thickness", `${foundation.raft_thickness_m} m`],
            ["Service load", `${formatNumber(foundation.service_load_mn)} MN`],
            [
              "Raft contact pressure",
              `${formatNumber(foundation.bearing_pressure_max_kpa)} kPa`,
            ],
            ["Allowable bearing", `${foundation.allowable_bearing_kpa} kPa`],
            ["Piles required", String(foundation.piles_required)],
            [
              "Pile allowable capacity",
              `${formatNumber(foundation.pile_capacity_allowable_kn)} kN`,
            ],
            [
              "Maximum pile load",
              `${formatNumber(foundation.pile_max_load_kn)} kN`,
            ],
            [
              "Settlement estimate",
              `${formatNumber(foundation.estimated_settlement_mm)} mm`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {foundation.proof.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="Quantities and programme"
      >
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-purple" />
            <h2 className="text-sm font-semibold text-foreground">
              Structural quantities
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              [
                "Core concrete",
                `${formatNumber(quantities.core_concrete_m3)} m³`,
              ],
              [
                "Column concrete",
                `${formatNumber(quantities.column_concrete_m3)} m³`,
              ],
              [
                "Slab concrete",
                `${formatNumber(quantities.slab_concrete_m3)} m³`,
              ],
              [
                "Raft concrete",
                `${formatNumber(quantities.raft_concrete_m3)} m³`,
              ],
              [
                "Pile concrete",
                `${formatNumber(quantities.pile_concrete_m3)} m³`,
              ],
              [
                "Total concrete",
                `${formatNumber(quantities.total_concrete_m3)} m³`,
              ],
              [
                "Reinforcement",
                `${formatNumber(quantities.total_rebar_tonnes)} t`,
              ],
              ["Formwork", `${formatNumber(quantities.formwork_m2)} m²`],
              ["Facade area", `${formatNumber(quantities.facade_area_m2)} m²`],
              ["Core wall thickness", `${geometry.core_wall_thickness_m} m`],
              ["Column size at base", `${gravity.column_size_mm} mm`],
              [
                "Gravity load",
                `${formatNumber(gravity.total_gravity_load_mn)} MN`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Indicative programme
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Substructure", `${schedule.substructure_days} days`],
              ["Structure", `${schedule.structure_days} days`],
              ["Facade and fitout", `${schedule.facade_and_fitout_days} days`],
              ["Total", `${schedule.total_days} days`],
              ["In months", `${schedule.total_months}`],
              ["Cycle per floor", `${schedule.floor_cycle_days} days`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
            A five day structural cycle is typical for a well supplied concrete
            tower; three to four days per floor is achievable with a climbing
            formwork system and a two day cycle has been recorded on repeatable
            cores. The durations here exclude authority approvals and
            procurement.
          </p>
        </div>
      </section>

      <AdSlot slotKey="calculator_native" className="my-6" />

      <section
        className="space-y-3 rounded-2xl border border-border bg-card p-5"
        aria-label="Architectural planning"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-purple" />
          <h2 className="text-sm font-semibold text-foreground">
            Architectural mathematics
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {params.occupancy}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {[
            ["Lettable efficiency", `${architecture.efficiencyPct}%`],
            [
              "Net lettable area",
              `${formatNumber(architecture.netLettableAreaM2)} m²`,
            ],
            ["Core to plate", `${architecture.coreToPlateRatioPct}%`],
            [
              "Facade to floor",
              formatNumber(architecture.facadeToFloorRatio, 3),
            ],
            ["Daylit area", `${architecture.daylitPct}% of plate`],
            ["Clear height", `${architecture.clearHeightM} m`],
            [
              "Occupants per floor",
              formatNumber(architecture.occupantsPerFloor, 1),
            ],
            [
              "Occupants in building",
              formatNumber(architecture.totalOccupants),
            ],
            ["Lift cars required", String(architecture.lifts.carsRequired)],
            ["Lift interval", `${architecture.lifts.intervalS} s`],
            ["Handling capacity", `${architecture.lifts.handlingCapacityPct}%`],
            [
              "Lift core needed",
              `${formatNumber(architecture.lifts.coreAreaNeededM2)} m²`,
            ],
            [
              "Egress width required",
              `${architecture.egressWidthRequiredMm} mm`,
            ],
            [
              "Egress width provided",
              `${architecture.egressWidthProvidedMm} mm`,
            ],
            ["Exits required", String(architecture.exitsRequired)],
            ["Round trip time", `${architecture.lifts.roundTripTimeS} s`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {architecture.proof.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Lift traffic uses the round trip form with probable stops S = N (1 -
          (1 - 1/N)^P), a seven second stop and 1.2 seconds per passenger.
          Egress width follows IBC 1005.3.2 at 5 mm per occupant with a 1,120 mm
          minimum. Both are planning figures, not a traffic study or a fire
          engineered analysis.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">
          How the numbers are produced
        </h2>
        <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Loads</p>
            <p>
              Dead load, partitions, slab self weight at 24 kN/m³ and a beam
              allowance are summed per floor. Live load is reduced by ASCE 7-22
              4.7.2 with KLL 4 over the column tributary area, with the 0.4
              floor for members carrying two or more floors. Column size follows
              a service axial stress of 0.30 fck, which corresponds to a lightly
              reinforced stocky column.
            </p>
            <p className="font-semibold text-foreground">Wind</p>
            <p>
              Kz uses the ASCE 7-22 26.11 power law, checked against the
              published 10 m values of 0.70, 0.98 and 1.20. The gust effect
              factor follows 26.11.5, with a background term from the turbulence
              intensity and the size of the building, and a resonant term from
              the first frequency, the damping and the mode shape integrals.
              Velocity pressure is integrated storey by storey in both plan
              directions, so base shear and overturning come from the actual
              height profile rather than a single top pressure.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Drift and stability</p>
            <p>
              Lateral stiffness is built from the plan rather than assumed: the
              core section, plus the perimeter column axial stiffness, sum of
              area times distance squared, engaged by a stated fraction for the
              system, or the perimeter tube treated as a thin wall. That gives
              the first frequency, and the same stiffness produces the drift by
              virtual work with the flexural and shear terms separated, so the
              period and the deflection cannot disagree. Ec is 4700 sqrt(fck)
              MPa with the ACI 318-19 cracked factor of 0.70. The stability
              coefficient follows the ASCE 7-22 12.8.7 form at the storey where
              it peaks, and a plus or minus 50 percent stiffness band is
              reported with the drift.
            </p>
            <p className="font-semibold text-foreground">Foundation</p>
            <p>
              The raft is checked as a rigid plate for axial load plus the
              governing overturning moment. Piles use the alpha method in clay
              and the beta method in sand for shaft friction, with Meyerhof SPT
              end bearing qp = 40 N (L/D) capped at 400 N. The count is solved
              with the Converse-Labarre group efficiency, so the peak pile load,
              the far face uplift and the group capacity stay consistent.
              Settlement comes from the equivalent raft at two thirds of the
              pile length, reported with a band and as angular distortion, and
              the core is checked for punching shear on the raft to EN 1992-1-1
              6.4.4.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
          <strong>Limits.</strong> This screen does not replace a structural
          analysis, a geotechnical investigation, a wind tunnel study, or a code
          submission. It uses single cantilever stiffness, elastic pile group
          distribution and assumed dynamic parameters. Soil values, spectral
          accelerations and wind speeds must come from the site and the
          governing authority. Show the output to a licensed structural engineer
          before any construction decision.
        </div>
      </section>

      <FaqItemsWithSchema faqs={TALL_FAQS} title="Tall building questions" />

      <RelatedToolsLinks />
    </div>
  );
}
