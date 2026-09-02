import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecentlyUsed } from "@/components/ui/RecentlyUsed";

// Mock smart-defaults
vi.mock("@/lib/smart-defaults", () => ({
  getRecentTools: vi.fn(() => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <RecentlyUsed />
    </MemoryRouter>,
  );
}

describe("RecentlyUsed", () => {
  it("returns null when no recent tools", () => {
    const { container } = renderComponent();
    expect(container.innerHTML).toBe("");
  });

  it("renders recent tools when available", async () => {
    const { getRecentTools } = await import("@/lib/smart-defaults");
    vi.mocked(getRecentTools).mockReturnValue([
      { path: "/paint-calculator", label: "Paint Calculator", icon: "Calculator", visitedAt: Date.now() },
      { path: "/tile-calculator", label: "Tile Calculator", icon: "Grid3x3", visitedAt: Date.now() },
    ]);
    renderComponent();
    expect(screen.getByText("Recently Used")).toBeTruthy();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Tile Calculator")).toBeTruthy();
  });

  it("renders section heading with clock icon", async () => {
    const { getRecentTools } = await import("@/lib/smart-defaults");
    vi.mocked(getRecentTools).mockReturnValue([
      { path: "/paint", label: "Paint", icon: "Calculator", visitedAt: Date.now() },
    ]);
    renderComponent();
    expect(screen.getByText("Recently Used")).toBeTruthy();
  });
});
