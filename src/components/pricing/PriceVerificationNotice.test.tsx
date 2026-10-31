import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PriceVerificationNotice from "./PriceVerificationNotice";

const mockMarket = vi.fn();
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => mockMarket(),
}));

describe("PriceVerificationNotice", () => {
  it("warns when the market's prices are reference-derived", () => {
    mockMarket.mockReturnValue({
      marketCode: "DE",
      market: { countryName: "Germany" },
    });
    render(<PriceVerificationNotice />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Germany prices are not verified yet",
    );
  });

  it("stays silent for a verified market", () => {
    mockMarket.mockReturnValue({
      marketCode: "NG",
      market: { countryName: "Nigeria" },
    });
    const { container } = render(<PriceVerificationNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays silent when the scan has no entry for the market", () => {
    mockMarket.mockReturnValue({
      marketCode: "ZZ",
      market: { countryName: "Nowhere" },
    });
    const { container } = render(<PriceVerificationNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
