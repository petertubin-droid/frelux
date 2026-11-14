import { renderHook, act } from "@testing-library/react";
import { useLocation } from "@/lib/location";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DISTANCE_FILTERS, haversineKm, formatDistance } from "@/lib/location";

describe("DISTANCE_FILTERS", () => {
  it("has 4 filter options", () => {
    expect(DISTANCE_FILTERS).toHaveLength(4);
  });
  it("includes 5, 10, 25, 50 km", () => {
    const values = DISTANCE_FILTERS.map((f) => f.value);
    expect(values).toEqual([5, 10, 25, 50]);
  });
  it("has labels for each", () => {
    DISTANCE_FILTERS.forEach((f) => {
      expect(f.label).toContain("km");
    });
  });
});

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(6.5, 3.4, 6.5, 3.4)).toBeCloseTo(0, 5);
  });

  it("calculates Lagos to Abuja distance approximately", () => {
    // Lagos: 6.5°N, 3.4°E  Abuja: 9.1°N, 7.5°E
    const dist = haversineKm(6.5, 3.4, 9.1, 7.5);
    // Real distance is ~510 km
    expect(dist).toBeGreaterThan(480);
    expect(dist).toBeLessThan(540);
  });

  it("is symmetric", () => {
    const a = haversineKm(6.5, 3.4, 9.1, 7.5);
    const b = haversineKm(9.1, 7.5, 6.5, 3.4);
    expect(a).toBeCloseTo(b, 5);
  });

  it("calculates short distance correctly", () => {
    // 0.01° lat difference ≈ 1.1 km
    const dist = haversineKm(6.5, 3.4, 6.51, 3.4);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(1.3);
  });
});

describe("formatDistance", () => {
  it("formats sub-1km as meters", () => {
    expect(formatDistance(0.5)).toBe("500 m");
  });
  it("formats sub-10km with one decimal", () => {
    expect(formatDistance(5.3)).toBe("5.3 km");
  });
  it("formats 10+km as rounded", () => {
    expect(formatDistance(25.7)).toBe("26 km");
  });
  it("formats exactly 1km as meters", () => {
    expect(formatDistance(0.999)).toBe("999 m");
  });
  it("formats exactly 10km as rounded", () => {
    expect(formatDistance(10.0)).toBe("10 km");
  });
  it("formats 0 as meters", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
});


describe("useLocation hook fast detection and caching", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("loads cached location immediately from localStorage fallback", () => {
    localStorage.setItem(
      "frelux_user_location_cache",
      JSON.stringify({
        latitude: 6.5244,
        longitude: 3.3792,
        source: "gps",
        city: "Lagos",
      }),
    );

    const { result } = renderHook(() => useLocation());
    expect(result.current.location).toEqual({
      latitude: 6.5244,
      longitude: 3.3792,
      source: "gps",
      city: "Lagos",
    });
  });

  it("detects coordinates immediately on geolocation callback without waiting for reverse geocode", async () => {
    let geoCallback: ((pos: GeolocationPosition) => void) | null = null;
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        geoCallback = success;
      }),
    };

    Object.defineProperty(global.navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.detect();
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      geoCallback?.({
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.location?.latitude).toBe(51.5074);
    expect(result.current.location?.longitude).toBe(-0.1278);
    expect(result.current.location?.source).toBe("gps");
  });
});
