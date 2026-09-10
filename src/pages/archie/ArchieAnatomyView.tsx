// =========================================================
// ARCHIE PWA — ANATOMY VIEW (mobile)
//
// The Owner's live view of ARCHIE's cognitive anatomy: all
// 22 real subsystems with their live health, plus the verified
// constitution (DNA). Real probes only — statuses come from
// the archie-anatomy runner; checked_at timestamps make
// staleness explicit. NOT_OPERATIONAL organs are shown
// honestly, never faked.
// =========================================================

import { useCallback, useEffect, useState } from "react";

type Status = "HEALTHY" | "DEGRADED" | "OFFLINE" | "NOT_OPERATIONAL";

interface Subsystem {
  key: string;
  organ: string;
  name: string;
  purpose: string;
  code_bindings: string[];
  data_bindings: string[];
  operational: boolean;
  criticality: string;
  live_status: {
    status: Status;
    metric: string | null;
    details: Record<string, unknown>;
    checked_at: string;
  } | null;
}

interface AnatomyResponse {
  constitution: {
    version: number;
    verified: boolean;
  } | null;
  anatomy: Subsystem[];
  summary: {
    healthy: number;
    degraded: number;
    offline: number;
    not_operational: number;
    total: number;
  } | null;
  checked_at?: string;
}

function statusColor(s: Status) {
  if (s === "HEALTHY") return "text-emerald-300";
  if (s === "DEGRADED") return "text-amber-300";
  if (s === "OFFLINE") return "text-rose-300";
  return "text-slate-400";
}

export default function ArchieAnatomyView() {
  const [data, setData] = useState<AnatomyResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: res, error: fnErr } = await supabase.functions.invoke(
        "archie-anatomy",
      );
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(String(res.error));
      setData(res as AnatomyResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anatomy probe failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="archie-panel flex items-center justify-between rounded-lg p-3">
        <div>
          <p className="text-xs font-medium text-slate-200">
            Cognitive Anatomy
          </p>
          <p className="text-[11px] text-slate-400">
            {data?.summary
              ? `${data.summary.healthy} healthy · ${data.summary.degraded} degraded · ${data.summary.offline} offline · ${data.summary.not_operational} not operational (of ${data.summary.total})`
              : "Real probes across all 22 subsystems"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => void load()}
            disabled={busy}
            className="rounded-md bg-brand-purple px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Probing…" : "Probe"}
          </button>
          {data?.constitution && (
            <span
              className={`text-[10px] ${
                data.constitution.verified
                  ? "text-emerald-300"
                  : "text-rose-300"
              }`}
            >
              DNA v{data.constitution.version}{" "}
              {data.constitution.verified ? "verified" : "MISMATCH"}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="text-xs text-slate-500">
          {busy ? "Running live probes…" : "No anatomy data yet — run a probe."}
        </p>
      )}

      {data?.anatomy.map((s) => {
        const st = s.live_status?.status;
        const open = openKey === s.key;
        return (
          <div key={s.key} className="archie-panel rounded-lg p-3">
            <button
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setOpenKey(open ? null : s.key)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base">{s.organ}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {s.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {st ? s.live_status?.metric : "not probed yet"}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 text-[11px] font-semibold ${statusColor(st ?? "OFFLINE")}`}
              >
                {st ?? "—"}
              </span>
            </button>
            {open && (
              <div className="mt-2 space-y-1.5 border-t border-slate-700/60 pt-2">
                <p className="text-[11px] text-slate-400">{s.purpose}</p>
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400">Real binding:</span>{" "}
                  {s.code_bindings?.join(", ") || "(no backend yet)"}
                </p>
                {s.data_bindings?.length > 0 && (
                  <p className="text-[10px] text-slate-500">
                    <span className="text-slate-400">Data:</span>{" "}
                    {s.data_bindings.join(", ")}
                  </p>
                )}
                {s.live_status?.checked_at && (
                  <p className="text-[10px] text-slate-500">
                    Checked{" "}
                    {new Date(s.live_status.checked_at).toLocaleString()} ·{" "}
                    {s.criticality}
                  </p>
                )}
                {!s.operational && (
                  <p className="text-[10px] text-amber-300">
                    Honestly NOT_OPERATIONAL — never faked.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
