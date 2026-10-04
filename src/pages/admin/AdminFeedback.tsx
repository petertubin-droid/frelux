import { useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Star, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminButton,
  StateMessage,
} from "@/components/admin/AdminUi";
import { classNames } from "@/lib/utils";

interface FeedbackRow {
  id: string;
  kind: string;
  category: string;
  message: string;
  page_url: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  feedback: "Feedback",
  feature_request: "Suggestion",
  bug_report: "Problem report",
};

const STATUS_OPTIONS = ["new", "reviewed", "planned", "shipped", "declined"];

export default function AdminFeedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("new");
  const [error, setError] = useState<string | null>(null);

  const load = async (status: string) => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("feedback_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    setRows((data as FeedbackRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const setStatus = async (id: string, status: string) => {
    const { error: err } = await supabase
      .from("feedback_suggestions")
      .update({ status })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((prev) =>
      filter === "all"
        ? prev.map((r) => (r.id === id ? { ...r, status } : r))
        : prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    if (filter !== "all")
      setRows((prev) => prev.filter((r) => r.id !== id || r.status === filter));
  };

  return (
    <div>
      <AdminHeader
        title="Feedback & Suggestions"
        subtitle="What users ask for and report — review, plan, and mark them done."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["new", "reviewed", "planned", "shipped", "declined", "all"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={classNames(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {s}
            </button>
          ),
        )}
      </div>

      {loading && (
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading feedback…"
        />
      )}
      {error && (
        <StateMessage
          type="error"
          title="Error"
          message={`Could not load: ${error}`}
        />
      )}
      {!loading && !error && rows.length === 0 && (
        <StateMessage
          type="empty"
          title="Nothing here"
          message="No feedback in this view yet."
        />
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {KIND_LABEL[r.kind] ?? r.kind}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {r.category}
              </span>
              {r.page_url && (
                <span className="text-[11px] text-muted-foreground/70">
                  from {r.page_url}
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-card-foreground">{r.message}</p>
            {r.contact_email && (
              <p className="mt-1 text-xs text-muted-foreground">
                Contact: {r.contact_email}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={r.status}
                onChange={(e) => void setStatus(r.id, e.target.value)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {r.status === "new" && (
                <AdminButton onClick={() => void setStatus(r.id, "reviewed")}>
                  <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Reviewed
                </AdminButton>
              )}
              {r.status !== "planned" && r.status !== "shipped" && (
                <AdminButton
                  variant="secondary"
                  onClick={() => void setStatus(r.id, "planned")}
                >
                  <Star className="mr-1.5 h-3.5 w-3.5" /> Plan
                </AdminButton>
              )}
              {r.status !== "shipped" && (
                <AdminButton
                  variant="secondary"
                  onClick={() => void setStatus(r.id, "shipped")}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done
                </AdminButton>
              )}
              {r.status !== "declined" && (
                <AdminButton
                  variant="secondary"
                  onClick={() => void setStatus(r.id, "declined")}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Decline
                </AdminButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
