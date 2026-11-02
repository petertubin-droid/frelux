import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));
vi.mock("@/lib/queries", () => ({ fetchLegalPage: vi.fn().mockResolvedValue({ data: null, error: null }) }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/legal/Terms")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Terms", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
