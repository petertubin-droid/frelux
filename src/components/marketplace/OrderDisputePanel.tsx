import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  DISPUTE_CATEGORIES,
  DISPUTE_WINDOW_DAYS,
  openOrderDispute,
  respondToOrderDispute,
  withdrawOrderDispute,
  type DisputeCategory,
  type OrderDispute,
} from "@/lib/marketplace-disputes";

interface Props {
  orderId: string;
  status: string;
  isClient: boolean;
  canOpen: boolean;
  dispute: OrderDispute | null;
  onChanged: () => void;
}

const STATUS_COPY: Record<OrderDispute["status"], string> = {
  open: "With FRELUX review",
  withdrawn: "Withdrawn by the buyer",
  refunded: "Refunded",
  dismissed: "Closed in the professional's favour",
};

/**
 * The buyer's dispute path, shown on the order itself.
 *
 * Deliberately quiet: nothing appears until the work is with the client, and the
 * form asks one question (what went wrong) plus a sentence of detail. Escrow is
 * held while a dispute is open, which is the point of having one.
 */
export default function OrderDisputePanel({
  orderId,
  status,
  isClient,
  canOpen,
  dispute,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DisputeCategory>("work_quality");
  const [detail, setDetail] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveDispute = dispute && dispute.status === "open" ? dispute : null;
  const canRaise =
    isClient && canOpen && status === "client_review" && !liveDispute;

  if (!liveDispute && !canRaise && !dispute) return null;

  async function handleOpen() {
    setBusy(true);
    setError(null);
    try {
      await openOrderDispute({ orderId, category, detail });
      setOpen(false);
      setDetail("");
      onChanged();
    } catch {
      setError(
        "That dispute could not be raised. Refresh the order to see its current state.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond() {
    if (!liveDispute) return;
    setBusy(true);
    setError(null);
    try {
      await respondToOrderDispute(liveDispute.id, response);
      setResponse("");
      onChanged();
    } catch {
      setError("Your response was not saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!liveDispute) return;
    setBusy(true);
    setError(null);
    try {
      await withdrawOrderDispute(liveDispute.id, orderId);
      onChanged();
    } catch {
      setError("The dispute could not be withdrawn. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
      <div className="flex items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground dark:text-primary-foreground">
            {liveDispute ? "Problem raised" : "Something wrong with this work?"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
            {liveDispute
              ? "The money stays in escrow until FRELUX review decides where it goes."
              : `You can raise a problem for ${DISPUTE_WINDOW_DAYS} days after the work is submitted.`}
          </p>

          {liveDispute && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-card-foreground dark:text-primary-foreground">
                <span className="font-medium">
                  {DISPUTE_CATEGORIES.find(
                    (c) => c.value === liveDispute.category,
                  )?.label ?? liveDispute.category}
                  :
                </span>{" "}
                {liveDispute.detail}
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                {STATUS_COPY[liveDispute.status]}
              </p>

              {liveDispute.seller_response ? (
                <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-card-foreground dark:bg-white/5 dark:text-primary-foreground">
                  <p className="mb-1 font-medium">Professional's answer</p>
                  {liveDispute.seller_response}
                </div>
              ) : (
                !isClient && (
                  <div className="space-y-2">
                    <label
                      htmlFor={`dispute-response-${liveDispute.id}`}
                      className="block text-xs font-medium text-card-foreground dark:text-primary-foreground"
                    >
                      Your answer
                    </label>
                    <textarea
                      id={`dispute-response-${liveDispute.id}`}
                      value={response}
                      onChange={(event) => setResponse(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm dark:border-white/10 dark:bg-card"
                      placeholder="Say what was delivered, and when."
                    />
                    <button
                      type="button"
                      onClick={handleRespond}
                      disabled={busy || response.trim().length < 5}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                      ) : (
                        <MessageSquare
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      )}
                      Send answer
                    </button>
                  </div>
                )
              )}

              {isClient && (
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={busy}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium disabled:opacity-50 dark:border-white/10"
                >
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                  Withdraw this problem
                </button>
              )}
            </div>
          )}

          {!liveDispute && !open && canRaise && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-medium dark:border-white/10"
            >
              Report a problem
            </button>
          )}

          {open && canRaise && (
            <div className="mt-3 space-y-2">
              <label
                htmlFor="dispute-category"
                className="block text-xs font-medium text-card-foreground dark:text-primary-foreground"
              >
                What went wrong?
              </label>
              <select
                id="dispute-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as DisputeCategory)
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm dark:border-white/10 dark:bg-card"
              >
                {DISPUTE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <label
                htmlFor="dispute-detail"
                className="block text-xs font-medium text-card-foreground dark:text-primary-foreground"
              >
                What happened?
              </label>
              <textarea
                id="dispute-detail"
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm dark:border-white/10 dark:bg-card"
                placeholder="Say what was agreed and what you got instead."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={busy || detail.trim().length < 10}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy && (
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  )}
                  Raise problem
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!liveDispute && dispute && !canRaise && (
            <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
              {STATUS_COPY[dispute.status]}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
