import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalculatorInput } from "./CalculatorInput";

describe("CalculatorInput", () => {
  it("renders with accessible label and links htmlFor to input id", () => {
    const handleChange = vi.fn();
    render(
      <CalculatorInput
        id="building-length"
        label="Building Length"
        value={15}
        onChange={handleChange}
        unit="m"
      />,
    );

    const input = screen.getByLabelText(/Building Length/i);
    expect(input).toBeDefined();
    expect(input.getAttribute("id")).toBe("building-length");
    expect(input.getAttribute("type")).toBe("number");
    expect((input as HTMLInputElement).value).toBe("15");

    const badge = screen.getByTestId("input-unit-badge");
    expect(badge.textContent).toBe("m");
  });

  it("handles user change events correctly", () => {
    const handleChange = vi.fn();
    render(
      <CalculatorInput
        label="Wall Thickness"
        value={0.225}
        onChange={handleChange}
        unit="m"
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0.15" } });
    expect(handleChange).toHaveBeenCalledWith("0.15");
  });

  it("renders inline measurement unit badge e.g. [ m² ] or [ sq ft ]", () => {
    render(
      <CalculatorInput
        label="Gross Floor Area"
        value={150}
        onChange={() => {}}
        unit="m²"
      />,
    );

    const badge = screen.getByTestId("input-unit-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe("m²");
  });

  it("displays validation error message with role='alert'", () => {
    render(
      <CalculatorInput
        label="Roof Pitch"
        value={105}
        onChange={() => {}}
        unit="°"
        error="Pitch cannot exceed 60 degrees"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Pitch cannot exceed 60 degrees");
  });

  it("displays hint description when provided without error", () => {
    render(
      <CalculatorInput
        label="Concrete Footing Depth"
        value={0.9}
        onChange={() => {}}
        unit="m"
        hint="Standard depth for strip footing in firm soil"
      />,
    );

    expect(
      screen.getByText("Standard depth for strip footing in firm soil"),
    ).toBeDefined();
  });
});
