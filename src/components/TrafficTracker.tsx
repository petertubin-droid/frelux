import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/traffic";

/**
 * Records one first-party page view per route change. Renders nothing.
 * Mounted inside the router so it can see navigation.
 *
 * Nothing is recorded until the visitor grants the analytics category, so
 * accepting the banner mid-session records the page they are on right away.
 */
export default function TrafficTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    void trackPageView(pathname);

    function onConsent() {
      void trackPageView(pathname);
    }
    window.addEventListener("frelux:cookie-consent", onConsent);
    return () => window.removeEventListener("frelux:cookie-consent", onConsent);
  }, [pathname]);

  return null;
}
