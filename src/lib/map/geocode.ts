/**
 * Worldwide place lookup for the map search box.
 *
 * Uses OpenStreetMap's Nominatim, the same public service already used for
 * reverse geocoding in `@/lib/location`, so there is no key and no vendor
 * lock-in. Results are cached per query and requests are rate-conscious:
 * the caller debounces, and identical queries never hit the network twice.
 */

export interface PlaceResult {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  type?: string;
}

import { isValidCoordinate } from "@/lib/map/geo";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const cache = new Map<string, PlaceResult[]>();

function cacheKey(query: string, language: string): string {
  return `${language}::${query.toLowerCase()}`;
}

interface NominatimRow {
  place_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
}

/** Split "City, Region, Country" into a short name and the full label. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  return Number(raw);
}

function toResult(row: NominatimRow, fallback: string): PlaceResult | null {
  const lat = toNumber(row.lat);
  const lon = toNumber(row.lon);
  if (!isValidCoordinate(lat, lon)) return null;
  const label = row.display_name?.trim() || fallback;
  const parts = label.split(",").map((p) => p.trim());
  const name = row.name?.trim() || parts[0] || fallback;
  return {
    id: String(row.place_id ?? `${lat},${lon}`),
    name,
    label,
    lat,
    lon,
    type: row.addresstype ?? row.type,
  };
}

export async function searchPlaces(
  query: string,
  options: { language?: string; limit?: number; signal?: AbortSignal } = {},
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const language = options.language ?? "en";
  const key = cacheKey(trimmed, language);
  const cached = cache.get(key);
  if (cached) return cached.slice(0, options.limit ?? 6);

  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    limit: String(Math.min(options.limit ?? 6, 8)),
    addressdetails: "1",
    "accept-language": language,
  });

  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
    if (!response.ok) return [];
    const data = (await response.json()) as NominatimRow[];
    if (!Array.isArray(data)) return [];
    const results = data
      .map((row) => toResult(row, trimmed))
      .filter((r): r is PlaceResult => r !== null);
    cache.set(key, results);
    return results;
  } catch {
    // A failed lookup is not an error the visitor needs: the map still works.
    return [];
  }
}

/** Testing hook: drop any cached lookups. */
export function clearPlaceCache() {
  cache.clear();
}
