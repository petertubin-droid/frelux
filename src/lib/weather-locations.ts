/**
 * Weather locations for the weather-aware widgets.
 *
 * Config-driven list of Nigerian states + FCT so users can pick where
 * they are working instead of everything defaulting to Lagos. Each entry
 * carries approximate state-capital coordinates and a climate zone used
 * by the offline seasonal estimator (when no weather API key is set).
 *
 * Nigeria is the default market; future markets can extend this list
 * additively (e.g. WEATHER_LOCATIONS_BY_MARKET) without touching
 * existing consumers.
 */

import { useEffect, useState } from "react";

/** Climate zones used by the estimated-weather fallback. */
export type WeatherClimate = "coastal" | "tropical" | "arid" | "temperate";

export interface WeatherLocation {
  id: string;
  /** Display name (state name, city name, or "Current location"). */
  name: string;
  lat: number;
  lon: number;
  climate: WeatherClimate;
  /** Country label for global cities, e.g. "United States". */
  country?: string;
  /** True for a city resolved from search or the device location. */
  custom?: boolean;
}

export const WEATHER_LOCATIONS: WeatherLocation[] = [
  // South-West
  { id: "lagos", name: "Lagos", lat: 6.6054, lon: 3.3545, climate: "coastal" },
  { id: "ogun", name: "Ogun", lat: 7.1479, lon: 3.3619, climate: "tropical" },
  { id: "oyo", name: "Oyo", lat: 7.3776, lon: 3.9053, climate: "tropical" },
  { id: "osun", name: "Osun", lat: 7.6296, lon: 4.5486, climate: "tropical" },
  { id: "ondo", name: "Ondo", lat: 7.2531, lon: 5.2127, climate: "tropical" },
  { id: "ekiti", name: "Ekiti", lat: 7.6211, lon: 5.2215, climate: "tropical" },
  // South-South (coastal)
  {
    id: "rivers",
    name: "Rivers",
    lat: 4.8204,
    lon: 7.0525,
    climate: "coastal",
  },
  {
    id: "bayelsa",
    name: "Bayelsa",
    lat: 4.9243,
    lon: 6.2498,
    climate: "coastal",
  },
  { id: "delta", name: "Delta", lat: 6.2065, lon: 6.7311, climate: "coastal" },
  {
    id: "akwa-ibom",
    name: "Akwa Ibom",
    lat: 5.0311,
    lon: 7.9265,
    climate: "coastal",
  },
  {
    id: "cross-river",
    name: "Cross River",
    lat: 4.9623,
    lon: 8.3263,
    climate: "coastal",
  },
  { id: "edo", name: "Edo", lat: 6.3208, lon: 5.6911, climate: "tropical" },
  // South-East
  {
    id: "anambra",
    name: "Anambra",
    lat: 6.2119,
    lon: 7.0751,
    climate: "tropical",
  },
  { id: "enugu", name: "Enugu", lat: 6.4496, lon: 7.5021, climate: "tropical" },
  { id: "abia", name: "Abia", lat: 5.5289, lon: 7.4895, climate: "tropical" },
  { id: "imo", name: "Imo", lat: 5.4824, lon: 7.0347, climate: "tropical" },
  {
    id: "ebonyi",
    name: "Ebonyi",
    lat: 6.3189,
    lon: 8.1131,
    climate: "tropical",
  },
  // North-Central
  {
    id: "fct",
    name: "FCT (Abuja)",
    lat: 9.0644,
    lon: 7.4895,
    climate: "tropical",
  },
  { id: "kwara", name: "Kwara", lat: 8.4996, lon: 4.5499, climate: "tropical" },
  { id: "kogi", name: "Kogi", lat: 7.7936, lon: 6.7419, climate: "tropical" },
  { id: "benue", name: "Benue", lat: 7.7323, lon: 8.5411, climate: "tropical" },
  {
    id: "plateau",
    name: "Plateau",
    lat: 9.9261,
    lon: 8.8963,
    climate: "tropical",
  },
  {
    id: "nasarawa",
    name: "Nasarawa",
    lat: 8.4811,
    lon: 8.5135,
    climate: "tropical",
  },
  { id: "niger", name: "Niger", lat: 9.6139, lon: 6.5061, climate: "tropical" },
  {
    id: "taraba",
    name: "Taraba",
    lat: 8.8941,
    lon: 11.3517,
    climate: "tropical",
  },
  // North-West (arid / savanna)
  { id: "kaduna", name: "Kaduna", lat: 10.5222, lon: 7.4383, climate: "arid" },
  { id: "kebbi", name: "Kebbi", lat: 12.4539, lon: 4.5202, climate: "arid" },
  { id: "sokoto", name: "Sokoto", lat: 13.0059, lon: 5.2463, climate: "arid" },
  {
    id: "zamfara",
    name: "Zamfara",
    lat: 12.1618,
    lon: 6.6667,
    climate: "arid",
  },
  {
    id: "katsina",
    name: "Katsina",
    lat: 12.9939,
    lon: 7.6016,
    climate: "arid",
  },
  { id: "kano", name: "Kano", lat: 12.0022, lon: 8.592, climate: "arid" },
  { id: "jigawa", name: "Jigawa", lat: 11.761, lon: 9.0417, climate: "arid" },
  // North-East (arid / savanna)
  { id: "bauchi", name: "Bauchi", lat: 10.3129, lon: 9.8446, climate: "arid" },
  { id: "gombe", name: "Gombe", lat: 10.2885, lon: 11.3253, climate: "arid" },
  {
    id: "adamawa",
    name: "Adamawa",
    lat: 9.2843,
    lon: 12.4797,
    climate: "arid",
  },
  { id: "borno", name: "Borno", lat: 11.8331, lon: 13.1531, climate: "arid" },
  { id: "yobe", name: "Yobe", lat: 11.7518, lon: 11.7469, climate: "arid" },
];

/** Default location, Lagos (Nigeria-first default market). */
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = WEATHER_LOCATIONS[0];

export const WEATHER_LOCATION_STORAGE_KEY = "frelux_weather_location";
const LOCATION_CHANGE_EVENT = "frelux:weather-location-change";
const MARKET_STORAGE_KEY = "frelux_market";

/**
 * A representative working city per market, so a visitor outside Nigeria
 * opens the weather widget on their own country instead of Lagos. The
 * visitor can still pick any city in the world through the selector.
 */
export const MARKET_WEATHER_CITIES: Record<string, WeatherLocation> = {
  GH: {
    id: "gh-accra",
    name: "Accra",
    country: "Ghana",
    lat: 5.6037,
    lon: -0.187,
    climate: "coastal",
  },
  KE: {
    id: "ke-nairobi",
    name: "Nairobi",
    country: "Kenya",
    lat: -1.2921,
    lon: 36.8219,
    climate: "tropical",
  },
  ZA: {
    id: "za-johannesburg",
    name: "Johannesburg",
    country: "South Africa",
    lat: -26.2041,
    lon: 28.0473,
    climate: "temperate",
  },
  ET: {
    id: "et-addis-ababa",
    name: "Addis Ababa",
    country: "Ethiopia",
    lat: 9.03,
    lon: 38.74,
    climate: "tropical",
  },
  EG: {
    id: "eg-cairo",
    name: "Cairo",
    country: "Egypt",
    lat: 30.0444,
    lon: 31.2357,
    climate: "arid",
  },
  TZ: {
    id: "tz-dar-es-salaam",
    name: "Dar es Salaam",
    country: "Tanzania",
    lat: -6.7924,
    lon: 39.2083,
    climate: "coastal",
  },
  CI: {
    id: "ci-abidjan",
    name: "Abidjan",
    country: "Côte d'Ivoire",
    lat: 5.36,
    lon: -4.0083,
    climate: "coastal",
  },
  US: {
    id: "us-new-york",
    name: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.006,
    climate: "temperate",
  },
  CA: {
    id: "ca-toronto",
    name: "Toronto",
    country: "Canada",
    lat: 43.6532,
    lon: -79.3832,
    climate: "temperate",
  },
  BR: {
    id: "br-sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    lat: -23.5505,
    lon: -46.6333,
    climate: "temperate",
  },
  MX: {
    id: "mx-mexico-city",
    name: "Mexico City",
    country: "Mexico",
    lat: 19.4326,
    lon: -99.1332,
    climate: "tropical",
  },
  GB: {
    id: "gb-london",
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
    climate: "temperate",
  },
  DE: {
    id: "de-berlin",
    name: "Berlin",
    country: "Germany",
    lat: 52.52,
    lon: 13.405,
    climate: "temperate",
  },
  FR: {
    id: "fr-paris",
    name: "Paris",
    country: "France",
    lat: 48.8566,
    lon: 2.3522,
    climate: "temperate",
  },
  IT: {
    id: "it-rome",
    name: "Rome",
    country: "Italy",
    lat: 41.9028,
    lon: 12.4964,
    climate: "temperate",
  },
  ES: {
    id: "es-madrid",
    name: "Madrid",
    country: "Spain",
    lat: 40.4168,
    lon: -3.7038,
    climate: "temperate",
  },
  NL: {
    id: "nl-amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    lat: 52.3676,
    lon: 4.9041,
    climate: "temperate",
  },
  PL: {
    id: "pl-warsaw",
    name: "Warsaw",
    country: "Poland",
    lat: 52.2297,
    lon: 21.0122,
    climate: "temperate",
  },
  SE: {
    id: "se-stockholm",
    name: "Stockholm",
    country: "Sweden",
    lat: 59.3293,
    lon: 18.0686,
    climate: "temperate",
  },
  CH: {
    id: "ch-zurich",
    name: "Zurich",
    country: "Switzerland",
    lat: 47.3769,
    lon: 8.5417,
    climate: "temperate",
  },
  CN: {
    id: "cn-shanghai",
    name: "Shanghai",
    country: "China",
    lat: 31.2304,
    lon: 121.4737,
    climate: "temperate",
  },
  JP: {
    id: "jp-tokyo",
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    climate: "temperate",
  },
  ID: {
    id: "id-jakarta",
    name: "Jakarta",
    country: "Indonesia",
    lat: -6.2088,
    lon: 106.8456,
    climate: "coastal",
  },
  IN: {
    id: "in-mumbai",
    name: "Mumbai",
    country: "India",
    lat: 19.076,
    lon: 72.8777,
    climate: "tropical",
  },
  KR: {
    id: "kr-seoul",
    name: "Seoul",
    country: "South Korea",
    lat: 37.5665,
    lon: 126.978,
    climate: "temperate",
  },
  SG: {
    id: "sg-singapore",
    name: "Singapore",
    country: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    climate: "coastal",
  },
  AE: {
    id: "ae-dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    lat: 25.2048,
    lon: 55.2708,
    climate: "arid",
  },
  SA: {
    id: "sa-riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    lat: 24.7136,
    lon: 46.6753,
    climate: "arid",
  },
  TR: {
    id: "tr-istanbul",
    name: "Istanbul",
    country: "Türkiye",
    lat: 41.0082,
    lon: 28.9784,
    climate: "temperate",
  },
  AU: {
    id: "au-sydney",
    name: "Sydney",
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
    climate: "temperate",
  },
  NZ: {
    id: "nz-auckland",
    name: "Auckland",
    country: "New Zealand",
    lat: -36.8485,
    lon: 174.7633,
    climate: "temperate",
  },
};

/** Look up a location by id; falls back to the visitor's market default. */
export function getWeatherLocation(
  id: string | null | undefined,
): WeatherLocation {
  if (!id) return DEFAULT_WEATHER_LOCATION;
  const curated = WEATHER_LOCATIONS.find((l) => l.id === id);
  if (curated) return curated;
  const marketCity = Object.values(MARKET_WEATHER_CITIES).find(
    (l) => l.id === id,
  );
  return marketCity ?? DEFAULT_WEATHER_LOCATION;
}

/** The market the visitor is browsing in, when one is stored. */
export function currentMarketCode(): string | null {
  try {
    return localStorage.getItem(MARKET_STORAGE_KEY)?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/**
 * The location a visitor should see before choosing one: their market's
 * city, so a US visitor gets a US feed and a Nigerian visitor keeps Lagos.
 */
export function defaultWeatherLocationForMarket(
  marketCode: string | null | undefined,
): WeatherLocation {
  const code = (marketCode ?? "").toUpperCase();
  if (!code || code === "NG") return DEFAULT_WEATHER_LOCATION;
  return MARKET_WEATHER_CITIES[code] ?? DEFAULT_WEATHER_LOCATION;
}

function parseStoredLocation(raw: string | null): WeatherLocation | null {
  if (!raw) return null;
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Partial<WeatherLocation>;
      if (
        typeof parsed.name === "string" &&
        typeof parsed.lat === "number" &&
        typeof parsed.lon === "number"
      ) {
        return {
          id: parsed.id ?? `custom:${parsed.lat},${parsed.lon}`,
          name: parsed.name,
          lat: parsed.lat,
          lon: parsed.lon,
          climate: parsed.climate ?? climateForCoordinates(parsed.lat),
          country: parsed.country,
          custom: parsed.custom ?? true,
        };
      }
    } catch {
      /* fall through to the legacy id format */
    }
  }
  const legacy = getWeatherLocation(raw);
  return legacy === DEFAULT_WEATHER_LOCATION &&
    raw !== DEFAULT_WEATHER_LOCATION.id
    ? null
    : legacy;
}

/** Read the visitor's persisted location, defaulting to their market city. */
export function readStoredWeatherLocation(): WeatherLocation {
  try {
    const stored = parseStoredLocation(
      localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY),
    );
    if (stored) return stored;
  } catch {
    /* localStorage unavailable */
  }
  return defaultWeatherLocationForMarket(currentMarketCode());
}

/** Persist the selected location (a full city, or a curated id). */
export function writeStoredWeatherLocation(
  location: WeatherLocation | string,
): void {
  const resolved =
    typeof location === "string" ? getWeatherLocation(location) : location;
  try {
    localStorage.setItem(
      WEATHER_LOCATION_STORAGE_KEY,
      JSON.stringify(resolved),
    );
  } catch {
    // localStorage unavailable (private mode), keep in-memory only
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LOCATION_CHANGE_EVENT, { detail: resolved.id }),
    );
  } catch {
    // non-browser env
  }
}

/** Broad climate band from latitude, used for the offline estimate. */
export function climateForCoordinates(
  lat: number,
  countryCode?: string | null,
): WeatherClimate {
  const aridCountries = [
    "AE",
    "SA",
    "EG",
    "DZ",
    "LY",
    "IQ",
    "KW",
    "QA",
    "OM",
    "YE",
    "JO",
    "MA",
  ];
  if (countryCode && aridCountries.includes(countryCode.toUpperCase())) {
    return "arid";
  }
  return Math.abs(lat) < 23.5 ? "tropical" : "temperate";
}

/** Build a location from raw coordinates, snapped to a state when close. */
export function locationFromCoordinates(
  lat: number,
  lon: number,
  name?: string,
  country?: string,
): WeatherLocation {
  const nearest = findNearestWeatherLocation(lat, lon);
  if (distanceTo(lat, lon, nearest) < 60) return nearest;
  return {
    id: `custom:${lat.toFixed(4)},${lon.toFixed(4)}`,
    name: name?.trim() || "Current location",
    lat,
    lon,
    climate: climateForCoordinates(lat),
    country,
    custom: true,
  };
}

function distanceTo(lat: number, lon: number, loc: WeatherLocation): number {
  const R = 6371;
  const dLat = ((loc.lat - lat) * Math.PI) / 180;
  const dLon = ((loc.lon - lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((loc.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Worldwide city search. Open-Meteo's geocoder needs no key, which keeps
 * the weather feature independent of any paid provider.
 */
export async function searchWeatherCities(
  query: string,
  limit = 6,
): Promise<WeatherLocation[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const params = new URLSearchParams({
    name: term,
    count: String(limit),
    language: "en",
    format: "json",
  });
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const json = await res.json();
  const results: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
  }> = json.results ?? [];
  return results.map((r) => ({
    id: `geo:${r.latitude},${r.longitude}`,
    name: r.admin1 && r.admin1 !== r.name ? `${r.name}, ${r.admin1}` : r.name,
    lat: r.latitude,
    lon: r.longitude,
    climate: climateForCoordinates(r.latitude, r.country_code),
    country: r.country,
    custom: true,
  }));
}

/** Best-effort name for raw coordinates (device location). */
export async function describeCoordinates(
  lat: number,
  lon: number,
): Promise<{ name: string; country?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const name = json.city || json.locality || json.principalSubdivision || "";
    return { name: name || "Current location", country: json.countryName };
  } catch {
    return { name: "Current location" };
  }
}

/** Haversine distance in km between two coordinates. */
function distanceKm(
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

/** Find the closest configured location to raw coordinates. */
export function findNearestWeatherLocation(
  lat: number,
  lon: number,
): WeatherLocation {
  let best = DEFAULT_WEATHER_LOCATION;
  let bestDist = Infinity;
  for (const loc of WEATHER_LOCATIONS) {
    const d = distanceKm(lat, lon, loc.lat, loc.lon);
    if (d < bestDist) {
      best = loc;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Shared hook for the user-selected weather location.
 * All weather widgets use this so the choice stays in sync across pages.
 * Falls back to the default (Lagos) when nothing is stored.
 */
export function useWeatherLocation(): {
  location: WeatherLocation;
  setLocation: (location: WeatherLocation | string) => void;
} {
  const [location, setLocationState] = useState<WeatherLocation>(() =>
    readStoredWeatherLocation(),
  );

  useEffect(() => {
    const sync = () => setLocationState(readStoredWeatherLocation());
    window.addEventListener(LOCATION_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCATION_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setLocation = (next: WeatherLocation | string) => {
    writeStoredWeatherLocation(next);
    setLocationState(
      typeof next === "string" ? getWeatherLocation(next) : next,
    );
  };

  return { location, setLocation };
}
