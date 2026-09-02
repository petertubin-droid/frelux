import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommercialReadiness from "@/components/home/CommercialReadiness";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: vi.fn(() => ({
    ref: { current: null },
    isVisible: true,
  })),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <CommercialReadiness />
    </MemoryRouter>,
  );
}

describe("CommercialReadiness", () => {
  it("renders capability titles", () => {
    renderComponent();
    expect(screen.getByText("Calculate Required Materials")).toBeTruthy();
    expect(screen.getByText("Estimate Project Costs")).toBeTruthy();
    expect(screen.getByText("Save Estimates")).toBeTruthy();
  });

  it("renders link texts", () => {
    renderComponent();
    expect(screen.getByText("Start calculating")).toBeTruthy();
    expect(screen.getByText("Estimate costs")).toBeTruthy();
  });

  it("renders descriptions", () => {
    renderComponent();
    expect(screen.getByText(/Get exact quantities/)).toBeTruthy();
    expect(screen.getByText(/Convert material quantities/)).toBeTruthy();
  });
});
