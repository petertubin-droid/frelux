/**
 * CARTO raster basemap URLs.
 *
 * The map renders its own raster tiles rather than a tile library style, and
 * CARTO began requiring an API key for basemap raster traffic. The key is a
 * client-facing value: it ships inside the bundle the browser downloads, which
 * is why it is read from a VITE_ variable and left out of the secret scan.
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
  return key ? `${base}?api_key=${encodeURIComponent(key)}` : base;
}
