import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConcreteTakeoffCalculator } from "./StructuralCalculator";

describe("ConcreteTakeoffCalculator", () => {
  it("calculates measured slab quantities from a specified mix without designing reinforcement", () => {
    render(
      <MemoryRouter>
        <ConcreteTakeoffCalculator />
      </MemoryRouter>,
    );
    const inputs: Record<string, string> = {
      "Slab length (m)": "5",
      "Slab width (m)": "4",
      "Slab thickness (m)": "0.15",
      "Mix cement parts": "1",
      "Mix sand parts": "2",
      "Mix coarse aggregate parts": "4",
      "Additional concrete allowance (%)": "0",
      "Cement bag size (kg)": "50",
    };
    for (const [label, value] of Object.entries(inputs))
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
        target: { value },
      });
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate concrete takeoff/i }),
    );
    expect(screen.getByText("20 whole 50 kg bags")).toBeInTheDocument();
    expect(screen.getAllByText("3.000 m³")).toHaveLength(2);
    expect(
      screen.getByText(/No reinforcement design is inferred/),
    ).toBeInTheDocument();
  });
});
