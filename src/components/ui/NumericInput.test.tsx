import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { NumericInput } from "./NumericInput";

function Harness({ start = 0 }: { start?: number }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <NumericInput aria-label="Width" value={value} onValueChange={setValue} />
      <output data-testid="committed">{value}</output>
    </>
  );
}

describe("NumericInput", () => {
  it("can be emptied without snapping back to zero mid-edit", () => {
    render(<Harness />);
    const field = screen.getByLabelText("Width") as HTMLInputElement;
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "" } });
    expect(field.value).toBe("");
    expect(screen.getByTestId("committed").textContent).toBe("0");
  });

  it("accepts a fresh number typed into a cleared field", () => {
    render(<Harness />);
    const field = screen.getByLabelText("Width") as HTMLInputElement;
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.change(field, { target: { value: "1200" } });
    expect(field.value).toBe("1200");
    expect(screen.getByTestId("committed").textContent).toBe("1200");
  });

  it("returns to the last real number when left empty", () => {
    render(<Harness start={900} />);
    const field = screen.getByLabelText("Width") as HTMLInputElement;
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    expect(field.value).toBe("900");
  });

  it("does not clobber a preset applied while not editing", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <NumericInput
        aria-label="Floors"
        value={3}
        onValueChange={onValueChange}
      />,
    );
    const field = screen.getByLabelText("Floors") as HTMLInputElement;
    expect(field.value).toBe("3");
    rerender(
      <NumericInput
        aria-label="Floors"
        value={12}
        onValueChange={onValueChange}
      />,
    );
    expect(field.value).toBe("12");
  });
});
