import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SupplierOfferBadge } from "./SupplierOfferBadge";

describe("SupplierOfferBadge Component", () => {
  it("renders verified supplier offer for concrete or cement", async () => {
    const handleSelect = vi.fn();
    render(
      <SupplierOfferBadge
        materialName="Portland Cement 50kg"
        marketCode="KE"
        quantity={20}
        onSelectSupplierPrice={handleSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Savannah Build Supplies Ltd/i)).toBeDefined();
    });

    expect(screen.getByText("Use Live Supplier Quote")).toBeDefined();
    expect(screen.getByText(/Verified Merchant/i)).toBeDefined();
  });
});
