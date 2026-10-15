// ============================================================
// SiteTab tests — engine-1A GIS milestone 3. The persistence
// layer is mocked; all validation/area claims shown in the UI
// come from the tested geospatial chain.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SiteTab } from "./SiteTab";
import { checkImageryLicense } from "@/lib/geospatial/imagery";

const mockGet = vi.fn();
const mockSave = vi.fn();
const mockFetchImagery = vi.fn();
const mockSaveImagery = vi.fn();
const mockDeleteImagery = vi.fn();

vi.mock("@/lib/geospatial/site-location", () => ({
  getSiteLocation: (...a: unknown[]) => mockGet(...a),
  saveSiteLocation: (...a: unknown[]) => mockSave(...a),
  AREA_ACCURACY_NOTE:
    "Spherical formula, ~0.5% ellipsoid accuracy. NOT for cadastral or legal boundaries.",
}));

vi.mock(
  "@/lib/geospatial/imagery",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("@/lib/geospatial/imagery")
    >();
    return {
      ...actual,
      fetchImageryRecords: (...a: unknown[]) => mockFetchImagery(...a),
      saveImageryRecord: (...a: unknown[]) => mockSaveImagery(...a),
      deleteImageryRecord: (...a: unknown[]) => mockDeleteImagery(...a),
    };
  },
);

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
  mockFetchImagery.mockReset().mockResolvedValue({ ok: true, records: [] });
  mockSaveImagery.mockReset();
  mockDeleteImagery.mockReset();
});

describe("SiteTab", () => {
  it("renders the stored site: map, pin coordinates, area, honesty notes", async () => {
    render(<SiteTab projectId="p1" />);
    // Attribution appears twice by design: on-map (license-required)
    // and in the disclosure line below.
    expect((await screen.findAllByText(/OpenStreetMap contributors/)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/6\.5244, 3\.3792/)).toBeInTheDocument();
    expect(screen.getByText(/100,000 m²/)).toBeInTheDocument();
    expect(screen.getByText(/NOT for cadastral/)).toBeInTheDocument();
    expect(screen.getByText("EPSG:4326")).toBeInTheDocument();
  });

  it("refuses non-numeric pin input without saving", async () => {
    render(<SiteTab projectId="p1" />);
    expect((await screen.findAllByText(/OpenStreetMap contributors/)).length).toBeGreaterThanOrEqual(2);
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
    expect((await screen.findAllByText(/OpenStreetMap contributors/)).length).toBeGreaterThanOrEqual(2);
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
    expect((await screen.findAllByText(/OpenStreetMap contributors/)).length).toBeGreaterThanOrEqual(2);
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

describe("SiteTab — M4 licensed imagery", () => {
  it("lists registered imagery records with their license disclosure", async () => {
    mockFetchImagery.mockResolvedValue({
      ok: true,
      records: [
        {
          id: "i1",
          project_id: "p1",
          user_id: null,
          provider_id: "custom",
          name: "Site flyover 2026-09-30",
          license_name: "Contractor survey license",
          license_url: null,
          attribution: "© Contractor",
          captured_on: "2026-09-30",
          coverage_note: "Full site, 2cm/px",
          tile_url_template: "https://host/tiles/{z}/{x}/{y}.png",
          license_expires_on: null,
          notes: null,
          created_at: "2026-10-01",
        },
      ],
    });
    render(<SiteTab projectId="p1" />);
    expect(
      await screen.findByText(/Site flyover 2026-09-30/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Captured 2026-09-30/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/License: Contractor survey license/),
    ).toBeInTheDocument();
  });

  it("shows the satellite license gate until a record exists", async () => {
    render(<SiteTab projectId="p1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Esri World Imagery/i }),
    );
    expect(
      await screen.findByText(/no registered imagery\/license record/i),
    ).toBeInTheDocument();
  });

  it("registerDrone refuses incomplete records honestly (no record listed)", async () => {
    // Emulate the real saveImageryRecord: the pure license check runs
    // BEFORE any persistence — a record without name/license/date is
    // refused and never reaches the database.
    mockSaveImagery.mockImplementation(async (input: { provider_id: string; name: string; license_name: string; captured_on: string | null; tile_url_template: string | null; license_expires_on: string | null }) => {
      const check = checkImageryLicense(input.provider_id, {
        name: input.name,
        license_name: input.license_name,
        captured_on: input.captured_on,
        tile_url_template: input.tile_url_template,
        license_expires_on: input.license_expires_on,
      });
      if (!check.usable) return { ok: false, error: check.reason! };
      throw new Error("persistence is mocked: refused inputs never reach here");
    });
    render(<SiteTab projectId="p1" />);
    fireEvent.click(
      await screen.findByText(/Register drone \/ hosted imagery/i),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Register imagery record/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Custom imagery requires a record with the imagery set's name\./i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/registered with its license record/i),
    ).not.toBeInTheDocument();
  });

  it("registerDrone saves a complete licensed record and lists it", async () => {
    mockSaveImagery.mockImplementation(async () => {
      mockFetchImagery.mockResolvedValue({
        ok: true,
        records: [
          {
            id: "i2",
            project_id: "p1",
            user_id: null,
            provider_id: "custom",
            name: "Flyover A",
            license_name: "Contractor survey license",
            license_url: null,
            attribution: "© Contractor",
            captured_on: "2026-09-30",
            coverage_note: null,
            tile_url_template: "https://t/{z}/{x}/{y}.png",
            license_expires_on: null,
            notes: null,
            created_at: "2026-10-15",
          },
        ],
      });
      return {
        ok: true,
        record: {
          id: "i2",
          project_id: "p1",
          user_id: null,
          provider_id: "custom",
          name: "Flyover A",
          license_name: "Contractor survey license",
          license_url: null,
          attribution: "© Contractor",
          captured_on: "2026-09-30",
          coverage_note: null,
          tile_url_template: "https://t/{z}/{x}/{y}.png",
          license_expires_on: null,
          notes: null,
          created_at: "2026-10-15",
        },
      };
    });
    render(<SiteTab projectId="p1" />);
    fireEvent.click(
      await screen.findByText(/Register drone \/ hosted imagery/i),
    );
    fireEvent.change(
      screen.getByLabelText(/Imagery set name \*/i),
      { target: { value: "Flyover A" } },
    );
    fireEvent.change(
      screen.getByLabelText(/License it is used under \*/i),
      { target: { value: "Contractor survey license" } },
    );
    fireEvent.change(screen.getByLabelText(/Capture date \*/i), {
      target: { value: "2026-09-30" },
    });
    fireEvent.change(
      screen.getByLabelText(/Hosted XYZ tile URL/i),
      { target: { value: "https://t/{z}/{x}/{y}.png" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Register imagery record/i }),
    );
    await waitFor(() => {
      expect(mockSaveImagery).toHaveBeenCalledWith(
        expect.objectContaining({ provider_id: "custom" }),
      );
    });
    expect(await screen.findByText(/Flyover A/)).toBeInTheDocument();
    expect(
      screen.getByText(/registered with its license record/i),
    ).toBeInTheDocument();
  });
});
