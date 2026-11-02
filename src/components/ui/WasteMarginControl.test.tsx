import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WasteMarginControl, clampWasteMargin } from "./WasteMarginControl";

describe("clampWasteMargin", () => {
  it("clamps values into the 0.1–100 range", () => {
    expect(clampWasteMargin(0)).toBe(0.1);
    expect(clampWasteMargin(-5)).toBe(0.1);
    expect(clampWasteMargin(150)).toBe(100);
    expect(clampWasteMargin(2.5)).toBe(2.5);
  });
});

describe("WasteMarginControl", () => {
  it("renders preset chips and calls onChange when a preset is picked", () => {
    const onChange = vi.fn();
    render(
      <WasteMarginControl
        value={10}
        onChange={onChange}
        options={[0, 5, 10, 15]}
      />,
    );
    fireEvent.click(screen.getByText("5%"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("opens a custom input accepting fractional values from 0.1% to 100%", () => {
    const onChange = vi.fn();
    render(
      <WasteMarginControl
        value={10}
        onChange={onChange}
        options={[0, 5, 10, 15]}
      />,
    );
    fireEvent.click(screen.getByText("Custom"));
    const input = screen.getByLabelText("Custom waste percentage");
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: "0.5" } });
    expect(onChange).toHaveBeenCalledWith(0.5);
    fireEvent.change(input, { target: { value: "120" } });
    expect(onChange).toHaveBeenLastCalledWith(100);
    fireEvent.change(input, { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(0.1);
  });

  it("keeps 0 as an explicit no-waste preset", () => {
    const onChange = vi.fn();
    render(
      <WasteMarginControl value={0} onChange={onChange} options={[0, 5, 10]} />,
    );
    fireEvent.click(screen.getByText("0%"));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("seeds the custom field with the current value when opening from 0", () => {
    const onChange = vi.fn();
    render(
      <WasteMarginControl value={0} onChange={onChange} options={[0, 5, 10]} />,
    );
    fireEvent.click(screen.getByText("Custom"));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("shows the custom field automatically for non-preset values", () => {
    render(
      <WasteMarginControl
        value={2.5}
        onChange={() => {}}
        options={[0, 5, 10]}
      />,
    );
    expect(screen.getByLabelText("Custom waste percentage")).toBeTruthy();
  });
});
