import { useEffect, useState, useRef, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchAdConfig,
  getProvidersForPlacement,
  getAdUnitId,
  shouldDisplayPlacement,
  logAdEvent,
} from "@/lib/ad-config";
import { getMonetagDisplayZone } from "@/lib/monetag-rewarded";
import { getSupabase } from "@/lib/supabase-lazy";
import type { DbAdProvider, DbAdPlacement } from "@/types/database";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    _bsa?: { reload: (el: HTMLElement | null) => void };
  }
}

/**
 * Provider-agnostic ad slot. Reads placement + provider config from the database.
 * Supports fallback chains — if the primary provider has no ad unit configured
 * for this placement, the next provider in the chain is tried.
 *
 * Supported providers:
 * - Google AdSense: <ins class="adsbygoogle"> + push()
 * - Google Ad Manager: GPT container
 * - Media.net: <ins class="adsbygoogle" data-ad-client="cid"> (uses adsbygoogle shim)
 * - Adsterra: script-based ad zone
 * - BuySellAds: _bsa container
 * - Taboola: recommendation widget container
 * - Outbrain: OUTBRAIN container
 * - PropellerAds: script-based zone
 * - Rewarded providers (AdGate, OfferToro, etc.): offerwall iframe containers
 *
 * Ads are never fake — nothing is shown until a real provider + ad unit is configured.
 *
 * Every rendered ad is wrapped in an "Advertisement" label container per Google
 * AdSense placement policies (ads must be clearly distinguishable from content).
 * Pass `hideLabel` only when the caller already provides its own label.
 */

interface ResolvedAd {
  provider: DbAdProvider;
  adUnitId: string;
  placement: DbAdPlacement;
}

/**
 * ── Adsterra banner integration ─────────────────────────────────────────
 * Adsterra banner zones serve via their official snippet:
 *   atOptions = { key, format: 'iframe', height, width, params }
 *   <script src="https://<serve-domain>/<key>/invoke.js">
 * Each zone key is size-specific (created in the Adsterra dashboard with a
 * fixed size), so width/height MUST match the zone or the banner renders
 * into blank space. Per-placement overrides come from the Admin "Ad Unit
 * ID" mapping (a size-specific key); the provider `key` credential is the
 * default fallback zone.
 *
 * Banner sizes supported by Adsterra: 160x300, 160x600, 300x250, 320x50,
 * 728x90, 468x60. Placement policy: banners go in standard content
 * positions (in-content, sidebar, top/bottom of page), clearly separated
 * from site content, with reasonable density — we cap at 3 Adsterra
 * banners per page so the page is never overloaded.
 */

/** Adsterra serve domain assigned to the account's banner zones. */
export function getAdsterraServeDomain(provider: DbAdProvider): string {
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const raw =
    typeof creds.serve_domain === "string" ? creds.serve_domain.trim() : "";
  // Only accept a plain hostname — never a full URL or script injection
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)
    ? raw
    : "www.highperformanceformat.com";
}

/** Default Adsterra banner size per placement family (config-driven override
 *  via provider.settings.banner_sizes[slotKey] = "WxH"). */
export function resolveAdsterraSize(
  provider: DbAdProvider,
  slotKey: string,
): { width: number; height: number } {
  const settings = (provider.settings ?? {}) as Record<string, unknown>;
  const custom = (settings.banner_sizes ?? {}) as Record<string, unknown>;
  const raw = typeof custom[slotKey] === "string" ? custom[slotKey] : "";
  const m = raw.match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})$/);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };

  const isMobile = window.innerWidth < 768;
  if (slotKey.endsWith("_sidebar")) return { width: 300, height: 250 };
  if (slotKey.endsWith("_bottom")) {
    return isMobile ? { width: 320, height: 50 } : { width: 728, height: 90 };
  }
  // In-content and every other family: medium rectangle
  return { width: 300, height: 250 };
}

/** Page-session cap: at most 3 Adsterra banners per page (density policy). */
const ADSTERRA_MAX_PER_PAGE = 3;
let adsterraRenderedCount = 0;
let adsterraRenderedPath: string | null = null;

export function adsterraSlotAvailable(): boolean {
  if (adsterraRenderedPath !== window.location.pathname) {
    adsterraRenderedPath = window.location.pathname;
    adsterraRenderedCount = 0;
  }
  return adsterraRenderedCount < ADSTERRA_MAX_PER_PAGE;
}

/** Test-only: reset the per-page Adsterra banner counter. */
export function resetAdsterraPageStateForTests(): void {
  adsterraRenderedCount = 0;
  adsterraRenderedPath = null;
}

/**
 * Render an Adsterra banner into a container. The official snippet is
 * isolated inside a per-slot iframe (srcdoc) so `window.atOptions` — a
 * global that invoke.js reads — can never race between two banners, and
 * invoke.js's document.write lands in the iframe's document instead of
 * the host page. This is the same iframe Adsterra would produce anyway.
 */
export function renderAdsterraBanner(
  container: HTMLElement,
  provider: DbAdProvider,
  opts: { key: string; slotKey: string },
): void {
  const key = opts.key;
  if (!/^[a-f0-9]{20,40}$/i.test(key)) return; // zone keys are hex tokens
  const serveDomain = getAdsterraServeDomain(provider);
  const { width, height } = resolveAdsterraSize(provider, opts.slotKey);
  const params =
    (provider.settings ?? {}) instanceof Object &&
    typeof (provider.settings as Record<string, unknown>).sub_id === "string"
      ? `{ 'sub_id': '${(provider.settings as Record<string, unknown>).sub_id}' }`
      : "{}";

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    "<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>" +
    "</head><body>" +
    '<script type="text/javascript">' +
    `atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : ${params} };` +
    "<\/script>" +
    `<script type="text/javascript" src="https://${serveDomain}/${key}/invoke.js"></` +
    "script></body></html>";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Advertisement");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  iframe.style.cssText = `border:0;display:block;margin:0 auto;max-width:100%;width:${width}px;height:${height}px;`;
  iframe.srcdoc = html;
  try {
    container.appendChild(iframe);
  } catch {
    // Some test environments (happy-dom) throw while wiring srcdoc iframes.
    // The element still lands in the DOM — treat as rendered and move on.
  }
  adsterraRenderedCount++;
}

/**
 * Injector registry — the effect calls through this indirection so tests
 * can stub the real srcdoc injection (happy-dom can't load ad iframes).
 */
export const adsterraInjector = { renderBanner: renderAdsterraBanner };

/**
 * Whether a provider's VISUAL display ads are enabled.
 * Admin toggle (Admin → Ads → "Display ads"): when off, the provider stays
 * active for rewarded flows and its impressions keep being logged, but no
 * ad scripts are injected and nothing is rendered visually. Useful for
 * hiding intrusive display networks (e.g. Monetag) while awaiting
 * AdSense approval without losing the provider configuration.
 * Defaults to enabled — only an explicit `false` in settings disables it.
 */
function isDisplayAdsEnabled(provider: DbAdProvider): boolean {
  return provider.settings?.display_ads_enabled !== false;
}

export default function AdSlot({
  slotKey,
  className,
  format = "auto",
  hideLabel = false,
  providerId,
}: {
  slotKey: string;
  className?: string;
  format?: string;
  /** Skip the built-in "Advertisement" label (caller provides their own). */
  hideLabel?: boolean;
  /** Optional: filter to a specific provider by ID. If omitted, uses the full fallback chain. */
  providerId?: string;
}) {
  const { isPaid } = useAuth();

  const [resolved, setResolved] = useState<ResolvedAd | null | "none">(null);
  const loggedRef = useRef(false);
  const pushRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dedup impressions within the same page session to avoid
  // re-mount double-counting when navigating between pages
  function hasLoggedImpressionThisSession(key: string): boolean {
    try {
      const seen = sessionStorage.getItem("frelux_ad_impression_" + key);
      if (seen) return true;
      sessionStorage.setItem("frelux_ad_impression_" + key, "1");
      return false;
    } catch {
      return false; // sessionStorage may be unavailable (private mode)
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Paid subscribers never see ads — resolve to "none" without fetching
    // config or logging impressions.
    if (isPaid) {
      setResolved("none");
      return;
    }
    fetchAdConfig().then(({ providers, placements }) => {
      if (cancelled) return;
      const placement = placements.find((p) => p.placement_key === slotKey);
      if (!placement || !placement.is_active) {
        setResolved("none");
        return;
      }
      if (!shouldDisplayPlacement(placement)) {
        setResolved("none");
        return;
      }

      const chain = getProvidersForPlacement(slotKey, providers, placements);
      // If a specific providerId is requested, filter to just that one
      const targetChain = providerId
        ? chain.filter((p) => p.id === providerId)
        : chain;

      // Providers that use global credentials (not per-placement ad unit IDs).
      // They can render on any placement as long as their credentials are set.
      const GLOBAL_CREDENTIAL_PROVIDERS = [
        "monetag",
        "adsterra",
        "ezoic",
        "snigel",
        "monumetric",
        "carbon_ads",
        "ethical_ads",
        "amazon_publisher",
        "yllix",
        "revcontent",
      ];

      // ── Pass 1: Providers with per-placement ad unit IDs ──
      // These take priority — admin explicitly mapped this provider
      // to this placement. AdSense, Media.net, etc.
      for (const provider of targetChain) {
        if (GLOBAL_CREDENTIAL_PROVIDERS.includes(provider.slug)) continue;
        const adUnitId = getAdUnitId(placement, provider.id);
        if (adUnitId) {
          setResolved({ provider, adUnitId, placement });
          if (
            !loggedRef.current &&
            !hasLoggedImpressionThisSession(slotKey + (providerId ?? ""))
          ) {
            loggedRef.current = true;
            logAdEvent({
              event_type: "impression",
              provider_id: provider.id,
              placement_key: slotKey,
              revenue_estimated: 0,
            });
          }
          return;
        }
      }

      // ── Pass 2: Global credential providers ──
      // Only reached when no per-placement provider resolved. This
      // ensures Monetag (site-wide tag) doesn't block AdSense or other
      // specifically-configured providers from rendering.
      // For global providers that also have a per-placement ad unit ID
      // configured, use that ID — it allows dedicated zones per placement.
      for (const provider of targetChain) {
        if (!GLOBAL_CREDENTIAL_PROVIDERS.includes(provider.slug)) continue;
        const hasCreds = Object.values(provider.credentials ?? {}).some(
          (v) => typeof v === "string" && v.length > 0,
        );
        if (!hasCreds) continue;
        // Check if this placement has a specific ad unit for this provider
        const perPlacementUnitId = getAdUnitId(placement, provider.id);
        if (perPlacementUnitId) {
          // Has a per-placement zone — render with it
          setResolved({ provider, adUnitId: perPlacementUnitId, placement });
        } else {
          // No per-placement zone — global tag handles display.
          // For Monetag specifically, don't render a container (the
          // global tag in Layout.tsx handles it). For other global
          // providers, resolve with empty adUnitId and let the render
          // code handle it.
          if (provider.slug === "monetag") {
            // Monetag's global tag is in Layout.tsx — it handles
            // popunder/interstitial/in-page push formats site-wide.
            // No per-placement container is rendered here, so we do NOT
            // log a placement-level impression (that would be a false
            // impression — no visible ad was shown in this slot).
            // Monetag's own dashboard counts impressions from the tag.
            setResolved("none");
            return;
          }
          setResolved({ provider, adUnitId: "", placement });
          if (
            !loggedRef.current &&
            !hasLoggedImpressionThisSession(slotKey + (providerId ?? ""))
          ) {
            loggedRef.current = true;
            logAdEvent({
              event_type: "impression",
              provider_id: provider.id,
              placement_key: slotKey,
              revenue_estimated: 0,
            });
          }
          return;
        }
      }

      // ── Pass 3: Per-placement ad units for global credential providers ──
      // Already handled in Pass 2 above (global providers with per-placement
      // ad unit IDs are resolved there). This pass is kept as a safety net for
      // any edge case where a global provider has a per-placement ID but no
      // credentials configured.
      for (const provider of targetChain) {
        if (!GLOBAL_CREDENTIAL_PROVIDERS.includes(provider.slug)) continue;
        const adUnitId = getAdUnitId(placement, provider.id);
        if (adUnitId) {
          setResolved({ provider, adUnitId, placement });
          if (
            !loggedRef.current &&
            !hasLoggedImpressionThisSession(slotKey + (providerId ?? ""))
          ) {
            loggedRef.current = true;
            logAdEvent({
              event_type: "impression",
              provider_id: provider.id,
              placement_key: slotKey,
              revenue_estimated: 0,
            });
          }
          return;
        }
      }

      // Fallback: check legacy site_settings config for AdSense
      if (
        targetChain.length === 0 ||
        targetChain.some((p) => p.slug === "google_adsense")
      ) {
        fetchLegacyAdSense(slotKey).then((legacy) => {
          if (cancelled) return;
          if (legacy) {
            setResolved(legacy);
          } else {
            setResolved("none");
          }
        });
      } else {
        setResolved("none");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slotKey, providerId, isPaid]);

  // Push to adsbygoogle after the <ins> element is in the DOM
  useEffect(() => {
    if (
      resolved &&
      resolved !== "none" &&
      !pushRef.current &&
      isDisplayAdsEnabled(resolved.provider)
    ) {
      const slug = resolved.provider.slug;
      // Google AdSense and Media.net both use the adsbygoogle push mechanism
      if (slug === "google_adsense" || slug === "media_net") {
        pushRef.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // AdSense not loaded yet — script will handle it when ready
        }
      }
      // BuySellAds uses _bsa object
      if (slug === "buysellads") {
        pushRef.current = true;
        try {
          if (window._bsa) {
            window._bsa.reload(containerRef.current);
          }
        } catch {
          // BSA not loaded yet
        }
      }
    }
  }, [resolved]);

  // Inject provider-specific scripts when provider is resolved.
  // Skipped entirely when the admin has turned the provider's visual
  // display ads off — no third-party ad scripts load in that case.
  useEffect(() => {
    if (!resolved || resolved === "none") return;
    const { provider } = resolved;
    if (!isDisplayAdsEnabled(provider)) return;
    const creds = provider.credentials ?? {};

    switch (provider.slug) {
      case "google_adsense": {
        if (!creds.publisher_id) break;
        if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
          const s = document.createElement("script");
          s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(creds.publisher_id)}`;
          s.async = true;
          s.setAttribute("crossorigin", "anonymous");
          document.head.appendChild(s);
        }
        break;
      }
      case "media_net": {
        if (!creds.cid) break;
        if (!document.querySelector('script[src*="contextual.media.net"]')) {
          const s = document.createElement("script");
          s.src = `https://contextual.media.net/dmedianet.js?cid=${encodeURIComponent(creds.cid)}&https=1`;
          s.async = true;
          document.head.appendChild(s);
        }
        break;
      }
      case "adsterra": {
        // Rendered per-slot by renderAdsterraBanner() inside the resolved
        // container (see the container effect below). The banner snippet is
        // isolated per iframe — there is no global head script to inject.
        break;
      }
      case "buysellads": {
        if (!creds.site_key) break;
        if (
          !document.querySelector('script[src*="m.servedby-buysellads.com"]')
        ) {
          const s = document.createElement("script");
          s.src = `https://m.servedby-buysellads.com/monetization.js`;
          s.async = true;
          document.head.appendChild(s);
        }
        break;
      }
      case "taboola": {
        if (!document.querySelector('script[src*="cdn.taboola.com"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://cdn.taboola.com/libtrc/${encodeURIComponent(creds.publisher_id || "frelux")}/loader.js`;
          s.id = "tb_loader_script";
          document.head.appendChild(s);
        }
        break;
      }
      case "outbrain": {
        if (!document.querySelector('script[src*="widgets.outbrain.com"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://widgets.outbrain.com/outbrain.js";
          document.head.appendChild(s);
        }
        break;
      }
      case "propellerads": {
        if (!creds.zone_id) break;
        if (
          !document.querySelector(
            `script[data-propeller-zone="${creds.zone_id}"]`,
          )
        ) {
          const s = document.createElement("script");
          s.async = true;
          s.setAttribute("data-propeller-zone", creds.zone_id);
          s.src = `https://propropsl.com/${encodeURIComponent(creds.zone_id)}/`;
          document.head.appendChild(s);
        }
        break;
      }
      case "ezoic": {
        if (!creds.site_id) break;
        if (!document.querySelector('script[src*="ezoic"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.setAttribute("data-cfasync", "false");
          s.src = `https://www.ezoic.com/ezoic.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "snigel": {
        if (!creds.site_id) break;
        if (!document.querySelector('script[src*="snigelweb"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://cdn.snigelweb.com/spc/${encodeURIComponent(creds.site_id)}.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "monumetric": {
        if (!creds.client_id) break;
        if (!document.querySelector('script[src*="monu"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.setAttribute("data-cfasync", "false");
          s.src = `https://serve.monumetric.com/pt/${encodeURIComponent(creds.client_id)}/inview.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "carbon_ads": {
        if (!document.querySelector('script[src*="srv.carbonads"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.id = "_carbonads_js";
          s.src = `https://srv.carbonads.net/ads/${encodeURIComponent(creds.serve || "")}.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "ethical_ads": {
        if (!document.querySelector('script[src*="ethicalads"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://media.ethicalads.io/media/client/ethicalads.min.js";
          document.head.appendChild(s);
        }
        break;
      }
      case "amazon_publisher": {
        if (!document.querySelector('script[src*="c.amazon-adsystem"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://c.amazon-adsystem.com/aax2/apstag.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "yllix": {
        if (!creds.publisher_id) break;
        if (!document.querySelector('script[src*="yllix"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://cdn.yllix.net/ads/ads.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case "revcontent": {
        if (!document.querySelector('script[src*="revcontent"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://assets.revcontent.com/revcontent/js/deliver.js";
          document.head.appendChild(s);
        }
        break;
      }
      case "monetag": {
        const zone = getMonetagDisplayZone(provider);
        if (!zone) break;
        if (!document.querySelector('script[src*="quge5.com"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.setAttribute("data-cfasync", "false");
          s.setAttribute("data-zone", zone);
          // Pin the tag's config/module requests to quge5.com so the
          // site CSP (script-src/connect-src/frame-src) can reliably allow it.
          s.setAttribute("data-domain", "quge5.com");
          s.src = "https://quge5.com/88/tag.min.js";
          document.head.appendChild(s);
        }
        break;
      }
    }
  }, [resolved]);

  // Adsterra: render the banner into the slot container once resolved.
  // Each banner lives in its own iframe with its own atOptions — see
  // renderAdsterraBanner() for the policy/cap details.
  useEffect(() => {
    if (!resolved || resolved === "none") return;
    const { provider, adUnitId } = resolved;
    if (provider.slug !== "adsterra") return;
    if (!isDisplayAdsEnabled(provider)) return;
    const creds = provider.credentials ?? {};
    const key = adUnitId || (typeof creds.key === "string" ? creds.key : "");
    if (!key) return;
    // Density policy: cap the number of Adsterra banners per page
    if (!adsterraSlotAvailable()) return;
    const container = containerRef.current;
    if (!container || container.childElementCount > 0) return;
    adsterraInjector.renderBanner(container, provider, { key, slotKey });
  }, [resolved, slotKey]);

  // Paid subscribers never see ads
  if (isPaid) return null;

  if (resolved === null) return null;
  if (resolved === "none") {
    return (
      <div
        className={`hidden rounded-lg border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-xs text-muted-foreground ${className ?? ""}`}
        aria-hidden="true"
        data-ad-reserved={slotKey}
      >
        Ad placement zone
      </div>
    );
  }

  const { provider } = resolved;

  // Display ads turned off for this provider — reserve the layout slot
  // but show nothing (no label, no ad content, no third-party scripts).
  if (!isDisplayAdsEnabled(provider)) {
    return (
      <div
        className={`hidden rounded-lg border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-xs text-muted-foreground ${className ?? ""}`}
        aria-hidden="true"
        data-ad-reserved={slotKey}
      />
    );
  }

  const { adUnitId } = resolved;
  const creds = provider.credentials ?? {};

  // ============================================================
  // Provider-specific inner content (unwrapped — label applied below)
  // ============================================================
  let adInner: ReactNode = null;

  // Google AdSense rendering
  if (provider.slug === "google_adsense") {
    if (!creds.publisher_id) return null;
    adInner = (
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={creds.publisher_id}
        data-ad-slot={adUnitId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    );
  }

  // Media.net rendering (uses same adsbygoogle mechanism)
  else if (provider.slug === "media_net") {
    if (!creds.cid) return null;
    adInner = (
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={creds.cid}
        data-ad-slot={adUnitId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    );
  }

  // Google Ad Manager rendering
  else if (provider.slug === "google_ad_manager") {
    if (!creds.network_code) return null;
    adInner = (
      <div
        data-ad-provider="gam"
        data-network-code={creds.network_code}
        data-ad-unit={adUnitId}
      />
    );
  }

  // Adsterra rendering
  else if (provider.slug === "adsterra") {
    const adsterraKey = adUnitId || creds.key;
    if (!adsterraKey) return null;
    // Density policy: never exceed the per-page banner cap
    if (!adsterraSlotAvailable()) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="adsterra"
        data-ad-zone={adsterraKey}
        data-ad-placement={slotKey}
      />
    );
  }

  // BuySellAds rendering
  else if (provider.slug === "buysellads") {
    if (!creds.site_key) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="buysellads"
        data-bsa-site={creds.site_key}
        data-bsa-zone={adUnitId}
      />
    );
  }

  // Taboola rendering
  else if (provider.slug === "taboola") {
    if (!creds.publisher_id) return null;
    adInner = (
      <div
        id={`taboola-${slotKey}`}
        data-ad-provider="taboola"
        data-placement={creds.placement || slotKey}
      />
    );
  }

  // Outbrain rendering
  else if (provider.slug === "outbrain") {
    if (!creds.widget_id) return null;
    adInner = (
      <div
        className="OUTBRAIN"
        data-widget-id={creds.widget_id}
        data-ob-template={creds.publisher_key || "FRELUX"}
        data-ob-installation-key={slotKey}
      />
    );
  }

  // PropellerAds rendering
  else if (provider.slug === "propellerads") {
    if (!creds.zone_id) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="propellerads"
        data-zone-id={creds.zone_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // Ezoic rendering
  else if (provider.slug === "ezoic") {
    if (!creds.site_id) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="ezoic"
        data-site-id={creds.site_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // Snigel rendering
  else if (provider.slug === "snigel") {
    if (!creds.site_id) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="snigel"
        data-site-id={creds.site_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // Monumetric rendering
  else if (provider.slug === "monumetric") {
    if (!creds.client_id) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="monumetric"
        data-client-id={creds.client_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // Carbon Ads rendering
  else if (provider.slug === "carbon_ads") {
    if (!creds.serve) return null;
    adInner = (
      <div
        data-ad-provider="carbon-ads"
        data-serve={creds.serve}
        data-placement={creds.placement || slotKey}
      />
    );
  }

  // EthicalAds rendering
  else if (provider.slug === "ethical_ads") {
    if (!creds.publisher_id) return null;
    adInner = (
      <div
        data-ad-provider="ethical-ads"
        data-ea-publisher={creds.publisher_id}
        data-ea-type={creds.placement || "image-text"}
      />
    );
  }

  // Amazon Publisher (APS) rendering
  else if (provider.slug === "amazon_publisher") {
    if (!creds.publisher_id) return null;
    adInner = (
      <div
        data-ad-provider="amazon"
        data-publisher-id={creds.publisher_id}
        data-slot-id={creds.slot_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // YlliX rendering
  else if (provider.slug === "yllix") {
    if (!creds.publisher_id) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="yllix"
        data-publisher-id={creds.publisher_id}
        data-zone-id={creds.zone_id}
        data-ad-placement={slotKey}
      />
    );
  }

  // RevContent rendering
  else if (provider.slug === "revcontent") {
    if (!creds.widget_id) return null;
    adInner = (
      <div
        data-ad-provider="revcontent"
        data-widget-id={creds.widget_id}
        data-sub-id={creds.sub_id || ""}
      />
    );
  }

  // Monetag: the global tag.min.js (injected once in Layout.tsx) handles
  // all display ad formats (popunder, interstitial, in-page push) site-wide.
  // It does NOT render into per-placement container divs — rendering an
  // empty div with an "Advertisement" label looks broken to users.
  // Only render a container if this placement has a specific per-placement
  // ad_unit_id configured (e.g. a dedicated Monetag SDK zone for this slot).
  else if (provider.slug === "monetag") {
    if (!adUnitId) return null;
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider="monetag"
        data-zone={adUnitId}
        data-ad-placement={slotKey}
      />
    );
  }

  // Rewarded ad providers (offerwall iframe based) — not rendered as regular ad slots
  else if (provider.provider_type === "rewarded") {
    return null;
  }

  // Generic provider container — SDK scripts (when loaded) will fill this
  else {
    adInner = (
      <div
        ref={containerRef}
        data-ad-provider={provider.slug}
        data-ad-unit={adUnitId}
        data-ad-placement={slotKey}
      />
    );
  }

  // ============================================================
  // Wrap with "Advertisement" label per Google AdSense policy
  // (ads must be clearly distinguishable from content)
  // ============================================================
  if (hideLabel) {
    return <div className={className}>{adInner}</div>;
  }

  return (
    <div
      className={`frelux-ad-unit ${className ?? ""}`}
      style={{
        /* Clear visual separation from content */
        borderTop: "1px solid rgba(0,0,0,0.04)",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        padding: "8px 0",
        margin: "0 auto",
      }}
      data-ad-slot-key={slotKey}
    >
      <div
        className="ad-label-subtle mb-0.5 text-center"
        aria-label="Advertisement"
        style={{
          fontSize: "8px",
          opacity: "0.35",
          color: "inherit",
          letterSpacing: "0.02em",
          fontWeight: 400,
          textTransform: "none",
        }}
      >
        Advertisement
      </div>
      <div className="flex justify-center">{adInner}</div>
    </div>
  );
}

// Legacy AdSense config fallback (reads from site_settings)
async function fetchLegacyAdSense(slotKey: string): Promise<ResolvedAd | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("site_settings")
    .select("ads_enabled, adsense_publisher_id, ad_slots")
    .limit(1)
    .maybeSingle();
  if (!data || !data.ads_enabled || !data.adsense_publisher_id) return null;
  const slots = (data.ad_slots as Record<string, string>) ?? {};
  const slotId = slots[slotKey];
  if (!slotId) return null;

  // Find the AdSense provider from ad_providers, or create a synthetic one
  const sb = await getSupabase();
  const { data: provData } = await sb
    .from("ad_providers_public")
    .select("*")
    .eq("slug", "google_adsense")
    .maybeSingle();

  const provider: DbAdProvider = provData ?? {
    id: "legacy-adsense",
    name: "Google AdSense (Legacy)",
    slug: "google_adsense",
    provider_type: "display",
    is_active: true,
    priority: 0,
    credentials: { publisher_id: data.adsense_publisher_id },
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
  };
  provider.credentials = {
    ...provider.credentials,
    publisher_id: data.adsense_publisher_id,
  };

  const placement: DbAdPlacement = {
    id: "",
    placement_key: slotKey,
    placement_name: slotKey,
    placement_type: "banner",
    page_target: "global",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 100,
    },
    created_at: "",
    updated_at: "",
  };

  return { provider, adUnitId: slotId, placement };
}
