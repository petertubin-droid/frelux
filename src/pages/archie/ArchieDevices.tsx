// =========================================================
// FRELUX ARCHIE STAGE 1 — TRUSTED DEVICES
//
// Real device registry. Device identity is an app-generated
// crypto-random key — NEVER IMEI (spec §12). Registration is
// PENDING until the Owner trusts it; revocation is instant.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  getDeviceKey,
  listDevices,
  registerThisDevice,
  updateDevice,
  type ArchieDevice,
} from "@/lib/archie/stage1-client";
import {
  recoverLostDevice,
  type RecoveryResult,
} from "@/lib/archie/stage2-device-recovery";
import {
  ArchiePage,
  ArchiePanel,
  ArchieButton,
  ArchieBadge,
  ArchieSectionTitle,
} from "@/components/archie/premium";
import {
  detectConnectivityCapabilities,
  pairBluetoothDevice,
  pairUsbDevice,
  probeNetworkEndpoint,
  saveConnection,
  listConnections,
  listConnectionEvents,
  transitionConnection,
  type ConnectedDeviceRow,
  type DeviceCandidate,
  type DevicePermission,
} from "@/lib/archie/connections";
import { DEVICE_PERMISSIONS } from "@studio-shared/archie-ai/native-engine/connections.ts";

function statusBadge(status: ArchieDevice["status"]) {
  if (status === "TRUSTED")
    return <ArchieBadge tone="positive">TRUSTED</ArchieBadge>;
  if (status === "REVOKED")
    return <ArchieBadge tone="critical">REVOKED</ArchieBadge>;
  return <ArchieBadge tone="warning">PENDING</ArchieBadge>;
}

export default function ArchieDevices() {
  const [devices, setDevices] = useState<ArchieDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);
  const thisKey = getDeviceKey();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await listDevices());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRegister() {
    setBusy(true);
    try {
      const res = await registerThisDevice();
      if (!res.ok) setError(res.error);
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleLostDevice(d: ArchieDevice) {
    if (busy) return;
    if (
      !window.confirm(
        `Mark "${d.label}" as lost? ARCHIE will revoke it and terminate every other session. Do this only if the device is lost or stolen.`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await recoverLostDevice(d.id, d.label);
      setRecovery(res);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(
    id: string,
    patch: { status: "TRUSTED" | "REVOKED" },
  ) {
    setBusy(true);
    try {
      await updateDevice(id, patch);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  // ---- Connected hardware & accounts (connective-tissue) ----
  const [conns, setConns] = useState<ConnectedDeviceRow[]>([]);
  const [connError, setConnError] = useState<string | null>(null);
  const [pairBusy, setPairBusy] = useState(false);
  const [candidate, setCandidate] = useState<DeviceCandidate | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<DevicePermission[]>([]);
  const [probeUrl, setProbeUrl] = useState("");
  const [probeBusy, setProbeBusy] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [openEvents, setOpenEvents] = useState<string | null>(null);
  const [events, setEvents] = useState<
    Array<{ id: string; action: string; result: string; created_date: string }>
  >([]);
  const caps = detectConnectivityCapabilities();

  const loadConns = useCallback(async () => {
    try {
      setConns(await listConnections());
      setConnError(null);
    } catch {
      // listConnections requires the registry — honest failure
      setConnError("Could not load the connection registry.");
    }
  }, []);

  useEffect(() => {
    loadConns();
  }, [loadConns]);

  async function runPair(kind: "bluetooth" | "usb") {
    setPairBusy(true);
    setCandidateError(null);
    try {
      const found =
        kind === "bluetooth"
          ? await pairBluetoothDevice()
          : await pairUsbDevice();
      setCandidate(found);
      setSelectedPerms([]);
    } catch (e) {
      setCandidate(null);
      setCandidateError(
        e instanceof Error ? e.message : "Pairing did not complete.",
      );
    } finally {
      setPairBusy(false);
    }
  }

  async function runProbe() {
    if (!probeUrl.trim()) return;
    setProbeBusy(true);
    setProbeResult(null);
    try {
      const res = await probeNetworkEndpoint(probeUrl.trim());
      setProbeResult(
        res.reachable
          ? `Endpoint answered (status ${res.status === 0 ? "opaque" : res.status}). Reachability only — connecting a device still needs explicit pairing + permissions.`
          : `Not reachable (${res.reason}): ${res.message}`,
      );
    } catch (e) {
      setProbeResult(e instanceof Error ? e.message : "Probe failed.");
    } finally {
      setProbeBusy(false);
    }
  }

  async function saveCandidate() {
    if (!candidate) return;
    setPairBusy(true);
    try {
      await saveConnection({
        candidate,
        permissions: selectedPerms,
      });
      setCandidate(null);
      setSelectedPerms([]);
      await loadConns();
    } catch (e) {
      setCandidateError(
        e instanceof Error ? e.message : "Could not save the connection.",
      );
    } finally {
      setPairBusy(false);
    }
  }

  async function doTransition(
    conn: ConnectedDeviceRow,
    event: "connect" | "disconnect" | "suspend" | "resume" | "revoke",
  ) {
    setPairBusy(true);
    try {
      await transitionConnection(conn, event);
      await loadConns();
    } catch (e) {
      setConnError(e instanceof Error ? e.message : "Transition refused.");
    } finally {
      setPairBusy(false);
    }
  }

  async function toggleEvents(conn: ConnectedDeviceRow) {
    if (openEvents === conn.id) {
      setOpenEvents(null);
      return;
    }
    try {
      const rows = await listConnectionEvents(conn.id, 10);
      setEvents(rows);
      setOpenEvents(conn.id);
    } catch {
      setConnError("Could not load the audit trail.");
    }
  }

  const thisDevice = devices.find((d) => d.device_key === thisKey);

  return (
    <ArchiePage
      title="Devices"
      subtitle="Device identity is a secure app-generated key — ARCHIE never uses IMEI or device identifiers you can't control."
    >
      {!thisDevice && (
        <div className="mt-4">
          <ArchieButton onClick={handleRegister} disabled={busy}>
            {busy ? "Working…" : "Register this device"}
          </ArchieButton>
        </div>
      )}
      {thisDevice && (
        <ArchiePanel accent className="mt-4 p-3.5 text-xs text-slate-300">
          <p>
            This device is registered as{" "}
            <span className="font-medium text-slate-100">
              {thisDevice.label}
            </span>{" "}
            —{" "}
            {thisDevice.status === "TRUSTED"
              ? "trusted."
              : "pending your approval below."}
          </p>
        </ArchiePanel>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-300">
          {error}
        </p>
      )}
      {recovery && (
        <div
          role="status"
          data-testid="recovery-checklist"
          className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3.5"
        >
          <p className="text-sm font-medium text-emerald-300">
            Lost-device recovery completed
          </p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-slate-300">
            {recovery.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading devices…</p>
      )}

      <ul className="mt-4 space-y-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="archie-panel flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">
                {d.label}
                {d.device_key === thisKey && (
                  <span className="ml-2 text-[10px] text-amber-200/80">
                    (this device)
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {d.platform ?? "unknown platform"} · key{" "}
                {d.device_key.slice(0, 8)}…
              </p>
            </div>
            {statusBadge(d.status)}
            {d.status !== "TRUSTED" && (
              <button
                type="button"
                onClick={() => handleUpdate(d.id, { status: "TRUSTED" })}
                disabled={busy}
                className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
              >
                Trust
              </button>
            )}
            {d.status !== "REVOKED" && (
              <button
                type="button"
                onClick={() => handleUpdate(d.id, { status: "REVOKED" })}
                disabled={busy}
                className="rounded-lg bg-red-400/10 px-3 py-1 text-xs text-red-300 hover:bg-red-400/20 disabled:opacity-40"
              >
                Revoke
              </button>
            )}
            {d.status !== "REVOKED" && d.device_key !== thisKey && (
              <button
                type="button"
                onClick={() => handleLostDevice(d)}
                disabled={busy}
                className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-40"
              >
                Lost this device?
              </button>
            )}
          </li>
        ))}
      </ul>
      {!loading && devices.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No devices registered yet.
        </p>
      )}

      {/* --------------------------------------------- */}
      {/* CONNECTED HARDWARE & ACCOUNTS                  */}
      {/* (connective-tissue subsystem — real Web        */}
      {/* Bluetooth / WebUSB / network transports only,  */}
      {/* explicit pairing, permission-scoped control,    */}
      {/* full audit history)                            */}
      {/* --------------------------------------------- */}
      <div className="mt-10" data-testid="connected-hardware">
        <ArchieSectionTitle>Connected hardware & accounts</ArchieSectionTitle>

        <ArchiePanel className="mt-3 p-3.5 text-xs text-slate-300">
          <p>
            Real transports, explicit authorization: pairing happens through the
            browser's own permission prompt, and a reachable device grants
            nothing until you grant permissions. Every action — success, failure
            or denial — is audited.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ArchieBadge tone={caps.bluetooth ? "positive" : "neutral"}>
              Bluetooth{" "}
              {caps.bluetooth ? "available" : "unavailable in this browser"}
            </ArchieBadge>
            <ArchieBadge tone={caps.usb ? "positive" : "neutral"}>
              USB {caps.usb ? "available" : "unavailable in this browser"}
            </ArchieBadge>
            <ArchieBadge tone={caps.network ? "positive" : "neutral"}>
              Network {caps.network ? "available" : "unavailable"}
            </ArchieBadge>
            <ArchieBadge tone="neutral">
              System volume — not controllable from a browser
            </ArchieBadge>
          </div>
        </ArchiePanel>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ArchieButton
            onClick={() => runPair("bluetooth")}
            disabled={pairBusy || !caps.bluetooth}
          >
            {pairBusy ? "Working…" : "Pair Bluetooth device"}
          </ArchieButton>
          <ArchieButton
            onClick={() => runPair("usb")}
            disabled={pairBusy || !caps.usb}
          >
            Pair USB device
          </ArchieButton>
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              inputMode="url"
              placeholder="http://192.168.1.40:8080/"
              value={probeUrl}
              onChange={(e) => setProbeUrl(e.target.value)}
              aria-label="Network endpoint to probe"
              className="w-56 rounded-lg border border-slate-600/40 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-400/50"
            />
            <ArchieButton onClick={runProbe} disabled={probeBusy}>
              {probeBusy ? "Probing…" : "Probe endpoint"}
            </ArchieButton>
          </span>
        </div>
        {probeResult && (
          <p role="status" className="mt-2 text-xs text-slate-400">
            {probeResult}
          </p>
        )}
        {candidateError && (
          <p role="alert" className="mt-2 text-xs text-amber-300">
            {candidateError}
          </p>
        )}

        {candidate && (
          <ArchiePanel accent className="mt-3 p-3.5">
            <p className="text-sm font-medium text-slate-100">
              {candidate.device_name}
            </p>
            <p className="text-[11px] text-slate-400">
              {candidate.transport} ·{" "}
              {candidate.manufacturer ?? "unknown maker"}
              {candidate.model ? ` ${candidate.model}` : ""}
              {candidate.battery_pct !== null
                ? ` · battery ${candidate.battery_pct}%`
                : ""}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Grant permissions for this connection:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DEVICE_PERMISSIONS.map((perm) => {
                const on = selectedPerms.includes(perm);
                return (
                  <button
                    key={perm}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSelectedPerms(
                        on
                          ? selectedPerms.filter((x) => x !== perm)
                          : [...selectedPerms, perm],
                      )
                    }
                    className={
                      "rounded-lg px-2.5 py-1 text-xs transition " +
                      (on
                        ? "bg-sky-400/20 text-sky-200"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60")
                    }
                  >
                    {perm}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-2">
              <ArchieButton onClick={saveCandidate} disabled={pairBusy}>
                Save connection
              </ArchieButton>
              <ArchieButton
                onClick={() => {
                  setCandidate(null);
                  setSelectedPerms([]);
                }}
                disabled={pairBusy}
              >
                Discard
              </ArchieButton>
            </div>
          </ArchiePanel>
        )}

        {connError && (
          <p role="alert" className="mt-3 text-sm text-amber-300">
            {connError}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {conns.map((c) => (
            <li
              key={c.id}
              className="archie-panel rounded-xl px-3.5 py-2.5"
              data-testid="connected-device-row"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">
                    {c.device_name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {c.transport} · {c.device_kind} ·{" "}
                    {c.permissions.length > 0
                      ? c.permissions.join(", ")
                      : "no permissions granted"}
                  </p>
                </div>
                <ArchieBadge
                  tone={
                    c.status === "CONNECTED"
                      ? "positive"
                      : c.status === "REVOKED"
                        ? "critical"
                        : c.status === "SUSPENDED"
                          ? "warning"
                          : "neutral"
                  }
                >
                  {c.status}
                </ArchieBadge>
                {c.status === "PAIRED" && (
                  <button
                    type="button"
                    onClick={() => doTransition(c, "connect")}
                    disabled={pairBusy}
                    className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
                  >
                    Connect
                  </button>
                )}
                {c.status === "CONNECTED" && (
                  <button
                    type="button"
                    onClick={() => doTransition(c, "disconnect")}
                    disabled={pairBusy}
                    className="rounded-lg bg-slate-700/40 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600/40 disabled:opacity-40"
                  >
                    Disconnect
                  </button>
                )}
                {c.status !== "REVOKED" && (
                  <button
                    type="button"
                    onClick={() =>
                      doTransition(
                        c,
                        c.status === "SUSPENDED" ? "resume" : "suspend",
                      )
                    }
                    disabled={pairBusy}
                    className="rounded-lg bg-amber-400/10 px-3 py-1 text-xs text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
                  >
                    {c.status === "SUSPENDED" ? "Resume" : "Suspend"}
                  </button>
                )}
                {c.status !== "REVOKED" && (
                  <button
                    type="button"
                    onClick={() => doTransition(c, "revoke")}
                    disabled={pairBusy}
                    className="rounded-lg bg-red-400/10 px-3 py-1 text-xs text-red-300 hover:bg-red-400/20 disabled:opacity-40"
                  >
                    Revoke
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleEvents(c)}
                  className="rounded-lg border border-slate-600/40 px-3 py-1 text-xs text-slate-400 hover:bg-slate-700/40"
                >
                  {openEvents === c.id ? "Hide audit" : "Audit trail"}
                </button>
              </div>
              {openEvents === c.id && (
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[11px] text-slate-400">
                  {events.length === 0 && (
                    <li>No audited actions on this connection yet.</li>
                  )}
                  {events.map((ev) => (
                    <li key={ev.id}>
                      {ev.created_date.slice(0, 19).replace("T", " ")} ·{" "}
                      {ev.action} —{" "}
                      <span
                        className={
                          ev.result === "success"
                            ? "text-emerald-300"
                            : ev.result === "denied"
                              ? "text-amber-300"
                              : "text-red-300"
                        }
                      >
                        {ev.result}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
        {conns.length === 0 && !connError && (
          <p className="mt-4 text-sm text-slate-500">
            No external devices or accounts connected yet. Pairing a device here
            is the only path to device control — reachability alone never grants
            access.
          </p>
        )}
      </div>
    </ArchiePage>
  );
}
