import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ConduitFillCheck from "./ConduitFillCheck";

describe("ConduitFillCheck Component", () => {
  it("renders with default NEC standard and passes for 3x 12 AWG wires in 3/4 inch EMT", () => {
    render(<ConduitFillCheck />);
    expect(
      screen.getByText(/Conduit Wire Fill Capacity Check/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Within Fill Limit/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/NEC Chapter 9 Table 1/i).length,
    ).toBeGreaterThan(0);
  });

  it("switches to BS 7671 standard and updates code rules", () => {
    render(<ConduitFillCheck />);
    const standardSelect = screen.getByLabelText(/Governing Standard/i);
    fireEvent.change(standardSelect, { target: { value: "BS_7671" } });
    expect(
      screen.getAllByText(/BS 7671 \/ IET On-Site Guide/i).length,
    ).toBeGreaterThan(0);
  });

  it("adds and removes wire groups and shows overfill warning when capacity is exceeded", () => {
    render(<ConduitFillCheck />);
    const countInput = screen.getByLabelText(/Count/i);
    // Enter 30 conductors into 3/4" EMT: will easily exceed 40%
    fireEvent.change(countInput, { target: { value: "30" } });
    expect(screen.getByText(/Overfilled Raceway/i)).toBeInTheDocument();
    expect(screen.getByText(/exceeding code maximum/i)).toBeInTheDocument();
  });
});
