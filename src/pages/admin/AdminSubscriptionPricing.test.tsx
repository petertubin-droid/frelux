import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------
// SUBSCRIPTION PRICE RECONCILIATION
// The screen exists so an operator can see, per market, what is charged
// against what the recorded rate implies, and change it deliberately.
//   * problem rows surface with their reason for being flagged
//   * the summary counts match the report
//   * applying a rate requires a reason and sends it to the RPC
//   * a read failure surfaces instead of showing an empty table
// ---------------------------------------------------------

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

import AdminSubscriptionPricing from "./AdminSubscriptionPricing";

const row = (over: Record<string, unknown> = {}) => ({
  market_code: "NG",
  country_name: "Nigeria",
  plan: "pro",
  billing_cycle: "monthly",
  currency: "NGN",
  local_minor: 500000,
  local_currency: "NGN",
  stored_rate: 1550,
  fx_source: "fx_rates",
  updated_at: "2026-10-29T16:48:53Z",
  live_rate: 1550,
  live_rate_source: "fx_rates",
  fetched_at: "2026-10-30T22:31:14Z",
  implied_minor: 500000,
  deviation_pct: 0,
  status: "ok",
  ...over,
});

const missing = row({
  market_code: "AT",
  country_name: "Austria",
  currency: "EUR",
  local_minor: null,
  local_currency: null,
  implied_minor: 447,
  deviation_pct: null,
  status: "missing",
});

const offRate = row({
  market_code: "CA",
  country_name: "Canada",
  currency: "CAD",
  local_minor: 800,
  local_currency: "CAD",
  implied_minor: 710,
  deviation_pct: 12.7,
  status: "off_rate",
});

beforeEach(() => {
  rpc.mockReset();
});

describe("AdminSubscriptionPricing", () => {
  it("leads with the problem rows and hides the healthy ones", async () => {
    rpc.mockResolvedValue({ data: [row(), missing, offRate], error: null });
    render(<AdminSubscriptionPricing />);

    expect(await screen.findByText(/AT · Austria/)).toBeInTheDocument();
    expect(screen.getByText(/CA · Canada/)).toBeInTheDocument();
    // Nigeria is in line, so it stays behind the filter.
    expect(screen.queryByText(/NG · Nigeria/)).not.toBeInTheDocument();
    expect(screen.getAllByText("No local price").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Off the rate").length).toBeGreaterThan(0);
    expect(screen.getByText("+12.7%")).toBeInTheDocument();
  });

  it("counts each state for the summary tiles", async () => {
    rpc.mockResolvedValue({ data: [row(), missing, offRate], error: null });
    render(<AdminSubscriptionPricing />);
    await screen.findByText(/AT · Austria/);

    const tile = (key: string) =>
      screen.getByTestId(`price-tile-${key}`).textContent ?? "";
    expect(tile("ok")).toContain("1");
    expect(tile("off_rate")).toContain("1");
    expect(tile("missing")).toContain("1");
  });

  it("refuses to change a price without a reason", async () => {
    rpc.mockResolvedValue({ data: [offRate], error: null });
    render(<AdminSubscriptionPricing />);
    await screen.findByText(/CA · Canada/);

    fireEvent.click(screen.getByRole("button", { name: /use the rate/i }));
    // Only the report read happened; no write was attempted.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("admin_subscription_price_report", {
      p_deviation_pct: 5,
    });
  });

  it("applies the recorded rate for a market with the reason attached", async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === "admin_apply_subscription_prices") {
        return Promise.resolve({
          data: { applied: 6, unchanged: 0 },
          error: null,
        });
      }
      return Promise.resolve({ data: [offRate], error: null });
    });
    render(<AdminSubscriptionPricing />);
    await screen.findByText(/CA · Canada/);

    fireEvent.change(screen.getByPlaceholderText(/quarterly FX review/i), {
      target: { value: "quarterly FX review" },
    });
    fireEvent.click(screen.getByRole("button", { name: /use the rate/i }));

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("admin_apply_subscription_prices", {
        p_markets: ["CA"],
        p_reason: "quarterly FX review",
      }),
    );
  });

  it("surfaces a failed read instead of an empty table", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    render(<AdminSubscriptionPricing />);

    expect(
      await screen.findByText(/could not read the price report/i),
    ).toBeInTheDocument();
    expect(screen.getByText("permission denied")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("disables the rate action when no rate has been recorded", async () => {
    rpc.mockResolvedValue({
      data: [
        row({
          ...missing,
          live_rate: null,
          live_rate_source: null,
          status: "no_rate",
        }),
      ],
      error: null,
    });
    render(<AdminSubscriptionPricing />);
    await screen.findByText(/AT · Austria/);

    expect(
      screen.getByRole("button", { name: /use the rate/i }),
    ).toBeDisabled();
  });
});
