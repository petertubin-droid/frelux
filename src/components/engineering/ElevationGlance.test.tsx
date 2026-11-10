import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ElevationGlance } from "./ElevationGlance";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "@/lib/engineering/mathematical-elevation-engine";

const result = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

describe("ElevationGlance", () => {
  it("leads with the four answers a client asks for", () => {
    render(<ElevationGlance result={result} unitSystem="metric" />);
    expect(screen.getByText("Height to the roof peak")).toBeTruthy();
    expect(screen.getByText("Height to the eaves")).toBeTruthy();
    expect(screen.getByText("Roof surface area")).toBeTruthy();
    expect(screen.getByText("Wall area to build")).toBeTruthy();
  });

  it("labels the default hip roof area as not assessed", () => {
    render(<ElevationGlance result={result} unitSystem="metric" />);
    expect(screen.getByText(/not assessed/i)).toBeTruthy();
    expect(screen.getByText(/Roof form “hip” is not modeled/)).toBeTruthy();
  });

  it("shows feet when the page is in imperial", () => {
    render(<ElevationGlance result={result} unitSystem="imperial" />);
    expect(screen.getAllByText(/ft/).length).toBeGreaterThan(0);
  });
});
