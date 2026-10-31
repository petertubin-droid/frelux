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
 *  - `/sw.js`   our own Workbox precache worker, built from sw-template.js
 *  - `/sw4.js`  the ad network's push worker currently issued to this zone
 *
 * A replacement worker from the network is added here and the superseded path
 * is dropped, so the next load unregisters the old one on every device.
 */
export const KEPT_WORKER_PATHS: readonly string[] = ["/sw.js", "/sw4.js"];

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
