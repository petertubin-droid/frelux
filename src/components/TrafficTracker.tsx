import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/traffic";

/**
 * Records one first-party page view per route change. Renders nothing.
 * Mounted inside the router so it can see navigation.
 */
export default function TrafficTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    void trackPageView(pathname);
  }, [pathname]);

  return null;
}
