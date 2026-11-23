import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SeoPerformance from "@/pages/admin/SeoPerformance";
import { useAuth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/config/seo-tracker.json", () => ({
  default: {
    note: "Listing updates manually verified on Google SERP.",
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
      {
        path: "/articles/stucco-finishing",
        pageType: "article",
        oldTitle: "Stucco",
        newTitle: "Complete Guide to Stucco Application in West Africa",
        oldDescription: "Stucco tips.",
        newDescription: "Detailed mixture ratios and curing methods for humid climates.",
        status: "implemented",
        implementedAt: "2026-10-15",
      },
    ],
  },
}));

const mockInvoke = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
  },
}));

describe("SeoPerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" },
      isAdmin: true,
      loading: false,
    });
  });

  it("renders access check loading indicator", () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
    });

    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    expect(screen.getByText("Checking access…")).toBeInTheDocument();
  });

  it("blocks non-administrator users", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-1", email: "visitor@frelux.test" },
      isAdmin: false,
      loading: false,
    });

    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Administrators\s+only/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in with an administrator account to view search performance/i),
    ).toBeInTheDocument();
  });

  it("renders admin console header, idle state, and listing changes", async () => {
    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /SEO\s+performance/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("Not read yet. This calls Google directly; nothing is cached or filled in.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Connect and read" })).toBeInTheDocument();
      expect(screen.getByText("Listing changes (2 pages)")).toBeInTheDocument();
      expect(screen.getByText("/paint-calculator")).toBeInTheDocument();
      expect(screen.getByText("/articles/stucco-finishing")).toBeInTheDocument();
    });
  });

  it("connects and loads live Google Search Console data and query breakdown", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        connected: true,
        property: "sc-domain:freluxtools.com",
        startDate: "2026-10-01",
        endDate: "2026-10-28",
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
    });

    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect and read" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Connect and read" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("seo-search-console", {
        body: { action: "query", dimensions: ["query"], rowLimit: 50 },
      });
      expect(screen.getByText("285,000")).toBeInTheDocument();
      expect(screen.getByText("14,200")).toBeInTheDocument();
      expect(screen.getByText("4.98%")).toBeInTheDocument();
      expect(screen.getByText("8.4")).toBeInTheDocument();
      expect(screen.getByText("paint calculator nigeria")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });
  });

  it("surfaces disconnected Google Search Console explanation and fallback baseline", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        connected: false,
        reason: "property_not_in_account",
        setup: "Configure domain DNS TXT verification in Google Search Console.",
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect and read" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Connect and read" }));

    await waitFor(() => {
      expect(
        screen.getByText("Search Console is not returning data"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/The connected Google account cannot see this property/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Configure domain DNS TXT verification/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Baseline supplied by the owner for the previous 28 days/i),
      ).toBeInTheDocument();
    });
  });

  it("handles edge function network invocation error", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Edge Function timeout connecting to Google" },
    });

    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect and read" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Connect and read" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Google rejected the request \(Edge Function timeout connecting to Google\)/i),
      ).toBeInTheDocument();
    });
  });

  it("filters listing changes by page type category", async () => {
    render(
      <MemoryRouter>
        <SeoPerformance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("/paint-calculator")).toBeInTheDocument();
      expect(screen.getByText("/articles/stucco-finishing")).toBeInTheDocument();
    });

    // Filter to "tool" only
    fireEvent.click(screen.getByRole("button", { name: "tool" }));

    expect(screen.getByText("/paint-calculator")).toBeInTheDocument();
    expect(screen.queryByText("/articles/stucco-finishing")).not.toBeInTheDocument();

    // Filter to "colour" (which has no matches)
    fireEvent.click(screen.getByRole("button", { name: "colour" }));
    expect(screen.getByText("No changes recorded for this filter.")).toBeInTheDocument();

    // Reset to "All"
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("/paint-calculator")).toBeInTheDocument();
    expect(screen.getByText("/articles/stucco-finishing")).toBeInTheDocument();
  });
});
