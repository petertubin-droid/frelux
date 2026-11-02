import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResultDisplay from "@/components/ui/ResultDisplay";

const defaultProps = {
  badge: "Complete",
  subtitle: "Your estimate is ready",
  primaryValue: "₦45,000",
  primaryUnit: "NGN",
  primaryLabel: "Total estimated cost",
  stats: [
    { label: "Paint", value: "12 litres" },
    { label: "Cost", value: "₦45,000", highlight: true },
  ],
  footerNote: "Estimates are approximate.",
  onAgain: vi.fn(),
  onStartOver: vi.fn(),
};

function renderComponent(overrides?: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <ResultDisplay {...defaultProps} {...overrides} />
    </MemoryRouter>,
  );
}

describe("ResultDisplay", () => {
  it("renders the badge text", () => {
    renderComponent();
    expect(screen.getByText("Complete")).toBeTruthy();
  });

  it("renders subtitle", () => {
    renderComponent();
    expect(screen.getByText("Your estimate is ready")).toBeTruthy();
  });

  it("renders primary value and unit", () => {
    renderComponent();
    expect(screen.getAllByText("₦45,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("NGN")).toBeTruthy();
  });

  it("renders primary label", () => {
    renderComponent();
    expect(screen.getByText("Total estimated cost")).toBeTruthy();
  });

  it("renders stats labels and values", () => {
    renderComponent();
    expect(screen.getByText("Paint")).toBeTruthy();
    expect(screen.getByText("12 litres")).toBeTruthy();
    expect(screen.getByText("Cost")).toBeTruthy();
  });

  it("renders footer note", () => {
    renderComponent();
    expect(screen.getByText("Estimates are approximate.")).toBeTruthy();
  });

  it("calls onAgain when Calculate Again is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Calculate Again"));
    expect(defaultProps.onAgain).toHaveBeenCalled();
  });

  it("calls onStartOver when Start Over is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Start Over"));
    expect(defaultProps.onStartOver).toHaveBeenCalled();
  });

  it("renders continue link when continueTo is provided", () => {
    renderComponent({
      continueTo: "/cost-estimator",
      continueLabel: "Continue to Cost Estimate",
    });
    expect(screen.getByText("Continue to Cost Estimate")).toBeTruthy();
  });

  it("does not render continue link when continueTo is not provided", () => {
    renderComponent();
    expect(screen.queryByText("Continue to Cost Estimate")).toBeNull();
  });

  it("uses custom continue label", () => {
    renderComponent({
      continueTo: "/tile-calculator",
      continueLabel: "Go to Tiles",
    });
    expect(screen.getByText("Go to Tiles")).toBeTruthy();
  });
});
