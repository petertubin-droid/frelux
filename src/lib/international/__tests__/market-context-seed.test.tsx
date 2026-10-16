import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  MarketProvider,
  useMarket,
  MARKET_STORAGE_KEY,
  LENGTH_UNIT_STORAGE_KEY,
  AREA_UNIT_STORAGE_KEY,
} from "@/lib/international/market-context";
import { CURRENCY_STORAGE_KEY } from "@/lib/international/fx-display";

const { detectMarketCode } = vi.hoisted(() => ({
  detectMarketCode: vi.fn(),
}));
const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

// Detection itself has its own tests; here we pin the timezone-driven
// result so loadMarketContext's seeding behaviour is the unit under
// test.
vi.mock("@/lib/international/market-suggest", () => ({
  detectMarketCode,
}));

// No DB: profile resolution must fall through to the built-in profiles,
// exactly as an offline / unconnected visitor experiences.
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    }),
  ),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, isAdmin: false }),
}));

function Probe() {
  const ctx = useMarket();
  return (
    <div>
      <span data-testid="market">{ctx.marketCode}</span>
      <span data-testid="length">{ctx.preferredLengthUnit}</span>
      <span data-testid="area">{ctx.preferredAreaUnit}</span>
      <span data-testid="currency">{ctx.market.currencyCode}</span>
    </div>
  );
}

const renderProbe = () =>
  render(
    <MarketProvider>
      <Probe />
    </MarketProvider>,
  );

describe("first-visit detection seeds units and display currency", () => {
  beforeEach(() => {
    localStorage.clear();
    detectMarketCode.mockReset();
    detectMarketCode.mockReturnValue(null);
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: null });
  });

  it("seeds US units and currency for a first-visit US visitor", async () => {
    detectMarketCode.mockReturnValue("US");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("US"),
    );
    // market context resolved the US profile...
    expect(screen.getByTestId("currency").textContent).toBe("USD");
    // ...and the visit was seeded with the market's units + currency,
    // exactly as an explicit setMarket("US") would have done.
    expect(screen.getByTestId("length").textContent).toBe("feet");
    expect(screen.getByTestId("area").textContent).toBe("sqft");
    expect(localStorage.getItem(MARKET_STORAGE_KEY)).toBe("US");
    expect(localStorage.getItem(LENGTH_UNIT_STORAGE_KEY)).toBe("feet");
    expect(localStorage.getItem(AREA_UNIT_STORAGE_KEY)).toBe("sqft");
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("USD");
  });

  it("keeps the NG default (meters/sqm/NGN) when detection finds nothing", async () => {
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("NG"),
    );
    expect(screen.getByTestId("length").textContent).toBe("meters");
    expect(screen.getByTestId("area").textContent).toBe("sqm");
    expect(screen.getByTestId("currency").textContent).toBe("NGN");
    // No market signal means nothing is persisted: detection stays free
    // to run again on a later visit (the NG default needs no seeding -
    // meters/sqm/NGN are already the fallback state).
    expect(localStorage.getItem(MARKET_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LENGTH_UNIT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBeNull();
  });

  it("never overrides explicitly saved unit preferences on a later visit", async () => {
    // Second visit: market saved on visit one, but the visitor chose
    // meters manually afterwards. Detection must not run at all.
    localStorage.setItem(MARKET_STORAGE_KEY, "US");
    localStorage.setItem(LENGTH_UNIT_STORAGE_KEY, "meters");
    localStorage.setItem(AREA_UNIT_STORAGE_KEY, "sqm");
    localStorage.setItem(CURRENCY_STORAGE_KEY, "USD");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("US"),
    );
    expect(screen.getByTestId("length").textContent).toBe("meters");
    expect(screen.getByTestId("area").textContent).toBe("sqm");
    expect(detectMarketCode).not.toHaveBeenCalled();
  });
});
