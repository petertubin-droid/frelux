import React, { useEffect, useMemo, useState } from "react";
import ToolShell from "@/components/tools/ToolShell";
import { resolveEifsPrices } from "@/lib/estimation/icf-eifs-market";
import { BoqPricingPanel } from "@/components/tools/BoqPricingPanel";
import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import { useSeo, useFaqJsonLd, useBreadcrumbJsonLd } from "@/lib/seo";

import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import type { ShareableEstimate } from "@/lib/estimate-sharing";
import { formatMoney } from "@/lib/estimation/system-boq-pricing";
import { useSystemBoqPricing } from "@/lib/estimation/use-system-boq-pricing";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/shadcn/card";
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
  Copy,
  Download,
  HardHat,
  Layers,
  Plus,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Thermometer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateEifsWall,
  type EifsSubstrateType,
  type EifsInsulationType,
  type EifsThicknessMm,
  type EifsSystemType,
  type EifsAttachmentMethod,
  type EifsFinishTexture,
  type EifsOpening,
  type EifsWallInput,
} from "@/lib/estimation/eifs-engine";
import EifsWallSchematic from "@/components/tools/EifsWallSchematic";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { useMarket } from "@/lib/international/market-context";

const EIFS_FAQ = [
  {
    question: "How many insulation boards do I need for an EIFS wall?",
    answer:
      "A standard board faces 1.2 m by 0.6 m, so 0.72 m2. Take the facade area, deduct the openings, then add back the reveal depth of every opening because the returns are clad too, and divide by 0.72. A 40 m wall 3 m high with four openings of 2 m2 covers 120 m2 less 8 m2 of openings plus the reveals, which is about 160 boards before the waste allowance.",
  },
  {
    question: "How much does an EIFS wall cost?",
    answer:
      "An EIFS wall is priced as a system, not as a single material: insulation board per square metre, adhesive or mechanical fixings, reinforcing mesh, base coat, primer and the textured finish, each at your market's own rate. This page prices each role from the market price book and shows the currency it used. Where a market has no recorded rate for a role, that line is reported as quantities only instead of borrowing another country's price.",
  },
  {
    question: "How to estimate an EIFS wall?",
    answer:
      "Start with the substrate, because sheathing takes adhesive while masonry may need mechanical fixings, and mineral wool needs washers either way. Add the water-resistive barrier, then the board, then the reinforcing mesh bedded in base coat, a heavier mesh below the impact height, then primer and the textured finish. Deduct openings but add their reveals, count starter track at the base, corner bead on every external corner and casing bead around every opening, and allow expansion joints on long runs.",
  },
];

import { useTechnicalLabels } from "@/lib/construction-dictionary/use-technical-labels";

export default function EifsWallEstimator() {
  const { t: tLabel } = useTechnicalLabels();
  useSeo({
    title: "EIFS Wall Estimator, Insulation, Mesh, Base Coat & Finish Takeoff",
    description:
      "Estimate an EIFS or ETICS wall: insulation boards, adhesive and fixings, reinforcing mesh, base coat, primer, textured finish and trims, priced in your own market.",
    canonicalPath: "/eifs-wall-estimator",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX EIFS Wall Estimator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  useFaqJsonLd(EIFS_FAQ);
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/construction-tools" },
    { name: "EIFS Wall Estimator", path: "/eifs-wall-estimator" },
  ]);
  const { marketCode } = useMarket();
  const [priceResolution, setPriceResolution] = useState<Awaited<
    ReturnType<typeof resolveEifsPrices>
  > | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPricesLoading(true);
    resolveEifsPrices(marketCode).then((res) => {
      if (!cancelled) {
        setPriceResolution(res);
        setPricesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [marketCode]);

  // Unit system toggle
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");

  // Core dimensional inputs
  const [wallLength, setWallLength] = useState<string>("40");
  const [wallHeight, setWallHeight] = useState<string>("3.0");
  const [cornersCount, setCornersCount] = useState<number>(4);

  // System & substrate inputs
  const [substrateType, setSubstrateType] =
    useState<EifsSubstrateType>("exterior_sheathing");
  const [systemType, setSystemType] =
    useState<EifsSystemType>("drainable_eifs");
  const [insulationType, setInsulationType] =
    useState<EifsInsulationType>("standard_eps");
  // Blank means "use the bracket above"; a value overrides it so a 30 mm or
  // 90 mm board (common outside the standard brackets) can be taken off.
  const [customThicknessMm, setCustomThicknessMm] = useState<string>("");
  const [insulationThicknessMm, setInsulationThicknessMm] =
    useState<EifsThicknessMm>(50);
  const [attachmentMethod, setAttachmentMethod] =
    useState<EifsAttachmentMethod>("dual_adhesive_mechanical");
  const [finishTexture, setFinishTexture] =
    useState<EifsFinishTexture>("medium_swirl");

  // High-impact ground mesh zone
  const [hasImpactMesh, setHasImpactMesh] = useState<boolean>(true);
  const [impactMeshHeightM, setImpactMeshHeightM] = useState<string>("2.0");

  // Openings
  const [openings, setOpenings] = useState<EifsOpening[]>([
    {
      id: "win-1",
      label: "Front Windows",
      widthM: 1.5,
      heightM: 1.2,
      count: 4,
      revealDepthMm: 100,
    },
    {
      id: "door-1",
      label: "Entry Door",
      widthM: 1.0,
      heightM: 2.1,
      count: 1,
      revealDepthMm: 100,
    },
  ]);

  // Operational parameters
  const [wastePct, setWastePct] = useState<number>(6);
  const [crewSize, setCrewSize] = useState<number>(4);

  // Conversion helpers
  const lengthM =
    unitSystem === "imperial"
      ? (Number(wallLength) || 0) * 0.3048
      : Number(wallLength) || 0;
  const heightM =
    unitSystem === "imperial"
      ? (Number(wallHeight) || 0) * 0.3048
      : Number(wallHeight) || 0;

  // Add opening handler
  const handleAddOpening = () => {
    const newId = `op-${Date.now()}`;
    setOpenings((prev) => [
      ...prev,
      {
        id: newId,
        label: `Opening ${prev.length + 1}`,
        widthM: unitSystem === "imperial" ? 3.0 * 0.3048 : 1.2,
        heightM: unitSystem === "imperial" ? 4.0 * 0.3048 : 1.5,
        count: 1,
        revealDepthMm: 100,
      },
    ]);
  };

  // Remove opening handler
  const handleRemoveOpening = (id: string) => {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  };

  // Update opening handler
  const handleUpdateOpening = <K extends keyof EifsOpening>(
    id: string,
    field: K,
    value: EifsOpening[K],
  ) => {
    setOpenings((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  // Reset all inputs
  const handleReset = () => {
    setUnitSystem("metric");
    setWallLength("40");
    setWallHeight("3.0");
    setCornersCount(4);
    setSubstrateType("exterior_sheathing");
    setSystemType("drainable_eifs");
    setInsulationType("standard_eps");
    setInsulationThicknessMm(50);
    setAttachmentMethod("dual_adhesive_mechanical");
    setFinishTexture("medium_swirl");
    setHasImpactMesh(true);
    setImpactMeshHeightM("2.0");
    setOpenings([
      {
        id: "win-1",
        label: "Front Windows",
        widthM: 1.5,
        heightM: 1.2,
        count: 4,
        revealDepthMm: 100,
      },
      {
        id: "door-1",
        label: "Entry Door",
        widthM: 1.0,
        heightM: 2.1,
        count: 1,
        revealDepthMm: 100,
      },
    ]);
    setWastePct(6);
    setCrewSize(4);
    toast.info("Inputs reset to standard defaults.");
  };

  // Run deterministic calculation engine
  const engineResult = useMemo(() => {
    const input: EifsWallInput = {
      wallLengthM: lengthM,
      wallHeightM: heightM,
      substrateType,
      insulationType,
      insulationThicknessMm,
      customInsulationThicknessMm: customThicknessMm.trim()
        ? Number(customThicknessMm)
        : undefined,
      systemType,
      attachmentMethod,
      finishTexture,
      openings,
      exteriorCornersCount: cornersCount,
      impactMeshHeightM: hasImpactMesh ? Number(impactMeshHeightM) || 2.0 : 0,
      wasteFactorPercent: wastePct,
      marketCode,
      laborCrewSize: crewSize,
    };
    return calculateEifsWall(input);
  }, [
    lengthM,
    heightM,
    substrateType,
    insulationType,
    insulationThicknessMm,
    systemType,
    attachmentMethod,
    finishTexture,
    openings,
    cornersCount,
    hasImpactMesh,
    impactMeshHeightM,
    wastePct,
    marketCode,
    crewSize,
  ]);

  // Prices come from the selected market's book only. A market with no
  // prices for this system resolves to nothing, and the BOQ stays
  // quantities only rather than borrowing another market's currency.
  const pricing = useSystemBoqPricing(engineResult?.boq, marketCode);

  // Copy BOQ to clipboard
  const handleCopyBoq = () => {
    const lines = [
      "FRELUX EIFS / ETICS Continuous Insulation Bill of Quantities",
      `Gross Wall Area: ${engineResult.geometry.grossAreaM2} m² | Net Facade Area: ${engineResult.geometry.netFacadeAreaM2} m²`,
      `Continuous Insulation: ${insulationThicknessMm}mm ${insulationType} | Continuous R-value: R-${engineResult.insulation.continuousRValueUS} (U-${engineResult.insulation.uFactorMetric})`,
      "----------------------------------------------------------------",
      "Item Code | Category | Description | Quantity | Unit | Notes",
      ...engineResult.boq.map(
        (b) =>
          `${b.code} | ${b.category.toUpperCase()} | ${b.description} | ${b.quantity} ${b.unit} | ${b.notes || ""}`,
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Bill of Quantities copied to clipboard.");
  };

  // Download BOQ as CSV
  const handleDownloadBoqCsv = () => {
    const rows = [
      ["Item Code", "Category", "Description", "Quantity", "Unit", "Notes"],
      ...engineResult.boq.map((b) => [
        b.code,
        b.category,
        `"${b.description.replace(/"/g, '""')}"`,
        b.quantity.toString(),
        b.unit,
        `"${(b.notes || "").replace(/"/g, '""')}"`,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Frelux_EIFS_Takeoff_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded.");
  };

  return (
    <ToolShell route="/eifs-wall-estimator">
      <Container className="py-6 space-y-6">
        {/* Top Control Bar with Unit Switch & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Measurement System:
            </span>
            <div className="inline-flex rounded-md border border-input bg-background p-0.5 shadow-xs">
              <Button
                type="button"
                size="sm"
                variant={unitSystem === "metric" ? "default" : "ghost"}
                className="h-7 text-xs px-3"
                onClick={() => setUnitSystem("metric")}
              >
                Metric (m, m²)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={unitSystem === "imperial" ? "default" : "ghost"}
                className="h-7 text-xs px-3"
                onClick={() => setUnitSystem("imperial")}
              >
                Imperial (ft, sq ft)
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
        </div>

        {/* Header Introduction */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-semibold text-primary border-primary/30"
            >
              Exterior Envelope & Cladding
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              Continuous Insulation (ci)
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            EIFS / ETICS Wall Estimator & Takeoff
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Deterministic material takeoff and building envelope scorecard for
            Exterior Insulation and Finish Systems (EIFS) and External Thermal
            Insulation Composite Systems (ETICS). Calculates fluid-applied
            water-resistive barriers, continuous rigid insulation boards, dual
            adhesive/mechanical fixings, alkali-resistant fiberglass mesh, base
            coat, textured synthetic finish coat, weep accessories, and thermal
            R-value compliance.
          </p>
        </div>

        {/* Warnings Banner */}
        {engineResult.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Building Code Compliance Notes:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {engineResult.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Errors Banner */}
        {engineResult.errors.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1 text-xs text-destructive">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Calculation Validation Errors:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {engineResult.errors.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive Schematic Component */}
        <EifsWallSchematic
          substrateType={substrateType}
          insulationType={insulationType}
          insulationThicknessMm={insulationThicknessMm}
          systemType={systemType}
          finishTexture={finishTexture}
          wallLengthM={lengthM}
          wallHeightM={heightM}
          hasOpenings={openings.length > 0}
          hasImpactMesh={hasImpactMesh}
        />

        {/* Input Configuration Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Wall Dimensions & Substrate */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Wall Geometry & Substrate Backing
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Perimeter, facade height, corners, and backing construction.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Total Wall Perimeter (
                    {unitSystem === "metric" ? "meters" : "feet"})
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    value={wallLength}
                    onChange={(e) => setWallLength(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Continuous exterior facade centerline
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Wall Height ({unitSystem === "metric" ? "meters" : "feet"})
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.1"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    From starter track to eave/parapet
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Outside 90° Corners Count
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="32"
                    value={cornersCount}
                    onChange={(e) =>
                      setCornersCount(
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      )
                    }
                    className="h-8 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Allocates corner beads & wind anchors
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Substrate Type</Label>
                  <Select
                    value={substrateType}
                    onValueChange={(val) =>
                      setSubstrateType(val as EifsSubstrateType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select substrate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exterior_sheathing">
                        Gypsum/OSB Sheathing on Studs
                      </SelectItem>
                      <SelectItem value="cmu_masonry">
                        CMU Concrete Masonry Unit
                      </SelectItem>
                      <SelectItem value="poured_concrete">
                        In-Situ Cast Concrete Wall
                      </SelectItem>
                      <SelectItem value="existing_brick_stucco">
                        Existing Sound Brick/Stucco
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    Defines WRB spread & fixing method
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    System Configuration
                  </Label>
                  <Select
                    value={systemType}
                    onValueChange={(val) =>
                      setSystemType(val as EifsSystemType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select system type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drainable_eifs">
                        Drainable EIFS (with Drainage Plane)
                      </SelectItem>
                      <SelectItem value="barrier_eifs">
                        Barrier EIFS (Face-Sealed)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    Drainage is code-mandated over framed walls
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Attachment Method
                  </Label>
                  <Select
                    value={attachmentMethod}
                    onValueChange={(val) =>
                      setAttachmentMethod(val as EifsAttachmentMethod)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select fixing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual_adhesive_mechanical">
                        Dual: Adhesive + Mechanical Fasteners
                      </SelectItem>
                      <SelectItem value="adhesive_only">
                        Adhesive Ribbon & Dab Only
                      </SelectItem>
                      <SelectItem value="mechanical_only">
                        Mechanical Washer Fasteners Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    Dual attachment delivers maximum wind resistance
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Insulation & Finish Specification */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base font-semibold">
                  Insulation & Synthetic Finish Coating
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Continuous insulation thickness, foam chemistry, and acrylic
                texture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Insulation Material
                  </Label>
                  <Select
                    value={insulationType}
                    onValueChange={(val) =>
                      setInsulationType(val as EifsInsulationType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select insulation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_eps">
                        Standard EPS (Type I, White)
                      </SelectItem>
                      <SelectItem value="graphite_neopor">
                        Neopor GPS (Graphite Enhanced)
                      </SelectItem>
                      <SelectItem value="mineral_wool">
                        Mineral Stone Wool (A1 Non-Combustible)
                      </SelectItem>
                      <SelectItem value="xps">
                        Extruded Polystyrene (XPS)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    {insulationType === "mineral_wool"
                      ? "A1 non-combustible for high-rise fire safety"
                      : "Lightweight continuous thermal break"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Insulation Thickness
                  </Label>
                  <Select
                    value={insulationThicknessMm.toString()}
                    onValueChange={(val) =>
                      setInsulationThicknessMm(
                        parseInt(val, 10) as EifsThicknessMm,
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select thickness" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">
                        25 mm (1.0 inch) - R-3.85
                      </SelectItem>
                      <SelectItem value="40">
                        40 mm (1.5 inch) - R-6.0
                      </SelectItem>
                      <SelectItem value="50">
                        50 mm (2.0 inch) - R-7.7
                      </SelectItem>
                      <SelectItem value="75">
                        75 mm (3.0 inch) - R-11.6
                      </SelectItem>
                      <SelectItem value="100">
                        100 mm (4.0 inch) - R-15.4
                      </SelectItem>
                      <SelectItem value="120">
                        120 mm (4.7 inch) - R-18.5
                      </SelectItem>
                      <SelectItem value="150">
                        150 mm (6.0 inch) - R-23.1
                      </SelectItem>
                      <SelectItem value="200">
                        200 mm (8.0 inch) - R-30.8
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    step={5}
                    inputMode="numeric"
                    placeholder="Custom board mm (10-300), optional"
                    value={customThicknessMm}
                    onChange={(e) => setCustomThicknessMm(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Continuous R-value: R-
                    {engineResult.insulation.continuousRValueUS} (U-
                    {engineResult.insulation.uFactorMetric} W/m²·K)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Textured Finish Coat
                  </Label>
                  <Select
                    value={finishTexture}
                    onValueChange={(val) =>
                      setFinishTexture(val as EifsFinishTexture)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select texture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fine_sand">
                        Fine Sand (1.0mm grain, ~2.2 kg/m²)
                      </SelectItem>
                      <SelectItem value="medium_swirl">
                        Medium Swirl (1.5mm grain, ~2.8 kg/m²)
                      </SelectItem>
                      <SelectItem value="coarse_rough">
                        Coarse Rough (2.0mm grain, ~3.6 kg/m²)
                      </SelectItem>
                      <SelectItem value="elastomeric_smooth">
                        Elastomeric Smooth (~2.0 kg/m²)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    100% acrylic polymer with DPR dirt resistance
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Cutting & Waste Factor (%)
                  </Label>
                  <Input
                    type="number"
                    min="2"
                    max="20"
                    value={wastePct}
                    onChange={(e) =>
                      setWastePct(
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      )
                    }
                    className="h-8 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Standard 5% - 8% for board rasping & mesh laps
                  </span>
                </div>
              </div>

              {/* High-Impact Armor Mesh Toggle */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      High-Impact Ground Mesh (Armor Mesh)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Extra heavy-duty 400 g/m² mesh for ground-level pedestrian
                      and vehicle impact protection.
                    </p>
                  </div>
                  <Switch
                    checked={hasImpactMesh}
                    onCheckedChange={setHasImpactMesh}
                  />
                </div>
                {hasImpactMesh && (
                  <div className="flex items-center gap-2 pt-1.5 border-t border-border/40">
                    <span className="text-[11px] font-medium text-foreground">
                      Armor Zone Height:
                    </span>
                    <Input
                      type="number"
                      min="1.0"
                      max="4.0"
                      step="0.5"
                      value={impactMeshHeightM}
                      onChange={(e) => setImpactMeshHeightM(e.target.value)}
                      className="h-7 w-20 text-xs text-center"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      meters above grade (standard 2.0m)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 3: Window & Door Openings with Reveal Deductions */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Window & Door Openings (Deductions & Butterfly Patches)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Subtracts face area, calculates rough flashing, corner mesh
                beads, and 45° anti-crack butterfly patches.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={handleAddOpening}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Opening
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {openings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No openings added. Gross wall area equals net facade area.
              </p>
            ) : (
              <div className="space-y-2">
                {openings.map((op) => (
                  <div
                    key={op.id}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:grid-cols-6 items-center"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Label
                      </Label>
                      <Input
                        type="text"
                        value={op.label}
                        onChange={(e) =>
                          handleUpdateOpening(op.id, "label", e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Width ({unitSystem === "metric" ? "m" : "ft"})
                      </Label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={
                          unitSystem === "imperial"
                            ? Math.round((op.widthM / 0.3048) * 10) / 10
                            : op.widthM
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          handleUpdateOpening(
                            op.id,
                            "widthM",
                            unitSystem === "imperial" ? val * 0.3048 : val,
                          );
                        }}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Height ({unitSystem === "metric" ? "m" : "ft"})
                      </Label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={
                          unitSystem === "imperial"
                            ? Math.round((op.heightM / 0.3048) * 10) / 10
                            : op.heightM
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          handleUpdateOpening(
                            op.id,
                            "heightM",
                            unitSystem === "imperial" ? val * 0.3048 : val,
                          );
                        }}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Count
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={op.count}
                        onChange={(e) =>
                          handleUpdateOpening(
                            op.id,
                            "count",
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          )
                        }
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveOpening(op.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <span>
                Total Openings Deducted:{" "}
                <strong>{engineResult.geometry.openingsCount}</strong>
              </span>
              <span>
                Openings Area:{" "}
                <strong>{engineResult.geometry.openingsAreaM2} m²</strong>
              </span>
              <span>
                Perimeter:{" "}
                <strong>{engineResult.geometry.openingsPerimeterM} m</strong>
              </span>
              <span>
                45° Butterfly Patches:{" "}
                <strong>
                  {engineResult.reinforcing.butterflyPatchesCount} pcs
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Key Takeoff Scorecard Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Net Facade Area
            </span>
            <div className="mt-1 text-xl font-bold text-foreground">
              {engineResult.geometry.netFacadeAreaM2}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                m²
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Gross: {engineResult.geometry.grossAreaM2} m²
            </span>
          </Card>

          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Insulation Boards
            </span>
            <div className="mt-1 text-xl font-bold text-foreground">
              {engineResult.insulation.boardsCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                boards
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {engineResult.insulation.bundlesCount} factory bundles
            </span>
          </Card>

          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Continuous ci R-Value
            </span>
            <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
              R-{engineResult.insulation.continuousRValueUS}
            </div>
            <span className="text-[10px] text-muted-foreground">
              U-{engineResult.insulation.uFactorMetric} W/m²·K
            </span>
          </Card>

          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AR Mesh (50m² Rolls)
            </span>
            <div className="mt-1 text-xl font-bold text-foreground">
              {engineResult.reinforcing.standardMeshRolls50M2}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                rolls
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              + {engineResult.reinforcing.highImpactMeshRolls25M2} armor rolls
            </span>
          </Card>

          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Base Coat Mortar
            </span>
            <div className="mt-1 text-xl font-bold text-foreground">
              {engineResult.reinforcing.baseCoatBags25Kg}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                bags
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              25kg dry mix ({engineResult.reinforcing.baseCoatKg} kg)
            </span>
          </Card>

          <Card className="p-3 shadow-xs border-border/80 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Textured Finish Coat
            </span>
            <div className="mt-1 text-xl font-bold text-primary">
              {engineResult.finish.finishPails25Kg}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                pails
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              25kg acrylic ({engineResult.finish.finishCoatKg} kg)
            </span>
          </Card>
        </div>

        {/* Detailed Material Schedules Tabs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Schedule 1: WRB & Insulation */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  1. Weather Barrier & Insulation
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Fluid WRB Air Barrier:
                </span>
                <span className="font-semibold">
                  {engineResult.wrbAndDrainage.fluidWrbPails5Gal} pails (5-gal)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Rough Opening Flashing Tape:
                </span>
                <span className="font-semibold">
                  {engineResult.wrbAndDrainage.flashingTapeRolls} rolls (22.8m)
                </span>
              </div>
              {systemType === "drainable_eifs" && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">
                    Drainage Cavity Mat:
                  </span>
                  <span className="font-semibold">
                    {engineResult.wrbAndDrainage.drainageMatRolls} rolls
                    (37.1m²)
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Insulation Board Size:
                </span>
                <span className="font-semibold">
                  1200mm x 600mm x {insulationThicknessMm}mm
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Total Insulation Volume:
                </span>
                <span className="font-semibold">
                  {engineResult.insulation.totalVolumeM3} m³
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  Adhesive Spread (25kg bags):
                </span>
                <span className="font-semibold">
                  {engineResult.attachment.adhesiveBags25Kg} bags (
                  {engineResult.attachment.adhesiveKg} kg)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Schedule 2: Reinforcing Mesh & Accessories */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-semibold">
                  2. Reinforcement & Trims
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Field Mesh (160 g/m²):
                </span>
                <span className="font-semibold">
                  {engineResult.reinforcing.standardMeshRolls50M2} rolls (
                  {engineResult.reinforcing.standardMeshAreaM2} m²)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Ground Armor Mesh (400 g/m²):
                </span>
                <span className="font-semibold">
                  {engineResult.reinforcing.highImpactMeshRolls25M2} rolls (
                  {engineResult.reinforcing.highImpactAreaM2} m²)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Butterfly Corner Patches:
                </span>
                <span className="font-semibold">
                  {engineResult.reinforcing.butterflyPatchesCount} pcs (45°
                  diagonal)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  PVC Starter Weep Track:
                </span>
                <span className="font-semibold">
                  {engineResult.accessories.starterTrackPieces3M} pcs (3m
                  lengths)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Corner Beads with Mesh:
                </span>
                <span className="font-semibold">
                  {engineResult.accessories.cornerBeadPieces3M} pcs (3m lengths)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  Perimeter Joint Sealant:
                </span>
                <span className="font-semibold">
                  {engineResult.accessories.sealantSausages600Ml} sausages
                  (600ml)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Schedule 3: Finish & Labor Productivity */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold">
                  3. Finish Coating & Labor
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Tinted Acrylic Primer:
                </span>
                <span className="font-semibold">
                  {engineResult.finish.primerPails20Kg} pails (20kg)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Textured Finish Pails:
                </span>
                <span className="font-semibold">
                  {engineResult.finish.finishPails25Kg} pails (25kg)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Finish Spread Rate:
                </span>
                <span className="font-semibold">
                  {engineResult.finish.spreadRateKgPerM2} kg/m²
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Installation Crew Size:
                </span>
                <span className="font-semibold">
                  {engineResult.labor.crewSize} certified mechanics
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Total On-Site Man-Hours:
                </span>
                <span className="font-semibold">
                  {engineResult.labor.totalManHours} hours
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  Estimated Project Duration:
                </span>
                <span className="font-semibold">
                  {engineResult.labor.estimatedWorkingDays} working days
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <ShareEstimateButton
            estimate={eifsShareableEstimate(engineResult, pricing)}
            showPdf
          />
        </div>

        {/* Itemized Bill of Quantities (BOQ) */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Itemized Bill of Quantities (BOQ)
              </CardTitle>
              <CardDescription className="text-xs">
                Physical specification and procurement schedule across all
                cladding trades.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleCopyBoq}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleDownloadBoqCsv}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Specification Notes</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {engineResult.boq.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2 px-3 font-bold text-foreground">
                        {item.code}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-sans capitalize"
                        >
                          {tLabel(item.category)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-sans text-foreground">
                        {tLabel(item.description)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-foreground">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-sans">
                        {item.unit}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-sans text-[11px]">
                        {item.notes || "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground font-sans whitespace-nowrap">
                        {pricing.lines[item.code]
                          ? `${formatMoney(pricing.lines[item.code].rate, pricing.lines[item.code].currency)}/${pricing.lines[item.code].unit}`
                          : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-foreground whitespace-nowrap">
                        {pricing.lines[item.code]
                          ? formatMoney(
                              pricing.lines[item.code].amount,
                              pricing.lines[item.code].currency,
                            )
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              {pricing.loading ? (
                <p className="text-muted-foreground">
                  Resolving {marketCode} material prices...
                </p>
              ) : pricing.currency ? (
                <p className="font-semibold text-foreground">
                  Priced materials subtotal:{" "}
                  {formatMoney(pricing.total, pricing.currency)}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  No EIFS material prices are recorded for {marketCode} yet, so
                  this BOQ is quantities only.
                </p>
              )}
              <p className="text-muted-foreground">
                {Object.keys(pricing.lines).length} of {engineResult.boq.length}{" "}
                lines priced. WRB, drainage, trims and labour are quantities
                only; no market price is recorded for them.
              </p>
              {pricing.unitMismatches.length > 0 && (
                <p className="text-amber-600">
                  Excluded on a unit check, because the catalogue unit does not
                  match the priced unit: {pricing.unitMismatches.join(", ")}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Structural Code Citations */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Structural & Energy Code Citations
            </CardTitle>
            <CardDescription className="text-xs">
              Jurisdictional standards governing continuous exterior insulation
              and drainage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {engineResult.codeCitations.map((c) => (
                <div
                  key={c.code}
                  className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {c.jurisdiction}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono"
                    >
                      {c.code}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-primary font-medium">
                    {c.clause}
                  </p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {c.summary}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <BoqPricingPanel
          boq={engineResult.boq.map((b) => ({
            code: b.code,
            description: b.description,
            quantity: b.quantity,
            unit: b.unit,
          }))}
          resolution={priceResolution}
          currencyCode={getActiveDisplayCurrency()}
          loading={pricesLoading}
        />

        {/* How It's Calculated Accordion & Estimation Disclaimer */}
        <HowCalculatedSection
          methodologyText={`1. Facade Geometry & Deductions: Centerline wall perimeter and height calculate total gross facade area. Windows, doors, and garage openings are subtracted to yield net surface area, while reveal depths along jambs and sills are added to accurately account for return insulation, corner beads, and finish coats.

2. Water-Resistive Barrier & Drainage Plane: Fluid-applied membrane coverage is calculated based on manufacturer two-coat dry film requirements (ASTM E2570). For framed walls, a continuous polypropylene drainage matrix or grooved EPS board is quantified to achieve >=90% drainage efficiency (ASTM E2273).

3. Continuous Insulation & Fixing Matrix: Rigid insulation board counts (1200mm x 600mm / 48" x 24") are calculated with an entered cutting and rasping allowance (default 6%). Polymer-modified cementitious adhesive is quantified for ribbon-and-dab perimeter application (~4.5-5.5 kg/m²), combined with wind-rated insulation washer anchors.

4. Multi-Layer Reinforcing Mesh System: Standard 160 g/m² alkali-resistant fiberglass mesh is quantified with mandatory 65mm (2.5-inch) overlapping edges. In high-traffic pedestrian zones, heavy-duty 400 g/m² armor mesh is added up to 2.0m height. Re-entrant window and door corners receive pre-cut 45° diagonal butterfly mesh patches to eliminate stress cracking.

5. Synthetic Acrylic Finish & Accessories: Dirt-pick-up resistant (DPR) acrylic texture finish and tinted acrylic primer are quantified in 25kg and 20kg pails based on selected aggregate grain size. PVC starter weep screeds, mesh corner beads, casing beads, and Class 50 low-modulus silicone/polyurethane joint sealants complete the physical bill of materials.`}
          assumptions={[
            "Insulation boards must be installed in a running bond pattern with staggered vertical joints; vertical seams must never align with window/door corners.",
            "Base coat must completely embed the reinforcing fiberglass mesh with zero mesh pattern visible through the wet or cured base coat.",
            "Starter weep screeds must terminate at least 50mm (2 inches) above finished grade or 100mm (4 inches) above unpaved ground.",
            "Sealant joints around all fenestrations require closed-cell polyethylene backer rod and low-modulus elastomeric sealant (ASTM C920 Class 25 or 50).",
            "Continuous insulation continuous R-value must be checked against local jurisdictional climate zone energy codes (ASHRAE 90.1, IECC, or EU EPBD).",
          ]}
        />

        <EstimateDisclaimer
          subject="EIFS / ETICS Wall Estimation"
          notes="Calculations are deterministic takeoffs for preliminary planning, contractor budgeting, and procurement. They do not replace job-specific structural engineering wind-load analysis, dew point hygrothermal calculations, or manufacturer system warranty specifications."
        />
      </Container>

      <div className="rounded-xl border border-border/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Questions this estimator answers
        </h2>
        {EIFS_FAQ.map((item) => (
          <div key={item.question} className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">
              {item.question}
            </h3>
            <p className="text-xs text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </ToolShell>
  );
}

/** The estimate in the shape the shared share sheet and PDF expect. */
function eifsShareableEstimate(
  result: ReturnType<typeof calculateEifsWall>,
  pricing: {
    total: number;
    currency: string | null;
    lines: Record<string, unknown>;
  },
): ShareableEstimate | null {
  if (!result?.ok) return null;
  const priced = Object.keys(pricing.lines).length > 0;
  return {
    kind: "EIFS Wall Estimate",
    summaryLines: [
      {
        label: "Net facade area",
        value: `${result.geometry.netFacadeAreaM2} m²`,
      },
      {
        label: "Insulation",
        value: `${result.insulation.thicknessMm} mm, ${result.insulation.type}`,
      },
      { label: "Boards", value: `${result.insulation.boardsCount}` },
      {
        label: "Continuous R",
        value: `R-${result.insulation.continuousRValueUS}`,
      },
      { label: "Base coat", value: `${result.reinforcing.baseCoatKg} kg` },
      { label: "Finish coat", value: `${result.finish.finishCoatKg} kg` },
    ],
    lineItems: result.boq.slice(0, 10).map((item) => ({
      description: item.description,
      quantity: `${item.quantity} ${item.unit}`,
    })),
    totals: [
      ...(priced
        ? [
            {
              label: "Priced materials",
              value: formatMoney(pricing.total, pricing.currency),
              emphasized: true,
            },
          ]
        : []),
      { label: "Labour", value: `${result.labor.totalManHours} man-hours` },
    ],
    notes: result.warnings.slice(0, 4),
    link: "/eifs-wall-estimator",
  };
}
