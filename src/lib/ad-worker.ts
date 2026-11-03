/**
 * Keeps the ad network's push worker in line with the viewer's entitlement.
 *
 * The worker is a separate script with its own lifetime: once a browser
 * registers it, it keeps running (and keeps receiving the network's pushes)
 * whether or not the page that registered it is still open, and whatever the
 * visitor's plan says. That makes it the one ad surface a page cannot switch
 * off by not rendering a tag.
 *
 * So it is enforced instead. A paid subscriber, or anyone whose entitlement is
 * still unresolved, has the worker unregistered. A free visitor with
 * advertising consent keeps it, because the network's own tag registers it and
 * a push worker that exists for push is not our script to install.
 *
 * Only the push worker is touched. The app's own workers are never affected.
 */

/** Path of the ad network push worker currently issued to this zone. */
export const AD_PUSH_WORKER_PATH = "/sw4.js";

/**
 * Paths of superseded ad network workers. Browsers keep these alive long after
 * the network replaces them, so they are removed wherever they are found.
 */
export const STALE_AD_WORKER_PATHS: readonly string[] = [
  "/sw1.js",
  "/sw2.js",
  "/sw3.js",
];

export interface AdWorkerOptions {
  /** May this viewer receive advertising at all (entitlement + consent)? */
  adsAllowed: boolean;
}

function pathOf(scriptURL: string): string | null {
  try {
    return new URL(scriptURL, "https://placeholder.invalid").pathname;
  } catch {
    return null;
  }
}

/**
 * Unregister the ad push worker when the viewer may not see ads, and clear any
 * superseded worker either way. Returns the number of registrations removed.
 *
 * Safe to call repeatedly and on every entitlement change; it only acts when a
 * registration exists. Resolves to 0 in an environment without workers.
 */
export async function syncAdPushWorker({
  adsAllowed,
}: AdWorkerOptions): Promise<number> {
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

    const isLiveAdWorker = path === AD_PUSH_WORKER_PATH && adsAllowed;
    if (isLiveAdWorker) continue;

    if (path === AD_PUSH_WORKER_PATH || STALE_AD_WORKER_PATHS.includes(path)) {
      try {
        const unregistered = await registration.unregister();
        if (unregistered) removed += 1;
      } catch {
        // Detached or already gone; nothing to report.
      }
    }
  }
  return removed;
}
