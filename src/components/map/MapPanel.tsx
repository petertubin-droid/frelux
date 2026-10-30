import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crosshair, MapPin } from "lucide-react";
import { classNames } from "@/lib/utils";
import { useLocation } from "@/lib/location";
import { GlobeMap } from "@/components/map/GlobeMap";
import { formatDistanceKm, haversineKm } from "@/lib/map/geo";
import {
  LAYER_COLOR,
  MAP_LAYER_META,
  useMapLayerPoints,
  type MapLayer,
} from "@/lib/map/use-map-layers";

interface MapPanelProps {
  layers: MapLayer[];
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
  /** How many nearby records to list under the map. */
  nearestCount?: number;
  /** Full-page link target with the active layer preselected. */
  exploreHref?: string;
  defaultLayer?: MapLayer;
}

/**
 * Compact map surface for a page that already lists records.
 *
 * The map never invents a location: pins come from records that carry real
 * coordinates, and when a layer is empty the panel says what has to happen
 * for a pin to appear.
 */
export function MapPanel({
  layers,
  title = "See it on the map",
  subtitle,
  height = 360,
  className,
  nearestCount = 4,
  exploreHref = "/map",
  defaultLayer,
}: MapPanelProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>(
    defaultLayer ?? layers[0],
  );
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
  const { points, loading, error } = useMapLayerPoints(
    activeLayer,
    viewerPoint,
  );
  const meta = MAP_LAYER_META[activeLayer];
  const nearest = points.slice(0, nearestCount);

  return (
    <section className={classNames("card-elevated overflow-hidden", className)}>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="section-label">Live map</p>
          <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {subtitle ?? meta.blurb}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:border-white/10">
            {loading ? "Loading" : `${points.length} plotted`}
          </span>
          <Link
            to={`${exploreHref}?layer=${activeLayer}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-card dark:border-white/10 dark:bg-white/5"
          >
            Full map
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {layers.length > 1 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
          {layers.map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => setActiveLayer(layer)}
              aria-pressed={layer === activeLayer}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                layer === activeLayer
                  ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: LAYER_COLOR[layer] }}
                aria-hidden="true"
              />
              {MAP_LAYER_META[layer].label}
            </button>
          ))}
        </div>
      )}

      <div className="px-5">
        <GlobeMap
          className="frelux-map-surface"
          points={points}
          center={viewerPoint}
          height={height}
          label={`${meta.label} map`}
          emptyTitle={error ? "Map data unavailable" : "No pins here yet"}
          emptyHint={error ?? meta.empty}
        />
      </div>

      <div className="p-5">
        {loading && nearest.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/60 dark:bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && nearest.length > 0 && (
          <ul className="divide-y divide-border/50 dark:divide-white/5">
            {nearest.map((point) => (
              <li key={point.id}>
                <Link
                  to={point.href ?? "/map"}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">
                      {point.title}
                    </span>
                    {point.subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {point.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {viewerPoint
                      ? formatDistanceKm(
                          haversineKm(
                            viewerPoint.lat,
                            viewerPoint.lon,
                            point.lat,
                            point.lon,
                          ),
                        )
                      : (point.meta ?? "")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && nearest.length === 0 && !error && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            {meta.empty}
          </p>
        )}

        {!viewerPoint && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/5">
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            Set your location on the full map to see distances from your site.
          </p>
        )}
      </div>
    </section>
  );
}

export default MapPanel;
