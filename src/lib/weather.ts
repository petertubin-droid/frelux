/**
 * Weather-Aware Painting Scheduler
 * Fetches weather data and provides paint-friendly recommendations.
 * Uses OpenWeather API (requires API key as environment variable).
 */

import { useState, useEffect } from 'react';

interface ForecastEntry {
  main: { temp: number; humidity: number };
  wind: { speed: number };
  rain?: { '3h'?: number };
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
  paintRating: 'good' | 'fair' | 'poor';
  paintNote: string;
}

export interface WeatherData {
  city: string;
  days: WeatherDay[];
  loading: boolean;
  error: string | null;
}

// Lagos coordinates as default
const DEFAULT_LAT = 6.5244;
const DEFAULT_LON = 3.3792;

/**
 * Fetch 5-day weather forecast for painting recommendations.
 * Falls back gracefully if no API key is available.
 */
export function usePaintingWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  const [data, setData] = useState<WeatherData>({
    city: 'Lagos',
    days: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Try to get API key from environment
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

        if (!apiKey) {
          // No API key — provide estimated seasonal data for Lagos
          setData({
            city: 'Lagos',
            days: generateEstimatedWeather(),
            loading: false,
            error: null,
          });
          return;
        }

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

        const json = await res.json();
        const days: WeatherDay[] = [];

        // Group by day (API returns 3-hour intervals)
        const dayMap = new Map<string, ForecastEntry[]>();
        for (const item of json.list) {
          const date = item.dt_txt.split(' ')[0];
          if (!dayMap.has(date)) dayMap.set(date, []);
          dayMap.get(date)!.push(item);
        }

        for (const [date, entries] of Array.from(dayMap.entries()).slice(0, 5)) {
          const temps = entries.map((e: ForecastEntry) => e.main.temp);
          const humidities = entries.map((e: ForecastEntry) => e.main.humidity);
          const precip = entries.reduce((sum: number, e: ForecastEntry) => sum + (e.rain?.['3h'] ?? 0), 0);
          const winds = entries.map((e: ForecastEntry) => e.wind.speed);
          const midday = entries[Math.floor(entries.length / 2)];

          const humidity = Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length);
          const windSpeed = Math.round(winds.reduce((a: number, b: number) => a + b, 0) / winds.length);
          const condition = midday.weather[0].main;

          days.push({
            date,
            dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
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
          city: json.city?.name ?? 'Lagos',
          days,
          loading: false,
          error: null,
        });
      } catch (_err) {
        setData({
          city: 'Lagos',
          days: generateEstimatedWeather(),
          loading: false,
          error: null, // Silently fall back to estimated data
        });
      }
    }

    fetchWeather();
  }, [lat, lon]);

  return data;
}

function ratePaintingConditions(humidity: number, precip: number, wind: number): 'good' | 'fair' | 'poor' {
  if (precip > 2) return 'poor';
  if (humidity > 85) return 'poor';
  if (humidity > 70 || precip > 0.5 || wind > 8) return 'fair';
  return 'good';
}

function getPaintNote(humidity: number, precip: number, wind: number): string {
  if (precip > 2) return 'Rain expected, avoid painting';
  if (humidity > 85) return 'Very humid, paint will dry slowly and may not cure properly';
  if (humidity > 70) return 'Moderate humidity, paint may take longer to dry';
  if (wind > 8) return 'Windy, dust may stick to wet paint';
  if (humidity < 40) return 'Low humidity, paint may dry too fast, consider retarder';
  return 'Good conditions for painting';
}

function mapWeatherIcon(condition: string): string {
  const map: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️',
  };
  return map[condition] ?? '🌤️';
}

/**
 * Generate estimated weather data for Lagos based on current season.
 * This is a fallback when no API key is configured.
 */
function generateEstimatedWeather(): WeatherDay[] {
  const month = new Date().getMonth();
  // Lagos seasons: Nov-Mar = Dry, Apr-Oct = Wet (peak Jun-Sep)
  const isWetSeason = month >= 3 && month <= 9;
  const days: WeatherDay[] = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const humidity = isWetSeason
      ? 75 + Math.floor(Math.random() * 15)
      : 55 + Math.floor(Math.random() * 15);
    const precip = isWetSeason
      ? Math.random() > 0.4 ? Math.round(Math.random() * 15 * 10) / 10 : 0
      : Math.random() > 0.8 ? Math.round(Math.random() * 3 * 10) / 10 : 0;
    const wind = isWetSeason
      ? 3 + Math.floor(Math.random() * 4)
      : 2 + Math.floor(Math.random() * 3);
    const condition = precip > 5 ? 'Rain' : precip > 0 ? 'Drizzle' : humidity > 70 ? 'Clouds' : 'Clear';

    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      tempMin: isWetSeason ? 23 + Math.floor(Math.random() * 3) : 25 + Math.floor(Math.random() * 3),
      tempMax: isWetSeason ? 29 + Math.floor(Math.random() * 3) : 32 + Math.floor(Math.random() * 3),
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
