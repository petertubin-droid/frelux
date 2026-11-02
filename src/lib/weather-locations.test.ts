import { describe, it, expect, beforeEach } from "vitest";
import {
  WEATHER_LOCATIONS,
  DEFAULT_WEATHER_LOCATION,
  MARKET_WEATHER_CITIES,
  WEATHER_LOCATION_STORAGE_KEY,
  defaultWeatherLocationForMarket,
  getWeatherLocation,
  readStoredWeatherLocation,
  writeStoredWeatherLocation,
  findNearestWeatherLocation,
  locationFromCoordinates,
  searchWeatherCities,
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
    const stored = localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY) ?? "";
    expect(JSON.parse(stored).id).toBe("kano");
    expect(readStoredWeatherLocation().name).toBe("Kano");
  });

  it("still reads the older plain-id storage format", () => {
    localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, "kano");
    expect(readStoredWeatherLocation().name).toBe("Kano");
  });

  it("defaults to the visitor's market city, Lagos for Nigeria", () => {
    expect(defaultWeatherLocationForMarket("NG").name).toBe("Lagos");
    expect(defaultWeatherLocationForMarket("US").name).toBe("New York");
    expect(defaultWeatherLocationForMarket("GB").name).toBe("London");
    expect(defaultWeatherLocationForMarket(null).name).toBe("Lagos");
    localStorage.setItem("frelux_market", "US");
    expect(readStoredWeatherLocation().name).toBe("New York");
  });

  it("gives every approved market a weather city", () => {
    for (const code of Object.keys(MARKET_WEATHER_CITIES)) {
      const city = MARKET_WEATHER_CITIES[code];
      expect(city.lat).toBeGreaterThan(-90);
      expect(city.lon).toBeGreaterThan(-180);
      expect(city.country).toBeTruthy();
    }
  });

  it("turns foreign coordinates into a named custom location", () => {
    const paris = locationFromCoordinates(48.8566, 2.3522, "Paris", "France");
    expect(paris.custom).toBe(true);
    expect(paris.name).toBe("Paris");
    expect(paris.climate).toBe("temperate");
    // Coordinates inside Nigeria still snap to the curated state.
    expect(locationFromCoordinates(12.0, 8.5).id).toBe("kano");
  });

  it("maps worldwide city search results from the geocoder", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              name: "Austin",
              latitude: 30.2672,
              longitude: -97.7431,
              country: "United States",
              country_code: "US",
              admin1: "Texas",
            },
            {
              name: "Dubai",
              latitude: 25.2048,
              longitude: 55.2708,
              country: "United Arab Emirates",
              country_code: "AE",
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const results = await searchWeatherCities("austin");
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("Austin, Texas");
      expect(results[0].country).toBe("United States");
      expect(results[0].climate).toBe("temperate");
      expect(results[1].climate).toBe("arid");
      expect(await searchWeatherCities("a")).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
