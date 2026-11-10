import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, RotateCcw, Layers } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useMarket } from "@/lib/international/market-context";
import { useSeo } from "@/lib/seo";
import {
  calculateWallpaperEstimate,
  type WallpaperWallInput,
} from "@/lib/calculators/wallpaper-calculator";
import { formatNumber } from "@/lib/utils";
import { formatWithSymbol } from "@/lib/international/currency-format";
import AdSlot from "@/components/ui/AdSlot";
import ToolFaqs from "@/components/seo/ToolFaqs";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";

const METRES_PER_FOOT = 0.3048;
const INITIAL_WALL: WallpaperWallInput = {
  id: "wall-1",
  label: "Wall 1",
  widthM: 3.6,
  heightM: 3,
  doors: 0,
  windows: 0,
};

type DisplayUnit = "m" | "ft" | "in";

function toDisplay(metres: number, unit: DisplayUnit) {
  if (unit === "ft") return metres / METRES_PER_FOOT;
  if (unit === "in") return metres / 0.0254;
  return metres;
}
function toMetres(value: number, unit: DisplayUnit) {
  if (unit === "ft") return value * METRES_PER_FOOT;
  if (unit === "in") return value * 0.0254;
  return value;
}
function areaDisplay(squareMetres: number, areaUnit: "sqm" | "sqft") {
  return areaUnit === "sqft"
    ? `${formatNumber(squareMetres * 10.7639104167)} sq ft`
    : `${formatNumber(squareMetres)} m²`;
}

/**
 * Room starting points. People know the room they are papering, not each wall
 * length, so each preset lays out the four walls of an ordinary room at a
 * standard ceiling height. Every number stays editable afterwards.
 */
const ROOM_PRESETS: {
  key: string;
  label: string;
  note: string;
  walls: {
    label: string;
    widthM: number;
    heightM: number;
    doors: number;
    windows: number;
  }[];
}[] = [
  {
    key: "bedroom",
    label: "Bedroom, 4.2 x 3.6 m",
    note: "4 walls, 2.7 m ceiling",
    walls: [
      {
        label: "Wall 1 (door)",
        widthM: 4.2,
        heightM: 2.7,
        doors: 1,
        windows: 0,
      },
      {
        label: "Wall 2 (window)",
        widthM: 3.6,
        heightM: 2.7,
        doors: 0,
        windows: 1,
      },
      { label: "Wall 3", widthM: 4.2, heightM: 2.7, doors: 0, windows: 0 },
      { label: "Wall 4", widthM: 3.6, heightM: 2.7, doors: 0, windows: 0 },
    ],
  },
  {
    key: "living",
    label: "Living room, 5.5 x 4.5 m",
    note: "4 walls, 2.9 m ceiling",
    walls: [
      {
        label: "Wall 1 (door)",
        widthM: 5.5,
        heightM: 2.9,
        doors: 1,
        windows: 0,
      },
      {
        label: "Wall 2 (windows)",
        widthM: 4.5,
        heightM: 2.9,
        doors: 0,
        windows: 2,
      },
      { label: "Wall 3", widthM: 5.5, heightM: 2.9, doors: 0, windows: 0 },
      { label: "Wall 4", widthM: 4.5, heightM: 2.9, doors: 0, windows: 0 },
    ],
  },
  {
    key: "single-room",
    label: "Single room, 3 x 3 m",
    note: "4 walls, 2.7 m ceiling",
    walls: [
      { label: "Wall 1 (door)", widthM: 3, heightM: 2.7, doors: 1, windows: 0 },
      {
        label: "Wall 2 (window)",
        widthM: 3,
        heightM: 2.7,
        doors: 0,
        windows: 1,
      },
      { label: "Wall 3", widthM: 3, heightM: 2.7, doors: 0, windows: 0 },
      { label: "Wall 4", widthM: 3, heightM: 2.7, doors: 0, windows: 0 },
    ],
  },
  {
    key: "feature-wall",
    label: "One feature wall",
    note: "1 wall, 4 x 2.7 m",
    walls: [
      { label: "Feature wall", widthM: 4, heightM: 2.7, doors: 0, windows: 0 },
    ],
  },
];

export default function WallpaperCalculator() {
  const { market, preferredLengthUnit, preferredAreaUnit } = useMarket();
  const [unit, setUnit] = useState<DisplayUnit>(
    preferredLengthUnit === "feet"
      ? "ft"
      : preferredLengthUnit === "inches"
        ? "in"
        : "m",
  );
  useEffect(() => {
    setUnit(
      preferredLengthUnit === "feet"
        ? "ft"
        : preferredLengthUnit === "inches"
          ? "in"
          : "m",
    );
    if (market.currencyCode !== "NGN") {
      // Nigerian example values must never be silently relabelled as another currency.
      setRollPrice(0);
      setLabourPerRoll(0);
    }
  }, [market.marketCode, market.currencyCode, preferredLengthUnit]);
  const [walls, setWalls] = useState<WallpaperWallInput[]>([
    { ...INITIAL_WALL },
  ]);
  const [roll, setRoll] = useState("standard");
  const [wasteRate, setWasteRate] = useState(0);
  const [patternRepeat, setPatternRepeat] = useState(0);
  const [trimAllowance, setTrimAllowance] = useState(0.3);
  const [wallpaperType, setWallpaperType] = useState("nonwoven");
  const [installationMethod, setInstallationMethod] = useState("pasted");
  const [visualStyle, setVisualStyle] = useState("plain");
  const pattern: "random" | "straight" | "drop" =
    visualStyle === "plain"
      ? "random"
      : visualStyle === "floral"
        ? "drop"
        : "straight";
  const [customRollWidth, setCustomRollWidth] = useState(0.53);
  const [customRollLength, setCustomRollLength] = useState(10);
  const [doorWidth, setDoorWidth] = useState(1.0);
  const [doorHeight, setDoorHeight] = useState(2.1);
  const [windowWidth, setWindowWidth] = useState(1.25);
  const [windowHeight, setWindowHeight] = useState(1.2);
  const [showOpeningSizes, setShowOpeningSizes] = useState(false);
  const [extraRoll, setExtraRoll] = useState(false);
  // Example figures shown in the supplied screenshot are illustrative, not verified prices.
  const [rollPrice, setRollPrice] = useState(
    market.currencyCode === "NGN" ? 12500 : 0,
  );
  const [unitsPerPackage, setUnitsPerPackage] = useState(1);
  const [labourPerRoll, setLabourPerRoll] = useState(
    market.currencyCode === "NGN" ? 4500 : 0,
  );
  const [adhesivePerRolls, setAdhesivePerRolls] = useState(5);
  const [adhesivePackPrice, setAdhesivePackPrice] = useState(0);
  const [previewWallId, setPreviewWallId] = useState(INITIAL_WALL.id);

  const rollSpec =
    roll === "wide"
      ? { widthM: 1.06, lengthM: 15.6, label: "Wide · 1.06 × 15.6 m" }
      : roll === "custom" || roll === "panel"
        ? {
            widthM: customRollWidth,
            lengthM: customRollLength,
            label:
              roll === "panel"
                ? "Fixed mural panel dimensions"
                : "Custom roll dimensions",
          }
        : { widthM: 0.53, lengthM: 10, label: "Standard · 0.53 × 10 m" };
  const isPanelFormat = roll === "panel";

  const estimate = useMemo(
    () =>
      calculateWallpaperEstimate({
        walls,
        rollWidthM: rollSpec.widthM,
        rollLengthM: rollSpec.lengthM,
        stockFormat: isPanelFormat ? "fixed-panel" : "roll",
        unitsPerPackage,
        openingDoorWidthM: doorWidth,
        openingDoorHeightM: doorHeight,
        openingWindowWidthM: windowWidth,
        openingWindowHeightM: windowHeight,
        pattern,
        patternRepeatM: patternRepeat,
        trimAllowanceM: trimAllowance,
        wasteRate,
        extraRoll,
        rollPrice,
        labourPerRoll,
        adhesivePerRolls,
        adhesivePackPrice,
        adhesiveRequired: installationMethod === "pasted",
      }),
    [
      walls,
      rollSpec.widthM,
      rollSpec.lengthM,
      isPanelFormat,
      unitsPerPackage,
      doorWidth,
      doorHeight,
      windowWidth,
      windowHeight,
      pattern,
      patternRepeat,
      trimAllowance,
      wasteRate,
      extraRoll,
      rollPrice,
      labourPerRoll,
      adhesivePerRolls,
      adhesivePackPrice,
      installationMethod,
    ],
  );

  const previewWall =
    walls.find((wall) => wall.id === previewWallId) ?? walls[0];
  // The diagram reads the engine's own takeoff. Its previous copy of the strip
  // arithmetic disagreed with a wall whose floor-to-ceiling opening frees a
  // strip, so the picture and the order could show different drop counts.
  const previewTakeoff =
    estimate.walls.find((wall) => wall.id === previewWall?.id) ??
    estimate.walls[0];
  const previewStripCount = previewTakeoff?.installableDrops ?? 0;
  const previewAllowanceDrops = previewTakeoff?.allowanceDrops ?? 0;
  const currency = market.currencySymbol || market.currencyCode;
  const money = (amount: number) => formatWithSymbol(amount, currency);
  const labelUnit = unit;

  // A schedule the installer can carry: one row per wall with the drop count and
  // the cut length, then the package totals. Kept out of the render so the
  // numbers come from the same estimate object the screen shows.
  const exportCsv = () => {
    if (estimate.invalidWall) return;
    const rows: string[][] = [
      [
        "Wall",
        "Width (m)",
        "Height (m)",
        "Effective width (m)",
        "Drops",
        "Allowance drops",
        "Longest cut (m)",
        "Openings deducted (m2)",
        "Floor-to-ceiling openings (m2)",
      ],
      ...estimate.walls.map((wall) => [
        wall.label,
        wall.widthM.toFixed(3),
        wall.heightM.toFixed(3),
        wall.effectiveWidthM.toFixed(3),
        String(wall.installableDrops),
        String(wall.allowanceDrops),
        wall.cutLengthM.toFixed(3),
        wall.openingAreaM2.toFixed(3),
        wall.fullHeightOpeningM2.toFixed(3),
      ]),
      [],
      ["Summary", "Value"],
      ["Net wall area (m2)", estimate.netAreaM2.toFixed(3)],
      ["Installed coverage (m2)", estimate.installedCoverageM2.toFixed(3)],
      ["Purchased coverage (m2)", estimate.purchasedCoverageM2.toFixed(3)],
      ["Pattern and trim loss (m2)", estimate.patternLossM2.toFixed(3)],
      ["Drops to cut", String(estimate.strips)],
      [`${isPanelFormat ? "Panels" : "Rolls"} to buy`, String(estimate.rolls)],
      ["Priced packages", String(estimate.packages)],
      ["Adhesive packs", String(estimate.adhesivePacks)],
      ["Materials and adhesive", estimate.materialCost.toFixed(2)],
      ["Installation labour", estimate.labourCost.toFixed(2)],
      [`Total (${currency})`, estimate.totalCost.toFixed(2)],
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wallpaper-takeoff.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  useSeo({
    title:
      "Wallpaper Calculator: Rolls, Materials & Installation Budget | FRELUX",
    description:
      "Estimate wallpaper rolls and mural panels from global product dimensions, measured walls, pattern matches and trimming allowance. Review an accessible wall diagram, materials, adhesive and local quotes.",
    canonicalPath: "/wallpaper-calculator",
    keywords:
      "wallpaper calculator, wallpaper rolls, wall covering, wallpaper installation cost, wallpaper pattern repeat, wallpaper mural estimate",
  });

  const updateWall = (id: string, patch: Partial<WallpaperWallInput>) => {
    setWalls((current) =>
      current.map((wall) => (wall.id === id ? { ...wall, ...patch } : wall)),
    );
  };
  const addWall = () => {
    const id = `wall-${Date.now()}`;
    const next = { ...INITIAL_WALL, id, label: `Wall ${walls.length + 1}` };
    setWalls((current) => [...current, next]);
    setPreviewWallId(id);
  };
  /** Replace the wall list with a whole room, measured in metres. */
  const applyRoomPreset = (preset: (typeof ROOM_PRESETS)[number]) => {
    const stamp = Date.now();
    const next = preset.walls.map((wall, index) => ({
      ...INITIAL_WALL,
      id: `wall-${stamp}-${index}`,
      label: wall.label,
      widthM: wall.widthM,
      heightM: wall.heightM,
      doors: wall.doors,
      windows: wall.windows,
    }));
    setWalls(next);
    setPreviewWallId(next[0]?.id ?? null);
  };

  const reset = () => {
    setWalls([{ ...INITIAL_WALL }]);
    setRoll("standard");
    setVisualStyle("plain");
    setWasteRate(0);
    setPatternRepeat(0);
    setTrimAllowance(0.3);
    setExtraRoll(false);
    setShowOpeningSizes(false);
    setWallpaperType("nonwoven");
    setInstallationMethod("pasted");
    setPreviewWallId(INITIAL_WALL.id);
    setRollPrice(market.currencyCode === "NGN" ? 12500 : 0);
    setLabourPerRoll(market.currencyCode === "NGN" ? 4500 : 0);
    setAdhesivePackPrice(0);
    setAdhesivePerRolls(5);
    setUnitsPerPackage(1);
  };

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Wall finishes · Quantity & budget"
        title="Wallpaper Calculator"
        subtitle="Plan wallpaper rolls from measured walls, real roll dimensions and pattern allowances. Add your local supplier and fitting quotes for a project budget."
        breadcrumbs={[
          { label: "Construction tools", path: "/construction-tools" },
          { label: "Wallpaper Calculator" },
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
          <section
            className="min-w-0 space-y-5"
            aria-label="Wallpaper measurements"
          >
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">
                Start with a room
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the room you are papering. It replaces the walls below with
                that room at a normal ceiling height, then you change only the
                walls that differ.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {ROOM_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyRoomPreset(preset)}
                    className="rounded-xl border border-border px-3 py-2 text-left hover:bg-muted"
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {preset.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {preset.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Measure your walls
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter each wall separately. Openings always reduce the net
                    area you see. A floor-to-ceiling opening also frees a drop,
                    because paper cannot pass behind it; a door or window with
                    wall above it keeps its drop, since the strip runs past it.
                    Preset dimensions are examples, not market-wide standards.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {market.countryName}
                </span>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
                <Field
                  label="Product package format"
                  hint="Example presets; confirm usable dimensions on the product package"
                >
                  <select
                    className={inputClass}
                    value={roll}
                    onChange={(event) => setRoll(event.target.value)}
                  >
                    <option value="standard">
                      Example preset · 0.53 × 10 m
                    </option>
                    <option value="wide">Example preset · 1.06 × 15.6 m</option>
                    <option value="custom">Custom roll / package format</option>
                    <option value="panel">Fixed-size mural panels</option>
                  </select>
                </Field>
                <Field
                  label="Dimension unit"
                  hint="Choose the unit used in the form"
                >
                  <select
                    className={inputClass}
                    value={unit}
                    onChange={(event) =>
                      setUnit(event.target.value as DisplayUnit)
                    }
                    aria-label="Measurement unit"
                  >
                    <option value="m">Metres</option>
                    <option value="ft">Feet</option>
                    <option value="in">Inches</option>
                  </select>
                </Field>
              </div>
              {(roll === "custom" || isPanelFormat) && (
                <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <NumberField
                    label={`${isPanelFormat ? "Panel" : "Product"} width (${labelUnit})`}
                    value={toDisplay(customRollWidth, unit)}
                    min="0.01"
                    step="0.01"
                    onChange={(value) =>
                      setCustomRollWidth(toMetres(value, unit))
                    }
                  />
                  <NumberField
                    label={`${isPanelFormat ? "Panel height" : "Usable package length"} (${labelUnit})`}
                    value={toDisplay(customRollLength, unit)}
                    min="0.01"
                    step="0.01"
                    onChange={(value) =>
                      setCustomRollLength(toMetres(value, unit))
                    }
                  />
                  <p className="col-span-2 text-xs text-muted-foreground">
                    {isPanelFormat
                      ? "Enter one fixed panel's usable width and height. Every wall drop counts as a separate numbered panel; the calculator does not reuse offcuts between panels."
                      : "Enter the usable width and total continuous length in one priced package. This supports single, double or multi-roll packages; confirm usable dimensions and package contents on the label."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {walls.map((wall, index) => (
                  <div
                    key={wall.id}
                    className="rounded-xl border border-border/80 bg-background/70 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">
                        {wall.label}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewWallId(wall.id)}
                          aria-pressed={previewWallId === wall.id}
                        >
                          Diagram
                        </Button>
                        {walls.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${wall.label}`}
                            onClick={() => {
                              setWalls((current) =>
                                current.filter((item) => item.id !== wall.id),
                              );
                              if (previewWallId === wall.id)
                                setPreviewWallId(
                                  walls[Math.max(0, index - 1)].id,
                                );
                            }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        label={`Width (${labelUnit})`}
                        value={toDisplay(wall.widthM, unit)}
                        min="0.1"
                        step="0.01"
                        onChange={(value) =>
                          updateWall(wall.id, { widthM: toMetres(value, unit) })
                        }
                      />
                      <NumberField
                        label={`Height (${labelUnit})`}
                        value={toDisplay(wall.heightM, unit)}
                        min="0.1"
                        step="0.01"
                        onChange={(value) =>
                          updateWall(wall.id, {
                            heightM: toMetres(value, unit),
                          })
                        }
                      />
                      <NumberField
                        label="Doors"
                        value={wall.doors}
                        min="0"
                        step="1"
                        onChange={(value) =>
                          updateWall(wall.id, { doors: Math.floor(value) })
                        }
                      />
                      <NumberField
                        label="Windows"
                        value={wall.windows}
                        min="0"
                        step="1"
                        onChange={(value) =>
                          updateWall(wall.id, { windows: Math.floor(value) })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={addWall}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another wall
              </Button>
              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
                aria-expanded={showOpeningSizes}
                onClick={() => setShowOpeningSizes((show) => !show)}
              >
                {showOpeningSizes ? "Hide" : "Edit"} opening deduction
                dimensions
              </button>
              {showOpeningSizes && (
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
                  <NumberField
                    label={`Door width (${labelUnit})`}
                    value={toDisplay(doorWidth, unit)}
                    min="0.1"
                    step="0.01"
                    onChange={(value) => setDoorWidth(toMetres(value, unit))}
                  />
                  <NumberField
                    label={`Door height (${labelUnit})`}
                    value={toDisplay(doorHeight, unit)}
                    min="0.1"
                    step="0.01"
                    onChange={(value) => setDoorHeight(toMetres(value, unit))}
                  />
                  <NumberField
                    label={`Window width (${labelUnit})`}
                    value={toDisplay(windowWidth, unit)}
                    min="0.1"
                    step="0.01"
                    onChange={(value) => setWindowWidth(toMetres(value, unit))}
                  />
                  <NumberField
                    label={`Window height (${labelUnit})`}
                    value={toDisplay(windowHeight, unit)}
                    min="0.1"
                    step="0.01"
                    onChange={(value) => setWindowHeight(toMetres(value, unit))}
                  />
                  <p className="col-span-2 text-xs leading-relaxed text-muted-foreground">
                    Initial opening dimensions are editable planning examples,
                    not verified local building standards. Measure actual
                    openings for a better area estimate.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">
                Wallpaper type & installation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Material type informs the hanging method. Exact roll or panel
                dimensions and the printed pattern repeat drive quantities.
                Follow the product maker's instructions.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Wallpaper material / finish">
                  <select
                    className={inputClass}
                    value={wallpaperType}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setWallpaperType(nextType);
                      if (nextType === "peel-stick")
                        setInstallationMethod("self-adhesive");
                    }}
                  >
                    <option value="paper">Paper</option>
                    <option value="vinyl">Vinyl-coated or solid vinyl</option>
                    <option value="nonwoven">Non-woven</option>
                    <option value="textile">Textile / natural fibre</option>
                    <option value="peel-stick">Peel-and-stick</option>
                    <option value="mural">Printed mural wallpaper</option>
                  </select>
                </Field>
                <Field label="Product installation method">
                  <select
                    className={inputClass}
                    value={installationMethod}
                    onChange={(event) =>
                      setInstallationMethod(event.target.value)
                    }
                  >
                    <option value="pasted">Paste required</option>
                    <option value="pre-pasted">
                      Pre-pasted / water activated
                    </option>
                    <option value="self-adhesive">Self-adhesive</option>
                  </select>
                </Field>
                <div className="flex items-center rounded-xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Selected:{" "}
                  {wallpaperType === "nonwoven"
                    ? "Non-woven"
                    : wallpaperType === "peel-stick"
                      ? "Peel-and-stick"
                      : wallpaperType === "mural"
                        ? "Printed mural / panel"
                        : wallpaperType === "textile"
                          ? "Textile / natural fibre"
                          : wallpaperType === "vinyl"
                            ? "Vinyl"
                            : "Paper"}
                  . No unsupported coverage or price multiplier is applied. For
                  numbered murals, choose fixed-panel format.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">
                Pattern & cutting allowance
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Design choice sets a planning match type. Confirm the exact
                match symbol and repeat printed on the product label. Numbered
                murals use fixed-panel counting.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Design style & match"
                  hint="Planning match only; confirm the exact match on the product label"
                >
                  <select
                    className={inputClass}
                    value={visualStyle}
                    disabled={isPanelFormat}
                    onChange={(event) => setVisualStyle(event.target.value)}
                  >
                    <option value="plain">Plain / texture · free match</option>
                    <option value="stripe">Stripe · straight match</option>
                    <option value="geometric">
                      Geometric / repeating · straight match
                    </option>
                    <option value="floral">
                      Large floral / motif · half-drop match
                    </option>
                  </select>
                </Field>
                <Field label="Planning waste allowance">
                  <select
                    className={inputClass}
                    value={wasteRate}
                    onChange={(event) =>
                      setWasteRate(Number(event.target.value))
                    }
                  >
                    <option value={0}>0% · no additional allowance</option>
                    <option value={0.05}>5% · illustrative</option>
                    <option value={0.12}>12% · illustrative</option>
                    <option value={0.2}>20% · illustrative</option>
                  </select>
                </Field>
                <NumberField
                  label={`Pattern repeat (${labelUnit}; read product label)`}
                  value={toDisplay(patternRepeat, unit)}
                  min="0"
                  step="0.01"
                  disabled={isPanelFormat || pattern === "random"}
                  onChange={(value) => setPatternRepeat(toMetres(value, unit))}
                />
                <NumberField
                  label={`Extra length per drop for trimming (${labelUnit})`}
                  value={toDisplay(trimAllowance, unit)}
                  min="0"
                  step="0.01"
                  onChange={(value) => setTrimAllowance(toMetres(value, unit))}
                />
                <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={extraRoll}
                    onChange={(event) => setExtraRoll(event.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      Add one spare {isPanelFormat ? "panel" : "physical roll"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Optional, shown separately in the total
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">
                Local quote & accessories
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter prices for the selected roll package or fixed panel, plus
                a local fitting quote. FRELUX does not verify these prices.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField
                  label={`Price per ${isPanelFormat ? "panel set / package" : "priced package"} (${currency})`}
                  value={rollPrice}
                  min="0"
                  step="100"
                  onChange={setRollPrice}
                />
                <NumberField
                  label={`${isPanelFormat ? "Panels" : "Physical rolls"} per priced ${isPanelFormat ? "set" : "package"}`}
                  value={unitsPerPackage}
                  min="1"
                  step="1"
                  onChange={(value) =>
                    setUnitsPerPackage(Math.max(1, Math.floor(value)))
                  }
                />
                <NumberField
                  label={`Labour per ${isPanelFormat ? "panel" : "physical roll"} (${currency})`}
                  value={labourPerRoll}
                  min="0"
                  step="100"
                  onChange={setLabourPerRoll}
                />
                {installationMethod === "pasted" && (
                  <>
                    <NumberField
                      label="Adhesive pack covers (rolls)"
                      value={adhesivePerRolls}
                      min="1"
                      step="1"
                      onChange={(value) =>
                        setAdhesivePerRolls(Math.max(1, Math.floor(value)))
                      }
                    />
                    <NumberField
                      label={`Adhesive pack price (${currency})`}
                      value={adhesivePackPrice}
                      min="0"
                      step="100"
                      onChange={setAdhesivePackPrice}
                    />
                  </>
                )}
                <div className="flex items-center rounded-xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {installationMethod === "pasted"
                    ? "Adhesive coverage is product-specific. Enter the coverage shown on the adhesive pack."
                    : installationMethod === "pre-pasted"
                      ? "The selected method uses the product's activated backing; separate adhesive packs are not counted."
                      : "The selected method is self-adhesive; separate paste packs are not counted."}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The displayed roll, paste and labour figures are illustrative
                inputs, not live market prices or a supplier quote. For mural
                panels, price this field per panel.
              </p>
            </div>
          </section>

          <aside
            className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start"
            aria-label="Estimate results and wall diagram"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Estimated project budget
                    </p>
                    <p
                      aria-live="polite"
                      className="mt-1 text-3xl font-bold tracking-tight text-foreground"
                    >
                      {money(estimate.totalCost)}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Layers className="h-6 w-6" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">
                  {isPanelFormat
                    ? `You need ${estimate.rolls} numbered panel${estimate.rolls === 1 ? "" : "s"}, sold as ${estimate.packages} set${estimate.packages === 1 ? "" : "s"}.`
                    : `You need ${estimate.rolls} roll${estimate.rolls === 1 ? "" : "s"}, which is ${estimate.packages} package${estimate.packages === 1 ? "" : "s"} from the shop.`}{" "}
                  That covers{" "}
                  {areaDisplay(estimate.netAreaM2, preferredAreaUnit)} of wall,
                  with pattern matching and trimming already counted in.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Takeoff: {estimate.rolls}{" "}
                  {isPanelFormat ? "panels" : "physical rolls"} across{" "}
                  {estimate.packages} priced{" "}
                  {isPanelFormat ? "panel sets" : "packages"} ·{" "}
                  {areaDisplay(estimate.netAreaM2, preferredAreaUnit)} net area
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Purchased coverage{" "}
                  {areaDisplay(estimate.purchasedCoverageM2, preferredAreaUnit)}{" "}
                  for {areaDisplay(estimate.netAreaM2, preferredAreaUnit)} of
                  wall: {areaDisplay(estimate.patternLossM2, preferredAreaUnit)}{" "}
                  sits in pattern matching, trimming and strip ends.
                </p>
                {estimate.invalidWall && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    Check {estimate.invalidWall}: dimensions or opening
                    deductions are invalid.
                  </p>
                )}
              </div>
              <div className="border-t border-border px-5 pb-5 sm:px-6">
                <ShareEstimateButton
                  estimate={{
                    kind: isPanelFormat
                      ? "Wallpaper Mural Estimate"
                      : "Wallpaper Estimate",
                    summaryLines: [
                      {
                        label: "Net wall area",
                        value: areaDisplay(
                          estimate.netAreaM2,
                          preferredAreaUnit,
                        ),
                      },
                      {
                        label: isPanelFormat ? "Panels" : "Rolls",
                        value: `${estimate.rolls}`,
                      },
                      {
                        label: "Priced packages",
                        value: `${estimate.packages}`,
                      },
                      {
                        label: "Adhesive packs",
                        value: `${estimate.adhesivePacks}`,
                      },
                    ],
                    lineItems: [
                      {
                        description: isPanelFormat
                          ? "Mural panels"
                          : "Wallpaper rolls",
                        quantity: `${estimate.packages}`,
                        amount: money(estimate.materialCost),
                      },
                      {
                        description: "Adhesive",
                        amount: money(estimate.adhesiveCost),
                      },
                      {
                        section: "Labour",
                        description: "Installation",
                        amount: money(estimate.labourCost),
                      },
                    ],
                    totals: [
                      {
                        label: "Total",
                        value: money(estimate.totalCost),
                        emphasized: true,
                      },
                    ],
                    link: "/wallpaper-calculator",
                  }}
                  compact
                />
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
                <ResultMetric
                  label={isPanelFormat ? "Mural panels" : "Physical rolls"}
                  value={`${estimate.rolls}`}
                />
                <ResultMetric
                  label={
                    isPanelFormat ? "Priced panel sets" : "Priced packages"
                  }
                  value={`${estimate.packages}`}
                />
                <ResultMetric
                  label="Net area"
                  value={areaDisplay(estimate.netAreaM2, preferredAreaUnit)}
                />
                <ResultMetric
                  label="Materials + paste"
                  value={money(estimate.materialCost)}
                />
                <ResultMetric
                  label="Installation"
                  value={money(estimate.labourCost)}
                />
              </div>
              <WallDiagram
                wall={previewWall}
                rollWidthM={rollSpec.widthM}
                strips={previewStripCount}
                allowanceDrops={previewAllowanceDrops}
                unit={unit}
                doorWidthM={doorWidth}
                doorHeightM={doorHeight}
                windowWidthM={windowWidth}
                windowHeightM={windowHeight}
                isPanelFormat={isPanelFormat}
              />
              <div className="border-t border-border p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Cut list by wall
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportCsv}
                    disabled={Boolean(estimate.invalidWall)}
                  >
                    Export CSV
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Wallpaper drops and cut lengths for each measured wall
                    </caption>
                    <thead>
                      <tr className="text-muted-foreground">
                        <th scope="col" className="pb-2 font-medium">
                          Wall
                        </th>
                        <th scope="col" className="pb-2 text-right font-medium">
                          Drops
                        </th>
                        <th scope="col" className="pb-2 text-right font-medium">
                          Allowance
                        </th>
                        <th scope="col" className="pb-2 text-right font-medium">
                          Cut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.walls.map((wall) => (
                        <tr key={wall.id} className="border-t border-border/60">
                          <th
                            scope="row"
                            className="py-2 font-normal text-foreground"
                          >
                            {wall.label}
                            {wall.fullHeightOpeningM2 > 0 && (
                              <span className="block text-[11px] text-muted-foreground">
                                Floor-to-ceiling opening frees{" "}
                                {areaDisplay(
                                  wall.fullHeightOpeningM2,
                                  preferredAreaUnit,
                                )}
                              </span>
                            )}
                          </th>
                          <td className="py-2 text-right text-foreground">
                            {wall.installableDrops}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {wall.allowanceDrops}
                          </td>
                          <td className="py-2 text-right text-foreground">
                            {toDisplay(wall.cutLengthM, unit).toFixed(2)} {unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pattern === "drop" && patternRepeat > 0 && (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Half-drop match: every second drop is cut half a repeat
                    longer ({toDisplay(patternRepeat / 2, unit).toFixed(2)}{" "}
                    {unit} more) so the pattern lines up across strips.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Adhesive packs for installed rolls
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {estimate.adhesivePacks} packs ·{" "}
                    {money(estimate.adhesiveCost)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Estimated wall drops
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {estimate.strips} {isPanelFormat ? "panels" : "drops"}
                  </p>
                </div>
              </div>
              <div className="border-t border-border p-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Planning estimate only. Pattern repeat, usable offcuts, wall
                  irregularities and product coverage affect actual quantities.
                  Confirm measurements, roll batch, adhesive coverage and labour
                  with your installer before purchase.
                </p>
                <Link
                  to="/marketplace?tab=products"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Browse materials on FRELUX Marketplace{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={reset}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset estimate
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Pricing note:</strong> Costs
              use the currency and manual figures selected on this page only.
              They are not live, verified supplier prices and are not converted
              from another market.
            </div>
          </aside>
        </div>
        <div className="mt-8">
          <ToolFaqs slug="wallpaper-calculator" />
        </div>
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
          ]}
        />
        <section className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-xl font-bold text-foreground">
            How this estimate works
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Net wall area is gross measured wall area less the editable door
              and window dimensions. Deductions are capped by each wall’s area.
            </li>
            <li>
              Quantity is based on full-height drops, product dimensions,
              trimming allowance and pattern repeat. Continuous rolls can share
              usable offcuts; numbered mural panels are counted one panel per
              drop.
            </li>
            <li>
              Free-match designs do not use a repeat; straight and half-drop
              matching use the repeat you enter. Confirm match symbols and
              repeat on the product label before ordering.
            </li>
            <li>
              The optional percentage allowance rounds up to additional drops.
              Adhesive is only counted for paste-required installation and uses
              the pack coverage you enter.
            </li>
          </ol>
        </section>
      </main>
      {/* FRELUX calculator pages use two ad placements: mid-content and native. */}
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
    </>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {children}
      <span className="sr-only">{hint}</span>
    </label>
  );
}
function NumberField({
  label,
  value,
  min,
  step,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: string;
  step: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <input
        className={`${inputClass} mt-1.5`}
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        min={min}
        step={step}
        disabled={disabled}
        onChange={(event) =>
          onChange(Math.max(0, Number(event.target.value) || 0))
        }
      />
    </label>
  );
}
function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-background p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
function WallDiagram({
  wall,
  rollWidthM,
  strips,
  allowanceDrops,
  unit,
  doorWidthM,
  doorHeightM,
  windowWidthM,
  windowHeightM,
  isPanelFormat,
}: {
  wall?: WallpaperWallInput;
  rollWidthM: number;
  strips: number;
  allowanceDrops: number;
  unit: DisplayUnit;
  doorWidthM: number;
  doorHeightM: number;
  windowWidthM: number;
  windowHeightM: number;
  isPanelFormat: boolean;
}) {
  if (!wall) return null;
  const wallWidth = Math.max(wall.widthM, 0.1);
  const wallHeight = Math.max(wall.heightM, 0.1);
  const x = 78;
  const y = 42;
  const width = 300;
  const height = 190;
  const stripWidth = width / Math.max(strips, 1);
  const doorW = Math.min((doorWidthM / wallWidth) * width, width * 0.35);
  const doorH = Math.min((doorHeightM / wallHeight) * height, height * 0.65);
  const windowW = Math.min((windowWidthM / wallWidth) * width, width * 0.3);
  const windowH = Math.min((windowHeightM / wallHeight) * height, height * 0.4);
  return (
    <div className="border-b border-border bg-muted/30 px-3 py-5 sm:px-5">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Strip layout · {wall.label}</span>
        <span>
          {rollWidthM.toFixed(2)} m {isPanelFormat ? "panel" : "roll"} width
        </span>
      </div>
      <svg
        viewBox="0 0 460 290"
        role="img"
        aria-label={`${wall.label}, ${toDisplay(wall.widthM, unit).toFixed(2)} ${unit} wide by ${toDisplay(wall.heightM, unit).toFixed(2)} ${unit} high, shown as ${strips} vertical wallpaper drops`}
        className="mx-auto block w-full max-w-lg"
      >
        <text
          x="228"
          y="22"
          textAnchor="middle"
          className="fill-foreground"
          fontSize="13"
        >
          Width: {toDisplay(wall.widthM, unit).toFixed(2)} {unit}
        </text>
        <text
          x="18"
          y="140"
          textAnchor="start"
          className="fill-foreground"
          fontSize="13"
        >
          Height:
        </text>
        <text
          x="18"
          y="158"
          textAnchor="start"
          className="fill-foreground"
          fontSize="13"
        >
          {toDisplay(wall.heightM, unit).toFixed(2)} {unit}
        </text>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="2"
          className="fill-primary/15 stroke-primary/60"
          strokeWidth="1.5"
        />
        {Array.from({ length: Math.max(strips, 1) - 1 }, (_, i) => (
          <line
            key={i}
            x1={x + (i + 1) * stripWidth}
            y1={y}
            x2={x + (i + 1) * stripWidth}
            y2={y + height}
            className="stroke-primary/40"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}
        {wall.doors > 0 && (
          <g>
            <rect
              x={x + width * 0.11}
              y={y + height - doorH}
              width={doorW}
              height={doorH}
              rx="2"
              className="fill-background stroke-muted-foreground/60"
            />
            <text
              x={x + width * 0.11 + doorW / 2}
              y={y + height - doorH / 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              Door
            </text>
          </g>
        )}
        {wall.windows > 0 && (
          <g>
            <rect
              x={x + width * 0.59}
              y={y + height * 0.25}
              width={windowW}
              height={windowH}
              rx="2"
              className="fill-background stroke-muted-foreground/60"
            />
            <text
              x={x + width * 0.59 + windowW / 2}
              y={y + height * 0.25 + windowH / 2 + 3}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              Window
            </text>
          </g>
        )}
        <text
          x="228"
          y="252"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="12"
        >
          {strips} coverage drops
          {allowanceDrops ? ` · +${allowanceDrops} allowance` : ""} · not to
          scale
        </text>
        <text
          x="228"
          y="271"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          Opening symbols show one example; counts are entered above.
        </text>
      </svg>
    </div>
  );
}
