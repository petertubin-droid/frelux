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
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
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
  bagsFromMass,
  convertArea,
  convertLength,
  convertMass,
  convertVolume,
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
  type LengthUnit,
  type MassUnit,
  type VolumeUnit,
} from "@/lib/convert/units";

/**
 * Construction Measurement Converter.
 *
 * Built around the measurements that actually arrive on a Nigerian site: a
 * tape reading in feet and inches, land sold in plots, timber sold in inches,
 * sand sold by the tonne, paint sold in 4 L, 10 L and 20 L buckets. Every
 * conversion runs locally in the browser from exact constants, and every
 * weight-to-volume answer states the density it used.
 */

type TabId =
  "length" | "area" | "volume" | "weight" | "materials" | "paint" | "roofing";

const TABS: { id: TabId; label: string; icon: typeof Ruler }[] = [
  { id: "length", label: "Length", icon: Ruler },
  { id: "area", label: "Area & land", icon: LandPlot },
  { id: "volume", label: "Volume", icon: FlaskConical },
  { id: "weight", label: "Weight", icon: Weight },
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
  const [tab, setTab] = useState<TabId>("length");

  useSeo({
    title: "Construction Measurement Converter: Plots, Feet, Tonnes to Bags",
    description:
      "Convert feet to metres, inches to millimetres, plots to square metres, tonnes of sand or granite to cubic metres and bags, and paint litres to 4L, 10L and 20L buckets. A construction converter built for Nigerian sites.",
    canonicalPath: "/unit-converter",
    keywords:
      "construction measurement converter, feet to metres, inches to millimetres, plot to square metres, tonnes to bags, sand density, paint bucket calculator, Nigeria",
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
          priceCurrency: "NGN",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How many square metres is a plot of land in Nigeria?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It depends on the plot size. A 50 by 100 feet plot is about 464.5 square metres, and a 60 by 120 feet plot is about 668.9 square metres. Plots are local conventions, so measure the actual width and depth rather than assuming.",
            },
          },
          {
            "@type": "Question",
            name: "How many cubic metres is a 20 tonne tipper of sharp sand?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "About 12.5 cubic metres at a typical loose density of 1600 kg per cubic metre. Wet or compacted sand is heavier per cubic metre, so treat the figure as an estimate and confirm the density used.",
            },
          },
          {
            "@type": "Question",
            name: "How many bags of cement are in a tonne?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Twenty 50 kg bags make one metric tonne. Only apply that to a material actually sold in 50 kg bags, since a bag of sand or granite is not a standard weight.",
            },
          },
          {
            "@type": "Question",
            name: "How many litres is a US gallon compared with an imperial gallon?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "One US gallon is 3.785411784 litres and one imperial gallon is 4.54609 litres. They are not interchangeable, which is why the converter keeps them separate.",
            },
          },
          {
            "@type": "Question",
            name: "How do I convert feet to metres for a building measurement?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Multiply feet by 0.3048. Five feet six inches is 1.6764 metres. The converter also accepts feet and inches together, the way a tape measure reads.",
            },
          },
        ],
      },
    ],
  });

  return (
    <div className="pb-16">
      <Container className="pt-10 sm:pt-14">
        <PageHeader
          title="Construction Measurement Converter"
          subtitle="Feet, inches, plots, tonnes, litres and bags, converted exactly and explained. Built for the units you meet on a Nigerian site, with imperial support for drawings that still use it."
        />

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
          {tab === "length" && <LengthPanel />}
          {tab === "area" && <AreaPanel />}
          {tab === "volume" && <VolumePanel />}
          {tab === "weight" && <WeightPanel />}
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
      </Container>
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
