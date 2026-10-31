// =========================================================
// Auto top-up controls.
//
// The rules live in the database and in the sweep, not here: this panel
// collects a threshold, an amount and consent, and refuses to submit without
// all three. Where automatic charging is genuinely unavailable, it says so
// instead of offering a switch that would do nothing.
// =========================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  listApiPaymentMethods,
  setApiAutoTopup,
  type ApiPaymentMethod,
  type ApiWalletSummary,
} from "@/lib/frelix-api/portal-client";

/** Mirrors AUTOTOPUP_CONSENT_VERSION in _shared/auto-topup.ts. */
export const AUTO_TOPUP_CONSENT_VERSION = "autotopup-v1";

export const AUTO_TOPUP_MIN_USD = 5;
export const AUTO_TOPUP_MAX_USD = 200;
export const AUTO_TOPUP_DEFAULT_AMOUNT = 20;
export const AUTO_TOPUP_DEFAULT_THRESHOLD = 5;

interface Props {
  wallet: ApiWalletSummary | null;
  onChanged?: () => void;
  /** Injected in tests. */
  loadCards?: () => Promise<ApiPaymentMethod[]>;
  save?: (input: {
    enabled: boolean;
    thresholdUsd?: number;
    amountUsd?: number;
    cardId?: string | null;
    consentVersion?: string;
  }) => Promise<{ error: string } | { enabled: boolean; card_last4?: string }>;
}

function money(value: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export default function ApiAutoTopupPanel({
  wallet,
  onChanged,
  loadCards = listApiPaymentMethods,
  save = setApiAutoTopup,
}: Props) {
  const { toast } = useToast();
  const [cards, setCards] = useState<ApiPaymentMethod[] | null>(null);
  const [amount, setAmount] = useState(
    String(wallet?.auto_topup_amount_usd ?? AUTO_TOPUP_DEFAULT_AMOUNT),
  );
  const [threshold, setThreshold] = useState(
    String(wallet?.auto_topup_threshold_usd ?? AUTO_TOPUP_DEFAULT_THRESHOLD),
  );
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadCards()
      .then((rows) => {
        if (live) setCards(rows);
      })
      .catch(() => {
        if (live) setCards([]);
      });
    return () => {
      live = false;
    };
  }, [loadCards]);

  const on = Boolean(wallet?.auto_topup_enabled);
  const card =
    cards?.find((c) => c.id === wallet?.auto_topup_card_id) ??
    cards?.[0] ??
    null;

  const submit = useCallback(
    async (enabled: boolean) => {
      setError(null);
      setSaving(true);
      try {
        const amountUsd = Number(amount);
        const thresholdUsd = Number(threshold);

        if (enabled) {
          if (!card) {
            setError("Add a card first by topping up with one.");
            return;
          }
          if (!consent && !wallet?.auto_topup_consent_at) {
            setError(
              "Tick the consent box so automatic charges are agreed to.",
            );
            return;
          }
          if (!Number.isFinite(amountUsd) || amountUsd < AUTO_TOPUP_MIN_USD) {
            setError(
              `The amount must be at least ${money(AUTO_TOPUP_MIN_USD)}.`,
            );
            return;
          }
          if (amountUsd > AUTO_TOPUP_MAX_USD) {
            setError(`The amount can be at most ${money(AUTO_TOPUP_MAX_USD)}.`);
            return;
          }
          if (!Number.isFinite(thresholdUsd) || thresholdUsd >= amountUsd) {
            setError(
              "The threshold must be below the amount, or one charge would retrigger the next.",
            );
            return;
          }
        }

        const result = await save({
          enabled,
          thresholdUsd: enabled ? thresholdUsd : undefined,
          amountUsd: enabled ? amountUsd : undefined,
          cardId: card?.id ?? null,
          consentVersion: enabled ? AUTO_TOPUP_CONSENT_VERSION : undefined,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        toast({
          title: enabled ? "Auto top-up is on" : "Auto top-up is off",
          message: enabled
            ? `${money(amountUsd)} will be charged to your saved card when the balance falls below ${money(thresholdUsd)}.`
            : "Your balance will be topped up by hand from now on.",
        });
        onChanged?.();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save that setting.",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      amount,
      threshold,
      consent,
      card,
      save,
      toast,
      onChanged,
      wallet?.auto_topup_consent_at,
    ],
  );

  if (!wallet) return null;

  return (
    <div className="mt-4 rounded-lg border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CreditCard aria-hidden="true" className="h-4 w-4 text-primary" />
        Auto top-up
      </div>

      {wallet.auto_topup_disabled_reason && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
          {wallet.auto_topup_disabled_reason}
        </p>
      )}

      {on ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            On. {money(wallet.auto_topup_amount_usd)} is charged to{" "}
            {card?.last4
              ? `${card.brand ?? "card"} ending ${card.last4}`
              : "your saved card"}{" "}
            when the balance falls below{" "}
            {money(wallet.auto_topup_threshold_usd)}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Charges happen within ten minutes of the balance dropping, and stop
            after two declines in a row.
          </p>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            {saving && (
              <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
            )}
            Turn off auto top-up
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            {cards === null
              ? "Checking your saved cards."
              : card
                ? "Top up automatically so requests are not refused while your balance is empty."
                : "Top up once by card and it is saved for later charges. Until a card is saved, top up by hand below."}
          </p>

          {card && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted-foreground">
                Charge below
                <input
                  aria-label="Threshold"
                  inputMode="decimal"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="mt-1 block w-24 rounded-md border bg-background px-2 py-1 text-sm tabular-nums text-foreground"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Add
                <input
                  aria-label="Amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 block w-24 rounded-md border bg-background px-2 py-1 text-sm tabular-nums text-foreground"
                />
              </label>
            </div>
          )}

          {card && (
            <>
              <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent || Boolean(wallet.auto_topup_consent_at)}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree that FRELUX may charge my saved card{" "}
                  {money(Number(amount) || 0)} automatically when my API balance
                  falls below {money(Number(threshold) || 0)}. I can turn this
                  off at any time.
                </span>
              </label>

              <button
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving && (
                  <Loader2
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin"
                  />
                )}
                Turn on auto top-up
              </button>
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
