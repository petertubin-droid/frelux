// ============================================================
// CRS foundation tests — engine-1A GIS milestone 1. Hand-verified
// expectations; all refusals are explicit.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  getCrs,
  validateCoordinate,
  wgs84ToWebMercator,
  webMercatorToWgs84,
  WEB_MERCATOR_MAX,
  supportedCrsCodes,
} from "./crs";

describe("CRS registry", () => {
  it("knows exactly the supported CRSs", () => {
    expect(supportedCrsCodes()).toEqual(["EPSG:4326", "EPSG:3857"]);
    expect(getCrs("EPSG:4326")?.unit).toBe("degree");
    expect(getCrs("EPSG:3857")?.unit).toBe("metre");
  });

  it("refuses unknown CRS codes honestly", () => {
    const v = validateCoordinate("EPSG:2154", 700000, 6600000);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/Unsupported coordinate system/);
    expect(v.errors[0]).toMatch(/EPSG:4326, EPSG:3857/);
    expect(getCrs("EPSG:2154")).toBeNull();
  });
});

describe("validateCoordinate", () => {
  it("accepts in-bounds coordinates for both CRSs", () => {
    expect(validateCoordinate("EPSG:4326", 6.5244, 3.3792).ok).toBe(true);
    expect(
      validateCoordinate("EPSG:3857", 376_000, 726_000).ok,
    ).toBe(true);
  });

  it("rejects out-of-bounds latitudes and longitudes", () => {
    const v = validateCoordinate("EPSG:4326", 91, 0);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/outside EPSG:4326 bounds/);
    const w = validateCoordinate("EPSG:4326", 0, -180.5);
    expect(w.ok).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(validateCoordinate("EPSG:4326", NaN, 0).ok).toBe(false);
    expect(validateCoordinate("EPSG:3857", Infinity, 0).ok).toBe(false);
  });

  it("rejects Web Mercator beyond the world extent", () => {
    expect(
      validateCoordinate("EPSG:3857", WEB_MERCATOR_MAX + 1, 0).ok,
    ).toBe(false);
  });
});

describe("WGS-84 <-> Web Mercator transforms", () => {
  it("maps the origin to the origin", () => {
    const origin = wgs84ToWebMercator(0, 0);
    expect(origin.x).toBe(0);
    // log(tan(pi/4)) carries ~1e-16 float noise; anything under a
    // nanometre counts as the origin.
    expect(Math.abs(origin.y)).toBeLessThan(1e-9);
    expect(webMercatorToWgs84(0, 0)).toEqual({ lat: 0, lon: 0 });
  });

  it("round-trips within 1e-9 degrees across the world", () => {
    const cases: [number, number][] = [
      [6.5244, 3.3792], // Lagos
      [35.6762, 139.6503], // Tokyo
      [-33.8688, 151.2093], // Sydney
      [64.1466, -21.9426], // Reykjavik
      [-54.8019, -68.303], // Ushuaia
      [0, 179.5],
    ];
    for (const [lat, lon] of cases) {
      const { x, y } = wgs84ToWebMercator(lat, lon);
      const back = webMercatorToWgs84(x, y);
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
      expect(Math.abs(back.lon - lon)).toBeLessThan(1e-9);
    }
  });

  it("matches the hand-verified Web Mercator value for the equator at lon 45", () => {
    // x = R * lon_rad with R = 6378137 -> 45deg = PI/4:
    const { x, y } = wgs84ToWebMercator(0, 45);
    expect(x).toBeCloseTo(6378137 * Math.PI * 0.25, 3);
    expect(Math.abs(y)).toBeLessThan(1e-9);
  });

  it("refuses out-of-bounds inputs instead of converting them", () => {
    expect(() => wgs84ToWebMercator(95, 0)).toThrow(RangeError);
    expect(() => webMercatorToWgs84(NaN, 0)).toThrow(RangeError);
  });
});
