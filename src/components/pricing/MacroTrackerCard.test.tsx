import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MacroTrackerCard } from "./MacroTrackerCard";

describe("MacroTrackerCard Component", () => {
  it("renders Kenya macro economic indicators and elasticity rules", async () => {
    render(<MacroTrackerCard marketCode="KE" countryName="Kenya" />);

    expect(screen.getByText("The Fluctuation Filter")).toBeDefined();

    await waitFor(() => {
      expect(
        screen.getByText(/KNBS Wholesale Reinforcement Steel/i),
      ).toBeDefined();
    });

    expect(screen.getByText("+6.03% (30d)")).toBeDefined();
    expect(screen.getByText("1x")).toBeDefined();
  });

  it("handles empty or unmapped markets gracefully", async () => {
    render(<MacroTrackerCard marketCode="ZZ" countryName="Unknown" />);
    expect(screen.getByText("The Fluctuation Filter")).toBeDefined();
  });
});
