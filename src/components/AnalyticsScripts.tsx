import { useEffect } from 'react';
import { siteConfig } from '@/config/site';
import { supabase } from '@/lib/supabase';

/**
 * Injects third-party analytics and ad scripts into <head> when configured.
 * Renders nothing to the DOM — side-effect only.
 *
 * GA4, Meta Pixel, and AdSense scripts are only loaded when their respective
 * IDs are present. IDs can come from:
 * - siteConfig (static, from src/config/site.ts) — always available
 * - site_settings (dynamic, from admin panel) — overrides siteConfig when set
 *
 * Issue #5 fix: AdSense publisher ID is now read from the database admin panel
 * in addition to the static siteConfig. This allows configuring ads without
 * a code deploy.
 */
export default function AnalyticsScripts() {
  useEffect(() => {
    // Fetch dynamic config from database (non-blocking)
    let dbPublisherId: string | null = null;
    let dbGaId: string | null = null;
    let dbPixelId: string | null = null;

    Promise.resolve(supabase
      .from('site_settings')
      .select('adsense_publisher_id, ga_measurement_id, meta_pixel_id')
      .limit(1)
      .maybeSingle()
      .then((res: { data: Record<string, unknown> | null }) => {
        const data = res.data;
        if (data?.adsense_publisher_id) dbPublisherId = data.adsense_publisher_id as string;
        if (data?.ga_measurement_id) dbGaId = data.ga_measurement_id as string;
        if (data?.meta_pixel_id) dbPixelId = data.meta_pixel_id as string;

        // Inject scripts that weren't already injected from static config
        const effectiveGaId = dbGaId || siteConfig.analytics.gaMeasurementId;
        const effectivePixelId = dbPixelId || siteConfig.metaPixel.pixelId;
        const effectivePublisherId = dbPublisherId || siteConfig.adsense.publisherId;

        if (effectiveGaId && !document.querySelector('script[src*="googletagmanager"]')) {
          injectGtag(effectiveGaId);
        }
        if (effectivePixelId && !document.querySelector('script[src*="connect.facebook.net"]')) {
          injectPixel(effectivePixelId);
        }
        if (effectivePublisherId && !document.querySelector('script[src*="adsbygoogle.js"]')) {
          injectAdsense(effectivePublisherId);
        }
      })
      ).catch(() => {
        // Fall back to static config only if DB fetch fails
      });

    // Also inject from static config immediately (non-blocking)
    const gaId = siteConfig.analytics.gaMeasurementId;
    if (gaId) {
      injectGtag(gaId);
    }

    const pixelId = siteConfig.metaPixel.pixelId;
    if (pixelId) {
      injectPixel(pixelId);
    }

    const publisherId = siteConfig.adsense.publisherId;
    if (publisherId) {
      injectAdsense(publisherId);
    }
  }, []);

  return null;
}

function injectGtag(gaId: string) {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, true);
  const inline = document.createElement('script');
  inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
  document.head.appendChild(inline);
}

function injectPixel(pixelId: string) {
  const inline = document.createElement('script');
  inline.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  document.head.appendChild(inline);
}

function injectAdsense(publisherId: string) {
  injectScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`, true, { crossOrigin: 'anonymous' });
}

function injectScript(src: string, async: boolean, attrs?: Record<string, string>) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = async;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  }
  document.head.appendChild(s);
}
