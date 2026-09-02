import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ColorPreview from "@/components/home/ColorPreview";

vi.mock("@/lib/queries", () => ({
  fetchColorCombinations: vi.fn().mockResolvedValue({ data: [] }),
  fetchColorCategories: vi.fn().mockResolvedValue({ data: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <ColorPreview />
    </MemoryRouter>,
  );
}

describe("ColorPreview", () => {
  it("renders section heading", () => {
    renderComponent();
    expect(screen.getByText("Find colors that fit your space")).toBeTruthy();
  });

  it("renders View all colors link", () => {
    renderComponent();
    const link = screen.getByText("View all colors").closest("a");
    expect(link?.getAttribute("href")).toBe("/colors");
  });

  it("renders loading state initially", () => {
    renderComponent();
    expect(screen.getByText(/Loading color palettes/)).toBeTruthy();
  });
});
