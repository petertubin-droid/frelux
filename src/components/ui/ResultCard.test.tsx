import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResultCard from "@/components/ui/ResultCard";

const defaultProps = {
  title: "Paint Estimate",
  subtitle: "12×12 room, 2 coats",
  stats: [
    { label: "Paint", value: "12 L" },
    { label: "Cost", value: "₦45,000", highlight: true },
  ],
  grandTotal: 45000,
  currencySymbol: "₦",
};

function renderComponent(overrides?: Record<string, unknown>) {
  return render(<ResultCard {...defaultProps} {...overrides} />);
}

describe("ResultCard", () => {
  it("renders the title", () => {
    renderComponent();
    expect(screen.getByText("Paint Estimate")).toBeTruthy();
  });

  it("renders the subtitle", () => {
    renderComponent();
    expect(screen.getByText("12×12 room, 2 coats")).toBeTruthy();
  });

  it("renders stat labels and values", () => {
    renderComponent();
    expect(screen.getByText("Paint")).toBeTruthy();
    expect(screen.getByText("12 L")).toBeTruthy();
    expect(screen.getByText("Cost")).toBeTruthy();
  });

  it("renders Grand Total label", () => {
    renderComponent();
    expect(screen.getByText("Grand Total")).toBeTruthy();
  });

  it("formats grand total with locale formatting", () => {
    renderComponent({ grandTotal: 1234567 });
    expect(screen.getByText("1,234,567")).toBeTruthy();
  });

  it("renders Save button when onSave is provided", () => {
    const onSave = vi.fn();
    renderComponent({ onSave });
    expect(screen.getByText("Save")).toBeTruthy();
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("renders Export PDF button when onExport is provided", () => {
    const onExport = vi.fn();
    renderComponent({ onExport });
    expect(screen.getByText("Export PDF")).toBeTruthy();
    fireEvent.click(screen.getByText("Export PDF"));
    expect(onExport).toHaveBeenCalled();
  });

  it("renders Share button when onShare is provided", () => {
    renderComponent({ onShare: vi.fn() });
    expect(screen.getByText("Share")).toBeTruthy();
  });

  it("renders Ask AI button when onAskAi is provided", () => {
    renderComponent({ onAskAi: vi.fn() });
    expect(screen.getByText("Ask AI")).toBeTruthy();
  });

  it("renders Recalculate button when onRecalculate is provided", () => {
    renderComponent({ onRecalculate: vi.fn() });
    expect(screen.getByText("Recalculate")).toBeTruthy();
  });

  it("does not render action buttons when handlers are not provided", () => {
    renderComponent();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Export PDF")).toBeNull();
    expect(screen.queryByText("Share")).toBeNull();
    expect(screen.queryByText("Ask AI")).toBeNull();
    expect(screen.queryByText("Recalculate")).toBeNull();
  });

  it("renders children when provided", () => {
    render(
      <ResultCard {...defaultProps}>
        <div data-testid="child-content">Extra info</div>
      </ResultCard>,
    );
    expect(screen.getByTestId("child-content")).toBeTruthy();
  });

  it("does not render subtitle when not provided", () => {
    render(
      <ResultCard
        title="No Subtitle"
        stats={defaultProps.stats}
        grandTotal={100}
        currencySymbol="₦"
      />,
    );
    expect(screen.queryByText("12×12 room, 2 coats")).toBeNull();
  });
});
