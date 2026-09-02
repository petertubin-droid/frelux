/**
 * ReportCalculationIssue — a collapsible form that lets users report
 * what they believe is an incorrect calculation. Submits to the
 * calculation_reports table (public insert, admin-only read/update).
 */

import { useState } from "react";
import { Flag, ChevronDown, Loader2, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReportCalculationIssueProps {
  calculatorType: string;
  userInput?: Record<string, unknown>;
  actualResult?: Record<string, unknown>;
}

export default function ReportCalculationIssue({
  calculatorType,
  userInput,
  actualResult,
}: ReportCalculationIssueProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from("calculation_reports")
        .insert({
          calculator_type: calculatorType,
          page_url:
            typeof window !== "undefined" ? window.location.pathname : "",
          user_input: userInput ?? null,
          expected_result: expectedResult.trim()
            ? { description: expectedResult.trim() }
            : null,
          actual_result: actualResult ?? null,
          description: description.trim(),
          contact_email: contactEmail.trim() || null,
          status: "open",
        });

      if (dbError) throw new Error(dbError.message);
      setSubmitted(true);
      setDescription("");
      setExpectedResult("");
      setContactEmail("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 dark:bg-emerald-500/10">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Report submitted. Our team will review this calculation. Thank you for
          helping improve FRELUX.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setOpen(false);
          }}
          className="ml-auto text-emerald-600 dark:text-emerald-400"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/80"
        aria-expanded={open}
      >
        <Flag className="h-3.5 w-3.5" />
        Report incorrect calculation
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 space-y-3 rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              What seems wrong? <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what you expected vs what the calculator showed..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground/60"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              What should the correct result be? (optional)
            </label>
            <input
              type="text"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="e.g. 2 buckets instead of 3 buckets"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground/60"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              Your email (optional, for follow-up)
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground/60"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flag className="h-4 w-4" />
            )}
            Submit report
          </button>
        </form>
      )}
    </div>
  );
}
