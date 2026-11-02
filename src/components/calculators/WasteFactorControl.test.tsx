import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WasteFactorControl } from "./WasteFactorControl";
import { WASTE_SETTINGS_KEY } from "@/lib/waste/waste-factor";

describe("WasteFactorControl", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the four quantity rows for a base quantity", () => {
    render(
      <WasteFactorControl material="tiles" baseQuantity={100} unit="tiles" />,
    );
    expect(screen.getByText("Base quantity")).toBeInTheDocument();
    expect(screen.getAllByText("Waste allowance").length).toBeGreaterThan(0);
    expect(screen.getByText("Additional quantity")).toBeInTheDocument();
    expect(screen.getAllByText("110 tiles").length).toBeGreaterThan(0);
  });

  it("applies a preset to the material", () => {
    render(
      <WasteFactorControl material="tiles" baseQuantity={100} unit="tiles" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /15% Higher/i }));
    expect(screen.getByTestId("waste-percent")).toHaveTextContent("15%");
    expect(screen.getByText("115 tiles")).toBeInTheDocument();
  });

  it("moves the slider and updates the preview", () => {
    render(
      <WasteFactorControl material="tiles" baseQuantity={200} unit="tiles" />,
    );
    fireEvent.change(screen.getByLabelText("Waste percentage"), {
      target: { value: "20" },
    });
    expect(screen.getByTestId("waste-percent")).toHaveTextContent("20%");
    expect(screen.getByText("240 tiles")).toBeInTheDocument();
  });

  it("uses the base quantity untouched when switched off", () => {
    render(
      <WasteFactorControl material="tiles" baseQuantity={100} unit="tiles" />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: /apply waste allowance/i }),
    );
    expect(screen.getAllByText("100 tiles").length).toBeGreaterThan(0);
    expect(screen.getByTestId("waste-percent")).toHaveTextContent("off");
  });

  it("remembers the setting for other calculators", () => {
    render(
      <WasteFactorControl material="paint" baseQuantity={10} unit="litres" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /5% Low/i }));
    const stored = JSON.parse(
      window.localStorage.getItem(WASTE_SETTINGS_KEY) ?? "{}",
    );
    expect(stored.perMaterial.paint).toBe(5);
  });

  it("rounds to whole packages and says so", () => {
    render(
      <WasteFactorControl
        material="cement"
        baseQuantity={100}
        unit="kg"
        packageSize={25}
      />,
    );
    expect(screen.getByText(/Recommended order/)).toBeInTheDocument();
    expect(
      screen.getByText(/Rounded up to whole packages of 25 kg/),
    ).toBeInTheDocument();
  });

  it("explains the material and offers a reset", () => {
    render(<WasteFactorControl material="steel" baseQuantity={50} unit="kg" />);
    expect(screen.getByText(/Laps and cutting to length/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Reset to material defaults/i }),
    );
    expect(screen.getByTestId("waste-percent")).toHaveTextContent("3%");
  });
});
