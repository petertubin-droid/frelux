// =========================================================
// ARCHIE TRADING SCREEN (batch 20, fix 67, 2026-09-15)
//
// Owner-only operator surface for the trading engines
// (trade-gate -> exchange execution -> order lifecycle ->
// portfolio). Every number shown comes from the server;
// the screen never computes trading math client-side.
//
// Honesty rules (same as the engines):
//   * No venue credentials -> the screen SAYS so, with the
//     exact reason, and offers the Exchange Access center.
//   * A dry run never touches a venue.
//   * An ineligible gate decision is displayed with every
//     failed check -- never silently retried.
//   * Evidence entered here is MANUALLY-PROVIDED and the UI
//     says so on every form.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTradingPositions,
  fetchTradingStatus,
  dryRunTrade,
  emergencyCancel,
  executeTrade,
  setTradingState,
  type DryRunResult,
  type ExecuteResult,
  type GateCheckView,
  type PositionsResult,
  type TradingPositionView,
  type TradingStatus,
} from "@/lib/archie/trading-client";

type Tab = "overview" | "trade" | "positions";

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export default function ArchieTrading() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionsResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Trade form state
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [sizeQuote, setSizeQuote] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [probability, setProbability] = useState("");
  const [calibratedProbability, setCalibratedProbability] = useState("");
  const [validationSamples, setValidationSamples] = useState("");
  const [brier, setBrier] = useState("");
  const [venuesReporting, setVenuesReporting] = useState("2");
  const [mainnetAuth, setMainnetAuth] = useState(false);

  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      setStatus(await fetchTradingStatus());
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      setPositions(await fetchTradingPositions());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (tab === "positions") loadPositions();
  }, [tab, loadPositions]);

  const buildPayload = () => {
    const request = {
      symbol,
      direction,
      entryPrice: num(entryPrice),
      stopPrice: num(stopPrice),
      targetPrice: num(targetPrice),
      positionSizeQuote: num(sizeQuote),
      portfolioValueQuote: num(portfolioValue),
    };
    const evidence = {
      probability: num(probability),
      calibratedProbability: num(calibratedProbability),
      confidence: num(calibratedProbability),
      validation: {
        samples: num(validationSamples),
        hitRate: null,
        brier: brier ? num(brier) : null,
      },
      dataQuality: {
        crossVenueAnomaly: false,
        venuesReporting: num(venuesReporting),
        analysisAnomalies: [],
        dataAgeMs: 0,
      },
      caveats: [],
    };
    return { request, evidence };
  };

  const onDryRun = async () => {
    setBusy(true);
    setActionError(null);
    setExecResult(null);
    try {
      setDryRun(await dryRunTrade(buildPayload()));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onExecute = async () => {
    setBusy(true);
    setActionError(null);
    setDryRun(null);
    try {
      const res = await executeTrade({
        ...buildPayload(),
        mainnet_execution_authorized: mainnetAuth,
      });
      setExecResult(res);
      await loadStatus();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onEmergencyStop = async (engaged: boolean) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await setTradingState({ emergency_stop: engaged });
      setStatus((s) => (s ? { ...s, state: { ...s.state, ...res.state } } : s));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onEmergencyCancel = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await emergencyCancel([symbol]);
      await loadStatus();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const checkRow = (c: GateCheckView) => (
    <li
      key={c.id}
      className={`text-sm ${c.passed ? "text-emerald-700" : "text-red-600 font-medium"}`}
    >
      {c.passed ? "PASS" : "FAIL"} — {c.id}: {c.detail}
    </li>
  );

  const positionRow = (p: TradingPositionView) => (
    <tr key={p.id} className="border-t">
      <td className="py-2 pr-3 font-mono text-xs">{p.id}</td>
      <td className="py-2 pr-3">{p.symbol}</td>
      <td className="py-2 pr-3">{p.direction}</td>
      <td className="py-2 pr-3">{p.entryPrice}</td>
      <td className="py-2 pr-3">{p.positionSizeQuote}</td>
      <td className="py-2 pr-3">{p.state}</td>
      <td className="py-2 pr-3">{p.status}</td>
      <td className="py-2">
        {p.realizedPnlQuote === null ? "—" : p.realizedPnlQuote}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">ARCHIE Trading</h1>
        <p className="text-sm text-muted-foreground">
          Owner-only trading console: the trade-gate, exchange execution, order
          lifecycle and portfolio engines — every number from the server, every
          refusal honest.
        </p>
      </header>

      {/* Status banner */}
      {statusError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {statusError}
        </div>
      )}
      {status && !status.venue.configured && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Exchange execution is NOT configured.</strong>{" "}
          {status.venue.reason}{" "}
          <Link className="underline" to="/archie/exchange-access">
            Open the Exchange Access center
          </Link>{" "}
          to provision venue credentials.
        </div>
      )}
      {status && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Venue</p>
            <p className="font-medium">
              {status.venue.configured
                ? `${status.venue.venue} — ${status.venue.mode}`
                : "Not configured"}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Trading</p>
            <p className="font-medium">
              {status.state.trading_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">
              Emergency stop
            </p>
            <p
              className={`font-medium ${status.state.emergency_stop ? "text-red-600" : "text-emerald-700"}`}
            >
              {status.state.emergency_stop ? "ENGAGED" : "clear"}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex gap-2">
        {(["overview", "trade", "positions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Overview */}
      {tab === "overview" && status && (
        <div className="space-y-4">
          <section className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">Gate limits (server truth)</h2>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(status.state.limits)
                .filter(([, v]) => typeof v !== "object")
                .map(([k, v]) => (
                  <li key={k} className="text-muted-foreground">
                    <span className="font-mono text-xs">{k}</span>:{" "}
                    <span className="text-foreground">{String(v)}</span>
                  </li>
                ))}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">Portfolio</h2>
            <p className="text-sm text-muted-foreground">
              {status.portfolio.total_positions} positions (
              {status.portfolio.open_positions} open,{" "}
              {status.portfolio.closed_positions} closed)
            </p>
          </section>
          <section className="flex flex-wrap gap-2">
            <button
              disabled={busy || status.state.emergency_stop}
              onClick={() => onEmergencyStop(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Engage emergency stop
            </button>
            <button
              disabled={busy || status.state.emergency_stop}
              onClick={() => onEmergencyStop(false)}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Disengage emergency stop
            </button>
            <button
              disabled={busy}
              onClick={onEmergencyCancel}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
            >
              Emergency cancel all {symbol} orders (engages stop)
            </button>
          </section>
        </div>
      )}

      {/* Trade */}
      {tab === "trade" && (
        <div className="space-y-4">
          <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            Evidence entered here is <strong>manually provided by you</strong> —
            it is labeled as manual in the persisted record and is never
            presented as model output. A dry run never touches a venue.
          </p>
          <section className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
            <label className="text-sm">
              Symbol
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Direction
              <select
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as "long" | "short")
                }
              >
                <option value="long">long</option>
                <option value="short">short</option>
              </select>
            </label>
            <label className="text-sm">
              Entry price
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Stop price
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Target price
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Position size (quote, e.g. USDT)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={sizeQuote}
                onChange={(e) => setSizeQuote(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Portfolio value (quote)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Raw probability (0-1)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Calibrated probability (0-1)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={calibratedProbability}
                onChange={(e) => setCalibratedProbability(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Walk-forward validation samples
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="numeric"
                value={validationSamples}
                onChange={(e) => setValidationSamples(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Out-of-sample Brier (blank = none)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="decimal"
                value={brier}
                onChange={(e) => setBrier(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Venues reporting
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="numeric"
                value={venuesReporting}
                onChange={(e) => setVenuesReporting(e.target.value)}
              />
            </label>
          </section>
          <section className="flex flex-wrap items-center gap-2">
            <button
              disabled={busy}
              onClick={onDryRun}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Dry run (gate only)
            </button>
            <button
              disabled={busy}
              onClick={onExecute}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Execute through the gate
            </button>
            {status?.venue.mode === "MAINNET" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mainnetAuth}
                  onChange={(e) => setMainnetAuth(e.target.checked)}
                />
                I authorize MAINNET execution for this request
              </label>
            )}
          </section>

          {dryRun && (
            <section className="rounded-md border p-4">
              <h2 className="mb-2 font-semibold">
                Gate decision —{" "}
                <span
                  className={
                    dryRun.eligible ? "text-emerald-700" : "text-red-600"
                  }
                >
                  {dryRun.eligible ? "ELIGIBLE" : "REFUSED"}
                </span>
              </h2>
              <ul className="space-y-1">
                {dryRun.decision.checks.map(checkRow)}
              </ul>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                {dryRun.report}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                {dryRun.note}
              </p>
            </section>
          )}

          {execResult && (
            <section className="rounded-md border p-4">
              <h2 className="mb-2 font-semibold">
                Execution —{" "}
                <span
                  className={
                    execResult.executed ? "text-emerald-700" : "text-red-600"
                  }
                >
                  {execResult.executed ? "EXECUTED" : "NOT EXECUTED"}
                </span>
              </h2>
              {execResult.reason && (
                <p className="text-sm text-muted-foreground">
                  {execResult.reason}
                </p>
              )}
              {execResult.warning && (
                <p className="text-sm text-amber-700">{execResult.warning}</p>
              )}
              {execResult.events && (
                <ul className="mt-2 space-y-1 text-sm">
                  {execResult.events.map((ev, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="font-mono text-xs">{ev.id}</span>:{" "}
                      {ev.detail}
                    </li>
                  ))}
                </ul>
              )}
              {execResult.decision && (
                <ul className="mt-2 space-y-1">
                  {execResult.decision.checks.map(checkRow)}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {/* Positions */}
      {tab === "positions" && (
        <section className="rounded-md border p-4">
          <h2 className="mb-3 font-semibold">Positions (audited records)</h2>
          {positions && positions.positions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No positions recorded. Positions appear here only when opened
              through the audited execution path — records cannot be forged.
            </p>
          )}
          {positions && positions.positions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pr-3 pb-2">ID</th>
                    <th className="pr-3 pb-2">Symbol</th>
                    <th className="pr-3 pb-2">Dir</th>
                    <th className="pr-3 pb-2">Entry</th>
                    <th className="pr-3 pb-2">Size</th>
                    <th className="pr-3 pb-2">State</th>
                    <th className="pr-3 pb-2">Status</th>
                    <th className="pb-2">Realized P&L</th>
                  </tr>
                </thead>
                <tbody>{positions.positions.map(positionRow)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
