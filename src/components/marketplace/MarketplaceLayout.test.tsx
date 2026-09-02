import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => { vi.clearAllMocks(); });

async function renderComp() {
  const Comp = (await import("@/components/marketplace/MarketplaceLayout")).default;
  const { CreditsProvider } = await import("@/lib/credits-context");
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CreditsProvider>
          <Comp />
        </CreditsProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("MarketplaceLayout", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    expect(container.innerHTML).not.toBe("");
  });
});
