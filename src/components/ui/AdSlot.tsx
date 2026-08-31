import { useEffect, useState, useRef, type ReactNode } from 'react';
import { fetchAdConfig, getProvidersForPlacement, getAdUnitId, shouldDisplayPlacement, logAdEvent } from '@/lib/ad-config';
import { getSupabase } from '@/lib/supabase-lazy';
import type { DbAdProvider, DbAdPlacement } from '@/types/database';

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

export default function AdSlot({
  slotKey,
  className,
  format = 'auto',
  hideLabel = false,
}: {
  slotKey: string;
  className?: string;
  format?: string;
  /** Skip the built-in "Advertisement" label (caller provides their own). */
  hideLabel?: boolean;
}) {
  const [resolved, setResolved] = useState<ResolvedAd | null | 'none'>(null);
  const loggedRef = useRef(false);
  const pushRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dedup impressions within the same page session to avoid
  // re-mount double-counting when navigating between pages
  function hasLoggedImpressionThisSession(key: string): boolean {
    try {
      const seen = sessionStorage.getItem('frelux_ad_impression_' + key);
      if (seen) return true;
      sessionStorage.setItem('frelux_ad_impression_' + key, '1');
      return false;
    } catch {
      return false; // sessionStorage may be unavailable (private mode)
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchAdConfig().then(({ providers, placements }) => {
      if (cancelled) return;
      const placement = placements.find((p) => p.placement_key === slotKey);
      if (!placement || !placement.is_active) {
        setResolved('none');
        return;
      }
      if (!shouldDisplayPlacement(placement)) {
        setResolved('none');
        return;
      }

      const chain = getProvidersForPlacement(slotKey, providers, placements);
      for (const provider of chain) {
        const adUnitId = getAdUnitId(placement, provider.id);
        if (adUnitId) {
          setResolved({ provider, adUnitId, placement });
          if (!loggedRef.current && !hasLoggedImpressionThisSession(slotKey)) {
            loggedRef.current = true;
            logAdEvent({
              event_type: 'impression',
              provider_id: provider.id,
              placement_key: slotKey,
              revenue_estimated: 0,
            });
          }
          return;
        }
      }

      // Fallback: check legacy site_settings config for AdSense
      if (chain.length === 0 || chain.some((p) => p.slug === 'google_adsense')) {
        fetchLegacyAdSense(slotKey).then((legacy) => {
          if (cancelled) return;
          if (legacy) {
            setResolved(legacy);
          } else {
            setResolved('none');
          }
        });
      } else {
        setResolved('none');
      }
    });
    return () => { cancelled = true; };
  }, [slotKey]);

  // Push to adsbygoogle after the <ins> element is in the DOM
  useEffect(() => {
    if (resolved && resolved !== 'none' && !pushRef.current) {
      const slug = resolved.provider.slug;
      // Google AdSense and Media.net both use the adsbygoogle push mechanism
      if (slug === 'google_adsense' || slug === 'media_net') {
        pushRef.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // AdSense not loaded yet — script will handle it when ready
        }
      }
      // BuySellAds uses _bsa object
      if (slug === 'buysellads') {
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

  // Inject provider-specific scripts when provider is resolved
  useEffect(() => {
    if (!resolved || resolved === 'none') return;
    const { provider } = resolved;
    const creds = provider.credentials ?? {};

    switch (provider.slug) {
      case 'google_adsense': {
        if (!creds.publisher_id) break;
        if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
          const s = document.createElement('script');
          s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(creds.publisher_id)}`;
          s.async = true;
          s.setAttribute('crossorigin', 'anonymous');
          document.head.appendChild(s);
        }
        break;
      }
      case 'media_net': {
        if (!creds.cid) break;
        if (!document.querySelector('script[src*="contextual.media.net"]')) {
          const s = document.createElement('script');
          s.src = `https://contextual.media.net/dmedianet.js?cid=${encodeURIComponent(creds.cid)}&https=1`;
          s.async = true;
          document.head.appendChild(s);
        }
        break;
      }
      case 'adsterra': {
        if (!creds.key) break;
        if (!document.querySelector(`script[data-adsterra-key="${creds.key}"]`)) {
          const s = document.createElement('script');
          s.async = true;
          s.setAttribute('data-adsterra-key', creds.key);
          s.src = `https://pl1234567.profitabledisplaynetwork.com/${encodeURIComponent(creds.key)}/invoke.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'buysellads': {
        if (!creds.site_key) break;
        if (!document.querySelector('script[src*="m.servedby-buysellads.com"]')) {
          const s = document.createElement('script');
          s.src = `https://m.servedby-buysellads.com/monetization.js`;
          s.async = true;
          document.head.appendChild(s);
        }
        break;
      }
      case 'taboola': {
        if (!document.querySelector('script[src*="cdn.taboola.com"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = `https://cdn.taboola.com/libtrc/${encodeURIComponent(creds.publisher_id || 'frelux')}/loader.js`;
          s.id = 'tb_loader_script';
          document.head.appendChild(s);
        }
        break;
      }
      case 'outbrain': {
        if (!document.querySelector('script[src*="widgets.outbrain.com"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = 'https://widgets.outbrain.com/outbrain.js';
          document.head.appendChild(s);
        }
        break;
      }
      case 'propellerads': {
        if (!creds.zone_id) break;
        if (!document.querySelector(`script[data-propeller-zone="${creds.zone_id}"]`)) {
          const s = document.createElement('script');
          s.async = true;
          s.setAttribute('data-propeller-zone', creds.zone_id);
          s.src = `https://propropsl.com/${encodeURIComponent(creds.zone_id)}/`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'ezoic': {
        if (!creds.site_id) break;
        if (!document.querySelector('script[src*="ezoic"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.setAttribute('data-cfasync', 'false');
          s.src = `https://www.ezoic.com/ezoic.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'snigel': {
        if (!creds.site_id) break;
        if (!document.querySelector('script[src*="snigelweb"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = `https://cdn.snigelweb.com/spc/${encodeURIComponent(creds.site_id)}.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'monumetric': {
        if (!creds.client_id) break;
        if (!document.querySelector('script[src*="monu"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.setAttribute('data-cfasync', 'false');
          s.src = `https://serve.monumetric.com/pt/${encodeURIComponent(creds.client_id)}/inview.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'carbon_ads': {
        if (!document.querySelector('script[src*="srv.carbonads"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.id = '_carbonads_js';
          s.src = `https://srv.carbonads.net/ads/${encodeURIComponent(creds.serve || '')}.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'ethical_ads': {
        if (!document.querySelector('script[src*="ethicalads"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = 'https://media.ethicalads.io/media/client/ethicalads.min.js';
          document.head.appendChild(s);
        }
        break;
      }
      case 'amazon_publisher': {
        if (!document.querySelector('script[src*="c.amazon-adsystem"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = `https://c.amazon-adsystem.com/aax2/apstag.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'yllix': {
        if (!creds.publisher_id) break;
        if (!document.querySelector('script[src*="yllix"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = `https://cdn.yllix.net/ads/ads.js`;
          document.head.appendChild(s);
        }
        break;
      }
      case 'revcontent': {
        if (!document.querySelector('script[src*="revcontent"]')) {
          const s = document.createElement('script');
          s.async = true;
          s.src = 'https://assets.revcontent.com/revcontent/js/deliver.js';
          document.head.appendChild(s);
        }
        break;
      }
    }
  }, [resolved]);

  if (resolved === null) return null;
  if (resolved === 'none') {
    return (
      <div
        className={`hidden rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-xs text-neutral-500 ${className ?? ''}`}
        aria-hidden="true"
        data-ad-reserved={slotKey}
      >
        Ad placement zone
      </div>
    );
  }

  const { provider, adUnitId } = resolved;
  const creds = provider.credentials ?? {};

  // ============================================================
  // Provider-specific inner content (unwrapped — label applied below)
  // ============================================================
  let adInner: ReactNode = null;

  // Google AdSense rendering
  if (provider.slug === 'google_adsense') {
    if (!creds.publisher_id) return null;
    adInner = (
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={creds.publisher_id}
        data-ad-slot={adUnitId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    );
  }

  // Media.net rendering (uses same adsbygoogle mechanism)
  else if (provider.slug === 'media_net') {
    if (!creds.cid) return null;
    adInner = (
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={creds.cid}
        data-ad-slot={adUnitId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    );
  }

  // Google Ad Manager rendering
  else if (provider.slug === 'google_ad_manager') {
    if (!creds.network_code) return null;
    adInner = (
      <div data-ad-provider="gam" data-network-code={creds.network_code} data-ad-unit={adUnitId} />
    );
  }

  // Adsterra rendering
  else if (provider.slug === 'adsterra') {
    if (!creds.key) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="adsterra" data-ad-zone={creds.key} data-ad-placement={slotKey} />
    );
  }

  // BuySellAds rendering
  else if (provider.slug === 'buysellads') {
    if (!creds.site_key) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="buysellads" data-bsa-site={creds.site_key} data-bsa-zone={adUnitId} />
    );
  }

  // Taboola rendering
  else if (provider.slug === 'taboola') {
    if (!creds.publisher_id) return null;
    adInner = (
      <div id={`taboola-${slotKey}`} data-ad-provider="taboola" data-placement={creds.placement || slotKey} />
    );
  }

  // Outbrain rendering
  else if (provider.slug === 'outbrain') {
    if (!creds.widget_id) return null;
    adInner = (
      <div
        className="OUTBRAIN"
        data-widget-id={creds.widget_id}
        data-ob-template={creds.publisher_key || 'FRELUX'}
        data-ob-installation-key={slotKey}
      />
    );
  }

  // PropellerAds rendering
  else if (provider.slug === 'propellerads') {
    if (!creds.zone_id) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="propellerads" data-zone-id={creds.zone_id} data-ad-placement={slotKey} />
    );
  }

  // Ezoic rendering
  else if (provider.slug === 'ezoic') {
    if (!creds.site_id) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="ezoic" data-site-id={creds.site_id} data-ad-placement={slotKey} />
    );
  }

  // Snigel rendering
  else if (provider.slug === 'snigel') {
    if (!creds.site_id) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="snigel" data-site-id={creds.site_id} data-ad-placement={slotKey} />
    );
  }

  // Monumetric rendering
  else if (provider.slug === 'monumetric') {
    if (!creds.client_id) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="monumetric" data-client-id={creds.client_id} data-ad-placement={slotKey} />
    );
  }

  // Carbon Ads rendering
  else if (provider.slug === 'carbon_ads') {
    if (!creds.serve) return null;
    adInner = (
      <div data-ad-provider="carbon-ads" data-serve={creds.serve} data-placement={creds.placement || slotKey} />
    );
  }

  // EthicalAds rendering
  else if (provider.slug === 'ethical_ads') {
    if (!creds.publisher_id) return null;
    adInner = (
      <div
        data-ad-provider="ethical-ads"
        data-ea-publisher={creds.publisher_id}
        data-ea-type={creds.placement || 'image-text'}
      />
    );
  }

  // Amazon Publisher (APS) rendering
  else if (provider.slug === 'amazon_publisher') {
    if (!creds.publisher_id) return null;
    adInner = (
      <div data-ad-provider="amazon" data-publisher-id={creds.publisher_id} data-slot-id={creds.slot_id} data-ad-placement={slotKey} />
    );
  }

  // YlliX rendering
  else if (provider.slug === 'yllix') {
    if (!creds.publisher_id) return null;
    adInner = (
      <div ref={containerRef} data-ad-provider="yllix" data-publisher-id={creds.publisher_id} data-zone-id={creds.zone_id} data-ad-placement={slotKey} />
    );
  }

  // RevContent rendering
  else if (provider.slug === 'revcontent') {
    if (!creds.widget_id) return null;
    adInner = (
      <div data-ad-provider="revcontent" data-widget-id={creds.widget_id} data-sub-id={creds.sub_id || ''} />
    );
  }

  // Rewarded ad providers (offerwall iframe based) — not rendered as regular ad slots
  else if (provider.provider_type === 'rewarded') {
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
      className={`frelux-ad-unit ${className ?? ''}`}
      style={{
        /* Clear visual separation from content */
        borderTop: '1px solid rgba(0,0,0,0.04)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        padding: '8px 0',
        margin: '0 auto',
      }}
      data-ad-slot-key={slotKey}
    >
      <div
        className="ad-label-subtle mb-0.5 text-center"
        aria-label="Advertisement"
        style={{
          fontSize: '8px',
          opacity: '0.35',
          color: 'inherit',
          letterSpacing: '0.02em',
          fontWeight: 400,
          textTransform: 'none',
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
    .from('site_settings')
    .select('ads_enabled, adsense_publisher_id, ad_slots')
    .limit(1)
    .maybeSingle();
  if (!data || !data.ads_enabled || !data.adsense_publisher_id) return null;
  const slots = (data.ad_slots as Record<string, string>) ?? {};
  const slotId = slots[slotKey];
  if (!slotId) return null;

  // Find the AdSense provider from ad_providers, or create a synthetic one
  const sb = await getSupabase();
  const { data: provData } = await sb
    .from('ad_providers_public')
    .select('*')
    .eq('slug', 'google_adsense')
    .maybeSingle();

  const provider: DbAdProvider = provData ?? {
    id: 'legacy-adsense',
    name: 'Google AdSense (Legacy)',
    slug: 'google_adsense',
    provider_type: 'display',
    is_active: true,
    priority: 0,
    credentials: { publisher_id: data.adsense_publisher_id },
    settings: {},
    is_system: true,
    created_at: '',
    updated_at: '',
  };
  provider.credentials = { ...provider.credentials, publisher_id: data.adsense_publisher_id };

  const placement: DbAdPlacement = {
    id: '',
    placement_key: slotKey,
    placement_name: slotKey,
    placement_type: 'banner',
    page_target: 'global',
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true, refresh_seconds: 0, min_height: 100 },
    created_at: '',
    updated_at: '',
  };

  return { provider, adUnitId: slotId, placement };
}
