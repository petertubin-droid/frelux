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
  const Comp = (await import("@/pages/ClientEstimateEditor")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ClientEstimateEditor", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("exposes accessible names for all form controls", async () => {
    // Regression: every raw form control must be reachable by an accessible
    // name (label htmlFor/id association), not just a visually-adjacent label.
    const { container } = await renderPage();
    const controls = container.querySelectorAll("input, select, textarea");
    const unnamed = Array.from(controls).filter((el) => {
      const ctl = el as HTMLInputElement;
      return (
        !ctl.labels?.length &&
        !ctl.getAttribute("aria-label") &&
        !ctl.getAttribute("aria-labelledby")
      );
    });
    expect(unnamed).toEqual([]);
  });
});
