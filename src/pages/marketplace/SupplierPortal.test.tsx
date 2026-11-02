import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import SupplierPortal from "./SupplierPortal";

describe("SupplierPortal Component", () => {
  it("does not expose demo inventory to signed-out visitors", async () => {
    render(<MemoryRouter><AuthProvider><SupplierPortal /></AuthProvider></MemoryRouter>);
    expect(screen.getByText("Localized Supplier Portal")).toBeDefined();
    expect(await screen.findByText("Sign in to manage supplier listings")).toBeDefined();
    expect(screen.queryByText(/Savannah Build Supplies/i)).toBeNull();
  });
});
