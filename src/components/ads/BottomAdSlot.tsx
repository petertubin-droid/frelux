import { useEffect, useRef } from "react";
import AdSlot from "@/components/ui/AdSlot";

/**
 * The ad that sits under the bottom navigation.
 *
 * Two things make a fixed bottom ad safe to ship:
 *
 * 1. It only exists while a real ad is on screen. The wrapper measures the slot
 *    after AdSense answers and publishes its height as `--frelux-bottom-ad-h`.
 *    The bottom navigation reads that variable, so it lifts by exactly the ad's
 *    height while the ad is showing and returns to its original place the
 *    moment the slot is unfilled or hidden. Nothing jumps: the height is
 *    written from the rendered element, not from a guessed banner size.
 *
 * 2. It never covers content. Layout reserves the same height at the end of
 *    <main>, so the last line of a long calculator can still be scrolled above
 *    the ad.
 *
 * Mobile only, deliberately: the bottom navigation is the only thing pinned to
 * the bottom of the viewport, and a fixed bar under a desktop page would sit on
 * top of the footer rather than beside it. Desktop keeps the in-article and
 * footer placements.
 *
 * AdSense only: this slot is locked to Google by slug, so a fallback network can
 * never take the position under the navigation, where a low-quality creative is
 * most likely to be mistaken for part of the site.
 */

/** Height of the rendered bottom ad, read by the bottom navigation. */
export const BOTTOM_AD_HEIGHT_VAR = "--frelux-bottom-ad-h";

interface BottomAdSlotProps {
  /** Placement key. Defaults to the AdSense-only bottom placement. */
  slotKey?: string;
  className?: string;
}

export default function BottomAdSlot({
  slotKey = "adsense_bottom",
}: BottomAdSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    const root = document.documentElement;

    const sync = () => {
      // AdSlot marks a filled unit with data-ad-filled, and hides an unfilled
      // AdSense unit with display:none. A unit that is not laid out contributes
      // nothing, so the navigation keeps its default offset.
      const unit = host.querySelector<HTMLElement>('[data-ad-filled="true"]');
      // A hidden unit has no box, so its height is the whole test: no separate
      // visibility flag to keep in step with AdSlot's own display rules.
      const unitHeight = unit ? unit.getBoundingClientRect().height : 0;
      const height =
        unitHeight > 0 ? Math.ceil(host.getBoundingClientRect().height) : 0;
      root.style.setProperty(BOTTOM_AD_HEIGHT_VAR, `${height}px`);
      host.dataset.adVisible = height > 0 ? "true" : "false";
    };

    sync();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    resizeObserver?.observe(host);

    // A network can fill the slot seconds after mount, swap a creative, or
    // collapse it. Watching the subtree catches all three.
    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(sync)
        : null;
    mutationObserver?.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-ad-filled", "data-ad-status", "style", "class"],
    });

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.removeProperty(BOTTOM_AD_HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="bottom-ad-slot"
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] md:hidden"
      aria-label="Advertisement"
    >
      <div className="mx-auto w-full max-w-[520px]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md">
          <AdSlot
            slotKey={slotKey}
            providerSlug="google_adsense"
            className="px-1 pt-0.5"
          />
        </div>
      </div>
    </div>
  );
}
