import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
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
  const Comp = (await import("@/pages/admin/AdminPriceUpdater")).default;
  const screen = (await import("@testing-library/react")).screen;
  const user = (await import("@testing-library/user-event")).default.setup();
  const utils = render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
  return { ...utils, screen, user };
}

describe("AdminPriceUpdater", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

describe("AdminPriceUpdater market selection", () => {
  it("shows the market selector defaulting to Nigeria and offering the US book", async () => {
    const { screen, user } = await renderPage();
    const select = await screen.findByTestId("price-market-select");
    expect(select).toBeTruthy();
    expect((select as unknown as { value: string }).value).toBe("NG");
    expect(
      (select as unknown as { textContent: string }).textContent,
    ).toContain("United States");
  });
});
