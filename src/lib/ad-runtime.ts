/**
 * The advertising runtime, loaded on demand.
 *
 * Format helpers and the ad diagnostics helper are only needed once a tag is
 * actually being injected, and every one of those calls happens inside an
 * effect, after the first screen is already painted. Imported statically from
 * the layout, they were two of the requests a visitor paid for before
 * hydration; loaded here, they arrive with the ad they describe.
 *
 * The promise is cached so repeated calls share one download, and a failure is
 * retried on the next call rather than cached forever.
 */
type AdRuntime = {
  formats: typeof import("./ad-network-formats");
  diagnostics: typeof import("./ad-diagnostics");
};

let pending: Promise<AdRuntime> | null = null;

export function loadAdRuntime(): Promise<AdRuntime> {
  if (!pending) {
    pending = Promise.all([
      import("./ad-network-formats"),
      import("./ad-diagnostics"),
    ])
      .then(([formats, diagnostics]) => ({ formats, diagnostics }))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
