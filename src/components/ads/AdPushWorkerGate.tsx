import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { adsAllowedForViewer } from "@/lib/ad-entitlement";
import { canServeProviderAds, onConsentChange } from "@/lib/ad-consent";
import { syncAdPushWorker } from "@/lib/ad-worker";

/**
 * Holds the ad network's push worker to the same promise as every other ad
 * surface: no worker for a paid subscriber, and none while entitlement is still
 * unresolved.
 *
 * Rendered once for the whole app and renders nothing. The worker outlives the
 * page, so this has to run whenever the viewer's entitlement or consent
 * changes, not only at the moment the network's tag registers it.
 */
export function AdPushWorkerGate() {
  const { isPaid, loading } = useAuth();
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => onConsentChange(() => setConsentVersion((v) => v + 1)), []);

  useEffect(() => {
    // Unresolved entitlement is not "free": wait for a real answer rather than
    // tearing down a worker a free visitor is entitled to keep.
    if (loading) return;
    const adsAllowed =
      adsAllowedForViewer({ isPaid, loading }) &&
      canServeProviderAds("monetag");
    void syncAdPushWorker({ adsAllowed });
  }, [isPaid, loading, consentVersion]);

  return null;
}
