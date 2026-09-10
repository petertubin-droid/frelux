import { useEffect } from "react";
import { siteConfig } from "@/config/site";
import { getSupabase } from "@/lib/supabase-lazy";

/**
 * Injects third-party analytics scripts into <head> when configured.
 * Renders nothing to the DOM, side-effect only.
 *
 * Reads from two sources (integration_settings takes priority over site_settings
 * and static siteConfig):
 * 1. integration_settings table (admin Integration Center), primary source
 * 2. site_settings table (legacy admin panel), fallback
 * 3. siteConfig (static, from src/config/site.ts), last resort
 *
 * Supports: Google Analytics 4, Meta Pixel, Google Search Console verification.
 *
 * NOTE: Google AdSense is NOT loaded here. It is loaded on-demand by the AdSlot
 * component only on pages that contain designated ad slots. This prevents AdSense
 * auto-ads from being injected on pages without ad slots (e.g. Rewards, Dashboard).
 */
export default function AnalyticsScripts() {
  useEffect(() => {
    // Admin pages are ad-free and analytics-free
    if (window.location.pathname.startsWith("/admin")) return;
    async function loadAndInject() {
      const supabase = await getSupabase();
      let gaId = "";
      let pixelId = "";
      let searchConsoleToken = "";

      try {
        const { data: integrations } = await supabase
          .from("integration_settings")
          .select("integration_key, is_enabled, config")
          .in("integration_key", [
            "google_analytics",
            "google_search_console",
            "meta_pixel",
          ]);

        if (integrations) {
          for (const row of integrations) {
            if (!row.is_enabled) continue;
            const cfg = (row.config as Record<string, unknown>) ?? {};
            if (row.integration_key === "google_analytics") {
              gaId = (cfg.measurement_id as string) ?? "";
            } else if (row.integration_key === "google_search_console") {
              searchConsoleToken = (cfg.verification_token as string) ?? "";
            } else if (row.integration_key === "meta_pixel") {
              pixelId = (cfg.pixel_id as string) ?? "";
            }
          }
        }
      } catch {
        // Fall through to site_settings / static config
      }

      // Fallback: site_settings table (legacy)
      if (!gaId || !pixelId) {
        try {
          const { data: settings } = await supabase
            .from("site_settings")
            .select(
              "ga_measurement_id, meta_pixel_id, google_site_verification",
            )
            .limit(1)
            .maybeSingle();

          if (settings) {
            if (!gaId && settings.ga_measurement_id)
              gaId = settings.ga_measurement_id;
            if (!pixelId && settings.meta_pixel_id)
              pixelId = settings.meta_pixel_id;
            if (!searchConsoleToken && settings.google_site_verification)
              searchConsoleToken = settings.google_site_verification;
          }
        } catch {
          // Fall through to static config
        }
      }

      // Fallback: static config from siteConfig
      if (!gaId) gaId = siteConfig.analytics.gaMeasurementId;
      if (!pixelId) pixelId = siteConfig.metaPixel.pixelId;

      // Inject scripts (deduped)
      if (
        gaId &&
        isValidGaMeasurementId(gaId) &&
        !document.querySelector('script[src*="googletagmanager"]')
      ) {
        injectGtag(gaId);
      } else if (gaId && !isValidGaMeasurementId(gaId)) {
        // Invalid format — never injected; surfaced for diagnostics.
        console.error(
          "AnalyticsScripts: invalid GA measurement ID format — injection blocked",
        );
      }
      if (
        pixelId &&
        isValidMetaPixelId(pixelId) &&
        !document.querySelector('script[src*="connect.facebook.net"]')
      ) {
        injectPixel(pixelId);
      } else if (pixelId && !isValidMetaPixelId(pixelId)) {
        console.error(
          "AnalyticsScripts: invalid Meta Pixel ID format — injection blocked",
        );
      }
      if (searchConsoleToken) {
        injectSearchConsoleVerification(searchConsoleToken);
      }
    }

    loadAndInject();
  }, []);

  return null;
}

// ── Audit M2 fix (2026-09-10): admin-stored analytics IDs are only
// injected after strict format validation. A compromised settings row
// can never smuggle script content through the ID fields.
const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{6,12}$/;
const META_PIXEL_ID_RE = /^\d{8,25}$/;

function isValidGaMeasurementId(id: string): boolean {
  return GA_MEASUREMENT_ID_RE.test(id);
}

function isValidMetaPixelId(id: string): boolean {
  return META_PIXEL_ID_RE.test(id);
}

function injectGtag(gaId: string) {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, true);
  const inline = document.createElement("script");
  inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
  document.head.appendChild(inline);
}

function injectPixel(pixelId: string) {
  const inline = document.createElement("script");
  inline.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  document.head.appendChild(inline);
}

function injectSearchConsoleVerification(token: string) {
  let el = document.head.querySelector(
    'meta[name="google-site-verification"]',
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "google-site-verification");
    document.head.appendChild(el);
  }
  el.setAttribute("content", token);
}

function injectScript(
  src: string,
  async: boolean,
  attrs?: Record<string, string>,
) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = async;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  }
  document.head.appendChild(s);
}
