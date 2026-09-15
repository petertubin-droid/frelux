// =========================================================
// ARCHIE EXCHANGE ACCESS CENTER (batch 20, fix 68, 2026-09-15)
//
// The "trading login center": the owner-only surface that
// shows the venue credential state WITHOUT EVER showing the
// values. Secrets live in the platform secret store only —
// they are never stored in the database, never logged, never
// echoed to any client.
//
// This screen answers exactly three questions honestly:
//   1. Is execution configured? (venue boot reason otherwise)
//   2. Which mode — TESTNET (default) or MAINNET — and is
//      MAINNET authorized by the owner secret?
//   3. What must the owner do to change any of it?
// Plus the killswitch: the trading emergency stop.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTradingStatus,
  setTradingState,
  type TradingStatus,
} from "@/lib/archie/trading-client";

export default function ArchieExchangeAccess() {
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStatus(await fetchTradingStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStop = async (engaged: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await setTradingState({ emergency_stop: engaged });
      setStatus((s) => (s ? { ...s, state: { ...s.state, ...res.state } } : s));
      setNotice(
        engaged
          ? "Emergency stop ENGAGED — no trade may pass the gate, regardless of any other condition."
          : "Emergency stop disengaged. The full trade-gate still applies to every request.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cred = status?.credentials;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Exchange Access</h1>
        <p className="text-sm text-muted-foreground">
          The trading login center: venue credential state, mode and the
          killswitch. Secret values are never displayed — only whether they are
          provisioned. Credentials live in the platform secret store.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {/* Credential state */}
      {cred && (
        <section className="rounded-md border p-4">
          <h2 className="mb-3 font-semibold">Venue credentials (Binance)</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>BINANCE_API_KEY</span>
              <span
                className={
                  cred.api_key_provisioned ? "text-emerald-700" : "text-red-600"
                }
              >
                {cred.api_key_provisioned ? "provisioned" : "NOT provisioned"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>BINANCE_API_SECRET</span>
              <span
                className={
                  cred.api_secret_provisioned
                    ? "text-emerald-700"
                    : "text-red-600"
                }
              >
                {cred.api_secret_provisioned
                  ? "provisioned"
                  : "NOT provisioned"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>BINANCE_MODE</span>
              <span className="font-medium">{cred.mode}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>BINANCE_MAINNET_AUTHORIZED</span>
              <span
                className={
                  cred.mainnet_authorized_by_secret
                    ? "text-amber-700"
                    : "text-muted-foreground"
                }
              >
                {cred.mainnet_authorized_by_secret
                  ? "true — MAINNET possible with per-request owner authorization"
                  : "false / unset — MAINNET impossible"}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            To provision: set the secrets through the platform secrets flow for
            the ARCHIE Supabase project (edge function environment). ARCHIE
            never hardcodes keys, never stores them in the database and never
            logs them. Without credentials there is no adapter and no execution
            — by design.
          </p>
        </section>
      )}

      {/* Boot state */}
      {status && (
        <section className="rounded-md border p-4">
          <h2 className="mb-2 font-semibold">Execution boot state</h2>
          {status.venue.configured ? (
            <p className="text-sm text-emerald-700">
              Adapter booted: {status.venue.venue} in {status.venue.mode} mode.
            </p>
          ) : (
            <p className="text-sm text-amber-800">
              No adapter. {status.venue.reason}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            The adapter is built by the engine's boot factory from the secret
            store on every call — the ONLY sanctioned construction path. See{" "}
            <Link className="underline" to="/archie/trading">
              the Trading screen
            </Link>{" "}
            to operate.
          </p>
        </section>
      )}

      {/* Killswitch */}
      {status && (
        <section className="rounded-md border p-4">
          <h2 className="mb-2 font-semibold">
            Killswitch — trading emergency stop
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Current state:{" "}
            <span
              className={
                status.state.emergency_stop
                  ? "font-medium text-red-600"
                  : "font-medium text-emerald-700"
              }
            >
              {status.state.emergency_stop ? "ENGAGED" : "clear"}
            </span>
            . The stop is checked FIRST on every trade — before mode, before
            authorization, before any other condition.
          </p>
          <div className="flex gap-2">
            <button
              disabled={busy || status.state.emergency_stop}
              onClick={() => toggleStop(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Engage stop
            </button>
            <button
              disabled={busy || !status.state.emergency_stop}
              onClick={() => toggleStop(false)}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Disengage stop
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
