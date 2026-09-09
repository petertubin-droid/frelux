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

function statusBadge(status: ArchieDevice["status"]) {
  if (status === "TRUSTED")
    return (
      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
        TRUSTED
      </span>
    );
  if (status === "REVOKED")
    return (
      <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] text-red-300">
        REVOKED
      </span>
    );
  return (
    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
      PENDING
    </span>
  );
}

export default function ArchieDevices() {
  const [devices, setDevices] = useState<ArchieDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Devices</h1>
      <p className="text-xs text-slate-400">
        Device identity is a secure app-generated key — ARCHIE never uses IMEI
        or device identifiers you can't control.
      </p>

      {!thisDevice && (
        <button
          type="button"
          onClick={handleRegister}
          disabled={busy}
          className="mt-4 rounded-lg bg-amber-400/90 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300 disabled:opacity-40"
        >
          {busy ? "Working…" : "Register this device"}
        </button>
      )}
      {thisDevice && (
        <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">
          This device is registered as{" "}
          <span className="text-slate-100">{thisDevice.label}</span> —{" "}
          {thisDevice.status === "TRUSTED"
            ? "trusted."
            : "pending your approval below."}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading devices…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
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
          </li>
        ))}
      </ul>
      {!loading && devices.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No devices registered yet.
        </p>
      )}
    </div>
  );
}
