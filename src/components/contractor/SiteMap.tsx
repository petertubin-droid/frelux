/**
 * SiteMap — deterministic provider-backed map preview for a
 * project site (FRELUX engine-1A GIS milestone 3, 2026-10-15;
 * milestone 4 upgrade: licensed satellite imagery providers).
 *
 * Renders XYZ tiles around the site pin with an optional
 * boundary overlay. Milestone 4 adds the licensed imagery
 * providers (M4 imagery.ts registry): satellite tiles only
 * render when the project has a registered, unexpired license
 * record, and every map carries the provider's required
 * attribution plus its honest source/coverage disclosure.
 * Refusals render an honest error state — no fallback imagery
 * is ever substituted. Zoom is explicit client state; tile math
 * is the tested tiles.ts module.
 */

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  computeMapLayout,
  TILE_DISCLOSURE,
} from "@/lib/geospatial/tiles";
import {
  resolveCustomImageryProvider,
  resolveImageryProvider,
  type ImageryRecord,
} from "@/lib/geospatial/imagery";
import type { LatLon } from "@/lib/geospatial/geodesy";

export default function SiteMap({
  lat,
  lon,
  polygon,
  initialZoom = 16,
  height = 320,
  /** Licensed imagery provider (imagery.ts registry). Default OSM. */
  providerId = "osm-standard",
  /** The project's registered imagery record for this provider, when one exists. */
  imageryRecord,
}: {
  lat: number;
  lon: number;
  polygon?: LatLon[] | null;
  initialZoom?: number;
  height?: number;
  providerId?: string;
  imageryRecord?: ImageryRecord | null;
}) {
  const [zoom, setZoom] = useState(initialZoom);
  // Fixed square view; tile layout fills it.
  const viewSizePx = height;

  const { layout, disclosure, attribution, error } = useMemo(() => {
    try {
      // Custom (drone/hosted) imagery resolves from its registered
      // license record — never from the basemap registry.
      const provider =
        providerId === "custom"
          ? imageryRecord
            ? resolveCustomImageryProvider(imageryRecord)
            : null
          : resolveImageryProvider(providerId);
      if (!provider) {
        throw new RangeError(
          "Custom imagery is not registered for this project: register the drone/hosted imagery record (license, capture date, tiles) to render it.",
        );
      }
      const effectiveProvider = provider;
      const base = computeMapLayout({
        lat,
        lon,
        polygon,
        zoom,
        viewSizePx,
      });
      const withUrls: ReturnType<typeof computeMapLayout> = {
        ...base,
        tiles: base.tiles.map((t) => ({
          ...t,
          url: effectiveProvider.tileUrlTemplate
            .replace("{z}", String(t.zoom))
            .replace("{x}", String(t.x))
            .replace("{y}", String(t.y)),
        })),
      };
      const recordDisclosure = imageryRecord
        ? ` · Registered set: ${imageryRecord.name}${imageryRecord.captured_on ? ` (captured ${imageryRecord.captured_on})` : ""}`
        : "";
      return {
        layout: withUrls,
        disclosure:
          providerId === "osm-standard"
            ? TILE_DISCLOSURE
            : `${provider.disclosure}${recordDisclosure}`,
        attribution: imageryRecord?.attribution || provider.attribution,
        error: null as string | null,
      };
    } catch (e) {
      return {
        layout: null,
        disclosure: null,
        attribution: null,
        error:
          e instanceof Error
            ? e.message
            : "The site map could not be computed.",
      };
    }
  }, [lat, lon, polygon, zoom, viewSizePx, providerId, imageryRecord]);

  if (error || !layout) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No fallback imagery is invented: fix the site coordinates or the
          imagery license record and the map returns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-lg border border-border dark:border-white/10 bg-muted"
        style={{ height: viewSizePx }}
        role="img"
        aria-label={`Site map (${providerId}) at latitude ${lat}, longitude ${lon}`}
      >
        {layout.tiles.map((t) => (
          <img
            key={`${t.zoom}/${t.x}/${t.y}`}
            src={t.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              // Provider refused/failed: hide the broken tile, keep the honest frame.
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
            className="absolute select-none"
            style={{ left: t.left, top: t.top, width: 256, height: 256 }}
          />
        ))}
        {layout.polygonPath && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={viewSizePx}
            height={viewSizePx}
            viewBox={`0 0 ${viewSizePx} ${viewSizePx}`}
          >
            <polygon
              points={layout.polygonPath
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="rgba(59,130,246,0.15)"
              stroke="rgb(59,130,246)"
              strokeWidth={2}
            />
          </svg>
        )}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: layout.pin.x, top: layout.pin.y }}
        >
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-red-600 shadow-md" />
        </div>
        {/* License-required attribution, always visible on the map */}
        <p className="absolute bottom-1 left-1 max-w-[85%] rounded bg-background/80 px-1.5 py-0.5 text-[9px] leading-tight text-foreground/80 backdrop-blur-sm">
          {attribution}
        </p>
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 3}
            onClick={() => setZoom((z) => Math.max(3, z - 1))}
            className="rounded-md border border-border bg-card p-1 text-foreground shadow-sm hover:bg-accent disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 19}
            onClick={() => setZoom((z) => Math.min(19, z + 1))}
            className="rounded-md border border-border bg-card p-1 text-foreground shadow-sm hover:bg-accent disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {disclosure}
      </p>
    </div>
  );
}
