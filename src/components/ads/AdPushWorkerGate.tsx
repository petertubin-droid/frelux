import { useEffect } from "react";
import { syncAdPushWorker } from "@/lib/ad-worker";

/**
 * Clears the ad network's retired push workers once per load.
 *
 * Rendered once for the whole app and renders nothing. The old workers were
 * issued for the previous site address, so they are removed wherever a browser
 * still holds them; nothing about the viewer's plan is involved any more.
 */
export function AdPushWorkerGate() {
  useEffect(() => {
    void syncAdPushWorker();
  }, []);

  return null;
}
