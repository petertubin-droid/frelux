import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SupplierOfferBadge } from "./SupplierOfferBadge";

describe("SupplierOfferBadge Component", () => {
  it("does not display demo supplier offers when live database data is unavailable", async () => {
    render(
      <SupplierOfferBadge
        materialName="Portland Cement 50kg"
        marketCode="KE"
        quantity={20}
      />,
    );
    await waitFor(() => expect(screen.queryByText(/Savannah Build Supplies Ltd/i)).toBeNull());
    expect(screen.queryByText(/Verified Merchant/i)).toBeNull();
  });
});
