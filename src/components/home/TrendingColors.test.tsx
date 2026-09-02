import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TrendingColors from "@/components/home/TrendingColors";

vi.mock("@/lib/queries", () => ({
  fetchTrendingColors: vi.fn().mockResolvedValue({ data: [] }),
  fetchFeaturedColors: vi.fn().mockResolvedValue({ data: [] }),
  fetchRecentlyAddedColors: vi.fn().mockResolvedValue({ data: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <TrendingColors />
    </MemoryRouter>,
  );
}

describe("TrendingColors", () => {
  it("returns null when no colors and not loading", async () => {
    const { container } = renderComponent();
    // Wait for loading to finish
    await new Promise((r) => setTimeout(r, 100));
    expect(container.innerHTML).toBe("");
  });

  it("shows loading skeletons initially", () => {
    renderComponent();
    // While loading, should show skeleton grid
    const { container } = renderComponent();
    expect(container.innerHTML).not.toBe("");
  });
});
