import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeaturedTemplates from "@/components/home/FeaturedTemplates";

vi.mock("@/lib/templates", () => ({
  getPublicTemplates: vi.fn().mockResolvedValue([]),
  calculatorLabel: vi.fn((t: string) => t),
  CALCULATOR_META: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <FeaturedTemplates />
    </MemoryRouter>,
  );
}

describe("FeaturedTemplates", () => {
  it("renders section heading", () => {
    renderComponent();
    expect(screen.getByText("Popular Calculator Templates")).toBeTruthy();
  });

  it("renders subtitle", () => {
    renderComponent();
    expect(
      screen.getByText(/Pre-configured scenarios/),
    ).toBeTruthy();
  });

  it("shows loading state initially", () => {
    renderComponent();
    // Loading shows 8 pulse placeholders
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });
});
