/**
 * OfflineIndicator (Offline-First Engine 17)
 *
 * A small, honest banner: it appears when the browser reports
 * offline, or when a config fetch fell back to cached data, and
 * it always states WHEN the cached configuration was stored.
 * It never claims data is live when it is not.
 */

import { useEffect, useState } from "react";
import { onOfflineFallback } from "@/lib/estimation/offline-cache";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine === false : false,
  );
  const [fallbackAt, setFallbackAt] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const unsubscribe = onOfflineFallback(({ cached_at }) =>
      setFallbackAt(cached_at),
    );
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      unsubscribe();
    };
  }, []);

  if (!offline && !fallbackAt) return null;

  const cachedDate = fallbackAt
    ? new Date(fallbackAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 shadow-lg backdrop-blur md:bottom-4 dark:text-amber-400"
    >
      {offline && cachedDate
        ? `Offline — using stored configuration from ${cachedDate}`
        : offline
          ? "Offline — calculators use stored configuration where available"
          : `Using stored configuration from ${cachedDate} (connection problem)`}
    </div>
  );
}
