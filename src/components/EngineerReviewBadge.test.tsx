import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EngineerReviewBadge from "./EngineerReviewBadge";

const market = vi.hoisted(() => ({ code: "US", country: "United States" }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    marketCode: market.code,
    market: { countryName: market.country },
  }),
}));

afterEach(() => cleanup());

describe("EngineerReviewBadge", () => {
  it("keeps the compact badge beside results and discloses approval requirements", () => {
    render(<EngineerReviewBadge />);
    expect(screen.getByTestId("engineer-review-badge")).toBeTruthy();
    expect(screen.getByText("Engineer Review")).toBeTruthy();
    expect(
      screen.getByText(/must be independently reviewed and approved/),
    ).toBeTruthy();
    expect(screen.getByText(/project loads, combinations/)).toBeTruthy();
  });

  it("shows country references only where listed and keeps the warning in every market", () => {
    market.code = "IN";
    market.country = "India";
    const { rerender } = render(<EngineerReviewBadge />);
    expect(screen.getByText(/Confirm the governing standards/)).toBeTruthy();
    expect(screen.getByText(/every FRELUX market/)).toBeTruthy();
    market.code = "AU";
    market.country = "Australia";
    rerender(<EngineerReviewBadge />);
    expect(
      screen.getByText(
        /ABCB NCC 2025 state and territory adoption information/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Review for Australia \(AU\)/)).toBeTruthy();
  });

  it("uses geotechnical guidance for foundations", () => {
    render(<EngineerReviewBadge discipline="foundation" />);
    expect(
      screen.getByText(
        /geotechnical report, groundwater and settlement criteria/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/preliminary foundation calculation/)).toBeTruthy();
  });
});
