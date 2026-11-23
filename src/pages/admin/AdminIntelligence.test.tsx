import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminIntelligence from "@/pages/admin/AdminIntelligence";

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockLoadIntelligence = vi.fn();
vi.mock("@/lib/intelligence/queries", () => ({
  loadIntelligence: (...args: any[]) => mockLoadIntelligence(...args),
}));

const mockAnalyticsSnapshot = {
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
};

describe("AdminIntelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" },
      loading: false,
    });

    mockLoadIntelligence.mockResolvedValue({
      snapshot: mockAnalyticsSnapshot,
      error: null,
    });
  });

  it("renders Platform analytics header and administration overview", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Platform analytics" })).toBeInTheDocument();
      expect(
        screen.getByText(/Aggregated counts across the marketplace/i),
      ).toBeInTheDocument();
    });
  });

  it("displays platform-wide user, project and marketplace metrics", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("1240")).toBeInTheDocument();
      expect(screen.getByText("112 new this month")).toBeInTheDocument();
      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("240 created in total")).toBeInTheDocument();
      expect(screen.getByText("54")).toBeInTheDocument();
      expect(screen.getByText("95")).toBeInTheDocument();
      expect(screen.getByText("210")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
    });
  });

  it("renders user growth, supplier subscription and report usage sections", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("User growth")).toBeInTheDocument();
      expect(screen.getByText("2026-11")).toBeInTheDocument();
      expect(screen.getByText("Supplier subscriptions")).toBeInTheDocument();
      expect(screen.getByText("verified_pro")).toBeInTheDocument();
      expect(screen.getByText("Report usage")).toBeInTheDocument();
      expect(screen.getByText(/18 price submission\(s\) await review/i)).toBeInTheDocument();
    });
  });

  it("refreshes intelligence data when clicking the Refresh button", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));

    await waitFor(() => {
      expect(mockLoadIntelligence).toHaveBeenCalledTimes(2);
      expect(mockLoadIntelligence).toHaveBeenCalledWith({ force: true });
    });
  });

  it("refuses access when user is not an administrator", async () => {
    mockLoadIntelligence.mockResolvedValueOnce({
      snapshot: { isAdmin: false, admin: null },
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Administrator access required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Platform analytics are limited to administrator accounts/i),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Back to my dashboard/i })).toBeInTheDocument();
    });
  });

  it("surfaces load errors or unauthenticated prompt", async () => {
    mockLoadIntelligence.mockResolvedValueOnce({
      snapshot: null,
      error: "Service unavailable temporarily",
    });

    render(
      <MemoryRouter>
        <AdminIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Service unavailable temporarily")).toBeInTheDocument();
    });
  });
});
