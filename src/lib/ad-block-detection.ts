/**
 * Ad Block Detection Utility (Issue #10)
 * 
 * Uses the bait element technique: creates a hidden element that looks like
 * an ad to common ad blockers. If the element is hidden or removed by an
 * ad blocker, we detect it.
 */

let detected = false;
let checked = false;

export async function detectAdBlocker(): Promise<boolean> {
  if (checked) return detected;

  // Create a bait element that ad blockers typically target
  const bait = document.createElement('div');
  bait.className = 'adsbox ad ads adsbygoogle ad-placement';
  bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
  bait.innerHTML = '&nbsp;';
  document.body.appendChild(bait);

  // Also check if AdSense script was blocked
  const adsenseScript = document.querySelector('script[src*="adsbygoogle.js"]');

  // Wait a tick for ad blockers to act
  await new Promise((r) => setTimeout(r, 100));

  const baitBlocked =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    bait.offsetLeft === 0 ||
    bait.offsetTop === 0 ||
    bait.clientHeight === 0 ||
    bait.offsetWidth === 0 ||
    window.getComputedStyle(bait).display === 'none' ||
    window.getComputedStyle(bait).visibility === 'hidden';

  // Check if adsbygoogle object exists (set by the AdSense script)
  const adsenseBlocked = adsenseScript && !(window as Record<string, unknown>).adsbygoogle;

  document.body.removeChild(bait);

  detected = baitBlocked || !!adsenseBlocked;
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
