import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CableSizingCheck from "./CableSizingCheck";

describe("CableSizingCheck", () => {
  it("shows a compliant size and the volt drop for the default run", () => {
    render(<CableSizingCheck />);
    expect(screen.getByText(/Smallest compliant size: 2\.5 mm²/)).toBeTruthy();
    expect(screen.getAllByText(/against a 5% limit/).length).toBeGreaterThan(0);
  });

  it("offers a three phase supply and a power factor", () => {
    render(<CableSizingCheck />);
    expect(screen.getByLabelText(/Supply/)).toBeTruthy();
    expect(screen.getByLabelText(/Power factor/)).toBeTruthy();
  });
});
