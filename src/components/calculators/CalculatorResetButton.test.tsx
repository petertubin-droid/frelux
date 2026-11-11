import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalculatorResetButton from "./CalculatorResetButton";

describe("CalculatorResetButton", () => {
  it("calls the page's own reset handler", () => {
    const onReset = vi.fn();
    render(<CalculatorResetButton onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible name", () => {
    render(<CalculatorResetButton onReset={() => {}} label="Clear the form" />);
    expect(
      screen.getByRole("button", { name: "Clear the form" }),
    ).toBeInTheDocument();
  });
});
