import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";

describe("HowCalculatedSection", () => {
  it("returns null when no methodology and no assumptions", () => {
    const { container } = render(<HowCalculatedSection methodologyText="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders methodology text", () => {
    render(<HowCalculatedSection methodologyText="We use standard formulas" />);
    expect(screen.getByText(/How this estimate is calculated/i)).toBeTruthy();
  });

  it("is collapsed by default", () => {
    render(<HowCalculatedSection methodologyText="Method here" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("expands on click showing methodology text", () => {
    render(<HowCalculatedSection methodologyText="The secret formula" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("The secret formula")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("renders assumptions list when provided and expanded", () => {
    render(
      <HowCalculatedSection
        methodologyText="Method"
        assumptions={[
          { label: "Coverage", value: "10 m²/L" },
          { label: "Coats", value: "2" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Coverage")).toBeTruthy();
    expect(screen.getByText("10 m²/L")).toBeTruthy();
    expect(screen.getByText("Coats")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("renders price source when provided and expanded", () => {
    render(
      <HowCalculatedSection
        methodologyText="Method"
        priceSource="Lagos market survey"
        priceSourceDate="January 2025"
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Lagos market survey/i)).toBeTruthy();
  });
});
