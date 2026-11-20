import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSiteIntelligence from "@/pages/admin/AdminSiteIntelligence";

vi.mock("@/lib/site-intelligence/queries", () => ({
  fetchReports: vi.fn().mockResolvedValue([
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
  ]),
  fetchSoilClassifications: vi.fn().mockResolvedValue([
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
  ]),
  reviewReport: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "regional_site_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "prof-1",
                  country_code: "NG",
                  region_slug: "lagos-coastal",
                  region_name: "Lagos Coastal Zone",
                  city_slug: "lagos",
                  flood_exposure: "high",
                  groundwater_note: "High water table within 1.0 - 2.0m of surface",
                  terrain_note: "Low-lying coastal plain",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data: [], error: null }))),
      };
    }),
  },
}));

describe("AdminSiteIntelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Site intelligence administration header and tabs", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Site intelligence/i)).toBeDefined();
      expect(screen.getByText(/Screening sources, geotechnical review/i)).toBeDefined();
    });
  });

  it("loads geotechnical reports awaiting moderation", async () => {
    render(
      <MemoryRouter>
        <AdminSiteIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Geotechnical Investigation - Lekki Peninsula/i),
      ).toBeDefined();
    });
  });
});
