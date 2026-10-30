import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const envMock = vi.hoisted(() => ({
  fetchEnvironmentalData: vi.fn(),
  clearEnvironmentalCache: vi.fn(),
}));

const geoMock = vi.hoisted(() => ({
  current: {
    location: null as null | {
      latitude: number;
      longitude: number;
      label?: string;
      city?: string;
      state?: string;
      source: "gps" | "manual";
    },
    loading: false,
    error: null as string | null,
    permissionDenied: false,
    detect: vi.fn(),
    setManual: vi.fn(),
    clear: vi.fn(),
  },
}));

const placesMock = vi.hoisted(() => ({ searchPlaces: vi.fn() }));

vi.mock("@/lib/climate/environmental-data", () => envMock);
vi.mock("@/lib/location", () => ({ useLocation: () => geoMock.current }));
vi.mock("@/lib/map/geocode", () => placesMock);

vi.mock("@/components/map/GlobeMap", () => ({
  GlobeMap: ({
    onPickCoordinate,
    points,
  }: {
    onPickCoordinate?: (coords: { lat: number; lon: number }) => void;
    points: unknown[];
  }) => (
    <div data-testid="globe-map">
      <span data-testid="map-point-count">{points.length}</span>
      <button
        type="button"
        onClick={() => onPickCoordinate?.({ lat: 10.5, lon: 7.5 })}
      >
        pick-map-coordinate
      </button>
    </div>
  ),
}));

import MaterialAdvisor from "./MaterialAdvisor";
import type { EnvironmentalDataResult } from "@/lib/climate/types";

function okResult(): EnvironmentalDataResult {
  return {
    status: "ok",
    missing: ["flood_map"],
    sources: [
      {
        name: "NASA POWER climate normals (MERRA-2)",
        url: "https://power.larc.nasa.gov/",
        fetchedAt: "2026-10-30T00:00:00.000Z",
        period: "20010101–20201231",
      },
    ],
    factors: {
      location: { lat: 6.455, lon: 3.395, label: "Lekki, Lagos" },
      annualRainfallMm: 1544,
      tempMeanC: 26.4,
      tempMinC: 15.2,
      tempMaxC: 32.4,
      relativeHumidityPct: 86,
      uvIndex: 1.64,
      frostDaysPerYear: 0,
      windMs: 2.3,
      frostRisk: "none",
      snowExposure: "not_indicated",
      heatStress: false,
      strongUv: true,
      highRainfall: true,
      highHumidity: true,
      coastal: {
        distanceKm: 9,
        band: "coastal",
        approximate: true,
        reference: "Natural Earth 1:50m coastline",
      },
      floodProxy: "low_lying",
      elevationM: 8,
      corrosionIndicative: "high",
      missing: ["flood_map"],
      sources: [],
    },
  };
}

function unavailableResult(): EnvironmentalDataResult {
  return {
    status: "unavailable",
    reason:
      "Climate normals could not be retrieved for this location right now.",
    missing: ["power:T2M"],
    sources: [],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MaterialAdvisor />
    </MemoryRouter>,
  );
}

describe("MaterialAdvisor page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geoMock.current = {
      location: null,
      loading: false,
      error: null,
      permissionDenied: false,
      detect: vi.fn(),
      setManual: vi.fn(),
      clear: vi.fn(),
    };
    envMock.fetchEnvironmentalData.mockResolvedValue(okResult());
    placesMock.searchPlaces.mockResolvedValue([
      {
        id: "p1",
        name: "Lekki",
        label: "Lekki, Lagos, Nigeria",
        lat: 6.45,
        lon: 3.47,
      },
    ]);
  });

  it("shows the safety disclosures before any location is chosen", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        name: /climate-responsive material advisor/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a structural engineering assessment/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no product certification/i)).toBeInTheDocument();
    expect(screen.getByTestId("map-point-count")).toHaveTextContent("0");
  });

  it("resolves a searched address into climate-matched advice", async () => {
    renderPage();
    const input = screen.getByLabelText(/search address or place/i);
    fireEvent.change(input, { target: { value: "Lekki" } });

    const option = await screen.findByText("Lekki", {}, { timeout: 2000 });
    fireEvent.click(option);

    await waitFor(() => {
      expect(envMock.fetchEnvironmentalData).toHaveBeenCalledWith(
        { lat: 6.45, lon: 3.47 },
        expect.objectContaining({ label: expect.stringContaining("Lekki") }),
      );
    });

    expect(await screen.findByText("26.4 °C")).toBeInTheDocument();
    expect(await screen.findByText(/1,544 mm\/yr/)).toBeInTheDocument();
    expect(screen.getAllByText("Climate-matched").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /exterior wall paint system/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("map-point-count")).toHaveTextContent("1");
  });

  it("accepts a coordinate picked on the map", async () => {
    renderPage();
    fireEvent.click(screen.getByText("pick-map-coordinate"));

    await waitFor(() => {
      expect(envMock.fetchEnvironmentalData).toHaveBeenCalledWith(
        { lat: 10.5, lon: 7.5 },
        expect.anything(),
      );
    });
    expect(screen.getByTestId("map-point-count")).toHaveTextContent("1");
  });

  it("validates manually entered coordinates before fetching", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^latitude$/i), {
      target: { value: "999" },
    });
    fireEvent.change(screen.getByLabelText(/^longitude$/i), {
      target: { value: "3.4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set point/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /valid latitude/i,
    );
    expect(envMock.fetchEnvironmentalData).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^latitude$/i), {
      target: { value: "6.455" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set point/i }));

    await waitFor(() => {
      expect(envMock.fetchEnvironmentalData).toHaveBeenCalledWith(
        { lat: 6.455, lon: 3.4 },
        expect.anything(),
      );
    });
  });

  it("adopts a granted geolocation permission", async () => {
    geoMock.current.location = {
      latitude: 4.8156,
      longitude: 7.0498,
      label: "Port Harcourt, Rivers",
      source: "gps",
    };
    renderPage();

    await waitFor(() => {
      expect(envMock.fetchEnvironmentalData).toHaveBeenCalledWith(
        { lat: 4.8156, lon: 7.0498 },
        expect.anything(),
      );
    });
  });

  it("surfaces a denied permission instead of silently failing", () => {
    geoMock.current.error =
      "Location permission was denied. Please select your location manually.";
    renderPage();
    expect(
      screen.getByText(/location permission was denied/i),
    ).toBeInTheDocument();
  });

  it("degrades to labelled general guidance when data is unavailable", async () => {
    envMock.fetchEnvironmentalData.mockResolvedValue(unavailableResult());
    renderPage();
    fireEvent.click(screen.getByText("pick-map-coordinate"));

    expect(
      await screen.findByText(/environmental data unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/climate normals could not be retrieved/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("General guidance").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Climate-matched")).not.toBeInTheDocument();
    // No fabricated factor tiles in unavailable mode.
    expect(screen.queryByText(/26.4 °C/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(envMock.clearEnvironmentalCache).toHaveBeenCalled();
  });
});
