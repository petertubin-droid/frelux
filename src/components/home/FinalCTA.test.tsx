import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinalCTA from "@/components/home/FinalCTA";

// Mock useScrollReveal
vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: vi.fn(() => ({
    ref: { current: null },
    isVisible: true,
  })),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <FinalCTA />
    </MemoryRouter>,
  );
}

describe("FinalCTA", () => {
  it("renders heading with 'before you buy' text", () => {
    renderComponent();
    expect(screen.getByText(/before you buy/)).toBeTruthy();
  });

  it("renders Start Calculating button", () => {
    renderComponent();
    expect(screen.getByText("Start Calculating")).toBeTruthy();
  });

  it("renders Estimate Cost button", () => {
    renderComponent();
    expect(screen.getByText("Estimate Cost")).toBeTruthy();
  });

  it("Start Calculating links to paint calculator", () => {
    renderComponent();
    const link = screen.getByText("Start Calculating").closest("a");
    expect(link?.getAttribute("href")).toContain("/paint-calculator");
  });
});
