import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

let mockMarket = {
  code: "US",
  name: "United States",
  currencyCode: "USD",
  currencySymbol: "$",
};

let mockDoorsMarketResolution: {
  overrides: Record<string, number>;
  provenance: Array<{
    engineKey: string;
    resolved: boolean;
    bookMarket: string;
    materialName: string;
    price: number;
    explanation: string;
  }>;
  unresolved: string[];
} = {
  overrides: {},
  provenance: [],
  unresolved: [],
};

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
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
  printQuote: vi.fn(),
}));
vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: () => "NGN",
  useMarket: () => ({
    marketCode: mockMarket.code,
    market: mockMarket,
  }),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({
    symbol: mockMarket.currencySymbol,
    code: mockMarket.currencyCode,
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
    ],
    error: null,
  }),
  fetchMarketPriceBook: vi.fn().mockImplementation((mCode: string) =>
    Promise.resolve({
      market: mCode,
      byRef: new Map([
        ["mat-door-flush", 120],
        ["mat-door-frame", 45],
      ]),
      missingFromMarket: [],
      fromReference: new Set(["mat-door-flush", "mat-door-frame"]),
    }),
  ),
  createEstimate: vi
    .fn()
    .mockResolvedValue({ data: { id: "est-1" }, error: null }),
  createEstimateItem: vi
    .fn()
    .mockResolvedValue({ data: { id: "item-1" }, error: null }),
}));

vi.mock("@/lib/estimation/structural-market", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/estimation/structural-market")>();
  return {
    ...actual,
    resolveMarketDoorsWindows: vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockDoorsMarketResolution)),
  };
});

import DoorsWindowsEstimator from "@/pages/DoorsWindowsEstimator";

describe("DoorsWindowsEstimator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarket = {
      code: "US",
      name: "United States",
      currencyCode: "USD",
      currencySymbol: "$",
    };
    mockDoorsMarketResolution = {
      overrides: {},
      provenance: [],
      unresolved: [],
    };
  });

  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/DoorsWindowsEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("renders trade-price-coverage banner for US market", async () => {
    render(
      <MemoryRouter>
        <DoorsWindowsEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trade-price-coverage")).toBeInTheDocument();
    });
    expect(screen.getByText(/Price book coverage \(US\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /The US price book does not yet cover doors, frames and hardware/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders doors-windows-price-provenance card when market resolver returns provenance rows", async () => {
    mockDoorsMarketResolution = {
      overrides: {
        "door-flush": 68.0,
      },
      provenance: [
        {
          engineKey: "door-flush",
          resolved: true,
          bookMarket: "US",
          materialName: "Hollow Core Flush Interior Door Slab, 32x80 in (US)",
          price: 68.0,
          explanation: "Unit price from the US book (The Home Depot (US)).",
        },
      ],
      unresolved: [
        "door-panel",
        "door-security",
        "door-frame",
        "door-hinge",
        "door-lockset",
        "window-aluminium",
        "window-louver",
      ],
    };

    render(
      <MemoryRouter>
        <DoorsWindowsEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("doors-windows-price-provenance"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Market doors & windows prices \(US book\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Hollow Core Flush Interior Door Slab, 32x80 in \(US\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reported unpriced, never silent substitution/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The US price book covers 1 of 8 door and window material types/i,
      ),
    ).toBeInTheDocument();
  });
});
