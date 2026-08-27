/**
 * Ad Block Detection Utility (Issue #10)
 *
 * Uses the bait element technique: creates a hidden element that looks like
 * an ad to common ad blockers. If the element is hidden or removed by an
 * ad blocker, we detect it. This signal is reliable because ad blockers
 * apply their CSS hiding rules synchronously/very early — a short wait is
 * enough for them to act.
 *
 * The AdSense script-load check is intentionally conservative: it only
 * counts as a "blocked" signal when the script tag is missing outright or
 * its network request actually failed (onerror) — never from
 * `window.adsbygoogle` being merely "not yet initialized". The old logic
 * checked that global 100ms after mount, which produced a flood of false
 * positives: the script is loaded async and often hasn't finished
 * downloading/executing within 100ms on mobile/slower connections, making
 * every such visit look like an ad blocker even when none was present.
 */

let detected = false;
let checked = false;
let adsenseScriptFailed = false;
let adsenseListenerAttached = false;

function attachAdsenseFailureListener(): void {
  if (adsenseListenerAttached) return;
  const script = document.querySelector<HTMLScriptElement>(
    'script[src*="adsbygoogle.js"]',
  );
  if (!script) return;
  adsenseListenerAttached = true;
  script.addEventListener("error", () => {
    adsenseScriptFailed = true;
  });
}

export async function detectAdBlocker(): Promise<boolean> {
  if (checked) return detected;

  attachAdsenseFailureListener();

  // Create a bait element that ad blockers typically target
  const bait = document.createElement("div");
  bait.className = "adsbox ad ads adsbygoogle ad-placement";
  bait.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
  bait.innerHTML = "&nbsp;";
  document.body.appendChild(bait);

  // Wait a tick for ad blockers to act (CSS-based hiding is applied
  // synchronously/very early, so 100ms is plenty for this signal).
  await new Promise((r) => setTimeout(r, 100));

  const baitBlocked =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    bait.clientHeight === 0 ||
    bait.offsetWidth === 0 ||
    window.getComputedStyle(bait).display === "none" ||
    window.getComputedStyle(bait).visibility === "hidden";

  document.body.removeChild(bait);

  const adsenseScript = document.querySelector('script[src*="adsbygoogle.js"]');
  // Only treat AdSense as "blocked" when the script tag is missing entirely
  // or its request actually failed — not from a timing race on an async
  // network load.
  const adsenseBlocked = !adsenseScript || adsenseScriptFailed;

  detected = baitBlocked || adsenseBlocked;
  checked = true;
  return detected;
}

export function isAdBlockerDetected(): boolean {
  return detected;
}

export function resetAdBlockDetection(): void {
  detected = false;
  checked = false;
  adsenseScriptFailed = false;
  adsenseListenerAttached = false;
}
