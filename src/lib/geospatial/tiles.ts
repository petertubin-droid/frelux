/**
 * Web-Mercator slippy-map tile math — FRELUX engine-1A
 * "Geospatial / GIS" milestone 3 (2026-10-15).
 *
 * Deterministic, dependency-free OSM XYZ tile math (the standard
 * "slippy map" convention used by OpenStreetMap and every major
 * tile provider). Used by the Site map preview to place provider
 * tiles, the site pin and an optional boundary polygon in one
 * pixel space.
 *
 * Honest limits: Web Mercator tiles only cover latitudes within
 * +/- 85.05112878 degrees (the projection square). Coordinates
 * beyond that are REFUSED, never clamped or wrapped.
 */

import { toRadians, toDegrees } from "./crs";

/** Standard tile size in pixels (XYZ/OSM convention). */
export const TILE_SIZE = 256;

/** Web Mercator latitude limit (projection square). */
export const WEB_MERCATOR_LAT_LIMIT = 85.05112878;

/** Provider + license disclosure rendered with every map. */
export const TILE_DISCLOSURE =
  "Map tiles: OpenStreetMap contributors, ODbL license, fetched live from tile.openstreetmap.org in your browser. Coverage and freshness depend on the provider; FRELUX stores no imagery and claims none as its own.";

export interface TileFraction {
  x: number;
  y: number;
}

/** Lat/lon to fractional tile coordinates at a zoom level. */
export function latLonToTileFraction(
  lat: number,
  lon: number,
  zoom: number,
): TileFraction {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new RangeError("Latitude and longitude must be finite numbers.");
  }
  if (lat < -WEB_MERCATOR_LAT_LIMIT || lat > WEB_MERCATOR_LAT_LIMIT) {
    throw new RangeError(
      `Latitude ${lat} is beyond the Web Mercator tile limit (+/- ${WEB_MERCATOR_LAT_LIMIT}). Tiles do not exist there; refusing rather than wrapping.`,
    );
  }
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 21) {
    throw new RangeError(`Zoom must be an integer in [0, 21] (received ${zoom}).`);
  }
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = toRadians(lat);
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n;
  return { x, y };
}

/** Pixel position of a fractional tile coordinate inside a view. */
export function tileFractionToPixel(
  f: TileFraction,
  viewCenterFraction: TileFraction,
  viewSizePx: number,
): { x: number; y: number } {
  const px = (f.x - viewCenterFraction.x) * TILE_SIZE + viewSizePx / 2;
  const py = (f.y - viewCenterFraction.y) * TILE_SIZE + viewSizePx / 2;
  return { x: px, y: py };
}

/** OSM XYZ tile URL. Integer tile coordinates only. */
export function osmTileUrl(zoom: number, x: number, y: number): string {
  if (!Number.isInteger(zoom) || !Number.isInteger(x) || !Number.isInteger(y)) {
    throw new RangeError("Tile coordinates must be integers.");
  }
  const n = Math.pow(2, zoom);
  if (x < 0 || x >= n || y < 0 || y >= n) {
    throw new RangeError(
      `Tile ${zoom}/${x}/${y} is outside the tile grid (0..${n - 1}).`,
    );
  }
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

export interface MapTilePlacement {
  url: string;
  /** Top-left of the tile image, in view pixels. */
  left: number;
  top: number;
  zoom: number;
  x: number;
  y: number;
}

export interface MapLayout {
  /** Tiles covering the view (3x3 around the centre tile). */
  tiles: MapTilePlacement[];
  /** Pin position in view pixels. */
  pin: { x: number; y: number };
  /** Boundary polygon path in view pixels (when a polygon is given). */
  polygonPath: { x: number; y: number }[] | null;
  viewSizePx: number;
  zoom: number;
}

/**
 * Deterministic layout of the map view for a pin (and optional
 * boundary): 3x3 tiles around the centre tile, pin and polygon
 * positioned in the same pixel space.
 */
export function computeMapLayout(input: {
  lat: number;
  lon: number;
  polygon?: { lat: number; lon: number }[] | null;
  zoom: number;
  viewSizePx?: number;
}): MapLayout {
  const viewSizePx = input.viewSizePx ?? 512;
  const center = latLonToTileFraction(input.lat, input.lon, input.zoom);
  const centerTileX = Math.floor(center.x);
  const centerTileY = Math.floor(center.y);
  const n = Math.pow(2, input.zoom);

  const tiles: MapTilePlacement[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      if (tx < 0 || tx >= n || ty < 0 || ty >= n) continue;
      const worldPxX = tx * TILE_SIZE;
      const worldPxY = ty * TILE_SIZE;
      const left = worldPxX - (center.x * TILE_SIZE - viewSizePx / 2);
      const top = worldPxY - (center.y * TILE_SIZE - viewSizePx / 2);
      tiles.push({
        url: osmTileUrl(input.zoom, tx, ty),
        left,
        top,
        zoom: input.zoom,
        x: tx,
        y: ty,
      });
    }
  }

  const pin = tileFractionToPixel(center, center, viewSizePx);

  let polygonPath: { x: number; y: number }[] | null = null;
  if (input.polygon && input.polygon.length >= 3) {
    polygonPath = input.polygon.map((v) => {
      const f = latLonToTileFraction(v.lat, v.lon, input.zoom);
      return tileFractionToPixel(f, center, viewSizePx);
    });
  }

  return { tiles, pin, polygonPath, viewSizePx, zoom: input.zoom };
}

/** Degrees helper kept for symmetry with crs.ts. */
export { toDegrees };
