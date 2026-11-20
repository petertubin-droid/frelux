import React, { useEffect, useMemo, useState } from "react";
import ToolShell from "@/components/tools/ToolShell";
import { resolveIcfPrices } from "@/lib/estimation/icf-eifs-market";
import { BoqPricingPanel } from "@/components/tools/BoqPricingPanel";
import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import { useSeo, useFaqJsonLd, useBreadcrumbJsonLd } from "@/lib/seo";

import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import type { ShareableEstimate } from "@/lib/estimate-sharing";
import {
  formatMoney,
  type PricedBoqLine,
} from "@/lib/estimation/system-boq-pricing";
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
  CheckCircle2,
  Copy,
  Download,
  Flame,
  HardHat,
  Layers,
  Plus,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Thermometer,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateIcfWall,
  type IcfCoreThicknessMm,
  type IcfWallTemplate,
  ICF_WALL_TEMPLATES,
  type IcfFoamType,
  type IcfHorizontalCourses,
  type IcfOpening,
  type IcfRebarSize,
  type IcfVerticalSpacingMm,
  type IcfWallInput,
} from "@/lib/estimation/icf-engine";
import IcfWallSchematic from "@/components/tools/IcfWallSchematic";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { useMarket } from "@/lib/international/market-context";
import type {
  IcfFormSystem,
  IcfInteriorLining,
} from "@/lib/estimation/icf-engine";

const ICF_FAQ = [
  {
    question: "How many ICF blocks do I need for a wall?",
    answer:
      "Cover the wall face that remains after openings, divide by the block face area, and count corner pieces separately. A metric block faces 1.2 m by 0.4 m, so 0.48 m2, and a North American block faces 48 in by 16 in, so 1.23 m2. A 40 m wall 3 m high with 8 m2 of openings covers 112 m2, which is about 84 straight blocks on the 0.48 m2 face plus one corner pair per course at each corner, before cutting waste.",
  },
  {
    question: "How much does an ICF wall cost?",
    answer:
      "The material cost is the form blocks per square metre of wall face, the concrete per cubic metre of net core, and the reinforcement per kilogram of bar, each at your market's own rate. This page prices those three roles from the market price book and states the currency it used. Where a market has no recorded rate, it reports quantities only rather than converting another country's price.",
  },
  {
    question: "How to estimate an ICF wall?",
    answer:
      "Measure the perimeter and the height, then deduct the door and window openings. Choose the core thickness and the form family, because a waffle or screen form fills far less of the cavity than a flat one. Count form blocks from the net face, order concrete on the net core volume after the tie webs and openings are removed, and schedule the steel by position: starter dowels, vertical bars at your spacing, horizontal courses per lift, and a lintel cage over each opening. Add the bracing and the rough bucking, which are hired or cut on site rather than bought with the blocks.",
  },
];

import { useTechnicalLabels } from "@/lib/construction-dictionary/use-technical-labels";

export default function IcfWallEstimator() {
  const { t: tLabel } = useTechnicalLabels();
  useSeo({
    title: "ICF Wall Estimator, Form Blocks, Concrete Core & Rebar Takeoff",
    description:
      "Estimate an insulated concrete form wall: form blocks by shape, net concrete core volume, rebar by position, bracing and envelope properties, priced in your own market.",
    canonicalPath: "/icf-wall-estimator",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX ICF Wall Estimator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  useFaqJsonLd(ICF_FAQ);
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/construction-tools" },
    { name: "ICF Wall Estimator", path: "/icf-wall-estimator" },
  ]);
  const { marketCode } = useMarket();
  const [priceResolution, setPriceResolution] = useState<Awaited<
    ReturnType<typeof resolveIcfPrices>
  > | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPricesLoading(true);
    resolveIcfPrices(marketCode).then((res) => {
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
  const [coreThicknessMm, setCoreThicknessMm] =
    useState<IcfCoreThicknessMm>(150);
  // Blank means "use the bracket above". A value here overrides it, which is
  // how a buyer with a non-standard system (65 mm through 400 mm cores) gets a
  // takeoff instead of the nearest bracket.
  const [customCoreMm, setCustomCoreMm] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [foamType, setFoamType] = useState<IcfFoamType>("standard_eps");
  const [formSystem, setFormSystem] = useState<IcfFormSystem>("flat");
  const [foamThicknessMm, setFoamThicknessMm] = useState<number>(64);
  const [interiorLining, setInteriorLining] =
    useState<IcfInteriorLining>("gypsum_12_5");
  const [barsPerWeb, setBarsPerWeb] = useState<1 | 2>(1);
  const [barsPerCourse, setBarsPerCourse] = useState<1 | 2>(1);
  const [concreteWastePct, setConcreteWastePct] = useState<number>(5);

  // Corner and T-junction counts
  const [corners90, setCorners90] = useState<number>(4);
  const [corners45, setCorners45] = useState<number>(0);
  const [tWalls, setTWalls] = useState<number>(0);

  // Reinforcement inputs
  const [verticalRebarSize, setVerticalRebarSize] =
    useState<IcfRebarSize>("12M");
  const [verticalSpacingMm, setVerticalSpacingMm] =
    useState<IcfVerticalSpacingMm>(400);
  const [horizontalCourses, setHorizontalCourses] =
    useState<IcfHorizontalCourses>("every_course");

  // Openings
  const [openings, setOpenings] = useState<IcfOpening[]>([
    {
      id: "win-1",
      label: "Front Windows",
      widthM: 1.8,
      heightM: 1.2,
      count: 2,
    },
    { id: "door-1", label: "Entry Door", widthM: 1.0, heightM: 2.1, count: 1 },
  ]);

  // Operational options
  const [isBasement, setIsBasement] = useState<boolean>(false);
  const [wastePct, setWastePct] = useState<number>(4);
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
      },
    ]);
  };

  // Remove opening handler
  const handleRemoveOpening = (id: string) => {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  };

  // Update opening handler
  const handleUpdateOpening = <K extends keyof IcfOpening>(
    id: string,
    field: K,
    value: IcfOpening[K],
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
    setCoreThicknessMm(150);
    setFoamType("standard_eps");
    setFormSystem("flat");
    setFoamThicknessMm(64);
    setInteriorLining("gypsum_12_5");
    setBarsPerWeb(1);
    setBarsPerCourse(1);
    setConcreteWastePct(5);
    setCorners90(4);
    setCorners45(0);
    setTWalls(0);
    setVerticalRebarSize("12M");
    setVerticalSpacingMm(400);
    setHorizontalCourses("every_course");
    setOpenings([
      {
        id: "win-1",
        label: "Front Windows",
        widthM: 1.8,
        heightM: 1.2,
        count: 2,
      },
      {
        id: "door-1",
        label: "Entry Door",
        widthM: 1.0,
        heightM: 2.1,
        count: 1,
      },
    ]);
    setIsBasement(false);
    setWastePct(4);
    setCrewSize(4);
    setActiveTemplate(null);
    toast.info("Inputs reset to standard defaults.");
  };

  // A template only writes inputs. Openings are the project's, not the wall
  // type's, so they are left exactly as the user entered them.
  const applyTemplate = (template: IcfWallTemplate) => {
    const i = template.input;
    if (i.wallLengthM !== undefined) setWallLength(String(i.wallLengthM));
    if (i.wallHeightM !== undefined) setWallHeight(String(i.wallHeightM));
    if (i.coreThicknessMm !== undefined) {
      setCustomCoreMm("");
      setCoreThicknessMm(i.coreThicknessMm as IcfCoreThicknessMm);
    }
    if (i.corners90Count !== undefined) setCorners90(i.corners90Count);
    if (i.corners45Count !== undefined) setCorners45(i.corners45Count);
    if (i.tWallsCount !== undefined) setTWalls(i.tWallsCount);
    if (i.foamThicknessPerSideMm !== undefined)
      setFoamThicknessMm(i.foamThicknessPerSideMm);
    if (i.interiorLining !== undefined) setInteriorLining(i.interiorLining);
    if (i.isBasement !== undefined) setIsBasement(i.isBasement);
    if (i.formSystem !== undefined) setFormSystem(i.formSystem);
    if (i.verticalBarsPerWeb !== undefined) setBarsPerWeb(i.verticalBarsPerWeb);
    if (i.horizontalRebarCourses !== undefined)
      setHorizontalCourses(i.horizontalRebarCourses);
    if (i.verticalRebarSpacingMm !== undefined)
      setVerticalSpacingMm(i.verticalRebarSpacingMm as IcfVerticalSpacingMm);
    setActiveTemplate(template.id);
    toast.success(`${template.label} applied.`);
  };

  // Engine calculation
  const engineResult = useMemo(() => {
    const input: IcfWallInput = {
      wallLengthM: lengthM,
      wallHeightM: heightM,
      coreThicknessMm,
      customCoreThicknessMm: customCoreMm.trim()
        ? Number(customCoreMm)
        : undefined,
      foamType,
      formSystem,
      foamThicknessPerSideMm: foamThicknessMm,
      interiorLining,
      verticalBarsPerWeb: barsPerWeb,
      horizontalBarsPerCourse: barsPerCourse,
      concreteWastePercent: concreteWastePct,
      openings,
      corners90Count: corners90,
      corners45Count: corners45,
      tWallsCount: tWalls,
      verticalRebarSize,
      verticalRebarSpacingMm: verticalSpacingMm,
      horizontalRebarCourses: horizontalCourses,
      wasteFactorPercent: wastePct,
      isBasement,
      marketCode,
      laborCrewSize: crewSize,
    };
    return calculateIcfWall(input);
  }, [
    lengthM,
    heightM,
    coreThicknessMm,
    foamType,
    formSystem,
    foamThicknessMm,
    interiorLining,
    barsPerWeb,
    barsPerCourse,
    concreteWastePct,
    openings,
    corners90,
    corners45,
    tWalls,
    verticalRebarSize,
    verticalSpacingMm,
    horizontalCourses,
    wastePct,
    isBasement,
    marketCode,
    crewSize,
  ]);

  // Prices come from the selected market's book only. A market with no
  // prices for this system resolves to nothing, and the BOQ stays
  // quantities only rather than borrowing another market's currency.
  const pricing = useSystemBoqPricing(engineResult?.boq, marketCode);

  // Export BOQ as CSV
  const handleExportCsv = () => {
    const headers = [
      "Item Code",
      "Description",
      "Category",
      "Quantity",
      "Unit",
      "Notes",
    ];
    const rows = engineResult.boq.map((b) => [
      `"${b.code}"`,
      `"${b.description.replace(/"/g, '""')}"`,
      `"${b.category}"`,
      b.quantity,
      `"${b.unit}"`,
      `"${(b.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ICF_Wall_Takeoff_${coreThicknessMm}mm.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Bill of Quantities exported to CSV.");
  };

  // Copy BOQ to clipboard
  const handleCopyBoq = () => {
    const textLines = [
      `FRELUX Insulated Concrete Form (ICF) Takeoff Summary`,
      `Core Cavity: ${coreThicknessMm}mm | Form: ${formSystem} | Foam: ${foamType === "graphite_neopor" ? "Graphite EPS" : "Standard EPS"} ${foamThicknessMm}mm per face | Market: ${marketCode}`,
      `Net Wall Area: ${engineResult.geometry.netWallAreaM2} m² | Concrete: ${engineResult.concrete.totalVolumeM3} m³`,
      `Total Blocks: ${engineResult.blocks.totalBlocksCount} units | Rebar: ${engineResult.reinforcement.totalSteelWeightTonnes} tonnes`,
      `-------------------------------------------------------`,
      ...engineResult.boq.map(
        (b) =>
          `${b.code}\t${b.description}\t${b.quantity} ${b.unit}\t${b.notes || ""}`,
      ),
    ].join("\n");

    navigator.clipboard.writeText(textLines).then(
      () => toast.success("Takeoff copied to clipboard!"),
      () => toast.error("Could not access clipboard."),
    );
  };

  return (
    <ToolShell route="/icf-wall-estimator">
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
                Metric (Meters / m³)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={unitSystem === "imperial" ? "default" : "ghost"}
                className="h-7 text-xs px-3"
                onClick={() => setUnitSystem("imperial")}
              >
                Imperial (Feet / yd³)
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
        </div>

        {/* Templates: a starting point, not a locked configuration */}
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Start from a template
            </span>
            <span className="text-[11px] text-muted-foreground">
              Sets the wall and its specification. Your openings stay as they
              are.
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ICF_WALL_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                type="button"
                size="sm"
                variant={activeTemplate === template.id ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => applyTemplate(template)}
                title={template.description}
              >
                {template.label}
              </Button>
            ))}
          </div>
          {activeTemplate ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {
                ICF_WALL_TEMPLATES.find((t) => t.id === activeTemplate)
                  ?.description
              }
            </p>
          ) : null}
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Wall Geometry & Core Specification
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter perimeter centerline, height, and choose concrete core
                  thickness.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wallLength" className="text-xs font-medium">
                      Total Wall Perimeter (
                      {unitSystem === "metric" ? "m" : "ft"})
                    </Label>
                    <Input
                      id="wallLength"
                      type="number"
                      step="0.5"
                      min="1"
                      value={wallLength}
                      onChange={(e) => setWallLength(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="wallHeight" className="text-xs font-medium">
                      Wall Height ({unitSystem === "metric" ? "m" : "ft"})
                    </Label>
                    <Input
                      id="wallHeight"
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={wallHeight}
                      onChange={(e) => setWallHeight(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Concrete Core Cavity
                    </Label>
                    <Select
                      value={String(coreThicknessMm)}
                      onValueChange={(val) =>
                        setCoreThicknessMm(Number(val) as IcfCoreThicknessMm)
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">
                          100mm (4&quot;) Core
                        </SelectItem>
                        <SelectItem value="150">
                          150mm (6&quot;) Core - Standard
                        </SelectItem>
                        <SelectItem value="200">
                          200mm (8&quot;) Core - Heavy
                        </SelectItem>
                        <SelectItem value="250">
                          250mm (10&quot;) Core
                        </SelectItem>
                        <SelectItem value="300">
                          300mm (12&quot;) Core - Retaining
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={75}
                      max={400}
                      step={5}
                      inputMode="numeric"
                      placeholder="Custom core mm (75-400), optional"
                      value={customCoreMm}
                      onChange={(e) => setCustomCoreMm(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      EPS Foam Formulation
                    </Label>
                    <Select
                      value={foamType}
                      onValueChange={(val) => setFoamType(val as IcfFoamType)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard_eps">
                          Standard EPS
                        </SelectItem>
                        <SelectItem value="graphite_neopor">
                          Graphite EPS (higher R)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Form family, foam thickness and interior lining */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Form Family
                    </Label>
                    <Select
                      value={formSystem}
                      onValueChange={(val) =>
                        setFormSystem(val as IcfFormSystem)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">
                          Flat wall (full cavity)
                        </SelectItem>
                        <SelectItem value="waffle">
                          Waffle grid (large void)
                        </SelectItem>
                        <SelectItem value="screen">
                          Screen grid (larger void)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Foam per Face ({unitSystem === "metric" ? "mm" : "in"})
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      step={0.25}
                      value={
                        unitSystem === "metric"
                          ? foamThicknessMm
                          : Number((foamThicknessMm / 25.4).toFixed(2))
                      }
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        setFoamThicknessMm(
                          unitSystem === "metric"
                            ? raw
                            : Math.round(raw * 25.4),
                        );
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Interior Lining
                    </Label>
                    <Select
                      value={interiorLining}
                      onValueChange={(val) =>
                        setInteriorLining(val as IcfInteriorLining)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (unlined)</SelectItem>
                        <SelectItem value="gypsum_12_5">
                          12.5 mm gypsum
                        </SelectItem>
                        <SelectItem value="gypsum_15_9_type_x">
                          15.9 mm Type X
                        </SelectItem>
                        <SelectItem value="double_gypsum_12_5">
                          Double 12.5 mm
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Concrete Over-order (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={25}
                      value={concreteWastePct}
                      onChange={(e) =>
                        setConcreteWastePct(
                          Math.max(
                            0,
                            Math.min(25, Number(e.target.value) || 0),
                          ),
                        )
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Corners and Intersections */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      90° Corners
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={corners90}
                      onChange={(e) =>
                        setCorners90(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      45° Splay Corners
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={corners45}
                      onChange={(e) =>
                        setCorners45(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      T-Intersections
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={tWalls}
                      onChange={(e) =>
                        setTWalls(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Reinforcement Configuration */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Reinforcing Steel Grid Specification
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Bar Size
                      </Label>
                      <Select
                        value={verticalRebarSize}
                        onValueChange={(val) =>
                          setVerticalRebarSize(val as IcfRebarSize)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10M">10M (11.3mm)</SelectItem>
                          <SelectItem value="12M">12M (12mm) - Std</SelectItem>
                          <SelectItem value="16M">
                            16M (16mm) - Heavy
                          </SelectItem>
                          <SelectItem value="no4">US #4 (1/2&quot;)</SelectItem>
                          <SelectItem value="no5">US #5 (5/8&quot;)</SelectItem>
                          <SelectItem value="no6">US #6 (3/4&quot;)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Vertical Spacing
                      </Label>
                      <Select
                        value={String(verticalSpacingMm)}
                        onValueChange={(val) =>
                          setVerticalSpacingMm(
                            Number(val) as IcfVerticalSpacingMm,
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="400">
                            400mm (16&quot;) Centers
                          </SelectItem>
                          <SelectItem value="600">
                            600mm (24&quot;) Centers
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Horiz. Frequency
                      </Label>
                      <Select
                        value={horizontalCourses}
                        onValueChange={(val) =>
                          setHorizontalCourses(val as IcfHorizontalCourses)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every_course">
                            Every Course (400mm)
                          </SelectItem>
                          <SelectItem value="every_second_course">
                            Every 2nd (800mm)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Bar arrangement across the cavity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Vertical Bars per Web
                    </Label>
                    <Select
                      value={String(barsPerWeb)}
                      onValueChange={(val) =>
                        setBarsPerWeb(Number(val) as 1 | 2)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          One, centred in the web
                        </SelectItem>
                        <SelectItem value="2">
                          Two, one near each face
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Horizontal Bars per Course
                    </Label>
                    <Select
                      value={String(barsPerCourse)}
                      onValueChange={(val) =>
                        setBarsPerCourse(Number(val) as 1 | 2)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">One per course</SelectItem>
                        <SelectItem value="2">
                          Two, one near each face
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Below Grade & Waste Factor */}
                <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="basement-switch"
                      checked={isBasement}
                      onCheckedChange={setIsBasement}
                    />
                    <Label
                      htmlFor="basement-switch"
                      className="text-xs cursor-pointer"
                    >
                      Below-Grade Earth Retaining (Basement)
                    </Label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor="wastePct"
                      className="text-xs text-muted-foreground"
                    >
                      Waste Allowance:
                    </Label>
                    <Input
                      id="wastePct"
                      type="number"
                      min="0"
                      max="20"
                      value={wastePct}
                      onChange={(e) => setWastePct(Number(e.target.value) || 0)}
                      className="h-7 w-14 text-xs text-center"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Window & Door Openings Builder */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Window & Door Openings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Subtracted from wall area; generates bucking & lintel header
                    cages.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddOpening}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Opening
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {openings.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No openings added. Wall is calculated as solid perimeter.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {openings.map((op) => (
                      <div
                        key={op.id}
                        className="flex items-center gap-2 bg-muted/40 p-2 rounded-md border border-border/40 text-xs"
                      >
                        <Input
                          value={op.label}
                          onChange={(e) =>
                            handleUpdateOpening(op.id, "label", e.target.value)
                          }
                          className="h-7 text-xs flex-1 min-w-[90px]"
                          placeholder="Label"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            W:
                          </span>
                          <Input
                            type="number"
                            step="0.1"
                            value={
                              unitSystem === "imperial"
                                ? (op.widthM / 0.3048).toFixed(1)
                                : op.widthM
                            }
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              handleUpdateOpening(
                                op.id,
                                "widthM",
                                unitSystem === "imperial" ? v * 0.3048 : v,
                              );
                            }}
                            className="h-7 w-14 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            H:
                          </span>
                          <Input
                            type="number"
                            step="0.1"
                            value={
                              unitSystem === "imperial"
                                ? (op.heightM / 0.3048).toFixed(1)
                                : op.heightM
                            }
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              handleUpdateOpening(
                                op.id,
                                "heightM",
                                unitSystem === "imperial" ? v * 0.3048 : v,
                              );
                            }}
                            className="h-7 w-14 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            Qty:
                          </span>
                          <Input
                            type="number"
                            min="1"
                            value={op.count}
                            onChange={(e) =>
                              handleUpdateOpening(
                                op.id,
                                "count",
                                Math.max(1, parseInt(e.target.value) || 1),
                              )
                            }
                            className="h-7 w-12 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOpening(op.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Interactive Schematic & Key Scorecards */}
          <div className="lg:col-span-7 space-y-5">
            {/* Structural Schematic */}
            <IcfWallSchematic
              coreThicknessMm={coreThicknessMm}
              foamType={foamType}
              wallLengthM={lengthM}
              wallHeightM={heightM}
              hasOpenings={openings.length > 0}
              isBasement={isBasement}
            />

            {/* High-Level Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Net Wall Area
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {engineResult.geometry.netWallAreaM2}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    m²
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ({(engineResult.geometry.netWallAreaM2 * 10.764).toFixed(0)}{" "}
                  sq ft)
                </p>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Total ICF Blocks
                </p>
                <p className="text-xl font-bold text-primary mt-0.5">
                  {engineResult.blocks.totalBlocksCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    units
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {engineResult.blocks.straightBlocksCount} straight,{" "}
                  {engineResult.blocks.corner90BlocksCount} corner
                </p>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Concrete Core Volume
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {engineResult.concrete.totalVolumeM3}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    m³
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ~{(engineResult.concrete.totalVolumeM3 * 1.30795).toFixed(1)}{" "}
                  yd³ ({engineResult.concrete.readyMixTrucks6M3} trucks)
                </p>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Reinforcement Steel
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {engineResult.reinforcement.totalSteelWeightTonnes}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    tonnes
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  (
                  {(
                    engineResult.reinforcement.totalSteelWeightKg * 2.20462
                  ).toFixed(0)}{" "}
                  lbs total)
                </p>
              </div>
            </div>

            {/* Performance Envelope & Scorecard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-amber-500" />
                    Thermal, Acoustic & Fire Performance Scorecard
                  </span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {coreThicknessMm}mm Core
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground">
                      Continuous R-Value
                    </p>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">
                      R-{engineResult.envelope.continuousRValueImperial}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      RSI {engineResult.envelope.metricRsiValue} m²·K/W
                    </p>
                  </div>

                  <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground">
                      U-Value (Transmittance)
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {engineResult.envelope.thermalTransmittanceUValue}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      W/(m²·K)
                    </p>
                  </div>

                  <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                      <Volume2 className="h-3 w-3 text-sky-500" />
                      Sound STC Rating
                    </p>
                    <p className="text-lg font-bold text-sky-600 mt-0.5">
                      STC {engineResult.envelope.acousticStcRating}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Acoustic attenuation
                    </p>
                  </div>

                  <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                      <Flame className="h-3 w-3 text-rose-500" />
                      Fire Resistance
                    </p>
                    <p className="text-lg font-bold text-rose-600 mt-0.5">
                      {engineResult.envelope.fireResistanceHours > 0
                        ? `${engineResult.envelope.fireResistanceHours} Hours`
                        : "Not rated"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {engineResult.envelope.fireResistanceHours > 0
                        ? "Tested assembly minimum"
                        : "Lining required"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-md bg-muted/30 border border-border/50 p-2.5 text-[11px] text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      R-value basis:{" "}
                    </span>
                    {engineResult.envelope.rValueBasis}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Sound:{" "}
                    </span>
                    {engineResult.envelope.acousticBasis}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Fire:{" "}
                    </span>
                    {engineResult.envelope.fireBasis}
                  </p>
                </div>

                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      Building Code Mandatory Thermal Barrier:{" "}
                    </span>
                    {engineResult.envelope.thermalBarrierRequirement}
                  </div>
                </div>

                {engineResult.warnings.length > 0 && (
                  <ul className="space-y-1.5">
                    {engineResult.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="rounded-md bg-rose-500/10 border border-rose-500/30 p-2 text-[11px] text-rose-900 dark:text-rose-200 flex items-start gap-1.5"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Labor Duration & Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-primary" />
                  Site Labor Duration & CMU Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground">
                      Total ICF Labor
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {engineResult.labor.totalManHours} man-hours
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ~{engineResult.labor.estimatedCrewDays} days ({crewSize}
                      -person crew)
                    </p>
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
                    <p className="text-[11px] text-muted-foreground">
                      Traditional Blockwork
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {
                        engineResult.labor
                          .traditionalBlockworkManHoursComparison
                      }{" "}
                      man-hours
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Masonry + insulation + plaster
                    </p>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg text-emerald-950 dark:text-emerald-200 col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Labor Duration Saved
                    </p>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {engineResult.labor.laborSavingsPercentage}% Faster
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      All-in-one building envelope
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Concrete Pouring & Lift Rate Warning Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Concrete Placement & Placement Logistics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Maximum Vertical Rise Rate:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.maxPourLiftRateMPerHour} m/hour (4
                  ft/hr max)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Recommended Concrete Slump:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.recommendedSlumpMm}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Maximum Aggregate Size:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.aggregateSizeMaxMm}mm (3/8&quot; pea
                  gravel)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Concrete Fill of the Cavity:</span>
                <span className="font-semibold text-foreground">
                  {(engineResult.concrete.fillFactor * 100).toFixed(0)}% (
                  {engineResult.concrete.formSystem} forms)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Pour Lifts at 1.2 m:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.geometry.pourLifts} lift
                  {engineResult.geometry.pourLifts === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Alignment Turnbuckle Jacks:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.bracing.turnbuckleAlignmentJacks} jacks at{" "}
                  {engineResult.bracing.recommendedJackSpacingM} m centres (
                  {engineResult.bracing.concreteAnchorBolts} slab anchors)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Site-Mix Materials Equivalent (If Batching On Site)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Cement Bags (Standard Retail Pack):</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.siteMixCementBags} bags
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Sharp Sand:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.siteMixSandTonnes} tonnes
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>10mm Pea Gravel (Granite):</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.siteMixGraniteTonnes} tonnes
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Water:</span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.siteMixWaterLitres} litres
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>
                  Mix Design ({engineResult.concrete.mixDesign.grade}):
                </span>
                <span className="font-semibold text-foreground">
                  {engineResult.concrete.mixDesign.cementKgPerM3} kg cement/m³
                  at w/c {engineResult.concrete.mixDesign.waterCementRatio}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed pt-1 border-t border-border/40">
                {engineResult.concrete.mixDesign.note}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Full Bill of Quantities (BOQ) */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Itemized Bill of Quantities (BOQ)
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive purchase schedule covering form blocks, ready-mix,
                reinforcement, bracing, and envelope materials.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyBoq}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Table
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/60 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/40 border-b border-border/60">
                  <tr>
                    <th className="p-2.5 w-[120px] text-xs font-semibold text-muted-foreground">
                      Code
                    </th>
                    <th className="p-2.5 text-xs font-semibold text-muted-foreground">
                      Description
                    </th>
                    <th className="p-2.5 w-[110px] text-xs font-semibold text-muted-foreground">
                      Trade
                    </th>
                    <th className="p-2.5 w-[100px] text-right text-xs font-semibold text-muted-foreground">
                      Quantity
                    </th>
                    <th className="p-2.5 w-[80px] text-xs font-semibold text-muted-foreground">
                      Unit
                    </th>
                    <th className="p-2.5 text-xs font-semibold text-muted-foreground">
                      Specification Notes
                    </th>
                    <th className="p-2.5 text-xs font-semibold text-muted-foreground text-right">
                      Rate
                    </th>
                    <th className="p-2.5 text-xs font-semibold text-muted-foreground text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {engineResult.boq.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-2.5 font-mono text-xs text-muted-foreground">
                        {item.code}
                      </td>
                      <td className="p-2.5 text-xs font-medium text-foreground">
                        {tLabel(item.description)}
                      </td>
                      <td className="p-2.5 text-xs capitalize">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {tLabel(item.category)}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right text-xs font-semibold text-foreground">
                        {item.quantity}
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground">
                        {item.unit}
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground">
                        {item.notes || "-"}
                      </td>
                      <td className="p-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {pricing.lines[item.code]
                          ? `${formatMoney(pricing.lines[item.code].rate, pricing.lines[item.code].currency)}/${pricing.lines[item.code].unit}`
                          : "-"}
                      </td>
                      <td className="p-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap">
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
                  No ICF material prices are recorded for {marketCode} yet, so
                  this BOQ is quantities only.
                </p>
              )}
              <p className="text-muted-foreground">
                {Object.keys(pricing.lines).length} of {engineResult.boq.length}{" "}
                lines priced. Bracing, accessories and labour are quantities
                only; no market price is recorded for them.
              </p>
              {pricing.unitMismatches.length > 0 && (
                <p className="text-amber-600">
                  Excluded on a unit check, because the catalogue unit does not
                  match the priced unit: {pricing.unitMismatches.join(", ")}.
                </p>
              )}
            </div>
            <div className="flex justify-end pt-3">
              <ShareEstimateButton
                estimate={icfShareableEstimate(engineResult, pricing)}
                showPdf
              />
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

        {/* International Building Code Alignment */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Structural Code Citations & Regulatory References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {engineResult.codeCitations.map((c, i) => (
                <div
                  key={i}
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

        {/* How It's Calculated Accordion & Estimation Disclaimer */}
        <HowCalculatedSection
          methodologyText={`1. Block Geometry & Corner Allocation: Gross wall perimeter and height define total surface area. Window and door openings are deducted to establish net face area. Nominal block face dimensions (1200mm x 400mm = 0.48 m²) determine base unit counts, with corner units and T-junctions segregated course by course.

2. Concrete Core Volume & Lift Rates: Core volume is computed from net wall area and core cavity width (100mm to 300mm), with the internal web deduction taken from the chosen form family's fill factor and an explicit pump hopper allowance. Vertical pour rate must be restricted to 1.2 m/hr (4 ft/hr) to avoid exceeding hydrostatic lateral form pressure limits.

3. Reinforcement Grid & Lintel Headers: Footing starter dowels, vertical rebar grid (400mm or 600mm centers), and horizontal courses are lapped 40 bar diameters, and the footing dowel is sized as embedment plus that lap. Openings spanning 0.8m or wider receive reinforced lintel header cages with top and bottom tensile steel and shear stirrups.

4. Turnbuckle Alignment Bracing: Adjustable turnbuckle strongback jacks are spaced at 1.8 m centres along the wall perimeter, with additional jacks at every corner and splay, and a second row once the wall passes 4.5 m, paired with catwalk scaffolding brackets for safe placement and consolidation.`}
          assumptions={[
            { label: "Nominal Block Face", value: "1200mm x 400mm (0.48 m²)" },
            {
              label: "Concrete Web Displacement",
              value: `${engineResult.concrete.formSystem} forms, fill factor ${engineResult.concrete.fillFactor.toFixed(3)}`,
            },
            {
              label: "Bracing",
              value: `${engineResult.bracing.recommendedJackSpacingM} m on centre plus corners, ${engineResult.bracing.bracingRows} row${engineResult.bracing.bracingRows === 1 ? "" : "s"}`,
            },
            { label: "Rebar Lap Length", value: "40 bar diameters" },
            {
              label: "Concrete Mix",
              value: `${engineResult.concrete.mixDesign.grade}, ${engineResult.concrete.aggregateSizeMaxMm} mm aggregate`,
            },
            {
              label: "Thermal Barrier",
              value: `U-value ${engineResult.envelope.thermalTransmittanceUValue} W/(m²·K) incl. ISO 6946 surface resistances`,
            },
          ]}
        />

        <EstimateDisclaimer text="This calculator provides deterministic material takeoffs based on typical manufacturer guidelines, ACI 318/332, and IRC Section R608 prescriptive provisions. It does not replace stamped structural engineering drawings or seismic/wind load calculations by a licensed professional engineer in your jurisdiction." />
      </Container>

      <div className="rounded-xl border border-border/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Questions this estimator answers
        </h2>
        {ICF_FAQ.map((item) => (
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

/**
 * The estimate in the shape the shared share sheet and PDF expect.
 *
 * Values are formatted here, from the engine's own output, so the shared copy
 * can never disagree with what is on screen.
 */
function icfShareableEstimate(
  result: ReturnType<typeof calculateIcfWall>,
  pricing: {
    total: number;
    currency: string | null;
    lines: Record<string, unknown>;
  },
): ShareableEstimate | null {
  if (!result?.ok) return null;
  const priced = Object.keys(pricing.lines).length > 0;
  return {
    kind: "ICF Wall Estimate",
    summaryLines: [
      { label: "Net wall area", value: `${result.geometry.netWallAreaM2} m²` },
      {
        label: "Core",
        value: `${result.concrete.coreThicknessMm} mm, ${result.concrete.formSystem} form`,
      },
      { label: "ICF blocks", value: `${result.blocks.totalBlocksCount}` },
      { label: "Concrete", value: `${result.concrete.totalVolumeM3} m³` },
      {
        label: "Reinforcement",
        value: `${result.reinforcement.totalSteelWeightKg} kg`,
      },
      {
        label: "Thermal",
        value: `R-${result.envelope.continuousRValueImperial} (U ${result.envelope.thermalTransmittanceUValue} W/m²K)`,
      },
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
    link: "/icf-wall-estimator",
  };
}
