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
  Droplets,
  Layers,
  Zap,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  Filter,
} from "lucide-react";
import {
  calculateBoreholeWaterSystem,
  BoreholeSystemInputs,
  AquiferType,
  ConsumptionTier,
  PowerSupply,
  CasingMaterial,
} from "@/lib/estimation/borehole-water-system-engine";
import BoreholeWaterSystemAnimation from "@/components/tools/BoreholeWaterSystemAnimation";
import BoreholeProConnectCta from "@/components/tools/BoreholeProConnectCta";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { getToolFaqGroup } from "@/config/tool-faqs";
import { BOREHOLE_SEO_FAQS } from "@/config/borehole-seo-faqs";
import { tankVocabulary } from "@/lib/localization/regional-vocabulary";
import { useEngineAccess } from "@/lib/use-engine-access";
import { EnginePreviewLock } from "@/components/premium/EnginePreviewLock";
import {
  SOIL_PRESUMPTIONS,
  calculateTankStand,
  tankStandBoqItems,
  type SoilType,
  type StandStructure,
} from "@/lib/estimation/tank-stand";
import { buildSequenceHowTo } from "@/lib/build-sequence-seo";
import AdSlot from "@/components/ui/AdSlot";

export default function BoreholeWaterSystemEstimator() {
  // Input states
  const [depthM, setDepthM] = useState<number>(60);
  const [staticLevelM, setStaticLevelM] = useState<number>(18);
  const [yieldM3h, setYieldM3h] = useState<number>(2.5);
  const [aquifer, setAquifer] = useState<AquiferType>("fractured_basement");
  const [casingMat, setCasingMat] = useState<CasingMaterial>("upvc");

  const [towerHeightM, setTowerHeightM] = useState<number>(6);
  const [horizRunM, _setHorizRunM] = useState<number>(15);
  const [buriedRunM, _setBuriedRunM] = useState<number>(25);

  const [occupants, setOccupants] = useState<number>(6);
  const [tier, setTier] = useState<ConsumptionTier>("suburban_standard");
  const [reserveDays, _setReserveDays] = useState<number>(1.5);
  const [power, setPower] = useState<PowerSupply>("single_phase_220v");

  // Water Quality States
  const [turbidity, setTurbidity] = useState<number>(3.5);
  const [iron, setIron] = useState<number>(0.25);
  const [manganese, setManganese] = useState<number>(0.05);
  const [hardness, setHardness] = useState<number>(110);
  const [tds, _setTds] = useState<number>(280);
  const [ph, _setPh] = useState<number>(7.1);
  const [coliformDetected, setColiformDetected] = useState<boolean>(false);

  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [standStructure, setStandStructure] =
    useState<StandStructure>("blockwork");
  const [market, setMarket] = useState<string>("NG");
  const [soilType, setSoilType] = useState<SoilType>("firm_clay");
  // Blank until somebody has a test figure, which is what makes the flag honest.
  const [testedBearingKpa, setTestedBearingKpa] = useState<string>("");
  const [standLegs, setStandLegs] = useState<number>(4);

  const inputs: BoreholeSystemInputs = useMemo(
    () => ({
      drillingDepthMeters: depthM,
      staticWaterLevelMeters: Math.min(staticLevelM, depthM - 5),
      expectedYieldM3PerHour: yieldM3h,
      aquiferType: aquifer,
      casingMaterial: casingMat,
      tankElevationMeters: towerHeightM,
      surfaceElevationMeters: towerHeightM,
      horizontalRunMeters: horizRunM,
      buriedDeliveryRunMeters: buriedRunM,
      householdOccupants: occupants,
      consumptionTier: tier,
      reserveDays,
      powerSupply: power,
      marketCode: market,
      unitSystem,
      waterQuality: {
        turbidityNtu: turbidity,
        ironMgL: iron,
        manganeseMgL: manganese,
        hardnessMgL: hardness,
        tdsMgL: tds,
        ph,
        coliformBacteriaTested: true,
        coliformDetected,
      },
    }),
    [
      depthM,
      staticLevelM,
      yieldM3h,
      aquifer,
      casingMat,
      towerHeightM,
      horizRunM,
      buriedRunM,
      occupants,
      tier,
      reserveDays,
      power,
      market,
      unitSystem,
      turbidity,
      iron,
      manganese,
      hardness,
      tds,
      ph,
      coliformDetected,
    ],
  );

  const result = useMemo(() => {
    return calculateBoreholeWaterSystem(inputs);
  }, [inputs]);

  // The stand under the tank the engine just sized, at the height the design
  // puts it. Structure and ground conditions stay in the user's hands.
  const stand = useMemo(
    () =>
      calculateTankStand({
        market,
        marketCode: market,
        capacityLitres: result.storage.commercialTankSizeLiters,
        standHeightM: towerHeightM,
        structure: standStructure,
        legs: standLegs,
        soilType,
        soilBearingKpa: testedBearingKpa ? Number(testedBearingKpa) : undefined,
        soilBearingTested: Boolean(testedBearingKpa),
      }),
    [
      market,
      result.storage.commercialTankSizeLiters,
      towerHeightM,
      standStructure,
      standLegs,
      soilType,
      testedBearingKpa,
    ],
  );

  const combinedBoq = useMemo(
    () => [
      ...result.billOfQuantities,
      ...(stand.result ? tankStandBoqItems(stand.result) : []),
    ],
    [result.billOfQuantities, stand.result],
  );

  const engineAccess = useEngineAccess("/borehole-water-system-estimator");
  const visibleBoq = engineAccess.limited
    ? combinedBoq.slice(0, engineAccess.visibleLines)
    : combinedBoq;
  const tankTerms = tankVocabulary(market);
  const proFaqs = [
    ...(getToolFaqGroup("borehole-water-system")?.questions ?? []).map(
      (item) => ({
        question: item.q,
        answer: item.a,
      }),
    ),
    ...BOREHOLE_SEO_FAQS,
  ];

  useSeo({
    title: "Borehole Cost Calculator: Pump HP, Casing & Tank Stand | FRELUX",
    description:
      "Estimate a borehole end to end: drilling depth by soil type, casing pipe lengths, submersible pump horsepower (HP) for your well depth, overhead tank size and tank stand cost, filtration, and the gravity pressure left at your taps.",
    canonicalPath: "/borehole-water-system-estimator",
    structuredData: buildSequenceHowTo({
      name: "Construct an Autonomous Borehole & Water Supply System",
      description:
        "Drill through geological strata, install casing, screen, and sanitary annular grout, lower submersible pump with check valves, connect multi-barrier water treatment, erect elevated tower to buffer morning rush, wire dual float automation, and bury gravity distribution pipes.",
      steps: result.installationSteps,
      path: "/borehole-water-system-estimator",
      totalTime: "P5D",
      supply: [
        "uPVC/Steel well casing and slotted screen",
        "Graded silica gravel pack and Portland cement sanitary grout",
        "Multi-stage submersible borehole pump and check valves",
        "Sediment filter, catalytic media vessel, and UV disinfection sterilizer",
        "Overhead storage tank, float switches, and dry-run probes",
        "Underground HDPE/PVC pressure distribution pipe",
      ],
      tool: [
        "Rotary or DTH borehole drilling rig",
        "Electrical Megger insulation tester",
        "Trench excavation tools",
        "Pipe fusion / threading tools",
        "Water testing photometer / test kit",
      ],
    }),
  });

  const exportCsv = () => {
    const rows: string[][] = [
      ["FRELUX AUTONOMOUS BOREHOLE & WATER SUPPLY SYSTEM TAKEOFF", ""],
      ["Generated Date", new Date().toISOString().split("T")[0]],
      ["Input slider units", unitSystem.toUpperCase()],
      ["Result units", "METRIC AND IMPERIAL, BOTH PRINTED"],
      ["", ""],
      ["--- WELL CONSTRUCTION & STRATA ---", ""],
      [
        "Total Drilling Depth",
        `${result.well.totalDepthMeters} m (${(result.well.totalDepthMeters * 3.28084).toFixed(1)} ft)`,
      ],
      ["Plain Casing Pipe", `${result.well.plainCasingMeters} m`],
      [
        "Slotted Well Screen",
        `${result.well.screenMeters} m (Slot size: ${result.well.screenSlotSizeMm} mm)`,
      ],
      [
        "Sanitary Grout Depth",
        `${result.well.sanitaryGroutDepthMeters} m (Blocks surface runoff)`,
      ],
      [
        "Portland Cement (50kg bags)",
        String(result.well.sanitaryGroutCementBags50kg),
      ],
      ["Sodium Bentonite Seal (kg)", String(result.well.bentoniteSealKg)],
      [
        "Graded Silica Gravel Pack (25kg bags)",
        String(result.well.gravelPackBags25kg),
      ],
      ["", ""],
      ["--- SUBMERSIBLE PUMPING & HYDRAULICS ---", ""],
      ["Static Water Level", `${result.pumping.staticWaterLevelMeters} m`],
      ["Drawdown Under Pumping", `${result.pumping.drawdownMeters} m`],
      ["Dynamic Water Level", `${result.pumping.dynamicWaterLevelMeters} m`],
      ["Pump Setting Depth", `${result.pumping.pumpSettingDepthMeters} m`],
      [
        "Total Dynamic Head (TDH)",
        `${result.pumping.totalDynamicHeadMeters} m (${result.pumping.totalDynamicHeadFeet} ft)`,
      ],
      [
        "Design Flow Rate",
        `${result.pumping.designFlowRateM3PerHour} m³/h (${result.pumping.designFlowRateGpm} GPM)`,
      ],
      [
        "Recommended Motor Power",
        `${result.pumping.recommendedMotorHp} HP (${result.pumping.motorElectricalPowerKw} kW)`,
      ],
      [
        "Check Valve Count",
        `${result.pumping.checkValveCount} units (Spring-loaded non-return)`,
      ],
      [
        "Submersible Cable Size",
        `${result.pumping.submersibleCableMm2} mm² (Drop: ${result.pumping.voltageDropPercent}%)`,
      ],
      ["", ""],
      ["--- STORAGE & PEAK RUSH BUFFERING ---", ""],
      [
        "Daily Total Demand",
        `${result.storage.dailyTotalDemandLiters} L/day (${result.storage.dailyTotalDemandUsGal} US Gal)`,
      ],
      [
        "Peak Morning Rush Demand Rate",
        `${result.storage.peakRushDemandLitersPerHour} L/h`,
      ],
      ["Pump Hourly Delivery", `${result.storage.pumpHourlyOutputLiters} L/h`],
      [
        "Peak Rush Deficit Rate",
        `${result.storage.peakRushDeficitLitersPerHour} L/h`,
      ],
      [
        "Peak Rush Buffer Volume Needed",
        `${result.storage.rushBufferNeededLiters} L`,
      ],
      [
        "Recommended Commercial Tank Size",
        `${result.storage.commercialTankSizeLiters} L (${result.storage.commercialTankSizeUsGal} US Gal)`,
      ],
      [
        "Tank Overflow Pipe Diameter",
        `${result.storage.overflowPipeDiameterMm} mm`,
      ],
      ["", ""],
      ["--- TANK STAND STRUCTURE ---", ""],
      ["Stand Structure", standStructure.replace("_", " ")],
      ["Stand Height to Platform", `${stand.result?.standHeightM ?? 0} m`],
      [
        "Loaded Mass",
        `${stand.result?.loads.totalKg ?? 0} kg (${stand.result?.loads.totalKn ?? 0} kN)`,
      ],
      [
        "Footing Pad Size",
        `${stand.result?.concrete?.padSideM ?? 0} m square x ${stand.result?.concrete?.padDepthM ?? 0} m`,
      ],
      [
        "Footing Concrete",
        `${stand.result?.concrete?.footingConcreteM3 ?? 0} m³`,
      ],
      [
        "Footing Reinforcement",
        `${stand.result?.concrete?.reinforcementKg ?? 0} kg`,
      ],
      ["Blocks for Piers", `${stand.result?.blockwork?.blocksTotal ?? 0}`],
      ["Cement for Mortar", `${stand.result?.blockwork?.cementBags ?? 0} bags`],
      ["Sand for Mortar", `${stand.result?.blockwork?.sandM3 ?? 0} m³`],
      [
        "Applied Bearing Pressure",
        `${stand.result?.bearing.appliedPressureKpa ?? 0} kPa of ${stand.result?.bearing.soilBearingKpa ?? 0} kPa allowable`,
      ],
      ...(stand.result?.checks ?? []).map((c) => [
        `Check: ${c.label}`,
        `${c.status.toUpperCase()} - ${c.detail}`,
      ]),
      ...(stand.result?.boq ?? []).map((line) => [
        `Stand: ${line.item}`,
        line.specification,
        String(line.quantity),
        line.unit,
        line.notes,
      ]),
      ["", ""],
      ["--- RETICULATION & GRAVITY PRESSURE ---", ""],
      [
        "Overhead Tower Elevation",
        `${result.distribution.towerHeightMeters} m`,
      ],
      [
        "Ground Hydrostatic Pressure",
        `${result.distribution.groundHydrostaticPressureBar} bar (${result.distribution.groundHydrostaticPressurePsi} psi)`,
      ],
      [
        "Pressure Adequacy Rating",
        result.distribution.pressureAdequacy.toUpperCase(),
      ],
      [
        "Buried Trench Depth",
        `${result.distribution.buriedTrenchDepthMeters} m`,
      ],
      [
        "Buried Distribution Pipe OD",
        `${result.distribution.buriedPipeDiameterMm} mm`,
      ],
      ["", ""],
      ["--- COMPLETE ITEMIZED BILL OF QUANTITIES ---", "", "", "", ""],
      ["Category", "Item", "Specification", "Quantity", "Unit", "Notes"],
      ...combinedBoq.map((item) => [
        item.category,
        item.item,
        item.specification,
        String(item.quantity),
        item.unit,
        item.notes,
      ]),
      ["", ""],
      ["--- ENGINEERING STANDARDS & REGULATORY COMPLIANCE ---", ""],
      ...result.standardsCited.map((st) => [st, ""]),
      ["", ""],
      [
        "Disclaimer",
        "Preliminary hydraulic and mechanical engineering sizing. Geological conditions, localized aquifer transmissivity, and water chemistry require on-site borehole geophysical logging and accredited laboratory water assay. Structural staging must be certified by a licensed professional engineer.",
      ],
    ];

    const csvContent = rows
      .map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `frelux-borehole-water-system-${depthM}m-${result.storage.commercialTankSizeLiters}L.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="tool"
        eyebrow="Hydraulic & Civil Infrastructure Engineering"
        title="Autonomous Borehole & Water Supply System Estimator"
        subtitle="Drilling strata, submersible pump hydraulics, multi-barrier filtration, overhead peak rush buffering, and gravity reticulation."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Borehole & Water Supply System" },
        ]}
      />

      <Container className="py-8 space-y-8">
        {/* Unit & Presets Control Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Droplets className="h-6 w-6 text-sky-500" />
            <div>
              <h2 className="font-semibold text-foreground text-sm sm:text-base">
                System Engineering Parameters
              </h2>
              <p className="text-xs text-muted-foreground">
                Calibrated against WHO, NIS 554, FMWR, EPA SDWA, and BS EN 806
                standards
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Units:
            </span>
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setUnitSystem("metric")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  unitSystem === "metric"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Metric inputs
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem("imperial")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  unitSystem === "imperial"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Imperial inputs
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Slider readouts only. Every result and the CSV carry both metric
              and imperial values.
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!engineAccess.canExport}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Export BOQ CSV</span>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <ShareEstimateButton
            estimate={
              engineAccess.canExport
                ? {
                    kind: "Borehole Water System BOQ",
                    summaryLines: [
                      {
                        label: "Well depth",
                        value: `${result.well.totalDepthMeters} m`,
                      },
                      {
                        label: "Recommended storage",
                        value: `${result.storage.commercialTankSizeLiters} L (${result.storage.commercialTankSizeUsGal} US gal)`,
                      },
                      {
                        label: "Daily demand",
                        value: `${result.storage.dailyTotalDemandLiters} L`,
                      },
                      {
                        label: "Motor",
                        value: `${result.pumping.recommendedMotorHp} hp`,
                      },
                      {
                        label: "Tower height",
                        value: `${result.distribution.towerHeightMeters} m`,
                      },
                      {
                        label: "Ground pressure",
                        value: `${result.distribution.groundHydrostaticPressureBar} bar (${result.distribution.groundHydrostaticPressurePsi} psi)`,
                      },
                      {
                        label: "Pressure adequacy",
                        value:
                          result.distribution.pressureAdequacy.toUpperCase(),
                      },
                      {
                        label: "Trench depth",
                        value: `${result.distribution.buriedTrenchDepthMeters} m`,
                      },
                    ],
                    lineItems: visibleBoq.map((item) => ({
                      description: `${item.item} (${item.category})`,
                      quantity: `${item.quantity} ${item.unit}`,
                    })),
                    totals: [
                      {
                        label: "Line items",
                        value: String(visibleBoq.length),
                        emphasized: true,
                      },
                    ],
                    link: "/borehole-water-system-estimator",
                  }
                : null
            }
            compact
          />
        </div>

        {/* Interactive Animated Cutaway Diagram */}
        <BoreholeWaterSystemAnimation result={result} />

        {/* Main Grid: Parameters vs Engineering Outputs */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Configurable Engineering Parameters */}
          <div className="min-w-0 lg:col-span-5 space-y-6">
            {/* 1. Geological & Drilling Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> 1. Geological
                  Strata & Drilling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                {/* Total Depth */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <label htmlFor="depth-slider">Total Drilling Depth</label>
                    <span className="font-mono text-primary font-semibold">
                      {depthM} m{" "}
                      {unitSystem === "imperial" &&
                        `(${(depthM * 3.28084).toFixed(0)} ft)`}
                    </span>
                  </div>
                  <input
                    id="depth-slider"
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={depthM}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDepthM(val);
                      if (staticLevelM >= val - 5)
                        setStaticLevelM(Math.max(5, val - 10));
                    }}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>15 m (Shallow)</span>
                    <span>60 m (Typical)</span>
                    <span>180 m (Deep rock)</span>
                  </div>
                </div>

                {/* Static Water Level */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <label htmlFor="static-level">
                      Static Water Level (Below Surface)
                    </label>
                    <span className="font-mono text-foreground">
                      {staticLevelM} m{" "}
                      {unitSystem === "imperial" &&
                        `(${(staticLevelM * 3.28084).toFixed(0)} ft)`}
                    </span>
                  </div>
                  <input
                    id="static-level"
                    type="range"
                    min="2"
                    max={Math.max(10, depthM - 10)}
                    step="1"
                    value={staticLevelM}
                    onChange={(e) => setStaticLevelM(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Resting water table depth before pumping commences
                  </span>
                </div>

                {/* Aquifer Hydrogeology */}
                <div className="space-y-1.5">
                  <label htmlFor="aquifer-type" className="font-medium">
                    Soil Type / Location Terrain
                  </label>
                  <select
                    id="aquifer-type"
                    value={aquifer}
                    onChange={(e) => setAquifer(e.target.value as AquiferType)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                  >
                    <option value="fractured_basement">
                      Fractured Crystalline Basement (Granite/Gneiss)
                    </option>
                    <option value="confined_sand">
                      Confined Sandstone / Deep Alluvial Sand
                    </option>
                    <option value="unconfined_gravel">
                      Unconfined Fluvial Sand & Coarse Gravel
                    </option>
                    <option value="sedimentary_sandstone">
                      Sedimentary Sandstone Aquifer
                    </option>
                  </select>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Rocky basement complex ground (Abuja, Ibadan, Enugu) is
                    drilled to fractured rock with a shallower cased section.
                    Sedimentary ground with a high water table (Lagos Mainland,
                    Lekki, Delta) needs casing over the full depth and typically
                    reaches water sooner.
                  </p>
                </div>

                {/* Casing Material */}
                <div className="space-y-1.5">
                  <label htmlFor="casing-material" className="font-medium">
                    Well Casing & Screen Material
                  </label>
                  <select
                    id="casing-material"
                    value={casingMat}
                    onChange={(e) =>
                      setCasingMat(e.target.value as CasingMaterial)
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                  >
                    <option value="upvc">
                      Heavy Duty Class 9/12 uPVC (Corrosion Resistant)
                    </option>
                    <option value="steel">
                      Seamless Mild Steel / Stainless Steel Casing
                    </option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* 2. Submersible Hydraulics Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" /> 2. Submersible
                  Pumping Hydraulics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                {/* Safe Yield */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <label htmlFor="safe-yield">Well Safe Yield Capacity</label>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {yieldM3h} m³/h{" "}
                      {unitSystem === "imperial" &&
                        `(${(yieldM3h * 4.40287).toFixed(1)} GPM)`}
                    </span>
                  </div>
                  <input
                    id="safe-yield"
                    type="range"
                    min="0.8"
                    max="10.0"
                    step="0.2"
                    value={yieldM3h}
                    onChange={(e) => setYieldM3h(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>0.8 m³/h (Low)</span>
                    <span>2.5 m³/h (Typical)</span>
                    <span>10.0 m³/h (Commercial)</span>
                  </div>
                </div>

                {/* Power Supply */}
                <div className="space-y-1.5">
                  <label htmlFor="power-supply" className="font-medium">
                    Electrical Power Supply
                  </label>
                  <select
                    id="power-supply"
                    value={power}
                    onChange={(e) => setPower(e.target.value as PowerSupply)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                  >
                    <option value="single_phase_220v">
                      Single Phase 220V - 240V / 50Hz (Standard)
                    </option>
                    <option value="three_phase_380v">
                      Three Phase 380V - 415V / 50Hz (Industrial/High Yield)
                    </option>
                    <option value="single_phase_110v">
                      Single Phase 110V - 120V / 60Hz (North America)
                    </option>
                    <option value="solar_dc">
                      Solar DC Direct Brushless Pumping
                    </option>
                  </select>
                </div>

                {/* Overhead Tower Height */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <label htmlFor="tower-height">
                      Overhead Water Tower Height
                    </label>
                    <span className="font-mono text-foreground">
                      {towerHeightM} m{" "}
                      {unitSystem === "imperial" &&
                        `(${(towerHeightM * 3.28084).toFixed(0)} ft)`}
                    </span>
                  </div>
                  <input
                    id="tower-height"
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={towerHeightM}
                    onChange={(e) => setTowerHeightM(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Elevation creates hydrostatic gravity head at household taps
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Water Quality & Laboratory Testing Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-sky-500" /> 3. Water Quality
                    & Lab Testing
                  </span>
                  <Badge
                    variant={
                      result.treatment.isPotableWithoutTreatment
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {result.treatment.isPotableWithoutTreatment
                      ? "Potable Baseline"
                      : "Treatment Required"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                {/* Iron and Manganese */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="iron-level" className="font-medium text-xs">
                      Iron (Fe, mg/L)
                    </label>
                    <input
                      id="iron-level"
                      type="number"
                      step="0.05"
                      min="0"
                      max="10"
                      value={iron}
                      onChange={(e) => setIron(Number(e.target.value))}
                      className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Limit: ≤ 0.3 mg/L
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="manganese-level"
                      className="font-medium text-xs"
                    >
                      Manganese (Mn, mg/L)
                    </label>
                    <input
                      id="manganese-level"
                      type="number"
                      step="0.02"
                      min="0"
                      max="5"
                      value={manganese}
                      onChange={(e) => setManganese(Number(e.target.value))}
                      className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Limit: ≤ 0.1 mg/L
                    </span>
                  </div>
                </div>

                {/* Hardness & Turbidity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="hardness-level"
                      className="font-medium text-xs"
                    >
                      Hardness (CaCO₃, mg/L)
                    </label>
                    <input
                      id="hardness-level"
                      type="number"
                      step="10"
                      min="10"
                      max="1000"
                      value={hardness}
                      onChange={(e) => setHardness(Number(e.target.value))}
                      className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Soft: &lt;60 | Hard: &gt;120
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="turbidity-level"
                      className="font-medium text-xs"
                    >
                      Turbidity (NTU)
                    </label>
                    <input
                      id="turbidity-level"
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={turbidity}
                      onChange={(e) => setTurbidity(Number(e.target.value))}
                      className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      WHO Limit: ≤ 5 NTU
                    </span>
                  </div>
                </div>

                {/* Coliform Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs">
                      Microbial Coliform Bacteria
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Fecal coliforms / E. coli presence from surface runoff
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColiformDetected(!coliformDetected)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      coliformDetected
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {coliformDetected ? "Detected (Alert!)" : "Zero / Clear"}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* 4. Demand & Sizing Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" /> 4. Household
                  Demand & Rush Buffering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <label htmlFor="occupants-num">
                      Household Occupants Served
                    </label>
                    <span className="font-mono text-primary font-semibold">
                      {occupants} people
                    </span>
                  </div>
                  <input
                    id="occupants-num"
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={occupants}
                    onChange={(e) => setOccupants(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tier-select" className="font-medium">
                    Consumption Pattern
                  </label>
                  <select
                    id="tier-select"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as ConsumptionTier)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                  >
                    <option value="rural_basic">
                      Basic Residential / Rural (80 L/capita/day)
                    </option>
                    <option value="suburban_standard">
                      Standard Suburban Household (150 L/capita/day)
                    </option>
                    <option value="urban_high">
                      Luxury / High Consumption (250 L/capita/day)
                    </option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Calculated Engineering Results */}
          <div className="min-w-0 lg:col-span-7 space-y-6">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-emerald-500" /> Submersible
                    Pump
                  </span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {result.pumping.recommendedMotorHp} HP
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    TDH: {result.pumping.totalDynamicHeadMeters}m (
                    {result.pumping.totalDynamicHeadFeet} ft)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-sky-500" /> Overhead
                    Tank
                  </span>
                  <div className="text-xl font-bold text-sky-600 dark:text-sky-400">
                    {result.storage.commercialTankSizeLiters.toLocaleString()} L
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {result.storage.commercialTankSizeUsGal.toLocaleString()} US
                    Gal capacity
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />{" "}
                    Sanitary Grout
                  </span>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {result.well.sanitaryGroutCementBags50kg} Bags
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Top {result.well.sanitaryGroutDepthMeters}m sealed runoff
                    barrier
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-primary" /> Tap Pressure
                  </span>
                  <div className="text-xl font-bold text-primary">
                    {result.distribution.groundHydrostaticPressureBar} bar
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {result.distribution.groundHydrostaticPressurePsi} psi
                    hydrostatic head
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Engineering Detail Tabs / Sections */}
            {/* 1. Peak Rush Buffering Sizing Explainer */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" /> Morning Rush
                  Peak Buffering Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  During the peak morning window (showers, toilets, cooking
                  running concurrently), household water demand surges to{" "}
                  <strong className="text-foreground">
                    {result.storage.peakRushDemandLitersPerHour} L/hour
                  </strong>{" "}
                  (2.8× average). The borehole pump delivers{" "}
                  <strong className="text-foreground">
                    {result.storage.pumpHourlyOutputLiters} L/hour
                  </strong>
                  .
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>Morning Peak Demand Rate:</span>
                    <span className="font-mono font-semibold text-rose-500">
                      {result.storage.peakRushDemandLitersPerHour} L/h
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Well Safe Output Rate:</span>
                    <span className="font-mono font-semibold text-emerald-500">
                      {result.storage.pumpHourlyOutputLiters} L/h
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-border pt-1 font-medium">
                    <span>Peak Rush Buffer Deficit:</span>
                    <span className="font-mono text-primary font-bold">
                      {result.storage.rushBufferNeededLiters} Liters needed for
                      2h rush
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Selected{" "}
                    <strong>
                      {result.storage.commercialTankSizeLiters.toLocaleString()}
                      L
                    </strong>{" "}
                    overhead tank comfortably absorbs the morning surge and
                    guarantees <strong>{result.inputs.reserveDays} days</strong>{" "}
                    emergency supply.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Tank stand structure and footings */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />{" "}
                    {tankTerms.stand} &amp; footings
                  </span>
                  <div className="flex gap-1">
                    {(
                      [
                        "blockwork",
                        "reinforced_concrete",
                        "steel",
                      ] as StandStructure[]
                    ).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={standStructure === option}
                        onClick={() => setStandStructure(option)}
                        className={
                          standStructure === option
                            ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-[10px] font-semibold"
                            : "rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                        }
                      >
                        {option === "reinforced_concrete"
                          ? "Concrete"
                          : option.charAt(0).toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      Market
                    </span>
                    <select
                      aria-label="Stand market"
                      value={market}
                      onChange={(event) => setMarket(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      {["NG", "GH", "KE", "ZA", "GB", "US"].map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      Ground
                    </span>
                    <select
                      aria-label="Ground type"
                      value={soilType}
                      onChange={(event) =>
                        setSoilType(event.target.value as SoilType)
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      {SOIL_PRESUMPTIONS.map((soil) => (
                        <option key={soil.id} value={soil.id}>
                          {soil.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      Test figure
                    </span>
                    <input
                      aria-label="Tested soil bearing capacity"
                      type="number"
                      min="20"
                      max="1000"
                      step="10"
                      placeholder="kPa, if tested"
                      value={testedBearingKpa}
                      onChange={(event) =>
                        setTestedBearingKpa(event.target.value)
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                  </label>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      Piers
                    </span>
                    <div className="flex gap-1">
                      {[4, 6].map((count) => (
                        <button
                          key={count}
                          type="button"
                          aria-pressed={standLegs === count}
                          onClick={() => setStandLegs(count)}
                          className={
                            standLegs === count
                              ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-[10px] font-semibold"
                              : "rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                          }
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {stand.result ? (
                  <>
                    <p className="text-muted-foreground leading-relaxed">
                      A {standStructure.replace("_", " ")} stand carrying{" "}
                      <strong className="text-foreground">
                        {stand.result.capacityLitres.toLocaleString()} L
                      </strong>{" "}
                      of water at{" "}
                      <strong className="text-foreground">
                        {stand.result.standHeightM} m
                      </strong>{" "}
                      puts{" "}
                      <strong className="text-foreground">
                        {stand.result.loads.totalKn} kN
                      </strong>{" "}
                      on {stand.result.legs} footings, about{" "}
                      {stand.result.loads.perLegKg.toLocaleString()} kg each.
                    </p>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Loaded mass
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.loads.totalKg.toLocaleString()} kg
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Footing pads
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.concrete?.padSideM}m sq
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Footing concrete
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.concrete?.footingConcreteM3} m³
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Bearing pressure
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.bearing.appliedPressureKpa} kPa
                        </div>
                      </div>
                    </div>

                    {stand.result.blockwork ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Blocks
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.blockwork.blocksTotal}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Cement
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.blockwork.cementBags} bags
                          </div>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Sharp sand
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.blockwork.sandM3} m³
                          </div>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Courses
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.blockwork.courses}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {stand.result.steel ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Legs
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.steel.legSection}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Steel length
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.steel.legLengthM} m
                          </div>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <div className="text-[10px] text-muted-foreground">
                            Anchor bolts
                          </div>
                          <div className="font-mono font-semibold">
                            {stand.result.steel.anchorBoltCount}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-border p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Tank shell
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.tank.diameterM} m across
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Platform
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.platform.planWidthM} m square
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Ring beam
                        </div>
                        <div className="font-mono font-semibold">
                          {stand.result.platform.ringBeamConcreteM3} m³
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2">
                        <div className="text-[10px] text-muted-foreground">
                          Wind safety
                        </div>
                        <div
                          className={
                            stand.result.stability.factorOfSafety >= 1.5
                              ? "font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                              : "font-mono font-semibold text-amber-600 dark:text-amber-400"
                          }
                        >
                          {stand.result.stability.factorOfSafety} x
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {stand.result.checks.map((check) => (
                        <div
                          key={check.id}
                          className="flex items-start gap-2 rounded-lg border border-border p-2"
                        >
                          <AlertTriangle
                            className={
                              check.status === "ok"
                                ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                                : check.status === "warn"
                                  ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                                  : "mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500"
                            }
                          />
                          <div>
                            <div className="text-[11px] font-semibold text-foreground">
                              {check.label}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {check.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Quantities only. Bearing capacity is assumed unless a soil
                      test exists, and the stand must be checked by a licensed
                      engineer before it carries water.
                    </p>
                  </>
                ) : (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {stand.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 3. Multi-Barrier Treatment Train Stages */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-sky-500" /> Multi-Barrier
                    Water Treatment Train
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    4 Progressive Barriers
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2.5">
                  {result.treatment.stages.map((st) => (
                    <div
                      key={st.id}
                      className="rounded-lg border border-border bg-card p-3 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span className="flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Barrier {st.stageNumber}: {st.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Required
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {st.equipmentSpecification}
                      </p>
                      <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                        Purpose: {st.purpose}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {result.pumping.warnings.length > 0 ? (
              <Card className="border-amber-500/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Pump
                    Selection Checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {result.pumping.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed"
                    >
                      {warning}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* 4. Pumping & Mechanical Hydraulic Specs */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" /> Mechanical &
                  Hydraulic Head Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <p className="rounded border border-border bg-muted/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">
                    Pump horsepower (HP):
                  </strong>{" "}
                  the size needed to push water from your well depth up to your
                  overhead tank, not just to lift it. It is the total dynamic
                  head (static lift, drawdown, pipe friction and tank fill
                  height) turned into the next stocked submersible motor rating.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Pump Setting Depth
                    </span>
                    <div className="font-semibold font-mono text-sm">
                      {result.pumping.pumpSettingDepthMeters} m
                    </div>
                  </div>
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Dynamic Water Level
                    </span>
                    <div className="font-semibold font-mono text-sm">
                      {result.pumping.dynamicWaterLevelMeters} m
                    </div>
                  </div>
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Riser Pipe Friction Loss
                    </span>
                    <div className="font-semibold font-mono text-sm">
                      {result.pumping.riserFrictionLossMeters} m
                    </div>
                  </div>
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Total Dynamic Head (TDH)
                    </span>
                    <div className="font-semibold font-mono text-sm text-primary">
                      {result.pumping.totalDynamicHeadMeters} m (
                      {result.pumping.totalDynamicHeadFeet} ft)
                    </div>
                  </div>
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Submersible Cable
                    </span>
                    <div className="font-semibold font-mono text-sm">
                      {result.pumping.submersibleCableMm2} mm² (Drop:{" "}
                      {result.pumping.voltageDropPercent}%)
                    </div>
                  </div>
                  <div className="rounded border border-border p-2 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      Safety Wire Rope (316 SS)
                    </span>
                    <div className="font-semibold font-mono text-sm">
                      {result.pumping.safetyRopeBreakingLoadKn} kN breaking load
                    </div>
                  </div>
                </div>

                {/* Check Valve Notice */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Check Valve
                    Schedule:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {result.pumping.checkValves.map((cv, i) => (
                      <li key={i}>
                        {cv.locationMetersFromPump === 0
                          ? "Pump Discharge Collar:"
                          : `Intermediate Riser at ${cv.locationMetersFromPump}m:`}{" "}
                        {cv.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 4. Complete Bill of Quantities (BOQ) */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> Itemized
                  Bill of Quantities (BOQ)
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {combinedBoq.length} Line Items
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                      <tr>
                        <th className="p-2.5">Trade & Item</th>
                        <th className="p-2.5">Specification</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleBoq.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-2.5">
                            <div className="font-medium text-foreground">
                              {item.item}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {item.category}
                            </div>
                          </td>
                          <td className="p-2.5 text-[11px] text-muted-foreground max-w-xs">
                            {item.specification}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {engineAccess.limited && engineAccess.engine && (
                  <EnginePreviewLock
                    engine={engineAccess.engine}
                    hiddenLines={engineAccess.hiddenLines(combinedBoq.length)}
                  />
                )}

                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={exportCsv}
                    disabled={!engineAccess.canExport}
                    className="gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Full
                    Engineering Takeoff CSV
                  </Button>
                  {!engineAccess.canExport && (
                    <span className="text-[11px] text-muted-foreground">
                      CSV export is part of a plan. The on screen takeoff above
                      stays readable.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AdSlot slotKey="estimator_native" className="mt-6" />

        <div className="mt-6 space-y-4">
          <BoreholeProConnectCta market={market} />
          {proFaqs.length > 0 && (
            <FaqItemsWithSchema
              faqs={proFaqs}
              title="Borehole, pump and tank stand questions"
            />
          )}
        </div>

        {/* Engineering Standards & Governance Footnote */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Regulatory Code
            & Jurisdictional Standards
          </div>
          <p className="leading-relaxed">
            Calculated in accordance with World Health Organization (WHO)
            Guidelines for Drinking-water Quality, Nigerian Standards for
            Drinking Water Quality (NIS 554:2015), Federal Ministry of Water
            Resources (FMWR) Water Well Code of Practice, US EPA Safe Drinking
            Water Act (SDWA), NGWA-01-14 Water Well Standard, and British
            Standard BS EN 806.
          </p>
          <div className="pt-1 text-[11px] text-muted-foreground/80">
            <strong>Professional Notice:</strong> Geological hydrogeology,
            aquifer recovery rate, and chemical water composition vary by
            geographical coordinates. Always conduct geophysical resistivity
            sounding before drilling and obtain certified laboratory water assay
            before drinking raw groundwater.
          </div>
        </div>
      </Container>
    </div>
  );
}
