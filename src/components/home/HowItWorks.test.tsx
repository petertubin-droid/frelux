import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowItWorks from "@/components/home/HowItWorks";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: vi.fn(() => ({
    ref: { current: null },
    isVisible: true,
  })),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <HowItWorks />
    </MemoryRouter>,
  );
}

describe("HowItWorks", () => {
  it("renders section heading", () => {
    renderComponent();
    expect(screen.getByText("How it works")).toBeTruthy();
  });

  it("renders main title", () => {
    renderComponent();
    expect(screen.getByText("From measurement to estimate in 4 steps")).toBeTruthy();
  });

  it("renders all 4 step titles", () => {
    renderComponent();
    expect(screen.getByText("Measure")).toBeTruthy();
    expect(screen.getByText("Calculate")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Save & Share")).toBeTruthy();
  });

  it("renders step descriptions", () => {
    renderComponent();
    expect(screen.getByText(/Input your room dimensions/)).toBeTruthy();
    expect(screen.getByText(/FRELUX computes exact quantities/)).toBeTruthy();
  });

  it("renders step numbers", () => {
    renderComponent();
    expect(screen.getByText("01")).toBeTruthy();
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByText("03")).toBeTruthy();
    expect(screen.getByText("04")).toBeTruthy();
  });
});
