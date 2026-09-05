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
  });

  useEffect(() => {
    setData({ city: location.name, days: [], loading: true, error: null });

    async function fetchWeather() {
      try {
        // Try to get API key from environment
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

        if (!apiKey) {
          // No API key — provide estimated seasonal data for the location
          setData({
            city: location.name,
            days: generateEstimatedWeather(location),
            loading: false,
            error: null,
          });
          return;
        }

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

        const json = await res.json();
        const days: WeatherDay[] = [];

        // Group by day (API returns 3-hour intervals)
        const dayMap = new Map<string, ForecastEntry[]>();
        for (const item of json.list) {
          const date = item.dt_txt.split(" ")[0];
          if (!dayMap.has(date)) dayMap.set(date, []);
          dayMap.get(date)!.push(item);
        }

        for (const [date, entries] of Array.from(dayMap.entries()).slice(
          0,
          5,
        )) {
          const temps = entries.map((e: ForecastEntry) => e.main.temp);
          const humidities = entries.map((e: ForecastEntry) => e.main.humidity);
          const precip = entries.reduce(
            (sum: number, e: ForecastEntry) => sum + (e.rain?.["3h"] ?? 0),
            0,
          );
          const winds = entries.map((e: ForecastEntry) => e.wind.speed);
          const midday = entries[Math.floor(entries.length / 2)];

          const humidity = Math.round(
            humidities.reduce((a: number, b: number) => a + b, 0) /
              humidities.length,
          );
          const windSpeed = Math.round(
            winds.reduce((a: number, b: number) => a + b, 0) / winds.length,
          );
          const condition = midday.weather[0].main;

          days.push({
            date,
            dayName: new Date(date).toLocaleDateString("en-US", {
              weekday: "short",
            }),
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

        setData({
          city: json.city?.name ?? location.name,
          days,
          loading: false,
          error: null,
        });
      } catch (_err) {
        setData({
          city: location.name,
          days: generateEstimatedWeather(location),
          loading: false,
          error: null, // Silently fall back to estimated data
        });
      }
    }

    fetchWeather();
  }, [location.id, location.lat, location.lon, location.name]);

  return data;
}

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

/**
 * Climate profile per zone — used by the offline seasonal estimator
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
 * configured — indicative only, not a live forecast.
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
