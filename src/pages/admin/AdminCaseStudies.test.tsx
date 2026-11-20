import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCaseStudies from "@/pages/admin/AdminCaseStudies";

vi.mock("@/lib/case-studies", () => ({
  fetchAdminCaseStudyRows: vi.fn().mockResolvedValue([
    {
      entry: {
        id: "entry-1",
        title: "Modern Duplex Exterior Screeding",
        description: "Complete stucco and screeding project in Lekki Phase 1",
        category: "exterior",
        status: "approved",
        client_name: "Engr. Ade",
        location: "Lagos, Nigeria",
        created_at: "2026-10-15T00:00:00Z",
      },
      caseStudy: {
        id: "cs-1",
        gallery_entry_id: "entry-1",
        market_code: "NG",
        project_scope: "Wall preparation, prime coat, 3 coats mineral screed",
        materials_used: "Waterproof exterior filler, fibreglass mesh",
        labour_days: 14,
        total_cost_minor: 185000000,
        currency: "NGN",
        is_published: true,
        created_at: "2026-10-20T00:00:00Z",
      },
      images: [
        {
          id: "img-1",
          gallery_entry_id: "entry-1",
          image_url: "https://example.com/before.jpg",
          caption: "Before renovation",
          is_before: true,
        },
      ],
    },
  ]),
  upsertCaseStudy: vi.fn().mockResolvedValue({ error: null }),
  setCaseStudyPublished: vi.fn().mockResolvedValue({ error: null }),
  deleteCaseStudy: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: vi.fn(() => ({
    t: (s: string) => s,
    language: "en",
  })),
}));

describe("AdminCaseStudies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Case Studies administration header", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Case Studies/i)).toBeDefined();
    });
  });

  it("loads approved gallery entries ready for case study curation", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Modern Duplex Exterior Screeding/i)).toBeDefined();
    });
  });
});
