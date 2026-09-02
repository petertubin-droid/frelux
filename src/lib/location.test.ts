import { describe, it, expect } from "vitest";
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
