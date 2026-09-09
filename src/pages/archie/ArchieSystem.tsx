// =========================================================
// FRELUX ARCHIE STAGE 1 — SYSTEM (Infrastructure, API & PWA)
//
// Real infrastructure-cost ledger, API usage overview and
// the ARCHIE PWA install/notification surface. Internal
// agent provider costs are tracked here — they NEVER touch
// subscriber/user credits (spec §13).
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-lazy";

interface CostRow {
  operation_class: string;
  provider: string;
  operation: string;
  cost_estimate_cents: number;
  cost_actual_cents: number;
  occurred_at: string;
}

export default function ArchieSystem() {
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifState, setNotifState] = useState<string>(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error: e } = await supabase
        .from("frelux_infrastructure_costs")
        .select(
          "operation_class, provider, operation, cost_estimate_cents, cost_actual_cents, occurred_at",
        )
        .order("occurred_at", { ascending: false })
        .limit(30);
      if (e) setError(e.message);
      else setCosts((data ?? []) as CostRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load costs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requestNotifications() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifState(result);
  }

  const totalCents = costs.reduce(
    (sum, c) => sum + (c.cost_actual_cents || c.cost_estimate_cents || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">System</h1>
      <p className="text-xs text-slate-400">
        Internal ARCHIE operations are infrastructure expenditure — structurally
        separate from subscriber credits, API quotas and user allowances.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Recent internal cost ledger
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            ₦{(totalCents / 100).toFixed(2)} across {costs.length} records
          </p>
          <p className="text-[11px] text-slate-500">
            Estimate ledger of provider costs, not customer billing.
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Notifications
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {notifState}
          </p>
          {notifState === "default" && (
            <button
              type="button"
              onClick={requestNotifications}
              className="mt-2 rounded-lg bg-amber-400/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-400/20"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading ledger…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {costs.map((c, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{c.operation}</p>
              <p className="text-[11px] text-slate-500">
                {c.provider} · {c.operation_class}
              </p>
            </div>
            <span className="text-xs text-slate-300">
              ¢{c.cost_actual_cents || c.cost_estimate_cents}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(c.occurred_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
      {!loading && costs.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No infrastructure costs recorded yet.
        </p>
      )}
    </div>
  );
}
