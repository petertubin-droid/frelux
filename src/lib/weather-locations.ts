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
export type WeatherClimate = "coastal" | "tropical" | "arid";

export interface WeatherLocation {
  id: string;
  /** Display name (state name). */
  name: string;
  lat: number;
  lon: number;
  climate: WeatherClimate;
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

/** Default location — Lagos (Nigeria-first default market). */
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = WEATHER_LOCATIONS[0];

export const WEATHER_LOCATION_STORAGE_KEY = "frelux_weather_location";
const LOCATION_CHANGE_EVENT = "frelux:weather-location-change";

/** Look up a location by id; falls back to Lagos. */
export function getWeatherLocation(
  id: string | null | undefined,
): WeatherLocation {
  if (!id) return DEFAULT_WEATHER_LOCATION;
  return WEATHER_LOCATIONS.find((l) => l.id === id) ?? DEFAULT_WEATHER_LOCATION;
}

/** Read the user's persisted location (localStorage), defaulting to Lagos. */
export function readStoredWeatherLocation(): WeatherLocation {
  try {
    return getWeatherLocation(
      localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_WEATHER_LOCATION;
  }
}

/** Persist the selected location id. */
export function writeStoredWeatherLocation(id: string): void {
  try {
    localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private mode) — keep in-memory only
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LOCATION_CHANGE_EVENT, { detail: id }),
    );
  } catch {
    // non-browser env
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
  setLocation: (id: string) => void;
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

  const setLocation = (id: string) => {
    writeStoredWeatherLocation(id);
    setLocationState(getWeatherLocation(id));
  };

  return { location, setLocation };
}
