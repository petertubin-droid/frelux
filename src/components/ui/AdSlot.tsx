import { useEffect, useState, useRef } from 'react';
import { fetchAdConfig, getProvidersForPlacement, getAdUnitId, shouldDisplayPlacement, logAdEvent } from '@/lib/ad-config';
import type { DbAdProvider, DbAdPlacement } from '@/types/database';

/**
 * Provider-agnostic ad slot. Reads placement + provider config from the database.
 * Supports fallback chains — if the primary provider has no ad unit configured
 * for this placement, the next provider in the chain is tried.
 *
 * For Google AdSense, renders the standard <ins class="adsbygoogle"> tag.
 * For other providers, renders a reserved container that the provider SDK
 * can fill (or a placeholder when no SDK is loaded).
 *
 * Ads are never fake — nothing is shown until a real provider + ad unit is configured.
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
}: {
  slotKey: string;
  className?: string;
  format?: string;
}) {
  const [resolved, setResolved] = useState<ResolvedAd | null | 'none'>(null);
  const loggedRef = useRef(false);

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
          if (!loggedRef.current) {
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
        // Legacy AdSense config via site_settings is still supported
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

  if (resolved === null) return null;
  if (resolved === 'none') {
    return (
      <div
        className={`hidden rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-xs text-neutral-400 ${className ?? ''}`}
        aria-hidden="true"
        data-ad-reserved={slotKey}
      >
        Ad placement zone
      </div>
    );
  }

  const { provider, adUnitId } = resolved;

  // Google AdSense rendering
  if (provider.slug === 'google_adsense') {
    const publisherId = provider.credentials?.publisher_id;
    if (!publisherId) return null;
    return (
      <div className={className}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={adUnitId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Google Ad Manager rendering
  if (provider.slug === 'google_ad_manager') {
    const networkCode = provider.credentials?.network_code;
    if (!networkCode) return null;
    return (
      <div className={className} data-ad-provider="gam" data-network-code={networkCode} data-ad-unit={adUnitId} />
    );
  }

  // Generic provider container — SDK scripts (when loaded) will fill this
  return (
    <div
      className={className}
      data-ad-provider={provider.slug}
      data-ad-unit={adUnitId}
      data-ad-placement={slotKey}
    />
  );
}

// Legacy AdSense config fallback (reads from site_settings)
async function fetchLegacyAdSense(slotKey: string): Promise<ResolvedAd | null> {
  const { supabase } = await import('@/lib/supabase');
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
  const { data: provData } = await supabase
    .from('ad_providers')
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
