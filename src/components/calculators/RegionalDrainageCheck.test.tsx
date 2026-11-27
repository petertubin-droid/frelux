import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RegionalDrainageCheck from "./RegionalDrainageCheck";

describe("RegionalDrainageCheck", () => {
  it("defaults to US DFU for US market without adoption warning", () => {
    render(<RegionalDrainageCheck marketCode="US" />);
    expect(
      screen.getByText(/Sanitary Drainage Fixture Load & Sizing Check/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/DFU/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Market Adoption Note/i)).not.toBeInTheDocument();
  });

  it("defaults to EU DU for GB market without adoption warning", () => {
    render(<RegionalDrainageCheck marketCode="GB" />);
    expect(screen.getAllByText(/EN 12056/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Market Adoption Note/i)).not.toBeInTheDocument();
  });

  it("shows market adoption caveat for non-native markets while allowing calculation", () => {
    render(<RegionalDrainageCheck marketCode="NG" />);
    expect(screen.getByText(/Market Adoption Note:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/DFU/i).length).toBeGreaterThan(0);

    // User can switch standard to European EN 12056
    const standardSelect = screen.getByLabelText(/Plumbing Code Reference:/i);
    fireEvent.change(standardSelect, { target: { value: "eu" } });
    expect(screen.getAllByText(/EN 12056/i).length).toBeGreaterThan(0);
  });
});
