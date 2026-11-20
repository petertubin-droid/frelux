import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminIntelligence from "@/pages/admin/AdminIntelligence";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.test" },
    loading: false,
  })),
}));

vi.mock("@/lib/intelligence/queries", () => ({
  loadIntelligence: vi.fn().mockResolvedValue({
    snapshot: {
      isAdmin: true,
      admin: {
        users: { total: 1240, newThisMonth: 112 },
        projects: { active: 85, total: 240, tracked: 64 },
        priceContributions: { pending: 18, approved: 420, rejected: 12 },
        suppliers: {
          total: 54,
          verified: 38,
          pendingVerification: 6,
          activeListings: 184,
        },
        marketplace: {
          requests: 95,
          quotes: 210,
          orders: 45,
          awardedValue: 345000000,
          currency: "NGN",
        },
        subscriptions: [{ plan: "verified_pro", suppliers: 28 }],
        featureUsage: [{ report: "Detailed BOQ PDF", runs: 320 }],
        growth: [{ month: "2026-11", users: 112 }],
      },
    },
    error: null,
  }),
}));

describe("AdminIntelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Platform analytics header and administration overview", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Platform analytics/i)).toBeDefined();
    });
  });

  it("displays platform-wide user, project and marketplace metrics", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("1240")).toBeDefined();
      expect(screen.getByText("85")).toBeDefined();
    });
  });
});
