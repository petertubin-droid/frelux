// ============================================================
// Site location capture tests — engine-1A GIS milestone 2.
// Pure preparation logic is fully covered; persistence is a
// thin upsert over the owner-scoped table.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  prepareSiteLocation,
  AREA_ACCURACY_NOTE,
} from "./site-location";
import { haversineDistanceMeters } from "./geodesy";
import { wgs84ToWebMercator } from "./crs";

const LAGOS_4326 = { a: 6.5244, b: 3.3792 };

describe("prepareSiteLocation", () => {
  it("passes WGS-84 pins through unchanged with EPSG:4326 provenance", () => {
    const r = prepareSiteLocation({ project_id: "p1", ...LAGOS_4326 });
    expect(r.lat).toBe(6.5244);
    expect(r.lon).toBe(3.3792);
    expect(r.source_crs).toBe("EPSG:4326");
    expect(r.polygon).toBeNull();
    expect(r.site_area_m2).toBeNull();
    expect(r.accuracy_note).toBe(AREA_ACCURACY_NOTE);
  });

  it("normalizes Web Mercator inputs to WGS-84 before storage", () => {
    // Lagos converted to EPSG:3857 with the audited transform, then
    // round-tripped through capture: must land back on the pin.
    const { x, y } = wgs84ToWebMercator(6.5244, 3.3792);
    const r = prepareSiteLocation({
      project_id: "p1",
      crs_code: "EPSG:3857",
      a: x,
      b: y,
    });
    expect(r.source_crs).toBe("EPSG:3857");
    expect(r.lat).toBeCloseTo(6.5244, 9);
    expect(r.lon).toBeCloseTo(3.3792, 9);
  });

  it("refuses unsupported CRS codes honestly", () => {
    expect(() =>
      prepareSiteLocation({ project_id: "p1", crs_code: "EPSG:2154", a: 700000, b: 6600000 }),
    ).toThrow(/Unsupported coordinate system "EPSG:2154"/);
  });

  it("refuses out-of-bounds pins", () => {
    expect(() => prepareSiteLocation({ project_id: "p1", a: 95, b: 0 })).toThrow(RangeError);
    expect(() =>
      prepareSiteLocation({ project_id: "p1", crs_code: "EPSG:3857", a: 1e9, b: 0 }),
    ).toThrow(RangeError);
  });

  it("computes polygon area from 4326 vertices and discloses accuracy", () => {
    const r = prepareSiteLocation({
      project_id: "p1",
      a: 0,
      b: 0,
      polygon: [
        { a: 0, b: 0 },
        { a: 0, b: 1 },
        { a: 1, b: 1 },
        { a: 1, b: 0 },
      ],
    });
    expect(r.polygon).toHaveLength(4);
    expect(r.site_area_m2).not.toBeNull();
    expect(Math.abs((r.site_area_m2 as number) - 1.2364e10) / 1.2364e10).toBeLessThan(0.005);
    expect(r.accuracy_note).toMatch(/NOT for cadastral/);
  });

  it("normalizes 3857 polygon vertices before computing area", () => {
    // Small square around the origin in Web Mercator (10km half-size)
    const r = prepareSiteLocation({
      project_id: "p1",
      crs_code: "EPSG:3857",
      a: 0,
      b: 0,
      polygon: [
        { a: -10_000, b: -10_000 },
        { a: 10_000, b: -10_000 },
        { a: 10_000, b: 10_000 },
        { a: -10_000, b: 10_000 },
      ],
    });
    // ~20km x 20km at the equator -> ~4e8 m2 within a few %
    expect((r.site_area_m2 as number)).toBeGreaterThan(3.6e8);
    expect((r.site_area_m2 as number)).toBeLessThan(4.4e8);
  });

  it("refuses degenerate boundaries (< 3 vertices)", () => {
    expect(() =>
      prepareSiteLocation({ project_id: "p1", a: 0, b: 0, polygon: [{ a: 0, b: 0 }, { a: 1, b: 1 }] }),
    ).toThrow(/at least 3 vertices/);
  });

  it("refuses polygons with invalid vertices instead of skipping them", () => {
    expect(() =>
      prepareSiteLocation({
        project_id: "p1",
        a: 0,
        b: 0,
        polygon: [
          { a: 0, b: 0 },
          { a: 0, b: 1 },
          { a: 999, b: 1 },
        ],
      }),
    ).toThrow(/Boundary vertex invalid/);
  });

  it("keeps the pin consistent with the polygon CRS the caller used", () => {
    const r = prepareSiteLocation({
      project_id: "p1",
      a: 6.5244,
      b: 3.3792,
      polygon: [
        { a: 6.5, b: 3.3 },
        { a: 6.5, b: 3.45 },
        { a: 6.55, b: 3.45 },
      ],
    });
    // Pin inside the polygon's neighbourhood: sanity via distance
    const d = haversineDistanceMeters(
      { lat: r.lat, lon: r.lon },
      r.polygon![0],
    );
    expect(d).toBeLessThan(50_000);
    expect(r.site_area_m2).toBeGreaterThan(0);
  });
});
