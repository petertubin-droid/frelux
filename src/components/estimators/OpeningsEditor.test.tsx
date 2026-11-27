import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import OpeningsEditor, { type OpeningRow } from "./OpeningsEditor";

const rows: OpeningRow[] = [
  { id: "a", label: "Front Window", widthM: 1.2, heightM: 1.2, count: 2 },
];

function setup(overrides: Partial<Parameters<typeof OpeningsEditor>[0]> = {}) {
  const onChange = vi.fn();
  render(<OpeningsEditor openings={rows} onChange={onChange} {...overrides} />);
  return { onChange };
}

describe("OpeningsEditor", () => {
  it("renders a row with its label, size and quantity", () => {
    setup();
    expect(screen.getByDisplayValue("Front Window")).toBeInTheDocument();
    // width and height both read 1.2, so scope the assertion by label
    expect(screen.getByLabelText("Opening width")).toHaveValue(1.2);
    expect(screen.getByLabelText("Opening height")).toHaveValue(1.2);
    expect(screen.getByLabelText("Opening count")).toHaveValue(2);
  });

  it("adds a row through the add button", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /add opening/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as OpeningRow[];
    expect(next).toHaveLength(2);
    expect(next[1].label).toBe("Opening 2");
  });

  it("converts imperial input back to metres", () => {
    const { onChange } = setup({ unitSystem: "imperial" });
    const width = screen.getByLabelText("Opening width");
    fireEvent.change(width, { target: { value: "4" } });
    const next = onChange.mock.calls[0][0] as OpeningRow[];
    expect(next[0].widthM).toBeCloseTo(1.2192, 4);
  });

  it("supports centimetre input while keeping opening geometry in metres", () => {
    const { onChange } = setup({ unitSystem: "centimeters" });
    const width = screen.getByLabelText("Opening width");
    expect(width).toHaveValue(120);
    fireEvent.change(width, { target: { value: "150" } });
    const next = onChange.mock.calls[0][0] as OpeningRow[];
    expect(next[0].widthM).toBeCloseTo(1.5, 6);
  });

  it("removes a row", () => {
    const { onChange } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: /remove front window/i }),
    );
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows the empty hint when there are no openings", () => {
    setup({ openings: [] });
    expect(
      screen.getByText(
        /no openings added\. wall is calculated as solid perimeter/i,
      ),
    ).toBeInTheDocument();
  });

  it("flags rows that cannot be deducted instead of guessing", () => {
    setup({
      openings: [{ id: "z", label: "Zero", widthM: 0, heightM: 1, count: 1 }],
    });
    expect(
      screen.getByText(/need a width, height and quantity above zero/i),
    ).toBeInTheDocument();
  });

  it("hides the add button when the host engine cannot accept new kinds", () => {
    setup({ mode: "locked", allowAdd: false });
    expect(
      screen.queryByRole("button", { name: /add opening/i }),
    ).not.toBeInTheDocument();
  });

  it("locks the size cells in count mode and keeps the quantity editable", () => {
    const { onChange } = setup({ mode: "locked" });
    expect(screen.getByText(/1\.2 x 1\.2 m fixed/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Opening width")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Opening count"), {
      target: { value: "3" },
    });
    const next = onChange.mock.calls[0][0] as OpeningRow[];
    expect(next[0].count).toBe(3);
    expect(next[0].widthM).toBe(1.2);
  });
});
