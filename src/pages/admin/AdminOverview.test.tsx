import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminOverview from "./AdminOverview";
import { supabase } from "@/lib/supabase";
import * as aiAccess from "@/lib/ai-access";

vi.mock("@/lib/ai-access", () => ({
  fetchAiAccessConfig: vi.fn(),
}));

let probeError: any = null;
let profilesCount: number | null = 142;
let profilesError: any = null;
let estimatesCount: number | null = 328;
let estimatesError: any = null;
let materialsCount: number | null = 85;
let materialsError: any = null;
let pricesCount: number | null = 412;
let pricesError: any = null;
let errorsCount: number | null = 3;
let errorsError: any = null;
let analyticsCount: number | null = 1940;
let analyticsError: any = null;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "estimation_prices") {
        return {
          select: vi.fn((cols, opts) => {
            if (opts?.head) {
              return Promise.resolve({
                count: pricesCount,
                error: pricesError,
              });
            }
            return {
              limit: vi.fn().mockResolvedValue({
                data: probeError ? null : [{ id: "price-1" }],
                error: probeError,
              }),
            };
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockResolvedValue({
            count: profilesCount,
            error: profilesError,
          }),
        };
      }
      if (table === "estimation_estimates") {
        return {
          select: vi.fn().mockResolvedValue({
            count: estimatesCount,
            error: estimatesError,
          }),
        };
      }
      if (table === "estimation_materials") {
        return {
          select: vi.fn().mockResolvedValue({
            count: materialsCount,
            error: materialsError,
          }),
        };
      }
      if (table === "application_errors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({
                count: errorsCount,
                error: errorsError,
              }),
            })),
          })),
        };
      }
      if (table === "analytics_events") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn().mockResolvedValue({
              count: analyticsCount,
              error: analyticsError,
            }),
          })),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  probeError = null;
  profilesCount = 142;
  profilesError = null;
  estimatesCount = 328;
  estimatesError = null;
  materialsCount = 85;
  materialsError = null;
  pricesCount = 412;
  pricesError = null;
  errorsCount = 3;
  errorsError = null;
  analyticsCount = 1940;
  analyticsError = null;
  vi.mocked(aiAccess.fetchAiAccessConfig).mockResolvedValue({
    aiEnabled: true,
  } as any);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOverview />
    </MemoryRouter>,
  );
}

describe("AdminOverview", () => {
  it("displays healthy database probe and active AI configuration", async () => {
    renderPage();

    expect(
      await screen.findByText("Connected and responding."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AI assistants enabled for users."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
  });

  it("renders live entity count tiles for users, estimates, materials, and prices", async () => {
    renderPage();

    expect(await screen.findByText("142")).toBeInTheDocument(); // profiles
    expect(screen.getByText("Registered users")).toBeInTheDocument();
    expect(screen.getByText("328")).toBeInTheDocument(); // estimates
    expect(screen.getByText("Estimates saved")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument(); // materials
    expect(screen.getByText("Estimation materials")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument(); // prices
    expect(screen.getByText("Price records")).toBeInTheDocument();
  });

  it("flags query failure honestly on tile when database count fails", async () => {
    estimatesCount = null;
    estimatesError = { message: "timeout querying estimates" };

    renderPage();

    expect(await screen.findByText("query failed")).toBeInTheDocument();
    expect(
      screen.getByText("Estimates saved: query failed"),
    ).toBeInTheDocument();
  });

  it("shows database unreachable message when probe fails", async () => {
    probeError = { message: "connection refused" };

    renderPage();

    expect(
      await screen.findByText("Unreachable right now: check System Health."),
    ).toBeInTheDocument();
  });

  it("renders navigation cards for admin operational sections", async () => {
    renderPage();

    expect(await screen.findByText("Construction Engines")).toBeInTheDocument();
    expect(
      screen.getByText("Which engines exist and are they active?"),
    ).toBeInTheDocument();
    expect(screen.getByText("What is the AI doing?")).toBeInTheDocument();
    expect(screen.getByText("Monetization")).toBeInTheDocument();
  });
});
