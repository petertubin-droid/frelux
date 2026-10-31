import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MapPoint } from "@/lib/map/geo";

const layerState = {
  pros: {
    points: [] as MapPoint[],
    loading: false,
    error: null as string | null,
  },
  jobs: {
    points: [] as MapPoint[],
    loading: false,
    error: null as string | null,
  },
  materials: {
    points: [] as MapPoint[],
    loading: false,
    error: null as string | null,
  },
};

vi.mock("@/lib/map/use-map-layers", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/map/use-map-layers")
  >("@/lib/map/use-map-layers");
  return {
    ...actual,
    useMapLayerPoints: (layer: keyof typeof layerState) => layerState[layer],
  };
});

vi.mock("@/components/map/GlobeMap", () => ({
  GlobeMap: ({ points, label }: { points: MapPoint[]; label: string }) => (
    <div role="application" aria-label={label} data-count={points.length} />
  ),
}));

vi.mock("@/lib/location", () => ({
  useLocation: () => ({
    location: { latitude: 6.6, longitude: 3.35 },
    detect: vi.fn(),
    loading: false,
    error: null,
    permissionDenied: false,
  }),
}));

import MapWeatherBand from "@/components/home/MapWeatherBand";

const renderBand = () =>
  render(
    <MemoryRouter>
      <MapWeatherBand />
    </MemoryRouter>,
  );

describe("MapWeatherBand", () => {
  beforeEach(() => {
    layerState.pros = { points: [], loading: false, error: null };
    layerState.jobs = { points: [], loading: false, error: null };
    layerState.materials = { points: [], loading: false, error: null };
  });

  it("links both widgets to their full surfaces", async () => {
    renderBand();

    expect(
      (
        await screen.findByRole("link", { name: /Open the full map/i })
      ).getAttribute("href"),
    ).toBe("/map");
    expect(
      screen
        .getByRole("link", { name: /Open the full converter/i })
        .getAttribute("href"),
    ).toBe("/unit-converter");
    expect(screen.getByText(/Beyond the numbers/i)).toBeTruthy();
    expect(
      screen.getByRole("application", { name: /Live construction map/i }),
    ).toBeTruthy();
  });

  it("converts with the real engine, not a rounded display value", () => {
    renderBand();

    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "2" },
    });

    // Metres to feet opens the length tab: 2 m = 6.56168 ft exactly.
    const result = screen.getByText(/=\s*6\.56168\s*ft/i);
    expect(result).toBeTruthy();
  });

  it("swaps the unit pair", () => {
    renderBand();

    fireEvent.click(screen.getByRole("button", { name: /Swap units/i }));

    // 1 ft = 0.3048 m after the swap. The ratio sentence repeats it, so both
    // are allowed to match.
    expect(screen.getAllByText(/=\s*0\.3048\s*m/i).length).toBeGreaterThan(0);
  });

  it("switches dimension and offers that dimension's units", () => {
    renderBand();

    const group = screen.getByRole("group", { name: /Measurement type/i });
    fireEvent.click(within(group).getByRole("button", { name: /Area/i }));

    const from = screen.getByLabelText(/Convert from/i) as HTMLSelectElement;
    const options = Array.from(from.options).map((o) => o.value);
    expect(options).toContain("area-m2");
    expect(options).not.toContain("len-m");
  });

  it("asks for a number instead of inventing an answer", () => {
    renderBand();

    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "" },
    });
    expect(screen.getByText(/Enter a number to convert/i)).toBeTruthy();
  });

  it("says plainly when a layer has no pins", async () => {
    renderBand();
    const map = await screen.findByRole("application", {
      name: /Live construction map/i,
    });
    expect(map.getAttribute("data-count")).toBe("0");
    expect(screen.getByText(/No pins here yet|0 plotted/i)).toBeTruthy();
  });

  it("makes no claim the platform cannot back up", () => {
    const { container } = renderBand();
    const text = container.textContent ?? "";

    // Standing copy rules: no em dashes, no star-like decoration.
    expect(text).not.toContain("—");
    expect(text).not.toContain("⭐");
    expect(text).not.toContain("✦");
    // No invented coverage numbers.
    expect(text).not.toMatch(/\d+\s?(pros|professionals|listings)/i);
  });
});
