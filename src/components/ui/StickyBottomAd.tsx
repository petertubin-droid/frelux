import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import AdSlot from "@/components/ui/AdSlot";

/**
 * Sticky bottom ad slot.
 *
 * A dismissible, full-width bar pinned to the bottom of the viewport
 * (industry-standard anchor placement). Chrome is only rendered when a
 * REAL ad unit is displayed inside: AdSlot renders nothing while
 * unresolved, a hidden placeholder when nothing can fill, and collapses
 * its wrapper on a network no-fill - the bar follows all of that
 * honestly instead of showing an empty strip.
 *
 * - Dismissal is per browser session (sessionStorage), one click and
 *   the visitor is left alone until the next session.
 * - Consent-gated through AdSlot: nothing renders before the visitor
 *   has answered the cookie banner, and paid subscribers never see it.
 * - Controlled from Admin -> Ads like every other placement
 *   (placement key "sticky_bottom"); deactivate the row to remove it.
 * - Locked to Google AdSense (owner directive 2026-10-27: the sticky bar
 *   is the ONLY bottom-of-page slot and it exists to support the
 *   AdSense approval review - a clean single bottom anchor, real
 *   AdSense units on every route, no other network can claim it).
 */
const DISMISS_KEY = "frelux_sticky_ad_dismissed";

export function StickyBottomAd() {
  const [dismissed, setDismissed] = useState(false);
  const [hasVisibleAd, setHasVisibleAd] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);

  // Never cover the mobile bottom navigation bar (owner directive
  // 2026-10-27): the bar sits directly above it with the nav's real
  // measured height. On desktop the nav is display:none (offsetHeight
  // 0) so the bar stays flush with the viewport bottom.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(
      "nav[aria-label='Bottom navigation']",
    );
    if (!nav) return;
    const update = () => setBottomOffset(nav.offsetHeight);
    update();
    const observer = new MutationObserver(update);
    observer.observe(nav, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // sessionStorage unavailable (private mode): show, dismissal
      // just won't persist.
    }
  }, []);

  // Track whether a real, non-collapsed ad unit is rendered inside.
  // AdSlot swaps between: nothing (unresolved), a hidden placeholder
  // (nothing can fill), the resolved wrapper (which the no-fill logic
  // can collapse to display:none). The bar shows only in the last
  // case with a measurable height.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const wrapper = el.querySelector<HTMLElement>(".frelux-ad-unit");
      if (!wrapper) {
        setHasVisibleAd(false);
        return;
      }
      // The Adsterra/Monetag no-fill logic collapses the wrapper with
      // display:none; anything else is treated as a visible unit.
      // (offsetHeight is unusable here: layout-less environments such
      // as jsdom always report 0.)
      setHasVisibleAd(
        window.getComputedStyle(wrapper).display !== "none" &&
          window.getComputedStyle(wrapper).visibility !== "hidden",
      );
    };
    const observer = new MutationObserver(measure);
    observer.observe(el, { childList: true, subtree: true, attributes: true });
    measure();
    return () => observer.disconnect();
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // private mode, ignore
    }
  };

  if (dismissed) return null;

  // The AdSlot always mounts (the mutation observer measures what it
  // renders); the bar chrome is invisible until a real unit shows up,
  // so the sticky bar never appears as an empty strip.
  return (
    <aside
      role="complementary"
      aria-label="Advertisement"
      aria-hidden={!hasVisibleAd}
      style={hasVisibleAd ? { bottom: bottomOffset } : undefined}
      className={
        hasVisibleAd
          ? "fixed inset-x-0 z-[60] border-t border-border/60 bg-background/95 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85"
          : "hidden"
      }
    >
      <div
        ref={innerRef}
        className="relative mx-auto max-w-5xl px-4 py-1.5 pr-10"
      >
        <button
          onClick={dismiss}
          aria-label="Close ad"
          title="Close ad"
          className="absolute right-1 top-1.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <AdSlot slotKey="sticky_bottom" providerSlug="google_adsense" />
      </div>
    </aside>
  );
}
