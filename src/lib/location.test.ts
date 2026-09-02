import { describe, it, expect } from "vitest";
import { DISTANCE_FILTERS, haversineKm, formatDistance } from "@/lib/location";

describe("DISTANCE_FILTERS", () => {
  it("has at least 3 filter options", () => {
    expect(DISTANCE_FILTERS.length).toBeGreaterThanOrEqual(3);
  });
  it("every filter has value and label", () => {
    DISTANCE_FILTERS.forEach((f) => {
      expect(f.value).toBeGreaterThan(0);
      expect(f.label).toBeTruthy();
    });
  });
  it("includes 25km option", () => {
    expect(DISTANCE_FILTERS.some((f) => f.value === 25)).toBe(true);
  });
});

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(6.5, 3.4, 6.5, 3.4)).toBeCloseTo(0, 5);
  });
  it("calculates distance between Lagos and Abuja (~approx 500km)", () => {
    const lagos = { lat: 6.5, lng: 3.4 };
    const abuja = { lat: 9.1, lng: 7.5 };
    const dist = haversineKm(lagos.lat, lagos.lng, abuja.lat, abuja.lng);
    expect(dist).toBeGreaterThan(400);
    expect(dist).toBeLessThan(600);
  });
  it("is symmetric", () => {
    const d1 = haversineKm(6.5, 3.4, 9.1, 7.5);
    const d2 = haversineKm(9.1, 7.5, 6.5, 3.4);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe("formatDistance", () => {
  it("formats meters for < 1km", () => {
    expect(formatDistance(0.5)).toBe("500 m");
  });
  it("formats 1 decimal for < 10km", () => {
    expect(formatDistance(5.5)).toBe("5.5 km");
  });
  it("formats rounded for >= 10km", () => {
    expect(formatDistance(25)).toBe("25 km");
  });
  it("formats 0 as 0 m", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
  it("formats 9.9 as 9.9 km", () => {
    expect(formatDistance(9.9)).toBe("9.9 km");
  });
});
