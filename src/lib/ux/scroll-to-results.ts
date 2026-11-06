/**
 * Where the results of a calculation begin, and how to get the reader there.
 *
 * Every calculator on the site places its answers to the right of, or below,
 * the inputs. On a phone that means the answer is off screen when the button is
 * pressed, so the reader sees nothing happen and presses again. This module owns
 * the one rule for that jump: land on the first line of the result, not on the
 * middle of it, and clear the floating header rather than tucking the heading
 * underneath it.
 *
 * Kept out of the components so the arithmetic can be tested without a browser.
 */

/**
 * Height reserved for the floating header, in pixels. The header is transparent
 * until the page scrolls and then gains a glass panel, so a scroll that lands at
 * the exact top of the element hides the first line behind it.
 */
export const RESULTS_SCROLL_OFFSET_PX = 88;

export interface ScrollToResultsOptions {
  /** Pixels to leave above the element. Defaults to the header allowance. */
  offset?: number;
  /** Scroll behaviour. Defaults to smooth unless the reader asked for less motion. */
  behavior?: ScrollBehavior;
}

/**
 * The scroll position that puts `element` at the top of the viewport with the
 * header allowance above it. Never negative: the browser clamps at zero anyway
 * but the returned number is what the tests assert on.
 */
export function resultsScrollTop(
  elementTop: number,
  currentScrollY: number,
  offset: number = RESULTS_SCROLL_OFFSET_PX,
): number {
  if (!Number.isFinite(elementTop) || !Number.isFinite(currentScrollY))
    return 0;
  return Math.max(0, Math.round(elementTop + currentScrollY - offset));
}

/** True when the reader has asked the operating system for less animation. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scroll the first line of a result into view.
 *
 * Returns false when there is nothing to scroll to, so a caller can tell the
 * difference between "the page moved" and "there was no result yet" instead of
 * pretending the jump happened.
 */
export function scrollToResults(
  element: HTMLElement | null | undefined,
  options: ScrollToResultsOptions = {},
): boolean {
  if (!element) return false;
  if (typeof window === "undefined") return false;

  const rect = element.getBoundingClientRect();
  const top = resultsScrollTop(
    rect.top,
    window.scrollY ?? window.pageYOffset ?? 0,
    options.offset,
  );
  const behavior =
    options.behavior ?? (prefersReducedMotion() ? "auto" : "smooth");

  if (typeof window.scrollTo === "function") {
    window.scrollTo({ top, behavior });
    return true;
  }
  return false;
}
