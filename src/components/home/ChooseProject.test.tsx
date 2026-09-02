import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChooseProject from "@/components/home/ChooseProject";

function renderComponent() {
  return render(
    <MemoryRouter>
      <ChooseProject />
    </MemoryRouter>,
  );
}

describe("ChooseProject", () => {
  it("renders all project card titles", () => {
    renderComponent();
    expect(screen.getByText("Painting")).toBeTruthy();
    expect(screen.getByText("Tiles")).toBeTruthy();
    expect(screen.getByText("Screeding")).toBeTruthy();
    expect(screen.getByText("POP Ceiling")).toBeTruthy();
  });

  it("renders project descriptions", () => {
    renderComponent();
    expect(screen.getByText(/Calculate paint quantities/)).toBeTruthy();
    expect(screen.getByText(/Estimate tile count/)).toBeTruthy();
  });

  it("renders links to correct routes", () => {
    renderComponent();
    const paintLink = screen.getByText("Painting").closest("a");
    expect(paintLink?.getAttribute("href")).toBe("/paint-calculator");
    const tileLink = screen.getByText("Tiles").closest("a");
    expect(tileLink?.getAttribute("href")).toBe("/tile-calculator");
  });
});
