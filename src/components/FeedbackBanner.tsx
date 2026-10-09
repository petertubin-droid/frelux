import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";

/**
 * Tiny floating banner that invites users to suggest features or
 * report issues for FRELUX. Shows on every public page; one dismissal
 * hides it for 3 days (localStorage, consistent with the cookie-consent
 * storage convention).
 *
 * Sits in the bottom-LEFT corner so it never covers the Support Chat
 * bubble (bottom-right), the mobile bottom navigation, or the cookie
 * consent bar (bottom-center).
 */

const STORAGE_KEY = "frelux_feedback_banner_dismissed";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** Pages where a feedback prompt is noise, not help. */
const HIDDEN_PREFIXES = [
  "/feedback", // already on the feedback page
  "/admin", // staff screens
  "/estimate/", // client-facing shared estimate view
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
];

function shouldShow(pathname: string): boolean {
  return !HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export default function FeedbackBanner() {
  const { pathname } = useLocation();
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setDismissedAt(raw ? Number(raw) : null);
    } catch {
      /* storage unavailable - just show the banner */
    }
    setReady(true);
  }, []);

  if (!ready || !shouldShow(pathname)) return null;
  if (dismissedAt !== null && Date.now() - dismissedAt < THREE_DAYS_MS)
    return null;

  const dismiss = () => {
    const now = Date.now();
    setDismissedAt(now);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      /* ignore - in-memory dismissal still applies this visit */
    }
  };

  return (
    <aside
      aria-label="Give feedback on FRELUX"
      className="fixed bottom-20 left-4 z-40 sm:bottom-4 sm:left-4"
    >
      <div className="flex max-w-[19rem] items-start gap-3 rounded-xl border border-border bg-card p-3 pr-2 shadow-md">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-primary"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-card-foreground">
            Help us improve FRELUX
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Suggest a feature, report an issue, or tell us what to build next.
            The team reads every note.
          </p>
          <Link
            to="/feedback"
            className="mt-1.5 -mb-1 inline-block px-1 py-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter underline-offset-4 hover:underline"
          >
            Give feedback
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss feedback banner"
          className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
