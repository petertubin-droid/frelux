import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeaturesSection from "@/components/home/FeaturesSection";

function renderComponent() {
  return render(
    <MemoryRouter>
      <FeaturesSection />
    </MemoryRouter>,
  );
}

describe("FeaturesSection", () => {
  it("renders section heading label", () => {
    renderComponent();
    expect(screen.getByText("Why FRELUX")).toBeTruthy();
  });

  it("renders section title", () => {
    renderComponent();
    expect(screen.getByText("Tools that respect your time and budget")).toBeTruthy();
  });

  it("renders all 4 feature titles", () => {
    renderComponent();
    expect(screen.getByText("Practical calculations")).toBeTruthy();
    expect(screen.getByText("Transparent cost estimates")).toBeTruthy();
    expect(screen.getByText("Curated color palettes")).toBeTruthy();
    expect(screen.getByText("Built for real use")).toBeTruthy();
  });

  it("renders feature descriptions", () => {
    renderComponent();
    expect(screen.getByText(/Enter your measurements/)).toBeTruthy();
    expect(screen.getByText(/Break down materials/)).toBeTruthy();
  });

  it("renders Start planning link", () => {
    renderComponent();
    const link = screen.getByText("Start planning").closest("a");
    expect(link?.getAttribute("href")).toBe("/paint-calculator");
  });
});
