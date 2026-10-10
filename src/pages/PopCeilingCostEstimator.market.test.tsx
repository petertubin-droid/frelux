/**
 * Market-aware behaviour of the POP Ceiling Cost Estimator:
 * - a non-NG market defaults to the board-based (international) workflow
 * - market materials resolve market-first and never fall back silently:
 *   a fallback is disclosed in the UI
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));
vi.mock("@/lib/labour", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/labour")>()),
  fetchLabourSettings: vi.fn().mockResolvedValue(null),
  calculateLabourCost: vi.fn().mockReturnValue(0),
  useLabourConfig: vi.fn(() => ({
    config: {
      includeLabour: false,
      pricingMethod: "fixed",
      fixedAmount: 0,
      perSqmRate: 0,
      perRoomRate: 0,
      roomCount: 1,
      dailyRate: 0,
      dayCount: 1,
      customAmount: 0,
      categoryId: null,
    },
    setConfig: vi.fn(),
  })),
}));
vi.mock("@/lib/seo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo")>()),
  useSeo: vi.fn(),
}));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: vi.fn(() => ({ marketCode: "US" })),
  DEFAULT_MARKET_CODE: "NG",
}));
const fetchPopMaterialsMock = vi.fn();
vi.mock("@/lib/queries", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(null),
  fetchPopMaterials: (...args: unknown[]) => fetchPopMaterialsMock(...args),
  fetchSiteSettings: vi.fn().mockResolvedValue({ data: null, error: null }),
  saveUserProject: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

import PopCeilingCostEstimator from "./PopCeilingCostEstimator";

const US_DRYWALL_ROW = {
  id: "us-board-1",
  market: "US",
  workflow: "international",
  category: "ceiling_boards",
  name: "USG Sheetrock Drywall Panel 1/2in 4x8",
  description: "US suspended ceiling",
  unit: "board",
  coverage_rate: 2.97,
  coverage_unit: "m²",
  package_size: 1,
  package_unit: "board",
  unit_price: 14,
  labour_rate_per_sqm: 0,
  is_optional: false,
  currency: "USD",
  is_active: true,
  sort_order: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PopCeilingCostEstimator />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("PopCeilingCostEstimator market awareness (US)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to the board-based (international) workflow for a US visitor", async () => {
    fetchPopMaterialsMock.mockResolvedValue({
      data: [US_DRYWALL_ROW],
      error: null,
      fellBackToNg: false,
    });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByTestId("ng-reference-notice")).toBeNull(),
    );
    // materials are requested for the visitor's market
    expect(fetchPopMaterialsMock).toHaveBeenCalledWith(undefined, "US");
  });

  it("discloses a NG fallback instead of substituting silently", async () => {
    fetchPopMaterialsMock.mockResolvedValue({
      data: [{ ...US_DRYWALL_ROW, market: "NG", name: "Gypsum Board" }],
      error: null,
      fellBackToNg: true,
    });
    renderPage();
    expect(
      await screen.findByTestId("ng-reference-notice"),
    ).toBeInTheDocument();
  });
});
