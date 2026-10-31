import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MacroTrackerCard } from "./MacroTrackerCard";

describe("MacroTrackerCard Component", () => {
  it("does not display sample macro indicators when live database data is unavailable", async () => {
    render(<MacroTrackerCard marketCode="KE" countryName="Kenya" />);
    expect(screen.getByText("The Fluctuation Filter")).toBeDefined();
    expect(
      await screen.findByText(
        /No macro indices registered for this market yet/i,
      ),
    ).toBeDefined();
    expect(
      screen.queryByText(/KNBS Wholesale Reinforcement Steel/i),
    ).toBeNull();
  });

  it("handles empty or unmapped markets gracefully", async () => {
    render(<MacroTrackerCard marketCode="ZZ" countryName="Unknown" />);
    expect(screen.getByText("The Fluctuation Filter")).toBeDefined();
    expect(
      await screen.findByText(
        /No macro indices registered for this market yet/i,
      ),
    ).toBeDefined();
  });
});
