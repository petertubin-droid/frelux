// ============================================================
// Geodesy helper tests — engine-1A GIS milestone 1. Hand-verified
// spherical values; accuracy limits are disclosed in the module
// and asserted here.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  haversineDistanceMeters,
  sphericalPolygonAreaMeters,
} from "./geodesy";
import { MEAN_EARTH_RADIUS_M } from "./crs";

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    expect(
      haversineDistanceMeters({ lat: 6.5244, lon: 3.3792 }, { lat: 6.5244, lon: 3.3792 }),
    ).toBe(0);
  });

  it("matches the hand-verified 1-degree arc at the equator", () => {
    // R * PI/180 with the module's mean radius:
    const expected = MEAN_EARTH_RADIUS_M * (Math.PI / 180);
    const d = haversineDistanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(d).toBeCloseTo(expected, 3); // ~111,195 m
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it("computes a sane Lagos -> Abuja great-circle distance", () => {
    const d = haversineDistanceMeters(
      { lat: 6.5244, lon: 3.3792 },
      { lat: 9.0765, lon: 7.3986 },
    );
    expect(d).toBeGreaterThan(450_000);
    expect(d).toBeLessThan(550_000);
  });

  it("refuses invalid coordinates", () => {
    expect(() =>
      haversineDistanceMeters({ lat: 95, lon: 0 }, { lat: 0, lon: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      haversineDistanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 200 }),
    ).toThrow(RangeError);
  });
});

describe("sphericalPolygonAreaMeters", () => {
  it("refuses polygons with fewer than 3 vertices (area never invented)", () => {
    expect(() => sphericalPolygonAreaMeters([])).toThrow(/at least 3/);
    expect(() =>
      sphericalPolygonAreaMeters([{ lat: 0, lon: 0 }, { lat: 1, lon: 0 }]),
    ).toThrow(/at least 3/);
  });

  it("matches the hand-verified 1-degree equatorial square", () => {
    const area = sphericalPolygonAreaMeters([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 1, lon: 1 },
      { lat: 1, lon: 0 },
    ]);
    // 1deg square at the equator ~ (111.2km)^2 ~ 1.2364e10 m2
    // spherical formula sits within 0.5% of that.
    expect(Math.abs(area - 1.2364e10) / 1.2364e10).toBeLessThan(0.005);
  });

  it("scales a 10-degree square at the equator roughly 100x", () => {
    const one = sphericalPolygonAreaMeters([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 1, lon: 1 },
      { lat: 1, lon: 0 },
    ]);
    const ten = sphericalPolygonAreaMeters([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 10 },
      { lat: 10, lon: 10 },
      { lat: 10, lon: 0 },
    ]);
    const ratio = ten / one;
    expect(ratio).toBeGreaterThan(90);
    expect(ratio).toBeLessThan(110);
  });

  it("refuses antimeridian-crossing polygons honestly", () => {
    expect(() =>
      sphericalPolygonAreaMeters([
        { lat: 0, lon: 179 },
        { lat: 0, lon: -179 },
        { lat: 1, lon: -179 },
        { lat: 1, lon: 179 },
      ]),
    ).toThrow(/Antimeridian/);
  });

  it("refuses out-of-bounds vertices", () => {
    expect(() =>
      sphericalPolygonAreaMeters([
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
        { lat: 91, lon: 1 },
      ]),
    ).toThrow(RangeError);
  });
});
