import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlasterRenderCalculator from "./PlasterRenderCalculator";

function renderPage() {
  return render(
    <MemoryRouter>
      <PlasterRenderCalculator />
    </MemoryRouter>,
  );
}

describe("PlasterRenderCalculator", () => {
  it("renders the system choices and a calculated result", () => {
    renderPage();
    expect(
      screen.getAllByText(/Interior gypsum plaster/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Exterior render/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Tyrolene textured render/i).length,
    ).toBeGreaterThan(0);
    // default system is exterior render: its topcoat line must appear
    expect(screen.getAllByText(/Topcoat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/primer/i).length).toBeGreaterThan(0);
  });

  it("carries the how-to, cost and about blocks a catalogued calculator owes", () => {
    renderPage();
    expect(screen.getByText(/How to use this calculator/i)).toBeTruthy();
    expect(screen.getByText(/How much does plastering cost/i)).toBeTruthy();
    expect(screen.getByTestId("about-this-tool")).toBeTruthy();
  });
});
