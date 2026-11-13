import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ESRI_SATELLITE_TEMPLATE } from "@/lib/map/cartoTiles";
import {
  ArrowUpRight,
  Compass,
  Globe2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { classNames } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { MapPoint } from "@/lib/map/geo";
import { defaultMapOpening } from "@/lib/map/defaults";
import { Raster2DMap } from "@/components/map/Raster2DMap";

// OpenFreeMap "bright" style provides Google Maps-standard vibrant colors:
// lush green parks, sky-blue water, warm highway fills, and clean white streets.
const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/bright";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/bright";
// Terrain tiles from the public AWS elevation set (Terrarium encoding).
const SATELLITE_SOURCE = "frelux-satellite";
const SATELLITE_LAYER = "frelux-satellite-layer";

const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/**
 * Style used when the hosted vector style cannot be reached.
 *
 * A block on the style host used to drop the whole map into the 2D canvas
 * renderer, losing the globe, tilt and terrain even though WebGL was fine.
 * This plain raster style keeps the WebGL map (and the satellite overlay on
 * top of it) working, so only a browser without WebGL ends up in 2D.
 */
const INLINE_RASTER_STYLE = {
  version: 8 as const,
  sources: {
    streets: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "streets", type: "raster" as const, source: "streets" }],
};

export interface GlobeMapProps {
  points: MapPoint[];
  /** Where the map opens when there are no points to fit. */
  center?: { lat: number; lon: number } | null;
  /** Borderless, full bleed surface blending into the page background. */
  bleed?: boolean;
  /** Opening zoom; defaults to the visitor's region, or the whole globe. */
  zoom?: number;
  /** Fly the camera here whenever `key` changes (place search, deep links). */
  focus?: {
    lat: number;
    lon: number;
    zoom?: number;
    key: string | number;
  } | null;
  /** CSS height; the map is fixed to this box. */
  height?: number | string;
  className?: string;
  interactive?: boolean;
  showTerrain?: boolean;
  onSelect?: (point: MapPoint) => void;
  /**
   * When provided, clicking anywhere on the map reports the clicked
   * coordinate (used by location pickers such as the Climate Advisor).
   */
  onPickCoordinate?: (coords: { lat: number; lon: number }) => void;
  /** The visitor's own position, so a located page shows its dot in 3D too. */
  you?: { lat: number; lon: number; accuracy?: number } | null;
  activeId?: string | null;
  /** Accessible name and the caption used by the fallback. */
  label: string;
  /** Text shown over the map when there are no pins. */
  emptyTitle?: string;
  emptyHint?: string;
}

interface ViewState {
  bearing: number;
  pitch: number;
  zoom: number;
}

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const LAYER_NOUN: Record<MapPoint["kind"], string> = {
  pro: "Professional",
  job: "Open project",
  material: "Material",
  supplier: "Supplier",
  you: "You",
};

/**
 * FRELUX globe map.
 *
 * A real 3D globe: accurate OpenStreetMap vectors from OpenFreeMap, terrain
 * relief from public elevation tiles, and no API key anywhere. The controls
 * are FRELUX chrome rather than default map buttons: a glass compass dial
 * that tracks bearing and pitch, zoom keys, a live readout, a scale bar and
 * a themed record card. Pins are built from real records only; when nothing
 * is plotted the map says so rather than inventing a location.
 */
export function GlobeMap({
  points,
  center,
  zoom,
  focus,
  height = 420,
  className,
  interactive = true,
  bleed = false,
  showTerrain = true,
  onSelect,
  onPickCoordinate,
  you: youProp,
  activeId,
  label,
  emptyTitle,
  emptyHint,
}: GlobeMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const { t } = useLanguage();
  // The opening frame follows the visitor, never a fixed head office.
  const opening = useMemo(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lon)) {
      return {
        lat: center.lat,
        lon: center.lon,
        zoom: zoom ?? 7.5,
        source: "saved-place" as const,
      };
    }
    const fallback = defaultMapOpening();
    return { ...fallback, zoom: zoom ?? fallback.zoom };
    // Fixed at mount: later camera moves are handled by their own effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [ready, setReady] = useState(false);
  const [rasterFallback, setRasterFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<
    "webgl" | "style" | null
  >(null);
  const [userPin, setUserPin] = useState<MapPoint | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [satellite, setSatellite] = useState(false);
  const satelliteRef = useRef(false);

  // Satellite imagery is a raster layer over the vector basemap, so street
  // styling stays available and the toggle costs no extra map instance.
  const applySatellite = useCallback((map: MapLibreMap, on: boolean) => {
    try {
      if (on) {
        if (!map.getSource(SATELLITE_SOURCE)) {
          map.addSource(SATELLITE_SOURCE, {
            type: "raster",
            tiles: [ESRI_SATELLITE_TEMPLATE],
            tileSize: 256,
            maxzoom: 19,
            attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
          });
        }
        if (!map.getLayer(SATELLITE_LAYER)) {
          map.addLayer({
            id: SATELLITE_LAYER,
            type: "raster",
            source: SATELLITE_SOURCE,
            paint: { "raster-opacity": 1 },
          });
        }
        map.setLayoutProperty(SATELLITE_LAYER, "visibility", "visible");
      } else if (map.getLayer(SATELLITE_LAYER)) {
        map.setLayoutProperty(SATELLITE_LAYER, "visibility", "none");
      }
    } catch {
      // Imagery is an enhancement; the vector basemap still works.
    }
  }, []);

  useEffect(() => {
    satelliteRef.current = satellite;
    const map = mapRef.current;
    if (map) applySatellite(map, satellite);
  }, [satellite, applySatellite]);
  const [locateState, setLocateState] = useState<
    "idle" | "locating" | "ready" | "denied"
  >("idle");
  const [view, setView] = useState<ViewState>({
    bearing: 0,
    pitch: 0,
    zoom: 3,
  });
  const [scale, setScale] = useState<{ km: number; px: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    above: boolean;
  } | null>(null);

  const selectedRef = useRef<MapPoint | null>(null);
  selectedRef.current = selected;
  // Kept in a ref so an inline parent callback never rebuilds the markers.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onPickRef = useRef(onPickCoordinate);
  onPickRef.current = onPickCoordinate;

  // Read scale and view from the live map.
  const syncChrome = useCallback(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el || !map.isStyleLoaded()) return;

    setView({
      bearing: Math.round(map.getBearing()),
      pitch: Math.round(map.getPitch()),
      zoom: map.getZoom(),
    });

    // Scale bar: measure a 88px span in real metres at the map centre.
    try {
      const h = el.clientHeight;
      const y = Math.max(h - 60, 20);
      const a = map.unproject([16, y]);
      const b = map.unproject([104, y]);
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLon = ((b.lng - a.lng) * Math.PI) / 180;
      const lat1 = (a.lat * Math.PI) / 180;
      const lat2 = (b.lat * Math.PI) / 180;
      const hh =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const km = 2 * R * Math.atan2(Math.sqrt(hh), Math.sqrt(1 - hh));
      if (Number.isFinite(km) && km > 0) setScale({ km, px: 88 });
    } catch {
      setScale(null);
    }

    const point = selectedRef.current;
    if (point) {
      const p = map.project([point.lon, point.lat]);
      const half = el.clientWidth < 520 ? 108 : 128;
      const x = Math.min(
        Math.max(p.x, half + 8),
        Math.max(el.clientWidth - half - 8, half + 8),
      );
      setAnchor({ x, y: p.y, above: p.y > el.clientHeight * 0.45 });
    }
  }, []);

  // Build the map once. MapLibre is loaded on demand so other routes keep
  // their bundle small.
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let fallbackTimer: number | null = null;
    let retriedWithInlineStyle = false;

    (async () => {
      if (!containerRef.current) return;
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (disposed || !containerRef.current) return;

        let map: MapLibreMap;
        try {
          map = new maplibregl.Map({
            container: containerRef.current,
            style: isDarkTheme() ? DARK_STYLE : LIGHT_STYLE,
            center: [opening.lon, opening.lat],
            zoom: opening.zoom,
            pitch: 0,
            bearing: 0,
            antialias: true,
            attributionControl: false,
            fadeDuration: 260,
          });
        } catch {
          setFallbackReason("webgl");
          setRasterFallback(true);
          return;
        }
        mapRef.current = map;

        // Pinch is the primary zoom on a phone. Rotation stays off so a
        // two-finger gesture can never twist the map away from north.
        try {
          map.touchZoomRotate.enable();
          map.touchZoomRotate.disableRotation();
          map.doubleClickZoom.enable();
        } catch {
          // Older runtimes already enable these by default.
        }

        // If a browser creates WebGL but cannot render the style, switch to
        // the non-WebGL raster renderer instead of leaving a blank map.
        // The hosted vector style can be blocked on a slow or filtered
        // network. That is not a reason to lose the globe: retry once with a
        // plain raster style, and only fall back to 2D if that fails too.
        fallbackTimer = window.setTimeout(() => {
          if (disposed || map.loaded() || retriedWithInlineStyle) return;
          retriedWithInlineStyle = true;
          try {
            map.setStyle(INLINE_RASTER_STYLE);
          } catch {
            setFallbackReason("style");
            setRasterFallback(true);
            map.remove();
            mapRef.current = null;
            return;
          }
          window.setTimeout(() => {
            if (!disposed && map.loaded()) {
              mapLoadedRef.current = true;
              setReady(true);
            } else if (!disposed) {
              setFallbackReason("style");
              setRasterFallback(true);
              mapRef.current = null;
              try {
                map.remove();
              } catch {
                /* already gone */
              }
            }
          }, 7000);
        }, 9000);

        // MapLibre v4 renders the globally navigable Mercator map directly.
        // Do not call setProjection here: that method is not present in the
        // pinned v4 runtime and used to force every map into the error state.

        map.on("load", () => {
          if (disposed) return;
          mapLoadedRef.current = true;
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
          if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
          setReady(true);
          syncChrome();
        });

        for (const event of ["move", "rotate", "pitch", "zoom", "resize"]) {
          map.on(event as "move", syncChrome);
        }
        map.on("error", () => {
          if (disposed || mapLoadedRef.current) return;
          if (!retriedWithInlineStyle) {
            retriedWithInlineStyle = true;
            if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
            try {
              map.setStyle(INLINE_RASTER_STYLE);
              return;
            } catch {
              /* fall through to 2D */
            }
          }
          setFallbackReason("style");
          setRasterFallback(true);
          map.remove();
          mapRef.current = null;
        });

        // Optional coordinate picking: only fires when a parent attaches
        // a pick handler (e.g. the Climate Advisor's location picker).
        map.on(
          "click",
          (event: { lngLat?: { lat?: number; lng?: number } }) => {
            const pick = onPickRef.current;
            if (!pick) return;
            const lat = event.lngLat?.lat;
            const lon = event.lngLat?.lng;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              pick({ lat: lat as number, lon: lon as number });
            }
          },
        );

        resizeObserver = new ResizeObserver(() => {
          map.resize();
          syncChrome();
        });
        resizeObserver.observe(containerRef.current);

        map.on("style.load", () => {
          if (disposed) return;
          // A retried style (or a theme swap) rebuilds every source, so the
          // satellite overlay and the terrain relief have to be re-attached.
          if (satelliteRef.current) applySatellite(map, true);
          if (showTerrain) {
            try {
              if (!map.getSource("frelux-terrain")) {
                map.addSource("frelux-terrain", {
                  type: "raster-dem",
                  tiles: [TERRAIN_TILES],
                  tileSize: 256,
                  encoding: "terrarium",
                  maxzoom: 13,
                });
              }
              map.setTerrain({ source: "frelux-terrain", exaggeration: 1.15 });
            } catch {
              // Terrain is an enhancement; the globe still works without it.
            }
          }
          if (map.loaded()) {
            mapLoadedRef.current = true;
            setReady(true);
            syncChrome();
          }
        });

        themeObserver = new MutationObserver(() => {
          // Never swap back to the hosted style after a retry: it is the style
          // that failed in the first place.
          if (retriedWithInlineStyle) return;
          map.setStyle(isDarkTheme() ? DARK_STYLE : LIGHT_STYLE, {
            diff: true,
          });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      } catch {
        if (!disposed) {
          setFallbackReason("style");
          setRasterFallback(true);
        }
      }
    })();

    return () => {
      disposed = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
    // The map is created once; props below are applied by other effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = useCallback(
    (point: MapPoint | null) => {
      setSelected(point);
      if (!point) {
        setAnchor(null);
        return;
      }
      onSelectRef.current?.(point);
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: [point.lon, point.lat],
        zoom: Math.max(map.getZoom(), 9.4),
        pitch: Math.max(map.getPitch(), 42),
        duration: 1100,
        essential: true,
      });
      // Anchor appears once the camera settles.
      window.setTimeout(syncChrome, 120);
    },
    [syncChrome],
  );

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

      // The page may already know where the visitor is (a located panel), in
      // which case its point is plotted before the visitor taps "locate".
      const suppliedYou: MapPoint | null = youProp
        ? {
            id: "you",
            kind: "you",
            lat: youProp.lat,
            lon: youProp.lon,
            title: "Your location",
            meta:
              youProp.accuracy && Number.isFinite(youProp.accuracy)
                ? `±${Math.round(youProp.accuracy)} m`
                : undefined,
          }
        : null;
      const activeYou = userPin ?? suppliedYou;
      const plotted = activeYou ? [...points, activeYou] : points;
      for (const point of plotted) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute(
          "aria-label",
          `${t(LAYER_NOUN[point.kind])}: ${point.title}${point.meta ? `, ${point.meta}` : ""}`,
        );

        if (point.kind === "you") {
          el.className = "frelux-you-dot pointer-events-auto";
          el.innerHTML =
            '<span class="frelux-you-dot__halo"></span>' +
            '<span class="frelux-you-dot__core"></span>' +
            `<span class="frelux-pin__label">${point.title.replace(/[<>&]/g, "")}</span>`;
        } else {
          el.className = classNames(
            "frelux-pin",
            `frelux-pin--${point.kind}`,
            point.id === activeId && "is-active",
          );
          el.innerHTML =
            '<svg viewBox="0 0 24 34" width="28" height="38" class="frelux-pin__marker" aria-hidden="true">' +
            '<path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.627-5.373-12-12-12z" fill="var(--pin)"/>' +
            '<circle cx="12" cy="11.5" r="4.8" fill="#ffffff"/>' +
            '<circle cx="12" cy="11.5" r="2.2" fill="var(--pin)"/>' +
            "</svg>" +
            `<span class="frelux-pin__label">${point.title.replace(/[<>&]/g, "")}</span>`;
        }

        el.addEventListener("click", (event) => {
          event.stopPropagation();
          choose(point);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: point.kind === "you" ? "center" : "bottom",
        })
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
          { padding: 88, maxZoom: 11, duration: 700 },
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
  }, [points, ready, activeId, choose, t, userPin, youProp]);

  // A record chosen outside the map (for example from the list beside it)
  // brings the camera to it and opens its card.
  useEffect(() => {
    if (!ready || !activeId) return;
    const point = points.find((p) => p.id === activeId);
    const map = mapRef.current;
    if (!point || !map) return;
    if (selectedRef.current?.id === point.id) return;
    setSelected(point);
    map.flyTo({
      center: [point.lon, point.lat],
      zoom: Math.max(map.getZoom(), 9.4),
      pitch: Math.max(map.getPitch(), 42),
      duration: 1000,
      essential: true,
    });
    window.setTimeout(syncChrome, 140);
  }, [activeId, points, ready, syncChrome]);

  // Recentre when asked explicitly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !center) return;
    map.flyTo({
      center: [center.lon, center.lat],
      zoom: Math.max(zoom ?? 6, 6),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lon, ready]);

  // Place search and deep links move the camera without touching records.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    const target = { lat: focus.lat, lon: focus.lon };
    if (!Number.isFinite(target.lat) || !Number.isFinite(target.lon)) return;
    map.flyTo({
      center: [target.lon, target.lat],
      zoom: focus.zoom ?? 10.5,
      duration: 1400,
      essential: true,
    });
    setSelected(null);
    setAnchor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key, ready]);

  // Keyboard: escape closes the record card.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setAnchor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Fullscreen keeps the same map instance; only the frame changes.
  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      window.setTimeout(syncChrome, 220);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [syncChrome]);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined);
    }
  };

  const north = useMemo(
    () => ((view.bearing % 360) + 360) % 360,
    [view.bearing],
  );

  // Ask the browser for the visitor's position, then plot it as a pin. The
  // request only runs on a tap, so opening a page never prompts for location.
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateState("denied");
      return;
    }
    setLocateState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pin: MapPoint = {
          id: "you",
          kind: "you",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          title: "Your location",
          meta: `±${Math.round(position.coords.accuracy)} m`,
        };
        setUserPin(pin);
        setUserAccuracy(position.coords.accuracy);
        setLocateState("ready");
        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [pin.lon, pin.lat],
            zoom: Math.max(map.getZoom(), 13),
            duration: 900,
          });
        }
      },
      () => setLocateState("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const resetNorth = () => {
    mapRef.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 700,
      essential: true,
    });
  };

  const scaleLabel = scale
    ? scale.km >= 1
      ? `${Math.round(scale.km)} km`
      : `${Math.round(scale.km * 1000)} m`
    : null;

  const locatedYou = userPin
    ? {
        lat: userPin.lat,
        lon: userPin.lon,
        accuracy: userAccuracy ?? undefined,
      }
    : null;
  const webglBlocked = fallbackReason === "webgl";

  if (rasterFallback) {
    return (
      <Raster2DMap
        points={points}
        center={center}
        zoom={zoom}
        focus={focus}
        height={height}
        className={className}
        interactive={interactive}
        bleed={bleed}
        onSelect={onSelect}
        onPickCoordinate={onPickCoordinate}
        activeId={activeId}
        label={label}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        you={youProp ?? locatedYou}
        notice={
          webglBlocked
            ? "2D mode: this browser has no WebGL"
            : "2D mode for browser compatibility"
        }
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className={classNames(
        "frelux-map frelux-map--enter relative isolate overflow-hidden",
        bleed
          ? "frelux-map--bleed bg-background"
          : "rounded-2xl border border-border/70 bg-muted/40 shadow-[0_30px_80px_-50px_rgba(16,12,40,0.55)] dark:border-white/10 dark:bg-background",
        fullscreen && "rounded-none border-0",
        className,
      )}
      style={{ height: fullscreen ? "100vh" : height }}
    >
      <div
        ref={containerRef}
        role="application"
        aria-label={label}
        className="h-full w-full"
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      />

      {/* Google Standard Map / Satellite Layer Switcher + Place Count */}
      {ready && (
        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setSatellite(false)}
              className={classNames(
                "px-3 py-1.5 text-xs font-semibold transition-colors",
                !satellite
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
              aria-label="Show the street map"
              title="Street map"
            >
              Map
            </button>
            <div
              className="h-4 w-px bg-zinc-200 dark:bg-zinc-700"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setSatellite(true)}
              className={classNames(
                "px-3 py-1.5 text-xs font-semibold transition-colors",
                satellite
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
              aria-label="Show satellite imagery"
              title="Satellite imagery"
            >
              Satellite
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.2)] backdrop-blur dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-200">
            <span
              className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden="true"
            />
            <span className="font-semibold tabular-nums">{points.length}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {points.length === 1 ? "place" : "places"}
            </span>
          </span>
        </div>
      )}

      {/* Google Standard Controls: Top-right Tools & Bottom-right Location + Zoom Stack */}
      {ready && interactive && (
        <>
          {/* Top-right: Fullscreen & Compass */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            {(Math.abs(north) > 2 || view.pitch > 2) && (
              <button
                type="button"
                onClick={resetNorth}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                aria-label={`Compass, facing ${Math.round(north)} degrees. Reset north and tilt.`}
                title="Reset north and flatten tilt"
              >
                <Compass
                  className="h-5 w-5 text-red-500 transition-transform"
                  style={{ transform: `rotate(${-north}deg)` }}
                  aria-hidden="true"
                />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={
                fullscreen ? "Exit fullscreen" : "Open map fullscreen"
              }
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Bottom-right: Google Standard Location Button & Zoom Stack */}
          <div className="absolute bottom-5 right-3 z-20 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={locate}
              className={classNames(
                "flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                locateState === "ready" && "text-blue-600 dark:text-blue-400",
                locateState === "locating" && "text-blue-600 animate-pulse",
                locateState === "denied" && "text-red-500",
                locateState === "idle" && "text-zinc-600 dark:text-zinc-300",
              )}
              aria-label={
                locateState === "denied"
                  ? "Location unavailable. Allow location access to place your pin."
                  : "Show my current location"
              }
              title={
                locateState === "denied"
                  ? "Location access denied"
                  : locateState === "ready"
                    ? "Your location is active (click to recenter)"
                    : "Show my current location"
              }
              data-locate-state={locateState}
            >
              <svg
                viewBox="0 0 24 24"
                className={classNames(
                  "h-5 w-5",
                  locateState === "locating" && "animate-spin",
                )}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                {locateState === "ready" && (
                  <circle cx="12" cy="12" r="3" fill="#1a73e8" />
                )}
              </svg>
            </button>

            <div className="flex flex-col items-center overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-10 w-10 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus
                  className="h-4 w-4"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              </button>
              <div
                className="h-px w-6 bg-zinc-200 dark:bg-zinc-700"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-10 w-10 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus
                  className="h-4 w-4"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Record card, anchored to the chosen pin */}
      {selected && anchor && (
        <div
          className={classNames(
            "absolute z-30 w-56 -translate-x-1/2 sm:w-64",
            anchor.above ? "-translate-y-full" : "",
          )}
          style={{
            left: anchor.x,
            top: anchor.above ? anchor.y - 46 : anchor.y + 18,
          }}
        >
          <div className="frelux-map__card">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setAnchor(null);
              }}
              className="frelux-map__card-close"
              aria-label="Close record"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <p className="frelux-map__card-kind">{LAYER_NOUN[selected.kind]}</p>
            <p className="mt-1 pr-5 text-sm font-semibold leading-snug text-foreground">
              {selected.title}
            </p>
            {selected.subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {selected.subtitle}
              </p>
            )}
            {selected.meta && (
              <p className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {selected.meta}
              </p>
            )}
            {selected.href && (
              <Link
                to={selected.href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t("View details")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Scale bar + attribution */}
      {ready && (
        <div className="absolute bottom-3 left-3 z-20 flex items-end gap-3">
          {scaleLabel && (
            <span className="frelux-map__scale">
              <span
                className="frelux-map__scale-bar"
                style={{ width: scale?.px ?? 88 }}
                aria-hidden="true"
              />
              <span className="tabular-nums">{scaleLabel}</span>
            </span>
          )}
          <span className="frelux-map__credit">
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-border/60 underline-offset-2 hover:text-foreground"
            >
              OpenStreetMap
            </a>{" "}
            ·{" "}
            <a
              href="https://openfreemap.org"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-border/60 underline-offset-2 hover:text-foreground"
            >
              OpenFreeMap
            </a>
          </span>
        </div>
      )}

      {ready && points.length === 0 && (emptyTitle || emptyHint) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 p-5">
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

      {/* Screen-reader hint for the globe's interaction model. */}
      <span className="sr-only">
        <Compass className="h-3 w-3" aria-hidden="true" /> Drag to spin the
        globe, drag with the right mouse button to tilt, and use the compass to
        return north.
      </span>
    </div>
  );
}

export default GlobeMap;
