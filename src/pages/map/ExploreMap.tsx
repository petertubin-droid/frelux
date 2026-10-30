import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { GlobeMap } from "@/components/map/GlobeMap";
import { classNames } from "@/lib/utils";
import { useLocation } from "@/lib/location";
import { formatDistanceKm, haversineKm, type MapPoint } from "@/lib/map/geo";
import {
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
                "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all",
                option === layer
                  ? "border-primary/30 bg-primary/10 text-primary shadow-[0_8px_20px_-14px_hsl(var(--primary))]"
                  : "border-border/60 bg-card/60 text-muted-foreground backdrop-blur hover:border-primary/25 hover:text-foreground dark:border-white/10 dark:bg-white/5",
              )}
            >
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
            height={520}
            label={`${meta.label} map`}
            activeId={activeId}
            onSelect={(point) => setActiveId(point.id)}
            emptyTitle={error ? "Map data unavailable" : "No pins here yet"}
            emptyHint={error ?? meta.empty}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Base map data © OpenStreetMap contributors, served by OpenFreeMap.
            Elevation from the AWS Terrain Tiles set.
          </p>
        </div>

        <aside className="card-elevated flex max-h-[560px] flex-col overflow-hidden">
          <div className="border-b border-border/60 p-4 dark:border-white/10">
            <p className="section-label">{meta.label}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {meta.blurb}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              {loading ? "Loading records…" : `${filtered.length} plotted`}
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
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
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
