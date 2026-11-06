import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalculatorSchematic } from "./CalculatorSchematic";

describe("CalculatorSchematic", () => {
  it("labels a beam schematic with calculated section and explicit non-design status", () => {
    const { container } = render(<CalculatorSchematic kind="beam" span="5 m" support="simply_supported" section="250 × 450 mm" bars="4Y16" load="18.20 kN/m" />);
    expect(screen.getByRole("img", { name: /beam geometry and load/i })).toBeInTheDocument();
    expect(screen.getAllByText(/250 × 450 mm/).length).toBeGreaterThan(0);
    expect(screen.getByText(/schematic · not to scale/i)).toBeInTheDocument();
    expect(container.textContent).toMatch(/not a design or construction drawing/i);
  });

  it("marks blank plumbing runs as not entered rather than drawing inferred quantities", () => {
    render(<CalculatorSchematic kind="plumbing" counts={[{ label: "Taps", value: "4" }]} runs={[{ label: "Cold water", value: "", entered: false }, { label: "Waste", value: "18 m", entered: true }]} />);
    expect(screen.getByText("Not entered")).toBeInTheDocument();
    expect(screen.getByText(/never derives or invents pipe lengths/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Taps/).length).toBeGreaterThan(0);
  });

  it("marks the electrical quick-plan as conceptual, not a circuit design", () => {
    render(<CalculatorSchematic kind="electrical" area="120" lights="12" sockets="10" />);
    expect(screen.getByRole("img", { name: /electrical quick-takeoff schematic/i })).toBeInTheDocument();
    expect(screen.getByText(/not device locations or connected circuits/i)).toBeInTheDocument();
  });
});
