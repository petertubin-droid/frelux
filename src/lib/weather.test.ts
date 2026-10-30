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
