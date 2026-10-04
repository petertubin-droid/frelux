import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";

/**
 * Tiny, silent, professional banner that invites feedback.
 * Shows only on the homepage and calculator/tool pages; one
 * dismissal hides it for 3 days (localStorage, consistent with
 * the analytics/cookie-consent storage convention).
 */

const STORAGE_KEY = "frelux_feedback_banner_dismissed";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** Calculator, estimator and tool pages that show the banner. */
const CALCULATOR_PATHS = [
  "/calculators",
  "/construction-tools",
  "/paint-calculator",
  "/screeding-calculator",
  "/pop-ceiling-calculator",
  "/tile-calculator",
  "/finish-estimator",
  "/cost-estimator",
  "/painting-estimator",
  "/screeding-cost-estimator",
  "/pop-ceiling-cost-estimator",
  "/tile-cost-estimator",
  "/tyrolene-estimator",
  "/image-estimator",
  "/smart-calculator",
  "/structural-calculator",
  "/foundation-calculator",
  "/project-timeline",
  "/construction-sequence",
  "/build-to-roof-estimator",
  "/material-prices",
  "/regional-cost-index",
  "/boq-generator",
  "/labour-estimator",
  "/margin-calculator",
  "/defect-diagnosis",
  "/heat-comfort",
  "/circular-reuse",
  "/solar-pv-estimator",
  "/electrical",
  "/plumbing",
  "/conversational-estimator",
  "/count-vision",
  "/carbon-footprint",
  "/cash-flow-timeline",
  "/estimate-refresh",
  "/warranty-certificate",
  "/maintenance-planner",
  "/surface-assessment",
  "/bim-ifc-import",
  "/paint-comparison",
];

function shouldShow(pathname: string): boolean {
  if (pathname === "/") return true;
  return CALCULATOR_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
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
      /* storage unavailable — just show the banner */
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
      /* ignore — in-memory dismissal still applies this visit */
    }
  };

  return (
    <aside
      aria-label="Give feedback on FRELUX"
      className="fixed bottom-4 right-4 z-40 hidden sm:block"
    >
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 pr-2 shadow-md">
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
            Suggest a feature or report an issue.
          </p>
          <Link
            to="/feedback"
            className="mt-1.5 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
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
