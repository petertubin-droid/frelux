/** Shared page-level scroll helpers for navigation and long-page reading. */

export interface ScrollToTopOptions {
  behavior?: ScrollBehavior;
}

/** Respect the visitor's reduced-motion preference when moving to page top. */
export function prefersReducedMotionForScroll(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Smoothly return the document to its top, unless reduced motion is requested. */
export function scrollToPageTop(options: ScrollToTopOptions = {}): boolean {
  if (typeof window === "undefined" || typeof window.scrollTo !== "function") {
    return false;
  }
  window.scrollTo({
    top: 0,
    behavior:
      options.behavior ?? (prefersReducedMotionForScroll() ? "auto" : "smooth"),
  });
  return true;
}

/**
 * Whether a button/link label represents a forward step in a tool workflow.
 * Kept intentionally narrow so unrelated controls like pagination do not
 * trigger a scroll.
 */
export function isForwardStepLabel(label: string): boolean {
  const normalized = label.replace(/\s+/g, " ").trim().toLowerCase();
  // Common forward-step words across the app's supported UI languages.
  return /^(next|continue|siguiente|continuar|próximo|proximo|suivant|continuer|weiter|fortfahren|weitergehen|seguinte|continuar|avançar|avancar|التالي|تابع|अगला|आगे|继续|下一步|次へ)(?:\b|$)/i.test(
    normalized,
  );
}
