import { describe, it, expect } from "vitest";
import { haversineKm, formatDistance, DISTANCE_FILTERS } from "@/lib/location";

describe("location — haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(0, 0, 0, 0)).toBe(0);
  });

  it("calculates distance between Lagos and Abuja (~535 km)", () => {
    const dist = haversineKm(6.5244, 3.3792, 9.0765, 7.3986);
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(600);
  });

  it("calculates short distances correctly", () => {
    const dist = haversineKm(6.5244, 3.3792, 6.5333, 3.3792);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });

  it("handles negative coordinates (southern hemisphere)", () => {
    const dist = haversineKm(-33.8688, 151.2093, -33.9, 151.2093);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(5);
  });

  it("returns symmetric results", () => {
    const d1 = haversineKm(10, 20, 30, 40);
    const d2 = haversineKm(30, 40, 10, 20);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe("location — formatDistance", () => {
  it("formats distances under 1km as meters", () => {
    expect(formatDistance(0.5)).toBe("500 m");
    expect(formatDistance(0.1)).toBe("100 m");
  });

  it("formats distances 1-10km with one decimal", () => {
    expect(formatDistance(5.5)).toBe("5.5 km");
    expect(formatDistance(2.3)).toBe("2.3 km");
  });

  it("formats distances 10km+ as rounded km", () => {
    expect(formatDistance(15)).toBe("15 km");
    expect(formatDistance(100)).toBe("100 km");
    expect(formatDistance(25.7)).toBe("26 km");
  });

  it("handles edge cases", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(1)).toBe("1.0 km");
    expect(formatDistance(10)).toBe("10 km");
  });
});

describe("location — DISTANCE_FILTERS", () => {
  it("provides 4 filter options", () => {
    expect(DISTANCE_FILTERS).toHaveLength(4);
    expect(DISTANCE_FILTERS[0].value).toBe(5);
    expect(DISTANCE_FILTERS[3].value).toBe(50);
  });

  it("has labels for each filter", () => {
    DISTANCE_FILTERS.forEach((f) => {
      expect(f.label).toContain("km");
      expect(typeof f.value).toBe("number");
    });
  });
});
