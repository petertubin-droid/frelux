import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCaseStudies from "@/pages/admin/AdminCaseStudies";
import * as caseStudiesLib from "@/lib/case-studies";
import type { CaseStudyAdminRow } from "@/lib/case-studies";

const mockAdminRow: CaseStudyAdminRow = {
  entry: {
    id: "entry-1",
    title: "Modern Duplex Exterior Screeding",
    description: "Complete stucco and screeding project in Lekki Phase 1",
    project_category: "painting",
    status: "approved",
    is_featured: false,
    client_name: "Engr. Ade",
    location: "Lagos, Nigeria",
    created_at: "2026-10-15T00:00:00Z",
    created_by: "user-1",
    moderated_by: "admin-1",
    moderated_at: "2026-10-16T00:00:00Z",
    rejection_reason: null,
    updated_at: "2026-10-16T00:00:00Z",
  },
  caseStudy: {
    id: "cs-1",
    gallery_entry_id: "entry-1",
    headline: "Modern Duplex Exterior Screeding: Before & After",
    summary: "Transformed cracked external plaster into weatherproof finish.",
    project_scope: "Wall preparation, prime coat, 3 coats mineral screed",
    challenges: "High coastal humidity in Lekki",
    outcome: "Zero water ingress after heavy rains",
    materials_used: ["Waterproof exterior filler", "fibreglass mesh"],
    project_duration: "3 weeks",
    budget: 850000,
    currency: "NGN",
    is_published: true,
    created_by: "admin-1",
    created_at: "2026-10-20T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  },
  images: [
    {
      id: "img-1",
      gallery_entry_id: "entry-1",
      image_type: "before",
      image_url: "https://example.com/before.jpg",
      caption: "Before renovation",
      sort_order: 1,
      created_at: "2026-10-15T00:00:00Z",
    },
    {
      id: "img-2",
      gallery_entry_id: "entry-1",
      image_type: "after",
      image_url: "https://example.com/after.jpg",
      caption: "After renovation",
      sort_order: 2,
      created_at: "2026-10-15T00:00:00Z",
    },
  ],
};

vi.mock("@/lib/case-studies", () => ({
  fetchAdminCaseStudyRows: vi.fn(),
  upsertCaseStudy: vi.fn(),
  setCaseStudyPublished: vi.fn(),
  deleteCaseStudy: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({
    t: (s: string) => s,
    language: "en",
  }),
}));

vi.mock("@/lib/international/market-context", () => ({
  BUILTIN_MARKET_PROFILES: [{ currency_code: "NGN" }, { currency_code: "USD" }],
  useCurrencyCode: () => "NGN",
}));

describe("AdminCaseStudies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(caseStudiesLib.fetchAdminCaseStudyRows).mockResolvedValue([mockAdminRow]);
    vi.mocked(caseStudiesLib.upsertCaseStudy).mockResolvedValue(mockAdminRow.caseStudy!);
    vi.mocked(caseStudiesLib.setCaseStudyPublished).mockResolvedValue(mockAdminRow.caseStudy!);
    vi.mocked(caseStudiesLib.deleteCaseStudy).mockResolvedValue();
  });

  it("renders header and lists gallery entries with case study details", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Case Studies/i);
      expect(screen.getByText("Modern Duplex Exterior Screeding")).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Unpublish/i })).toBeInTheDocument();
    });
  });

  it("toggles case study publish state", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await screen.findByText("Modern Duplex Exterior Screeding");
    const unpublishBtn = screen.getByRole("button", { name: /Unpublish/i });
    fireEvent.click(unpublishBtn);

    await waitFor(() => {
      expect(caseStudiesLib.setCaseStudyPublished).toHaveBeenCalledWith("cs-1", false);
    });
  });

  it("deletes case study when confirmed", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await screen.findByText("Modern Duplex Exterior Screeding");
    const deleteBtn = screen.getByRole("button", { name: /Delete/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this case study? The gallery entry is kept.",
    );
    await waitFor(() => {
      expect(caseStudiesLib.deleteCaseStudy).toHaveBeenCalledWith("cs-1");
    });
  });

  it("opens edit form and saves changes with upsertCaseStudy", async () => {
    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await screen.findByText("Modern Duplex Exterior Screeding");
    const editBtn = screen.getByRole("button", { name: /Edit case study/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Zero water ingress after heavy rains")).toBeInTheDocument();
    });

    const headlineInput = screen.getByLabelText("Headline");
    fireEvent.change(headlineInput, {
      target: { value: "Updated Duplex Screeding & Painting Showcase" },
    });

    const saveBtn = screen.getByRole("button", { name: /Save Case Study/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(caseStudiesLib.upsertCaseStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          gallery_entry_id: "entry-1",
          headline: "Updated Duplex Screeding & Painting Showcase",
          summary: "Transformed cracked external plaster into weatherproof finish.",
          budget: 850000,
          currency: "NGN",
        }),
      );
    });
  });

  it("renders empty state when no approved entries exist", async () => {
    vi.mocked(caseStudiesLib.fetchAdminCaseStudyRows).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No approved or featured gallery entries yet/i),
      ).toBeInTheDocument();
    });
  });

  it("surfaces error when fetching rows fails", async () => {
    vi.mocked(caseStudiesLib.fetchAdminCaseStudyRows).mockRejectedValueOnce(
      new Error("Network disconnect"),
    );

    render(
      <MemoryRouter>
        <AdminCaseStudies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load gallery entries/i),
      ).toBeInTheDocument();
    });
  });
});
