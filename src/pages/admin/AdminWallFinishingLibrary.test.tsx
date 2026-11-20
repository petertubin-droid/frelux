import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminWallFinishingLibrary from "@/pages/admin/AdminWallFinishingLibrary";

vi.mock("@/lib/i18n", () => ({
  useLanguage: vi.fn(() => ({
    t: (s: string) => s,
    language: "en",
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1" } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      let data: unknown[] = [];
      if (table === "learn_wall_finishing_topics") {
        data = [
          {
            id: "top-1",
            market_code: "NG",
            candidate_key: "exterior_stucco_tropical",
            title: "Exterior Stucco Application in Tropical Humid Climates",
            topic_type: "technique",
            verification_status: "verified",
          },
        ];
      } else if (table === "learn_wall_finishing_sources") {
        data = [
          {
            id: "src-1",
            topic_id: "top-1",
            title: "Nigerian Building and Road Research Institute Standards",
            url: "https://nbrri.gov.ng",
            publisher: "NBRRI",
            claim_scope: "national",
            review_status: "verified",
          },
        ];
      } else if (table === "learn_wall_finishing_article_slots") {
        data = [
          {
            topic_id: "top-1",
            market_code: "NG",
            theme_key: "screeding",
            language_code: "en",
            article_id: "art-1",
          },
        ];
      } else if (table === "learn_articles") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "art-1",
                  slug: "exterior-stucco-guide-nigeria",
                  title: "Master Guide: Exterior Wall Screeding in Nigeria",
                  content: "Comprehensive specifications for cement-sand rendering and acrylic screed.",
                  excerpt: "Learn optimal mix ratios and curing techniques.",
                  category_slug: "wall-finishing",
                  wall_topic_id: "top-1",
                  wall_article_theme: "screeding",
                  wall_language_code: "en",
                  editorial_review_status: "approved",
                  status: "published",
                },
              ],
              error: null,
            }),
          }),
        };
      } else if (table === "learn_categories") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ slug: "wall-finishing", name: "Wall Finishing" }],
              error: null,
            }),
          }),
        };
      } else if (table === "learn_wall_finishing_market_status") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                market_code: "NG",
                has_native_catalog: true,
                coverage_status: "complete",
              },
            ],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data, error: null }))),
      };
    }),
  },
}));

describe("AdminWallFinishingLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Wall Finishing Knowledge Library console", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Wall Finishing Knowledge Library/i)).toBeDefined();
    });
  });

  it("loads and displays registered topic candidates and standards", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Exterior Stucco Application in Tropical Humid Climates/i),
      ).toBeDefined();
    });
  });
});
