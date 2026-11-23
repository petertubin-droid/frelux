import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/payments/nowpayments", () => ({
  verifyNowPaymentsInvoice: vi.fn().mockResolvedValue({
    success: true,
    status: "Confirmed",
    activated: true,
    fulfilled: true,
  }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/queries", () => ({
  fetchUserProjects: vi.fn().mockResolvedValue({ data: [] }),
  fetchFavoriteColors: vi.fn().mockResolvedValue({ data: [] }),
  fetchRecentlyViewedColors: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "contractor_projects") {
        return {
          select: () => ({
            order: () => ({ limit: async () => ({ data: [] }) }),
          }),
        };
      }
      return {
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: [
                {
                  id: "cp-1",
                  name: "Lekki duplex fit-out",
                  status: "in_progress",
                  progress_percentage: 40,
                  total_project_cost: 2500000,
                  currency_symbol: "\u20a6",
                  updated_at: "2026-10-10T00:00:00.000Z",
                },
              ],
            }),
          }),
        }),
      };
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage(initialEntries = ["/dashboard"]) {
  const Comp = (await import("@/pages/Dashboard")).default;
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Dashboard", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("verifies payment when returning with nowpayments_success query param", async () => {
    const { verifyNowPaymentsInvoice } =
      await import("@/lib/payments/nowpayments");
    const { useAuth } = await import("@/lib/auth");
    const refreshProfile = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "u@example.com" },
      loading: false,
      refreshProfile,
    } as never);

    await renderPage([
      "/dashboard?payment=nowpayments_success&orderId=FRX-order-test-999",
    ]);

    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      expect(verifyNowPaymentsInvoice).toHaveBeenCalledWith(
        "FRX-order-test-999",
      );
    });
  });

  it("shows the Project Workspace overview for a signed-in user", async () => {
    const { useAuth } = await import("@/lib/auth");
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "u@example.com" },
      loading: false,
    } as never);
    const { screen } = await import("@testing-library/react");
    await renderPage();
    const section = await screen.findByTestId("dashboard-workspace-section");
    expect(section).toBeDefined();
    expect(screen.getByText("Lekki duplex fit-out")).toBeDefined();
    expect(screen.getByText("In progress")).toBeDefined();
  });
});
