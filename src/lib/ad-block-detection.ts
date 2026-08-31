/**
 * Ad Block Detection Utility (Issue #10)
 *
 * Uses the bait element technique: creates a hidden element that looks like
 * an ad to common ad blockers. If the element is hidden or removed by an
 * ad blocker, we detect it.
 *
 * Mobile fix: The old code checked `offsetParent === null` and
 * `offsetHeight === 0` on a `position:absolute;left:-9999px` element.
 * On mobile browsers, elements positioned off-screen can have
 * `offsetParent === null` and zero dimensions WITHOUT an ad blocker,
 * causing false positives. Now we rely solely on computed style
 * (`display:none` or `visibility:hidden`) which is the actual signal
 * ad blockers produce via CSS filter rules.
 */

let detected = false;
let checked = false;

export async function detectAdBlocker(): Promise<boolean> {
  if (checked) return detected;

  // Create a bait element that ad blockers typically target.
  // Use position:fixed (not absolute) with visible coordinates so the
  // element has a proper layout box — ad blockers hide it via CSS rules
  // that set display:none or visibility:hidden, which we can detect
  // reliably via getComputedStyle on any device.
  const bait = document.createElement("div");
  bait.className = "adsbox ad ads adsbygoogle ad-placement";
  bait.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;";
  bait.innerHTML = "&nbsp;";
  document.body.appendChild(bait);

  // Wait a tick for ad blockers to act (CSS-based hiding is applied
  // synchronously/very early, so 100ms is plenty for this signal).
  await new Promise((r) => setTimeout(r, 100));

  // Only check computed style — this is the actual mechanism ad blockers
  // use (CSS filter rules that set display:none or visibility:hidden).
  // Avoid offsetParent/offsetHeight checks which are unreliable on mobile
  // for off-screen or fixed-position elements.
  const computedStyle = window.getComputedStyle(bait);
  const baitBlocked =
    computedStyle.display === "none" || computedStyle.visibility === "hidden";

  document.body.removeChild(bait);

  // NOTE: We intentionally do NOT check for the AdSense script here.
  // AdSense is loaded dynamically by AnalyticsScripts AFTER hydration
  // (it fetches the publisher ID from Supabase first), so the script tag
  // is almost never in the DOM when this detection runs. Treating a missing
  // AdSense script as "ad blocker" would cause false-positive banners for
  // every user. The bait element check above is the reliable signal.

  detected = baitBlocked;
  checked = true;
  return detected;
}

export function isAdBlockerDetected(): boolean {
  return detected;
}

export function resetAdBlockDetection(): void {
  detected = false;
  checked = false;
}
