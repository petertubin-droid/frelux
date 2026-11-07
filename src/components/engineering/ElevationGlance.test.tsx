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
    expect(screen.getByText("Roof surface to cover")).toBeTruthy();
    expect(screen.getByText("Wall area to build")).toBeTruthy();
  });

  it("separates the sloping roof area from the flat footprint", () => {
    render(<ElevationGlance result={result} unitSystem="metric" />);
    const roof = result.levels.level_5_roof;
    expect(roof.true_3d_roof_area_m2).toBeGreaterThan(
      roof.horizontal_roof_footprint_m2,
    );
    expect(
      screen.getByText(/Sloping area, not the flat footprint/),
    ).toBeTruthy();
  });

  it("shows feet when the page is in imperial", () => {
    render(<ElevationGlance result={result} unitSystem="imperial" />);
    expect(screen.getAllByText(/ft/).length).toBeGreaterThan(0);
  });
});
