import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplierPortal from "./SupplierPortal";

describe("SupplierPortal Component", () => {
  it("renders localized supplier portal header and supplier info", () => {
    render(<SupplierPortal />);

    expect(screen.getByText("Localized Supplier Portal")).toBeDefined();
    expect(
      screen.getByText("Live Price List & Inventory Controls"),
    ).toBeDefined();
    expect(screen.getByText(/Savannah Build Supplies Ltd/i)).toBeDefined();
    expect(screen.getByText("Add Material Quote")).toBeDefined();
  });
});
