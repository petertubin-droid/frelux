import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminAnalytics from "./AdminAnalytics";

const { mockTrafficReport, mockEvents } = vi.hoisted(() => {
  const mockTrafficReport = {
    days: 7,
    generated_at: new Date().toISOString(),
    totals: {
      visitors: 1250,
      page_views: 4800,
      sessions: 1600,
      avg_session_seconds: 145,
      bounce_rate: 0.32,
    },
    active_now: 14,
    daily: [
      { date: "2026-03-25", visitors: 180, page_views: 650 },
      { date: "2026-03-26", visitors: 210, page_views: 720 },
    ],
    pages: [
      { path: "/paint-calculator", views: 1200 },
      { path: "/cost-estimator", views: 850 },
    ],
    sources: [
      { source: "google", visits: 900 },
      { source: "direct", visits: 350 },
    ],
    devices: [
      { device: "mobile", visitors: 800 },
      { device: "desktop", visitors: 450 },
    ],
  };

  const mockEvents = [
    {
      id: "ev-1",
      event: "calculator_completed",
      created_at: new Date().toISOString(),
    },
    {
      id: "ev-2",
      event: "ai_recommendation_generated",
      created_at: new Date().toISOString(),
    },
  ];

  return { mockTrafficReport, mockEvents };
});

vi.mock("@/lib/traffic-report", () => ({
  fetchTrafficReport: vi.fn().mockResolvedValue({
    report: mockTrafficReport,
    error: null,
  }),
  fetchGa4Configuration: vi.fn().mockResolvedValue({
    measurementId: null,
    connected: false,
    source: "none",
  }),
  fetchGa4Summary: vi.fn().mockResolvedValue(null),
  fetchGa4Status: vi.fn().mockResolvedValue({ status: "not_configured" }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "analytics_events") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockEvents,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAnalytics />
    </MemoryRouter>,
  );
}

describe("AdminAnalytics", () => {
  it("renders page header and period selector buttons", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Analytics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "28 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument();
  });

  it("displays key traffic stat metrics", async () => {
    renderPage();

    expect(await screen.findByText("1,250")).toBeInTheDocument(); // unique visitors
    expect(screen.getByText("4,800")).toBeInTheDocument(); // page views
    expect(screen.getByText("14")).toBeInTheDocument(); // live now
  });

  it("displays top pages and traffic sources breakdowns", async () => {
    renderPage();

    expect(await screen.findByText("/paint-calculator")).toBeInTheDocument();
    expect(screen.getByText("/cost-estimator")).toBeInTheDocument();
    expect(screen.getByText("google")).toBeInTheDocument();
    expect(screen.getByText("direct")).toBeInTheDocument();
  });

  it("allows switching time periods", async () => {
    renderPage();

    const btn28 = await screen.findByRole("button", { name: "28 days" });
    fireEvent.click(btn28);

    await waitFor(() => {
      expect(btn28).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("renders feature category groups", async () => {
    renderPage();

    expect(await screen.findByText("Calculator")).toBeInTheDocument();
    expect(screen.getByText("Cost Estimator")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });
});
