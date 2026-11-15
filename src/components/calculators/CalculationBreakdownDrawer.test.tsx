import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CalculationBreakdownDrawer from "./CalculationBreakdownDrawer";

describe("CalculationBreakdownDrawer", () => {
  it("renders collapsed by default and expands on click", () => {
    render(
      <CalculationBreakdownDrawer
        title="Painting Breakdown"
        methodologyText="Coverage calculated at 10 m²/L over 2 coats"
        geometryBreakdown={{
          grossAreaM2: 41.58,
          deductionsM2: 5.22,
          netAreaM2: 36.36,
          dimensionsSummary: "4.5m × 3.2m × 2.7m",
        }}
        physicalFactors={{
          mortarDryFactor: 1.33,
        }}
        siteModifiers={{
          surfacePorosity: "Raw / Newly Plastered Wall",
          porosityMultiplier: 0.75,
        }}
        packagingDetails={{
          theoreticalAmount: 7.27,
          practicalPurchaseAmount: 1,
          unitLabel: "litres",
          packSizeLabel: "20L bucket",
          surplusQuantity: 12.73,
        }}
        calibrationEvidence={{
          baselineQuantity: 7.27,
          shadowMultiplier: 1.05,
          approvedDecision: "baseline_active",
          confidenceInterval: { low: 7.0, likely: 7.3, high: 7.6 },
          outliersFilteredCount: 1,
        }}
      />,
    );

    const toggleButton = screen.getByRole("button", {
      name: /Painting Breakdown/i,
    });
    expect(toggleButton).toBeInTheDocument();
    expect(screen.queryByText(/Geometric Takeoff/i)).not.toBeInTheDocument();

    // Expand drawer
    fireEvent.click(toggleButton);

    expect(screen.getByText(/Geometric Takeoff/i)).toBeInTheDocument();
    expect(screen.getByText("36.36 m²")).toBeInTheDocument();
    expect(screen.getByText(/Raw \/ Newly Plastered Wall/i)).toBeInTheDocument();
    expect(screen.getByText(/1 20L bucket/i)).toBeInTheDocument();
    expect(screen.getByText(/1 records/i)).toBeInTheDocument();
  });
});
