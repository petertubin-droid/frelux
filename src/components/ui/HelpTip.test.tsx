import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpTip from "@/components/ui/HelpTip";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HelpTip", () => {
  it("renders a help circle button", () => {
    render(<HelpTip text="Some helpful text" />);
    expect(screen.getByLabelText("More information")).toBeTruthy();
  });

  it("does not show tooltip by default", () => {
    render(<HelpTip text="Secret tip" />);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows tooltip on hover (mouseEnter)", () => {
    render(<HelpTip text="Hover tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toBe("Hover tip");
  });

  it("hides tooltip on mouse leave", () => {
    render(<HelpTip text="Hover tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows tooltip on focus", () => {
    render(<HelpTip text="Focus tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("hides tooltip on blur", () => {
    render(<HelpTip text="Focus tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("toggles tooltip on click", () => {
    render(<HelpTip text="Click tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders children alongside the button", () => {
    render(
      <HelpTip text="Info">
        <span>Label</span>
      </HelpTip>,
    );
    expect(screen.getByText("Label")).toBeTruthy();
  });

  it("applies top position class by default", () => {
    render(<HelpTip text="Tip" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("bottom-full");
  });

  it("applies bottom position class when side=bottom", () => {
    render(<HelpTip text="Tip" side="bottom" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("top-full");
  });

  it("applies right position class when side=right", () => {
    render(<HelpTip text="Tip" side="right" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("left-full");
  });

  it("applies left position class when side=left", () => {
    render(<HelpTip text="Tip" side="left" />);
    const btn = screen.getByLabelText("More information");
    fireEvent.mouseEnter(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("right-full");
  });
});
