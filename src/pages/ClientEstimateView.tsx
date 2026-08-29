import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Loader2,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useSeo } from "@/lib/seo";
import {
  fetchClientEstimateByToken,
  approveClientEstimate,
  requestEstimateChanges,
} from "@/lib/project-intelligence";
import type { DbClientEstimate } from "@/types/database";

const fmt = (v: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(v || 0);

export default function ClientEstimateView() {
  useSeo({
    title: "Project Estimate",
    description: "Review and approve your project estimate.",
    noIndex: true,
  });
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<DbClientEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchClientEstimateByToken(token)
      .then((data) => {
        if (!data)
          setError(
            "This estimate link is no longer available or has been revoked.",
          );
        setEstimate(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleApprove() {
    if (!token) return;
    setActionLoading(true);
    try {
      await approveClientEstimate(token);
      setEstimate((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              approved_at: new Date().toISOString(),
            }
          : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestChanges() {
    if (!token || !feedback.trim()) return;
    setActionLoading(true);
    try {
      await requestEstimateChanges(token, feedback);
      setEstimate((prev) =>
        prev
          ? {
              ...prev,
              status: "changes_requested",
              changes_requested_at: new Date().toISOString(),
              client_feedback: feedback,
            }
          : prev,
      );
      setShowFeedback(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (error)
    return (
      <div className="container mx-auto py-20 max-w-lg text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Unable to Load Estimate</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  if (!estimate) return null;

  const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: typeof CheckCircle2 }
  > = {
    draft: { label: "Draft", color: "text-muted-foreground", icon: FileText },
    sent: { label: "Sent", color: "text-blue-500", icon: Clock },
    viewed: { label: "Viewed", color: "text-blue-500", icon: Clock },
    approved: {
      label: "Approved",
      color: "text-emerald-500",
      icon: CheckCircle2,
    },
    changes_requested: {
      label: "Changes Requested",
      color: "text-amber-500",
      icon: AlertCircle,
    },
    expired: { label: "Expired", color: "text-red-500", icon: AlertCircle },
  };
  const statusConf = STATUS_CONFIG[estimate.status] || STATUS_CONFIG.draft;
  const canAct = ["sent", "viewed", "changes_requested"].includes(
    estimate.status,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  Secure Estimate
                </span>
              </div>
              <h1 className="text-2xl font-bold">{estimate.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {estimate.estimate_number}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${statusConf.color} bg-current/10`}
            >
              <statusConf.icon className="h-4 w-4" /> {statusConf.label}
            </div>
          </div>

          {estimate.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {estimate.description}
            </p>
          )}
          {estimate.client_name && (
            <p className="text-sm">
              <span className="text-muted-foreground">Prepared for:</span>{" "}
              <span className="font-medium">{estimate.client_name}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Estimate created on{" "}
            {new Date(estimate.created_at).toLocaleDateString()} • Valid for{" "}
            {estimate.validity_days} days
          </p>
        </div>

        {/* Cost breakdown */}
        <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Cost Breakdown</h2>
          <div className="space-y-2">
            {[
              { label: "Materials", value: estimate.materials_cost },
              { label: "Labour", value: estimate.labour_cost },
              { label: "Transport", value: estimate.transport_cost },
              { label: "Miscellaneous", value: estimate.misc_cost },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between border-b pb-2"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">
                  {fmt(row.value, estimate.currency)}
                </span>
              </div>
            ))}
            {estimate.markup_amount > 0 && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  Markup ({estimate.markup_percentage}%)
                </span>
                <span className="font-medium">
                  {fmt(estimate.markup_amount, estimate.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <span className="font-bold text-lg">Grand Total</span>
              <span className="font-bold text-lg text-primary">
                {fmt(estimate.grand_total, estimate.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Materials summary */}
        {estimate.materials_summary?.length > 0 && (
          <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Materials</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Material", "Category", "Qty", "Unit Price", "Total"].map(
                      (h) => (
                        <th
                          key={h}
                          className="p-2 text-left font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {estimate.materials_summary.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-medium">{m.name}</td>
                      <td className="p-2 text-muted-foreground capitalize">
                        {m.category}
                      </td>
                      <td className="p-2">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="p-2">
                        {fmt(m.unit_price, estimate.currency)}
                      </td>
                      <td className="p-2 font-medium">
                        {fmt(m.total, estimate.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        {(estimate.notes || estimate.terms_conditions) && (
          <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
            {estimate.notes && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  {estimate.notes}
                </p>
              </div>
            )}
            {estimate.terms_conditions && (
              <div>
                <h3 className="font-semibold mb-1">Terms & Conditions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {estimate.terms_conditions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client feedback display */}
        {estimate.client_feedback &&
          estimate.status === "changes_requested" && (
            <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-amber-600">Your Feedback</h3>
              </div>
              <p className="text-sm">{estimate.client_feedback}</p>
            </div>
          )}

        {/* Action buttons */}
        {canAct && (
          <div className="sticky bottom-0 rounded-2xl border bg-card/95 backdrop-blur-md p-6 shadow-lg">
            {showFeedback ? (
              <div className="space-y-4">
                <textarea
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                  rows={4}
                  placeholder="Describe what changes you'd like..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestChanges}
                    disabled={actionLoading || !feedback.trim()}
                    className="group flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" /> Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="group flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />{" "}
                      Approve Estimate
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="group flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500/30 px-6 py-3.5 text-sm font-semibold text-amber-600 hover:bg-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <AlertCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />{" "}
                  Request Changes
                </button>
              </div>
            )}
          </div>
        )}

        {estimate.status === "approved" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-bold text-emerald-600">
              Estimate Approved!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Thank you for your approval. The project owner has been notified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
