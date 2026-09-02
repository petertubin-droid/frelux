import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalculatorTabs from "@/components/ui/CalculatorTabs";

const tabs = [
  { id: "basic", label: "Basic" },
  { id: "advanced", label: "Advanced" },
  { id: "pro", label: "Pro" },
];

describe("CalculatorTabs", () => {
  it("renders all tab labels", () => {
    render(
      <CalculatorTabs tabs={tabs} activeTab="basic" onTabChange={vi.fn()} />,
    );
    expect(screen.getByText("Basic")).toBeTruthy();
    expect(screen.getByText("Advanced")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("marks active tab with aria-selected true", () => {
    render(
      <CalculatorTabs tabs={tabs} activeTab="advanced" onTabChange={vi.fn()} />,
    );
    const advancedTab = screen.getByText("Advanced");
    expect(advancedTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Basic").getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("calls onTabChange with tab id on click", () => {
    const handler = vi.fn();
    render(
      <CalculatorTabs tabs={tabs} activeTab="basic" onTabChange={handler} />,
    );
    fireEvent.click(screen.getByText("Pro"));
    expect(handler).toHaveBeenCalledWith("pro");
  });

  it("sets role=tablist with aria-label", () => {
    render(
      <CalculatorTabs
        tabs={tabs}
        activeTab="basic"
        onTabChange={vi.fn()}
        ariaLabel="Calc mode"
      />,
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist.getAttribute("aria-label")).toBe("Calc mode");
  });

  it("uses default aria-label when not provided", () => {
    render(
      <CalculatorTabs tabs={tabs} activeTab="basic" onTabChange={vi.fn()} />,
    );
    expect(screen.getByRole("tablist").getAttribute("aria-label")).toBe(
      "Calculator mode",
    );
  });

  it("sets correct aria-controls on each tab", () => {
    render(
      <CalculatorTabs tabs={tabs} activeTab="basic" onTabChange={vi.fn()} />,
    );
    expect(screen.getByText("Basic").getAttribute("aria-controls")).toBe(
      "panel-basic",
    );
    expect(screen.getByText("Pro").getAttribute("aria-controls")).toBe(
      "panel-pro",
    );
  });

  it("sets unique id on each tab", () => {
    render(
      <CalculatorTabs tabs={tabs} activeTab="basic" onTabChange={vi.fn()} />,
    );
    expect(screen.getByText("Basic").id).toBe("tab-basic");
    expect(screen.getByText("Advanced").id).toBe("tab-advanced");
  });
});
