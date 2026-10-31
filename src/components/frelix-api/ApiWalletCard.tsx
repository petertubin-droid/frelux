// =========================================================
// API wallet card — balance and top-up for metered overage.
//
// The prepaid wallet pays for requests beyond a plan's included
// allowance. This card states the balance and opens a hosted
// checkout; it never credits anything itself, because a browser
// returning from a payment page is not proof of payment.
// =========================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  getApiWallet,
  startWalletTopup,
  type ApiWalletSummary,
} from "@/lib/frelix-api/portal-client";

/**
 * Preset amounts. Fractions of a dollar are never offered, so a caller
 * cannot spend a lifetime chasing a balance they can only see in cents.
 */
const TOPUP_PRESETS = [25, 50, 100] as const;

function formatWalletUsd(value: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

interface Props {
  /** Injected in tests; defaults to the portal client. */
  loadWallet?: () => Promise<ApiWalletSummary | null>;
  startTopup?: (
    amountUsd: number,
  ) => Promise<{ authorization_url: string } | { error: string }>;
}

export default function ApiWalletCard({
  loadWallet = getApiWallet,
  startTopup = startWalletTopup,
}: Props) {
  const { success, error } = useToast();
  const [wallet, setWallet] = useState<ApiWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(25);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWallet(await loadWallet());
    } catch {
      error("Could not load your wallet balance.");
    } finally {
      setLoading(false);
    }
  }, [loadWallet, error]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTopUp = async () => {
    setStarting(true);
    try {
      const res = await startTopup(amount);
      if ("authorization_url" in res) {
        success(
          "Opening secure checkout. Your balance updates once payment settles.",
        );
        window.location.assign(res.authorization_url);
      } else {
        error(res.error);
      }
    } catch {
      error("Could not start the top-up. Please retry.");
    } finally {
      setStarting(false);
    }
  };

  const balance = wallet?.balance_usd ?? 0;
  const empty = !loading && balance <= 0;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
        <Wallet aria-hidden="true" className="h-4 w-4 text-primary" />
        API wallet
      </h2>
      <p className="text-sm text-muted-foreground">
        Requests beyond your plan's monthly allowance are billed per request and
        drawn from this balance.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Balance
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {loading ? "…" : formatWalletUsd(balance)}
          </p>
        </div>
        {wallet?.auto_topup_enabled && (
          // The preference is stored, but nothing charges from it: doing so
          // needs a saved payment method, and none exists. Saying "auto top-up
          // adds $20" would describe a behaviour that does not happen, so the
          // card states the preference and the limit instead of the promise.
          <p className="text-xs text-muted-foreground">
            Auto top-up is requested (
            {formatWalletUsd(wallet.auto_topup_amount_usd)} below{" "}
            {formatWalletUsd(wallet.auto_topup_threshold_usd)}) but is not
            active. It needs a saved payment method, and none is stored, so top
            up here manually.
          </p>
        )}
      </div>

      {empty && (
        <p className="mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
          <Info aria-hidden="true" className="h-3 w-3" />A zero balance means
          overage requests are refused with a 402 until you top up.
        </p>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Top up amount
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPUP_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={amount === preset}
              onClick={() => setAmount(preset)}
              className={`rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors ${
                amount === preset
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "hover:bg-accent"
              }`}
            >
              ${preset}
            </button>
          ))}
          <button
            type="button"
            onClick={handleTopUp}
            disabled={starting}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {starting && (
              <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
            )}
            Add {formatWalletUsd(amount)}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Charged in USD. The server enforces the minimum and maximum per
          top-up, so nothing here can request an amount it will refuse.
        </p>
      </div>
    </section>
  );
}
