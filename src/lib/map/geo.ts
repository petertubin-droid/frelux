/**
 * Map domain helpers.
 *
 * Every marker on a FRELUX map comes from a real record with real
 * coordinates. Nothing is placed at a guessed position: a record without a
 * usable latitude/longitude simply does not appear, and the map says so
 * rather than inventing pins.
 */

export type MapLayerKind = "pro" | "job" | "material" | "supplier" | "you";

/** Pin colour per record kind; the same value drives pins and legends. */
export const MAP_KIND_COLOR: Record<MapLayerKind, string> = {
  pro: "#7c5cff",
  job: "#0ea5e9",
  material: "#f59e0b",
  supplier: "#0f766e",
  you: "#10b981",
};

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

export type DistanceUnit = "metric" | "imperial";

/**
 * Miles for the countries that use them, kilometres everywhere else. The map
 * is worldwide, so distance has to follow the reader's own convention.
 */
export function distanceUnitFor(locale?: string): DistanceUnit {
  const tag = (locale ?? "").toLowerCase();
  const imperial = ["en-us", "en-lr", "en-mm", "my-mm"];
  return imperial.some((prefix) => tag.startsWith(prefix))
    ? "imperial"
    : "metric";
}

export function formatDistanceKm(
  km: number,
  unit: DistanceUnit = "metric",
): string {
  if (!Number.isFinite(km)) return "";
  if (unit === "imperial") {
    const miles = km * 0.621371;
    if (miles < 0.1) return `${Math.round(miles * 5280)} ft away`;
    if (miles < 10) return `${miles.toFixed(1)} mi away`;
    return `${Math.round(miles)} mi away`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Grouped digits in the reader's own locale. */
export function formatNumberFor(value: number, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale).format(Math.round(value));
  } catch {
    return String(Math.round(value));
  }
}

/**
 * Money keeps its ISO currency code so a price is unambiguous in any country,
 * while the digits follow the reader's locale.
 */
export function formatMoney(
  currency: string | null | undefined,
  amount: number,
  locale?: string,
): string {
  const code = (currency ?? "").trim().toUpperCase();
  const digits = formatNumberFor(amount, locale);
  return code ? `${code} ${digits}` : digits;
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
        ? `${formatMoney(row.currency, row.price)}${row.unit ? ` / ${row.unit}` : ""}`
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

export interface SupplierRow {
  id: string;
  company_name: string;
  city: string | null;
  neighbourhood: string | null;
  market_code: string;
  verification_level: string | null;
  latitude: number | null;
  longitude: number | null;
  public_slug: string | null;
  product_categories: string[] | null;
}

const SUPPLIER_MAP_LABELS: Record<string, string> = {
  unverified: "Unverified",
  identity_checked: "ID checked",
  documents_reviewed: "Documents reviewed",
  address_checked: "Address checked",
  platform_verified: "Platform verified",
};

/**
 * Suppliers on the map. A pin appears only where the supplier has a real
 * coordinate; the badge states the verification level rather than implying
 * trust, and unverified suppliers are labelled as such.
 */
export function pointsFromSuppliers(rows: SupplierRow[]): MapPoint[] {
  const points: MapPoint[] = [];
  for (const row of rows) {
    if (!isValidCoordinate(row.latitude, row.longitude)) continue;
    const category = row.product_categories?.[0];
    points.push({
      id: `supplier:${row.id}`,
      lat: row.latitude as number,
      lon: row.longitude as number,
      title: row.company_name,
      subtitle:
        [row.neighbourhood, row.city].filter(Boolean).join(", ") ||
        row.market_code,
      meta:
        SUPPLIER_MAP_LABELS[row.verification_level ?? "unverified"] ?? category,
      href: row.public_slug
        ? `/suppliers/${row.public_slug}`
        : `/suppliers?supplier=${row.id}`,
      kind: "supplier",
    });
  }
  return points;
}
