import { afterEach, describe, expect, it, vi } from "vitest";
import {
  basemapAttribution,
  basemapRasterFallbackUrl,
  basemapRasterUrl,
  cartoApiKey,
  cartoConfigured,
  cartoTileUrl,
  esriSatelliteTileUrl,
} from "@/lib/map/cartoTiles";

const LIGHT =
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/10/545/352@2x.png";

describe("CARTO basemap tiles", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves the same unkeyed URL when no key is configured", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "");
    expect(cartoApiKey()).toBe("");
    expect(cartoTileUrl("a", "light", 10, 545, 352)).toBe(LIGHT);
  });

  it("attributes keyed traffic to the account", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "carto-key-123");
    expect(cartoTileUrl("a", "light", 10, 545, 352)).toBe(
      `${LIGHT}?key=carto-key-123`,
    );
  });

  it("ignores surrounding whitespace in the configured key", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "  carto-key-123\n");
    expect(cartoApiKey()).toBe("carto-key-123");
  });

  it("encodes a key that carries url characters", () => {
    expect(cartoTileUrl("c", "dark", 3, 4, 2, "a b&c")).toBe(
      "https://c.basemaps.cartocdn.com/dark_all/3/4/2@2x.png?key=a%20b%26c",
    );
  });

  it("keeps the dark and light layers apart", () => {
    expect(cartoTileUrl("b", "dark", 1, 0, 0, "")).toContain(
      "/dark_all/1/0/0@2x.png",
    );
    expect(cartoTileUrl("b", "light", 1, 0, 0, "")).toContain(
      "/rastertiles/voyager/1/0/0@2x.png",
    );
  });
});

describe("colour basemap fallback", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports whether a CARTO key is configured", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "");
    expect(cartoConfigured()).toBe(false);
    vi.stubEnv("VITE_CARTO_API_KEY", "carto-key-123");
    expect(cartoConfigured()).toBe(true);
  });

  it("uses CARTO tiles when a key is present", () => {
    expect(basemapRasterUrl("a", false, 10, 545, 352, "carto-key-123")).toBe(
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/10/545/352@2x.png?key=carto-key-123",
    );
  });

  it("falls back to satellite imagery without a key", () => {
    // Unkeyed CARTO answers 200 with an "API KEY REQUIRED" watermark, which
    // renders as a flat grey sheet, so the unkeyed path must not use it.
    const url = basemapRasterUrl("b", false, 10, 511, 340, "");
    expect(url).toContain("World_Imagery/MapServer/tile/10/340/511");
    expect(url).not.toContain("cartocdn");
    expect(url).not.toContain("openstreetmap");
  });

  it("keeps the satellite row before column", () => {
    // Esri takes /tile/{z}/{y}/{x}; swapping the last two silently returns the
    // wrong part of the world, so the order is pinned here.
    const url = esriSatelliteTileUrl(10, 511, 340);
    expect(url.endsWith("/tile/10/340/511")).toBe(true);
    expect(url.endsWith("/tile/10/511/340")).toBe(false);
  });

  it("retries a failed tile against a different provider", () => {
    expect(basemapRasterFallbackUrl(10, 511, 340, "")).toBe(
      "https://a.tile.openstreetmap.org/10/511/340.png",
    );
    expect(basemapRasterFallbackUrl(10, 511, 340, "carto-key-123")).toContain(
      "World_Imagery",
    );
  });

  it("credits only the providers actually serving tiles", () => {
    expect(basemapAttribution("")).toContain("Esri");
    expect(basemapAttribution("carto-key-123")).toContain("CARTO");
  });
});
