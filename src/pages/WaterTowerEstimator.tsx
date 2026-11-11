import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import AdSlot from "@/components/ui/AdSlot";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useMemo, useState } from "react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Download,
  Ruler,
  ShieldAlert,
  Building2,
  Droplets,
  Layers,
} from "lucide-react";
import {
  calculateWaterTowerStaging,
  TANK_SIZE_PRESETS,
} from "@/lib/estimation/water-tower-staging-engine";
import WaterTowerInstallationSequence from "@/components/tools/WaterTowerInstallationSequence";
import { buildSequenceHowTo } from "@/lib/build-sequence-seo";

export default function WaterTowerEstimator() {
  const resetInputs = () => {
    setTankVolume(5000);
    setHeight(6);
    setMaterial("steel");
  };
  const [tankVolume, setTankVolume] = useState<number>(5000);
  const [height, setHeight] = useState<number>(6);
  const [material, setMaterial] = useState<"steel" | "concrete">("steel");

  const result = useMemo(() => {
    return calculateWaterTowerStaging({
      tankVolumeLiters: tankVolume,
      towerHeightMeters: height,
      constructionMaterial: material,
    });
  }, [tankVolume, height, material]);

  useSeo({
    title: "Overhead Water Tank Staging & Tower Estimator | FRELUX",
    description:
      "Dead load, wind overturning factor, pad footing sizes and leg sections for elevated steel or concrete water tank towers, with a material bill of quantities and a step by step animated build sequence of the eight site steps.",
    canonicalPath: "/water-tower-staging-estimator",
    structuredData: buildSequenceHowTo({
      name: "Build an overhead water tank staging",
      description:
        "Set out and pour the pad footings, build the legs, brace the frame, deck the platform, land the tank and fill test it.",
      steps: result.installationSteps,
      path: "/water-tower-staging-estimator",
      totalTime: "P2D",
      supply: [
        "Cement, sand and granite for the pad and leg concrete",
        "Y16 main bars and Y8 links, or structural steel legs and angle iron",
        "Timber joists and platform boards",
        "Tank, riser pipe, overflow and fittings",
      ],
      tool: [
        "Excavation tools",
        "Concrete mixer",
        "Spirit level",
        "Wrench set",
      ],
    }),
  });

  const exportCsv = () => {
    const rows: string[][] = [
      ["FRELUX Overhead Water Tank Staging Takeoff", ""],
      ["Tank Volume (Liters)", String(tankVolume)],
      ["Tower Elevation Height (m)", String(height)],
      [
        "Structural Material",
        material === "steel" ? "Structural Steel" : "Reinforced Concrete",
      ],
      ["Dead Load Total (kg)", String(result.deadLoadTotalKg)],
      ["Dead Load Total (Tons)", (result.deadLoadTotalKg / 1000).toFixed(2)],
      [
        "Wind Overturning Safety Factor",
        String(result.overturningSafetyFactor),
      ],
      ["Wind Force (kN)", String(result.windForceKn)],
      ["Base Width (m)", String(result.baseSizeMeters)],
      [
        "Pad Footing Size (m)",
        `${result.footing.padSizeMeters} x ${result.footing.padSizeMeters} x ${result.footing.padThicknessMm}mm`,
      ],
      ["Load per Leg (kN)", String(result.footing.serviceLoadPerLegKn)],
      ["Leg Section", result.legDesign.sectionLabel],
      [
        "Leg Utilisation",
        `${(result.legDesign.utilisation * 100).toFixed(0)}%`,
      ],
      ["Structural Design Load (kN)", String(result.designLoadKn)],
      ["--- MATERIAL BILL OF QUANTITIES ---", ""],
    ];

    if (material === "steel") {
      rows.push([
        "Vertical H-Beam Structural Posts (linear meters)",
        String(result.structuralBOM.structuralHBeamsMeters),
      ]);
      rows.push([
        "Angle Iron Diagonal X-Bracing (meters)",
        String(result.structuralBOM.angleIronBracingMeters),
      ]);
      rows.push([
        "2x6 Hardwood Timber Platform Boards (pieces)",
        String(result.structuralBOM.timberPlatform2x6Pieces),
      ]);
    } else {
      rows.push([
        "Concrete Volume 1:2:4 Mix (m3)",
        String(result.structuralBOM.concreteVolumeM3),
      ]);
      rows.push([
        "Cement 50kg Bags",
        String(result.structuralBOM.cementBags50kg),
      ]);
      rows.push([
        "Clean Sharp Sand (m3)",
        String(result.structuralBOM.sandCubicMeters),
      ]);
      rows.push([
        "Granite / Gravel (m3)",
        String(result.structuralBOM.gravelCubicMeters),
      ]);
      rows.push([
        "Vertical Y16 High-Yield Rebar (12m commercial lengths)",
        String(result.structuralBOM.verticalRebarY16Lengths),
      ]);
      rows.push([
        "Y8 Stirrups / Links (12m commercial lengths)",
        String(result.structuralBOM.stirrupsRebarY8Lengths),
      ]);
      rows.push([
        "2x6 Timber Platform Base Boards (pieces)",
        String(result.structuralBOM.timberPlatform2x6PiecesConcrete),
      ]);
    }

    rows.push([
      "Disclaimer",
      "Preliminary material takeoff only. Elevation above 3m creates concentrated high dead loads and lateral wind overturning moments. A licensed structural engineer must review and approve foundations, column capacity, and connection details.",
    ]);

    const csvContent = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `frelux-water-tower-${tankVolume}L-${height}m-${material}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="tool"
        eyebrow="Structural & Plumbing Engineering"
        title="Borehole & Overhead Water Tank Staging Estimator"
        subtitle="Structural physics dead load estimation, wind safety cross-bracing, and material Bill of Materials for elevated water towers."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Water Tank Staging & Tower" },
        ]}
      />

      <Container className="py-8 space-y-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Input Controls */}
          <div className="min-w-0 lg:col-span-5 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" /> Staging Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tank Size Dropdown */}
                <div className="space-y-2">
                  <label
                    htmlFor="tank-preset"
                    className="text-sm font-medium text-foreground flex items-center justify-between"
                  >
                    <span>Tank Capacity</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {tankVolume.toLocaleString()} Liters
                    </Badge>
                  </label>
                  <select
                    id="tank-preset"
                    value={tankVolume}
                    onChange={(e) => setTankVolume(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {TANK_SIZE_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tower Height Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="tower-height"
                      className="text-sm font-medium text-foreground"
                    >
                      Tower Elevation Height
                    </label>
                    <span className="text-sm font-bold text-primary">
                      {height} Meters
                    </span>
                  </div>
                  <input
                    id="tower-height"
                    type="range"
                    min="3"
                    max="9"
                    step="0.5"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3.0m (Standard)</span>
                    <span>6.0m (High Pressure)</span>
                    <span>9.0m (Multi-Floor)</span>
                  </div>
                </div>

                {/* Support Material Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Construction Material
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMaterial("steel")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        material === "steel"
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Layers className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">Structural Steel</span>
                      <span className="text-[10px] text-muted-foreground">
                        H-Beams + Angle Braces
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterial("concrete")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        material === "concrete"
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Building2 className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">Reinforced Concrete</span>
                      <span className="text-[10px] text-muted-foreground">
                        4x 230mm Columns
                      </span>
                    </button>
                  </div>
                </div>

                {/* Safety Warning */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" /> Preliminary Takeoff Only
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A {tankVolume.toLocaleString()}L tank places over{" "}
                    {(result.deadLoadTotalKg / 1000).toFixed(1)} tons of dead
                    load overhead. A licensed structural engineer must approve
                    the foundation pad and soil bearing capacity before
                    erection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Anchor & Structural Physics Output */}
          <div className="min-w-0 lg:col-span-7 space-y-6">
            {/* Animated installation sequence */}
            <Card className="border-border overflow-hidden bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> How the
                    staging is built, step by step
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-xs font-mono shrink-0"
                  >
                    {Math.max(1, Math.round(height / 3))} bracing tiers
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <WaterTowerInstallationSequence
                  steps={result.installationSteps}
                  material={material}
                  heightMeters={height}
                  hasFootings={result.footing.padSizeMeters > 0}
                />
              </CardContent>
            </Card>

            {/* Load and stability metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card className="border-border p-4 bg-card">
                <span className="text-xs text-muted-foreground block">
                  Dead Load (Water + Tank + Deck)
                </span>
                <span className="text-xl font-bold text-foreground mt-1 block">
                  {(result.deadLoadTotalKg / 1000).toFixed(2)} t
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {result.deadLoadTotalKg.toLocaleString()} kg
                </span>
              </Card>

              <Card className="border-border p-4 bg-card">
                <span className="text-xs text-muted-foreground block">
                  Wind Overturning Factor
                </span>
                <span
                  className={`text-xl font-bold mt-1 block ${
                    result.overturningSafetyFactor >= 1.5
                      ? "text-foreground"
                      : "text-destructive"
                  }`}
                >
                  {result.overturningSafetyFactor}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {result.windForceKn} kN wind, 1.5 required
                </span>
              </Card>

              <Card className="border-border p-4 bg-card col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground block">
                  Design Load
                </span>
                <span className="text-xl font-bold text-primary mt-1 block">
                  {result.designLoadKn} kN
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {result.footing.serviceLoadPerLegKn} kN worst leg
                </span>
              </Card>
            </div>

            {/* Footing and leg design */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Foundation and leg
                  design
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Pad footings</span>
                  <span className="font-mono text-foreground">
                    {result.footing.legs} x {result.footing.padSizeMeters} x{" "}
                    {result.footing.padSizeMeters} m x{" "}
                    {result.footing.padThicknessMm} mm
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Leg section</span>
                  <span className="font-mono text-foreground text-right">
                    {result.legDesign.sectionLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Utilisation</span>
                  <span
                    className={`font-mono ${
                      result.legDesign.pass
                        ? "text-foreground"
                        : "text-destructive"
                    }`}
                  >
                    {(result.legDesign.utilisation * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Governing check: {result.legDesign.governingCheck}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Base {result.baseSizeMeters} m square, tank{" "}
                  {result.tankDiameterMeters} m diameter, deck weight{" "}
                  {result.deckWeightKg} kg.
                </p>
              </CardContent>
            </Card>

            {result.warnings.length > 0 && (
              <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10 shadow-sm">
                <CardContent className="pt-4 space-y-2">
                  {result.warnings.map((w) => (
                    <p
                      key={w}
                      className="text-xs text-foreground flex items-start gap-2"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                      <span>{w}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Output BOM Schedule */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-primary" /> Structural Bill
                  of Materials (BOM)
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportCsv}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Export Schedule
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <CalculatorResetButton onReset={resetInputs} className="mb-4" />
                <HowCalculatedSection
                  methodologyText={methodologyText("water-tower")}
                />
                <ShareEstimateButton
                  estimate={{
                    kind: "Overhead Tank Staging Takeoff",
                    title: `${tankVolume} L tank at ${height} m`,
                    summaryLines: [
                      {
                        label: "Tank volume",
                        value: `${tankVolume} L`,
                      },
                      {
                        label: "Tower height",
                        value: `${height} m`,
                      },
                      {
                        label: "Structural material",
                        value:
                          material === "steel"
                            ? "Structural steel"
                            : "Reinforced concrete",
                      },
                      {
                        label: "Pad footing",
                        value: `${result.footing.padSizeMeters} x ${result.footing.padSizeMeters} x ${result.footing.padThicknessMm} mm`,
                      },
                      {
                        label: "Leg section",
                        value: result.legDesign.sectionLabel,
                      },
                    ],
                    lineItems: [
                      {
                        description: "Dead load",
                        quantity: `${(result.deadLoadTotalKg / 1000).toFixed(2)} t`,
                      },
                      {
                        description: "Wind force",
                        quantity: `${result.windForceKn} kN`,
                      },
                      {
                        description: "Service load per leg",
                        quantity: `${result.footing.serviceLoadPerLegKn} kN`,
                      },
                      {
                        description: "Design load",
                        quantity: `${result.designLoadKn} kN`,
                      },
                    ],
                    totals: [
                      {
                        label: "Wind overturning safety factor",
                        value: String(result.overturningSafetyFactor),
                      },
                      {
                        label: "Leg utilisation",
                        value: `${(result.legDesign.utilisation * 100).toFixed(0)}%`,
                        emphasized: true,
                      },
                    ],
                    link: "/water-tower-staging-estimator",
                  }}
                  compact
                />
                {material === "steel" ? (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Vertical Stand Pillars
                        </div>
                        <div className="text-xs text-muted-foreground">
                          4x Structural Steel H-Beams / Heavy SHS
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.structuralHBeamsMeters} m
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          4 lengths @ {height}m
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Cross-Bracing Angle Iron
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Heavy-gauge diagonal X-braces & horizontal ties
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.angleIronBracingMeters} m
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Across {Math.max(1, Math.round(height / 3))} tiers
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Plank Platform Base
                        </div>
                        <div className="text-xs text-muted-foreground">
                          2x6 Structural Hardwood Timber boards
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.timberPlatform2x6Pieces} Pieces
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Even weight distribution
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Reinforced Concrete Volume
                        </div>
                        <div className="text-xs text-muted-foreground">
                          4x 230x230mm Columns (1:2:4 Grade C15/M15)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.concreteVolumeM3} m³
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Cast-in-place columns
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
                        <span className="text-[11px] text-muted-foreground block">
                          Cement
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {result.structuralBOM.cementBags50kg} Bags
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          50kg bags
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
                        <span className="text-[11px] text-muted-foreground block">
                          Sharp Sand
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {result.structuralBOM.sandCubicMeters} m³
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Clean washed
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
                        <span className="text-[11px] text-muted-foreground block">
                          Granite
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {result.structuralBOM.gravelCubicMeters} m³
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          3/4" aggregate
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Vertical Rebar (16mm Y16)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          4 bars per pillar × 4 pillars
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.verticalRebarY16Lengths} Lengths
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Standard 12m commercial bars
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Column Stirrups / Links (8mm Y8)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tied at 200mm centers
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.stirrupsRebarY8Lengths} Lengths
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Standard 12m commercial bars
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Platform Timber Decking
                        </div>
                        <div className="text-xs text-muted-foreground">
                          2x6 Structural Hardwood boards
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground font-mono">
                          {result.structuralBOM.timberPlatform2x6PiecesConcrete}{" "}
                          Pieces
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Tank platform base
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
      <div className="mt-10">
        <RelatedTools
          links={[
            CALC_LINKS.structuralCalc,
            CALC_LINKS.foundationCalc,
            CALC_LINKS.buildToRoof,
          ]}
        />
      </div>

      <EstimateDisclaimer />
    </div>
  );
}
