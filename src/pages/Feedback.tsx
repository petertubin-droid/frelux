import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";

type FeedbackKind = "feedback" | "feature_request" | "bug_report";

const KIND_OPTIONS: { value: FeedbackKind; label: string }[] = [
  { value: "feedback", label: "General feedback" },
  { value: "feature_request", label: "Suggest a development" },
  { value: "bug_report", label: "Report a problem" },
];

const CATEGORY_OPTIONS = [
  "Calculators & engines",
  "Marketplace",
  "Pro-Connect",
  "Payments & pricing",
  "Account & profile",
  "Other",
];

export default function Feedback() {
  useBreadcrumbJsonLd([{ name: "Feedback & Suggestions", path: "/feedback" }]);
  const { user } = useAuth();
  const location = useLocation();
  const [kind, setKind] = useState<FeedbackKind>("feature_request");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const referrer =
    typeof window !== "undefined" ? window.location.pathname : "";

  useSeo({
    title: "Feedback & Suggestions",
    description:
      "Suggest a development, request a feature, or tell us what to improve on FRELUX.",
  });
  void location;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your idea or feedback.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from("feedback_suggestions").insert({
      kind,
      category,
      message: message.trim(),
      contact_email: email.trim() || user?.email || null,
      page_url: referrer,
      ...(user ? { created_by: user.id } : {}),
    });
    setSubmitting(false);
    if (err) {
      setError("Could not send right now. Please try again shortly.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Feedback & Suggestions"
        subtitle="Tell us what to build next. Every suggestion goes straight to the team."
      />

      {submitted ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold text-card-foreground">
            Thank you!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your{" "}
            {kind === "feature_request"
              ? "suggestion"
              : kind === "bug_report"
                ? "report"
                : "feedback"}{" "}
            has been received and will be reviewed by the team.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Back to homepage</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <div>
            <label
              htmlFor="feedback-kind"
              className="text-sm font-medium text-card-foreground"
            >
              What is this about?
            </label>
            <select
              id="feedback-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackKind)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="feedback-category"
              className="text-sm font-medium text-card-foreground"
            >
              Area
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="text-sm font-medium text-card-foreground"
            >
              Your {kind === "bug_report" ? "report" : "suggestion or feedback"}
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={
                kind === "feature_request"
                  ? "What should we build or improve?"
                  : "Tell us what happened or what you think…"
              }
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-email"
              className="text-sm font-medium text-card-foreground"
            >
              Contact email{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Sending…" : "Send to the team"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You can also report prices you see locally on the{" "}
            <Link to="/material-prices" className="underline">
              Price Tracker
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
}
