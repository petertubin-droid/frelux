/**
 * Weather-Aware Painting Scheduler
 * Fetches weather data and provides paint-friendly recommendations.
 * Uses OpenWeather API (requires API key as environment variable).
 *
 * Location-aware: the widget's selected location (Nigerian state) drives
 * the forecast coordinates and the offline seasonal estimate. Defaults
 * to Lagos (Nigeria-first market) when the user hasn't picked a state.
 */

import { useState, useEffect } from "react";
import {
  DEFAULT_WEATHER_LOCATION,
  type WeatherLocation,
} from "./weather-locations";
import { resolveClientProviderKey } from "@/lib/integrations/provider-keys";

interface ForecastEntry {
  main: { temp: number; humidity: number };
  wind: { speed: number };
  rain?: { "3h"?: number };
  dt_txt: string;
  weather: { main: string; description: string; icon: string }[];
}

export interface WeatherDay {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  precipitation: number; // mm
  windSpeed: number; // m/s
  condition: string;
  icon: string;
  paintRating: "good" | "fair" | "poor";
  paintNote: string;
}

export interface WeatherData {
  city: string;
  days: WeatherDay[];
  loading: boolean;
  error: string | null;
  /** "estimated" means the seasonal fallback, not a live forecast. */
  source?: WeatherSource;
}

/**
 * Fetch 5-day weather forecast for painting recommendations.
 * Falls back gracefully if no API key is available.
 * @param location user-selected location (defaults to Lagos)
 */
export function usePaintingWeather(
  location: WeatherLocation = DEFAULT_WEATHER_LOCATION,
) {
  const [data, setData] = useState<WeatherData>({
    city: location.name,
    days: [],
    loading: true,
    error: null,
    source: undefined,
  });

  useEffect(() => {
    setData({
      city: location.name,
      days: [],
      loading: true,
      error: null,
      source: undefined,
    });

    async function fetchWeather() {
      try {
        const { days, city, source } = await fetchForecastDays(location);
        setData({ city, days, loading: false, error: null, source });
      } catch (_err) {
        // Every live source failed; the seasonal estimate is labelled so the
        // UI never presents it as a forecast.
        setData({
          city: location.name,
          days: generateEstimatedWeather(location),
          loading: false,
          error: null,
          source: "estimated",
        });
      }
    }

    fetchWeather();
    // Intentional primitive deps: refetch only when location
    // identity/coords change, not on object re-creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id, location.lat, location.lon, location.name]);

  return data;
}

export type WeatherSource = "live" | "estimated";

export interface ForecastDays {
  days: WeatherDay[];
  city: string;
  source: WeatherSource;
}

/** WMO weather codes (Open-Meteo) mapped to the condition names this app uses. */
export function conditionFromWmoCode(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Clouds";
  if (code <= 48) return "Mist";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Rain";
  if (code <= 82) return "Rain";
  if (code <= 86) return "Rain";
  return "Thunderstorm";
}

function dayName(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

async function fetchOpenWeatherDays(
  location: WeatherLocation,
  apiKey: string,
): Promise<{ days: WeatherDay[]; city: string }> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();

  const dayMap = new Map<string, ForecastEntry[]>();
  for (const item of json.list as ForecastEntry[]) {
    const date = item.dt_txt.split(" ")[0];
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(item);
  }

  const days: WeatherDay[] = [];
  for (const [date, entries] of Array.from(dayMap.entries()).slice(0, 5)) {
    const temps = entries.map((e) => e.main.temp);
    const humidities = entries.map((e) => e.main.humidity);
    const precip = entries.reduce((sum, e) => sum + (e.rain?.["3h"] ?? 0), 0);
    const winds = entries.map((e) => e.wind.speed);
    const midday = entries[Math.floor(entries.length / 2)];
    const humidity = Math.round(
      humidities.reduce((a, b) => a + b, 0) / humidities.length,
    );
    const windSpeed = Math.round(
      winds.reduce((a, b) => a + b, 0) / winds.length,
    );
    const condition = midday.weather[0].main;

    days.push({
      date,
      dayName: dayName(date),
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      humidity,
      precipitation: Math.round(precip * 10) / 10,
      windSpeed,
      condition,
      icon: mapWeatherIcon(condition),
      paintRating: ratePaintingConditions(humidity, precip, windSpeed),
      paintNote: getPaintNote(humidity, precip, windSpeed),
    });
  }
  return { days, city: json.city?.name ?? location.name };
}

/**
 * Open-Meteo needs no API key, so the forecast works without an
 * OpenWeather key being configured. Returns metres per second for wind,
 * matching the rest of the app.
 */
async function fetchOpenMeteoDays(
  location: WeatherLocation,
): Promise<WeatherDay[]> {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
    hourly: "relative_humidity_2m",
    timezone: "auto",
    wind_speed_unit: "ms",
    forecast_days: "5",
  });
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const hourlyTimes: string[] = json.hourly?.time ?? [];
  const hourlyHumidity: number[] = json.hourly?.relative_humidity_2m ?? [];
  const humidityByDate = new Map<string, number[]>();
  hourlyTimes.forEach((time, i) => {
    const date = time.slice(0, 10);
    const value = hourlyHumidity[i];
    if (typeof value !== "number") return;
    if (!humidityByDate.has(date)) humidityByDate.set(date, []);
    humidityByDate.get(date)!.push(value);
  });

  const daily = json.daily ?? {};
  const dates: string[] = daily.time ?? [];
  return dates.slice(0, 5).map((date, i) => {
    const readings = humidityByDate.get(date) ?? [];
    const humidity = readings.length
      ? Math.round(readings.reduce((a, b) => a + b, 0) / readings.length)
      : 70;
    const precip = Number(daily.precipitation_sum?.[i] ?? 0);
    const windSpeed = Math.round(Number(daily.wind_speed_10m_max?.[i] ?? 0));
    const condition = conditionFromWmoCode(
      Number(daily.weather_code?.[i] ?? 0),
    );

    return {
      date,
      dayName: dayName(date),
      tempMin: Number(daily.temperature_2m_min?.[i] ?? 0),
      tempMax: Number(daily.temperature_2m_max?.[i] ?? 0),
      humidity,
      precipitation: Math.round(precip * 10) / 10,
      windSpeed,
      condition,
      icon: mapWeatherIcon(condition),
      paintRating: ratePaintingConditions(humidity, precip, windSpeed),
      paintNote: getPaintNote(humidity, precip, windSpeed),
    } satisfies WeatherDay;
  });
}

/**
 * The single forecast entry point: OpenWeather when a key is configured,
 * otherwise the keyless Open-Meteo feed. Throws only when every live
 * source failed, so callers can decide whether to show an estimate.
 */
const FORECAST_TTL_MS = 30 * 60 * 1000;
const forecastCache = new Map<
  string,
  { at: number; value: Promise<ForecastDays> }
>();

export async function fetchForecastDays(
  location: WeatherLocation = DEFAULT_WEATHER_LOCATION,
): Promise<ForecastDays> {
  // A calculator page can mount the banner more than once; one request per
  // location per half hour keeps that to a single network round trip.
  const cacheKey = `${location.lat},${location.lon}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.at < FORECAST_TTL_MS) return cached.value;

  const value = requestForecastDays(location);
  forecastCache.set(cacheKey, { at: Date.now(), value });
  try {
    return await value;
  } catch (err) {
    forecastCache.delete(cacheKey);
    throw err;
  }
}

async function requestForecastDays(
  location: WeatherLocation,
): Promise<ForecastDays> {
  const apiKey =
    import.meta.env.VITE_OPENWEATHER_API_KEY ||
    (await resolveClientProviderKey("openweather"));

  if (apiKey) {
    try {
      const { days, city } = await fetchOpenWeatherDays(location, apiKey);
      if (days.length > 0) return { days, city, source: "live" };
    } catch {
      /* fall through to the keyless source */
    }
  }

  const days = await fetchOpenMeteoDays(location);
  if (days.length === 0) throw new Error("No forecast returned");
  return { days, city: location.name, source: "live" };
}

export function ratePaintingConditions(
  humidity: number,
  precip: number,
  wind: number,
): "good" | "fair" | "poor" {
  if (precip > 2) return "poor";
  if (humidity > 85) return "poor";
  if (humidity > 70 || precip > 0.5 || wind > 8) return "fair";
  return "good";
}

function getPaintNote(humidity: number, precip: number, wind: number): string {
  if (precip > 2) return "Rain expected, avoid painting";
  if (humidity > 85)
    return "Very humid, paint will dry slowly and may not cure properly";
  if (humidity > 70) return "Moderate humidity, paint may take longer to dry";
  if (wind > 8) return "Windy, dust may stick to wet paint";
  if (humidity < 40)
    return "Low humidity, paint may dry too fast, consider retarder";
  return "Good conditions for painting";
}

export function mapWeatherIcon(condition: string): string {
  const map: Record<string, string> = {
    Clear: "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Mist: "🌫️",
    Fog: "🌫️",
    Haze: "🌫️",
  };
  return map[condition] ?? "🌤️";
}

/**
 * Climate profile per zone, used by the offline seasonal estimator
 * when no weather API key is configured.
 * Wet-season months are 0-indexed (Jan = 0).
 */
interface ClimateProfile {
  wetMonths: number[];
  humidityWet: [number, number];
  humidityDry: [number, number];
  tempWet: [number, number];
  tempDry: [number, number];
}

const CLIMATE_PROFILES: Record<WeatherLocation["climate"], ClimateProfile> = {
  // Coastal south: humid, long wet season (Apr–Oct)
  coastal: {
    wetMonths: [3, 4, 5, 6, 7, 8, 9],
    humidityWet: [75, 90],
    humidityDry: [60, 75],
    tempWet: [24, 31],
    tempDry: [26, 33],
  },
  // Tropical middle belt / inland south: standard wet season (Apr–Oct)
  tropical: {
    wetMonths: [3, 4, 5, 6, 7, 8, 9],
    humidityWet: [70, 85],
    humidityDry: [50, 68],
    tempWet: [23, 32],
    tempDry: [25, 35],
  },
  // Temperate markets (Europe, North America, Oceania): mild, rain spread
  // across the year with cooler winters.
  temperate: {
    wetMonths: [0, 1, 2, 3, 9, 10, 11],
    humidityWet: [65, 85],
    humidityDry: [45, 70],
    tempWet: [6, 19],
    tempDry: [0, 15],
  },
  // Arid far north: short wet season (Jun–Sep), hot and dry otherwise
  arid: {
    wetMonths: [5, 6, 7, 8],
    humidityWet: [55, 72],
    humidityDry: [20, 40],
    tempWet: [24, 33],
    tempDry: [29, 41],
  },
};

/**
 * Generate estimated weather data for a location based on its climate
 * zone and the current season. This is a fallback when no API key is
 * configured, indicative only, not a live forecast.
 */
export function generateEstimatedWeather(
  location: WeatherLocation = DEFAULT_WEATHER_LOCATION,
): WeatherDay[] {
  const month = new Date().getMonth();
  const profile = CLIMATE_PROFILES[location.climate];
  const isWetSeason = profile.wetMonths.includes(month);
  const days: WeatherDay[] = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const [hMin, hMax] = isWetSeason
      ? profile.humidityWet
      : profile.humidityDry;
    const [tMin, tMax] = isWetSeason ? profile.tempWet : profile.tempDry;
    const humidity = hMin + Math.floor(Math.random() * (hMax - hMin + 1));
    const precip = isWetSeason
      ? Math.random() > (location.climate === "arid" ? 0.5 : 0.4)
        ? Math.round(
            Math.random() * (location.climate === "arid" ? 8 : 15) * 10,
          ) / 10
        : 0
      : Math.random() > 0.85
        ? Math.round(Math.random() * 3 * 10) / 10
        : 0;
    const wind = isWetSeason
      ? 3 + Math.floor(Math.random() * 4)
      : 2 + Math.floor(Math.random() * 3);
    const condition =
      precip > 5
        ? "Rain"
        : precip > 0
          ? "Drizzle"
          : humidity > (location.climate === "arid" ? 50 : 70)
            ? "Clouds"
            : "Clear";

    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      tempMin: tMin + Math.floor(Math.random() * 3),
      tempMax: tMax - Math.floor(Math.random() * 3),
      humidity,
      precipitation: precip,
      windSpeed: wind,
      condition,
      icon: mapWeatherIcon(condition),
      paintRating: ratePaintingConditions(humidity, precip, wind),
      paintNote: getPaintNote(humidity, precip, wind),
    });
  }

  return days;
}
