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

async function renderNavbar() {
  const Navbar = (await import("@/components/layout/Navbar")).default;
  const { CreditsProvider } = await import("@/lib/credits-context");
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CreditsProvider>
          <Navbar />
        </CreditsProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  it("renders without crashing", async () => {
    const { container } = await renderNavbar();
    expect(container.innerHTML).not.toBe("");
  });
});
