import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  Check,
  Wallet,
  Calendar,
  Plus,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Send,
} from "lucide-react";
import {
  fetchOrder,
  fetchMilestones,
  updateMilestone,
  approveMilestone,
  updateOrderStatus,
  submitOrderReview,
  createMilestone,
} from "@/lib/marketplace";
import {
  approveAndReleaseMilestone,
  fetchOrderPayments,
  fundOrderWithEscrow,
  summariseOrderPayments,
} from "@/lib/marketplace/escrow-bridge";
import { useAuth } from "@/lib/auth";
import type {
  DbMarketplaceOrder,
  DbMarketplaceMilestone,
} from "@/types/marketplace";
import { ORDER_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/types/marketplace";
import { classNames } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { formatByCode } from "@/lib/international/currency-format";
import { useLanguage } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";

const STATUS_FLOW = [
  "pending_start",
  "in_progress",
  "client_review",
  "completed",
];
const STATUS_COLORS: Record<string, string> = {
  pending_start:
    "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
  in_progress:
    "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  client_review:
    "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  completed:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  disputed: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

export default function OrderDetail() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  useSeo({
    description: "FRELUX marketplace",
    title: "Order Details, FRELUX Marketplace",
    canonicalPath: `/marketplace/orders/${id}`,
  });

  const [order, setOrder] = useState<DbMarketplaceOrder | null>(null);
  const [milestones, setMilestones] = useState<DbMarketplaceMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneAmount, setNewMilestoneAmount] = useState("");
  const [escrowBusy, setEscrowBusy] = useState(false);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [o, m] = await Promise.all([fetchOrder(id), fetchMilestones(id)]);
      setOrder(o);
      setMilestones(m);
      // The settlement trail is written by the escrow engine, not by this
      // page, so a failure to read it must not hide the order itself.
      try {
        setPayments(
          (await fetchOrderPayments(id)) as Record<string, unknown>[],
        );
      } catch {
        setPayments([]);
      }
    } catch {
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const paymentSummary = summariseOrderPayments(payments);
  const isClient = order?.client_id === user.id;
  const isPro = !isClient;
  const canAdvance =
    order?.status === "pending_start" || order?.status === "in_progress";

  async function handleAdvanceStatus() {
    if (!order) return;
    setSubmitting(true);
    try {
      const nextStatus =
        STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || "completed";
      await updateOrderStatus(order.id, nextStatus);
      load();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveMilestone(milestoneId: string) {
    if (!order) return;
    const milestone = milestones.find((item) => item.id === milestoneId);
    if (!milestone) return;

    setEscrowError(null);

    // A funded order releases the money in the same click, because approving
    // work is what pays the professional. An unfunded order just records
    // approval and says so, rather than implying a payment happened.
    if (order.escrow_contract_id) {
      setEscrowBusy(true);
      try {
        await approveAndReleaseMilestone(order, milestone);
      } catch (error) {
        setEscrowError(
          error instanceof Error
            ? error.message
            : "The escrow release could not be completed.",
        );
      } finally {
        setEscrowBusy(false);
      }
      load();
      return;
    }

    await approveMilestone(milestoneId);
    setEscrowError(
      "Approved. This order is not funded through escrow, so no payment was released.",
    );
    load();
  }

  async function handleFundOrder() {
    if (!order) return;
    setEscrowBusy(true);
    setEscrowError(null);
    try {
      const { contractId } = await fundOrderWithEscrow(order, milestones);
      // Re-open the same checkout link if the contract already exists.
      const { startEscrowCheckout } =
        await import("@/lib/payments/escrow-client");
      const url = await startEscrowCheckout(contractId);
      window.location.href = url;
    } catch (error) {
      setEscrowError(
        error instanceof Error
          ? error.message
          : "The escrow checkout could not be started.",
      );
    } finally {
      setEscrowBusy(false);
    }
  }

  async function handleUpdateMilestone(milestoneId: string, status: string) {
    await updateMilestone(milestoneId, {
      status: status as DbMarketplaceMilestone["status"],
    });
    load();
  }

  async function handleAddMilestone() {
    if (!order || !newMilestoneTitle.trim()) return;
    setSubmitting(true);
    try {
      await createMilestone({
        order_id: order.id,
        title: newMilestoneTitle.trim(),
        sort_order: milestones.length + 1,
        amount: newMilestoneAmount ? Number(newMilestoneAmount) : null,
      });
      setNewMilestoneTitle("");
      setNewMilestoneAmount("");
      setShowMilestoneForm(false);
      load();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReview() {
    if (!order) return;
    setSubmitting(true);
    try {
      await submitOrderReview(
        order.id,
        isClient ? "client" : "pro",
        reviewRating,
        reviewText,
      );
      setShowReviewForm(false);
      load();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <PageHeader
        variant="data"
        backTo="/marketplace"
        backLabel={t("Marketplace")}
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("Marketplace"), path: "/marketplace" },
          { label: t("Order") },
        ]}
        eyebrow={t("Order")}
        title={order.listing?.title || "Untitled Job"}
        subtitle={`${order.order_number} · ${PROJECT_TYPE_LABELS[order.listing?.project_type || "painting"]}`}
        actions={
          <div className="text-right">
            <p className="text-lg font-extrabold text-foreground dark:text-primary-foreground">
              {formatByCode(order.agreed_price, order.currency)}
            </p>
            {order.agreed_timeline_days && (
              <p className="text-xs text-muted-foreground">
                <Calendar
                  aria-hidden="true"
                  className="mr-0.5 inline h-3 w-3"
                />{" "}
                {order.agreed_timeline_days} days
              </p>
            )}
          </div>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-6 dark:border-white/5 dark:bg-card">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={classNames(
                "rounded-md px-2 py-0.5 text-xs font-semibold",
                STATUS_COLORS[order.status],
              )}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Participant info */}
          <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4 dark:border-white/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {order.pro_profile?.profile_image_url ? (
                <img
                  src={order.pro_profile.profile_image_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-brand-purple">
                  {order.pro_profile?.display_name?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
            <div>
              <Link
                to={`/pro-connect/${order.pro_profile?.slug}/`}
                className="text-sm font-semibold text-foreground hover:text-brand-purple dark:text-primary-foreground"
              >
                {order.pro_profile?.business_name ||
                  order.pro_profile?.display_name}
              </Link>
              {order.pro_profile?.verification_status === "verified" && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck aria-hidden="true" className="h-3 w-3" />{" "}
                  Verified
                </span>
              )}
            </div>
            <div className="ml-auto">
              <Link
                to="/messages"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/80"
              >
                <MessageSquare className="h-3.5 w-3.5" /> {t("Message")}
              </Link>
            </div>
          </div>

          {/* Payment status */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground dark:text-muted-foreground">
              Payment:{" "}
            </span>
            <span
              className={classNames(
                "font-semibold capitalize",
                order.payment_status === "unpaid"
                  ? "text-muted-foreground"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {order.payment_status.replace("_", " ")}
            </span>
          </div>

          {order.escrow_contract_id ? (
            <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
              {t(
                "Escrow contract linked. Approving a milestone releases its payment.",
              )}
            </p>
          ) : (
            isClient && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 dark:border-white/10">
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {t(
                    "Fund this order through escrow so approved milestones can be paid out. Milestone amounts must add up to the agreed price.",
                  )}
                </p>
                <Button
                  variant="default"
                  onClick={handleFundOrder}
                  disabled={escrowBusy || milestones.length === 0}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
                  {escrowBusy
                    ? t("Starting checkout...")
                    : t("Fund with escrow")}
                </Button>
              </div>
            )
          )}

          {escrowError && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {escrowError}
            </p>
          )}
        </div>

        {/* Status advancement */}
        {canAdvance && (isClient || isPro) && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Current status:{" "}
              <span className="font-semibold text-card-foreground dark:text-primary-foreground">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </p>
            <Button
              variant="default"
              onClick={handleAdvanceStatus}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Check aria-hidden="true" className="h-4 w-4" />
              )}
              {isPro ? "Mark Progress" : "Advance Status"}
            </Button>
          </div>
        )}

        {/* Milestones */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
              Milestones ({milestones.length})
            </h2>
            {isPro && canAdvance && (
              <Button
                variant="ghost"
                onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-purple"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" /> {t("Add")}
              </Button>
            )}
          </div>

          {showMilestoneForm && (
            <div className="mb-3 flex gap-2">
              <input
                aria-label="Milestone title"
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder={t("Milestone title...")}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
              <input
                aria-label={t("Milestone amount")}
                type="number"
                min="0"
                step="0.01"
                value={newMilestoneAmount}
                onChange={(e) => setNewMilestoneAmount(e.target.value)}
                placeholder={t("Amount")}
                className="w-28 rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
              <Button
                variant="default"
                onClick={handleAddMilestone}
                disabled={submitting || !newMilestoneTitle.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {t("Add")}
              </Button>
            </div>
          )}

          {paymentSummary.rows.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-card p-3 dark:border-white/5 dark:bg-card">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                  {t("Payments released")}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatByCode(paymentSummary.totalPaid, order.currency)}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {paymentSummary.rows.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between text-[11px] text-muted-foreground dark:text-muted-foreground"
                  >
                    <span>
                      {formatByCode(
                        payment.amount,
                        payment.currency || order.currency,
                      )}
                      {payment.provider ? ` · ${payment.provider}` : ""}
                      {payment.providerRef ? ` · ${payment.providerRef}` : ""}
                    </span>
                    <span
                      className={classNames(
                        "font-medium capitalize",
                        payment.status === "completed"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {payment.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {milestones.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground dark:border-white/5 dark:bg-card">
              {t("No milestones yet.")}
            </p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={classNames(
                    "rounded-lg border bg-card p-3 dark:bg-card",
                    m.status === "approved"
                      ? "border-emerald-300 dark:border-emerald-500/30"
                      : "border-border dark:border-white/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={classNames(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          m.status === "approved"
                            ? "bg-emerald-500 text-primary-foreground"
                            : m.status === "in_progress"
                              ? "bg-amber-500 text-primary-foreground"
                              : "bg-muted text-muted-foreground dark:bg-white/10 dark:text-muted-foreground",
                        )}
                      >
                        {m.status === "approved" ? (
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="text-sm font-medium text-foreground dark:text-primary-foreground">
                        {m.title}
                      </span>
                    </div>
                    {m.status !== "approved" && m.status !== "rejected" && (
                      <div className="flex items-center gap-1">
                        {isPro && m.status === "pending" && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleUpdateMilestone(m.id, "in_progress")
                            }
                            className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-amber-600 dark:border-white/10 dark:text-muted-foreground/80"
                          >
                            {t("Start")}
                          </Button>
                        )}
                        {isClient && m.status === "in_progress" && (
                          <Button
                            variant="ghost"
                            onClick={() => handleApproveMilestone(m.id)}
                            className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-emerald-700"
                          >
                            <Check aria-hidden="true" className="h-3 w-3" />{" "}
                            {order.escrow_contract_id
                              ? t("Approve & pay")
                              : t("Approve")}
                          </Button>
                        )}
                      </div>
                    )}
                    {m.status === "approved" && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  {m.amount != null && (
                    <p className="mt-1 ml-8 text-[10px] font-semibold text-foreground dark:text-primary-foreground">
                      {formatByCode(Number(m.amount), order.currency)}
                    </p>
                  )}
                  {m.expected_date && (
                    <p className="mt-1 ml-8 text-[10px] text-muted-foreground dark:text-muted-foreground">
                      <Calendar
                        aria-hidden="true"
                        className="mr-0.5 inline h-2.5 w-2.5"
                      />
                      Expected: {new Date(m.expected_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        {order.status === "completed" && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
              {t("Reviews")}
            </h2>
            <div className="space-y-3">
              {/* Client review */}
              {order.client_rating ? (
                <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-card-foreground dark:text-muted-foreground/80">
                      {t("Client")}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {order.client_rating} / 5
                    </span>
                  </div>
                  {order.client_review && (
                    <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                      {order.client_review}
                    </p>
                  )}
                </div>
              ) : isClient && !showReviewForm ? (
                <Button
                  variant="ghost"
                  onClick={() => setShowReviewForm(true)}
                  className="w-full rounded-lg border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground"
                >
                  {t("Leave a review for the pro worker")}
                </Button>
              ) : null}

              {/* Pro review */}
              {order.pro_rating && (
                <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-card-foreground dark:text-muted-foreground/80">
                      {t("Pro Worker")}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {order.pro_rating} / 5
                    </span>
                  </div>
                  {order.pro_review && (
                    <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                      {order.pro_review}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Review form */}
            {showReviewForm && (
              <div className="mt-3 rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
                <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                  {isClient ? "Review the Pro Worker" : "Review the Client"}
                </h3>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Button
                      variant="ghost"
                      key={i}
                      onClick={() => setReviewRating(i + 1)}
                      className={`text-lg font-bold transition-colors ${
                        i < reviewRating
                          ? "text-amber-500"
                          : "text-muted-foreground/80 dark:text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <textarea
                  aria-label="Review comment"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={t("Share your experience...")}
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="default"
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Review
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowReviewForm(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dispute button */}
        {(order.status === "in_progress" ||
          order.status === "client_review") && (
          <div className="mt-6">
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" /> {t("Report a Problem")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
