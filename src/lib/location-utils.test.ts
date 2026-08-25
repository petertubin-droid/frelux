import { describe, it, expect } from "vitest";
import { haversineKm, formatDistance, DISTANCE_FILTERS } from "./location";

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(6.5244, 3.3792, 6.5244, 3.3792)).toBeCloseTo(0, 5);
  });

  it("computes roughly the correct distance between Lagos and Abuja", () => {
    // Lagos ~6.5244,3.3792  Abuja ~9.0765,7.3986 -> ~around 480km
    const distance = haversineKm(6.5244, 3.3792, 9.0765, 7.3986);
    expect(distance).toBeGreaterThan(450);
    expect(distance).toBeLessThan(550);
  });

  it("is symmetric regardless of point order", () => {
    const a = haversineKm(6.5244, 3.3792, 9.0765, 7.3986);
    const b = haversineKm(9.0765, 7.3986, 6.5244, 3.3792);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("formatDistance", () => {
  it("formats sub-kilometer distances in meters", () => {
    expect(formatDistance(0.25)).toBe("250 m");
  });

  it("formats distances under 10km with one decimal", () => {
    expect(formatDistance(4.567)).toBe("4.6 km");
  });

  it("formats distances of 10km or more as a rounded whole number", () => {
    expect(formatDistance(23.4)).toBe("23 km");
  });
});

describe("DISTANCE_FILTERS", () => {
  it("is sorted ascending and has readable labels", () => {
    for (let i = 1; i < DISTANCE_FILTERS.length; i++) {
      expect(DISTANCE_FILTERS[i].value).toBeGreaterThan(
        DISTANCE_FILTERS[i - 1].value,
      );
    }
    for (const f of DISTANCE_FILTERS) {
      expect(f.label).toContain("km");
    }
  });
});
