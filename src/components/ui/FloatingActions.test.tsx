import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FloatingActions from "@/components/ui/FloatingActions";

function renderFA() {
  return render(
    <MemoryRouter>
      <FloatingActions />
    </MemoryRouter>,
  );
}

describe("FloatingActions", () => {
  it("renders toggle button with aria-label", () => {
    renderFA();
    expect(screen.getByLabelText("Open quick actions")).toBeTruthy();
  });

  it("does not show action links when closed", () => {
    renderFA();
    expect(screen.queryByLabelText("Paint Calculator")).toBeNull();
  });

  it("shows action links when opened", () => {
    renderFA();
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    expect(screen.getByLabelText("Paint Calculator")).toBeTruthy();
    expect(screen.getByLabelText("POP Ceiling Calculator")).toBeTruthy();
    expect(screen.getByLabelText("Tile Calculator")).toBeTruthy();
    expect(screen.getByLabelText("Finish Estimator")).toBeTruthy();
    expect(screen.getByLabelText("Smart Color Assistant")).toBeTruthy();
    expect(screen.getByLabelText("My Projects")).toBeTruthy();
  });

  it("changes aria-label to close when open", () => {
    renderFA();
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    expect(screen.getByLabelText("Close quick actions")).toBeTruthy();
  });

  it("closes after clicking an action link", () => {
    renderFA();
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    fireEvent.click(screen.getByLabelText("Paint Calculator"));
    expect(screen.queryByLabelText("Paint Calculator")).toBeNull();
  });

  it("sets aria-expanded correctly", () => {
    renderFA();
    const btn = screen.getByLabelText("Open quick actions");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});
