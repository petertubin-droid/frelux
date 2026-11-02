import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import { saveLocalProject } from "@/lib/local-projects";

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
  localStorage.clear();
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/MyProjects")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("MyProjects", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("displays local device projects for unauthenticated guest users", async () => {
    saveLocalProject("Duplex POP Ceiling", "pop_calc", {
      totalCost: 250000,
      area: 80,
    });

    await renderPage();
    expect(await screen.findByText("Duplex POP Ceiling")).toBeDefined();
    expect(screen.getByText("Saved on This Device")).toBeDefined();
  });
});
