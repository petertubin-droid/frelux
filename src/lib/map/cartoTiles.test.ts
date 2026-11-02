import { afterEach, describe, expect, it, vi } from "vitest";
import { cartoApiKey, cartoTileUrl } from "@/lib/map/cartoTiles";

const LIGHT = "https://a.basemaps.cartocdn.com/rastertiles/voyager/10/545/352@2x.png";

describe("CARTO basemap tiles", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves the same unkeyed URL when no key is configured", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "");
    expect(cartoApiKey()).toBe("");
    expect(cartoTileUrl("a", "light", 10, 545, 352)).toBe(LIGHT);
  });

  it("attributes keyed traffic to the account", () => {
    vi.stubEnv("VITE_CARTO_API_KEY", "carto-key-123");
    expect(cartoTileUrl("a", "light", 10, 545, 352)).toBe(`${LIGHT}?key=carto-key-123`);
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
    expect(cartoTileUrl("b", "dark", 1, 0, 0, "")).toContain("/dark_all/1/0/0@2x.png");
    expect(cartoTileUrl("b", "light", 1, 0, 0, "")).toContain("/rastertiles/voyager/1/0/0@2x.png");
  });
});
