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
} from "@/components/archie/premium";

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
    </ArchiePage>
  );
}
