import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const fetchMarketRoleMappings = vi.fn();
const resolveMaterialPriceByRole = vi.fn();

vi.mock("@/lib/estimation/market-materials", () => ({
  fetchMarketRoleMappings: (...args: unknown[]) =>
    fetchMarketRoleMappings(...args),
  resolveMaterialPriceByRole: (...args: unknown[]) =>
    resolveMaterialPriceByRole(...args),
  evidenceSentence: () => "Observed market price.",
}));

import MarketPriceFacts from "./MarketPriceFacts";

const row = (role: string, market: string, price: number) => ({
  role,
  resolved_market: market,
  material: {
    name: `${market} product for ${role}`,
    slug: `${market}-${role}`,
  },
  price: {
    price,
    currency: market === "NG" ? "NGN" : "USD",
    price_source: "market survey",
    effective_date: "2026-10-06",
  },
  evidence: "market_observed",
});

describe("MarketPriceFacts", () => {
  beforeEach(() => {
    fetchMarketRoleMappings.mockReset();
    resolveMaterialPriceByRole.mockReset();
  });

  it("renders the market's own stored unit prices", async () => {
    fetchMarketRoleMappings.mockResolvedValue([
      { role: "interior-paint" },
      { role: "primer" },
    ]);
    resolveMaterialPriceByRole.mockImplementation(
      async (role: string, market: string) =>
        row(role, market, role === "interior-paint" ? 17000 : 12000),
    );

    render(
      <MarketPriceFacts
        marketCode="NG"
        templateType="paint"
        countryName="Nigeria"
      />,
    );

    expect(
      await screen.findByText(/NG product for interior-paint/),
    ).toBeTruthy();
    expect(screen.getByText(/17,000/)).toBeTruthy();
    expect(screen.getByText(/12,000/)).toBeTruthy();
  });

  it("never shows a price inherited from another market", async () => {
    fetchMarketRoleMappings.mockResolvedValue([{ role: "interior-paint" }]);
    // Resolver fell through to the Nigerian reference row for a Kenyan page.
    resolveMaterialPriceByRole.mockResolvedValue(
      row("interior-paint", "NG", 17000),
    );

    render(
      <MarketPriceFacts
        marketCode="KE"
        templateType="paint"
        countryName="Kenya"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(/no verified row for the materials/i),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/17,000/)).toBeNull();
  });

  it("renders nothing for a template family with no priced roles", () => {
    const { container } = render(
      <MarketPriceFacts
        marketCode="NG"
        templateType="tile"
        countryName="Nigeria"
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
