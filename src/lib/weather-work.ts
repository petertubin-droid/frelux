/**
 * Generalized weather conditions for outdoor construction work.
 * Extends the painting-specific weather module with work-type-aware ratings
 * for screeding, tiling, tyrolene, finishing, and general outdoor work.
 */

import { useState, useEffect } from "react";
import type { WeatherDay } from "./weather";
import { generateEstimatedWeather } from "./weather";
import {
  DEFAULT_WEATHER_LOCATION,
  type WeatherLocation,
} from "./weather-locations";

export type WorkType =
  "painting" | "screeding" | "tiling" | "tyrolene" | "finishing" | "general";

export interface WorkWeatherData {
  today: WeatherDay | null;
  days: WeatherDay[];
  city: string;
  loading: boolean;
  canWorkToday: boolean;
  workRating: "good" | "fair" | "poor";
  workNote: string;
}

/**
 * Rating thresholds differ slightly per work type.
 * - Screeding needs dry conditions (rain ruins fresh screed)
 * - Tiling is more tolerant of humidity (adhesive still cures)
 * - Tyrolene needs low wind (dust sticks to wet surface)
 * - Finishing is similar to painting
 */
function rateWorkConditions(
  type: WorkType,
  humidity: number,
  precip: number,
  wind: number,
): "good" | "fair" | "poor" {
  // All outdoor work is poor in rain
  if (precip > 2) return "poor";

  switch (type) {
    case "screeding":
      // Screeding is very sensitive to rain — fresh screed washes away
      if (precip > 0.5) return "poor";
      if (humidity > 80) return "fair"; // slow drying
      if (wind > 8) return "fair";
      return "good";

    case "tiling":
      // Tiling is more tolerant — adhesive cures even in moderate humidity
      if (precip > 1) return "poor";
      if (humidity > 90 || wind > 10) return "poor";
      if (humidity > 75 || wind > 7) return "fair";
      return "good";

    case "tyrolene":
      // Tyrolene needs calm conditions — wind blows the textured spray
      if (precip > 1) return "poor";
      if (wind > 6) return "poor";
      if (humidity > 80 || precip > 0.3) return "fair";
      return "good";

    case "finishing":
    case "painting":
      // Paint/finish needs moderate humidity and no rain
      if (humidity > 85) return "poor";
      if (humidity > 70 || precip > 0.5 || wind > 8) return "fair";
      return "good";

    default:
      // General outdoor work
      if (precip > 1 || humidity > 85) return "poor";
      if (precip > 0.3 || humidity > 75 || wind > 8) return "fair";
      return "good";
  }
}

function getWorkNote(
  type: WorkType,
  humidity: number,
  precip: number,
  wind: number,
): string {
  const workName: Record<WorkType, string> = {
    painting: "painting",
    screeding: "screeding",
    tiling: "tiling",
    tyrolene: "applying tyrolene",
    finishing: "finishing work",
    general: "outdoor work",
  };

  if (precip > 2) return `Rain expected — not advisable for ${workName[type]}`;
  if (precip > 0.5 && type === "screeding")
    return `Light rain may affect fresh screed — wait for a dry day`;
  if (precip > 0.5) return `Light rain possible — risky for ${workName[type]}`;

  if (type === "tyrolene" && wind > 6)
    return `Windy — tyrolene spray will scatter, wait for calmer conditions`;

  if (humidity > 85 && (type === "painting" || type === "finishing"))
    return `Very humid — surfaces may not cure properly, delay ${workName[type]}`;
  if (humidity > 85)
    return `Very humid — slow drying expected for ${workName[type]}`;

  if (humidity > 70 && (type === "painting" || type === "finishing"))
    return `Moderate humidity — ${workName[type]} will take longer to dry`;

  if (wind > 8 && (type === "painting" || type === "finishing"))
    return `Windy — dust may stick to wet surfaces during ${workName[type]}`;

  if (humidity < 40 && (type === "painting" || type === "finishing"))
    return `Low humidity — surfaces may dry too fast, consider a retarder`;

  return `Good conditions for ${workName[type]}`;
}

/**
 * Hook that provides work-type-specific weather ratings.
 * Reuses the existing weather data fetch (painting weather) and re-rates
 * it for the specific work type.
 */
export function useWorkWeather(
  workType: WorkType,
  location: WeatherLocation = DEFAULT_WEATHER_LOCATION,
): WorkWeatherData {
  // We import lazily to avoid circular deps
  const [data, setData] = useState<WorkWeatherData>({
    today: null,
    days: [],
    city: location.name,
    loading: true,
    canWorkToday: false,
    workRating: "fair",
    workNote: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Yield one tick so consumers can observe the initial loading state
        // before estimated data resolves synchronously.
        await new Promise((resolve) => setTimeout(resolve, 0));
        // usePaintingWeather is a hook — we can't call it inside a callback.
        // Instead, replicate the fetch logic minimally.
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        let days: WeatherDay[] = [];
        let city = location.name;

        if (!apiKey) {
          // Fallback: estimated data — replicate the function's behavior
          // by importing the generator
          days = generateEstimatedWeather(location);
        } else {
          const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            city = json.city?.name ?? location.name;
            days = parseForecast(json);
          } else {
            days = generateEstimatedWeather(location);
          }
        }

        if (cancelled) return;

        // Re-rate days for this work type
        const ratedDays = days.map((d) => ({
          ...d,
          paintRating: rateWorkConditions(
            workType,
            d.humidity,
            d.precipitation,
            d.windSpeed,
          ),
          paintNote: getWorkNote(
            workType,
            d.humidity,
            d.precipitation,
            d.windSpeed,
          ),
        }));

        const today = ratedDays[0] ?? null;
        const rating = today?.paintRating ?? "fair";
        const note = today?.paintNote ?? "";

        setData({
          today,
          days: ratedDays,
          city,
          loading: false,
          canWorkToday: rating !== "poor",
          workRating: rating,
          workNote: note,
        });
      } catch {
        if (cancelled) return;
        const days = generateEstimatedWeather(location);
        const today = days[0];
        const rating = rateWorkConditions(
          workType,
          today.humidity,
          today.precipitation,
          today.windSpeed,
        );
        setData({
          today,
          days,
          city: location.name,
          loading: false,
          canWorkToday: rating !== "poor",
          workRating: rating,
          workNote: getWorkNote(
            workType,
            today.humidity,
            today.precipitation,
            today.windSpeed,
          ),
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workType, location.id, location.lat, location.lon, location.name]);

  return data;
}

// --- Helpers (mirrored from weather.ts to avoid circular dependency) ---
// (estimated-day generation now lives in weather.ts, location-aware)

function ratePaintingConditions(
  humidity: number,
  precip: number,
  wind: number,
): "good" | "fair" | "poor" {
  if (precip > 2) return "poor";
  if (humidity > 85) return "poor";
  if (humidity > 70 || precip > 0.5 || wind > 8) return "fair";
  return "good";
}

function mapWeatherIcon(condition: string): string {
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

interface ForecastEntry {
  main: { temp: number; humidity: number };
  wind: { speed: number };
  rain?: { "3h"?: number };
  dt_txt: string;
  weather: { main: string; description: string; icon: string }[];
}

function parseForecast(json: {
  list: ForecastEntry[];
  city?: { name?: string };
}): WeatherDay[] {
  const days: WeatherDay[] = [];
  const dayMap = new Map<string, ForecastEntry[]>();
  for (const item of json.list) {
    const date = item.dt_txt.split(" ")[0];
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(item);
  }

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
      dayName: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      humidity,
      precipitation: Math.round(precip * 10) / 10,
      windSpeed,
      condition,
      icon: mapWeatherIcon(condition),
      paintRating: ratePaintingConditions(humidity, precip, windSpeed),
      paintNote: "",
    });
  }
  return days;
}
