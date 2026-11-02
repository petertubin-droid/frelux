import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const mockCreateEstimate = vi.fn().mockResolvedValue({
  data: { id: "test-estimate-uuid-1" },
  error: null,
});
const mockCreateEstimateItem = vi.fn().mockResolvedValue({
  data: { id: "test-item-uuid-1" },
  error: null,
});
const mockPrintQuote = vi.fn();

let currentMarket = {
  code: "US",
  name: "United States",
  currencyCode: "USD",
  currencySymbol: "$",
};

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-123" }, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));
vi.mock("@/components/calculators", () => ({
  SaveToProjectButton: () => (
    <div data-testid="save-to-project">SaveToProject</div>
  ),
}));
vi.mock("@/components/ui/AdSlot", () => ({
  default: () => null,
}));
vi.mock("@/components/MarketScopeNotice", () => ({
  default: () => null,
}));
vi.mock("@/lib/estimation/quote-export", () => ({
  printQuote: (...args: unknown[]) => mockPrintQuote(...args),
}));

vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: () => "NGN",
  useMarket: () => ({
    marketCode: currentMarket.code,
    market: currentMarket,
  }),
}));

vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({
    symbol: currentMarket.currencySymbol,
    code: currentMarket.currencyCode,
  }),
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "rule-1",
        calculator_type: "doors_windows",
        rule_key: "hinges_per_door",
        rule_value: 3,
        description: "Hinges per door",
      },
    ],
    error: null,
  }),
  fetchEstimationMaterials: vi.fn().mockResolvedValue({
    data: [
      {
        id: "mat-door-flush",
        slug: "door-flush",
        name: "Flush Door",
        unit: "unit",
      },
      {
        id: "mat-door-frame",
        slug: "door-frame",
        name: "Door Frame",
        unit: "unit",
      },
      {
        id: "mat-door-hinge",
        slug: "door-hinge",
        name: "Hinges",
        unit: "unit",
      },
      {
        id: "mat-door-lockset",
        slug: "door-lockset",
        name: "Lockset",
        unit: "unit",
      },
    ],
    error: null,
  }),
  fetchMarketPriceBook: vi.fn().mockImplementation((mCode: string) =>
    Promise.resolve({
      market: mCode,
      byRef: new Map([
        ["mat-door-flush", 120],
        ["mat-door-frame", 45],
        ["mat-door-hinge", 5],
        ["mat-door-lockset", 35],
      ]),
      missingFromMarket: [],
      fromReference: new Set(),
      asOf: new Map(),
      stale: new Set(),
      verified: new Set(),
    }),
  ),
  createEstimate: (...args: unknown[]) => mockCreateEstimate(...args),
  createEstimateItem: (...args: unknown[]) => mockCreateEstimateItem(...args),
}));

import DoorsWindowsEstimator from "@/pages/DoorsWindowsEstimator";
import ElectricalEstimator from "@/pages/ElectricalEstimator";
import PlumbingEstimator from "@/pages/PlumbingEstimator";

describe("Tier 2 Estimators Integration Currency Regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DoorsWindowsEstimator in United States (USD, $)", () => {
    beforeEach(() => {
      currentMarket = {
        code: "US",
        name: "United States",
        currencyCode: "USD",
        currencySymbol: "$",
      };
    });

    it("renders with market currency symbol ($), saves with USD currency code, and exports with $", async () => {
      render(
        <MemoryRouter>
          <DoorsWindowsEstimator />
        </MemoryRouter>,
      );

      // Select labour mode per_door
      const labourSelect = screen.getByLabelText(/Labour mode/i);
      fireEvent.change(labourSelect, { target: { value: "per_door" } });

      // The labour rate input label must use the localized market symbol ($), not Naira (₦)
      expect(screen.getByText(/Rate per unit \(\$\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Rate per unit \(₦\)/i)).toBeNull();

      const rateInput = screen.getByLabelText(/Rate per unit \(\$\)/i);
      fireEvent.change(rateInput, { target: { value: "25" } });

      // Enter a flush door count
      const flushInput = screen.getByLabelText(/Flush doors/i);
      fireEvent.change(flushInput, { target: { value: "2" } });

      // Wait for async rules/materials to load
      await waitFor(() => {
        expect(screen.getByTestId("trade-price-coverage")).toBeInTheDocument();
      });

      // Click Calculate
      const calcButton = screen.getByRole("button", {
        name: /Calculate estimate/i,
      });
      fireEvent.click(calcButton);

      // Material subtotal should be formatted with $, not ₦
      await waitFor(() => {
        expect(screen.getByText("Material subtotal")).toBeInTheDocument();
      });

      // Check that $ formatted prices exist in the DOM
      const dollarElements = screen.getAllByText(/\$[0-9,]+/);
      expect(dollarElements.length).toBeGreaterThan(0);

      // Check that ₦ does NOT exist anywhere in the formatted results
      expect(screen.queryByText(/₦/)).toBeNull();

      // Click Save estimate
      const saveButton = screen.getByRole("button", { name: /Save estimate/i });
      fireEvent.click(saveButton);

      // Verify createEstimate was called with currency: "USD", NOT "NGN"
      await waitFor(() => {
        expect(mockCreateEstimate).toHaveBeenCalledTimes(1);
      });

      const estimatePayload = mockCreateEstimate.mock.calls[0][0];
      expect(estimatePayload.currency).toBe("USD");
      expect(estimatePayload.currency).not.toBe("NGN");

      // Verify createEstimateItem price_snapshot uses currency: "USD"
      await waitFor(() => {
        expect(mockCreateEstimateItem).toHaveBeenCalled();
      });
      for (const call of mockCreateEstimateItem.mock.calls) {
        expect(call[0].price_snapshot.currency).toBe("USD");
        expect(call[0].price_snapshot.currency).not.toBe("NGN");
      }

      // Click Export quote
      const exportButton = screen.getByRole("button", {
        name: /Export quote/i,
      });
      fireEvent.click(exportButton);

      expect(mockPrintQuote).toHaveBeenCalledTimes(1);
      const quoteOptions = mockPrintQuote.mock.calls[0][0];

      const pricedSoFar = quoteOptions.totals.find(
        (t: any) => t.label === "Priced so far",
      );
      expect(pricedSoFar.value).toContain("$");
      expect(pricedSoFar.value).not.toContain("₦");

      const labour = quoteOptions.totals.find((t: any) => t.label === "Labour");
      expect(labour.value).toContain("$");
      expect(labour.value).not.toContain("₦");
    });
  });

  describe("ElectricalEstimator in Great Britain (GBP, £)", () => {
    beforeEach(() => {
      currentMarket = {
        code: "GB",
        name: "United Kingdom",
        currencyCode: "GBP",
        currencySymbol: "£",
      };
    });

    it("displays GBP (£) for labour rate options and formats calculated totals without Naira", async () => {
      render(
        <MemoryRouter>
          <ElectricalEstimator />
        </MemoryRouter>,
      );

      // Select per_point labour
      const labourSelect = screen.getByLabelText(/Labour mode/i);
      fireEvent.change(labourSelect, { target: { value: "per_point" } });

      // Label should show £, NOT ₦
      expect(screen.getByText(/Rate per point \(£\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Rate per point \(₦\)/i)).toBeNull();

      // Enter a rate
      const rateInput = screen.getByLabelText(/Rate per point \(£\)/i);
      fireEvent.change(rateInput, { target: { value: "15" } });

      // Calculate
      const calcButton = screen.getByRole("button", {
        name: /Calculate estimate/i,
      });
      fireEvent.click(calcButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText("Material subtotal")).toBeInTheDocument();
      });

      // Labour card should show £15 * points formatted with £
      const labourCards = screen.getAllByText(/£[0-9,]+/);
      expect(labourCards.length).toBeGreaterThan(0);

      // Verify no Naira symbol in calculated totals
      expect(screen.queryByText(/₦/)).toBeNull();

      // Click Save estimate
      const saveButton = screen.getByRole("button", { name: /Save estimate/i });
      fireEvent.click(saveButton);

      // Verify createEstimate was called with currency: "GBP", NOT "NGN"
      await waitFor(() => {
        expect(mockCreateEstimate).toHaveBeenCalledTimes(1);
      });
      const estimatePayload = mockCreateEstimate.mock.calls[0][0];
      expect(estimatePayload.currency).toBe("GBP");
      expect(estimatePayload.currency).not.toBe("NGN");

      // Verify export quote contains £
      const exportButton = screen.getByRole("button", {
        name: /Export quote/i,
      });
      fireEvent.click(exportButton);
      expect(mockPrintQuote).toHaveBeenCalledTimes(1);
      const quoteOptions = mockPrintQuote.mock.calls[0][0];
      const labourTotal = quoteOptions.totals.find(
        (t: any) => t.label === "Labour",
      );
      expect(labourTotal.value).toContain("£");
      expect(labourTotal.value).not.toContain("₦");
    });
  });

  describe("PlumbingEstimator in Germany (EUR, €)", () => {
    beforeEach(() => {
      currentMarket = {
        code: "DE",
        name: "Germany",
        currencyCode: "EUR",
        currencySymbol: "€",
      };
    });

    it("displays EUR (€) for labour rate options and saves with EUR currency code", async () => {
      render(
        <MemoryRouter>
          <PlumbingEstimator />
        </MemoryRouter>,
      );

      // Select per_fixture labour
      const labourSelect = screen.getByLabelText(/Labour mode/i);
      fireEvent.change(labourSelect, { target: { value: "per_fixture" } });

      // Label should show €
      expect(screen.getByText(/Rate per point \(€\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Rate per point \(₦\)/i)).toBeNull();

      // Enter a rate
      const rateInput = screen.getByLabelText(/Rate per point \(€\)/i);
      fireEvent.change(rateInput, { target: { value: "30" } });

      // Calculate
      const calcButton = screen.getByRole("button", {
        name: /Calculate estimate/i,
      });
      fireEvent.click(calcButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText("Material subtotal")).toBeInTheDocument();
      });

      // Click Save estimate
      const saveButton = screen.getByRole("button", { name: /Save estimate/i });
      fireEvent.click(saveButton);

      // Verify createEstimate was called with currency: "EUR", NOT "NGN"
      await waitFor(() => {
        expect(mockCreateEstimate).toHaveBeenCalledTimes(1);
      });
      const estimatePayload = mockCreateEstimate.mock.calls[0][0];
      expect(estimatePayload.currency).toBe("EUR");
      expect(estimatePayload.currency).not.toBe("NGN");
    });
  });
});
