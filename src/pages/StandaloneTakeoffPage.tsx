import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMarket } from "@/lib/international/market-context";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import {
  AlertTriangle,
  BrickWall,
  CheckCircle2,
  Ruler,
  RotateCcw,
} from "lucide-react";
import {
  calculateMasonryTakeoff,
  resolveMarketMasonryConfig,
  type MasonryCalculationResult,
} from "@/lib/estimation/masonry-standalone-engine";
import {
  calculatePlasteringTakeoff,
  type PlasteringCalculationResult,
} from "@/lib/estimation/plastering-standalone-engine";
import {
  calculateDrywallTakeoff,
  type DrywallCalculationResult,
} from "@/lib/estimation/drywall-standalone-engine";
import {
  calculatePavingTakeoff,
  type PavingCalculationResult,
} from "@/lib/estimation/paving-standalone-engine";
import {
  calculateDrainageTakeoff,
  type DrainageCalculationResult,
} from "@/lib/estimation/drainage-standalone-engine";
import {
  calculateTemporaryWorksTakeoff,
  type TemporaryWorksResult,
} from "@/lib/estimation/temporary-works-standalone-engine";
import {
  calculateInsulationTakeoff,
  type InsulationResult,
} from "@/lib/estimation/insulation-standalone-engine";
import {
  calculateDemolitionTakeoff,
  type DemolitionResult,
} from "@/lib/estimation/demolition-standalone-engine";
import {
  calculateSepticSizing,
  type SepticSizingResult,
} from "@/lib/estimation/septic-sizing-engine";

type Engine =
  | "masonry"
  | "plastering"
  | "drywall"
  | "paving"
  | "drainage"
  | "temporary-works"
  | "insulation"
  | "demolition"
  | "septic";
type Result =
  | MasonryCalculationResult
  | PlasteringCalculationResult
  | DrywallCalculationResult
  | PavingCalculationResult
  | DrainageCalculationResult
  | TemporaryWorksResult
  | InsulationResult
  | DemolitionResult
  | SepticSizingResult;
const ENGINES: { id: Engine; label: string; subtitle: string }[] = [
  { id: "masonry", label: "Masonry", subtitle: "Brick and blockwork" },
  {
    id: "plastering",
    label: "Plastering",
    subtitle: "Render and finish coats",
  },
  { id: "drywall", label: "Drywall", subtitle: "Partitions and boards" },
  { id: "paving", label: "Paving", subtitle: "Pavers and sub-base" },
  { id: "drainage", label: "Drainage", subtitle: "Gravity run quantities" },
  {
    id: "septic",
    label: "Septic & soakaway",
    subtitle: "User-specified design inputs",
  },
  {
    id: "temporary-works",
    label: "Temporary works",
    subtitle: "Formwork and scaffold quantities",
  },
  {
    id: "insulation",
    label: "Insulation",
    subtitle: "Board, batt and roll quantities",
  },
  {
    id: "demolition",
    label: "Demolition",
    subtitle: "Debris and skip quantities",
  },
];
const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function StandaloneTakeoffPage({
  initialEngine = "masonry",
}: {
  initialEngine?: Engine;
}) {
  const { market, availableMarkets } = useMarket();
  const [searchParams] = useSearchParams();
  const [bridgeProvenance, setBridgeProvenance] = useState("");
  const [engine, setEngine] = useState<Engine>(initialEngine);
  const [marketCode, setMarketCode] = useState(market.marketCode);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
    length: "10",
    height: "3",
    count: "1",
    waste: "5",
    area: "100",
    thickness: "12",
    paverLength: "200",
    paverWidth: "100",
    spacing: "600",
    runLength: "20",
    diameter: "110",
    fall: "10",
    trenchWidth: "0.45",
    trenchDepth: "0.75",
    elementLength: "10",
    elementWidth: "8",
    elementDepth: "0.2",
    scaffoldLength: "12",
    scaffoldHeight: "6",
    occupants: "4",
    dailyFlow: "120",
    retentionDays: "2",
    storageDays: "0",
    freeboard: "20",
    soilLoading: "",
    soakawayDepth: "2",
  });
  const masonryConfig = useMemo(
    () => resolveMarketMasonryConfig(marketCode),
    [marketCode],
  );
  const [unitId, setUnitId] = useState("");
  useEffect(() => {
    if (searchParams.get("source") !== "blueprint-takeoff") return;
    const marketParam = searchParams.get("market");
    if (
      marketParam &&
      availableMarkets.some((entry) => entry.country_code === marketParam)
    )
      setMarketCode(marketParam);
    const allowedKeys = ["length", "area", "runLength", "elementLength"];
    const targetKey = allowedKeys.find((key) => searchParams.has(key));
    const raw = targetKey ? searchParams.get(targetKey) : null;
    const measured = raw === null ? NaN : Number(raw);
    if (!targetKey || !Number.isFinite(measured) || measured <= 0) return;
    setValues((current) => ({ ...current, [targetKey]: String(measured) }));
    const plan = searchParams.get("plan") || "Unnamed plan";
    const page = searchParams.get("page") || "?";
    const mark = searchParams.get("label") || "Measurement";
    setBridgeProvenance(
      `${mark} from ${plan}, page ${page}. Imported quantity: ${measured} ${searchParams.get("unit") || "units"}. Verify before calculation.`,
    );
  }, [searchParams, availableMarkets]);
  const title =
    ENGINES.find((item) => item.id === engine)?.label ?? "Construction takeoff";
  const number = (key: string, fallback = 0) =>
    Number.isFinite(Number(values[key])) ? Number(values[key]) : fallback;
  const update = (key: string, value: string) =>
    setValues((old) => ({ ...old, [key]: value }));
  const field = (key: string, label: string, unit = "m", min = 0) => (
    <label className="block text-sm font-medium text-foreground" key={key}>
      {label}
      <span className="ml-1 text-muted-foreground">({unit})</span>
      <input
        className={INPUT_CLASS}
        type="number"
        min={min}
        step="any"
        value={values[key] ?? ""}
        onChange={(event) => update(key, event.target.value)}
        required
      />
    </label>
  );
  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    choices: { value: string; label: string }[],
  ) => (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <select
        className={INPUT_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
  const runCalculation = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      let next: Result;
      if (engine === "masonry")
        next = calculateMasonryTakeoff({
          marketCode,
          wallLengthM: number("length"),
          wallHeightM: number("height"),
          wallCount: number("count", 1),
          selectedUnitId: unitId || undefined,
          wastePercent: number("waste", 5),
        });
      else if (engine === "plastering")
        next = calculatePlasteringTakeoff({
          marketCode,
          surfaceAreaM2: number("area"),
          thicknessMm: number("thickness", 12),
          wastePercent: number("waste", 5),
          applicationType: "internal_plaster",
        });
      else if (engine === "drywall")
        next = calculateDrywallTakeoff({
          marketCode,
          wallLengthM: number("length"),
          wallHeightM: number("height"),
          wallCount: number("count", 1),
          studSpacingMm: number("spacing", 600),
          wastePercent: number("waste", 10),
          boardSides: 2,
        });
      else if (engine === "paving")
        next = calculatePavingTakeoff({
          marketCode,
          areaM2: number("area"),
          paverLengthMm: number("paverLength", 200),
          paverWidthMm: number("paverWidth", 100),
          wastePercent: number("waste", 5),
        });
      else if (engine === "drainage")
        next = calculateDrainageTakeoff({
          marketCode,
          runs: [
            {
              lengthM: number("runLength"),
              pipeDiameterMm: number("diameter", 110),
              fallMmPerM: number("fall", 10),
            },
          ],
          trenchWidthM: number("trenchWidth", 0.45),
          trenchDepthM: number("trenchDepth", 0.75),
        });
      else if (engine === "insulation")
        next = calculateInsulationTakeoff({
          marketCode,
          areaM2: number("area"),
          thicknessMm: number("thickness", 100),
          layers: number("layers", 1),
          packCoverageM2: number("packCoverage", 0),
          wastePercent: number("waste", 5),
        });
      else if (engine === "demolition")
        next = calculateDemolitionTakeoff({
          marketCode,
          items: [
            {
              type: "wall",
              lengthM: number("elementLength"),
              widthM: number("elementWidth"),
              thicknessM: number("elementDepth"),
            },
          ],
          bulkingFactor: number("bulking", 1.35),
          skipCapacityM3: number("skipCapacity", 0),
        });
      else if (engine === "septic")
        next = calculateSepticSizing({
          marketCode,
          occupants: number("occupants"),
          designFlowLitresPerPersonPerDay: number("dailyFlow"),
          retentionDays: number("retentionDays"),
          storageAllowanceDays: number("storageDays"),
          freeboardPercent: number("freeboard"),
          acceptedSoilLoadingRateLitresPerM2PerDay:
            number("soilLoading") || undefined,
          soakawayDepthM: number("soakawayDepth") || undefined,
        });
      else
        next = calculateTemporaryWorksTakeoff({
          marketCode,
          elements: [
            {
              type: "slab",
              lengthM: number("elementLength"),
              widthM: number("elementWidth"),
              depthOrHeightM: number("elementDepth"),
            },
          ],
          scaffoldRunLengthM: number("scaffoldLength"),
          scaffoldWorkingHeightM: number("scaffoldHeight"),
        });
      const activeKeys: Record<Engine, string[]> = {
        masonry: ["length", "height", "count", "waste"],
        plastering: ["area", "thickness", "waste"],
        drywall: ["length", "height", "count", "spacing", "waste"],
        paving: ["area", "paverLength", "paverWidth", "waste"],
        drainage: [
          "runLength",
          "diameter",
          "fall",
          "trenchWidth",
          "trenchDepth",
        ],
        septic: [
          "occupants",
          "dailyFlow",
          "retentionDays",
          "storageDays",
          "freeboard",
          "soilLoading",
          "soakawayDepth",
        ],
        "temporary-works": [
          "elementLength",
          "elementWidth",
          "elementDepth",
          "scaffoldLength",
          "scaffoldHeight",
        ],
        insulation: ["area", "thickness", "layers", "packCoverage", "waste"],
        demolition: [
          "elementLength",
          "elementWidth",
          "elementDepth",
          "bulking",
          "skipCapacity",
        ],
      };
      const numericValues = activeKeys[engine]
        .map((key) => values[key])
        .filter((v) => v !== "")
        .map(Number);
      if (numericValues.some((value) => !Number.isFinite(value) || value < 0))
        throw new Error("Enter valid non-negative measurements.");
      const requiredPositive: Partial<Record<Engine, string[]>> = {
        masonry: ["length", "height"],
        plastering: ["area", "thickness"],
        drywall: ["length", "height"],
        paving: ["area", "paverLength", "paverWidth"],
        drainage: ["runLength", "diameter", "trenchWidth", "trenchDepth"],
        septic: ["occupants", "dailyFlow", "retentionDays"],
        insulation: ["area", "thickness", "layers"],
        demolition: ["elementLength", "elementWidth", "elementDepth"],
        "temporary-works": ["elementLength", "elementWidth", "elementDepth"],
      };
      if (requiredPositive[engine]?.some((key) => number(key) <= 0))
        throw new Error(
          "Enter a value greater than zero for the required measurements.",
        );
      setResult(next);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to calculate these quantities.",
      );
    }
  };
  const selectEngine = (id: Engine) => {
    setEngine(id);
    setResult(null);
    setError("");
  };
  const rows = result
    ? Object.entries(result)
        .filter(
          ([key, value]) =>
            key !== "marketCode" && value !== null && value !== undefined,
        )
        .map(([key, value]) => ({
          label: key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase()),
          value:
            typeof value === "object" ? JSON.stringify(value) : String(value),
        }))
    : [];
  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        variant="tool"
        eyebrow="Construction quantity tools"
        title={`${title} Calculator`}
        subtitle="Transparent material takeoffs with editable assumptions. Quantities are estimates, not structural or code-compliance designs."
        backTo="/construction-tools"
        backLabel="All tools"
      />
      <main className="mx-auto max-w-6xl px-4 pt-7 sm:px-6">
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ENGINES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectEngine(item.id)}
              className={`rounded-2xl border p-3 text-left transition ${engine === item.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"}`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {item.subtitle}
              </span>
            </button>
          ))}
        </div>
        {bridgeProvenance && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
          >
            <strong>Imported measured quantity for review</strong>
            <p className="mt-1 text-muted-foreground">{bridgeProvenance}</p>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <form
            onSubmit={runCalculation}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Project measurements</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the working market, then enter measured dimensions.
                </p>
              </div>
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {select(
                "Market",
                marketCode,
                (code) => {
                  setMarketCode(code);
                  setUnitId("");
                },
                availableMarkets.map((entry) => ({
                  value: entry.country_code,
                  label: entry.country_name,
                })),
              )}
              {engine === "masonry" &&
                select(
                  "Masonry unit",
                  unitId || masonryConfig.defaultUnit.id,
                  setUnitId,
                  masonryConfig.availableUnits.map((unit) => ({
                    value: unit.id,
                    label: unit.name,
                  })),
                )}
              {engine === "masonry" && (
                <>
                  {field("length", "Wall length")}{" "}
                  {field("height", "Wall height")}{" "}
                  {field("count", "Number of similar walls", "walls", 1)}{" "}
                  {field("waste", "Cut/breakage allowance", "%")}
                </>
              )}
              {engine === "plastering" && (
                <>
                  {field("area", "Surface area", "m²")}{" "}
                  {field("thickness", "Total coat thickness", "mm")}{" "}
                  {field("waste", "Material allowance", "%")}
                </>
              )}
              {engine === "drywall" && (
                <>
                  {field("length", "Partition run length")}{" "}
                  {field("height", "Partition height")}{" "}
                  {field("count", "Number of similar runs", "walls", 1)}{" "}
                  {field("spacing", "Stud spacing", "mm", 100)}{" "}
                  {field("waste", "Board allowance", "%")}
                </>
              )}
              {engine === "paving" && (
                <>
                  {field("area", "Paved area", "m²")}{" "}
                  {field("paverLength", "Paver length", "mm")}{" "}
                  {field("paverWidth", "Paver width", "mm")}{" "}
                  {field("waste", "Cutting allowance", "%")}
                </>
              )}
              {engine === "drainage" && (
                <>
                  {field("runLength", "Drain run length")}{" "}
                  {field("diameter", "Pipe diameter", "mm")}{" "}
                  {field("fall", "Specified fall", "mm/m")}{" "}
                  {field("trenchWidth", "Trench width")}{" "}
                  {field("trenchDepth", "Trench depth")}
                </>
              )}
              {engine === "septic" && (
                <>
                  {field("occupants", "Design population", "people", 1)}{" "}
                  {field(
                    "dailyFlow",
                    "Approved daily flow per person",
                    "L/person/day",
                    1,
                  )}{" "}
                  {field("retentionDays", "Required retention", "days", 0)}{" "}
                  {field(
                    "storageDays",
                    "Additional storage allowance",
                    "days",
                    0,
                  )}{" "}
                  {field("freeboard", "Freeboard allowance", "%", 0)}{" "}
                  {field(
                    "soilLoading",
                    "Accepted soil loading rate (optional)",
                    "L/m²/day",
                    0,
                  )}{" "}
                  {field(
                    "soakawayDepth",
                    "Soakaway effective depth (optional)",
                    "m",
                    0,
                  )}
                </>
              )}
              {engine === "temporary-works" && (
                <>
                  {field("elementLength", "Slab length")}{" "}
                  {field("elementWidth", "Slab width")}{" "}
                  {field("elementDepth", "Slab thickness")}{" "}
                  {field("scaffoldLength", "Scaffold run")}{" "}
                  {field("scaffoldHeight", "Working height")}
                </>
              )}
              {engine === "insulation" && (
                <>
                  {field("area", "Insulated area", "m²")}{" "}
                  {field("thickness", "Insulation thickness", "mm")}{" "}
                  {field("layers", "Number of layers", "layers", 1)}{" "}
                  {field(
                    "packCoverage",
                    "Product pack coverage",
                    "m² per pack",
                  )}{" "}
                  {field("waste", "Cutting allowance", "%")}
                </>
              )}
              {engine === "demolition" && (
                <>
                  {field("elementLength", "Element length")}{" "}
                  {field("elementWidth", "Element height/width")}{" "}
                  {field("elementDepth", "Element thickness")}{" "}
                  {field("bulking", "Debris bulking factor", "factor", 1)}{" "}
                  {field("skipCapacity", "Skip capacity", "m³")}
                </>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" className="rounded-xl">
                Calculate quantities
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setResult(null)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear results
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
          <section
            className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
            aria-live="polite"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <BrickWall className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Quantity summary</h2>
                <p className="text-sm text-muted-foreground">
                  {result
                    ? `Calculated for ${marketCode}`
                    : "Your results will appear here."}
                </p>
              </div>
            </div>
            {result ? (
              <>
                <div className="divide-y divide-border">
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="max-w-[60%] break-words text-right text-sm font-semibold">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                {"packagingEvidence" in result && result.packagingEvidence && (
                  <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                    <div className="font-semibold">
                      {result.packagingEvidence.label}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {result.packagingEvidence.guidance}
                    </p>
                    {result.packagingEvidence.sources.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3">
                        {result.packagingEvidence.sources.map((source) => (
                          <li key={source.url}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary underline underline-offset-2"
                            >
                              {source.publisher} source ↗
                            </a>
                            <span className="text-muted-foreground">
                              {" "}
                              · {source.scopeNote}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Review before procurement
                  </div>
                  <p className="text-muted-foreground">
                    Confirm product datasheets, site measurements, local
                    requirements, and waste assumptions with the responsible
                    professional. Drainage, sanitation, and temporary-works
                    quantities are not a design.
                  </p>
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  Calculation assumptions and output are shown for review;
                  results are not a safety certification.
                </p>
              </>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
                <Ruler className="mb-3 h-7 w-7 text-muted-foreground/60" />
                <p className="text-sm font-medium">Ready when you are</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Enter the measured quantities and run the estimate to see a
                  material breakdown.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
