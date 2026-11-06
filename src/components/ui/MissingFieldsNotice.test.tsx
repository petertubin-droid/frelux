import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MissingFieldsNotice from "./MissingFieldsNotice";

const field = (label: string) => ({
  id: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  element: document.createElement("input"),
});

describe("MissingFieldsNotice", () => {
  it("stays out of the way when nothing is missing", () => {
    const { container } = render(<MissingFieldsNotice fields={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("names the fields that were left empty", () => {
    render(
      <MissingFieldsNotice
        fields={[field("Plot width"), field("Slab thickness")]}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("2 fields still need a figure");
    expect(screen.getByRole("button", { name: "Plot width" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Slab thickness" }),
    ).toBeDefined();
    expect(alert.textContent).toContain("Nothing was calculated");
  });

  it("reads as one field when only one is empty", () => {
    render(<MissingFieldsNotice fields={[field("Gate width")]} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "One field still needs a figure",
    );
  });

  it("returns the reader to the field they press", () => {
    const missing = field("Plot width");
    const focus = vi.spyOn(missing.element, "focus");
    render(<MissingFieldsNotice fields={[missing]} />);
    fireEvent.click(screen.getByRole("button", { name: "Plot width" }));
    expect(focus).toHaveBeenCalled();
  });
});
