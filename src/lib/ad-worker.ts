/**
 * Reaps the ad network's retired push workers.
 *
 * A push worker is a separate script with its own lifetime. Once a browser
 * registers one it keeps running, and keeps receiving the network's pushes,
 * long after the page that registered it has gone. The workers FRELUX used to
 * carry were issued for the previous site address and an old zone, so they must
 * go: they serve nothing here and their pushes point at a domain we no longer
 * run.
 *
 * Reaping only touches those known paths. The app's own workers (`/sw.js` and
 * `/sw-push.js`) are never affected.
 */

/**
 * Push worker paths issued by the ad network under the old site address.
 * Every one of them is retired; a browser that still holds one has it removed
 * on the next load.
 */
export const RETIRED_AD_WORKER_PATHS: readonly string[] = [
  "/sw1.js",
  "/sw2.js",
  "/sw3.js",
  "/sw4.js",
];

function pathOf(scriptURL: string): string | null {
  try {
    return new URL(scriptURL, "https://placeholder.invalid").pathname;
  } catch {
    return null;
  }
}

/**
 * Unregister every retired ad push worker found in this browser.
 *
 * Safe to call repeatedly and on every load: it only acts when a registration
 * exists. Resolves to the number of registrations removed, and 0 in an
 * environment without service workers.
 */
export async function syncAdPushWorker(): Promise<number> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return 0;
  }

  let registrations: readonly ServiceWorkerRegistration[];
  try {
    registrations = await navigator.serviceWorker.getRegistrations();
  } catch {
    return 0;
  }

  let removed = 0;
  for (const registration of registrations) {
    const scriptURL =
      registration.active?.scriptURL ??
      registration.installing?.scriptURL ??
      registration.waiting?.scriptURL ??
      "";
    const path = pathOf(scriptURL);
    if (!path) continue;
    if (!RETIRED_AD_WORKER_PATHS.includes(path)) continue;

    try {
      const unregistered = await registration.unregister();
      if (unregistered) removed += 1;
    } catch {
      // Detached or already gone; nothing to report.
    }
  }
  return removed;
}
