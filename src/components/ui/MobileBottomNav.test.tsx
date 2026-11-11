import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { MemoryRouter } from "react-router-dom";
import MobileBottomNav from "@/components/ui/MobileBottomNav";

import type { UsageStats } from "@/lib/achievements";

const EMPTY_STATS: UsageStats = {
  totalCalculations: 0,
  paintCalcs: 0,
  costEstimates: 0,
  screedingCalcs: 0,
  tileCalcs: 0,
  popCalcs: 0,
  finishEstimates: 0,
  colorsViewed: 0,
  colorsFavorited: 0,
  projectsSaved: 0,
  projectsShared: 0,
  aiAssistants: 0,
  lastVisit: new Date().toISOString(),
  visitStreak: 0,
  totalVisits: 0,
};

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
    expect(screen.getByText("Tools")).toBeTruthy();
    expect(screen.getByText("Market")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("Rewards")).toBeTruthy();
  });

  it("marks the current route as active", () => {
    renderNav("/construction-tools");
    const toolsLink = screen.getByText("Tools").closest("a");
    expect(toolsLink?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark non-current routes as active", () => {
    renderNav("/construction-tools");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBeNull();
  });

  it("marks home as active only on exact match", () => {
    renderNav("/");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark home as active on sub-routes", () => {
    renderNav("/construction-tools");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBeNull();
  });

  it("shows achievement badge count when unlocked > 0", async () => {
    const { getAchievements } = await import("@/lib/achievements");
    vi.mocked(getAchievements).mockReturnValue({
      unlocked: [
        { id: "a1", unlockedAt: new Date().toISOString() },
        { id: "a2", unlockedAt: new Date().toISOString() },
        { id: "a3", unlockedAt: new Date().toISOString() },
      ],
      stats: EMPTY_STATS,
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

  it("sits exactly where it always has when no bottom ad is showing", () => {
    render(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", { name: "Bottom navigation" });
    // The ad's published height is the only variable in the offset, and it
    // resolves to 0px when nothing is filled.
    // jsdom cannot parse env(), so the rule is checked where it lives.
    const css = readFileSync("src/index.css", "utf8");
    expect(nav.className).toContain("mobile-bottom-nav");
    expect(css).toContain(".mobile-bottom-nav {");
    expect(css).toContain("var(--frelux-bottom-ad-h, 0px)");
    expect(nav.className).toContain("md:hidden");
  });

  it("keeps each navigation link at a 44px physical touch target on scaled phones", () => {
    renderNav();
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/#root \.mobile-bottom-nav a,[\s\S]*?min-height: max\(2\.75rem, calc\(2\.75rem \/ var\(--frelux-display-scale, 1\)\)\)/);
    for (const label of ["Home", "Tools", "Market", "Projects", "Rewards"]) {
      expect(screen.getByText(label).closest("a")?.className).toContain("min-h-11");
    }
  });

  it("lifts by the ad height without changing its own size or alignment", () => {
    render(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", { name: "Bottom navigation" });
    // Responsive, but the same bar: one centred strip capped on wider phones,
    // still inset by the same 12px on either side.
    expect(nav.className).toContain("mx-auto");
    expect(nav.className).toContain("max-w-[520px]");
    expect(nav.className).toContain("inset-x-3");
    expect(nav.className).toContain("rounded-[26px]");
    expect(readFileSync("src/index.css", "utf8")).toContain(
      "transition: bottom 200ms ease",
    );
  });
});
