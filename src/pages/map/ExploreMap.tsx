import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Crosshair, Globe2, Loader2, MapPin, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { GlobeMap } from "@/components/map/GlobeMap";
import { classNames } from "@/lib/utils";
import { useLocation } from "@/lib/location";
import {
  distanceUnitFor,
  formatDistanceKm,
  haversineKm,
  type MapPoint,
} from "@/lib/map/geo";
import { searchPlaces, type PlaceResult } from "@/lib/map/geocode";
import { useLanguage } from "@/lib/i18n";
import {
  LAYER_COLOR,
  MAP_LAYER_META,
  useMapLayerPoints,
  type MapLayer,
} from "@/lib/map/use-map-layers";

const LAYERS: MapLayer[] = ["pros", "jobs", "materials"];

/**
 * The full map workspace: professionals, open projects and materials on one
 * accurate 3D globe, with distances from the visitor's own site.
 */
export default function ExploreMap() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("layer");
  const initialLayer: MapLayer = LAYERS.includes(requested as MapLayer)
    ? (requested as MapLayer)
    : "pros";

  const [layer, setLayer] = useState<MapLayer>(initialLayer);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    key: number;
  } | null>(null);
  const { t, language } = useLanguage();
  const unit = distanceUnitFor(language);
  const {
    location,
    detect,
    loading: locating,
    permissionDenied,
  } = useLocation();

  const viewerPoint =
    location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    !(location.latitude === 0 && location.longitude === 0)
      ? { lat: location.latitude, lon: location.longitude }
      : null;

  const { points, loading, error } = useMapLayerPoints(layer, viewerPoint);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return points;
    return points.filter((p) =>
      `${p.title} ${p.subtitle ?? ""}`.toLowerCase().includes(term),
    );
  }, [points, query]);

  // The record filter is instant and local. Place lookup runs alongside it so
  // a visitor can reach any city in the world, not just cities with pins.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setPlaces([]);
      setSearchingPlace(false);
      return;
    }
    const controller = new AbortController();
    setSearchingPlace(true);
    const timer = window.setTimeout(async () => {
      const results = await searchPlaces(term, {
        language: language === "en" ? "en" : language,
        signal: controller.signal,
        limit: 5,
      });
      if (controller.signal.aborted) return;
      setPlaces(results);
      setSearchingPlace(false);
    }, 420);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, language]);

  function goToPlace(place: PlaceResult) {
    setFocus({ lat: place.lat, lon: place.lon, zoom: 10.5, key: Date.now() });
    setPlaces([]);
  }

  function changeLayer(next: MapLayer) {
    setLayer(next);
    setActiveId(null);
    params.set("layer", next);
    setParams(params, { replace: true });
  }

  const meta = MAP_LAYER_META[layer];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        variant="tool"
        eyebrow="Map"
        title="Explore on the map"
        subtitle="Verified professionals, open projects and material stock, plotted where they actually are. Use the compass to reset north and drag with two fingers to tilt."
        breadcrumbs={[{ label: "Home", path: "/" }, { label: "Map" }]}
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Map layers"
        >
          {LAYERS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={option === layer}
              onClick={() => changeLayer(option)}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all",
                option === layer
                  ? "border-primary/30 bg-primary/10 text-primary shadow-[0_8px_20px_-14px_hsl(var(--primary))]"
                  : "border-border/60 bg-card/60 text-muted-foreground backdrop-blur hover:border-primary/25 hover:text-foreground dark:border-white/10 dark:bg-white/5",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: LAYER_COLOR[option] }}
                aria-hidden="true"
              />
              {MAP_LAYER_META[option].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or place"
              aria-label="Filter map records"
              className="h-10 w-full rounded-lg border border-border/60 bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/25 dark:border-white/10 sm:w-72"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="relative">
              <div
                className="absolute left-0 top-1 w-full min-w-[260px] overflow-hidden rounded-xl border border-border/60 bg-card/95 shadow-[0_24px_50px_-30px_rgba(16,12,40,0.6)] backdrop-blur dark:border-white/10"
                role="listbox"
                aria-label={t("Places worldwide")}
              >
                <p className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-white/5">
                  <Globe2 className="h-3 w-3" aria-hidden="true" />
                  {t("Places worldwide")}
                </p>
                {searchingPlace && (
                  <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    {t("Searching the globe")}
                  </p>
                )}
                {!searchingPlace && places.length === 0 && (
                  <p className="px-3 py-2.5 text-xs text-muted-foreground">
                    {t("No place matched that name")}
                  </p>
                )}
                {places.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => goToPlace(place)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-primary/5"
                  >
                    <MapPin
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {place.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {place.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={detect}
            disabled={locating}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/60 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/30 dark:border-white/10"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="h-4 w-4" aria-hidden="true" />
            )}
            {viewerPoint ? "Update my location" : "Use my location"}
          </button>
        </div>
      </div>

      {permissionDenied && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Location permission is off, so distances are hidden. The map still
          shows every record at its real position.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlobeMap
            className="frelux-map-surface"
            points={filtered}
            center={viewerPoint}
            focus={focus}
            height={520}
            label={`${t(meta.label)} ${t("map")}`}
            activeId={activeId}
            onSelect={(point) => setActiveId(point.id)}
            emptyTitle={t(error ? "Map data unavailable" : "No pins here yet")}
            emptyHint={error ?? meta.empty}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "Drag to spin the globe, search any city to fly there, or use your own location for distances.",
            )}{" "}
            {t("Base map")} © OpenStreetMap contributors, {t("served by")}{" "}
            OpenFreeMap. {t("Elevation")}: AWS Terrain Tiles.
          </p>
        </div>

        <aside className="card-elevated flex max-h-[560px] flex-col overflow-hidden">
          <div className="border-b border-border/60 p-4 dark:border-white/10">
            <p className="section-label">{meta.label}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {meta.blurb}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              {loading
                ? t("Loading records")
                : `${filtered.length} ${t("plotted")}`}
            </p>
          </div>

          <ul className="flex-1 divide-y divide-border/50 overflow-y-auto dark:divide-white/5">
            {loading &&
              [0, 1, 2, 3].map((i) => (
                <li key={i} className="p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/70 dark:bg-white/5" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted/50 dark:bg-white/5" />
                </li>
              ))}

            {!loading &&
              filtered.map((point: MapPoint) => (
                <li key={point.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(point.id)}
                    className={classNames(
                      "flex w-full items-start gap-3 p-4 text-left transition-colors",
                      point.id === activeId
                        ? "bg-primary/5"
                        : "hover:bg-muted/50 dark:hover:bg-white/5",
                    )}
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-background"
                      style={{ background: LAYER_COLOR[layer] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {point.title}
                      </span>
                      {point.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {point.subtitle}
                        </span>
                      )}
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {point.meta && <span>{point.meta}</span>}
                        {viewerPoint && (
                          <span>
                            {formatDistanceKm(
                              haversineKm(
                                viewerPoint.lat,
                                viewerPoint.lon,
                                point.lat,
                                point.lon,
                              ),
                              unit,
                            )}
                          </span>
                        )}
                      </span>
                    </span>
                    {point.href && (
                      <Link
                        to={point.href}
                        className="shrink-0 self-center rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </Link>
                    )}
                  </button>
                </li>
              ))}

            {!loading && filtered.length === 0 && (
              <li className="p-6 text-center text-xs leading-relaxed text-muted-foreground">
                {error ?? meta.empty}
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
