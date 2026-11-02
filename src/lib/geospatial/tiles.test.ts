// ============================================================
// Tile math tests — engine-1A GIS milestone 3. Hand-verified
// against the documented OSM XYZ convention.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  latLonToTileFraction,
  osmTileUrl,
  computeMapLayout,
  tileFractionToPixel,
  WEB_MERCATOR_LAT_LIMIT,
  TILE_DISCLOSURE,
} from "./tiles";

describe("latLonToTileFraction", () => {
  it("maps (0,0) to the centre of the zoom-0 tile", () => {
    const f = latLonToTileFraction(0, 0, 0);
    expect(f.x).toBeCloseTo(0.5, 9);
    expect(f.y).toBeCloseTo(0.5, 9);
  });

  it("maps (0,0) to tile (1,1) fraction at zoom 1", () => {
    const f = latLonToTileFraction(0, 0, 1);
    expect(f.x).toBeCloseTo(1, 9);
    expect(f.y).toBeCloseTo(1, 9);
  });

  it("puts Lagos in the correct zoom-6 tile band (hand-check: x ~ 32.6)", () => {
    const f = latLonToTileFraction(6.5244, 3.3792, 6);
    // x = (3.3792+180)/360*64 = 32.60; y ~ 30.84 (hand-derived)
    expect(f.x).toBeCloseTo(32.6, 1);
    expect(f.y).toBeCloseTo(30.84, 1);
  });

  it("refuses latitudes beyond the Web Mercator tile limit", () => {
    expect(() => latLonToTileFraction(86, 0, 10)).toThrow(/beyond the Web Mercator tile limit/);
    expect(() => latLonToTileFraction(WEB_MERCATOR_LAT_LIMIT + 0.001, 0, 10)).toThrow(RangeError);
  });

  it("refuses non-integer or out-of-range zooms", () => {
    expect(() => latLonToTileFraction(0, 0, 3.5)).toThrow(/integer in \[0, 21\]/);
    expect(() => latLonToTileFraction(0, 0, 22)).toThrow(RangeError);
  });
});

describe("osmTileUrl", () => {
  it("builds the standard OSM XYZ URL", () => {
    expect(osmTileUrl(10, 521, 415)).toBe(
      "https://tile.openstreetmap.org/10/521/415.png",
    );
  });

  it("refuses tiles outside the zoom grid", () => {
    expect(() => osmTileUrl(1, 2, 0)).toThrow(/outside the tile grid/);
    expect(() => osmTileUrl(2, 1, 4)).toThrow(/outside the tile grid/);
  });
});

describe("tileFractionToPixel", () => {
  it("puts the view centre at the middle of the view", () => {
    const p = tileFractionToPixel({ x: 100.25, y: 50.75 }, { x: 100.25, y: 50.75 }, 512);
    expect(p).toEqual({ x: 256, y: 256 });
  });
});

describe("computeMapLayout", () => {
  it("centres the pin and lays out a 3x3 tile grid around it", () => {
    const layout = computeMapLayout({ lat: 6.5244, lon: 3.3792, zoom: 15 });
    expect(layout.tiles).toHaveLength(9);
    expect(layout.pin).toEqual({ x: 256, y: 256 });
    const xs = new Set(layout.tiles.map((t) => t.x));
    const ys = new Set(layout.tiles.map((t) => t.y));
    expect(xs.size).toBe(3);
    expect(ys.size).toBe(3);
  });

  it("positions polygon vertices in the same pixel space as the pin", () => {
    const layout = computeMapLayout({
      lat: 0,
      lon: 0,
      zoom: 12,
      polygon: [
        { lat: 0, lon: 0 },
        { lat: 0.001, lon: 0 },
        { lat: 0.001, lon: 0.001 },
      ],
    });
    expect(layout.polygonPath).not.toBeNull();
    // The (0,0) vertex IS the pin position.
    expect(layout.polygonPath![0]).toEqual(layout.pin);
    // 0.001deg ~ 111m: at z12 (~38m/px at equator) that is ~3px.
    expect(Math.abs(layout.polygonPath![1].x - layout.pin.x)).toBeLessThan(1);
    // North of the pin means SMALLER y (screen up).
    expect(layout.polygonPath![1].y).toBeLessThan(layout.pin.y);
  });

  it("carries the provider/license disclosure text for the UI", () => {
    expect(TILE_DISCLOSURE).toMatch(/OpenStreetMap contributors/);
    expect(TILE_DISCLOSURE).toMatch(/stores no imagery/);
  });
});
