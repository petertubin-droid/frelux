import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSiteIntelligence from "@/pages/admin/AdminSiteIntelligence";

const mockFetchReports = vi.fn();
const mockFetchSoilClassifications = vi.fn();
const mockReviewReport = vi.fn();

vi.mock("@/lib/site-intelligence/queries", () => ({
  fetchReports: () => mockFetchReports(),
  fetchSoilClassifications: () => mockFetchSoilClassifications(),
  reviewReport: (...args: any[]) => mockReviewReport(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const initialReports = [
  {
    id: "rep-1",
    project_site_id: "site-1",
    title: "Geotechnical Investigation - Lekki Peninsula",
    report_type: "soil_investigation",
    storage_path: "reports/rep-1.pdf",
    original_filename: "lekki_geotech.pdf",
    prepared_by: "Atlas Geotechnics Ltd",
    bearing_capacity_kpa: 120,
    groundwater_depth_m: 1.4,
    verification_status: "unverified",
    created_at: "2026-11-15T00:00:00Z",
  },
];

const initialProfiles = [
  {
    id: "prof-1",
    country_code: "NG",
    region_slug: "lagos-coastal",
    region_name: "Lagos Coastal Zone",
    city_slug: "lagos",
    flood_exposure: "high",
    groundwater_note: "High water table within 1.0 - 2.0m of surface",
    terrain_note: "Low-lying coastal plain",
    source_reference: "Lagos State Ministry of Waterfront Infrastructure 2024",
    source_year: 2024,
    verification_status: "sourced",
  },
];

const initialSoils = [
  {
    id: "soil-1",
    code: "LATERITIC_CLAY",
    name: "Lateritic Clay & Sandy Soils",
    summary: "Common subgrade material across West Africa",
    drainage_flag: "moderate",
    dewatering_flag: "low",
    ground_improvement_flag: "none",
    investigation_priority: "normal",
    sort_order: 1,
  },
];

describe("AdminSiteIntelligence", () => {
  let insertMock: any;
  let updateMock: any;
  let eqMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchReports.mockResolvedValue(initialReports);
    mockFetchSoilClassifications.mockResolvedValue(initialSoils);
    mockReviewReport.mockResolvedValue({ ok: true });

    insertMock = vi.fn().mockResolvedValue({ error: null });
    eqMock = vi.fn().mockResolvedValue({ error: null });
    updateMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockImplementation((table: string) => {
      if (table === "regional_site_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: initialProfiles,
              error: null,
            }),
          }),
          insert: insertMock,
          update: updateMock,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: (fn: any) => Promise.resolve(fn({ data: [], error: null })),
      };
    });
  });

  it("renders Site intelligence header, tabs, and geotechnical reports", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Site intelligence" })).toBeInTheDocument();
      expect(screen.getByText(/Screening sources, geotechnical review/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reports \(1 awaiting\)/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Geotechnical Investigation - Lekki Peninsula/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Atlas Geotechnics Ltd/i)).toBeInTheDocument();
      expect(screen.getByText("120 kN/m²")).toBeInTheDocument();
    });
  });

  it("verifies an unverified geotechnical report", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Verify report Geotechnical Investigation - Lekki Peninsula",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Verify report Geotechnical Investigation - Lekki Peninsula",
      }),
    );

    await waitFor(() => {
      expect(mockReviewReport).toHaveBeenCalledWith({
        reportId: "rep-1",
        decision: "verify",
      });
      expect(screen.getByText("verified")).toBeInTheDocument();
    });
  });

  it("rejects an unverified geotechnical report", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Reject report Geotechnical Investigation - Lekki Peninsula",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reject report Geotechnical Investigation - Lekki Peninsula",
      }),
    );

    await waitFor(() => {
      expect(mockReviewReport).toHaveBeenCalledWith({
        reportId: "rep-1",
        decision: "reject",
      });
      expect(screen.getByText("rejected")).toBeInTheDocument();
    });
  });

  it("displays error message if review decision fails", async () => {
    mockReviewReport.mockResolvedValueOnce({
      ok: false,
      error: "Insufficient permissions to review reports",
    });

    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Verify report Geotechnical Investigation - Lekki Peninsula",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Verify report Geotechnical Investigation - Lekki Peninsula",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Insufficient permissions to review reports"),
      ).toBeInTheDocument();
    });
  });

  it("validates and creates a new regional site profile", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regional sources/i })).toBeInTheDocument();
    });

    // Switch tab
    fireEvent.click(screen.getByRole("button", { name: /Regional sources/i }));

    await waitFor(() => {
      expect(screen.getByText("Lagos Coastal Zone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
    });

    // Attempt to submit empty form
    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    expect(
      screen.getByText(/A region and a source reference are required/i),
    ).toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();

    // Fill form
    fireEvent.change(screen.getByLabelText("Setting region_slug"), {
      target: { value: "abuja-central" },
    });
    fireEvent.change(screen.getByLabelText("Setting region_name"), {
      target: { value: "Abuja Central Plateau" },
    });
    fireEvent.change(screen.getByLabelText("Setting source_reference"), {
      target: { value: "FCDA Engineering Manual 2025" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add source" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: "NG",
          region_slug: "abuja-central",
          region_name: "Abuja Central Plateau",
          source_reference: "FCDA Engineering Manual 2025",
          verification_status: "sourced",
        }),
      );
    });
  });

  it("withdraws an existing regional profile", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regional sources/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Regional sources/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Withdraw Lagos Coastal Zone" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Withdraw Lagos Coastal Zone" }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ verification_status: "withdrawn" });
      expect(eqMock).toHaveBeenCalledWith("id", "prof-1");
    });
  });

  it("switches to Soil classifications tab and renders classifications", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Soil classifications/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Soil classifications/i }));

    await waitFor(() => {
      expect(screen.getByText("Lateritic Clay & Sandy Soils")).toBeInTheDocument();
      expect(screen.getByText("LATERITIC_CLAY")).toBeInTheDocument();
    });
  });
});
