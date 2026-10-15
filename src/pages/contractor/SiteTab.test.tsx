// ============================================================
// SiteTab tests — engine-1A GIS milestone 3. The persistence
// layer is mocked; all validation/area claims shown in the UI
// come from the tested geospatial chain.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SiteTab } from "./SiteTab";

const mockGet = vi.fn();
const mockSave = vi.fn();

vi.mock("@/lib/geospatial/site-location", () => ({
  getSiteLocation: (...a: unknown[]) => mockGet(...a),
  saveSiteLocation: (...a: unknown[]) => mockSave(...a),
  AREA_ACCURACY_NOTE:
    "Spherical formula, ~0.5% ellipsoid accuracy. NOT for cadastral or legal boundaries.",
}));

const STORED = {
  project_id: "p1",
  lat: 6.5244,
  lon: 3.3792,
  source_crs: "EPSG:4326",
  polygon: [
    { lat: 6.5244, lon: 3.3792 },
    { lat: 6.53, lon: 3.3792 },
    { lat: 6.53, lon: 3.39 },
  ],
  site_area_m2: 100_000,
  accuracy_note:
    "Spherical formula, ~0.5% ellipsoid accuracy. NOT for cadastral or legal boundaries.",
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue(STORED);
  mockSave.mockReset().mockResolvedValue({ ok: true });
});

describe("SiteTab", () => {
  it("renders the stored site: map, pin coordinates, area, honesty notes", async () => {
    render(<SiteTab projectId="p1" />);
    expect(await screen.findByText(/OpenStreetMap contributors/)).toBeInTheDocument();
    expect(screen.getByText(/6\.5244, 3\.3792/)).toBeInTheDocument();
    expect(screen.getByText(/100,000 m²/)).toBeInTheDocument();
    expect(screen.getByText(/NOT for cadastral/)).toBeInTheDocument();
    expect(screen.getByText("EPSG:4326")).toBeInTheDocument();
  });

  it("refuses non-numeric pin input without saving", async () => {
    render(<SiteTab projectId="p1" />);
    await screen.findByText(/OpenStreetMap contributors/);
    fireEvent.change(screen.getByLabelText(/^Latitude /), {
      target: { value: "not-a-number" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save site location/i }));
    expect(
      await screen.findByText(/must be decimal degrees/i),
    ).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("surfaces boundary parse errors honestly", async () => {
    render(<SiteTab projectId="p1" />);
    await screen.findByText(/OpenStreetMap contributors/);
    fireEvent.change(screen.getByLabelText(/^Optional site boundary/i), {
      target: { value: "6.5\nbad line" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save site location/i }));
    expect(
      await screen.findByText(/must be "lat, lon"/i),
    ).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("saves a valid pin and shows the saved confirmation", async () => {
    render(<SiteTab projectId="p1" />);
    await screen.findByText(/OpenStreetMap contributors/);
    fireEvent.change(screen.getByLabelText(/^Latitude /), { target: { value: "9.0765" } });
    fireEvent.change(screen.getByLabelText(/^Longitude /), { target: { value: "7.3986" } });
    fireEvent.click(screen.getByRole("button", { name: /save site location/i }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: "p1", a: 9.0765, b: 7.3986 }),
    );
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("shows an empty honest state when no site is stored", async () => {
    mockGet.mockResolvedValue(null);
    render(<SiteTab projectId="p1" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/^Latitude /)).toHaveValue(""),
    );
    expect(screen.queryByText(/OpenStreetMap contributors/)).not.toBeInTheDocument();
  });
});
