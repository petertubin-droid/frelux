import { useMemo } from "react";
import { Activity } from "lucide-react";
import {
  AD_GATE_LABELS,
  readAdGate,
  readLastAdGate,
  type AdGateReason,
} from "@/lib/ad-gate";
import { hasAdvertisingConsent, hasAnyConsentChoice } from "@/lib/ad-consent";

/**
 * Live answer to "why is there no ad on the site?".
 *
 * Admin routes never load ad SDKs, so the reason that matters is the one the
 * last public page recorded. This shows that record next to the consent state
 * and whether the AdSense library actually reached the document.
 */

function tone(reason: AdGateReason): string {
  if (reason === "injected") return "bg-emerald-500/10 text-emerald-700";
  if (reason === "no-consent") return "bg-amber-500/10 text-amber-700";
  return "bg-destructive/10 text-destructive";
}

function ago(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}

export default function AdGateReadout() {
  const last = useMemo(() => readLastAdGate(), []);
  const here = useMemo(() => readAdGate(), []);
  const libraryLoaded = useMemo(
    () =>
      typeof document !== "undefined" &&
      Boolean(document.querySelector('script[src*="adsbygoogle.js"]')),
    [],
  );
  const consentChoice = useMemo(() => hasAnyConsentChoice(), []);
  const adConsent = useMemo(() => hasAdvertisingConsent(), []);

  const shown = last?.reason ?? here;

  return (
    <section
      aria-label="Live ad gate"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Activity className="h-3 w-3" aria-hidden="true" />
            Live ad gate
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {AD_GATE_LABELS[shown]}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {last
              ? `${last.path || "public page"} · ${ago(last.at)}`
              : "This browser has not loaded a public page yet, so this is the admin route result."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone(shown)}`}
        >
          {shown.replace(/-/g, " ")}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Cookie choice</dt>
          <dd className="font-semibold text-foreground">
            {consentChoice ? "answered" : "unanswered"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Advertising consent</dt>
          <dd className="font-semibold text-foreground">
            {adConsent ? "granted" : "not granted"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">AdSense library</dt>
          <dd className="font-semibold text-foreground">
            {libraryLoaded ? "on the page" : "not on the page"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Open a public page on this device, then come back: the reason recorded
        there is the one shown here. Visitors who answer the banner are served
        after the next page load.
      </p>
    </section>
  );
}
