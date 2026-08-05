import { useEffect } from 'react';
import { siteConfig } from '@/config/site';

/**
 * Injects third-party analytics and ad scripts into <head> when configured.
 * Renders nothing to the DOM — side-effect only.
 *
 * GA4, Meta Pixel, and AdSense scripts are only loaded when their respective
 * IDs are present in siteConfig. When IDs are empty (the default), nothing
 * is injected.
 */
export default function AnalyticsScripts() {
  useEffect(() => {
    const gaId = siteConfig.analytics.gaMeasurementId;
    if (gaId) {
      injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, true);
      const inline = document.createElement('script');
      inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
      document.head.appendChild(inline);
    }
  }, []);

  useEffect(() => {
    const pixelId = siteConfig.metaPixel.pixelId;
    if (pixelId) {
      const inline = document.createElement('script');
      inline.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
      document.head.appendChild(inline);
    }
  }, []);

  useEffect(() => {
    const publisherId = siteConfig.adsense.publisherId;
    if (publisherId) {
      injectScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`, true, { crossOrigin: 'anonymous' });
    }
  }, []);

  return null;
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
