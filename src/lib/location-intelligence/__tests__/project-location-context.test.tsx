// =========================================================
// LOCATION INTELLIGENCE, PROJECT LOCATION CONTEXT TESTS
//
// The shared consumption layer contract:
//   * no location → regional null, loading false, currency
//     NULL (callers keep their existing behavior)
//   * resolved available region → currency from THAT region's
//     active profile only
//   * unresolved/unsupported region → currency NULL, never a
//     substituted region's currency
//   * resolution failure → safe nulls, no crash
//   * useProjectLocation outside the provider throws
//   * calculator hook keeps settings-based currency untouched
//     when no regional profile exists
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { RegionalContext } from "@/lib/location-intelligence/regional";
import type { FreluxLocation } from "@/lib/location-intelligence/model";

vi.mock("@/lib/location-intelligence/regional", () => ({
  resolveRegionalContext: vi.fn(),
}));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: vi.fn(() => ({ currency: { code: "NGN", symbol: "₦" } })),
}));

import { resolveRegionalContext } from "@/lib/location-intelligence/regional";
import {
  ProjectLocationProvider,
  useProjectLocation,
  useProjectLocationCurrency,
  useUserMarketFallback,
} from "@/lib/location-intelligence/project-location-context";

const LOC: FreluxLocation = {
  latitude: 6.5,
  longitude: 3.4,
  accuracy_m: null,
  formatted_address: "Lagos",
  country: "Nigeria",
  country_code: "NG",
  region: "Lagos",
  city: "Lagos",
} as unknown as FreluxLocation;

function available(): RegionalContext {
  return {
    status: "available",
    country_code: "NG",
    country_name: "Nigeria",
    reason: "matched",
    currency_code: "NGN",
    currency_symbol: "₦",
  } as RegionalContext;
}
function unsupported(): RegionalContext {
  return {
    status: "unavailable",
    country_code: "XX",
    country_name: "X",
    reason: "no market profile",
  } as RegionalContext;
}

/** Probe component exposing the context values on screen. */
function Probe() {
  const ctx = useProjectLocation();
  return (
    <div>
      <span data-testid="currency">{ctx.currencyCode ?? "null"}</span>
      <span data-testid="symbol">{ctx.currencySymbol ?? "null"}</span>
      <span data-testid="supported">{String(ctx.isRegionSupported)}</span>
      <span data-testid="loading">{String(ctx.regionalLoading)}</span>
      <span data-testid="market-fallback">
        {
          (useUserMarketFallback() as unknown as { currency: { code: string } })
            .currency.code
        }
      </span>
    </div>
  );
}

function CurrencyProbe({ loc }: { loc: FreluxLocation | null | undefined }) {
  const { currencyCode, currencySymbol } = useProjectLocationCurrency(loc);
  return (
    <div>
      <span data-testid="cur-hook">{currencyCode ?? "null"}</span>
      <span data-testid="sym-hook">{currencySymbol ?? "null"}</span>
    </div>
  );
}

function renderProvider(loc: FreluxLocation | null, children: ReactNode) {
  return render(
    <ProjectLocationProvider location={loc}>
      {children}
    </ProjectLocationProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectLocationProvider + useProjectLocation", () => {
  it("no location → regional null, not loading, currency null", () => {
    renderProvider(null, <Probe />);
    expect(resolveRegionalContext).not.toHaveBeenCalled();
    expect(screen.getByTestId("currency").textContent).toBe("null");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("resolves the region once and exposes its active-profile currency", async () => {
    vi.mocked(resolveRegionalContext).mockResolvedValue(available());
    renderProvider(LOC, <Probe />);
    await waitFor(() =>
      expect(screen.getByTestId("supported").textContent).toBe("true"),
    );
    expect(screen.getByTestId("currency").textContent).toBe("NGN");
    expect(screen.getByTestId("symbol").textContent).toBe("₦");
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(resolveRegionalContext).toHaveBeenCalledTimes(1);
  });

  it("unsupported region → isRegionSupported false, currency stays null (no substitution)", async () => {
    vi.mocked(resolveRegionalContext).mockResolvedValue(unsupported());
    renderProvider(LOC, <Probe />);
    await waitFor(() =>
      expect(screen.getByTestId("supported").textContent).toBe("false"),
    );
    expect(screen.getByTestId("currency").textContent).toBe("null");
    expect(screen.getByTestId("market-fallback").textContent).toBe("NGN");
  });

  it("resolution failure → safe nulls, no crash", async () => {
    vi.mocked(resolveRegionalContext).mockRejectedValue(new Error("network"));
    renderProvider(LOC, <Probe />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("currency").textContent).toBe("null");
    expect(screen.getByTestId("supported").textContent).toBe("false");
  });

  it("useProjectLocation outside the provider throws (contract guard)", () => {
    // silence the expected React error boundary output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ProjectLocationProvider/);
    spy.mockRestore();
  });
});

describe("useProjectLocationCurrency (calculator bridge)", () => {
  it("no location → nulls (settings-based currency untouched)", () => {
    render(<CurrencyProbe loc={null} />);
    expect(screen.getByTestId("cur-hook").textContent).toBe("null");
    expect(screen.getByTestId("sym-hook").textContent).toBe("null");
    expect(resolveRegionalContext).not.toHaveBeenCalled();
  });

  it("available region → that region's currency", async () => {
    vi.mocked(resolveRegionalContext).mockResolvedValue(available());
    render(<CurrencyProbe loc={LOC} />);
    await waitFor(() =>
      expect(screen.getByTestId("cur-hook").textContent).toBe("NGN"),
    );
    expect(screen.getByTestId("sym-hook").textContent).toBe("₦");
  });

  it("unsupported region → nulls, never another region's currency", async () => {
    vi.mocked(resolveRegionalContext).mockResolvedValue(unsupported());
    render(<CurrencyProbe loc={LOC} />);
    await waitFor(() =>
      expect(screen.getByTestId("cur-hook").textContent).toBe("null"),
    );
  });

  it("failure → nulls (calculators keep existing behavior)", async () => {
    vi.mocked(resolveRegionalContext).mockRejectedValue(new Error("x"));
    render(<CurrencyProbe loc={LOC} />);
    await waitFor(() =>
      expect(screen.getByTestId("cur-hook").textContent).toBe("null"),
    );
  });

  it("location change re-resolves once for the new location", async () => {
    vi.mocked(resolveRegionalContext).mockResolvedValue(available());
    const { rerender } = render(<CurrencyProbe loc={LOC} />);
    await waitFor(() =>
      expect(screen.getByTestId("cur-hook").textContent).toBe("NGN"),
    );
    rerender(<CurrencyProbe loc={null} />);
    await waitFor(() =>
      expect(screen.getByTestId("cur-hook").textContent).toBe("null"),
    );
    expect(resolveRegionalContext).toHaveBeenCalledTimes(1);
    await act(async () => {
      rerender(<CurrencyProbe loc={LOC} />);
    });
    expect(resolveRegionalContext).toHaveBeenCalledTimes(2);
  });
});
