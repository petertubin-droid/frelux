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
