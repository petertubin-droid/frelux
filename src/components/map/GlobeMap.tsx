import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Globe2, AlertTriangle } from "lucide-react";
import { classNames } from "@/lib/utils";

const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";
// Terrain tiles from the public AWS elevation set (Terrarium encoding).
const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

import type { MapPoint } from "@/lib/map/geo";

export interface GlobeMapProps {
  points: MapPoint[];
  /** Where the map opens when there are no points to fit. */
  center?: { lat: number; lon: number } | null;
  zoom?: number;
  /** CSS height; the map is fixed to this box. */
  height?: number | string;
  className?: string;
  interactive?: boolean;
  showTerrain?: boolean;
  onSelect?: (point: MapPoint) => void;
  activeId?: string | null;
  /** Accessible name and the caption used by the fallback. */
  label: string;
  /** Text shown over the map when there are no pins. */
  emptyTitle?: string;
  emptyHint?: string;
}

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * FRELUX globe map.
 *
 * MapLibre GL renders a real 3D globe: an accurate vector base map from
 * OpenStreetMap data (via OpenFreeMap, no key), terrain relief from the
 * public elevation tiles, and a working compass that shows bearing and
 * pitch and snaps the north back with a click. Markers are built from real
 * records only; when nothing is plotted the map says so instead of
 * inventing pins.
 */
export function GlobeMap({
  points,
  center,
  zoom = 3.2,
  height = 420,
  className,
  interactive = true,
  showTerrain = true,
  onSelect,
  activeId,
  label,
  emptyTitle,
  emptyHint,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Build the map once. MapLibre is loaded on demand so every other route
  // keeps its bundle small.
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;

    (async () => {
      if (!containerRef.current) return;
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (disposed || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: isDarkTheme() ? DARK_STYLE : LIGHT_STYLE,
          center: [center?.lon ?? 3.38, center?.lat ?? 6.52],
          zoom,
          pitch: 0,
          bearing: 0,
          antialias: true,
          attributionControl: { compact: true },
        });
        // Globe projection ships in the runtime but is missing from the v4
        // type surface, so it is applied through a narrow cast.
        (
          map as unknown as {
            setProjection: (projection: { type: "globe" }) => void;
          }
        ).setProjection({ type: "globe" });
        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          "top-right",
        );
        map.addControl(
          new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }),
          "bottom-left",
        );

        map.on("load", () => {
          if (disposed) return;
          if (showTerrain) {
            try {
              map.addSource("frelux-terrain", {
                type: "raster-dem",
                tiles: [TERRAIN_TILES],
                tileSize: 256,
                encoding: "terrarium",
                maxzoom: 13,
              });
              map.setTerrain({ source: "frelux-terrain", exaggeration: 1.15 });
            } catch {
              // Terrain is an enhancement; the globe still works without it.
            }
          }
          setReady(true);
        });

        map.on("error", () => {
          // Tile hiccups are recoverable; only a failed canvas is fatal.
          if (!mapRef.current) setFailed(true);
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);

        // Follow the app theme without rebuilding the map.
        themeObserver = new MutationObserver(() => {
          map.setStyle(isDarkTheme() ? DARK_STYLE : LIGHT_STYLE, {
            diff: true,
          });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; props below are applied by other effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plot markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const point of points) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute(
          "aria-label",
          `${point.title}${point.meta ? `, ${point.meta}` : ""}`,
        );
        el.className = classNames(
          "frelux-map-pin",
          `frelux-map-pin--${point.kind}`,
          point.id === activeId && "is-active",
        );
        el.innerHTML =
          '<span class="frelux-map-pin__dot"></span><span class="frelux-map-pin__pulse"></span>';

        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelect?.(point);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([point.lon, point.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (points.length > 1) {
        const lons = points.map((p) => p.lon);
        const lats = points.map((p) => p.lat);
        map.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 72, maxZoom: 11, duration: 700 },
        );
      } else if (points.length === 1) {
        map.flyTo({
          center: [points[0].lon, points[0].lat],
          zoom: 9,
          duration: 700,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [points, ready, activeId, onSelect]);

  // Recentre when asked explicitly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !center) return;
    map.flyTo({ center: [center.lon, center.lat], zoom: Math.max(zoom, 6) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lon, ready]);

  return (
    <div
      className={classNames(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-card dark:border-white/10 dark:bg-background",
        className,
      )}
      style={{ height }}
    >
      <div
        ref={containerRef}
        role="application"
        aria-label={label}
        className="h-full w-full"
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      />

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80 p-6 text-center backdrop-blur">
          <AlertTriangle
            className="h-5 w-5 text-amber-500"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-foreground">
            The 3D map needs WebGL
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            This browser has hardware acceleration turned off. The list view
            carries the same records.
          </p>
        </div>
      )}

      {!failed && ready && points.length === 0 && (emptyTitle || emptyHint) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {emptyTitle}
          </p>
          {emptyHint && (
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {emptyHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobeMap;
