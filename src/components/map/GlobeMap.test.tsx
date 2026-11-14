import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Simulate browsers where WebGL is unavailable. The component should still
// render a real, interactive map using ordinary raster tile images.
vi.mock("maplibre-gl", () => ({
  default: class {
    constructor() {
      throw new Error("WebGL context unavailable");
    }
  },
}));

describe("GlobeMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows raster tiles and real record pins when WebGL cannot start", async () => {
    const { GlobeMap } = await import("@/components/map/GlobeMap");
    render(
      <MemoryRouter>
        <GlobeMap
          points={[
            {
              id: "test-pro",
              lat: 51.5074,
              lon: -0.1278,
              title: "London builder",
              kind: "pro",
            },
          ]}
          center={{ lat: 51.5074, lon: -0.1278 }}
          label="Professionals map"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("application", { name: "Professionals map" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("button", {
        name: "Professional: London builder",
      }),
    ).toBeTruthy();
    // The notice names the actual reason, so a visitor knows whether to try
    // another browser or whether the map is simply in a safe mode.
    expect(
      screen.getByText(
        /2D mode( for browser compatibility|: this browser has no WebGL)/,
      ),
    ).toBeTruthy();
    // Tile imagery must come from a real basemap, never the unkeyed CARTO
    // watermark sheet that renders as a blank grey surface.
    const tiles = Array.from(document.querySelectorAll("img")).filter((img) =>
      /tile\.openstreetmap\.org|basemaps\.cartocdn\.com|World_Imagery/.test(
        img.getAttribute("src") ?? "",
      ),
    );
    expect(tiles.length).toBeGreaterThan(0);
    expect(screen.queryByText(/needs WebGL/i)).toBeNull();
  });
});

describe("enhanceMapLabelsAndZoom", () => {
  it("enables icon-optional and expands text size across place layers", async () => {
    const { enhanceMapLabelsAndZoom } = await import("@/components/map/GlobeMap");

    const layers = [
      { id: "label_city", type: "symbol", "source-layer": "place" },
      { id: "label_town", type: "symbol", "source-layer": "place" },
      { id: "label_village", type: "symbol", "source-layer": "place" },
      { id: "label_other", type: "symbol", "source-layer": "place" },
      { id: "highway-name-major", type: "symbol" },
      { id: "water", type: "fill" },
    ];

    const layoutProps: Record<string, Record<string, unknown>> = {};
    const zoomRanges: Record<string, [number, number]> = {};

    const mockMap = {
      getStyle: () => ({ layers }),
      setLayoutProperty: vi.fn((layerId: string, prop: string, val: unknown) => {
        if (!layoutProps[layerId]) layoutProps[layerId] = {};
        layoutProps[layerId][prop] = val;
      }),
      setLayerZoomRange: vi.fn((layerId: string, min: number, max: number) => {
        zoomRanges[layerId] = [min, max];
      }),
    };

    enhanceMapLabelsAndZoom(mockMap as any);

    // icon-optional must be true on all symbol layers so text does not disappear when icon-image is ""
    expect(layoutProps["label_city"]["icon-optional"]).toBe(true);
    expect(layoutProps["label_town"]["icon-optional"]).toBe(true);
    expect(layoutProps["label_village"]["icon-optional"]).toBe(true);
    expect(layoutProps["label_other"]["icon-optional"]).toBe(true);

    // text-optional and padding for place expansion
    expect(layoutProps["label_city"]["text-optional"]).toBe(true);
    expect(layoutProps["label_city"]["text-padding"]).toBe(2);

    // text-size interpolation should be set for zoom expansion
    expect(layoutProps["label_city"]["text-size"]).toBeDefined();
    expect(layoutProps["label_town"]["text-size"]).toBeDefined();
    expect(layoutProps["label_village"]["text-size"]).toBeDefined();
    expect(layoutProps["label_other"]["text-size"]).toBeDefined();

    // highway zoom ranges adjusted
    expect(zoomRanges["highway-name-major"]).toEqual([10.5, 24]);
  });
});
