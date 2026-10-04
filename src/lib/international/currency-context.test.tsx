import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import {
  CurrencyProvider,
  useDisplayCurrency,
} from "@/lib/international/currency-context";
import { CURRENCY_STORAGE_KEY } from "@/lib/international/fx-display";

import { setDisplayCurrencyState } from "@/lib/international/fx-display";

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() =>
    Promise.resolve({
      from: () => ({ select: () => ({ limit: () => ({ maybeSingle }) }) }),
    }),
  ),
}));

function Probe() {
  const ctx = useDisplayCurrency();
  return (
    <div>
      <span data-testid="code">{ctx.code}</span>
      <span data-testid="converting">{String(ctx.converting)}</span>
      <span data-testid="rate">{ctx.rateDescription ?? "none"}</span>
      <button onClick={() => ctx.setCurrency("USD")}>to-USD</button>
      <button onClick={() => ctx.setCurrency("XXX")}>to-XXX</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <CurrencyProvider>
      <Probe />
    </CurrencyProvider>,
  );

describe("CurrencyProvider", () => {
  beforeEach(() => {
    localStorage.removeItem(CURRENCY_STORAGE_KEY);
    setDisplayCurrencyState("NGN", { enabled: false, rates: {} });
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: null });
  });

  it("defaults to NGN with no conversion when no config exists", async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId("code").textContent).toBe("NGN"),
    );
    expect(screen.getByTestId("converting").textContent).toBe("false");
    expect(screen.getByTestId("rate").textContent).toBe("none");
  });

  it("exposes enabled FX config as converting=true with a rate description", async () => {
    maybeSingle.mockResolvedValue({
      data: { display_currencies: { enabled: true, rates: { USD: 0.00065 } } },
    });
    renderProbe();
    await act(async () => {
      screen.getByText("to-USD").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("code").textContent).toBe("USD"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("converting").textContent).toBe("true"),
    );
    expect(screen.getByTestId("rate").textContent).toContain("0.00065");
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("USD");
  });

  it("rejects unknown currency codes without persisting", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    renderProbe();
    await act(async () => {
      screen.getByText("to-XXX").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("code").textContent).toBe("NGN"),
    );
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe(null);
  });
});
