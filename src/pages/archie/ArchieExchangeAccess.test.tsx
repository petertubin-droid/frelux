// =========================================================
// ARCHIE EXCHANGE ACCESS TESTS (batch 20, fix 68)
//
// The login center must show provisioning state WITHOUT any
// secret value, explain the MAINNET authorization contract,
// and operate the killswitch honestly.
// =========================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchTradingStatus = vi.fn();
const setTradingState = vi.fn();

vi.mock("@/lib/archie/trading-client", () => ({
  fetchTradingStatus: (...a: unknown[]) => fetchTradingStatus(...a),
  setTradingState: (...a: unknown[]) => setTradingState(...a),
}));

import ArchieExchangeAccess from "@/pages/archie/ArchieExchangeAccess";

const STATUS = {
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
    limits: {},
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
      <ArchieExchangeAccess />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchTradingStatus.mockResolvedValue(STATUS);
});

describe("ArchieExchangeAccess", () => {
  it("renders the trading login center header", async () => {
    renderPage();
    expect(await screen.findByText("Exchange Access")).toBeInTheDocument();
  });

  it("shows provisioning state for both secrets", async () => {
    renderPage();
    expect(
      await screen.findByText(/BINANCE_API_KEY/i, { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("NOT provisioned").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("never displays secret values — only provisioned flags", async () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/apikey\s*[:=]/i);
  });

  it("states the MAINNET authorization contract honestly", async () => {
    renderPage();
    expect(
      await screen.findByText(/false \/ unset — MAINNET impossible/i),
    ).toBeInTheDocument();
  });

  it("shows TESTNET as the default mode", async () => {
    renderPage();
    expect(await screen.findByText("TESTNET (default)")).toBeInTheDocument();
  });

  it("shows the boot reason when no adapter exists", async () => {
    renderPage();
    expect(
      await screen.findByText(
        /BINANCE_API_KEY \/ BINANCE_API_SECRET are not provisioned/i,
      ),
    ).toBeInTheDocument();
  });

  it("disengages the emergency stop through set_state", async () => {
    setTradingState.mockResolvedValue({
      ok: true,
      state: { emergency_stop: false, trading_enabled: false, limits: {} },
    });
    renderPage();
    const disengage = await screen.findByText("Disengage stop");
    expect(disengage).toBeEnabled(); // stop is engaged -> disengage is the live action
    fireEvent.click(disengage);
    await waitFor(() =>
      expect(setTradingState).toHaveBeenCalledWith({ emergency_stop: false }),
    );
    expect(
      await screen.findByText(/full trade-gate still applies/i),
    ).toBeInTheDocument();
  });

  it("keeps the engage button disabled while the stop is engaged", async () => {
    renderPage();
    const engage = await screen.findByText("Engage stop");
    expect(engage).toBeDisabled();
  });

  it("operates the killswitch when the stop is clear", async () => {
    fetchTradingStatus.mockResolvedValue({
      ...STATUS,
      state: { emergency_stop: false, trading_enabled: true, limits: {} },
    });
    renderPage();
    const engage = await screen.findByText("Engage stop");
    expect(engage).toBeEnabled();
    fireEvent.click(engage);
    await waitFor(() =>
      expect(setTradingState).toHaveBeenCalledWith({ emergency_stop: true }),
    );
    expect(
      await screen.findByText(/Emergency stop ENGAGED — no trade may pass/i),
    ).toBeInTheDocument();
  });
});
