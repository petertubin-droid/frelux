// =========================================================
// ARCHIE TRADING SCREEN TESTS (batch 20, fix 67)
//
// The screen must say the truth: an unconfigured venue shows
// the honest reason + the Exchange Access link; dry run
// shows every gate check; refused execution is displayed,
// never retried silently.
// =========================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchTradingStatus = vi.fn();
const fetchTradingPositions = vi.fn();
const dryRunTrade = vi.fn();
const executeTrade = vi.fn();
const setTradingState = vi.fn();
const emergencyCancel = vi.fn();

vi.mock("@/lib/archie/trading-client", () => ({
  fetchTradingStatus: (...a: unknown[]) => fetchTradingStatus(...a),
  fetchTradingPositions: (...a: unknown[]) => fetchTradingPositions(...a),
  dryRunTrade: (...a: unknown[]) => dryRunTrade(...a),
  executeTrade: (...a: unknown[]) => executeTrade(...a),
  setTradingState: (...a: unknown[]) => setTradingState(...a),
  emergencyCancel: (...a: unknown[]) => emergencyCancel(...a),
}));

import ArchieTrading from "@/pages/archie/ArchieTrading";

const UNCONFIGURED_STATUS = {
  venue: {
    configured: false,
    venue: null,
    mode: null,
    reason:
      "exchange execution is NOT configured: BINANCE_API_KEY / BINANCE_API_SECRET are not provisioned.",
  },
  credentials: {
    api_key_provisioned: false,
    api_secret_provisioned: false,
    mode: "TESTNET (default)",
    mainnet_authorized_by_secret: false,
  },
  state: {
    emergency_stop: true,
    trading_enabled: false,
    limits: { probabilityThreshold: 0.62, maxPositionPct: 0.02 },
  },
  portfolio: {
    total_positions: 0,
    open_positions: 0,
    closed_positions: 0,
    stats: {},
    exposure: {},
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieTrading />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchTradingStatus.mockResolvedValue(UNCONFIGURED_STATUS);
});

describe("ArchieTrading", () => {
  it("renders the owner-only console header", async () => {
    renderPage();
    expect(await screen.findByText("ARCHIE Trading")).toBeInTheDocument();
  });

  it("shows the honest NOT-configured reason with the Exchange Access link", async () => {
    renderPage();
    const matches = await screen.findAllByText(
      /Exchange execution is NOT configured/i,
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("link", { name: /Exchange Access center/i }),
    ).toHaveAttribute("href", "/archie/exchange-access");
  });

  it("shows the emergency stop as ENGAGED with safe defaults", async () => {
    renderPage();
    expect(await screen.findByText("ENGAGED")).toBeInTheDocument();
    expect(await screen.findByText("Disabled")).toBeInTheDocument();
  });

  it("surfaces status errors from the server", async () => {
    fetchTradingStatus.mockRejectedValue(
      new Error("archie-trading: Trading is Owner/Admin-only."),
    );
    renderPage();
    expect(
      await screen.findByText(/Trading is Owner\/Admin-only/i),
    ).toBeInTheDocument();
  });

  it("lists server gate limits on the overview", async () => {
    renderPage();
    expect(await screen.findByText(/probabilityThreshold/)).toBeInTheDocument();
  });

  it("shows an empty-positions message when no audited records exist", async () => {
    fetchTradingPositions.mockResolvedValue({
      positions: [],
      stats: {},
      exposure: {},
    });
    renderPage();
    const tab = await screen.findByRole("button", { name: /positions/i });
    tab.click();
    expect(
      await screen.findByText(
        /Positions appear here only when opened through the audited execution path/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders position rows from audited records", async () => {
    fetchTradingPositions.mockResolvedValue({
      positions: [
        {
          id: "pos_BTCUSDT_1",
          symbol: "BTCUSDT",
          direction: "long",
          entryPrice: 50000,
          stopPrice: 49000,
          targetPrice: 52000,
          positionSizeQuote: 100,
          portfolioValueQuote: 10000,
          openedAtMs: 1,
          state: "OPEN",
          status: "FILLED",
          exitPrice: null,
          closedAtMs: null,
          realizedPnlQuote: null,
          realizedPnlPct: null,
          feesPaidQuote: 0,
        },
      ],
      stats: {},
      exposure: {},
    });
    renderPage();
    const tab = await screen.findByRole("button", { name: /positions/i });
    tab.click();
    expect(await screen.findByText("pos_BTCUSDT_1")).toBeInTheDocument();
    expect(await screen.findByText("FILLED")).toBeInTheDocument();
  });

  it("labels manual evidence on the trade tab", async () => {
    renderPage();
    const tradeTab = await screen.findByRole("button", { name: /trade/i });
    tradeTab.click();
    expect(
      await screen.findByText(/manually provided by you/i),
    ).toBeInTheDocument();
  });

  it("disables the engage button when the stop is already engaged", async () => {
    renderPage();
    const engage = await screen.findByText("Engage emergency stop");
    expect(engage).toBeDisabled();
  });
});
