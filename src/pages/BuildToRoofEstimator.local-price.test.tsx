import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// OWNER-APPROVED LOCAL-PRICE BEHAVIOR (2026-10-24)
// No Nigerian default is carried into another market's estimate.
// Unresolved prices render empty with "Enter local price" and the
// results disclose the partial total honestly.
// ============================================================

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user" },
    isAdmin: true,
    isPaid: true,
    loading: false,
  })),
}));
vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/rewards", () => ({ trackBuildToRoofRewards: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));
// DE market, resolvers resolve nothing (no DE book rows in the test env)
vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: vi.fn(() => "EUR"),
  useMarket: vi.fn(() => ({
    market: "DE",
    marketCode: "DE",
    marketName: "Germany",
    currency: "EUR",
    currencySymbol: "€",
    setMarket: vi.fn(),
  })),
  useProjectLocationCurrency: vi.fn(() => ({
    projectCurrencyCode: "EUR",
    projectCurrencySymbol: "€",
  })),
}));
vi.mock("@/lib/estimation/structural-market", () => ({
  resolveMarketCement: vi.fn().mockResolvedValue(null),
  resolveMarketSandM3: vi.fn().mockResolvedValue(null),
  resolveMarketRebar: vi.fn().mockResolvedValue({
    overrides: {},
    unresolved: ["12mm", "16mm", "20mm", "25mm"],
  }),
}));

import BuildToRoofEstimator from "./BuildToRoofEstimator";

describe("BuildToRoofEstimator local-price behavior (owner-approved)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  it("asks for local prices instead of carrying Nigerian defaults", async () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );
    // Navigate to the Prices step where the market notes render
    fireEvent.click(screen.getByRole("button", { name: /Rates & Pricing/i }));
    await waitFor(
      () => {
        expect(
          screen.getByText(/No verified cement price in the DE book/i),
        ).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(
      screen.getByText(/Enter your local price in the Prices step/i),
    ).toBeTruthy();
    expect(
      screen.getAllByPlaceholderText(/Enter local price/i).length,
    ).toBeGreaterThan(0);
    // the old silent-default wording must be gone
    expect(screen.queryByText(/Nigerian default is shown/i)).toBeNull();
    expect(
      screen.queryByText(/Nigerian baseline defaults are shown/i),
    ).toBeNull();
  });
});
