import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  basemapRasterFallbackUrl,
  basemapRasterUrl,
  cartoApiKey,
  esriSatelliteTileUrl,
  osmTileUrl,
} from "@/lib/map/cartoTiles";
import { resolveClientProviderKey } from "@/lib/integrations/provider-keys";
import {
  ArrowUpRight,
  Globe2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Crosshair,
  X,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { MapPoint } from "@/lib/map/geo";
import { defaultMapOpening } from "@/lib/map/defaults";

export interface Raster2DMapProps {
  points: MapPoint[];
  center?: { lat: number; lon: number } | null;
  zoom?: number;
  focus?: {
    lat: number;
    lon: number;
    zoom?: number;
    key: string | number;
  } | null;
  height?: number | string;
  className?: string;
  interactive?: boolean;
  /** Borderless, full bleed surface that blends into the page background. */
  bleed?: boolean;
  onSelect?: (point: MapPoint) => void;
  onPickCoordinate?: (coords: { lat: number; lon: number }) => void;
  activeId?: string | null;
  label: string;
  emptyTitle?: string;
  emptyHint?: string;
  notice?: string;
  /** The visitor's own position, drawn as a dot with an accuracy ring. */
  you?: { lat: number; lon: number; accuracy?: number } | null;
}

const LAYER_NOUN: Record<MapPoint["kind"], string> = {
  pro: "Professional",
  job: "Open project",
  material: "Material",
  supplier: "Supplier",
  you: "You",
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);
const TILE_SIZE = 256;
const MAX_LAT = 85.05112878;

function project(lat: number, lon: number, zoom: number) {
  const size = TILE_SIZE * 2 ** zoom;
  const boundedLat = clamp(lat, -MAX_LAT, MAX_LAT);
  const sinLat = Math.sin((boundedLat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const size = TILE_SIZE * 2 ** zoom;
  const lon = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat: clamp(lat, -MAX_LAT, MAX_LAT), lon: clamp(lon, -180, 180) };
}

function isDarkTheme() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  );
}

/** Hardware-acceleration-independent slippy map renderer using public raster tiles. */
export function Raster2DMap({
  points,
  center: centerProp,
  zoom: zoomProp,
  focus,
  height = 420,
  className,
  interactive = true,
  bleed = false,
  onSelect,
  onPickCoordinate,
  activeId,
  label,
  emptyTitle,
  emptyHint,
  notice,
  you,
}: Raster2DMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { t } = useLanguage();
  const opening = useMemo(() => {
    if (
      centerProp &&
      Number.isFinite(centerProp.lat) &&
      Number.isFinite(centerProp.lon)
    ) {
      return {
        lat: centerProp.lat,
        lon: centerProp.lon,
        zoom: zoomProp ?? 7.5,
      };
    }
    const fallback = defaultMapOpening();
    return {
      lat: fallback.lat,
      lon: fallback.lon,
      zoom: zoomProp ?? fallback.zoom,
    };
    // Initial camera is fixed on mount; later changes are handled by effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [center, setCenter] = useState({ lat: opening.lat, lon: opening.lon });
  const [zoom, setZoom] = useState(clamp(opening.zoom, 2, 18));
  const [size, setSize] = useState({
    width: 600,
    height: typeof height === "number" ? height : 420,
  });
  const [dark, setDark] = useState(isDarkTheme());
  // CARTO keys are public by design, so the map may own one that the operator
  // pasted into Admin → Integration Center. Env wins; this only fetches when
  // the build carried no key.
  const [cartoKey, setCartoKey] = useState(() => cartoApiKey());
  useEffect(() => {
    if (cartoKey) return;
    let live = true;
    resolveClientProviderKey("carto")
      .then((key) => {
        if (live && key) setCartoKey(key);
      })
      .catch(() => {
        /* no key saved: tiles stay unkeyed, which still draws */
      });
    return () => {
      live = false;
    };
  }, [cartoKey]);
  const [fullscreen, setFullscreen] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const pinch = useRef<{
    active: boolean;
    startDist: number;
    startZoom: number;
  }>({
    active: false,
    startDist: 0,
    startZoom: 0,
  });
  const drag = useRef<{
    active: boolean;
    moved: boolean;
    x: number;
    y: number;
    center: { lat: number; lon: number };
  }>({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    center: { lat: opening.lat, lon: opening.lon },
  });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: Math.max(120, entry.contentRect.width),
          height: Math.max(120, entry.contentRect.height),
        });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lon))
      return;
    setCenter({ lat: focus.lat, lon: focus.lon });
    if (focus.zoom !== undefined) setZoom(clamp(focus.zoom, 2, 18));
    setSelected(null);
  }, [focus]);

  useEffect(() => {
    if (
      !centerProp ||
      !Number.isFinite(centerProp.lat) ||
      !Number.isFinite(centerProp.lon)
    )
      return;
    setCenter({ lat: centerProp.lat, lon: centerProp.lon });
    if (zoomProp !== undefined) setZoom(clamp(zoomProp, 2, 18));
  }, [centerProp, zoomProp]);

  useEffect(() => {
    if (!activeId) return;
    const point = points.find((p) => p.id === activeId);
    if (!point) return;
    setSelected(point);
    setCenter({ lat: point.lat, lon: point.lon });
    setZoom((z) => Math.max(z, 9));
  }, [activeId, points]);

  useEffect(() => {
    if (points.length > 1 && !centerProp && !focus) {
      const lats = points.map((p) => p.lat);
      const lons = points.map((p) => p.lon);
      const minLat = Math.min(...lats),
        maxLat = Math.max(...lats);
      const minLon = Math.min(...lons),
        maxLon = Math.max(...lons);
      const z = Math.min(
        Math.log2(360 / Math.max(0.01, maxLat - minLat)),
        Math.log2(360 / Math.max(0.01, maxLon - minLon)),
      );
      setCenter({ lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 });
      setZoom(clamp(Math.round((z - 0.8) * 10) / 10, 3, 11));
    } else if (points.length === 1 && !centerProp && !focus) {
      setCenter({ lat: points[0].lat, lon: points[0].lon });
      setZoom(9);
    }
    // Fit only when the layer count changes, not on camera updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = useCallback(
    (point: MapPoint | null) => {
      setSelected(point);
      if (!point) return;
      onSelect?.(point);
      setCenter({ lat: point.lat, lon: point.lon });
      setZoom((z) => Math.max(z, 9.4));
    },
    [onSelect],
  );

  const zoomBy = (amount: number) =>
    setZoom((z) => clamp(Math.round((z + amount) * 10) / 10, 2, 18));
  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen)
      void el.requestFullscreen().catch(() => undefined);
  };

  const moveTo = (x: number, y: number) => {
    const origin = project(
      drag.current.center.lat,
      drag.current.center.lon,
      zoom,
    );
    setCenter(
      unproject(
        origin.x - (x - drag.current.x),
        origin.y - (y - drag.current.y),
        zoom,
      ),
    );
  };

  const handleMouseDown = (event: ReactMouseEvent) => {
    if (!interactive) return;
    drag.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
      center: { ...center },
    };
  };
  const handleMouseMove = (event: ReactMouseEvent) => {
    if (!drag.current.active) return;
    if (
      Math.abs(event.clientX - drag.current.x) > 3 ||
      Math.abs(event.clientY - drag.current.y) > 3
    )
      drag.current.moved = true;
    moveTo(event.clientX, event.clientY);
  };
  const handleMouseUp = (event: ReactMouseEvent) => {
    if (!drag.current.active) return;
    const moved = drag.current.moved;
    drag.current.active = false;
    if (!moved && onPickCoordinate && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const origin = project(center.lat, center.lon, zoom);
      onPickCoordinate(
        unproject(
          origin.x + event.clientX - rect.left - size.width / 2,
          origin.y + event.clientY - rect.top - size.height / 2,
          zoom,
        ),
      );
    }
  };
  const handleTouchStart = (event: ReactTouchEvent) => {
    if (!interactive) return;
    // Two fingers pinch the map instead of paging the document.
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      pinch.current = {
        active: true,
        startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startZoom: zoom,
      };
      drag.current.active = false;
      return;
    }
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    drag.current = {
      active: true,
      moved: false,
      x: touch.clientX,
      y: touch.clientY,
      center: { ...center },
    };
  };
  const handleTouchMove = (event: ReactTouchEvent) => {
    if (!interactive) return;
    if (event.touches.length === 2 && pinch.current.active) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const spread = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch.current.startDist > 0 && spread > 0) {
        const next =
          pinch.current.startZoom + Math.log2(spread / pinch.current.startDist);
        setZoom(clamp(Math.round(next * 10) / 10, 2, 18));
      }
      return;
    }
    if (!drag.current.active || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (
      Math.abs(touch.clientX - drag.current.x) > 4 ||
      Math.abs(touch.clientY - drag.current.y) > 4
    )
      drag.current.moved = true;
    moveTo(touch.clientX, touch.clientY);
  };
  const handleWheel = (event: ReactWheelEvent) => {
    if (!interactive) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.35 : -0.35);
  };
  const handleDoubleClick = (event: ReactMouseEvent) => {
    if (!interactive || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const origin = project(center.lat, center.lon, zoom);
    setCenter(
      unproject(
        origin.x + event.clientX - rect.left - size.width / 2,
        origin.y + event.clientY - rect.top - size.height / 2,
        zoom,
      ),
    );
    zoomBy(1);
  };

  const tiles = useMemo(() => {
    const level = Math.floor(zoom);
    const scale = 2 ** (zoom - level);
    const world = 2 ** level;
    const origin = project(center.lat, center.lon, level);
    const left = origin.x - size.width / (2 * scale);
    const right = origin.x + size.width / (2 * scale);
    const top = origin.y - size.height / (2 * scale);
    const bottom = origin.y + size.height / (2 * scale);
    const result: Array<{
      key: string;
      src: string;
      fallback: string;
      left: number;
      top: number;
      size: number;
    }> = [];
    for (
      let x = Math.floor(left / TILE_SIZE);
      x <= Math.floor(right / TILE_SIZE);
      x++
    ) {
      for (
        let y = Math.max(0, Math.floor(top / TILE_SIZE));
        y <= Math.min(world - 1, Math.floor(bottom / TILE_SIZE));
        y++
      ) {
        const wrappedX = ((x % world) + world) % world;
        const sub = ["a", "b", "c", "d"][Math.abs(wrappedX + y) % 4];
        result.push({
          key: `${level}-${x}-${y}`,
          // Imagery for satellite, a street sheet otherwise: CARTO when the
          // build carries a key, OpenStreetMap when it does not.
          src: satellite
            ? esriSatelliteTileUrl(level, wrappedX, y)
            : cartoKey
              ? basemapRasterUrl(sub, dark, level, wrappedX, y, cartoKey)
              : osmTileUrl(level, wrappedX, y),
          // A failed tile retries against the other provider, so a single
          // missing tile never leaves a hole in the surface.
          fallback: satellite
            ? `https://a.tile.openstreetmap.org/${level}/${wrappedX}/${y}.png`
            : basemapRasterFallbackUrl(level, wrappedX, y, cartoKey),
          left: Math.round((x * TILE_SIZE - origin.x) * scale + size.width / 2),
          top: Math.round((y * TILE_SIZE - origin.y) * scale + size.height / 2),
          size: Math.ceil(TILE_SIZE * scale),
        });
      }
    }
    return result;
  }, [
    center.lat,
    center.lon,
    zoom,
    size.width,
    size.height,
    dark,
    cartoKey,
    satellite,
  ]);

  const origin = useMemo(
    () => project(center.lat, center.lon, zoom),
    [center.lat, center.lon, zoom],
  );
  // The visitor's own position. Unlike a record pin this is a dot, so it can
  // never be confused with a business, and the ring shows how precise the
  // reading is rather than implying a surveyed point.
  const youMarker = useMemo(() => {
    if (!you || !Number.isFinite(you.lat) || !Number.isFinite(you.lon))
      return null;
    const projected = project(you.lat, you.lon, zoom);
    const x = projected.x - origin.x + size.width / 2;
    const y = projected.y - origin.y + size.height / 2;
    const metresPerPixel =
      (156543.03392 * Math.cos((you.lat * Math.PI) / 180)) / 2 ** zoom;
    const accuracyPx =
      you.accuracy && Number.isFinite(you.accuracy) && metresPerPixel > 0
        ? you.accuracy / metresPerPixel
        : 0;
    return {
      x,
      y,
      accuracyPx,
      visible:
        x > -120 && x < size.width + 120 && y > -120 && y < size.height + 120,
    };
  }, [you, zoom, origin.x, origin.y, size.width, size.height]);

  // Once the visitor's position is known the map moves to it and opens in
  // close enough that the dot is unmistakably their own site.
  const locatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!you || !Number.isFinite(you.lat) || !Number.isFinite(you.lon)) return;
    const key = `${you.lat.toFixed(4)},${you.lon.toFixed(4)}`;
    if (locatedRef.current === key) return;
    locatedRef.current = key;
    setCenter({ lat: you.lat, lon: you.lon });
    setZoom((current) => Math.max(current, 12));
  }, [you]);

  const markers = useMemo(
    () =>
      points.map((point) => {
        const p = project(point.lat, point.lon, zoom);
        const x = p.x - origin.x + size.width / 2;
        const y = p.y - origin.y + size.height / 2;
        return {
          point,
          x,
          y,
          visible:
            x > -70 && x < size.width + 70 && y > -70 && y < size.height + 70,
        };
      }),
    [points, origin.x, origin.y, zoom, size.width, size.height],
  );
  const selectedPosition = selected
    ? project(selected.lat, selected.lon, zoom)
    : null;
  const scaleMeters =
    (88 * (156543.03392 * Math.cos((center.lat * Math.PI) / 180))) / 2 ** zoom;
  const scaleLabel =
    scaleMeters >= 1000
      ? `${Math.round(scaleMeters / 1000)} km`
      : `${Math.round(scaleMeters)} m`;

  return (
    <div
      ref={rootRef}
      className={classNames(
        "frelux-map frelux-map--enter relative isolate overflow-hidden select-none",
        bleed
          ? "frelux-map--bleed bg-background"
          : "rounded-2xl border border-border/70 bg-muted/40 shadow-[0_30px_80px_-50px_rgba(16,12,40,0.55)] dark:border-white/10 dark:bg-background",
        fullscreen && "rounded-none border-0",
        className,
      )}
      style={{ height: fullscreen ? "100vh" : height }}
    >
      <div
        ref={viewportRef}
        role="application"
        aria-label={label}
        className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: interactive ? "none" : "auto" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          drag.current.active = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          pinch.current.active = false;
          drag.current.active = false;
        }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((tile) => (
            // CARTO keys are domain restricted: every tile needs a Referer
            // for the allowed origin, so this image insists on sending one.
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              referrerPolicy="origin"
              onError={(event) => {
                if (event.currentTarget.src !== tile.fallback)
                  event.currentTarget.src = tile.fallback;
              }}
              style={{
                position: "absolute",
                left: tile.left,
                top: tile.top,
                width: tile.size,
                height: tile.size,
                maxWidth: "none",
              }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 frelux-map__vignette" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 frelux-map__fade-top" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 frelux-map__fade-bottom" />
        {youMarker?.visible && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: youMarker.x,
              top: youMarker.y,
              transform: "translate(-50%, -50%)",
              zIndex: 18,
            }}
          >
            {youMarker.accuracyPx > 10 && (
              <span
                className="absolute left-1/2 top-1/2 rounded-full border border-blue-500/40 bg-blue-500/15"
                style={{
                  width: youMarker.accuracyPx * 2,
                  height: youMarker.accuracyPx * 2,
                  transform: "translate(-50%, -50%)",
                }}
                aria-hidden="true"
              />
            )}
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span
                className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-blue-500/45"
                aria-hidden="true"
              />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-md" />
            </span>
            <span className="sr-only">Your location</span>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none">
          {markers.map(({ point, x, y, visible }) => {
            if (!visible) return null;
            const isYou = point.kind === "you";
            return (
              <button
                key={point.id}
                type="button"
                aria-label={`${t(LAYER_NOUN[point.kind])}: ${point.title}${point.meta ? `, ${point.meta}` : ""}`}
                className={classNames(
                  isYou
                    ? "frelux-you-dot pointer-events-auto"
                    : "frelux-pin pointer-events-auto",
                  `frelux-pin--${point.kind}`,
                  point.id === activeId && "is-active",
                )}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: isYou
                    ? "translate(-50%, -50%)"
                    : "translate(-50%, -100%)",
                  zIndex: point.id === selected?.id ? 25 : 15,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  choose(point);
                }}
              >
                {isYou ? (
                  <>
                    <span className="frelux-you-dot__halo" />
                    <span className="frelux-you-dot__core" />
                  </>
                ) : (
                  <svg
                    viewBox="0 0 24 34"
                    width="28"
                    height="38"
                    className="frelux-pin__marker"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.627-5.373-12-12-12z"
                      fill="var(--pin)"
                    />
                    <circle cx="12" cy="11.5" r="4.8" fill="#ffffff" />
                    <circle cx="12" cy="11.5" r="2.2" fill="var(--pin)" />
                  </svg>
                )}
                <span className="frelux-pin__label">
                  {point.title.replace(/[<>&]/g, "")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
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
        {notice && (
          <span
            className="hidden md:inline-flex items-center rounded-lg border border-amber-500/30 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 shadow-[0_2px_6px_rgba(0,0,0,0.2)] backdrop-blur dark:bg-zinc-900/95 dark:text-amber-400"
            title={notice}
          >
            {notice}
          </span>
        )}
      </div>

      {interactive && (
        <>
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSatellite(false)}
              className={classNames(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-colors",
                !satellite
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
              aria-label="Show the street map"
              title="Map"
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setSatellite(true)}
              className={classNames(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-colors",
                satellite
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
              aria-label="Show satellite imagery"
              title="Satellite"
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.2)] hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={
                fullscreen ? "Exit fullscreen" : "Open map fullscreen"
              }
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="absolute bottom-5 right-3 z-20 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  you &&
                  Number.isFinite(you.lat) &&
                  Number.isFinite(you.lon)
                ) {
                  setCenter({ lat: you.lat, lon: you.lon });
                  setZoom((current) => Math.max(current, 14));
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-600 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={
                you
                  ? "Recenter on my current location"
                  : "Location is not available on this map"
              }
              title={
                you ? "Recenter on my current location" : "Location unavailable"
              }
              disabled={!you}
            >
              <Crosshair className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex flex-col items-center overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => zoomBy(1)}
                className="flex h-10 w-10 items-center justify-center text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <div
                className="h-px w-6 bg-zinc-200 dark:bg-zinc-700"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => zoomBy(-1)}
                className="flex h-10 w-10 items-center justify-center text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      {selected && selectedPosition && (
        <div
          className={classNames(
            "absolute z-30 w-56 -translate-x-1/2 sm:w-64",
            selectedPosition.y > size.height * 0.45 && "-translate-y-full",
          )}
          style={{
            left: clamp(
              selectedPosition.x - origin.x + size.width / 2,
              116,
              size.width - 116,
            ),
            top:
              selectedPosition.y - origin.y + size.height / 2 >
              size.height * 0.45
                ? selectedPosition.y - origin.y + size.height / 2 - 46
                : selectedPosition.y - origin.y + size.height / 2 + 18,
          }}
        >
          <div className="frelux-map__card">
            <button
              type="button"
              onClick={() => setSelected(null)}
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
              <p className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
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

      <div className="absolute bottom-3 left-3 z-20 flex items-end gap-3 pointer-events-none">
        <span className="frelux-map__scale pointer-events-auto">
          <span
            className="frelux-map__scale-bar"
            style={{ width: 88 }}
            aria-hidden="true"
          />
          <span className="tabular-nums">{scaleLabel}</span>
        </span>
        <span className="frelux-map__credit pointer-events-auto">
          {!satellite ? (
            <>
              ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-border/60 underline-offset-2 hover:text-foreground"
              >
                OpenStreetMap
              </a>
              {cartoKey && (
                <>
                  {" · "}
                  <a
                    href="https://carto.com/attributions"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-border/60 underline-offset-2 hover:text-foreground"
                  >
                    CARTO
                  </a>
                </>
              )}
            </>
          ) : (
            <>
              Imagery ©{" "}
              <a
                href="https://www.esri.com"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-border/60 underline-offset-2 hover:text-foreground"
              >
                Esri
              </a>
              , Maxar, Earthstar Geographics
            </>
          )}
        </span>
      </div>

      {points.length === 0 && (emptyTitle || emptyHint) && (
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
    </div>
  );
}

export default Raster2DMap;
