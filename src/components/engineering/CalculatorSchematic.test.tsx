import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CalculatorSchematic,
  foundationExtentLabel,
} from "./CalculatorSchematic";

describe("CalculatorSchematic", () => {
  it("labels a beam schematic with calculated section and explicit non-design status", () => {
    const { container } = render(
      <CalculatorSchematic
        kind="beam"
        span="5 m"
        support="simply_supported"
        section="250 × 450 mm"
        bars="4Y16"
        load="18.20 kN/m"
      />,
    );
    expect(
      screen.getByRole("img", { name: /beam geometry and load/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/250 × 450 mm/).length).toBeGreaterThan(0);
    expect(screen.getByText(/schematic · not to scale/i)).toBeInTheDocument();
    expect(container.textContent).toMatch(
      /not a design or construction drawing/i,
    );
  });

  it("marks blank plumbing runs as not entered rather than drawing inferred quantities", () => {
    render(
      <CalculatorSchematic
        kind="plumbing"
        counts={[{ label: "Taps", value: "4" }]}
        runs={[
          { label: "Cold water", value: "", entered: false },
          { label: "Waste", value: "18 m", entered: true },
        ]}
      />,
    );
    expect(screen.getByText("Not entered")).toBeInTheDocument();
    expect(
      screen.getByText(/never derives or invents pipe lengths/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Taps/).length).toBeGreaterThan(0);
  });

  it("marks the electrical quick-plan as conceptual, not a circuit design", () => {
    render(
      <CalculatorSchematic
        kind="electrical"
        area="120"
        lights="12"
        sockets="10"
      />,
    );
    expect(
      screen.getByRole("img", { name: /electrical quick-takeoff schematic/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not device locations or connected circuits/i),
    ).toBeInTheDocument();
  });

  it("draws the reinforcement count the calculation states, not a fixed row", () => {
    const { getByTestId } = render(
      <CalculatorSchematic
        kind="beam"
        span="5 m"
        support="simply_supported"
        section="250 × 450 mm"
        bars="4Y16"
        load="18.20 kN/m"
      />,
    );
    expect(getByTestId("beam-bars").childElementCount).toBe(4);
  });

  it("draws the second layer for a two-way slab written for reading", () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <CalculatorSchematic
        kind="slab"
        spanX="4 m"
        spanY="6 m"
        thickness="150 mm"
        bars="Y12 @ 200 mm c/c"
        slabType="two way"
      />,
    );
    expect(getByTestId("slab-two-way-bars").childElementCount).toBe(5);
    rerender(
      <CalculatorSchematic
        kind="slab"
        spanX="4 m"
        spanY="6 m"
        thickness="150 mm"
        bars="Y12 @ 200 mm c/c"
        slabType="one way"
      />,
    );
    expect(queryByTestId("slab-two-way-bars")).toBeNull();
  });

  it("keeps the beam section label readable instead of white on a light card", () => {
    const { getByText } = render(
      <CalculatorSchematic
        kind="beam"
        span="5 m"
        support="simply_supported"
        section="250 × 450 mm"
        bars="4Y16"
        load="18.20 kN/m"
      />,
    );
    const label = getByText(/250 × 450 mm · 4Y16/);
    expect(label.getAttribute("class")).not.toContain(
      "fill-primary-foreground",
    );
    expect(label.getAttribute("class")).toContain("fill-foreground");
  });
});

describe("foundationExtentLabel", () => {
  it("prints the entered length in the unit it was entered in", () => {
    expect(
      foundationExtentLabel({
        shape: "strip",
        unit: "ft",
        length: 50,
        width: 30,
      }),
    ).toBe("160.0 ft perimeter");
    expect(
      foundationExtentLabel({ shape: "raft", unit: "m", length: 12, width: 9 }),
    ).toBe("12 × 9 m footprint");
    expect(
      foundationExtentLabel({
        shape: "pad",
        unit: "m",
        length: 12,
        width: 9,
        padWidthMm: 600,
        padLengthMm: 900,
      }),
    ).toBe("900 mm");
  });
});
