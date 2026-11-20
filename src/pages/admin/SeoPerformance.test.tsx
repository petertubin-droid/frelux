import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SeoPerformance from "@/pages/admin/SeoPerformance";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.test" },
    isAdmin: true,
    loading: false,
  })),
}));

vi.mock("@/config/seo-tracker.json", () => ({
  default: {
    entries: [
      {
        path: "/paint-calculator",
        pageType: "tool",
        oldTitle: "Paint Calculator",
        newTitle: "Paint Calculator Nigeria | Material & Cost Estimator",
        oldDescription: "Calculate paint needed.",
        newDescription: "Accurate paint and primer estimator with live Nigerian market prices.",
        status: "implemented",
        implementedAt: "2026-10-01",
      },
    ],
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          connected: true,
          property: "sc-domain:freluxtools.com",
          totals: {
            clicks: 14200,
            impressions: 285000,
            ctr: 0.0498,
            position: 8.4,
          },
          rows: [
            {
              key: "paint calculator nigeria",
              clicks: 3400,
              impressions: 42000,
              ctr: 0.081,
              position: 3.2,
            },
          ],
        },
        error: null,
      }),
    },
  },
}));

describe("SeoPerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the SEO Performance administrator control panel", async () => {
    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/SEO performance/i);
    });
  });

  it("displays tracked search listing title and description updates", async () => {
    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Paint Calculator Nigeria \| Material & Cost Estimator/i),
      ).toBeDefined();
    });
  });
});
