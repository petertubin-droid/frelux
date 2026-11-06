import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MeasurementTip from "./MeasurementTip";

describe("MeasurementTip", () => {
  it("tells the reader to set the measurement type before calculating", () => {
    render(<MeasurementTip />);
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Set the measurement type");
    expect(note.textContent).toMatch(/over estimates/);
  });

  it("names whatever the page calls its setting", () => {
    render(<MeasurementTip what="unit" />);
    expect(screen.getByRole("note").textContent).toContain("Set the unit");
  });
});
