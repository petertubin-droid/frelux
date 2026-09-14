// =========================================================
// ARCHIE PWA — ENGINES VIEW (owner directive 2026-09-14)
//
// The owner's live engine control panel: every capability
// from ARCHIE's honest manifest with its real maturity, test
// coverage and — where the engine has a real dispatch gate —
// an ACTIVATE / DEACTIVATE switch. NO THEATER:
//   * Toggles hit the owner-gated archie-engines function.
//   * Disabled engines are refused honestly in chat; the
//     engine consults the state live (short TTL).
//   * Core cognition is marked PROTECTED (no switch — it can
//     never be corrupted from a panel).
//   * Platform engines are marked with their product surface.
// =========================================================

import { useCallback, useEffect, useState } from "react";

interface Engine {
  id: string;
  description: string;
  maturity: string;
  measuredBy: string;
  enabled: boolean;
  toggleable: boolean;
  protected: boolean;
  protectedReason: string | null;
  platformManaged: string | null;
  updatedAt: string | null;
}

interface EnginesResponse {
  engines: Engine[];
  counts: {
    total: number;
    enabled: number;
    disabled: number;
  };
}

function maturityColor(m: string) {
  if (m === "OPERATIONAL") return "text-emerald-300";
  if (m === "DEVELOPING") return "text-amber-300";
  return "text-slate-400";
}

function Toggle({
  on,
  busy,
  onChange,
}: {
  on: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-emerald-500/80" : "bg-slate-600/80"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function ArchieEngines() {
  const [data, setData] = useState<EnginesResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: res, error: fnErr } = await supabase.functions.invoke(
        "archie-engines",
        { method: "GET" },
      );
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(String(res.error));
      setData(res as EnginesResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engines load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (id: string, next: boolean) => {
      setTogglingId(id);
      setError("");
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data: res, error: fnErr } = await supabase.functions.invoke(
          "archie-engines",
          { body: { capability_id: id, enabled: next } },
        );
        if (fnErr) throw fnErr;
        if (res?.error) throw new Error(String(res.error));
        // Optimistic local update — the engine picks the state
        // up on its next gate refresh (a few seconds).
        setData((d) =>
          d
            ? {
                engines: d.engines.map((e) =>
                  e.id === id ? { ...e, enabled: next } : e,
                ),
                counts: {
                  total: d.counts.total,
                  enabled: d.counts.enabled + (next ? 1 : -1),
                  disabled: d.counts.disabled + (next ? -1 : 1),
                },
              }
            : d,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Toggle failed");
        void load();
      } finally {
        setTogglingId(null);
      }
    },
    [load],
  );

  return (
    <div className="space-y-3">
      <div className="archie-panel flex items-center justify-between rounded-lg p-3">
        <div>
          <p className="text-xs font-medium text-slate-200">
            Engine Activation
          </p>
          <p className="text-[11px] text-slate-400">
            {data
              ? `${data.counts.enabled} active · ${data.counts.disabled} off · ${data.counts.total} engines — toggles are real: disabled engines are refused honestly in chat`
              : "The honest capability manifest, live from the engine"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={busy}
          className="rounded-md bg-brand-purple px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
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
          {busy ? "Loading engines…" : "No engine data yet — refresh."}
        </p>
      )}

      {data?.engines.map((e) => {
        const open = openId === e.id;
        return (
          <div key={e.id} className="archie-panel rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenId(open ? null : e.id)}
              >
                <p className="truncate text-sm font-medium text-slate-100">
                  {e.id}
                </p>
                <p className="text-[11px]">
                  <span
                    className={`font-semibold ${maturityColor(e.maturity)}`}
                  >
                    {e.maturity}
                  </span>
                  {!e.enabled && (
                    <span className="ml-1 font-semibold text-rose-300">
                      · OFF
                    </span>
                  )}
                  {e.protected && (
                    <span className="ml-1 text-slate-500">· protected</span>
                  )}
                  {e.platformManaged && (
                    <span className="ml-1 text-slate-500">
                      · {e.platformManaged}
                    </span>
                  )}
                </p>
              </button>
              {e.toggleable ? (
                <Toggle
                  on={e.enabled}
                  busy={togglingId === e.id}
                  onChange={(next) => void toggle(e.id, next)}
                />
              ) : (
                <span className="shrink-0 text-[10px] text-slate-500">
                  {e.protected ? "always on" : "platform"}
                </span>
              )}
            </div>
            {open && (
              <div className="mt-2 space-y-1.5 border-t border-slate-700/60 pt-2">
                <p className="text-[11px] text-slate-400">{e.description}</p>
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400">Measured by:</span>{" "}
                  {e.measuredBy}
                </p>
                {e.protectedReason && (
                  <p className="text-[10px] text-slate-500">
                    {e.protectedReason}
                  </p>
                )}
                {e.updatedAt && (
                  <p className="text-[10px] text-slate-500">
                    Last change: {new Date(e.updatedAt).toLocaleString()}
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
