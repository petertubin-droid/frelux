import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PipeSizingPanel from "./PipeSizingPanel";

describe("PipeSizingPanel", () => {
  it("sizes the default network and shows the working", () => {
    render(<PipeSizingPanel />);
    expect(screen.getByText(/Smallest size: \d+ mm PPR/)).toBeTruthy();
    expect(screen.getByText(/simultaneity/)).toBeTruthy();
  });

  it("exposes the velocity limit and pipe system", () => {
    render(<PipeSizingPanel />);
    expect(screen.getByLabelText(/Velocity limit/)).toBeTruthy();
    expect(screen.getByLabelText(/Pipe system/)).toBeTruthy();
  });

  it("switches to Hunter's Curve Peak Demand mode and computes WSFU supply main", () => {
    render(<PipeSizingPanel />);
    const tabButton = screen.getByRole("button", {
      name: /Hunter's Curve Peak Demand/i,
    });
    fireEvent.click(tabButton);

    expect(
      screen.getByText(/Peak Water Demand & Service Line Size/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/IPC 2024 Appendix E \/ UPC 2024 Appendix A/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Peak Demand Flow/i).length).toBeGreaterThan(0);
  });
});
