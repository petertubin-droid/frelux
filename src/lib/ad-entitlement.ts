/**
 * Who may receive advertising.
 *
 * A paid subscriber sees no ads of any kind: no in-content unit, no site-wide
 * SDK, no popunder or on-click redirect format, no in-page push, no native
 * banner. That is the promise the plan is sold on, so it is decided in one
 * place and every ad surface asks here before it fetches config or injects a
 * tag.
 *
 * The subtle case is timing. Paid status is resolved asynchronously once the
 * session restores, so for the first few hundred milliseconds of a logged-in
 * page load `isPaid` is still false. Reading that as "free" is exactly how a
 * subscriber ends up with a Monetag popunder: the SDK is injected during the
 * gap and its script keeps hijacking clicks for the rest of the session.
 * "Not known yet" therefore means "no ads", never "free".
 */

export interface AdEntitlement {
  /** True when the signed-in viewer holds an active paid plan. */
  isPaid: boolean;
  /** True while the auth/entitlement state is still being resolved. */
  loading: boolean;
}

/**
 * Decide whether this viewer may receive any advertising at all.
 * Paid subscribers and unresolved entitlement both return false.
 */
export function adsAllowedForViewer({
  isPaid,
  loading,
}: AdEntitlement): boolean {
  if (loading) return false;
  return !isPaid;
}

/**
 * Markers every site-wide ad tag carries. Used to remove tags that were
 * injected before the viewer's paid status was known (or before they upgraded
 * in another tab and the entitlement refreshed).
 */
export const INJECTED_AD_TAG_SELECTORS = [
  'script[data-adsense-page-level="true"]',
  "script[data-adsterra-format]",
  'script[data-adsterra-native="true"]',
  "script[data-monetag-auto]",
  'script[data-monetag-sdk="true"]',
  "script[data-frelux-monetag-push]",
] as const;

/**
 * Remove every ad tag this app injects. Best effort by nature: a network SDK
 * that has already executed cannot be fully unloaded, but removing the tag
 * stops it loading again and clears the DOM evidence for the next gate check.
 * Returns the number of tags removed.
 */
export function purgeInjectedAdTags(doc?: Document): number {
  const target = doc ?? (typeof document === "undefined" ? null : document);
  if (!target) return 0;
  let removed = 0;
  for (const selector of INJECTED_AD_TAG_SELECTORS) {
    for (const el of Array.from(target.querySelectorAll(selector))) {
      el.remove();
      removed += 1;
    }
  }
  return removed;
}

/**
 * Ad containers the page renders for site-wide units. They stay in the DOM
 * after the tag is purged, so they are hidden rather than left as empty boxes.
 */
export function hideAdContainers(doc?: Document): void {
  const target = doc ?? (typeof document === "undefined" ? null : document);
  if (!target) return;
  for (const el of Array.from(
    target.querySelectorAll<HTMLElement>("[data-ad-container]"),
  )) {
    el.style.display = "none";
  }
}
