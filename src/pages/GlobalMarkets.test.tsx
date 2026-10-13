/**
 * Global Markets page tests (Phase 6)
 *
 * Pin the page wiring: market list from market_profiles, sourced
 * external metrics rendered WITH their source, honest absence
 * ("not yet sourced") for markets without sourced metrics, and
 * coverage badges derived from the frelux_* ranking rows.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalMarkets from "./GlobalMarkets";

const mockProfiles = vi.hoisted(() => [
  {
    country_code: "US",
    country_name: "United States",
    region: "North America",
    currency_code: "USD",
    currency_symbol: "$",
    default_language: "en",
    status: "active",
    is_visible: true,
    sort_order: 10,
    admin_notes: null,
  },
  {
    country_code: "NG",
    country_name: "Nigeria",
    region: "West Africa",
    currency_code: "NGN",
    currency_symbol: "₦",
    default_language: "en",
    status: "active",
    is_visible: true,
    sort_order: 20,
    admin_notes: null,
  },
  {
    country_code: "CN",
    country_name: "China",
    region: "East Asia",
    currency_code: "CNY",
    currency_symbol: "¥",
    default_language: "zh",
    status: "active",
    is_visible: true,
    sort_order: 160,
    admin_notes: null,
  },
]);

const mockRankings = vi.hoisted(() => [
  // US: high coverage + a sourced external metric
  {
    market_code: "US",
    metric: "frelux_coverage_level",
    value: 3,
    unit: "level",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "US",
    metric: "frelux_price_book_rows",
    value: 28,
    unit: "active price rows",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "US",
    metric: "frelux_role_mappings",
    value: 19,
    unit: "mapped roles",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "US",
    metric: "frelux_scan_sources",
    value: 12,
    unit: "active retailer sources",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "US",
    metric: "construction_output",
    value: 2190,
    unit: "billion USD (SAAR, Dec 2024)",
    source_name: "U.S. Census Bureau construction spending release",
    source_url: "https://www.census.gov/constructionspending/",
    as_of: "2024-12-01",
    confidence: "medium",
    notes: null,
  },
  // NG: high coverage, NO sourced external metric
  {
    market_code: "NG",
    metric: "frelux_coverage_level",
    value: 3,
    unit: "level",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "NG",
    metric: "frelux_price_book_rows",
    value: 34,
    unit: "active price rows",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "NG",
    metric: "frelux_role_mappings",
    value: 16,
    unit: "mapped roles",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  {
    market_code: "NG",
    metric: "frelux_scan_sources",
    value: 4,
    unit: "active retailer sources",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
  },
  // CN: pending — no rows at all
]);

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));
vi.mock("@/lib/safeError", () => ({
  getSafeError: vi.fn((_e: unknown, fallback: string) => fallback),
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const selectState = vi.hoisted(() => ({
  profileError: null as null | { message: string },
  rankingError: null as null | { message: string },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const state: Record<string, unknown> =
        table === "market_profiles"
          ? { data: mockProfiles, error: selectState.profileError }
          : { data: mockRankings, error: selectState.rankingError };
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve(state),
        then: (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
          Promise.resolve(state).then(resolve, reject),
      };
      return chain;
    }),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <GlobalMarkets />
    </MemoryRouter>,
  );
}

describe("GlobalMarkets page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectState.profileError = null;
    selectState.rankingError = null;
  });

  it("renders all visible markets with currency info", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-US")).toBeTruthy();
    });
    expect(screen.getByTestId("market-card-NG")).toBeTruthy();
    expect(screen.getByTestId("market-card-CN")).toBeTruthy();
    expect(screen.getByTestId("market-card-US").textContent).toContain(
      "USD ($)",
    );
    expect(screen.getByTestId("market-card-NG").textContent).toContain(
      "NGN (₦)",
    );
    expect(screen.getByTestId("market-card-CN").textContent).toContain(
      "CNY (¥)",
    );
  });

  it("renders sourced external metrics with the source link and as-of date", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-US")).toBeTruthy();
    });
    const card = screen.getByTestId("market-card-US");
    expect(card.textContent).toContain("Construction output");
    expect(card.textContent).toContain("2,190");
    expect(card.textContent).toContain("U.S. Census Bureau");
    expect(card.textContent).toContain("2024-12-01");
    const link = card.querySelector("a[href*='census.gov']");
    expect(link).not.toBeNull();
  });

  it("renders honest absence for a market without sourced external metrics", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-NG")).toBeTruthy();
    });
    const card = screen.getByTestId("market-card-NG");
    expect(card.textContent).toContain("not yet sourced");
    expect(card.textContent).not.toContain("Construction output");
  });

  it("shows pending verification for a market with no ranking rows", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-CN")).toBeTruthy();
    });
    const card = screen.getByTestId("market-card-CN");
    expect(card.textContent).toContain("Pending verification");
    expect(card.textContent).toContain(
      "registered; its product data is pending verification",
    );
  });

  it("renders FRELUX coverage counts", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-US")).toBeTruthy();
    });
    const card = screen.getByTestId("market-card-US");
    expect(card.textContent).toContain("Verified price rows");
    expect(card.textContent).toContain("28");
    expect(card.textContent).toContain("High coverage");
  });

  it("sorts higher-coverage markets first", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("market-card-CN")).toBeTruthy();
    });
    const cards = screen.getAllByRole("article");
    expect(cards[0].getAttribute("data-testid")).toBe("market-card-US");
    // NG (also level 3) sorts by sort_order after US
    expect(cards[1].getAttribute("data-testid")).toBe("market-card-NG");
    expect(cards[2].getAttribute("data-testid")).toBe("market-card-CN");
  });

  it("surfaces a load error instead of pretending markets loaded", async () => {
    selectState.profileError = { message: "relation missing" };
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Could not load market data/i)).toBeTruthy();
    });
  });
});
