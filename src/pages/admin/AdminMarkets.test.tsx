import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminMarkets")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminMarkets", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the market data consistency report without a database call", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Data Consistency/i }));
    expect(screen.getByText("Markets checked")).toBeInTheDocument();
    // The six audited markets resolve their own data, so none of them is listed
    // with a gap. Canada must not be offered a 9 inch sandcrete block.
    expect(screen.getAllByText("Complete").length).toBeGreaterThanOrEqual(6);
    expect(
      screen.getAllByText("8 inch CMU block").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows price role coverage for every market in the static book", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Price Roles/i }));
    expect(screen.getByText("Markets in book")).toBeInTheDocument();
    expect(screen.getByText(/Roles no market maps/)).toBeInTheDocument();
    // Every market is listed with its own priced count out of 26 roles.
    expect(screen.getAllByText(/roles priced/).length).toBeGreaterThan(30);
  });
});
