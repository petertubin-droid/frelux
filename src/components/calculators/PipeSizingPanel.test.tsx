import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
