import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  MarketProvider,
  useMarket,
  useLocalTerm,
  MARKET_STORAGE_KEY,
} from "@/lib/international/market-context";

const { detectMarketCode } = vi.hoisted(() => ({
  detectMarketCode: vi.fn(),
}));
const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

// Detection has its own tests; here we pin the resolved market via the
// saved-market path so useLocalTerm is the unit under test.
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
  const localTerm = useLocalTerm();
  return (
    <div>
      <span data-testid="market">{useMarket().marketCode}</span>
      <span data-testid="paint">{localTerm("paint_bucket", "buckets")}</span>
      <span data-testid="pop">{localTerm("pop_bag", "25kg bag")}</span>
      <span data-testid="missing">
        {localTerm("no_such_key", "fallback text")}
      </span>
    </div>
  );
}

const renderProbe = () =>
  render(
    <MarketProvider>
      <Probe />
    </MarketProvider>,
  );

describe("useLocalTerm (market-aware presentation terminology)", () => {
  beforeEach(() => {
    localStorage.clear();
    detectMarketCode.mockReset();
    detectMarketCode.mockReturnValue(null);
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: null });
  });

  it("renders the market's curated pack term for a US visitor", async () => {
    localStorage.setItem(MARKET_STORAGE_KEY, "US");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("US"),
    );
    // Curated profile terminology replaces the Nigerian phrasing.
    expect(screen.getByTestId("paint").textContent).toBe("1 gal / 5 gal pail");
    expect(screen.getByTestId("pop").textContent).toBe("drywall sheet (4x8)");
  });

  it("keeps the established NG phrasing (the fallback) for NG visitors", async () => {
    localStorage.setItem(MARKET_STORAGE_KEY, "NG");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("NG"),
    );
    // NG fallback IS the established local phrasing; byte-for-byte
    // unchanged so the reference market's UX is not churned.
    expect(screen.getByTestId("paint").textContent).toBe("buckets");
    expect(screen.getByTestId("pop").textContent).toBe("25kg bag");
  });

  it("falls back to the passed text when the profile has no entry", async () => {
    localStorage.setItem(MARKET_STORAGE_KEY, "US");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("market").textContent).toBe("US"),
    );
    // Never a guessed synonym: a missing curated entry keeps the
    // neutral fallback text.
    expect(screen.getByTestId("missing").textContent).toBe("fallback text");
  });
});
