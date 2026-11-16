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

  it("renders rich engineering breakdown sections when provided", () => {
    render(
      <HowCalculatedSection
        methodologyText="Engineering method"
        geometryBreakdown={{
          grossAreaM2: 120.5,
          deductionsM2: 15.5,
          netAreaM2: 105.0,
          dimensionsSummary: "10 x 12 m",
        }}
        physicalFactors={{
          dryVolumeBulkingFactor: 1.54,
          mortarDryFactor: 1.33,
        }}
        siteModifiers={{
          surfacePorosity: "Raw cement plaster",
          porosityMultiplier: 0.75,
        }}
        packagingDetails={{
          theoreticalAmount: 14.2,
          practicalPurchaseAmount: 16,
          unitLabel: "litres",
          packSizeLabel: "4L drums",
          surplusQuantity: 1.8,
        }}
        calibrationEvidence={{
          baselineQuantity: 14.2,
          shadowMultiplier: 1.05,
          approvedDecision: "baseline_active",
          outliersFilteredCount: 2,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Geometric Takeoff")).toBeTruthy();
    expect(screen.getByText("105.00 m²")).toBeTruthy();
    expect(
      screen.getByText("Physical Bulking & Shrinkage Factors"),
    ).toBeTruthy();
    expect(
      screen.getByText("Site Variables & Substrate Conditions"),
    ).toBeTruthy();
    expect(screen.getByText(/Raw cement plaster/)).toBeTruthy();
    expect(screen.getByText("Packaging & Purchase Rounding")).toBeTruthy();
    expect(screen.getByText(/16 4L drums/)).toBeTruthy();
    expect(screen.getByText("Adaptive Calibration & Guardrails")).toBeTruthy();
    expect(screen.getByText(/1.050×/)).toBeTruthy();
  });
});

describe("calculation methodology anchor", () => {
  it("exposes a stable target for calculator-header links", () => {
    const { container } = render(
      <HowCalculatedSection methodologyText="Area is measured from entered dimensions." />,
    );
    expect(container.querySelector("#calculation-methodology")).toBeTruthy();
  });
});
