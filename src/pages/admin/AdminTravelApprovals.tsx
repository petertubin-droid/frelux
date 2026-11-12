import { useCallback, useEffect, useMemo, useState } from "react";
import { HardHat, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  approvalForOrder,
  travelLabel,
  travelState,
  type TravelApproval,
  type TravelOrder,
} from "@/lib/cross-state";

interface ProRow {
  id: string;
  user_id: string;
  display_name: string | null;
  service_area_text: string | null;
}

interface Settings {
  allow_cross_state_jobs: boolean;
  auto_release_hours: number;
}

/**
 * Rule 4 of the worker safety set needs a human: a job outside the
 * professional's own city and state is refused until an admin approves that
 * exact pairing. Until now the approval existed only as a database function
 * with no screen, which meant nobody could reach it.
 */
export default function AdminTravelApprovals() {
  const [orders, setOrders] = useState<TravelOrder[]>([]);
  const [approvals, setApprovals] = useState<TravelApproval[]>([]);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ordersRes, approvalsRes, settingsRes] = await Promise.all([
      supabase
        .from("marketplace_orders")
        .select(
          "id, order_number, job_city, job_state, job_country, status, payment_status, client_id, pro_profile_id, created_at",
        )
        .not("job_state", "is", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("cross_state_approvals")
        .select(
          "id, seller_user_id, buyer_user_id, job_state, approved_at, expires_at, note",
        )
        .order("approved_at", { ascending: false })
        .limit(300),
      supabase
        .from("worker_safety_settings")
        .select("allow_cross_state_jobs, auto_release_hours")
        .maybeSingle(),
    ]);

    if (ordersRes.error || approvalsRes.error) {
      setError(
        ordersRes.error?.message ??
          approvalsRes.error?.message ??
          "Could not load",
      );
      setLoading(false);
      return;
    }

    const orderRows = (ordersRes.data ?? []) as TravelOrder[];
    const proIds = [
      ...new Set(orderRows.map((row) => row.pro_profile_id).filter(Boolean)),
    ];
    if (proIds.length > 0) {
      const { data: proRows } = await supabase
        .from("pro_profiles")
        .select("id, user_id, display_name, service_area_text")
        .in("id", proIds as string[]);
      setPros((proRows ?? []) as ProRow[]);
    } else {
      setPros([]);
    }

    setOrders(orderRows);
    setApprovals((approvalsRes.data ?? []) as TravelApproval[]);
    setSettings((settingsRes.data ?? null) as Settings | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const proById = useMemo(
    () => new Map(pros.map((pro) => [pro.id, pro])),
    [pros],
  );

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => !["completed", "cancelled"].includes(order.status),
      ),
    [orders],
  );

  const approve = async (order: TravelOrder) => {
    setBusyId(order.id);
    setError(null);
    try {
      const expiresAt =
        days > 0
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null;
      const { error: rpcError } = await supabase.rpc(
        "approve_cross_state_job",
        {
          p_order_id: order.id,
          p_note: note.trim() || null,
          p_expires_at: expiresAt,
        },
      );
      if (rpcError) throw new Error(rpcError.message);
      setNote("");
      await load();
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Could not approve",
      );
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (approval: TravelApproval) => {
    setBusyId(approval.id);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(
        "revoke_cross_state_approval",
        {
          p_approval_id: approval.id,
          p_reason: note.trim() || null,
        },
      );
      if (rpcError) throw new Error(rpcError.message);
      setNote("");
      await load();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error ? revokeError.message : "Could not revoke",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <HardHat
          className="mt-1 h-5 w-5 text-brand-purple"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Travel approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            A job outside a professional's own city and state is blocked until
            you approve that pairing. Approvals expire, so a one off job does
            not become a standing right to move a worker anywhere.
          </p>
        </div>
      </header>

      {settings?.allow_cross_state_jobs && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Cross state jobs are currently allowed for everyone in the safety
          settings, so nothing below is being blocked. Approvals are only a
          record while that switch is on.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 dark:border-white/10">
        <label className="text-xs font-medium text-muted-foreground">
          Approval note
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why this move is safe"
            className="mt-1 block w-64 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Valid for (days, 0 = no expiry)
          <input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="mt-1 block w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-brand-purple"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading jobs
        </div>
      ) : openOrders.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground dark:border-white/10">
          No open job has a destination state recorded, so there is nothing to
          approve.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-white/10">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Order</th>
                <th className="px-3 py-2 font-semibold">Job destination</th>
                <th className="px-3 py-2 font-semibold">Professional</th>
                <th className="px-3 py-2 font-semibold">Their stated area</th>
                <th className="px-3 py-2 font-semibold">Approval</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.map((order) => {
                const pro = order.pro_profile_id
                  ? proById.get(order.pro_profile_id)
                  : undefined;
                const approval = approvalForOrder(
                  order,
                  pro?.user_id,
                  approvals,
                );
                const state = travelState(approval);
                const active = state === "approved";
                return (
                  <tr
                    key={order.id}
                    className="border-t border-border dark:border-white/5"
                  >
                    <td className="px-3 py-2 text-xs font-medium text-foreground">
                      {order.order_number ?? order.id.slice(0, 8)}
                      <span className="block text-[11px] font-normal capitalize text-muted-foreground">
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {[order.job_city, order.job_state, order.job_country]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {pro?.display_name ?? "Not linked"}
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-[11px] text-muted-foreground">
                      {pro?.service_area_text ?? "Not stated"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          active
                            ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }
                      >
                        {active ? (
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ShieldX className="h-3 w-3" aria-hidden="true" />
                        )}
                        {travelLabel(state)}
                      </span>
                      {approval?.expires_at && (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          until{" "}
                          {new Date(approval.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {active && approval ? (
                        <button
                          type="button"
                          disabled={busyId === approval.id}
                          onClick={() => void revoke(approval)}
                          className="rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                        >
                          {busyId === approval.id ? "Revoking" : "Revoke"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === order.id || !pro?.user_id}
                          onClick={() => void approve(order)}
                          className="rounded-md bg-brand-purple px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          {busyId === order.id ? "Approving" : "Approve travel"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
