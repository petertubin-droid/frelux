import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StructuralScopeNotice from "./StructuralScopeNotice";

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ marketCode: "US" }),
}));

describe("StructuralScopeNotice", () => {
  it("states engineer approval is required and gives a practical review checklist", () => {
    render(<StructuralScopeNotice />);
    expect(
      screen.getByTestId("engineer-approval-notice").textContent,
    ).toContain(
      "Calculations will need a locally licensed engineer's approval",
    );
    expect(screen.getByText(/project loads, load combinations/)).toBeTruthy();
  });

  it("tailors review guidance for foundation calculations", () => {
    render(<StructuralScopeNotice discipline="foundation" />);
    expect(
      screen.getByText(
        /geotechnical report, groundwater and settlement criteria/,
      ),
    ).toBeTruthy();
  });
});
