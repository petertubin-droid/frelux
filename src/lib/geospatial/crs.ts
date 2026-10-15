/**
 * CRS (coordinate reference system) foundation — FRELUX engine-1A
 * "Geospatial / GIS" milestone 1 (2026-10-15).
 *
 * The audit found NO GIS engine: nothing on the platform carries
 * an explicit coordinate system. This module lays the first brick:
 * a deterministic, dependency-free registry of supported CRSs,
 * strict coordinate validation, and WGS-84 <-> Web Mercator
 * transforms. Every function is explicit about what it supports;
 * anything unsupported is REFUSED with an honest error, never
 * guessed at or silently converted.
 *
 * This is not a full PROJ/GDAL port: no datum shifts, no
 * custom projections, no geoid models. Those are refused until
 * provider-backed implementations land behind their own gates.
 */

export type CrsAxisOrder = "lat,lon" | "x,y";

export interface CrsDefinition {
  code: string;
  name: string;
  unit: "degree" | "metre";
  /** Authority axis order (EPSG definition). */
  axisOrder: CrsAxisOrder;
  /** Valid bounds in THIS CRS's own numeric pair [first, second]. */
  bounds: [number, number, number, number];
  /** True when this CRS is exactly convertible to Web Mercator. */
  webMercatorConvertible: boolean;
  notes: string;
}

/** Mean Earth radius in metres (IUGG mean radius R1). */
export const MEAN_EARTH_RADIUS_M = 6371008.8;

/** Web Mercator (EPSG:3857) extent in metres: half circumference. */
export const WEB_MERCATOR_MAX = 20037508.342789244;

export const CRS_REGISTRY: Record<string, CrsDefinition> = {
  "EPSG:4326": {
    code: "EPSG:4326",
    name: "WGS 84 (geographic lon/lat, degrees)",
    unit: "degree",
    axisOrder: "lat,lon",
    bounds: [-90, -180, 90, 180],
    webMercatorConvertible: true,
    notes:
      "Authority axis order is latitude, longitude. All functions in this module take (lat, lon) for EPSG:4326.",
  },
  "EPSG:3857": {
    code: "EPSG:3857",
    name: "WGS 84 / Pseudo-Mercator (metres)",
    unit: "metre",
    axisOrder: "x,y",
    bounds: [
      -WEB_MERCATOR_MAX,
      -WEB_MERCATOR_MAX,
      WEB_MERCATOR_MAX,
      WEB_MERCATOR_MAX,
    ],
    webMercatorConvertible: true,
    notes:
      "Web Mercator as used by all major tile providers. Spherical (not ellipsoidal) formulas per the EPSG definition.",
  },
};

export interface CoordinateValidation {
  ok: boolean;
  errors: string[];
}

export function getCrs(code: string): CrsDefinition | null {
  return CRS_REGISTRY[code] ?? null;
}

export function supportedCrsCodes(): string[] {
  return Object.keys(CRS_REGISTRY);
}

/** Strict bounds validation. NaN/Infinity are always invalid. */
export function validateCoordinate(
  code: string,
  a: number,
  b: number,
): CoordinateValidation {
  const crs = getCrs(code);
  if (!crs) {
    return {
      ok: false,
      errors: [
        `Unsupported coordinate system "${code}". Supported: ${supportedCrsCodes().join(
          ", ",
        )}. Refusing rather than guessing a transformation.`,
      ],
    };
  }
  const [minA, minB, maxA, maxB] = crs.bounds;
  const errors: string[] = [];
  for (const [label, v, min, max] of [
    ["first coordinate", a, minA, maxA],
    ["second coordinate", b, minB, maxB],
  ] as const) {
    if (!Number.isFinite(v)) {
      errors.push(`${label} must be a finite number (received ${v}).`);
    } else if (v < min || v > max) {
      errors.push(
        `${label} ${v} is outside ${code} bounds [${min}, ${max}].`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Degrees -> radians. */
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians -> degrees. */
export function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface WebMercatorPoint {
  x: number;
  y: number;
}

/**
 * EPSG:4326 (lat, lon, degrees) -> EPSG:3857 (x, y, metres).
 * Spherical formulas per the EPSG:3857 definition. Input must
 * pass validateCoordinate("EPSG:4326", lat, lon) — this is
 * checked and refused, never assumed.
 */
export function wgs84ToWebMercator(lat: number, lon: number): WebMercatorPoint {
  const v = validateCoordinate("EPSG:4326", lat, lon);
  if (!v.ok) {
    throw new RangeError(v.errors.join(" "));
  }
  const x = WEB_MERCATOR_MAX * (lon / 180);
  const y =
    (WEB_MERCATOR_MAX / Math.PI) *
    Math.log(Math.tan(Math.PI / 4 + toRadians(lat) / 2));
  return { x, y };
}

/**
 * EPSG:3857 (x, y, metres) -> EPSG:4326 (lat, lon, degrees).
 * Inverse of wgs84ToWebMercator; same refusal rule.
 */
export function webMercatorToWgs84(x: number, y: number): {
  lat: number;
  lon: number;
} {
  const v = validateCoordinate("EPSG:3857", x, y);
  if (!v.ok) {
    throw new RangeError(v.errors.join(" "));
  }
  const lon = (x / WEB_MERCATOR_MAX) * 180;
  const lat =
    toDegrees(2 * Math.atan(Math.exp((y * Math.PI) / WEB_MERCATOR_MAX)) -
      Math.PI / 2);
  return { lat, lon };
}
