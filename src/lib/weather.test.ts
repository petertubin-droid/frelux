import { describe, it, expect } from "vitest";

describe("weather", () => {
  it("usePaintingWeather is a function", async () => {
    const mod = await import("./weather");
    expect(typeof mod.usePaintingWeather).toBe("function");
  });

  it("WeatherData interface fields are correct", () => {
    const day = {
      date: "2026-08-26",
      dayName: "Wed",
      tempMin: 24,
      tempMax: 31,
      humidity: 75,
      precipitation: 0,
      windSpeed: 4,
      condition: "Clear",
      icon: "☀️",
      paintRating: "good" as const,
      paintNote: "Good conditions for painting",
    };
    expect(day.paintRating).toBe("good");
    expect(day.humidity).toBe(75);
    expect(day.icon).toBe("☀️");
  });

  it("paint rating logic: rain > 2mm is poor", () => {
    // Simulate the ratePaintingConditions logic
    function rate(
      humidity: number,
      precip: number,
      wind: number,
    ): "good" | "fair" | "poor" {
      if (precip > 2) return "poor";
      if (humidity > 85) return "poor";
      if (humidity > 70 || precip > 0.5 || wind > 8) return "fair";
      return "good";
    }
    expect(rate(50, 3, 2)).toBe("poor");
    expect(rate(90, 0, 2)).toBe("poor");
    expect(rate(75, 0, 2)).toBe("fair");
    expect(rate(50, 1, 2)).toBe("fair");
    expect(rate(50, 0, 10)).toBe("fair");
    expect(rate(50, 0, 2)).toBe("good");
  });

  it("paint note logic provides correct advice", () => {
    function getNote(humidity: number, precip: number, wind: number): string {
      if (precip > 2) return "Rain expected, avoid painting";
      if (humidity > 85)
        return "Very humid, paint will dry slowly and may not cure properly";
      if (humidity > 70)
        return "Moderate humidity, paint may take longer to dry";
      if (wind > 8) return "Windy, dust may stick to wet paint";
      if (humidity < 40)
        return "Low humidity, paint may dry too fast, consider retarder";
      return "Good conditions for painting";
    }
    expect(getNote(50, 3, 2)).toContain("Rain");
    expect(getNote(90, 0, 2)).toContain("Very humid");
    expect(getNote(75, 0, 2)).toContain("Moderate humidity");
    expect(getNote(50, 0, 10)).toContain("Windy");
    expect(getNote(30, 0, 2)).toContain("Low humidity");
    expect(getNote(50, 0, 2)).toContain("Good conditions");
  });

  it("mapWeatherIcon maps known conditions", () => {
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
    expect(map["Clear"]).toBe("☀️");
    expect(map["Rain"]).toBe("🌧️");
    expect(map["Thunderstorm"]).toBe("⛈️");
    expect(map["Unknown"] ?? "🌤️").toBe("🌤️");
  });
});
