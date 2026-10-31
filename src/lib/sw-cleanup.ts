/**
 * Which service workers this app keeps registered.
 *
 * Browsers keep third-party workers alive long after the code that registered
 * them is gone, and a stale worker can keep serving pop-ads or an old ad zone
 * on a device that has moved on. The app therefore reaps workers it no longer
 * wants on load, but it must not reap the two it does want.
 */

/**
 * Workers the site hosts and intends to keep:
 *  - `/sw.js`       our own Workbox precache worker, built from sw-template.js
 *  - `/sw-push.js`  our own notification worker
 *  - `/sw4.js`      the ad network's push worker. Whether a viewer should be
 *                   running it depends on their plan, so the load-time sweep
 *                   leaves it to the entitlement gate (lib/ad-worker.ts), which
 *                   unregisters it for paid and unresolved viewers.
 *
 * A replacement ad worker is added here and its superseded path is dropped in
 * lib/ad-worker.ts, so the next load clears the old one on every device.
 */
export const KEPT_WORKER_PATHS: readonly string[] = [
  "/sw.js",
  "/sw-push.js",
  "/sw4.js",
];

/**
 * True when a registration should be unregistered on load.
 *
 * Foreign origins are always reaped: their script cannot be inspected or
 * trusted, and a worker from another origin is never ours to run. Same-origin
 * workers are reaped unless their path is one we host on purpose.
 */
export function shouldUnregisterWorker(
  scriptURL: string,
  origin: string,
): boolean {
  let url: URL;
  try {
    url = new URL(scriptURL, origin);
  } catch {
    // Unparseable script URL: nothing safe to keep.
    return true;
  }
  if (url.origin !== origin) return true;
  return !KEPT_WORKER_PATHS.includes(url.pathname);
}

/** Paths of the workers this app keeps, for messaging and tests. */
export function keptWorkerPaths(): string[] {
  return [...KEPT_WORKER_PATHS];
}
