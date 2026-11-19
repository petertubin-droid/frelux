import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CableSizingCheck from "./CableSizingCheck";

describe("CableSizingCheck", () => {
  it("shows a compliant size and the volt drop for the default run", () => {
    render(<CableSizingCheck marketCode="GB" />);
    expect(
      screen.getByText(
        /Smallest listed size before installation factors: 2\.5 mm²/,
      ),
    ).toBeTruthy();
    expect(screen.getAllByText(/against a 5% limit/).length).toBeGreaterThan(0);
  });

  it("offers a three phase supply and a power factor", () => {
    render(<CableSizingCheck marketCode="GB" />);
    expect(screen.getByLabelText(/Supply/)).toBeTruthy();
    expect(screen.getByLabelText(/Power factor/)).toBeTruthy();
  });

  it("does not present UK BS 7671 sizing as a local recommendation in the US and offers preliminary North American reference", () => {
    render(<CableSizingCheck marketCode="US" />);
    expect(
      screen.getByText(/North American AWG cable planning check/i),
    ).toBeTruthy();
    expect(screen.getByText(/NEC 2023 ampacity columns/i)).toBeTruthy();
    expect(screen.queryByText(/BS 7671/i)).toBeNull();
  });

  it("marks BS 7671 unavailable when unconfigured markets without dedicated engines are selected", () => {
    render(<CableSizingCheck marketCode="DE" />);
    expect(screen.getByText(/unavailable for DE/i)).toBeTruthy();
    expect(screen.getByText(/not validated for this market/i)).toBeTruthy();
  });
});
