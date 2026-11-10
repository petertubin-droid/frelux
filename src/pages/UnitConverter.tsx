import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Copy,
  Check,
  RotateCcw,
  Ruler,
  LandPlot,
  FlaskConical,
  Weight,
  Boxes,
  PaintBucket,
  Home,
  Thermometer,
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import {
  AREA_LABELS,
  LENGTH_LABELS,
  MASS_LABELS,
  MATERIAL_DENSITIES,
  PLOT_PRESETS,
  VOLUME_LABELS,
  UNIVERSAL_DIMENSION_LABELS,
  UNIVERSAL_UNITS,
  TEMPERATURE_LABELS,
  TEMPERATURE_SHORT,
  convertTemperature,
  fromCelsius,
  bagsFromMass,
  convertArea,
  convertLength,
  convertMass,
  convertUniversal,
  convertVolume,
  findUniversalUnit,
  feetInchesToMetres,
  findMaterial,
  formatNumber,
  massToVolumeM3,
  metresToFeetInches,
  paintBuckets,
  parseMeasurement,
  plotAreaFromPreset,
  plotAreaM2,
  plotsPerAcre,
  roofAreaFromPlan,
  roofPitchDegrees,
  volumeToMassKg,
  type AreaUnit,
  type TemperatureUnit,
  type UniversalDimension,
  type LengthUnit,
  type MassUnit,
  type VolumeUnit,
} from "@/lib/convert/units";

/**
 * Construction Measurement Converter.
 *
 * A construction-focused metric and imperial converter. Local conventions
 * such as plot dimensions and material planning assumptions are labelled,
 * editable and never presented as universal standards.
 */

type TabId =
  | "universal"
  | "length"
  | "area"
  | "volume"
  | "weight"
  | "temperature"
  | "materials"
  | "paint"
  | "roofing";

const TABS: { id: TabId; label: string; icon: typeof Ruler }[] = [
  { id: "universal", label: "All units", icon: ArrowLeftRight },
  { id: "length", label: "Length", icon: Ruler },
  { id: "area", label: "Area & land", icon: LandPlot },
  { id: "volume", label: "Volume", icon: FlaskConical },
  { id: "weight", label: "Weight", icon: Weight },
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "materials", label: "Materials", icon: Boxes },
  { id: "paint", label: "Paint", icon: PaintBucket },
  { id: "roofing", label: "Roofing", icon: Home },
];

const FIELD =
  "w-full rounded-xl border border-white/20 bg-white/70 px-3 py-2.5 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5";
const LABEL =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";
const PANEL =
  "rounded-2xl border border-white/20 bg-white/70 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6";
const CHIP =
  "rounded-full border border-white/25 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10 dark:border-white/10 dark:bg-white/5";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, []);
  return { copied, copy };
}

function ResultRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-white/10 py-2 first:border-t-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={classNames(
          "tabular-nums text-foreground",
          emphasis ? "text-lg font-semibold" : "text-sm font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Assumption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
      {children}
    </p>
  );
}

export default function UnitConverter() {
  const [tab, setTab] = useState<TabId>("universal");

  useSeo({
    title: "Unit Converter: Feet, Metres, Tonnes, Bags | FRELUX",
    description:
      "Convert feet to metres, plots to square metres, tonnes and 50 kg bags, litres and buckets. Every conversion factor is exact and each assumption is stated.",
    canonicalPath: "/unit-converter",
    keywords:
      "construction measurement converter, feet to metres, inches to millimetres, plot to square metres, tonnes to bags, sand density, paint bucket calculator, metric to imperial construction",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Construction Measurement Converter",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/unit-converter`,
        description:
          "Converts construction measurements between metric and imperial units, including land plots, material weights and volumes, and paint bucket quantities.",
        offers: {
          "@context": "https://schema.org",
          "@type": "Offer",
          price: "0",
        },
      },
    ],
  });

  return (
    <div className="pb-16">
      <Container className="pt-10 sm:pt-14">
        <PageHeader
          eyebrow="Free construction tool"
          title="Construction Measurement Converter"
          subtitle="Convert common metric and imperial measurements for construction, from feet and inches to square metres, cubic yards and tonnes. See the conversion method, and supply depth, density or bag weight when a result depends on it."
          breadcrumbs={[
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Measurement Converter" },
          ]}
        />

        <section
          aria-label="Converter overview"
          className="mt-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-foreground">
                One place for site measurements and quantity checks
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Convert defined units directly. Cross-dimension estimates are
                labelled as geometry assumptions; material volume needs a
                density, and a bag count needs the actual bag weight. Plot sizes
                and material defaults are regional examples, not standards.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Runs in your browser · no account needed
            </span>
          </div>
        </section>

        <div
          role="tablist"
          aria-label="Conversion categories"
          className="mt-6 flex gap-2 overflow-x-auto pb-1"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={classNames(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-primary/40 bg-primary/15 text-foreground shadow-sm"
                    : "border-white/20 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5",
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {tab === "universal" && <UniversalPanel />}
          {tab === "length" && <LengthPanel />}
          {tab === "area" && <AreaPanel />}
          {tab === "volume" && <VolumePanel />}
          {tab === "weight" && <WeightPanel />}
          {tab === "temperature" && <TemperaturePanel />}
          {tab === "materials" && <MaterialsPanel />}
          {tab === "paint" && <PaintPanel />}
          {tab === "roofing" && <RoofingPanel />}
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className={PANEL}>
            <h2 className="text-lg font-semibold text-foreground">
              Take the number to a calculator
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Convert here, then paste the metric value straight into the tool
              that does the estimate.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { to: "/paint-calculator", label: "Paint calculator" },
                { to: "/tile-calculator", label: "Tile calculator" },
                { to: "/screeding-calculator", label: "Screeding calculator" },
                {
                  to: "/pop-ceiling-calculator",
                  label: "POP ceiling calculator",
                },
                {
                  to: "/structural-calculator",
                  label: "Structural calculator",
                },
                { to: "/flooring", label: "Flooring estimator" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className={CHIP}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className={PANEL}>
            <h2 className="text-lg font-semibold text-foreground">
              How the numbers are worked out
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                Every conversion runs in one base unit, so chained conversions
                never drift.
              </li>
              <li>
                Constants are exact: an inch is 0.0254 m, an acre is
                4046.8564224 m².
              </li>
              <li>
                US and imperial gallons, short tons and long tons are separate
                units, never merged.
              </li>
              <li>
                Weight and volume are linked only through a density you can see
                and change.
              </li>
              <li>
                Everything is calculated in your browser. No measurement is sent
                anywhere.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-white/15 bg-white/35 px-4 py-2 dark:bg-white/[0.03]">
          <FaqItemsWithSchema
            title="Measurement converter FAQs"
            faqs={[
              {
                question: "Which construction units can I convert?",
                answer:
                  "The all-units converter covers metric and imperial length, area, volume and mass units, plus clearly labelled plot-size examples. Dedicated tabs also cover feet-and-inches measurements, material density and bag weight, paint buckets, and pitched-roof area.",
              },
              {
                question: "How many square metres are in a plot?",
                answer:
                  "A plot is a local land convention, not a fixed international unit. This page includes example presets for 50 × 100 ft, 60 × 120 ft and 100 × 100 ft, calculated from those dimensions. Confirm the actual surveyed plot boundaries before using a preset for purchase, design or legal purposes.",
              },
              {
                question: "Can I convert tonnes of sand into cubic metres?",
                answer:
                  "Yes, when a bulk density is supplied. For example, 20 metric tonnes at 1,600 kg/m³ gives 12.5 m³. Density changes with material grading, moisture and compaction, so the example is not a supplier guarantee; inspect or replace the selected density with a project-specific value.",
              },
              {
                question: "Can I convert an area into a volume?",
                answer:
                  "Yes, if you provide the layer depth. The calculation is area × depth. A length can also be treated as the side of a square or cube, but the result is explicitly labelled as that geometric assumption rather than a measured shape.",
              },
              {
                question: "Are US and imperial gallons the same?",
                answer:
                  "No. One US gallon is exactly 3.785411784 litres, while one imperial gallon is exactly 4.54609 litres. Choose the gallon system stated by the drawing, product or supplier.",
              },
              {
                question:
                  "Does the converter use local prices or save my measurements?",
                answer:
                  "No. It performs unit calculations in your browser and does not fetch supplier prices or save the measurements. Material densities, plot presets and bucket sizes are assumptions to verify against the specific market and product.",
              },
            ]}
          />
        </section>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------- universal

const DIMENSION_ORDER: UniversalDimension[] = [
  "length",
  "area",
  "volume",
  "mass",
  "pressure",
  "force",
  "energy",
  "power",
  "speed",
  "density",
  "flow",
  "angle",
  "time",
];

function UnitSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      >
        {DIMENSION_ORDER.map((dimension) => (
          <optgroup
            key={dimension}
            label={UNIVERSAL_DIMENSION_LABELS[dimension]}
          >
            {UNIVERSAL_UNITS.filter((unit) => unit.dimension === dimension).map(
              (unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ),
            )}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function UniversalPanel() {
  const [amount, setAmount] = useState("60");
  const [from, setFrom] = useState("area-plot-60x120");
  const [to, setTo] = useState("area-m2");
  const [depth, setDepth] = useState("0.1");
  const [density, setDensity] = useState("1600");
  const [materialId, setMaterialId] = useState("sharp-sand");
  const { copied, copy } = useCopy();

  const fromUnit = findUniversalUnit(from);
  const toUnit = findUniversalUnit(to);
  const dimensions = [fromUnit?.dimension, toUnit?.dimension];
  const crossesAreaVolume =
    dimensions.includes("area") && dimensions.includes("volume");
  const crossesMass =
    dimensions.includes("mass") &&
    (dimensions.includes("volume") ||
      dimensions.includes("area") ||
      dimensions.includes("length"));
  const incompatible =
    dimensions.includes("mass") &&
    !dimensions.includes("volume") &&
    !dimensions.includes("area") &&
    !dimensions.includes("length");

  const value = parseMeasurement(amount);
  const result =
    value === null
      ? null
      : convertUniversal(value, from, to, {
          depthM: parseMeasurement(depth) ?? undefined,
          densityKgM3: parseMeasurement(density) ?? undefined,
        });

  const pickMaterial = (id: string) => {
    setMaterialId(id);
    const found = findMaterial(id);
    if (found) setDensity(String(found.densityKgM3));
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyText =
    result?.value !== null && result?.value !== undefined
      ? `${formatNumber(result.value)} ${toUnit?.label ?? ""}`
      : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Any measurement into any other
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every unit in the tool is available on both sides: length, area,
          volume and weight, plus the families that arrive on a spec sheet such
          as pressure, force, energy, power, flow, density, speed, angle and
          time. Units convert exactly within their family, and cross over where
          the arithmetic is honest.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DIMENSION_ORDER.map((dimension) => (
            <span
              key={dimension}
              className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:border-white/10"
            >
              {UNIVERSAL_DIMENSION_LABELS[dimension]} ·{" "}
              {
                UNIVERSAL_UNITS.filter((unit) => unit.dimension === dimension)
                  .length
              }
            </span>
          ))}
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground dark:border-white/10">
            {UNIVERSAL_UNITS.length} units
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <div>
            <label className={LABEL} htmlFor="all-amount">
              Measurement
            </label>
            <input
              id="all-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={FIELD}
            />
            <div className="mt-2">
              <UnitSelect
                id="all-from"
                label="From"
                value={from}
                onChange={setFrom}
              />
            </div>
          </div>

          <button
            onClick={swap}
            aria-label="Swap units"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/70 text-foreground transition hover:border-primary/40 hover:bg-primary/10 dark:border-white/10 dark:bg-white/5"
          >
            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
          </button>

          <div>
            <label className={LABEL}>Result</label>
            <div
              aria-live="polite"
              className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-lg font-semibold tabular-nums text-foreground"
            >
              {result?.value === null || result?.value === undefined
                ? "n/a"
                : `${formatNumber(result.value)}`}
            </div>
            <div className="mt-2">
              <UnitSelect id="all-to" label="To" value={to} onChange={setTo} />
            </div>
          </div>
        </div>

        {(crossesAreaVolume || crossesMass) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {crossesAreaVolume && (
              <div>
                <label className={LABEL} htmlFor="all-depth">
                  Depth of the layer (m)
                </label>
                <input
                  id="all-depth"
                  inputMode="decimal"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className={FIELD}
                />
              </div>
            )}
            {crossesMass && (
              <>
                <div>
                  <label className={LABEL} htmlFor="all-material">
                    Material
                  </label>
                  <select
                    id="all-material"
                    value={materialId}
                    onChange={(e) => pickMaterial(e.target.value)}
                    className={FIELD}
                  >
                    {MATERIAL_DENSITIES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="all-density">
                    Density (kg per m³)
                  </label>
                  <input
                    id="all-density"
                    inputMode="decimal"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className={FIELD}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            {
              a: "60",
              f: "area-plot-60x120",
              t: "area-m2",
              label: "Plot 60 x 120 to m²",
            },
            { a: "12", f: "len-ft", t: "len-m", label: "12 ft to m" },
            {
              a: "1",
              f: "area-acre",
              t: "area-hectare",
              label: "1 acre to hectares",
            },
            { a: "20", f: "mass-tonne", t: "vol-m3", label: "20 t sand to m³" },
            { a: "100", f: "area-m2", t: "area-ft2", label: "100 m² to ft²" },
            { a: "1", f: "vol-m3", t: "vol-yd3", label: "1 m³ to yd³" },
            {
              a: "1",
              f: "mass-tonne",
              t: "mass-bag50",
              label: "1 tonne to 50 kg bags",
            },
            { a: "6", f: "len-in", t: "len-cm", label: "6 in to cm" },
          ].map((quick) => (
            <button
              key={quick.label}
              className={CHIP}
              onClick={() => {
                setAmount(quick.a);
                setFrom(quick.f);
                setTo(quick.t);
              }}
            >
              {quick.label}
            </button>
          ))}
          <button className={CHIP} onClick={() => setAmount("")}>
            <span className="inline-flex items-center gap-1">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Clear
            </span>
          </button>
          <button
            className={CHIP}
            onClick={() => copyText && copy(copyText)}
            disabled={!copyText}
          >
            <span className="inline-flex items-center gap-1">
              {copied ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>

        {result?.error && (
          <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            {result.error}
          </p>
        )}
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          How this one was reached
        </h2>
        <div className="mt-3">
          <ResultRow
            label="From"
            value={`${amount || "0"} ${fromUnit?.label ?? ""}`}
          />
          <ResultRow
            label="To"
            value={
              result?.value === null || result?.value === undefined
                ? "n/a"
                : formatNumber(result.value)
            }
            emphasis
          />
          <ResultRow label="Target unit" value={toUnit?.label ?? "n/a"} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {result?.explanation ||
            "Choose a unit on both sides to see how the answer is reached."}
        </p>
        <Assumption>
          Same-kind units convert exactly. A square, a cube, a depth or a
          density is only assumed when the pair needs it, and the assumption is
          written above the answer, never hidden.
        </Assumption>
        <div className="mt-5 rounded-xl border border-border/60 bg-card/60 p-3 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Common equivalents
          </p>
          <div className="mt-2 space-y-0.5">
            {[
              { from: "area-m2", to: "area-ft2", amount: "1" },
              { from: "vol-m3", to: "vol-yd3", amount: "1" },
              { from: "mass-tonne", to: "mass-bag50", amount: "1" },
              { from: "area-acre", to: "area-m2", amount: "1" },
              { from: "len-m", to: "len-ft", amount: "1" },
              { from: "mass-kg", to: "mass-lb", amount: "1" },
            ].map((row) => {
              const fromLabel = findUniversalUnit(row.from)?.label ?? "";
              const toLabel = findUniversalUnit(row.to)?.label ?? "";
              const converted = convertUniversal(
                Number(row.amount),
                row.from,
                row.to,
              );
              return (
                <button
                  key={`${row.from}-${row.to}`}
                  type="button"
                  onClick={() => {
                    setAmount(row.amount);
                    setFrom(row.from);
                    setTo(row.to);
                  }}
                  className="flex w-full items-baseline justify-between gap-3 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
                >
                  <span className="text-xs text-muted-foreground">
                    {row.amount} {fromLabel}
                  </span>
                  <span className="tabular-nums text-xs font-semibold text-foreground">
                    {converted.value === null
                      ? "n/a"
                      : formatNumber(converted.value)}{" "}
                    <span className="font-normal text-muted-foreground">
                      {toLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Tap a row to load it above. The 50 kg bag is the common cement bag,
            not a standard for every material.
          </p>
        </div>
        {incompatible && (
          <p className="mt-3 text-xs text-muted-foreground">
            Weight and{" "}
            {fromUnit?.dimension === "mass"
              ? toUnit?.dimension
              : fromUnit?.dimension}{" "}
            need a volume and a density between them. The Materials tab does
            that path with a named material.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- length

function LengthPanel() {
  const [amount, setAmount] = useState("12");
  const [from, setFrom] = useState<LengthUnit>("ft");
  const [to, setTo] = useState<LengthUnit>("m");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("6");
  const { copied, copy } = useCopy();

  const value = parseMeasurement(amount);
  const result = value === null ? null : convertLength(value, from, to);
  const back = value === null ? null : convertLength(value, to, from);
  const tape = feetInchesToMetres(
    parseMeasurement(feet) ?? NaN,
    parseMeasurement(inches) ?? NaN,
  );
  const tapeBack = tape === null ? null : metresToFeetInches(tape);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className={PANEL}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <div>
            <label className={LABEL} htmlFor="length-amount">
              Measurement
            </label>
            <input
              id="length-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={FIELD}
              aria-describedby="length-result"
            />
            <select
              aria-label="Convert from"
              value={from}
              onChange={(e) => setFrom(e.target.value as LengthUnit)}
              className={`${FIELD} mt-2`}
            >
              {(Object.keys(LENGTH_LABELS) as LengthUnit[]).map((unit) => (
                <option key={unit} value={unit}>
                  {LENGTH_LABELS[unit]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swap}
            aria-label="Swap units"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/70 text-foreground transition hover:border-primary/40 hover:bg-primary/10 dark:border-white/10 dark:bg-white/5"
          >
            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
          </button>

          <div>
            <label className={LABEL} htmlFor="length-to">
              Converted to
            </label>
            <div
              id="length-result"
              aria-live="polite"
              className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-lg font-semibold tabular-nums text-foreground"
            >
              {result === null
                ? "Enter a number"
                : `${formatNumber(result)} ${to}`}
            </div>
            <select
              aria-label="Convert to"
              value={to}
              onChange={(e) => setTo(e.target.value as LengthUnit)}
              className={`${FIELD} mt-2`}
            >
              {(Object.keys(LENGTH_LABELS) as LengthUnit[]).map((unit) => (
                <option key={unit} value={unit}>
                  {LENGTH_LABELS[unit]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            {
              f: "in" as LengthUnit,
              t: "mm" as LengthUnit,
              label: "1 in to mm",
            },
            { f: "ft" as LengthUnit, t: "m" as LengthUnit, label: "1 ft to m" },
            { f: "m" as LengthUnit, t: "ft" as LengthUnit, label: "1 m to ft" },
            { f: "yd" as LengthUnit, t: "m" as LengthUnit, label: "1 yd to m" },
          ].map((quick) => (
            <button
              key={quick.label}
              className={CHIP}
              onClick={() => {
                setAmount("1");
                setFrom(quick.f);
                setTo(quick.t);
              }}
            >
              {quick.label}
            </button>
          ))}
          <button className={CHIP} onClick={() => setAmount("")}>
            <span className="inline-flex items-center gap-1">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Clear
            </span>
          </button>
          <button
            className={CHIP}
            onClick={() =>
              result !== null && copy(`${formatNumber(result)} ${to}`)
            }
          >
            <span className="inline-flex items-center gap-1">
              {copied ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/50 p-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
          {value === null ? (
            "Enter a measurement to see the formula."
          ) : (
            <>
              {formatNumber(value)} {from} ×{" "}
              {formatNumber(convertLength(1, from, to) ?? 0, 8)} ={" "}
              <strong className="text-foreground">
                {formatNumber(result)} {to}
              </strong>
              . One {from} is {formatNumber(convertLength(1, from, to) ?? 0, 8)}{" "}
              {to}.
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Reverse:{" "}
          {back === null
            ? "n/a"
            : `${formatNumber(back, 4)} ${from} in 1 ${to}`}
          . Imperial sizes on drawings are usually nominal, so confirm
          structural steel and timber sizes against the schedule.
        </p>
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Tape measure reading
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Feet and inches together, converted straight to metres for the
          calculators.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="tape-ft">
              Feet
            </label>
            <input
              id="tape-ft"
              inputMode="decimal"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="tape-in">
              Inches
            </label>
            <input
              id="tape-in"
              inputMode="decimal"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>
        <div className="mt-4">
          <ResultRow
            label="Metres"
            value={tape === null ? "n/a" : `${formatNumber(tape, 4)} m`}
            emphasis
          />
          <ResultRow
            label="Millimetres"
            value={
              tape === null
                ? "n/a"
                : `${formatNumber((tape ?? 0) * 1000, 1)} mm`
            }
          />
          <ResultRow
            label="Back to feet and inches"
            value={
              tapeBack === null
                ? "n/a"
                : `${tapeBack.feet} ft ${formatNumber(tapeBack.inches, 2)} in`
            }
          />
        </div>
        <Assumption>
          A tape measure reads to the nearest millimetre at best. Round the
          final material quantity, not the intermediate conversion.
        </Assumption>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- area

function AreaPanel() {
  const [preset, setPreset] = useState("60x120ft");
  const [width, setWidth] = useState("60");
  const [depth, setDepth] = useState("120");
  const [unit, setUnit] = useState<"ft" | "m">("ft");
  const [custom, setCustom] = useState(false);

  const area = custom
    ? plotAreaM2(
        parseMeasurement(width) ?? 0,
        parseMeasurement(depth) ?? 0,
        unit,
      )
    : plotAreaFromPreset(preset);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Plot and land size
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A plot is a local convention, so pick the standard that matches your
          area or measure your own.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PLOT_PRESETS.map((p) => (
            <button
              key={p.id}
              className={classNames(
                CHIP,
                !custom && preset === p.id && "border-primary/40 bg-primary/15",
              )}
              onClick={() => {
                setPreset(p.id);
                setWidth(String(p.width));
                setDepth(String(p.depth));
                setUnit(p.unit);
                setCustom(false);
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            className={classNames(
              CHIP,
              custom && "border-primary/40 bg-primary/15",
            )}
            onClick={() => setCustom(true)}
          >
            Custom size
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="plot-width">
              Width
            </label>
            <input
              id="plot-width"
              inputMode="decimal"
              value={width}
              onChange={(e) => {
                setWidth(e.target.value);
                setCustom(true);
              }}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="plot-depth">
              Depth
            </label>
            <input
              id="plot-depth"
              inputMode="decimal"
              value={depth}
              onChange={(e) => {
                setDepth(e.target.value);
                setCustom(true);
              }}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="plot-unit">
              Unit
            </label>
            <select
              id="plot-unit"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as "ft" | "m");
                setCustom(true);
              }}
              className={FIELD}
            >
              <option value="ft">Feet</option>
              <option value="m">Metres</option>
            </select>
          </div>
        </div>

        <Assumption>
          Measured to the boundary, not to the building. Setbacks, access roads
          and right of way are not deducted: check the survey plan and the state
          planning authority before you price land.
        </Assumption>
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">Land area</h2>
        <div className="mt-3">
          <ResultRow
            label="Square metres"
            value={area === null ? "n/a" : `${formatNumber(area, 2)} m²`}
            emphasis
          />
          <ResultRow
            label="Square feet"
            value={
              area === null
                ? "n/a"
                : `${formatNumber(convertArea(area, "m2", "ft2"), 0)} ft²`
            }
          />
          <ResultRow
            label="Square yards"
            value={
              area === null
                ? "n/a"
                : `${formatNumber(convertArea(area, "m2", "yd2"), 1)} yd²`
            }
          />
          <ResultRow
            label="Acres"
            value={
              area === null
                ? "n/a"
                : `${formatNumber(convertArea(area, "m2", "acre"), 3)} acres`
            }
          />
          <ResultRow
            label="Hectares"
            value={
              area === null
                ? "n/a"
                : `${formatNumber(convertArea(area, "m2", "hectare"), 4)} ha`
            }
          />
          <ResultRow
            label="Plots of this size per acre"
            value={area === null ? "n/a" : formatNumber(plotsPerAcre(area), 2)}
          />
        </div>

        <div className="mt-4">
          <label className={LABEL} htmlFor="area-quick">
            Convert any area
          </label>
          <AreaQuick />
        </div>
      </div>
    </div>
  );
}

function AreaQuick() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<AreaUnit>("ft2");
  const [to, setTo] = useState<AreaUnit>("m2");
  const value = parseMeasurement(amount);
  const result = value === null ? null : convertArea(value, from, to);
  return (
    <div id="area-quick" className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
      <input
        inputMode="decimal"
        aria-label="Area value"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={FIELD}
      />
      <select
        aria-label="Area from"
        value={from}
        onChange={(e) => setFrom(e.target.value as AreaUnit)}
        className={FIELD}
      >
        {(Object.keys(AREA_LABELS) as AreaUnit[]).map((u) => (
          <option key={u} value={u}>
            {AREA_LABELS[u]}
          </option>
        ))}
      </select>
      <select
        aria-label="Area to"
        value={to}
        onChange={(e) => setTo(e.target.value as AreaUnit)}
        className={FIELD}
      >
        {(Object.keys(AREA_LABELS) as AreaUnit[]).map((u) => (
          <option key={u} value={u}>
            {AREA_LABELS[u]}
          </option>
        ))}
      </select>
      <p
        aria-live="polite"
        className="sm:col-span-3 text-sm font-medium text-foreground"
      >
        {result === null ? "Enter a number" : `${formatNumber(result)} ${to}`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- volume and weight

function VolumePanel() {
  const [amount, setAmount] = useState("20");
  const [from, setFrom] = useState<VolumeUnit>("l");
  const [to, setTo] = useState<VolumeUnit>("gal_imp");
  const value = parseMeasurement(amount);
  const result = value === null ? null : convertVolume(value, from, to);
  return (
    <div className={PANEL}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="vol-amount">
            Volume
          </label>
          <input
            id="vol-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={FIELD}
          />
          <select
            aria-label="Volume from"
            value={from}
            onChange={(e) => setFrom(e.target.value as VolumeUnit)}
            className={`${FIELD} mt-2`}
          >
            {(Object.keys(VOLUME_LABELS) as VolumeUnit[]).map((u) => (
              <option key={u} value={u}>
                {VOLUME_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Result</label>
          <div
            aria-live="polite"
            className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-lg font-semibold tabular-nums text-foreground"
          >
            {result === null
              ? "Enter a number"
              : `${formatNumber(result)} ${to}`}
          </div>
          <select
            aria-label="Volume to"
            value={to}
            onChange={(e) => setTo(e.target.value as VolumeUnit)}
            className={`${FIELD} mt-2`}
          >
            {(Object.keys(VOLUME_LABELS) as VolumeUnit[]).map((u) => (
              <option key={u} value={u}>
                {VOLUME_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ResultRow label="Litres per US gallon" value="3.785411784 L" />
        <ResultRow label="Litres per imperial gallon" value="4.54609 L" />
        <ResultRow label="Cubic feet per cubic metre" value="35.3147 ft³" />
      </div>
      <Assumption>
        A US gallon and an imperial gallon differ by about 20 per cent. Paint
        and fuel specs usually mean one specific gallon, so check which before
        ordering.
      </Assumption>
    </div>
  );
}

function WeightPanel() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<MassUnit>("tonne");
  const [to, setTo] = useState<MassUnit>("kg");
  const value = parseMeasurement(amount);
  const result = value === null ? null : convertMass(value, from, to);
  return (
    <div className={PANEL}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="mass-amount">
            Weight
          </label>
          <input
            id="mass-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={FIELD}
          />
          <select
            aria-label="Weight from"
            value={from}
            onChange={(e) => setFrom(e.target.value as MassUnit)}
            className={`${FIELD} mt-2`}
          >
            {(Object.keys(MASS_LABELS) as MassUnit[]).map((u) => (
              <option key={u} value={u}>
                {MASS_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Result</label>
          <div
            aria-live="polite"
            className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-lg font-semibold tabular-nums text-foreground"
          >
            {result === null
              ? "Enter a number"
              : `${formatNumber(result)} ${to}`}
          </div>
          <select
            aria-label="Weight to"
            value={to}
            onChange={(e) => setTo(e.target.value as MassUnit)}
            className={`${FIELD} mt-2`}
          >
            {(Object.keys(MASS_LABELS) as MassUnit[]).map((u) => (
              <option key={u} value={u}>
                {MASS_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <ResultRow label="Metric tonne" value="1000 kg" />
        <ResultRow label="US short ton" value="907.18474 kg" />
        <ResultRow label="Imperial long ton" value="1016.0469088 kg" />
        <ResultRow label="Pound" value="0.45359237 kg" />
      </div>
      <Assumption>
        A "ton" of sand is not the same everywhere. Nigerian suppliers almost
        always mean the metric tonne, but a US short ton is 9 per cent lighter,
        so confirm before paying per ton.
      </Assumption>
    </div>
  );
}

// ---------------------------------------------------------------- temperature

const TEMPERATURE_PRESETS: { label: string; value: string; from: TemperatureUnit }[] = [
  { label: "Water freezes", value: "0", from: "c" },
  { label: "Room temperature", value: "20", from: "c" },
  { label: "Paint application", value: "10", from: "c" },
  { label: "Body temperature", value: "37", from: "c" },
  { label: "Oven, fan setting", value: "180", from: "c" },
];

const TEMPERATURE_REFERENCE: { label: string; celsius: number }[] = [
  { label: "Concrete must not freeze", celsius: 5 },
  { label: "Paint and adhesive minimum", celsius: 10 },
  { label: "Comfortable working day", celsius: 22 },
  { label: "Fresh mortar cure", celsius: 27 },
  { label: "Bitumen tack coat", celsius: 60 },
];

/**
 * Temperature, handled as offsets rather than ratios.
 *
 * A factor would answer the wrong question: 40 °F is not two of 20 °F. Each
 * reading is taken back to Celsius and written out again, the method is printed,
 * and a reading below absolute zero is refused rather than shown as a number.
 */
function TemperaturePanel() {
  const [amount, setAmount] = useState("20");
  const [from, setFrom] = useState<TemperatureUnit>("c");
  const [to, setTo] = useState<TemperatureUnit>("f");
  const { copied, copy } = useCopy();

  const raw = amount.trim();
  const parsed = raw === "" ? NaN : Number(raw.replace(/[\s,]/g, ""));
  const value = Number.isFinite(parsed) ? parsed : null;
  const converted =
    value === null ? null : convertTemperature(value, from, to);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyText =
    converted === null
      ? ""
      : `${formatNumber(value as number)} ${TEMPERATURE_SHORT[from]} = ${formatNumber(converted)} ${TEMPERATURE_SHORT[to]}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Celsius, Fahrenheit, Kelvin and Rankine
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Temperature is not a ratio, so this tab adds and subtracts instead of
          multiplying. Use it for a curing spec, a paint minimum or an oven
          setting that arrived in the other scale.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <div>
            <label className={LABEL} htmlFor="temp-amount">
              Temperature
            </label>
            <input
              id="temp-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={FIELD}
            />
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap units"
            className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/70 text-foreground transition hover:border-primary/40 hover:bg-primary/10 dark:border-white/10 dark:bg-white/5"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <div>
            <label className={LABEL} htmlFor="temp-result-unit">
              Result unit
            </label>
            <select
              id="temp-result-unit"
              value={to}
              onChange={(e) => setTo(e.target.value as TemperatureUnit)}
              className={FIELD}
            >
              {(Object.keys(TEMPERATURE_LABELS) as TemperatureUnit[]).map(
                (unit) => (
                  <option key={unit} value={unit}>
                    {TEMPERATURE_LABELS[unit]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className={LABEL} htmlFor="temp-from-unit">
            Reading in
          </label>
          <select
            id="temp-from-unit"
            value={from}
            onChange={(e) => setFrom(e.target.value as TemperatureUnit)}
            className={FIELD}
          >
            {(Object.keys(TEMPERATURE_LABELS) as TemperatureUnit[]).map(
              (unit) => (
                <option key={unit} value={unit}>
                  {TEMPERATURE_LABELS[unit]}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {TEMPERATURE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setAmount(preset.value);
                setFrom(preset.from);
              }}
              className={CHIP}
            >
              {preset.label} · {preset.value}
              {TEMPERATURE_SHORT[preset.from]}
            </button>
          ))}
        </div>
      </div>

      <div className={PANEL}>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {value === null
              ? "Enter a temperature"
              : `${formatNumber(value)} ${TEMPERATURE_SHORT[from]} reads as`}
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
            {converted === null ? "n/a" : formatNumber(converted)}
            <span className="ml-2 text-base font-medium text-muted-foreground">
              {TEMPERATURE_SHORT[to]}
            </span>
          </p>
          {converted === null && raw !== "" && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              That reading is not possible: nothing is colder than absolute zero.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copy(copyText)}
              disabled={converted === null}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
            >
              {copied ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy result"}
            </button>
            <span className="text-xs text-muted-foreground">
              °F = °C × 9/5 + 32 · K = °C + 273.15 · °R = (°C + 273.15) × 9/5
            </span>
          </div>
        </div>

        <table className="mt-4 w-full text-xs">
          <caption className="sr-only">
            Working temperatures on every scale
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-1.5 font-medium">
                Working reading
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                °C
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                °F
              </th>
            </tr>
          </thead>
          <tbody>
            {TEMPERATURE_REFERENCE.map((row) => (
              <tr key={row.label} className="border-t border-white/10">
                <td className="py-1.5 text-muted-foreground">{row.label}</td>
                <td className="py-1.5 text-right tabular-nums text-foreground">
                  {row.celsius}
                </td>
                <td className="py-1.5 text-right tabular-nums text-foreground">
                  {formatNumber(fromCelsius(row.celsius, "f"), 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- materials

function MaterialsPanel() {
  const [materialId, setMaterialId] = useState("sharp-sand");
  const [density, setDensity] = useState("1600");
  const [bagKg, setBagKg] = useState("50");
  const [mass, setMass] = useState("20");
  const [massUnit, setMassUnit] = useState<MassUnit>("tonne");

  const material = findMaterial(materialId);
  const densityValue = parseMeasurement(density) ?? 0;
  const bagValue = parseMeasurement(bagKg) ?? 0;
  const massKg = (() => {
    const raw = parseMeasurement(mass);
    if (raw === null) return null;
    return convertMass(raw, massUnit, "kg");
  })();
  const volume = massKg === null ? null : massToVolumeM3(massKg, densityValue);
  const bags = massKg === null ? null : bagsFromMass(massKg, bagValue);
  const reverse = volume === null ? null : volumeToMassKg(volume, densityValue);

  const pickMaterial = (id: string) => {
    setMaterialId(id);
    const found = findMaterial(id);
    if (found) {
      setDensity(String(found.densityKgM3));
      if (found.bagKg) setBagKg(String(found.bagKg));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Tonnes, cubic metres and bags
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weight becomes volume only through a density, and bags only through a
          bag weight. Both are shown and editable.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="material">
              Material
            </label>
            <select
              id="material"
              value={materialId}
              onChange={(e) => pickMaterial(e.target.value)}
              className={FIELD}
            >
              {MATERIAL_DENSITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {material && (
              <p className="mt-1 text-xs text-muted-foreground">
                {material.note}
              </p>
            )}
          </div>
          <div>
            <label className={LABEL} htmlFor="density">
              Density (kg per m³)
            </label>
            <input
              id="density"
              inputMode="decimal"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="bag-weight">
              Bag weight (kg)
            </label>
            <input
              id="bag-weight"
              inputMode="decimal"
              value={bagKg}
              onChange={(e) => setBagKg(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="load-mass">
              Quantity
            </label>
            <input
              id="load-mass"
              inputMode="decimal"
              value={mass}
              onChange={(e) => setMass(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="load-unit">
              Unit
            </label>
            <select
              id="load-unit"
              value={massUnit}
              onChange={(e) => setMassUnit(e.target.value as MassUnit)}
              className={FIELD}
            >
              {(Object.keys(MASS_LABELS) as MassUnit[]).map((u) => (
                <option key={u} value={u}>
                  {MASS_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Assumption>
          These densities are typical loose delivery values. Wet sand, compacted
          laterite and graded granite all move the figure, so treat the result
          as an estimate and confirm with the supplier's weighbridge ticket.
        </Assumption>
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          What that load comes to
        </h2>
        <div className="mt-3">
          <ResultRow
            label="Weight"
            value={massKg === null ? "n/a" : `${formatNumber(massKg, 1)} kg`}
          />
          <ResultRow
            label="Volume"
            value={volume === null ? "n/a" : `${formatNumber(volume, 3)} m³`}
            emphasis
          />
          <ResultRow
            label="Volume in cubic feet"
            value={
              volume === null
                ? "n/a"
                : `${formatNumber(convertVolume(volume, "m3", "ft3"), 1)} ft³`
            }
          />
          <ResultRow
            label={`Bags at ${bagValue || "?"} kg`}
            value={bags === null ? "n/a" : `${bags.toBuy} bags`}
            emphasis
          />
          <ResultRow
            label="Bags before rounding"
            value={bags === null ? "n/a" : formatNumber(bags.exact, 2)}
          />
          <ResultRow
            label="Spare after buying whole bags"
            value={
              bags === null ? "n/a" : `${formatNumber(bags.leftoverKg, 1)} kg`
            }
          />
          <ResultRow
            label="Check: volume back to weight"
            value={reverse === null ? "n/a" : `${formatNumber(reverse, 0)} kg`}
          />
        </div>
        <p className="mt-4 rounded-xl border border-white/15 bg-white/50 p-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/5">
          No universal tonnes-to-bags figure exists. A 50 kg cement bag is
          standard, but a bag of sand or granite depends entirely on how the
          seller fills it, which is why the bag weight sits beside the result.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- paint

function PaintPanel() {
  const [litres, setLitres] = useState("26");
  const [area, setArea] = useState("");
  const [coverage, setCoverage] = useState("10");
  const [coats, setCoats] = useState("2");

  const coverageValue = parseMeasurement(coverage) ?? 0;
  const coatsValue = parseMeasurement(coats) ?? 0;
  const areaValue = parseMeasurement(area);
  const litresValue = parseMeasurement(litres);

  const needed =
    areaValue !== null && coverageValue > 0 && coatsValue > 0
      ? (areaValue * coatsValue) / coverageValue
      : litresValue;

  const plan = needed === null ? null : paintBuckets(needed);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Paint litres to buckets
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter litres, or enter a wall area and let the coverage work out the
          litres first.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="paint-litres">
              Litres needed
            </label>
            <input
              id="paint-litres"
              inputMode="decimal"
              value={litres}
              onChange={(e) => {
                setLitres(e.target.value);
                setArea("");
              }}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="paint-area">
              Or wall and ceiling area (m²)
            </label>
            <input
              id="paint-area"
              inputMode="decimal"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Optional"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="paint-coverage">
              Coverage (m² per litre)
            </label>
            <input
              id="paint-coverage"
              inputMode="decimal"
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="paint-coats">
              Coats
            </label>
            <input
              id="paint-coats"
              inputMode="decimal"
              value={coats}
              onChange={(e) => setCoats(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>
        <Assumption>
          Coverage of about 10 m² per litre is a rough figure for emulsion on a
          sealed surface. New plaster, textured walls and strong colour changes
          can double the litres, so the paint calculator remains the final word.
        </Assumption>
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Buckets to buy
        </h2>
        <div className="mt-3">
          <ResultRow
            label="Litres required"
            value={needed === null ? "n/a" : `${formatNumber(needed, 2)} L`}
            emphasis
          />
          <ResultRow
            label="Best combination of buckets"
            value={
              plan === null || plan.best.length === 0
                ? "n/a"
                : plan.best
                    .map((b) => `${b.count} x ${b.sizeLitres} L`)
                    .join(" + ")
            }
            emphasis
          />
          <ResultRow
            label="Litres bought"
            value={
              plan === null ? "n/a" : `${formatNumber(plan.totalLitres, 0)} L`
            }
          />
          <ResultRow
            label="Spare paint"
            value={
              plan === null
                ? "n/a"
                : `${formatNumber(plan.leftoverLitres, 2)} L`
            }
          />
        </div>
        <div className="mt-4 space-y-2">
          {plan?.perSize.map((p) => (
            <div
              key={p.sizeLitres}
              className="flex items-center justify-between rounded-lg border border-white/15 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            >
              <span className="text-muted-foreground">
                {p.sizeLitres} L buckets only
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {p.toBuy}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/paint-calculator"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Take this into the paint calculator
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- roofing

function RoofingPanel() {
  const [planArea, setPlanArea] = useState("100");
  const [planUnit, setPlanUnit] = useState<AreaUnit>("m2");
  const [pitch, setPitch] = useState("30");
  const [rise, setRise] = useState("1");
  const [run, setRun] = useState("2");

  const planM2 = (() => {
    const raw = parseMeasurement(planArea);
    if (raw === null) return null;
    return convertArea(raw, planUnit, "m2");
  })();
  const pitchValue = parseMeasurement(pitch) ?? 0;
  const roofM2 = planM2 === null ? null : roofAreaFromPlan(planM2, pitchValue);
  const fromRiseRun = roofPitchDegrees(
    parseMeasurement(rise) ?? NaN,
    parseMeasurement(run) ?? NaN,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Roof area from the plan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A pitched roof covers more than the footprint it sits on. The pitch is
          what closes the gap.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="roof-area">
              Plan area
            </label>
            <input
              id="roof-area"
              inputMode="decimal"
              value={planArea}
              onChange={(e) => setPlanArea(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="roof-unit">
              Unit
            </label>
            <select
              id="roof-unit"
              value={planUnit}
              onChange={(e) => setPlanUnit(e.target.value as AreaUnit)}
              className={FIELD}
            >
              <option value="m2">Square metres</option>
              <option value="ft2">Square feet</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="roof-pitch">
              Pitch (degrees)
            </label>
            <input
              id="roof-pitch"
              inputMode="decimal"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5">
          <label className={LABEL} htmlFor="roof-rise">
            Pitch from rise and run
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              id="roof-rise"
              inputMode="decimal"
              value={rise}
              onChange={(e) => setRise(e.target.value)}
              className={FIELD}
              aria-label="Rise"
            />
            <input
              inputMode="decimal"
              value={run}
              onChange={(e) => setRun(e.target.value)}
              className={FIELD}
              aria-label="Run"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {fromRiseRun === null
              ? "Enter the rise and run you measured."
              : `That is ${formatNumber(fromRiseRun, 2)} degrees.`}
          </p>
        </div>
      </div>

      <div className={PANEL}>
        <h2 className="text-base font-semibold text-foreground">
          Roof measurements
        </h2>
        <div className="mt-3">
          <ResultRow
            label="Plan area"
            value={planM2 === null ? "n/a" : `${formatNumber(planM2, 2)} m²`}
          />
          <ResultRow
            label="Roof area at this pitch"
            value={roofM2 === null ? "n/a" : `${formatNumber(roofM2, 2)} m²`}
            emphasis
          />
          <ResultRow
            label="Roof area in square feet"
            value={
              roofM2 === null
                ? "n/a"
                : `${formatNumber(convertArea(roofM2, "m2", "ft2"), 1)} ft²`
            }
          />
          <ResultRow
            label="Extra area from the pitch"
            value={
              roofM2 === null || planM2 === null
                ? "n/a"
                : `${formatNumber(roofM2 - planM2, 2)} m²`
            }
          />
        </div>
        <Assumption>
          Add an allowance for eaves, overlaps and waste before ordering sheets
          or tiles. This tool gives the roof plane area only, not the sheet
          count, because sheet coverage depends on the profile you buy.
        </Assumption>
        <Link
          to="/build-to-roof-estimator"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Estimate the full roof build up
        </Link>
      </div>
    </div>
  );
}
