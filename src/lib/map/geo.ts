/**
 * Map domain helpers.
 *
 * Every marker on a FRELUX map comes from a real record with real
 * coordinates. Nothing is placed at a guessed position: a record without a
 * usable latitude/longitude simply does not appear, and the map says so
 * rather than inventing pins.
 */

export type MapLayerKind = "pro" | "job" | "material" | "you";

export interface MapPoint {
  id: string;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
  /** Badge text, e.g. "Verified", "12 bids", "Delivers". */
  meta?: string;
  href?: string;
  kind: MapLayerKind;
}

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** A coordinate pair is usable only when it is a finite, in-range number. */
export function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0) // null island is always a missing value here
  );
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

export function boundsFor(points: MapPoint[]): GeoBounds | null {
  if (points.length === 0) return null;
  let west = points[0].lon;
  let east = points[0].lon;
  let south = points[0].lat;
  let north = points[0].lat;
  for (const p of points) {
    west = Math.min(west, p.lon);
    east = Math.max(east, p.lon);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  return { west, south, east, north };
}

/** Sort points by distance from a viewer, nearest first. */
export function sortByDistance(
  points: MapPoint[],
  from: { lat: number; lon: number } | null,
): MapPoint[] {
  if (!from) return points;
  return [...points]
    .map((p) => ({ p, d: haversineKm(from.lat, from.lon, p.lat, p.lon) }))
    .sort((a, b) => a.d - b.d)
    .map((entry) => entry.p);
}

/** A compact "city, country" label for a record. */
export function placeLabel(row: {
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
}): string {
  return [row.location_city, row.location_state, row.location_country]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(", ");
}

interface ProRow {
  id: string;
  display_name?: string | null;
  business_name?: string | null;
  slug?: string | null;
  verification_status?: string | null;
  rating_avg?: number | null;
  category?: { name?: string | null } | null;
  locations?: Array<{
    location?: {
      latitude?: number | null;
      longitude?: number | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  }> | null;
}

/** Verified pros, one pin each at their listed workshop/base location. */
export function pointsFromPros(rows: ProRow[]): MapPoint[] {
  const points: MapPoint[] = [];
  for (const row of rows) {
    const loc = (row.locations ?? [])
      .map((l) => l?.location)
      .find((l) => l && isValidCoordinate(l.latitude, l.longitude));
    if (!loc) continue;
    if (row.verification_status === "suspended") continue;
    points.push({
      id: `pro:${row.id}`,
      lat: loc.latitude as number,
      lon: loc.longitude as number,
      title: row.business_name || row.display_name || "FRELUX professional",
      subtitle: [row.category?.name, loc.city, loc.state]
        .filter(Boolean)
        .join(" · "),
      meta:
        row.verification_status === "verified"
          ? "Verified"
          : row.rating_avg
            ? `${Number(row.rating_avg).toFixed(1)} rating`
            : undefined,
      href: row.slug ? `/pro-connect/${row.slug}` : undefined,
      kind: "pro",
    });
  }
  return points;
}

interface JobRow {
  id: string;
  title?: string | null;
  project_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string | null;
  bid_count?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Open marketplace jobs that carry coordinates. */
export function pointsFromJobs(rows: JobRow[]): MapPoint[] {
  const points: MapPoint[] = [];
  for (const row of rows) {
    if (!isValidCoordinate(row.latitude, row.longitude)) continue;
    const budget =
      row.budget_max && row.currency
        ? `Up to ${row.currency} ${Math.round(row.budget_max).toLocaleString()}`
        : row.budget_min && row.currency
          ? `From ${row.currency} ${Math.round(row.budget_min).toLocaleString()}`
          : undefined;
    const lat = row.latitude as number;
    const lon = row.longitude as number;
    points.push({
      id: `job:${row.id}`,
      lat,
      lon,
      title: row.title || "Open project",
      subtitle: [row.project_type, placeLabel(row)].filter(Boolean).join(" · "),
      meta:
        typeof row.bid_count === "number" && row.bid_count > 0
          ? `${row.bid_count} bid${row.bid_count === 1 ? "" : "s"}`
          : budget,
      href: `/marketplace/listing/${row.id}`,
      kind: "job",
    });
  }
  return points;
}

interface MaterialRow {
  id: string;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  unit?: string | null;
  delivery_available?: boolean | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Materials and stock listed for sale with coordinates. */
export function pointsFromMaterials(rows: MaterialRow[]): MapPoint[] {
  const points: MapPoint[] = [];
  for (const row of rows) {
    if (!isValidCoordinate(row.latitude, row.longitude)) continue;
    const price =
      row.price && row.currency
        ? `${row.currency} ${Math.round(row.price).toLocaleString()}${row.unit ? ` / ${row.unit}` : ""}`
        : undefined;
    const lat = row.latitude as number;
    const lon = row.longitude as number;
    points.push({
      id: `material:${row.id}`,
      lat,
      lon,
      title: row.title || "Material listing",
      subtitle: placeLabel(row),
      meta: row.delivery_available ? "Delivers" : price,
      href: `/marketplace/product/${row.id}`,
      kind: "material",
    });
  }
  return points;
}
