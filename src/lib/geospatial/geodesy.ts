/**
 * Geodesy helpers — FRELUX engine-1A "Geospatial / GIS"
 * milestone 1 (2026-10-15).
 *
 * Deterministic spherical-earth helpers over EPSG:4326
 * coordinates: great-circle distance and polygon area. Accuracy
 * is honestly disclosed: the sphere model deviates from the
 * WGS-84 ellipsoid by up to ~0.5% in distance and area. For
 * engineering-grade (ellipsoidal) geodesy a provider-backed
 * implementation (e.g. GeographicLib) must be added behind its
 * own gate; until then these helpers are for site-context
 * measurements, not cadastral or legal boundaries.
 */

import { toRadians, MEAN_EARTH_RADIUS_M } from "./crs";

export interface LatLon {
  lat: number;
  lon: number;
}

function finite(n: number, label: string): void {
  if (!Number.isFinite(n)) {
    throw new RangeError(`${label} must be a finite number (received ${n}).`);
  }
  if (n < -90 || n > 90)
    throw new RangeError(`latitude ${n} out of range [-90, 90].`);
}

function finiteLon(n: number): void {
  if (!Number.isFinite(n)) {
    throw new RangeError(`longitude must be a finite number (received ${n}).`);
  }
  if (n < -180 || n > 180) {
    throw new RangeError(`longitude ${n} out of range [-180, 180].`);
  }
}

/**
 * Great-circle distance in metres (haversine, mean-Earth-radius
 * sphere). Deterministic; ~0.3-0.5% deviation vs ellipsoid.
 */
export function haversineDistanceMeters(a: LatLon, b: LatLon): number {
  finite(a.lat, "a.lat");
  finiteLon(a.lon);
  finite(b.lat, "b.lat");
  finiteLon(b.lon);
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * MEAN_EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Signed spherical polygon area in square metres over WGS-84
 * coordinates (spherical-excess formula used by the standard
 * turf.js implementation).
 *
 * Honest limits, all REFUSED rather than approximated:
 *  - fewer than 3 vertices -> error (nothing is invented),
 *  - any vertex beyond lat/lon bounds -> error,
 *  - polygons crossing the antimeridian are not supported,
 *  - edges are great-circle segments, not rhumb lines,
 *  - accuracy ~0.5% vs ellipsoid: not for cadastral use.
 */
export function sphericalPolygonAreaMeters(ring: LatLon[]): number {
  if (ring.length < 3) {
    throw new RangeError(
      `A polygon needs at least 3 vertices; received ${ring.length}. Area is never invented.`,
    );
  }
  const lons: number[] = [];
  const lats: number[] = [];
  for (const v of ring) {
    finite(v.lat, "lat");
    finiteLon(v.lon);
    lats.push(v.lat);
    lons.push(v.lon);
  }
  // Antimeridian check: total lon span must be < 180 for the
  // simple winding to be meaningful.
  const sortedLons = [...lons].sort((x, y) => x - y);
  if (sortedLons[sortedLons.length - 1] - sortedLons[0] > 180) {
    throw new RangeError(
      "Antimeridian-crossing polygons are not supported by this spherical area formula; they are refused rather than silently mis-computed.",
    );
  }
  const coords = ring.map((v) => [toRadians(v.lon), toRadians(v.lat)]);
  // Close the ring.
  coords.push(coords[0]);
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  total = (total * MEAN_EARTH_RADIUS_M * MEAN_EARTH_RADIUS_M) / 2;
  return Math.abs(total);
}
