import { describe, it, expect } from "vitest";

// Weather module exports a hook (usePaintingWeather) which requires React rendering context
// We test the exported types and constants at minimum
import type { WeatherDay, WeatherData } from "./weather";
import { conditionFromWmoCode } from "./weather";

describe("weather", () => {
  it("WeatherDay type supports all expected fields", () => {
    const day: WeatherDay = {
      date: "2026-08-26",
      dayName: "Wednesday",
      tempMin: 22,
      tempMax: 32,
      humidity: 65,
      precipitation: 0,
      windSpeed: 3.5,
      condition: "Clear",
      icon: "01d",
      paintRating: "good",
      paintNote: "Great conditions for painting",
    };
    expect(day.date).toBe("2026-08-26");
    expect(day.paintRating).toBe("good");
  });

  it("WeatherData type supports loading state", () => {
    const data: WeatherData = {
      city: "Lagos",
      days: [],
      loading: true,
      error: null,
    };
    expect(data.loading).toBe(true);
    expect(data.city).toBe("Lagos");
  });

  it("maps WMO weather codes onto the app condition names", () => {
    expect(conditionFromWmoCode(0)).toBe("Clear");
    expect(conditionFromWmoCode(2)).toBe("Clouds");
    expect(conditionFromWmoCode(45)).toBe("Mist");
    expect(conditionFromWmoCode(53)).toBe("Drizzle");
    expect(conditionFromWmoCode(63)).toBe("Rain");
    expect(conditionFromWmoCode(95)).toBe("Thunderstorm");
  });
});

describe("fetchForecastDays", () => {
  const location = {
    id: "test-city",
    name: "Test City",
    lat: -33.87,
    lon: 151.21,
    state: "Test",
  } as never;

  const openMeteoPayload = {
    daily: {
      time: ["2026-11-01", "2026-11-02"],
      temperature_2m_max: [28.4, 24.1],
      temperature_2m_min: [19.2, 18.0],
      precipitation_sum: [0, 7.5],
      wind_speed_10m_max: [3.2, 5.8],
      weather_code: [0, 95],
    },
    hourly: {
      time: ["2026-11-01T00:00", "2026-11-01T12:00", "2026-11-02T00:00"],
      relative_humidity_2m: [60, 80, 90],
    },
  };

  it("parses the keyless Open-Meteo feed when no OpenWeather key exists", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(openMeteoPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    try {
      const { fetchForecastDays } = await import("./weather");
      const result = await fetchForecastDays(location);
      expect(result.source).toBe("live");
      expect(result.days).toHaveLength(2);
      expect(result.days[0].condition).toBe("Clear");
      expect(result.days[0].humidity).toBe(70);
      expect(result.days[1].condition).toBe("Thunderstorm");
      expect(result.days[1].precipitation).toBe(7.5);
      expect(result.days[1].windSpeed).toBe(6);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws when every live source fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("nope", { status: 503 })) as typeof fetch;
    try {
      const { fetchForecastDays } = await import("./weather");
      await expect(
        fetchForecastDays({
          ...(location as object),
          lat: -1,
          lon: -1,
        } as never),
      ).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
