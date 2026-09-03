import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileBottomNav from "@/components/ui/MobileBottomNav";

// Mock achievements
vi.mock("@/lib/achievements", () => ({
  getAchievements: vi.fn(() => ({ unlocked: [], stats: {} })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderNav(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MobileBottomNav />
    </MemoryRouter>,
  );
}

describe("MobileBottomNav", () => {
  it("renders nav with aria-label", () => {
    renderNav();
    expect(screen.getByLabelText("Bottom navigation")).toBeTruthy();
  });

  it("renders all 5 nav items", () => {
    renderNav();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Calculate")).toBeTruthy();
    expect(screen.getByText("Market")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("Rewards")).toBeTruthy();
  });

  it("marks the current route as active", () => {
    renderNav("/paint-calculator");
    const calculateLink = screen.getByText("Calculate").closest("a");
    expect(calculateLink?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark non-current routes as active", () => {
    renderNav("/paint-calculator");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBeNull();
  });

  it("marks home as active only on exact match", () => {
    renderNav("/");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark home as active on sub-routes", () => {
    renderNav("/paint-calculator");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBeNull();
  });

  it("shows achievement badge count when unlocked > 0", async () => {
    const { getAchievements } = await import("@/lib/achievements");
    vi.mocked(getAchievements).mockReturnValue({
      unlocked: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
      stats: {},
    });
    renderNav("/");
    // The badge should show "3"
    const badge = screen.queryByText("3");
    expect(badge).toBeTruthy();
  });

  it("does not show badge when unlocked is 0", () => {
    renderNav();
    // No number badge should appear
    expect(screen.queryByText("0")).toBeNull();
  });
});
