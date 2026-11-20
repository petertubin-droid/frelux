import { useState } from "react";
import { CheckCircle2, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { supabase } from "@/lib/supabase";

export type EstimateAccuracy = "accurate" | "too_high" | "too_low" | "other";

export interface EstimateAccuracyFeedbackProps {
  toolId: string;
  toolName?: string;
  className?: string;
}

const labels: Record<EstimateAccuracy, string> = {
  accurate: "About right",
  too_high: "Too high",
  too_low: "Too low",
  other: "Something else",
};

/** Shared, optional feedback control for calculator and takeoff result views. */
export default function EstimateAccuracyFeedback({
  toolId,
  className = "",
}: EstimateAccuracyFeedbackProps) {
  const [rating, setRating] = useState<EstimateAccuracy | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(selected: EstimateAccuracy, comment = "") {
    setRating(selected);
    setError(null);
    setBusy(true);
    try {
      const { error: insertError } = await supabase
        .from("feedback_suggestions")
        .insert({
          kind: "feedback",
          category: `estimate_accuracy:${toolId}`,
          message: JSON.stringify({
            schema: 1,
            toolId,
            rating: selected,
            comment: comment.trim() || undefined,
            submittedAt: new Date().toISOString(),
          }),
          page_url:
            typeof window === "undefined" ? null : window.location.pathname,
        });
      if (insertError) throw new Error(insertError.message);
      setSent(true);
    } catch {
      setError("We couldn't send that just now. Please try again.");
      setRating(null);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        Thanks. Your feedback helps us improve this tool.
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`accuracy-${toolId}`}
      className={`mt-4 rounded-xl border bg-card p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id={`accuracy-${toolId}`} className="text-sm font-semibold">
            Was this result accurate?
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional feedback helps us improve the tool.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-pressed={rating === "accurate"}
            onClick={() => void submit("accurate")}
          >
            <ThumbsUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            About right
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-pressed={rating === "too_high"}
            onClick={() => {
              setRating("too_high");
              setShowNote(true);
            }}
          >
            <ThumbsUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Too high
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-pressed={rating === "too_low"}
            onClick={() => {
              setRating("too_low");
              setShowNote(true);
            }}
          >
            <ThumbsDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Too low
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-pressed={rating === "other"}
            onClick={() => {
              setRating("other");
              setShowNote(true);
            }}
          >
            Something else
          </Button>
        </div>
      </div>
      {showNote && rating && rating !== "accurate" && (
        <div className="mt-3 space-y-2">
          <label
            htmlFor={`accuracy-note-${toolId}`}
            className="block text-xs font-medium"
          >
            {labels[rating]}: what differed?{" "}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`accuracy-note-${toolId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="For example, site conditions, material coverage, or local pricing."
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setShowNote(false);
                setRating(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void submit(rating, note)}
            >
              {busy && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Send feedback
            </Button>
          </div>
        </div>
      )}
      {error && !showNote && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
