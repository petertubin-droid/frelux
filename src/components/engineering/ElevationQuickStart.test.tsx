import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElevationQuickStart, ELEVATION_PRESETS } from "./ElevationQuickStart";

const setup = (
  overrides: Partial<React.ComponentProps<typeof ElevationQuickStart>> = {},
) => {
  const props = {
    displayLength: 12,
    displayWidth: 9,
    displayFloorHeight: 3,
    storeys: 1,
    pitchDeg: 25,
    unitLabel: "m",
    lengthStep: 0.1,
    activePreset: "bungalow-3" as string | null,
    onPreset: vi.fn(),
    onLength: vi.fn(),
    onStoreys: vi.fn(),
    onPitch: vi.fn(),
    ...overrides,
  };
  render(<ElevationQuickStart {...props} />);
  return props;
};

describe("ElevationQuickStart", () => {
  it("offers a real building to start from instead of empty engineering fields", () => {
    setup();
    expect(screen.getByText("3-bedroom bungalow")).toBeTruthy();
    expect(screen.getByText(/Pick the closest building/)).toBeTruthy();
    expect(ELEVATION_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it("applies the chosen preset", () => {
    const props = setup();
    fireEvent.click(screen.getByText("4-bedroom duplex"));
    expect(props.onPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: "duplex-4" }),
    );
  });

  it("reports dimension edits in the display unit", () => {
    const props = setup();
    const longest = screen.getByLabelText("Longest side");
    fireEvent.change(longest, { target: { value: "18" } });
    expect(props.onLength).toHaveBeenCalledWith("building_length", 18);
  });

  it("sets the floor count from a tap, not a typed number", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(props.onStoreys).toHaveBeenCalledWith(2);
  });

  it("names each roof slope in words", () => {
    const props = setup();
    expect(screen.getByText("Standard")).toBeTruthy();
    fireEvent.click(screen.getByText("Steep"));
    expect(props.onPitch).toHaveBeenCalledWith(35);
  });
});
