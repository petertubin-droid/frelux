import { describe, it, expect, beforeEach } from "vitest";
import {
  WEATHER_LOCATIONS,
  DEFAULT_WEATHER_LOCATION,
  WEATHER_LOCATION_STORAGE_KEY,
  getWeatherLocation,
  readStoredWeatherLocation,
  writeStoredWeatherLocation,
  findNearestWeatherLocation,
} from "./weather-locations";

describe("weather-locations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contains all 36 states + FCT", () => {
    expect(WEATHER_LOCATIONS.length).toBe(37);
    const names = WEATHER_LOCATIONS.map((l) => l.name);
    for (const expected of [
      "Lagos",
      "Kano",
      "Rivers",
      "FCT (Abuja)",
      "Borno",
      "Enugu",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("defaults to Lagos", () => {
    expect(DEFAULT_WEATHER_LOCATION.id).toBe("lagos");
    expect(readStoredWeatherLocation().id).toBe("lagos");
  });

  it("falls back to Lagos for unknown ids", () => {
    expect(getWeatherLocation("not-a-state").id).toBe("lagos");
    expect(getWeatherLocation(null).id).toBe("lagos");
  });

  it("round-trips a stored location", () => {
    writeStoredWeatherLocation("kano");
    expect(localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY)).toBe("kano");
    expect(readStoredWeatherLocation().name).toBe("Kano");
  });

  it("snaps raw coordinates to the nearest state", () => {
    // Somewhere in Kano
    expect(findNearestWeatherLocation(12.0, 8.5).id).toBe("kano");
    // Somewhere in Port Harcourt
    expect(findNearestWeatherLocation(4.85, 7.02).id).toBe("rivers");
    // Abuja metro
    expect(findNearestWeatherLocation(9.05, 7.48).id).toBe("fct");
    // Somewhere in Enugu
    expect(findNearestWeatherLocation(6.45, 7.51).id).toBe("enugu");
  });

  it("tags every location with a valid climate", () => {
    for (const loc of WEATHER_LOCATIONS) {
      expect(["coastal", "tropical", "arid"]).toContain(loc.climate);
    }
  });
});
