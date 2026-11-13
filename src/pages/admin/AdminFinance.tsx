import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Undo2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminButton,
  AdminCard,
  AdminHeader,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  DISPUTE_CATEGORIES,
  loadOpenDisputes,
  type DisputeWithOrder,
} from "@/lib/marketplace-disputes";

/**
 * Money, in one place.
 *
 * Subscription sales, token packs, API wallet top-ups, escrow holds and payouts,
 * marketplace order value and the AI-credit economy were each readable only on
 * their own screen, which is exactly how a missing payment survives a week
 * unnoticed. The totals come from `admin_money_summary`, which never adds
 * different currencies together.
 *
 * The open-dispute queue lives here too, because a dispute is a decision about
 * money: refund the buyer, or close it and let escrow release normally.
 */

interface CurrencyTotal {
  currency?: string;
  topups?: number;
  amount_minor?: number;
  amount_usd?: number;
  purchases?: number;
  buyers?: number;
  tokens?: number;
  contracts?: number;
  contracted_minor?: number;
  held_minor?: number;
  released_minor?: number;
  refunded_minor?: number;
  fee_minor?: number;
  orders?: number;
  agreed_value?: number;
  completed?: number;
  disputed?: number;
}

interface CreditTotal {
  type: "earn" | "spend";
  entries: number;
  credits: number;
}

interface MoneySummary {
  window_days: number;
  generated_at: string;
  subscriptions: CurrencyTotal[];
  token_packs: CurrencyTotal[];
  token_packs_pending: number;
  api_wallet: CurrencyTotal[];
  api_wallet_refused: number;
  escrow: CurrencyTotal[];
  escrow_open_contracts: number;
  marketplace: CurrencyTotal[];
  marketplace_open_disputes: number;
  ai_credits: CreditTotal[];
  daily: {
    day: string;
    subscription_minor: number;
    token_minor: number;
    wallet_usd: number;
  }[];
}

const WINDOWS = [7, 30, 90];

function money(minor: number | undefined, currency = "NGN"): string {
  if (!minor) return "0";
  const value = minor / 100;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "NGN" ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function usd(value: number | undefined): string {
  if (!value) return "$0";
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function perCurrency(
  rows: CurrencyTotal[],
  render: (row: CurrencyTotal) => string,
): string {
  if (rows.length === 0) return "0";
  return rows.map(render).join(" · ");
}

export default function AdminFinance() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [disputes, setDisputes] = useState<DisputeWithOrder[]>([]);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "admin_money_summary",
        { p_days: days },
      );
      if (rpcError) throw rpcError;
      setSummary(data as MoneySummary);
    } catch {
      setError(
        "The money summary could not be read. This usually means the summary function has not been applied to the database yet.",
      );
      setSummary(null);
    } finally {
      setLoading(false);
    }

    setDisputeError(null);
    try {
      setDisputes(await loadOpenDisputes());
    } catch {
      // A failure here must not take the money totals down with it.
      setDisputeError("Open disputes could not be loaded.");
      setDisputes([]);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolveDispute(
    dispute: DisputeWithOrder,
    outcome: "refund" | "dismiss",
  ) {
    setBusyId(dispute.id);
    setDisputeError(null);
    try {
      if (outcome === "refund") {
        const contractId = dispute.order?.escrow_contract_id;
        if (!contractId) {
          throw new Error(
            "This order was never funded through escrow, so there is nothing held to refund. Dismiss it and agree the money directly.",
          );
        }
        const { error: refundError } = await supabase.functions.invoke(
          "escrow-release",
          { body: { contract_id: contractId, action: "refund" } },
        );
        if (refundError) throw refundError;

        const { error: updateError } = await supabase
          .from("marketplace_order_disputes")
          .update({
            status: "refunded",
            resolution_note: "Refunded to the buyer from escrow.",
            resolved_at: new Date().toISOString(),
            resolved_by: (await supabase.auth.getUser()).data.user?.id,
            refund_amount_minor: Math.round(
              Number(dispute.order?.agreed_price ?? 0) * 100,
            ),
          })
          .eq("id", dispute.id)
          .eq("status", "open");
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("marketplace_order_disputes")
          .update({
            status: "dismissed",
            resolution_note:
              "Closed after review; escrow releases on the normal acceptance path.",
            resolved_at: new Date().toISOString(),
            resolved_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq("id", dispute.id)
          .eq("status", "open");
        if (updateError) throw updateError;

        // Back to the client's hands so they can accept, or send it back.
        await supabase
          .from("marketplace_orders")
          .update({ status: "client_review" })
          .eq("id", dispute.order_id);
      }
      await load();
    } catch (cause) {
      setDisputeError(
        cause instanceof Error && cause.message
          ? cause.message
          : "That resolution did not go through. Nothing has been changed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminHeader
        title="Money"
        subtitle="Every stream that takes or holds money, in one place, per currency."
        action={
          <div className="flex items-center gap-2">
            {WINDOWS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                aria-pressed={days === value}
                className={`min-h-8 rounded-lg px-3 text-xs font-semibold ${
                  days === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground dark:border-white/10"
                }`}
              >
                {value}d
              </button>
            ))}
            <AdminButton onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              )}
              Refresh
            </AdminButton>
          </div>
        }
      />

      {error && (
        <StateMessage
          type="error"
          title="Summary unavailable"
          message={error}
        />
      )}

      {loading && !summary && (
        <StateMessage
          type="loading"
          title="Reading the money ledger"
          message="Totals are calculated in the database, per currency."
        />
      )}

      {summary && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AdminCard compact>
              <p className="admin-eyebrow">Subscriptions</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.subscriptions, (row) =>
                  money(row.amount_minor, row.currency),
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.subscriptions.reduce(
                  (n, r) => n + (r.purchases ?? 0),
                  0,
                )}{" "}
                payments ·{" "}
                {summary.subscriptions.reduce((n, r) => n + (r.buyers ?? 0), 0)}{" "}
                buyers
              </p>
            </AdminCard>

            <AdminCard compact>
              <p className="admin-eyebrow">Token packs</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.token_packs, (row) =>
                  money(row.amount_minor, "NGN"),
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.token_packs.reduce(
                  (n, r) => n + (r.purchases ?? 0),
                  0,
                )}{" "}
                packs ·{" "}
                {summary.token_packs.reduce((n, r) => n + (r.tokens ?? 0), 0)}{" "}
                tokens sold
                {summary.token_packs_pending > 0 &&
                  ` · ${summary.token_packs_pending} pending`}
              </p>
            </AdminCard>

            <AdminCard compact>
              <p className="admin-eyebrow">API wallet top-ups</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.api_wallet, (row) => usd(row.amount_usd))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.api_wallet.reduce((n, r) => n + (r.topups ?? 0), 0)}{" "}
                top-ups
                {summary.api_wallet_refused > 0 &&
                  ` · ${summary.api_wallet_refused} refused`}
              </p>
            </AdminCard>

            <AdminCard compact>
              <p className="admin-eyebrow">Escrow held</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.escrow, (row) =>
                  money(row.held_minor, row.currency),
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {perCurrency(summary.escrow, (row) =>
                  money(row.released_minor, row.currency),
                )}{" "}
                released · {summary.escrow_open_contracts} still open
              </p>
            </AdminCard>

            <AdminCard compact>
              <p className="admin-eyebrow">Platform fees</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.escrow, (row) =>
                  money(row.fee_minor, row.currency),
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                refunded{" "}
                {perCurrency(summary.escrow, (row) =>
                  money(row.refunded_minor, row.currency),
                )}
              </p>
            </AdminCard>

            <AdminCard compact>
              <p className="admin-eyebrow">Marketplace orders</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {perCurrency(summary.marketplace, (row) =>
                  money(
                    Math.round(Number(row.agreed_value ?? 0) * 100),
                    row.currency,
                  ),
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.marketplace.reduce((n, r) => n + (r.orders ?? 0), 0)}{" "}
                orders · {summary.marketplace_open_disputes} dispute
                {summary.marketplace_open_disputes === 1 ? "" : "s"} open
              </p>
            </AdminCard>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <AdminCard>
              <p className="admin-eyebrow">AI credits in the window</p>
              <div className="mt-2 space-y-1 text-sm text-foreground">
                {summary.ai_credits.length === 0 && (
                  <p className="text-muted-foreground">No credit activity.</p>
                )}
                {summary.ai_credits.map((row) => (
                  <p key={row.type}>
                    <span className="font-semibold">
                      {row.credits.toLocaleString()}
                    </span>{" "}
                    credits {row.type === "spend" ? "spent" : "earned"} over{" "}
                    {row.entries.toLocaleString()} entries
                  </p>
                ))}
              </div>
            </AdminCard>

            <AdminCard>
              <p className="admin-eyebrow">Money in by day</p>
              <div className="mt-2 max-h-56 overflow-x-auto overflow-y-auto">
                {summary.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing settled in this window.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 font-medium">Day</th>
                        <th className="py-1 font-medium">Subscriptions</th>
                        <th className="py-1 font-medium">Tokens</th>
                        <th className="py-1 font-medium">API wallet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.daily.map((row) => (
                        <tr
                          key={row.day}
                          className="border-t border-border/60 dark:border-white/5"
                        >
                          <td className="py-1">{row.day}</td>
                          <td className="py-1">
                            {money(Number(row.subscription_minor), "NGN")}
                          </td>
                          <td className="py-1">
                            {money(Number(row.token_minor), "NGN")}
                          </td>
                          <td className="py-1">
                            {usd(Number(row.wallet_usd))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </AdminCard>
          </div>
        </>
      )}

      <section className="mt-7">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 text-amber-600 dark:text-amber-400"
          />
          <h2 className="text-sm font-semibold text-foreground">
            Open disputes ({disputes.length})
          </h2>
        </div>

        {disputeError && (
          <p
            role="alert"
            className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          >
            {disputeError}
          </p>
        )}

        {disputes.length === 0 ? (
          <AdminCard compact>
            <p className="text-sm text-muted-foreground">
              No buyer is contesting a job right now.
            </p>
          </AdminCard>
        ) : (
          <div className="space-y-2">
            {disputes.map((dispute) => (
              <AdminCard key={dispute.id} compact>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {dispute.order?.order_number ?? dispute.order_id} ·{" "}
                      {DISPUTE_CATEGORIES.find(
                        (c) => c.value === dispute.category,
                      )?.label ?? dispute.category}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dispute.detail}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Raised {new Date(dispute.created_at).toLocaleDateString()}{" "}
                      ·{" "}
                      {dispute.order
                        ? money(
                            Math.round(
                              Number(dispute.order.agreed_price) * 100,
                            ),
                            dispute.order.currency,
                          )
                        : ""}
                      {dispute.order?.escrow_contract_id
                        ? " · funded through escrow"
                        : " · not escrowed"}
                    </p>
                    {dispute.seller_response && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Professional: {dispute.seller_response}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <AdminButton
                      onClick={() => resolveDispute(dispute, "refund")}
                      disabled={busyId === dispute.id}
                    >
                      {busyId === dispute.id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Undo2 aria-hidden="true" className="h-4 w-4" />
                      )}
                      Refund buyer
                    </AdminButton>
                    <AdminButton
                      onClick={() => resolveDispute(dispute, "dismiss")}
                      disabled={busyId === dispute.id}
                    >
                      <XCircle aria-hidden="true" className="h-4 w-4" />
                      Close, release normally
                    </AdminButton>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
