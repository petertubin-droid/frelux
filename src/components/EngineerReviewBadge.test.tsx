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

  it("displays governing code references across built-in markets", () => {
    market.code = "IN";
    market.country = "India";
    const { rerender } = render(<EngineerReviewBadge />);
    expect(
      screen.getAllByText(/Bureau of Indian Standards \(BIS\)/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/National Building Code of India/).length,
    ).toBeGreaterThan(0);

    market.code = "AU";
    market.country = "Australia";
    rerender(<EngineerReviewBadge />);
    expect(
      screen.getByText(
        /ABCB NCC 2025 State and Territory Adoption Information/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Review for Australia \(AU\)/)).toBeTruthy();

    market.code = "NG";
    market.country = "Nigeria";
    rerender(<EngineerReviewBadge />);
    expect(
      screen.getByText(/Federal Republic of Nigeria National Building Code/),
    ).toBeTruthy();
  });

  it("dynamically supports future markets with regulatory framework guidance", () => {
    market.code = "UG";
    market.country = "Uganda";
    render(<EngineerReviewBadge />);
    expect(screen.getByText(/Review for Uganda \(UG\)/)).toBeTruthy();
    expect(
      screen.getByText(
        /National Standards Authority & Building Regulatory Body/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Statutory building regulations, municipal building bylaws/,
      ),
    ).toBeTruthy();
  });

  it("uses geotechnical guidance for foundations", () => {
    market.code = "US";
    market.country = "United States";
    render(<EngineerReviewBadge discipline="foundation" />);
    expect(
      screen.getByText(
        /geotechnical report, groundwater and settlement criteria/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/preliminary foundation calculation/)).toBeTruthy();
  });
});
