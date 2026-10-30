import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MapPoint } from "@/lib/map/geo";

// The globe canvas itself is covered by GlobeMap.test; here the layer data is
// replaced so the panel's own behaviour (counts, switching, empty states) is
// tested without a database.
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

describe("MapPanel", () => {
  beforeEach(() => {
    layerState.pros = { points: [], loading: false, error: null };
    layerState.jobs = { points: [], loading: false, error: null };
    layerState.materials = { points: [], loading: false, error: null };
  });

  it("reports honestly when a layer has no pins", async () => {
    const { MapPanel } = await import("@/components/map/MapPanel");
    render(
      <MemoryRouter>
        <MapPanel layers={["pros"]} title="Professionals near your site" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Professionals near your site")).toBeTruthy();
    expect(screen.getByText("0 plotted")).toBeTruthy();
    expect(
      screen.getAllByText(/no professional has published a location yet/i)
        .length,
    ).toBeGreaterThan(0);
  });

  it("lists the nearest records with distance from the viewer", async () => {
    layerState.pros = {
      points: [
        {
          id: "pro:1",
          lat: 6.62,
          lon: 3.36,
          title: "Ada Interiors",
          subtitle: "Tiling · Lagos",
          href: "/pro-connect/ada",
          kind: "pro",
        },
      ],
      loading: false,
      error: null,
    };
    const { MapPanel } = await import("@/components/map/MapPanel");
    render(
      <MemoryRouter>
        <MapPanel layers={["pros"]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ada Interiors")).toBeTruthy();
    expect(screen.getByText("1 plotted")).toBeTruthy();
    expect(screen.getByText(/km away|m away/)).toBeTruthy();
  });

  it("switches layers in place", async () => {
    layerState.jobs = {
      points: [
        {
          id: "job:1",
          lat: 9.07,
          lon: 7.4,
          title: "Repaint 3 bedroom flat",
          kind: "job",
        },
      ],
      loading: false,
      error: null,
    };
    const { MapPanel } = await import("@/components/map/MapPanel");
    render(
      <MemoryRouter>
        <MapPanel layers={["pros", "jobs"]} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open projects" }));
    expect(screen.getByText("Repaint 3 bedroom flat")).toBeTruthy();
    expect(screen.getByText("1 plotted")).toBeTruthy();
  });
});
