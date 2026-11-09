import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TrendingUp, Receipt, Wallet } from "lucide-react";
import { ProjectTabBar } from "@/components/contractor/ProjectTabBar";

const tabs = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "money", label: "Invoices & Payments", icon: Wallet },
] as const;

describe("ProjectTabBar", () => {
  it("exposes sections as tabs, not as current-page links", () => {
    render(
      <ProjectTabBar
        tabs={tabs}
        activeTab="expenses"
        onChange={vi.fn()}
        label="Project sections"
        panelId="panel"
      />,
    );

    expect(
      screen.getByRole("tablist", { name: "Project sections" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(
      screen
        .getByRole("tab", { name: "Expenses" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByRole("tab", { name: "Overview" })
        .getAttribute("aria-selected"),
    ).toBe("false");
    // aria-current belongs to navigation links; a tab is not a page.
    expect(document.querySelector('[aria-current="page"]')).toBeNull();
  });

  it("puts only the active tab in the tab order", () => {
    render(
      <ProjectTabBar
        tabs={tabs}
        activeTab="money"
        onChange={vi.fn()}
        label="Project sections"
        panelId="panel"
      />,
    );

    expect(
      screen
        .getByRole("tab", { name: "Invoices & Payments" })
        .getAttribute("tabindex"),
    ).toBe("0");
    expect(
      screen.getByRole("tab", { name: "Overview" }).getAttribute("tabindex"),
    ).toBe("-1");
  });

  it("moves between sections with the arrow keys, Home and End", () => {
    const onChange = vi.fn();
    render(
      <ProjectTabBar
        tabs={tabs}
        activeTab="overview"
        onChange={onChange}
        label="Project sections"
        panelId="panel"
      />,
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("expenses");

    fireEvent.keyDown(overview, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("money");

    fireEvent.keyDown(overview, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("overview");

    // Left from the first tab wraps to the last, as native tablists do.
    fireEvent.keyDown(overview, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("money");
  });

  it("points every tab at the panel it controls", () => {
    render(
      <ProjectTabBar
        tabs={tabs}
        activeTab="expenses"
        onChange={vi.fn()}
        label="Project sections"
        panelId="project-tab-panel"
      />,
    );

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.getAttribute("aria-controls")).toBe("project-tab-panel");
    }
  });
});
