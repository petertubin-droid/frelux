import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuickCalculatorShortcuts from "@/components/ui/QuickCalculatorShortcuts";

function renderComponent() {
  return render(
    <MemoryRouter>
      <QuickCalculatorShortcuts />
    </MemoryRouter>,
  );
}

describe("QuickCalculatorShortcuts", () => {
  it("renders section heading", () => {
    renderComponent();
    expect(screen.getByText("Quick Access")).toBeTruthy();
  });

  it("renders all 4 calculator shortcuts", () => {
    renderComponent();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Finish Estimator")).toBeTruthy();
    expect(screen.getByText("POP Ceiling")).toBeTruthy();
    expect(screen.getByText("Tile Calculator")).toBeTruthy();
  });

  it("renders descriptions for each shortcut", () => {
    renderComponent();
    expect(
      screen.getByText("Calculate paint quantities and costs"),
    ).toBeTruthy();
    expect(
      screen.getByText("Estimate POP ceiling materials"),
    ).toBeTruthy();
  });

  it("renders 'Popular' badge on Paint Calculator", () => {
    renderComponent();
    expect(screen.getByText("Popular")).toBeTruthy();
  });

  it("renders link to My Projects", () => {
    renderComponent();
    expect(screen.getByText("My Projects")).toBeTruthy();
  });

  it("renders 'Open' label for each shortcut", () => {
    renderComponent();
    const openLabels = screen.getAllByText("Open");
    expect(openLabels.length).toBe(4);
  });
});
