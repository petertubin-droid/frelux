/**
 * Coastal exposure from a bundled, generalized coastline reference.
 *
 * Deliberately offline: FRELUX runs in static mode too, so coastal
 * proximity must resolve without any API. The reference is Natural
 * Earth's 1:50m coastline (public domain), thinned to ~22 km point
 * spacing, so distances are APPROXIMATE (±25 km). We therefore report
 * bands (coast-adjacent / coastal / near-coast / inland), never a
 * precise distance, and say so in the UI.
 */

import coastline from "./coastline.json";
import type { CoastalExposure } from "./types";

const POINTS: readonly (readonly [number, number])[] = (
  coastline as unknown as { points: [number, number][] }
).points;

const REFERENCE =
  "Natural Earth 1:50m coastline (public domain), thinned to ~22 km spacing";

const EARTH_RADIUS_KM = 6371.0088;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Approximate distance to the nearest coastline reference point, in km. */
export function nearestCoastKm(lat: number, lon: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const [pLat, pLon] of POINTS) {
    const d = haversineKm({ lat, lon }, { lat: pLat, lon: pLon });
    if (d < best) {
      best = d;
      if (best < 1) break; // cannot meaningfully improve for banding
    }
  }
  return best;
}

export const COASTAL_BAND_LABELS: Record<CoastalExposure["band"], string> = {
  coast_adjacent: "Coast-adjacent (≤5 km) — marine/chloride exposure",
  coastal: "Coastal (≤25 km) — salt-laden air likely",
  near_coast: "Near-coast (≤100 km) — occasional marine influence",
  inland: "Inland (>100 km) — no marine exposure indicated",
};

export function bandForDistance(distanceKm: number): CoastalExposure["band"] {
  if (distanceKm <= 5) return "coast_adjacent";
  if (distanceKm <= 25) return "coastal";
  if (distanceKm <= 100) return "near_coast";
  return "inland";
}

export function coastalExposureFor(lat: number, lon: number): CoastalExposure {
  const distanceKm = nearestCoastKm(lat, lon);
  return {
    distanceKm: Math.round(distanceKm),
    band: bandForDistance(distanceKm),
    approximate: true,
    reference: REFERENCE,
  };
}
