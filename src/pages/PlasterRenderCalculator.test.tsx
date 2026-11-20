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
    expect(screen.getByText(/Interior gypsum plaster/i)).toBeTruthy();
    expect(screen.getByText(/Exterior render/i)).toBeTruthy();
    expect(screen.getByText(/Tyrolene textured render/i)).toBeTruthy();
    // default system is exterior render: its topcoat line must appear
    expect(screen.getAllByText(/Topcoat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/primer/i).length).toBeGreaterThan(0);
  });
});
