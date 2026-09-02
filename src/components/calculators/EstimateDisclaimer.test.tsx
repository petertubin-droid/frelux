import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";

describe("EstimateDisclaimer", () => {
  it("renders default disclaimer text", () => {
    render(<EstimateDisclaimer />);
    expect(screen.getByText(/estimates are calculated/i)).toBeTruthy();
  });

  it("renders custom text when provided", () => {
    render(<EstimateDisclaimer text="Custom warning here" />);
    expect(screen.getByText("Custom warning here")).toBeTruthy();
  });

  it("renders alert icon", () => {
    const { container } = render(<EstimateDisclaimer />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("uses amber styling", () => {
    const { container } = render(<EstimateDisclaimer />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("amber");
  });
});
