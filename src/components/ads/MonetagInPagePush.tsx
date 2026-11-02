import { useEffect, useState } from "react";
import { canServeProviderAds, onConsentChange } from "@/lib/ad-consent";
import {
  fetchAdConfig,
  getPlacement,
  shouldDisplayPlacement,
} from "@/lib/ad-config";
import { MONETAG_TAG_URL, MONETAG_TAG_DOMAIN } from "@/lib/ad-network-formats";
import { getMonetagPushZone } from "@/lib/monetag-rewarded";
import { shouldLoadAdSdks } from "@/lib/network";
import { adsAllowedForViewer } from "@/lib/ad-entitlement";
import { useAuth } from "@/lib/auth";
import type { DbAdProvider } from "@/types/database";

/**
 * Monetag in-page push, mounted once for the whole app (owner directive
 * 2026-10-29: push active sitewide, but no page may exceed its ad budget).
 *
 * Why it lives here instead of in a slot: push is an overlay format, not an
 * in-content unit. Rendering it globally keeps every page at its two-unit
 * ceiling while push still reaches the whole site.
 *
 * Gated exactly like every other unit: a real zone must be configured, the
 * "calculator_push" placement must be active in Admin -> Ads, the visitor
 * must not be a paid subscriber, the visitor must have answered the cookie
 * banner with advertising consent, and the network must not be in
 * Save-Data/slow mode. Once per browser session.
 */
const SESSION_KEY = "frelux_monetag_push_shown";

export function MonetagInPagePush() {
  const { isPaid, loading: authLoading } = useAuth();
  const [provider, setProvider] = useState<DbAdProvider | null>(null);
  const [enabled, setEnabled] = useState(false);

  // Resolve config + consent; re-run when the visitor changes their choice.
  useEffect(() => {
    let cancelled = false;

    const resolve = () => {
      if (cancelled) return;
      // Paid subscribers never receive push, and an unresolved entitlement
      // must not be read as "free" (see ad-entitlement.ts).
      if (!adsAllowedForViewer({ isPaid, loading: authLoading })) {
        setEnabled(false);
        setProvider(null);
        return;
      }
      if (!shouldLoadAdSdks() || !canServeProviderAds("monetag")) {
        setEnabled(false);
        return;
      }
      fetchAdConfig()
        .then(({ providers, placements }) => {
          if (cancelled) return;
          const placement = getPlacement("calculator_push", placements);
          const monetag = providers.find((p) => p.slug === "monetag") ?? null;
          const allowed = Boolean(
            placement && shouldDisplayPlacement(placement) && monetag,
          );
          setProvider(monetag);
          setEnabled(allowed);
        })
        .catch(() => {
          if (!cancelled) setEnabled(false);
        });
    };

    resolve();
    const off = onConsentChange(resolve);
    return () => {
      cancelled = true;
      off();
    };
  }, [isPaid, authLoading]);

  useEffect(() => {
    if (!enabled || !provider) return;
    const zone = getMonetagPushZone(provider);
    if (!zone) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // Private mode with storage blocked: still show once per page view.
    }
    if (document.querySelector("script[data-frelux-monetag-push]")) return;

    const s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-zone", zone);
    s.setAttribute("data-domain", MONETAG_TAG_DOMAIN);
    s.setAttribute("data-frelux-monetag-push", zone);
    s.src = MONETAG_TAG_URL;
    document.head.appendChild(s);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }, [enabled, provider]);

  return null;
}

export default MonetagInPagePush;
