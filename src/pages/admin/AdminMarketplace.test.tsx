import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  const Comp = (await import("@/pages/admin/AdminMarketplace")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminMarketplace", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

describe("AdminMarketplace deep links", () => {
  it("opens the tab named in the query string", async () => {
    const { default: Comp } = await import("@/pages/admin/AdminMarketplace");
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/marketplace?tab=products"]}>
        <ToastProvider>
          <Comp />
        </ToastProvider>
      </MemoryRouter>,
    );
    // The tab bar marks the deep-linked tab as selected; the panels fetch on
    // their own, so assert on the tab state rather than on fetched rows.
    expect(container.textContent).toContain("Products");
    expect(
      screen.getByRole("button", { name: "Products", pressed: true }),
    ).toBeDefined();
  });

  it("falls back to listings for an unknown tab", async () => {
    const { default: Comp } = await import("@/pages/admin/AdminMarketplace");
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/marketplace?tab=nonsense"]}>
        <ToastProvider>
          <Comp />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Listings");
  });
});
