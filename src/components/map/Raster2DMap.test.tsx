import { describe, expect, it } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Raster2DMap } from "@/components/map/Raster2DMap";

const renderMap = (
  props: Partial<React.ComponentProps<typeof Raster2DMap>> = {},
) =>
  render(
    <MemoryRouter>
      <Raster2DMap
        points={[]}
        label="Test map"
        center={{ lat: 6.5244, lon: 3.3792 }}
        zoom={12}
        {...props}
      />
    </MemoryRouter>,
  );

const tileSources = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("img")).map((img) => img.src);

describe("Raster2DMap basemap", () => {
  it("opens on satellite imagery so the map always has colour", () => {
    const { container } = renderMap();
    const sources = tileSources(container);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some((src) => src.includes("World_Imagery"))).toBe(true);
  });

  it("switches between imagery and the street sheet", () => {
    const { container } = renderMap();
    const toggle = screen.getByRole("button", { name: /street map/i });
    fireEvent.click(toggle);

    const sources = tileSources(container);
    expect(sources.some((src) => src.includes("World_Imagery"))).toBe(false);
    expect(
      sources.some(
        (src) => src.includes("cartocdn") || src.includes("tile.openstreetmap"),
      ),
    ).toBe(true);

    // Attribution has to follow the provider on screen.
    expect(container.textContent).toMatch(/OpenStreetMap|Esri/);
  });
});

describe("Raster2DMap visitor indicator", () => {
  it("draws the visitor dot and its accuracy ring", () => {
    const { container } = renderMap({
      you: { lat: 6.5244, lon: 3.3792, accuracy: 40 },
    });
    expect(container.textContent).toContain("Your location");
    // The dot is a circle, not a record pin: no pin chrome is created for it.
    expect(container.querySelectorAll(".frelux-pin--you").length).toBe(0);
  });

  it("draws nothing when no position is known", () => {
    const { container } = renderMap();
    expect(container.textContent).not.toContain("Your location");
  });
});
