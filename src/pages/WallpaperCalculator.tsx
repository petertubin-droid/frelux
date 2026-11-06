import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Plus,
  RotateCcw,
  Layers,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useMarket } from "@/lib/international/market-context";
import { useSeo } from "@/lib/seo";
import { calculateWallpaperEstimate, type WallpaperWallInput } from "@/lib/calculators/wallpaper-calculator";
import { formatNumber } from "@/lib/utils";
import { formatWithSymbol } from "@/lib/international/currency-format";

const METRES_PER_FOOT = 0.3048;
const INITIAL_WALL: WallpaperWallInput = {
  id: "wall-1", label: "Wall 1", widthM: 3.6, heightM: 3, doors: 0, windows: 0,
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

export default function WallpaperCalculator() {
  const { market, preferredLengthUnit, preferredAreaUnit } = useMarket();
  const [unit, setUnit] = useState<DisplayUnit>(
    preferredLengthUnit === "feet" ? "ft" : preferredLengthUnit === "inches" ? "in" : "m",
  );
  useEffect(() => {
    setUnit(preferredLengthUnit === "feet" ? "ft" : preferredLengthUnit === "inches" ? "in" : "m");
    if (market.currencyCode !== "NGN") {
      // Nigerian example values must never be silently relabelled as another currency.
      setRollPrice(0);
      setLabourPerRoll(0);
    }
  }, [market.marketCode, market.currencyCode, preferredLengthUnit]);
  const [walls, setWalls] = useState<WallpaperWallInput[]>([{ ...INITIAL_WALL }]);
  const [roll, setRoll] = useState("standard");
  const [pattern, setPattern] = useState<"random" | "straight" | "drop">("random");
  const [wasteRate, setWasteRate] = useState(0);
  const [patternRepeat, setPatternRepeat] = useState(0);
  const [doorWidth, setDoorWidth] = useState(1.0);
  const [doorHeight, setDoorHeight] = useState(2.1);
  const [windowWidth, setWindowWidth] = useState(1.25);
  const [windowHeight, setWindowHeight] = useState(1.2);
  const [showOpeningSizes, setShowOpeningSizes] = useState(false);
  const [extraRoll, setExtraRoll] = useState(false);
  // Example figures shown in the supplied screenshot are illustrative, not verified prices.
  const [rollPrice, setRollPrice] = useState(market.currencyCode === "NGN" ? 12500 : 0);
  const [labourPerRoll, setLabourPerRoll] = useState(market.currencyCode === "NGN" ? 4500 : 0);
  const [adhesivePerRolls, setAdhesivePerRolls] = useState(5);
  const [previewWallId, setPreviewWallId] = useState(INITIAL_WALL.id);

  const rollSpec = roll === "wide"
    ? { widthM: 1.06, lengthM: 15.6, label: "Wide · 1.06 × 15.6 m" }
    : { widthM: 0.53, lengthM: 10, label: "Standard · 0.53 × 10 m" };

  const estimate = useMemo(() => calculateWallpaperEstimate({
    walls,
    rollWidthM: rollSpec.widthM,
    rollLengthM: rollSpec.lengthM,
    openingDoorWidthM: doorWidth,
    openingDoorHeightM: doorHeight,
    openingWindowWidthM: windowWidth,
    openingWindowHeightM: windowHeight,
    pattern,
    patternRepeatM: patternRepeat,
    wasteRate,
    extraRoll,
    rollPrice,
    labourPerRoll,
    adhesivePerRolls,
  }), [walls, rollSpec.widthM, rollSpec.lengthM, doorWidth, doorHeight, windowWidth, windowHeight, pattern, patternRepeat, wasteRate, extraRoll, rollPrice, labourPerRoll, adhesivePerRolls]);

  const previewWall = walls.find((wall) => wall.id === previewWallId) ?? walls[0];
  const previewBaseStrips = previewWall ? Math.ceil(previewWall.widthM / rollSpec.widthM) : 0;
  const previewStripCount = previewBaseStrips;
  const previewAllowanceDrops = previewWall ? Math.max(0, Math.ceil(previewBaseStrips * (1 + wasteRate)) - previewBaseStrips) : 0;
  const currency = market.currencySymbol || market.currencyCode;
  const money = (amount: number) => formatWithSymbol(amount, currency);
  const labelUnit = unit;

  useSeo({
    title: "Wallpaper Calculator: Rolls, Materials & Installation Budget | FRELUX",
    description: "Estimate wallpaper rolls from measured wall dimensions, openings, roll sizes and pattern allowance. See the wall-strip diagram, materials and optional installation budget.",
    canonicalPath: "/wallpaper-calculator",
    keywords: "wallpaper calculator, wallpaper rolls, wall covering, wallpaper installation cost, wallpaper pattern waste",
  });

  const updateWall = (id: string, patch: Partial<WallpaperWallInput>) => {
    setWalls((current) => current.map((wall) => wall.id === id ? { ...wall, ...patch } : wall));
  };
  const addWall = () => {
    const id = `wall-${Date.now()}`;
    const next = { ...INITIAL_WALL, id, label: `Wall ${walls.length + 1}` };
    setWalls((current) => [...current, next]);
    setPreviewWallId(id);
  };
  const reset = () => {
    setWalls([{ ...INITIAL_WALL }]);
    setRoll("standard"); setPattern("random"); setWasteRate(0.05);
    setPatternRepeat(0); setExtraRoll(false); setShowOpeningSizes(false);
  };

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Wall finishes · Quantity & budget"
        title="Wallpaper Calculator"
        subtitle="Plan wallpaper rolls from measured walls, real roll dimensions and pattern allowances. Add your local supplier and fitting quotes for a project budget."
        breadcrumbs={[{ label: "Construction tools", path: "/construction-tools" }, { label: "Wallpaper Calculator" }]}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
          <section className="space-y-5" aria-label="Wallpaper measurements">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Measure your walls</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Enter each wall separately. Openings reduce net area; full-height drops remain in the roll cut estimate.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{market.countryName}</span>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
                <Field label="Wallpaper roll" hint="Roll sizes from the supplied brief">
                  <select className={inputClass} value={roll} onChange={(event) => setRoll(event.target.value)}>
                    <option value="standard">Standard · 0.53 × 10 m</option>
                    <option value="wide">Wide · 1.06 × 15.6 m</option>
                  </select>
                </Field>
                <Field label="Dimension unit" hint="Choose the unit used in the form">
                  <select className={inputClass} value={unit} onChange={(event) => setUnit(event.target.value as DisplayUnit)} aria-label="Measurement unit">
                    <option value="m">Metres</option>
                    <option value="ft">Feet</option>
                    <option value="in">Inches</option>
                  </select>
                </Field>
              </div>

              <div className="space-y-3">
                {walls.map((wall, index) => (
                  <div key={wall.id} className="rounded-xl border border-border/80 bg-background/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{wall.label}</h3>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewWallId(wall.id)} aria-pressed={previewWallId === wall.id}>Diagram</Button>
                        {walls.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${wall.label}`} onClick={() => { setWalls((current) => current.filter((item) => item.id !== wall.id)); if (previewWallId === wall.id) setPreviewWallId(walls[Math.max(0, index - 1)].id); }}><Minus className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField label={`Width (${labelUnit})`} value={toDisplay(wall.widthM, unit)} min="0.1" step="0.01" onChange={(value) => updateWall(wall.id, { widthM: toMetres(value, unit) })} />
                      <NumberField label={`Height (${labelUnit})`} value={toDisplay(wall.heightM, unit)} min="0.1" step="0.01" onChange={(value) => updateWall(wall.id, { heightM: toMetres(value, unit) })} />
                      <NumberField label="Doors" value={wall.doors} min="0" step="1" onChange={(value) => updateWall(wall.id, { doors: Math.floor(value) })} />
                      <NumberField label="Windows" value={wall.windows} min="0" step="1" onChange={(value) => updateWall(wall.id, { windows: Math.floor(value) })} />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={addWall}><Plus className="mr-2 h-4 w-4" />Add another wall</Button>
              <button type="button" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline" aria-expanded={showOpeningSizes} onClick={() => setShowOpeningSizes((show) => !show)}>
                {showOpeningSizes ? "Hide" : "Edit"} opening deduction dimensions
              </button>
              {showOpeningSizes && <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
                <NumberField label={`Door width (${labelUnit})`} value={toDisplay(doorWidth, unit)} min="0.1" step="0.01" onChange={(value) => setDoorWidth(toMetres(value, unit))} />
                <NumberField label={`Door height (${labelUnit})`} value={toDisplay(doorHeight, unit)} min="0.1" step="0.01" onChange={(value) => setDoorHeight(toMetres(value, unit))} />
                <NumberField label={`Window width (${labelUnit})`} value={toDisplay(windowWidth, unit)} min="0.1" step="0.01" onChange={(value) => setWindowWidth(toMetres(value, unit))} />
                <NumberField label={`Window height (${labelUnit})`} value={toDisplay(windowHeight, unit)} min="0.1" step="0.01" onChange={(value) => setWindowHeight(toMetres(value, unit))} />
                <p className="col-span-2 text-xs leading-relaxed text-muted-foreground">Initial opening dimensions are editable planning examples, not verified local building standards. Measure actual openings for a better area estimate.</p>
              </div>}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">Pattern & cutting allowance</h2>
              <p className="mt-1 text-sm text-muted-foreground">Allowances are planning options, not verified Nigerian market standards. Pattern repeat increases cut length when supplied.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Pattern match">
                  <select className={inputClass} value={pattern} onChange={(event) => setPattern(event.target.value as typeof pattern)}>
                    <option value="random">Random / plain</option><option value="straight">Straight match</option><option value="drop">Half-drop match</option>
                  </select>
                </Field>
                <Field label="Planning waste allowance">
                  <select className={inputClass} value={wasteRate} onChange={(event) => setWasteRate(Number(event.target.value))}>
                    <option value={0}>0% · no additional allowance</option><option value={0.05}>5% · illustrative</option><option value={0.12}>12% · illustrative</option><option value={0.20}>20% · illustrative</option>
                  </select>
                </Field>
                <NumberField label={`Pattern repeat (${labelUnit}; 0 if unknown)`} value={toDisplay(patternRepeat, unit)} min="0" step="0.01" onChange={(value) => setPatternRepeat(toMetres(value, unit))} />
                <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={extraRoll} onChange={(event) => setExtraRoll(event.target.checked)} />
                  <span><span className="block font-medium text-foreground">Add one spare roll</span><span className="text-xs text-muted-foreground">Optional, shown separately in the total</span></span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">Local quote & accessories</h2>
              <p className="mt-1 text-sm text-muted-foreground">Edit these example figures with current supplier and installer quotes. FRELUX does not verify these prices.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField label={`Price per roll (${currency})`} value={rollPrice} min="0" step="100" onChange={setRollPrice} />
                <NumberField label={`Labour per roll (${currency})`} value={labourPerRoll} min="0" step="100" onChange={setLabourPerRoll} />
                <NumberField label="Adhesive pack covers (rolls)" value={adhesivePerRolls} min="1" step="1" onChange={(value) => setAdhesivePerRolls(Math.max(1, Math.floor(value)))} />
                <div className="flex items-center rounded-xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">Adhesive coverage is product-specific. The initial 1 pack per 5 rolls is an editable planning assumption; follow the package instructions.</div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">The displayed price and labour values are illustrative figures from the supplied screenshot, not live market prices or a supplier quote.</p>
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start" aria-label="Estimate results and wall diagram">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-sm font-medium text-muted-foreground">Estimated project budget</p><p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{money(estimate.totalCost)}</p></div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Layers className="h-6 w-6" /></span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Based on {estimate.rolls} rolls and {areaDisplay(estimate.netAreaM2, preferredAreaUnit)} net wall area · manual prices</p>
                {estimate.invalidWall && <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Check {estimate.invalidWall}: dimensions or opening deductions are invalid.</p>}
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                <ResultMetric label="Rolls" value={`${estimate.rolls}`} />
                <ResultMetric label="Net area" value={areaDisplay(estimate.netAreaM2, preferredAreaUnit)} />
                <ResultMetric label="Material" value={money(estimate.materialCost)} />
                <ResultMetric label="Installation" value={money(estimate.labourCost)} />
              </div>
              <WallDiagram wall={previewWall} rollWidthM={rollSpec.widthM} strips={previewStripCount} allowanceDrops={previewAllowanceDrops} unit={unit} doorWidthM={doorWidth} doorHeightM={doorHeight} windowWidthM={windowWidth} windowHeightM={windowHeight} />
              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Adhesive packs</p><p className="mt-1 font-semibold text-foreground">{estimate.adhesivePacks} packs</p></div>
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Estimated wall drops</p><p className="mt-1 font-semibold text-foreground">{estimate.strips} strips</p></div>
              </div>
              <div className="border-t border-border p-5">
                <p className="text-xs leading-relaxed text-muted-foreground">Planning estimate only. Pattern repeat, usable offcuts, wall irregularities and product coverage affect actual quantities. Confirm measurements, roll batch, adhesive coverage and labour with your installer before purchase.</p>
                <Link to="/marketplace?tab=products" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  Browse materials on FRELUX Marketplace <ArrowRight className="h-4 w-4" />
                </Link>
                <Button type="button" variant="ghost" className="mt-2 w-full" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset estimate</Button>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Pricing note:</strong> Costs use the currency and manual figures selected on this page only. They are not live, verified supplier prices and are not converted from another market.
            </div>
          </aside>
        </div>
        <section className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-xl font-bold text-foreground">How this estimate works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Net wall area is gross measured wall area less the editable door and window dimensions. Deductions are capped by each wall’s area.</li>
            <li>Roll count is based on full-height wallpaper drops, actual selected roll length and width, and an efficient estimate of reusable offcuts. It is not based on theoretical roll area alone.</li>
            <li>Pattern repeats lengthen cuts when you enter the repeat. The optional percentage adds strips; it is a planning allowance, not an industry standard.</li>
            <li>Adhesive is estimated from the coverage you enter. Always follow the selected adhesive manufacturer’s coverage instructions.</li>
          </ol>
        </section>
      </main>
    </>
  );
}

const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground">{label}{children}<span className="sr-only">{hint}</span></label>;
}
function NumberField({ label, value, min, step, onChange }: { label: string; value: number; min: string; step: string; onChange: (value: number) => void }) {
  return <label className="block text-sm font-medium text-foreground">{label}<input className={`${inputClass} mt-1.5`} type="number" value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0} min={min} step={step} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} /></label>;
}
function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-background p-3 text-center"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div>;
}
function WallDiagram({ wall, rollWidthM, strips, allowanceDrops, unit, doorWidthM, doorHeightM, windowWidthM, windowHeightM }: { wall?: WallpaperWallInput; rollWidthM: number; strips: number; allowanceDrops: number; unit: DisplayUnit; doorWidthM: number; doorHeightM: number; windowWidthM: number; windowHeightM: number }) {
  if (!wall) return null;
  const wallWidth = Math.max(wall.widthM, 0.1);
  const wallHeight = Math.max(wall.heightM, 0.1);
  const x = 78; const y = 42; const width = 300; const height = 190;
  const stripWidth = width / Math.max(strips, 1);
  const doorW = Math.min(doorWidthM / wallWidth * width, width * 0.35);
  const doorH = Math.min(doorHeightM / wallHeight * height, height * 0.65);
  const windowW = Math.min(windowWidthM / wallWidth * width, width * 0.3);
  const windowH = Math.min(windowHeightM / wallHeight * height, height * 0.4);
  return <div className="border-b border-border bg-muted/30 px-3 py-5 sm:px-5">
    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Strip layout · {wall.label}</span><span>{rollWidthM.toFixed(2)} m roll width</span></div>
    <svg viewBox="0 0 460 290" role="img" aria-label={`${wall.label}, ${toDisplay(wall.widthM, unit).toFixed(2)} ${unit} wide by ${toDisplay(wall.heightM, unit).toFixed(2)} ${unit} high, shown as ${strips} vertical wallpaper drops`} className="mx-auto block w-full max-w-lg">
      <text x="228" y="22" textAnchor="middle" className="fill-foreground" fontSize="13">Width: {toDisplay(wall.widthM, unit).toFixed(2)} {unit}</text>
      <text x="18" y="140" textAnchor="start" className="fill-foreground" fontSize="13">Height:</text>
      <text x="18" y="158" textAnchor="start" className="fill-foreground" fontSize="13">{toDisplay(wall.heightM, unit).toFixed(2)} {unit}</text>
      <rect x={x} y={y} width={width} height={height} rx="2" className="fill-primary/15 stroke-primary/60" strokeWidth="1.5" />
      {Array.from({ length: Math.max(strips, 1) - 1 }, (_, i) => <line key={i} x1={x + (i + 1) * stripWidth} y1={y} x2={x + (i + 1) * stripWidth} y2={y + height} className="stroke-primary/40" strokeWidth="1" strokeDasharray="4 3" />)}
      {wall.doors > 0 && <g><rect x={x + width * 0.11} y={y + height - doorH} width={doorW} height={doorH} rx="2" className="fill-background stroke-muted-foreground/60" /><text x={x + width * 0.11 + doorW / 2} y={y + height - doorH / 2} textAnchor="middle" className="fill-muted-foreground" fontSize="10">Door</text></g>}
      {wall.windows > 0 && <g><rect x={x + width * 0.59} y={y + height * 0.25} width={windowW} height={windowH} rx="2" className="fill-background stroke-muted-foreground/60" /><text x={x + width * 0.59 + windowW / 2} y={y + height * 0.25 + windowH / 2 + 3} textAnchor="middle" className="fill-muted-foreground" fontSize="10">Window</text></g>}
      <text x="228" y="252" textAnchor="middle" className="fill-muted-foreground" fontSize="12">{strips} coverage drops{allowanceDrops ? ` · +${allowanceDrops} allowance` : ""} · not to scale</text>
      <text x="228" y="271" textAnchor="middle" className="fill-muted-foreground" fontSize="10">Opening symbols show one example; counts are entered above.</text>
    </svg>
  </div>;
}
