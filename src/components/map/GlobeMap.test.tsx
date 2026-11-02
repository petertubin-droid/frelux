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
          points={[{
            id: "test-pro",
            lat: 51.5074,
            lon: -0.1278,
            title: "London builder",
            kind: "pro",
          }]}
          center={{ lat: 51.5074, lon: -0.1278 }}
          label="Professionals map"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("application", { name: "Professionals map" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Professional: London builder" })).toBeTruthy();
    expect(screen.getByText("2D mode for browser compatibility")).toBeTruthy();
    expect(document.querySelector('img[src*="basemaps.cartocdn.com"]')).toBeTruthy();
    expect(screen.queryByText(/needs WebGL/i)).toBeNull();
  });
});
