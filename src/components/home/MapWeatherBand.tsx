import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeftRight, CloudSun, Globe2 } from "lucide-react";
import { classNames } from "@/lib/utils";
import { useLocation } from "@/lib/location";
import {
  LAYER_COLOR,
  MAP_LAYER_META,
  useMapLayerPoints,
  type MapLayer,
} from "@/lib/map/use-map-layers";
import {
  UNIVERSAL_UNITS,
  convertUniversal,
  formatNumber,
  unitShort,
  type Dimension,
} from "@/lib/convert/units";
import { useLanguage } from "@/lib/i18n";

// The globe pulls in maplibre, so it loads on its own chunk rather than in the
// homepage's initial bundle.
const GlobeMap = lazy(() =>
  import("@/components/map/GlobeMap").then((m) => ({ default: m.GlobeMap })),
);

const BAND_LAYERS: MapLayer[] = ["pros", "jobs", "materials"];

const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "length", label: "Length" },
  { id: "area", label: "Area" },
  { id: "volume", label: "Volume" },
  { id: "mass", label: "Weight" },
];

// Sensible opening pair per dimension, both real units in the shared registry.
const DEFAULT_PAIR: Record<Dimension, [string, string]> = {
  length: ["len-m", "len-ft"],
  area: ["area-m2", "area-ft2"],
  volume: ["vol-l", "vol-gal-us"],
  mass: ["mass-kg", "mass-lb"],
};

const FIELD =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5";
const LABEL =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

/**
 * The two live surfaces that are easiest to undersell in a feature list: the
 * globe that shows where the work actually is, and the measurement converter
 * that turns a tape reading or a plot size into the units you need.
 *
 * Both run here, edge to edge, on real data and real arithmetic. Neither is a
 * screenshot: the map plots records that carry coordinates, and the converter
 * uses the same exact constants as the full page. Each links through to its
 * complete surface, where the depth (layers, filters, every unit and material)
 * lives.
 */
export default function MapWeatherBand() {
  const { t } = useLanguage();
  const [layer, setLayer] = useState<MapLayer>("pros");
  const { location: viewer } = useLocation();

  const viewerPoint = useMemo(
    () =>
      viewer &&
      Number.isFinite(viewer.latitude) &&
      Number.isFinite(viewer.longitude) &&
      !(viewer.latitude === 0 && viewer.longitude === 0)
        ? { lat: viewer.latitude, lon: viewer.longitude }
        : null,
    [viewer],
  );

  const { points, loading, error } = useMapLayerPoints(layer, viewerPoint);
  const meta = MAP_LAYER_META[layer];

  const [dimension, setDimension] = useState<Dimension>("length");
  const [amount, setAmount] = useState("1");
  const [pair, setPair] =
    useState<Record<Dimension, [string, string]>>(DEFAULT_PAIR);

  const units = useMemo(
    () => UNIVERSAL_UNITS.filter((u) => u.dimension === dimension),
    [dimension],
  );
  const [fromId, toId] = pair[dimension];

  const parsed = Number(amount.replace(/,/g, ""));
  const hasAmount = amount.trim() !== "" && Number.isFinite(parsed);
  const result = useMemo(
    () => convertUniversal(hasAmount ? parsed : NaN, fromId, toId),
    [hasAmount, parsed, fromId, toId],
  );

  const fromUnit = UNIVERSAL_UNITS.find((u) => u.id === fromId);
  const toUnit = UNIVERSAL_UNITS.find((u) => u.id === toId);

  const setSide = (side: 0 | 1, id: string) =>
    setPair((prev) => {
      const next: [string, string] = [...prev[dimension]] as [string, string];
      next[side] = id;
      return { ...prev, [dimension]: next };
    });

  const changeDimension = (next: Dimension) => setDimension(next);

  const swap = () =>
    setPair((prev) => ({
      ...prev,
      [dimension]: [prev[dimension][1], prev[dimension][0]],
    }));

  const resultText = !hasAmount
    ? t("Enter a number to convert.")
    : result.value === null
      ? result.error || result.explanation || t("This pair needs more input.")
      : `${formatNumber(parsed, 6)} ${fromUnit ? unitShort(fromUnit) : ""} = ${formatNumber(result.value, 6)} ${toUnit ? unitShort(toUnit) : ""}`;

  return (
    <section
      aria-label={t("Map and measurements")}
      className="relative w-full overflow-hidden border-y border-border/60 bg-background"
    >
      {/* Heading: full width, the widgets below run to the viewport edges */}
      <div className="px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-label">{t("Beyond the numbers")}</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              {t("Use the map and the converter right here")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              "Both run on this page: real records on the globe, exact constants in the converter. Open either one full size when you want every layer, filter and unit.",
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border/60 lg:grid-cols-2">
        {/* Map widget */}
        <div className="relative border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-6 lg:px-8">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={t("Map layers")}
            >
              {BAND_LAYERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLayer(option)}
                  aria-pressed={option === layer}
                  className={classNames(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    option === layer
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: LAYER_COLOR[option] }}
                    aria-hidden="true"
                  />
                  {t(MAP_LAYER_META[option].label)}
                </button>
              ))}
            </div>
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
            >
              {t("Open the full map")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="px-4 pb-4 pt-3 sm:px-6 lg:px-8">
            <Suspense
              fallback={
                <div
                  className="w-full animate-pulse rounded-xl bg-muted/50 dark:bg-white/5"
                  style={{ height: "clamp(260px, 40vw, 420px)" }}
                  aria-hidden="true"
                />
              }
            >
              <GlobeMap
                className="frelux-map-surface overflow-hidden rounded-xl"
                points={points}
                center={viewerPoint}
                height="clamp(260px, 40vw, 420px)"
                label={t("Live construction map")}
                emptyTitle={t(
                  error ? "Map data unavailable" : "No pins here yet",
                )}
                emptyHint={error ?? t(meta.empty)}
              />
            </Suspense>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {loading
                ? t("Loading mapped records")
                : `${points.length} ${t("plotted")}`}{" "}
              · {t(meta.blurb)}
            </p>
          </div>
        </div>

        {/* Converter widget */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={t("Measurement type")}
            >
              {DIMENSIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => changeDimension(option.id)}
                  aria-pressed={option.id === dimension}
                  className={classNames(
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    option.id === dimension
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                  )}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
            <Link
              to="/unit-converter"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
            >
              {t("Open the full converter")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <label className={LABEL} htmlFor="band-amount">
                {t("Amount")}
              </label>
              <input
                id="band-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={FIELD}
                placeholder={t("Enter a value")}
              />
              <label className="sr-only" htmlFor="band-from">
                {t("Convert from")}
              </label>
              <select
                id="band-from"
                value={fromId}
                onChange={(event) => setSide(0, event.target.value)}
                className={classNames(FIELD, "mt-2")}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {t(unit.label)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center sm:pb-11">
              <button
                type="button"
                onClick={swap}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground dark:border-white/10 dark:bg-white/5"
                aria-label={t("Swap units")}
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div>
              <label className={LABEL} htmlFor="band-to">
                {t("Convert to")}
              </label>
              <select
                id="band-to"
                value={toId}
                onChange={(event) => setSide(1, event.target.value)}
                className={FIELD}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {t(unit.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="mt-4 rounded-xl border border-border/60 bg-muted/40 p-4 dark:border-white/10 dark:bg-white/5"
            aria-live="polite"
          >
            <p className="text-base font-semibold text-foreground break-words">
              {resultText}
            </p>
            {hasAmount && result.value !== null && result.explanation && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t(result.explanation)}
              </p>
            )}
          </div>

          <Link
            to="/paint-calculator"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
          >
            <CloudSun className="h-4 w-4" aria-hidden="true" />
            {t("Plan around the weather")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* The two capabilities, spelled out and linked, under the live widgets */}
      <div className="grid grid-cols-1 gap-4 border-t border-border/60 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:px-10">
        <Link
          to="/map"
          className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-white/5"
        >
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-primary dark:border-white/10 dark:bg-white/5">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t("See the work on a 3D globe")}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {t(
                "Verified professionals, open projects and material stock plotted where they really are, with the distance from your own site.",
              )}
            </span>
          </span>
          <ArrowRight
            className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/unit-converter"
          className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-white/5"
        >
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-primary dark:border-white/10 dark:bg-white/5">
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t("Convert any site measurement")}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {t(
                "Feet and inches, plots and acres, tonnes and cubic metres. Every answer states the constant or density it used.",
              )}
            </span>
          </span>
          <ArrowRight
            className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}
