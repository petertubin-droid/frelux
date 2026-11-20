import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminWebVitals from "@/pages/admin/AdminWebVitals";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((fn) =>
        Promise.resolve(
          fn({
            data: [
              {
                metric: "LCP",
                value: 1200,
                rating: "good",
                path: "/",
                device: "desktop",
                connection: "4g",
                created_at: "2026-11-20T12:00:00Z",
              },
              {
                metric: "CLS",
                value: 0.05,
                rating: "good",
                path: "/learn",
                device: "mobile",
                connection: "4g",
                created_at: "2026-11-20T12:01:00Z",
              },
            ],
            error: null,
          }),
        ),
      ),
    }),
  },
}));

describe("AdminWebVitals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Web Vitals field performance dashboard", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Core Web Vitals/i)).toBeDefined();
  });

  it("displays metric summary cards for loaded samples", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Largest contentful paint")).toBeDefined();
      expect(screen.getByText("Cumulative layout shift")).toBeDefined();
    });
  });
});
