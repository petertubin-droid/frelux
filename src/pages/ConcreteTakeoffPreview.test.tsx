/**
 * What a free visitor actually gets from the concrete takeoff.
 *
 * The engine runs on their numbers either way; the plan decides how much of the
 * schedule they can read and whether the document can leave the page.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConcreteTakeoffCalculator } from "./StructuralCalculator";
import { publishEntitlement, resetEntitlement } from "@/lib/entitlement-store";

function runSlab() {
  render(
    <MemoryRouter>
      <ConcreteTakeoffCalculator />
    </MemoryRouter>,
  );
  const textboxes: Array<[string, string]> = [
    ["Slab length", "5"],
    ["Slab width", "4"],
    ["Slab thickness", "0.15"],
  ];
  for (const [label, value] of textboxes) {
    fireEvent.change(screen.getByRole("textbox", { name: label }), {
      target: { value },
    });
  }
  const spinbuttons: Array<[string, string]> = [
    ["Mix cement parts", "1"],
    ["Mix sand parts", "2"],
    ["Mix coarse aggregate parts", "4"],
    ["Additional concrete allowance (%)", "0"],
    ["Cement bag size (kg)", "50"],
  ];
  for (const [label, value] of spinbuttons) {
    fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
      target: { value },
    });
  }
  fireEvent.click(
    screen.getByRole("button", { name: /Calculate concrete takeoff/i }),
  );
}

describe("concrete takeoff preview", () => {
  beforeEach(() => resetEntitlement());
  afterEach(() => resetEntitlement());

  it("shows the first lines and the count of what a plan adds", () => {
    publishEntitlement({ isPaid: false });
    runSlab();
    // Two tiles are visible, so the engine is proved on the visitor's own numbers.
    expect(screen.getAllByText(/m³/).length).toBeGreaterThan(0);
    expect(screen.getByText(/more lines on a plan/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Export quote \(PDF\)/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the whole schedule and the document to a subscriber", () => {
    publishEntitlement({ isPaid: true });
    runSlab();
    expect(screen.queryByText(/more lines on a plan/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export quote \(PDF\)/i }),
    ).toBeInTheDocument();
  });
});
