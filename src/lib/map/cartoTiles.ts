/**
 * CARTO raster basemap URLs.
 *
 * The map renders its own raster tiles rather than a tile library style, and
 * CARTO now requires a basemap key on every tile URL under basemaps.cartocdn.com;
 * without one the CDN serves "API KEY REQUIRED" watermark tiles. The parameter
 * name is `key`. Keys are domain restricted, so the requesting page must send a
 * Referer for the allowed origin (the map sets referrerPolicy="origin" for that).
 * The key is a client-facing value by design and is normally read from the
 * Integration Center rather than the bundle.
 *
 * Without a key the URLs stay exactly as they were, so a build with no key
 * configured still draws the map instead of a blank grid.
 */

const LAYER_PATH = {
  dark: "dark_all",
  light: "rastertiles/voyager",
} as const;

export type CartoLayer = keyof typeof LAYER_PATH;

/** Read at call time so tests and the build can set it either way. */
export function cartoApiKey(): string {
  const value = import.meta.env.VITE_CARTO_API_KEY;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * One retry-ready raster tile. `subdomain` spreads requests over a to d, as
 * CARTO asks clients to do; the key is appended as a query parameter so the
 * request is attributed to the FRELUX account.
 */
export function cartoTileUrl(
  subdomain: string,
  layer: CartoLayer,
  z: number,
  x: number,
  y: number,
  key: string = cartoApiKey(),
): string {
  const base = `https://${subdomain}.basemaps.cartocdn.com/${LAYER_PATH[layer]}/${z}/${x}/${y}@2x.png`;
  return key ? `${base}?key=${encodeURIComponent(key)}` : base;
}

/** True when the build carries a CARTO basemap key. */
export function cartoConfigured(key: string = cartoApiKey()): boolean {
  return key.trim().length > 0;
}

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
const CARTO_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";

/**
 * One raster tile for the non-WebGL map, in colour.
 *
 * Keyless CARTO answers with an "API KEY REQUIRED" watermark, which renders as a
 * flat grey sheet rather than a map, so the unkeyed path falls back to
 * OpenStreetMap standard tiles. They are in colour and need no key; CARTO stays
 * the preferred source when the build has one.
 */
export function basemapRasterUrl(
  subdomain: string,
  dark: boolean,
  z: number,
  x: number,
  y: number,
  key: string = cartoApiKey(),
): string {
  if (cartoConfigured(key)) {
    return cartoTileUrl(subdomain, dark ? "dark" : "light", z, x, y, key);
  }
  const sub = subdomain === "d" ? "a" : subdomain;
  return `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export function basemapAttribution(key: string = cartoApiKey()): string {
  return cartoConfigured(key) ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION;
}
