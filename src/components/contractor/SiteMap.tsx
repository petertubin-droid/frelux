/**
 * SiteMap — deterministic provider-backed map preview for a
 * project site (FRELUX engine-1A GIS milestone 3, 2026-10-15).
 *
 * Renders OpenStreetMap XYZ tiles around the site pin with an
 * optional boundary overlay. Every map carries the honest
 * provider/coverage disclosure (TILE_DISCLOSURE) — FRELUX stores
 * no imagery and claims none. Zoom is explicit client state;
 * tile math is the tested tiles.ts module.
 */

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  computeMapLayout,
  TILE_DISCLOSURE,
} from "@/lib/geospatial/tiles";
import type { LatLon } from "@/lib/geospatial/geodesy";

export default function SiteMap({
  lat,
  lon,
  polygon,
  initialZoom = 16,
  height = 320,
}: {
  lat: number;
  lon: number;
  polygon?: LatLon[] | null;
  initialZoom?: number;
  height?: number;
}) {
  const [zoom, setZoom] = useState(initialZoom);
  // Fixed square view; tile layout fills it.
  const viewSizePx = height;
  let layout: ReturnType<typeof computeMapLayout> | null = null;
  let error: string | null = null;
  try {
    layout = computeMapLayout({
      lat,
      lon,
      polygon,
      zoom,
      viewSizePx,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "The site map could not be computed.";
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No fallback imagery is invented: fix the site coordinates and the
          map returns.
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
        aria-label={`Site map at latitude ${lat}, longitude ${lon}`}
      >
        {layout!.tiles.map((t) => (
          <img
            key={`${t.zoom}/${t.x}/${t.y}`}
            src={t.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute select-none"
            style={{ left: t.left, top: t.top, width: 256, height: 256 }}
          />
        ))}
        {layout!.polygonPath && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={viewSizePx}
            height={viewSizePx}
            viewBox={`0 0 ${viewSizePx} ${viewSizePx}`}
          >
            <polygon
              points={layout!.polygonPath
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
          style={{ left: layout!.pin.x, top: layout!.pin.y }}
        >
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-red-600 shadow-md" />
        </div>
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
        {TILE_DISCLOSURE}
      </p>
    </div>
  );
}
