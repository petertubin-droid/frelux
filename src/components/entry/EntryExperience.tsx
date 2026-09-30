import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// FRELUX Entry Experience — a premium construction-technology welcome
// shown exactly once, on the very first page load of the homepage.
//
// Design notes:
// - Pure presentation layer: it renders ON TOP of the fully-mounted
//   homepage (no routing, no redirects, no content gating), so crawlers,
//   deep links and returning visitors are completely unaffected. The
//   prerendered static HTML never contains this overlay (it is
//   client-side only), and the homepage DOM stays fully present beneath.
// - First visit: staged rise-in of background, logo, wordmark, headline,
//   supporting text, then the CTA last.
// - Returning visit / reload / deep link: the parent never mounts this
//   component, so the app is immediate.
// - No new dependencies: CSS animations + lucide icon already in the app.
// - The background image is the only non-essential asset and is loaded
//   by this overlay alone; the design holds without it (gradient + grid
//   paint instantly, the photo fades in whenever it arrives).

const STORAGE_KEY = "frelux_entry_seen_v1";

/** Has this visitor already entered the site? (localStorage, no personal data) */
export function hasEnteredBefore(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch (_) {
    // Storage unavailable (private mode etc.) — never trap the visitor.
    return true;
  }
}

/** Remember the visit locally so the entry never blocks again. */
export function markEntered(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch (_) {
    /* best effort only */
  }
}

interface EntryExperienceProps {
  /** Called after the exit transition finishes; the parent unmounts us. */
  onComplete: () => void;
}

export default function EntryExperience({ onComplete }: EntryExperienceProps) {
  const [leaving, setLeaving] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const completedRef = useRef(false);

  // Staggered rise-in helper: every element fades+rises once, holding its
  // pre-animation (invisible) state until its delay elapses ("both" fill).
  const rise = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
  });

  const enter = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markEntered();
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      reduced = false;
    }
    setLeaving(true);
    window.setTimeout(onComplete, reduced ? 0 : 460);
  }, [onComplete]);

  // Keyboard: Escape enters too. Focus the CTA shortly after mount so
  // keyboard users can enter with a single Enter press.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(
      () => ctaRef.current?.focus({ preventScroll: true }),
      900,
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [enter]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to FRELUX"
      className={`fixed inset-0 z-[9999] select-none overflow-hidden bg-[#0A0A1A] ${leaving ? "entry-leave" : ""}`}
      data-testid="entry-experience"
    >
      {/* Background: gradient + technical grid paint instantly, the
          architectural image fades in when it loads (never blocks). */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Deep navy base with subtle vertical depth */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0A0A1A_0%,#0D0D22_48%,#0A0A1A_100%)]" />

        {/* Architectural image — quiet, right-weighted on wide screens */}
        <img
          src="/assets/entry/entry-bg.jpg"
          alt=""
          onLoad={() => setBgReady(true)}
          onError={() => setBgReady(true)}
          className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-1000 ease-out ${
            bgReady ? "opacity-55" : ""
          }`}
        />

        {/* Technical blueprint grid — thin architectural line detail */}
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(109,40,217,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Soft fade of the grid toward the top so it reads as depth, not clutter */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,26,0.9)_0%,rgba(10,10,26,0.15)_40%,rgba(10,10,26,0.75)_100%)]" />

        {/* Brand glows: violet from the top, warm orange near the base */}
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-violet-700/20 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -bottom-28 right-1/5 h-72 w-72 rounded-full bg-orange-600/12 blur-3xl sm:h-96 sm:w-96" />

        {/* Bottom scrim keeps the tag line crisp over the image */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,rgba(10,10,26,0)_0%,rgba(10,10,26,0.92)_100%)]" />
      </div>

      {/* Content */}
      <main
        className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto px-6 text-center"
        style={{
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(4.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex flex-col items-center">
          {/* Logo mark — the existing FRELUX brand asset */}
          <div className="entry-rise" style={rise(120)}>
            <img
              src="/logo-mark.png"
              alt="FRELUX"
              width={64}
              height={64}
              className="h-14 w-14 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/15 shadow-[0_10px_40px_-12px_rgba(109,40,217,0.55)] sm:h-16 sm:w-16"
            />
          </div>

          {/* Wordmark — engineering-grade letter spacing */}
          <p
            className="entry-rise mt-5 font-display text-[26px] font-bold tracking-[0.32em] text-white sm:text-[32px]"
            style={rise(260)}
          >
            FRELUX
          </p>

          {/* Headline — split coloring: the craft in white, the outcome in
              the brand's violet-to-orange gradient. */}
          <h1
            className="entry-rise mt-6 font-display text-[30px] font-semibold leading-[1.12] text-balance sm:mt-8 sm:text-5xl sm:leading-[1.1] lg:text-[56px]"
            style={rise(420)}
          >
            <span className="text-white">Smarter Construction.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              More Accurate Decisions.
            </span>
          </h1>

          {/* Supporting text */}
          <p
            className="entry-rise mt-5 max-w-xl text-[15px] leading-relaxed text-slate-300/90 text-pretty sm:mt-6 sm:text-lg"
            style={rise(580)}
          >
            Tools, intelligence and practical technology designed to help you
            plan, calculate and build with greater confidence.
          </p>

          {/* CTA — premium gradient pill with directional motion */}
          <button
            ref={ctaRef}
            type="button"
            onClick={enter}
            data-testid="entry-cta"
            className="entry-rise group mt-9 inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-9 py-4 text-base font-semibold text-white shadow-[0_14px_44px_-12px_rgba(124,58,237,0.75)] ring-1 ring-white/10 transition-all duration-300 ease-out hover:from-violet-500 hover:to-orange-400 hover:shadow-[0_18px_54px_-12px_rgba(249,115,22,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A1A] active:scale-[0.98] sm:mt-11 sm:px-11"
            style={rise(760)}
          >
            Explore FRELUX
            <ArrowRight
              className="h-5 w-5 transition-transform duration-300 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>

          <span className="sr-only" style={rise(760)}>
            Press Enter or select the button to continue to the FRELUX homepage.
          </span>
        </div>
      </main>

      {/* Secondary brand signal — subtle, near the base, safe-area aware */}
      <footer
        className="entry-rise pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-6 pb-4 text-center"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          animationDelay: "900ms",
        }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400/80 sm:text-xs">
          Construction intelligence, built for real projects.
        </p>
      </footer>
    </div>
  );
}
